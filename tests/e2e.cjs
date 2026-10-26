// Browser test: drives the app with synthetic album data and saves screenshots to .impeccable/review/.
// Run with `npm run e2e`. Uses the preinstalled Playwright (require works from any directory).
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { mockData } = require('./fixtures/spotify.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.impeccable/review');
const SNAP = path.join(ROOT, '.taste-skill/snap');
const COVERS = path.join(__dirname, 'fixtures/covers');
const PORT = 5174;
const BASE = `http://127.0.0.1:${PORT}`;
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function newPage(browser, device, { scheme = 'light', reduced = 'no-preference', empty = false } = {}) {
  const context = await browser.newContext({ ...device, colorScheme: scheme, reducedMotion: reduced });
  const stats = await mockData(context, { covers: COVERS, empty });
  const spotifyCalls = [];
  context.on('request', (r) => { if (/spotify\.com\/(v1|api|authorize)/.test(r.url())) spotifyCalls.push(r.url()); });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { context, page, errors, stats, spotifyCalls };
}

const settle = (page) => page.waitForTimeout(900);

// A static copy of the current view for the Taste inspector, which opens pages without the mocks.
async function snapshot(page, name) {
  const html = await page.evaluate(async (base) => {
    for (const img of document.querySelectorAll('img')) {
      if (!img.complete || !img.naturalWidth) continue;
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      img.src = c.toDataURL('image/png');
      img.removeAttribute('crossorigin');
    }
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('script').forEach((s) => s.remove());
    doc.classList.remove('is-live');
    doc.querySelector('head').insertAdjacentHTML('afterbegin', `<base href="${base}/">`);
    return `<!doctype html>\n${doc.outerHTML}`;
  }, BASE);
  require('node:fs').writeFileSync(path.join(SNAP, `${name}.html`), html);
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SNAP, { recursive: true });
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 400));
  const browser = await chromium.launch();
  const report = [];
  try {
    // 1. No data file yet: the session screen says so and the search waits.
    {
      const { page, errors, context } = await newPage(browser, PHONE, { empty: true });
      await page.goto(BASE);
      await page.locator('#library', { hasText: 'Todavía no hay discos cargados' }).waitFor();
      assert.ok(await page.getByRole('button', { name: 'Buscar discos' }).isDisabled());
      await page.screenshot({ path: `${OUT}/mobile-empty.png` });
      assert.ok(errors.every((e) => /404|Failed to load resource/.test(e)), errors.join('\n'));
      await context.close();
    }

    // 2. Session, then results, on a phone.
    {
      const { page, errors, context, spotifyCalls } = await newPage(browser, PHONE);
      await page.goto(BASE);
      await page.getByRole('heading', { name: '¿Cuánto vas a correr?' }).waitFor();
      await page.locator('#library', { hasText: 'discos enteros' }).waitFor();
      const libraryText = await page.locator('#library').textContent();
      assert.match(libraryText, /The Magic Bus: 10 discos enteros, leídos el 25 de octubre/);
      await settle(page);
      assert.equal(await page.locator('h1:visible').count(), 1);
      await page.screenshot({ path: `${OUT}/mobile.png` });
      await snapshot(page, 'session');

      // Stepper and presets change the number.
      await page.getByRole('button', { name: 'Más' }).click();
      assert.equal(await page.locator('#amount').inputValue(), '50');
      await page.getByRole('button', { name: '45 minutos' }).click();
      assert.equal(await page.locator('#amount').inputValue(), '45');

      const t0 = Date.now();
      await page.getByRole('button', { name: 'Buscar discos' }).click();
      await page.locator('.card').first().waitFor({ state: 'visible' });
      const clickToCards = Date.now() - t0;
      report.push(`Buscar discos → primera tarjeta visible: ${clickToCards} ms`);
      await page.waitForTimeout(1200);
      const titles = await page.locator('.card-title').allTextContents();
      assert.deepEqual(titles, ['Sal y Asfalto', 'Luz de Sodio', 'Carretera Norte', 'Pulso', 'Hill Repeats']);
      assert.equal(await page.locator('#results-title').textContent(), 'Para 45 min');
      const bg = await page.locator('.card').first().evaluate((el) => getComputedStyle(el).backgroundColor);
      assert.notEqual(bg, 'rgb(241, 241, 238)', 'the first card takes its colour from the cover');
      assert.equal(await page.locator('h1:visible').count(), 1);
      await page.screenshot({ path: `${OUT}/mobile-results.png` });
      await snapshot(page, 'results');

      // Swipe to the second album.
      const t1 = Date.now();
      await page.locator('#deck').evaluate((d) => d.scrollBy({ left: d.clientWidth * 0.8 }));
      await page.waitForFunction(() => document.querySelectorAll('.tick')[1]?.classList.contains('is-on'));
      report.push(`Deslizar → segunda tarjeta activa: ${Date.now() - t1} ms`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/mobile-results-2.png` });

      // Back keeps the session; distance with pace.
      await page.getByRole('button', { name: 'Cambiar la sesión' }).click();
      await page.getByRole('radio', { name: 'Distancia' }).click();
      assert.equal(await page.locator('#amount').inputValue(), '10');
      assert.equal(await page.locator('#pace-total').textContent(), '55:00 de carrera');
      await page.getByRole('button', { name: 'Ritmo más rápido' }).click();
      assert.equal(await page.locator('#pace-value').textContent(), '5:25');
      await settle(page);
      await page.screenshot({ path: `${OUT}/mobile-distance.png` });
      await page.getByRole('button', { name: 'Buscar discos' }).click();
      await page.locator('#results-title', { hasText: 'Para 10 km' }).waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/mobile-results-distance.png` });

      assert.deepEqual(spotifyCalls, [], 'the app never calls the Spotify API');
      report.push(`Errores de consola (móvil): ${errors.length}`);
      assert.deepEqual(errors, []);
      await context.close();
    }

    // 4. Desktop, dark scheme preference and reduced motion: the app stays light and complete.
    {
      const { page, errors, context } = await newPage(browser, DESKTOP);
      await page.goto(BASE);
      await page.locator('#library', { hasText: 'discos enteros' }).waitFor();
      await settle(page);
      await page.screenshot({ path: `${OUT}/desktop.png` });
      await page.getByRole('button', { name: 'Buscar discos' }).click();
      await page.locator('.card').first().waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/desktop-results.png` });
      assert.deepEqual(errors, []);
      await context.close();
    }
    {
      const { page, errors, context } = await newPage(browser, PHONE, { scheme: 'dark', reduced: 'reduce' });
      await page.goto(BASE);
      await page.locator('#library', { hasText: 'discos enteros' }).waitFor();
      await settle(page);
      await page.screenshot({ path: `${OUT}/mobile-dark-pref.png` });
      await page.getByRole('button', { name: 'Buscar discos' }).click();
      await page.locator('.card').first().waitFor();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/mobile-dark-pref-results.png` });
      assert.deepEqual(errors, []);
      await context.close();
    }

    // 5. Tabular figures really change Archivo's digit widths.
    {
      const { page, context } = await newPage(browser, DESKTOP, { login: false });
      await page.goto(BASE);
      await page.evaluate(() => document.fonts.ready);
      const widths = await page.evaluate(() => {
        const span = (text, tnum) => {
          const s = document.createElement('span');
          s.textContent = text;
          s.style.cssText = `font: 900 64px Archivo; font-stretch: 62%; position: absolute; font-variant-numeric: ${tnum ? 'tabular-nums' : 'normal'}`;
          document.body.append(s);
          const w = s.getBoundingClientRect().width;
          s.remove();
          return w;
        };
        return { prop: [span('1111', false), span('0000', false)], tab: [span('1111', true), span('0000', true)] };
      });
      report.push(`Archivo 1111/0000 proporcional: ${widths.prop.map(Math.round).join('/')} · tabular: ${widths.tab.map(Math.round).join('/')}`);
      assert.equal(Math.round(widths.tab[0]), Math.round(widths.tab[1]), 'tabular figures are equal width');
      const loaded = await page.evaluate(() => document.fonts.check('900 16px Archivo'));
      assert.ok(loaded, 'Archivo is loaded from /fonts');
      await context.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(report.join('\n'));
  console.log('e2e: ok');
}

run().catch((e) => { console.error(e); process.exit(1); });
