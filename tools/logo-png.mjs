// Renders the PNG app icons from the SVGs that tools/logo.py writes.
//
//   node tools/logo-png.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = new URL('..', import.meta.url).pathname;

const icons = [
  ['public/favicon.svg', 'public/icons/favicon-32.png', 32],
  ['public/icon.svg', 'public/icons/icon-192.png', 192],
  ['public/icon.svg', 'public/icons/icon-512.png', 512],
  ['public/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
  // iOS rounds the corners itself, so the touch icon fills its corners with volt.
  ['public/icon.svg', 'public/icons/apple-touch-icon.png', 180, '#d7ff1f'],
];

const browser = await chromium.launch();
for (const [src, out, size, ground = 'transparent'] of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(ROOT + src, 'utf8');
  await page.setContent(
    `<style>html,body{margin:0;background:${ground}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: ROOT + out, omitBackground: ground === 'transparent' });
  await page.close();
  console.log('wrote', out);
}
await browser.close();
