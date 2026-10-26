// The app reads its albums from /data/albums.json, written by tools/sync.mjs (run by Claude).
// It never talks to Spotify: the only link to Spotify is lifting an album card, which opens it there.
import { store } from './store.js';
import { createWheel } from './wheel.js';
import { createPager } from './pager.js';
import { playSplash } from './splash.js';
import {
  sessionSeconds, pickAlbums, formatDuration, formatPace, albumKm, formatKmValue, rankedTags,
} from './recommend.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;

const PREFS_KEY = 'hillb.prefs';
const COLORS_KEY = 'hillb.colors';
const DATA_URL = '/data/albums.json';

// Wheel ranges: time 0:05 to 5:59, distance 1,0 to 60,9 km, pace 3:00 to 9:00 per km in 15 s steps.
const LIMITS = {
  time: { min: 5, maxHours: 5 },
  distance: { min: 1, maxKm: 60 },
};
const PACE = { min: 180, max: 540, step: 15 };
const RESULT_COUNT = 5;

const prefs = { mode: 'time', minutes: 45, km: 10, pace: 330, ...store.get(PREFS_KEY) };
// Saved values from older versions may sit outside the wheels: bring them onto a row.
prefs.minutes = Math.min(LIMITS.time.maxHours * 60 + 59, Math.max(LIMITS.time.min, Math.round(prefs.minutes)));
prefs.km = Math.min(LIMITS.distance.maxKm + 0.9, Math.max(LIMITS.distance.min, Math.round(prefs.km * 10) / 10));
prefs.pace = Math.min(PACE.max, Math.max(PACE.min, Math.round(prefs.pace / PACE.step) * PACE.step));

// library.status: loading | ready | empty | error
const library = { status: 'loading', name: 'The Magic Bus', albums: [] };
const colors = store.get(COLORS_KEY) ?? {};

/* ---------- Views ---------- */

const VIEWS = ['session', 'results'];

function show(view, dir = 1, then) {
  const apply = () => {
    root.dataset.view = view;
    for (const v of VIEWS) $(`view-${v}`).hidden = v !== view;
    setThemeColor();
    window.scrollTo(0, 0);
    then?.(); // runs once the view is visible, so scroll positions and observers apply
  };
  const from = root.dataset.view;
  if (from === view) { then?.(); return; }
  root.style.setProperty('--dir', dir);
  if (document.startViewTransition && from && from !== 'boot') document.startViewTransition(apply);
  else apply();
}

function setThemeColor() {
  const value = getComputedStyle(root).getPropertyValue('--page').trim() || '#d7ff1f';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', value);
}

/* ---------- Session ---------- */

function formatKm(km) {
  return Number.isInteger(km) ? String(km) : km.toFixed(1).replace('.', ',');
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}

const range = (from, to, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const two = (n) => String(n).padStart(2, '0');

const major = createWheel($('wheel-major'), { label: 'Horas', onChange: onWheel });
const minor = createWheel($('wheel-minor'), { label: 'Minutos', onChange: onWheel });
const paceWheel = createWheel($('pace-wheel'), { axis: 'x', label: 'Ritmo, minutos por kilómetro', onChange: onPace });

/** Fills both wheels for the current mode and centres them on the saved value. */
function renderWheels() {
  const isTime = prefs.mode === 'time';
  if (isTime) {
    $('wheel-major').setAttribute('aria-label', 'Horas');
    $('wheel-minor').setAttribute('aria-label', 'Minutos');
    major.setValues(range(0, LIMITS.time.maxHours), { selected: Math.floor(prefs.minutes / 60) });
    minor.setValues(range(0, 59), { format: two, selected: prefs.minutes % 60 });
  } else {
    $('wheel-major').setAttribute('aria-label', 'Kilómetros');
    $('wheel-minor').setAttribute('aria-label', 'Cientos de metros');
    const tenths = Math.round(prefs.km * 10);
    major.setValues(range(0, LIMITS.distance.maxKm), { selected: Math.floor(tenths / 10) });
    minor.setValues(range(0, 9), { selected: tenths % 10 });
  }
  paceWheel.setValues(range(PACE.min, PACE.max, PACE.step), {
    format: formatPace, selected: (prefs.pace - PACE.min) / PACE.step,
  });
}

function onWheel() {
  if (prefs.mode === 'time') {
    const total = major.value * 60 + minor.value;
    // Nothing under five minutes: the wheel slides back to 0:05.
    if (total < LIMITS.time.min) { minor.set(LIMITS.time.min, { smooth: true }); prefs.minutes = LIMITS.time.min; }
    else prefs.minutes = total;
  } else {
    const km = major.value + minor.value / 10;
    if (km < LIMITS.distance.min) { major.set(LIMITS.distance.min, { smooth: true }); prefs.km = LIMITS.distance.min + minor.value / 10; }
    else prefs.km = Math.round(km * 10) / 10;
  }
  store.set(PREFS_KEY, prefs);
  renderSession();
}

function onPace(value) {
  prefs.pace = value;
  store.set(PREFS_KEY, prefs);
  renderSession();
}

/** Everything around the wheels that follows the chosen values. */
function renderSession() {
  const isTime = prefs.mode === 'time';
  const seg = document.querySelector('.segmented');
  seg.dataset.mode = prefs.mode;
  for (const b of seg.querySelectorAll('.segment')) b.setAttribute('aria-checked', String(b.dataset.mode === prefs.mode));
  $('picker-sep').textContent = isTime ? ':' : ',';
  $('picker-unit').textContent = isTime ? 'horas y minutos' : 'KM';
  // The pace is asked in both modes: by time it turns the run into kilometres, by distance into time,
  // and the cards give each album in both.
  $('intensity-total').textContent = isTime
    ? `≈ ${formatKmValue(albumKm(prefs.minutes * 60, prefs.pace))} km`
    : `${formatDuration(sessionSeconds(prefs))} de carrera`;
}

for (const b of document.querySelectorAll('.segment')) {
  b.addEventListener('click', () => {
    if (prefs.mode === b.dataset.mode) return;
    prefs.mode = b.dataset.mode;
    store.set(PREFS_KEY, prefs);
    // The wheels slide to their new place from where they were (FLIP) instead of jumping, and the
    // new numbers fade in as they go.
    const picker = $('picker');
    const before = picker.getBoundingClientRect().top;
    renderSession();
    renderWheels();
    const dy = before - picker.getBoundingClientRect().top;
    {
      picker.animate([{ transform: `translateY(${dy}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
    }
  });
}
document.querySelector('.segmented').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const next = prefs.mode === 'time' ? 'distance' : 'time';
  document.querySelector(`.segment[data-mode="${next}"]`).click();
  document.querySelector(`.segment[data-mode="${next}"]`).focus();
});


$('find').addEventListener('click', () => {
  show('results', 1, () => renderResults({ entering: true }));
});

/* ---------- Library: the albums shipped with the app ---------- */

function renderLibrary() {
  const el = $('library');
  switch (library.status) {
    case 'ready':
      el.textContent = ''; // nothing to say when the albums are there: the line only speaks up when they are not
      break;
    case 'empty':
      el.textContent = 'Todavía no hay discos cargados.';
      break;
    case 'error':
      el.innerHTML = 'No se pudieron abrir los discos de la app. <button type="button" class="link" id="reload">Reintentar</button>';
      $('reload').addEventListener('click', loadLibrary);
      break;
    default:
      el.textContent = '';
  }
  $('find').disabled = library.status !== 'ready';
}

async function loadLibrary() {
  library.status = 'loading';
  libraryChanged();
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (res.status === 404) { library.status = 'empty'; libraryChanged(); return; }
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    library.name = data.playlist?.name || library.name;
    library.albums = data.albums ?? [];
    library.status = library.albums.length ? 'ready' : 'empty';
  } catch {
    library.status = 'error';
  }
  libraryChanged();
}

function libraryChanged() {
  renderLibrary();
  if (root.dataset.view === 'results') renderResults();
}

/* ---------- Results ---------- */

let renderedKey = '';

// The draw for the current search: kept across re-renders. Start draws again avoiding the set just
// shown; "other five" draws again avoiding everything shown for this run, looking further out if needed.
let draw = { target: null, albums: null, picks: [], reach: 0, seen: [] };

let counted = { albums: null, records: 0 };
function recordCount(albums) {
  if (counted.albums !== albums) counted = { albums, records: new Set(albums.map((a) => a.group ?? a.id)).size };
  return counted.records;
}
// Five others exist only when the library holds more records than the ones on screen.
const canMore = () => library.status === 'ready' && recordCount(library.albums) > draw.picks.length;

function drawAlbums(target, how) {
  const sameRun = draw.target === target && draw.albums === library.albums;
  if (how === 'keep' && sameRun) return draw;
  const shown = draw.picks.map((r) => r.album.id);
  const seen = !sameRun ? [] : how === 'more' ? [...draw.seen, ...shown] : shown;
  const { picks, reach } = pickAlbums(library.albums, target, { count: RESULT_COUNT, seen });
  draw = { target, albums: library.albums, picks, reach, seen };
  return draw;
}

const pager = createPager($('pager'), $('deck'), {
  onIndex: (i) => setActive(i),
  onSettle: (i) => arrive(i),
  onBack: goBack,
  onMore: () => renderResults({ entering: true, how: 'more' }),
  ticks: $('ticks'),
  canMore,
  onOpen: (i) => openInSpotify(draw.picks[i]?.album),
});

function renderResults({ entering = false, how = entering ? 'search' : 'keep' } = {}) {
  const target = sessionSeconds(prefs);
  const isTime = prefs.mode === 'time';
  const ready = library.status === 'ready';
  const { picks: ranked } = ready ? drawAlbums(target, how) : { picks: [] };

  // No visible title: the run is on every card ("Tu salida"). Screen readers still get one.
  $('results-title').textContent = isTime ? `Discos para ${formatMinutes(prefs.minutes)}` : `Discos para ${formatKm(prefs.km)} km`;
  $('reroll').hidden = !canMore();

  const state = $('results-state');
  const deck = $('deck');

  if (library.status === 'loading') {
    if (renderedKey !== 'loading') {
      renderedKey = 'loading';
      deck.replaceChildren(...[0, 1, 2].map(skeletonCard));
      renderTicks(RESULT_COUNT);
    }
    state.hidden = true;
    $('pager').hidden = false;
    return;
  }

  if (!ranked.length) {
    renderedKey = library.status;
    deck.replaceChildren();
    renderTicks(0);
    $('pager').hidden = true;
    state.hidden = false;
    state.innerHTML = library.status === 'error'
      ? '<p>No se pudieron abrir los discos de la app.</p><button class="btn btn-ink" type="button" id="retry">Reintentar</button>'
      : '<p>Todavía no hay discos cargados.</p><p>Se leen una vez desde Spotify y quedan guardados en la app.</p>';
    $('retry')?.addEventListener('click', loadLibrary);
    return;
  }

  const key = `${target}|${ranked.map((r) => r.album.id).join(',')}`;
  state.hidden = true;
  $('pager').hidden = false;
  if (key === renderedKey && !entering) return;
  renderedKey = key;

  deck.replaceChildren(...ranked.map((r, i) => albumCard(r, i, target, ranked.length)));
  renderTicks(ranked.length);
  // Five others glide in from the right with the pull that asked for them; a new search rises in.
  pager.reset({ arriving: how === 'more' });
  if (how === 'more') return;
  deck.classList.remove('is-entering');
  void deck.offsetWidth;
  deck.classList.add('is-entering');
  setTimeout(() => deck.classList.remove('is-entering'), 460 + ranked.length * 60 + 80);
}

/** One bar per album; the pager fills them from the deck's live position, so the mark slides with the finger. */
function renderTicks(count) {
  $('ticks').replaceChildren(...Array.from({ length: count }, () => {
    const t = document.createElement('span');
    t.className = 'tick';
    t.innerHTML = '<span class="tick-fill"></span>';
    return t;
  }));
}

function skeletonCard(i) {
  const li = document.createElement('li');
  li.className = 'card is-skeleton';
  li.style.setProperty('--i', i);
  li.setAttribute('aria-hidden', 'true');
  li.innerHTML = `<div class="card-inner"><div class="cover-box"><span class="sk sk-cover"></span></div>
    <div class="card-head"><span class="sk sk-title"></span><span class="sk sk-meta"></span></div>
    <div class="card-run"><span class="sk sk-time"></span></div>
    <div class="card-tags">${'<span class="sk sk-tags"></span>'.repeat(4)}</div></div>`;
  return li;
}

function albumCard({ album, duration }, i, target, count) {
  const li = document.createElement('li');
  li.className = duration >= 3600 ? 'card is-long' : 'card';
  li.style.setProperty('--i', i);
  li.dataset.album = album.id;
  li.setAttribute('aria-label', `${i + 1} de ${count}: ${album.name}`);
  applyColor(li, colors[album.id]);

  const artists = album.artists.join(', ');
  const km = albumKm(duration, prefs.pace);
  // Each tag with a bar of ten dots: how strong it is against the album's strongest tag.
  const tags = rankedTags(album).map((t) => `<li><span class="tag-name">${escapeHtml(t.name)}</span>`
    + `<span class="tag-dots" role="img" aria-label="${t.dots} de 10">${'<i class="on"></i>'.repeat(t.dots)}${'<i></i>'.repeat(10 - t.dots)}</span></li>`).join('');

  li.innerHTML = `
    <div class="card-inner">
      <div class="cover-box">
        <img class="cover" alt="Portada de ${escapeAttr(album.name)}" width="640" height="640" draggable="false"
          ${album.image ? `src="${escapeAttr(album.image)}"` : ''} crossorigin="anonymous" decoding="async">
      </div>
      <div class="card-head">
        <h2 class="card-title">${escapeHtml(album.name)}</h2>
        <p class="card-meta">${escapeHtml(artists)}${album.year ? ` <span>${album.year}</span>` : ''}</p>
      </div>
      <div class="card-run">
        <p class="card-fig"><span class="card-time" data-seconds="${duration}">${formatDuration(duration)}</span><span class="sr-only"> de disco</span></p>
        <p class="card-fig"><span class="card-km" data-km="${km}">${formatKmValue(km)}</span><span class="card-unit">km</span><span class="sr-only"> a ${formatPace(prefs.pace)} el kilómetro</span></p>
      </div>
      ${tags ? `<ul class="card-tags" aria-label="Etiquetas del disco y del artista">${tags}</ul>` : ''}
      <a class="sr-only" href="${escapeAttr(album.url)}" target="_blank" rel="noopener">Abrir ${escapeHtml(album.name)} en Spotify</a>
    </div>`;

  // All five covers load at once and are decoded before they fade in: a cover that only started
  // loading (lazily) as its card glided into view decoded mid-glide and cost the glide its frames.
  const img = li.querySelector('img');
  const shown = () => img.classList.add('is-loaded');
  if (!album.image) shown();
  else img.decode().then(shown, shown); // on error the placeholder shows, never an empty hole
  if (!colors[album.id] && album.image) {
    // Reading the cover's pixels is main-thread work: it waits for a quiet moment.
    const sample = () => whenIdle(() => {
      const c = sampleColor(img);
      if (!c) return;
      colors[album.id] = c;
      store.set(COLORS_KEY, colors);
      applyColor(li, c);
    });
    if (img.complete && img.naturalWidth) sample();
    else img.addEventListener('load', sample, { once: true });
  }
  return li;
}

function setActive(index) {
  const cards = [...$('deck').children];
  const card = cards[index];
  if (!card) return;
  cards.forEach((c, i) => c.classList.toggle('is-active', i === index));
}

/** The running time and the kilometres count up, and each tag's dots fill in from the left, row
 *  after row, once the card has landed, not while it glides: the eye follows one motion at a time. */
function arrive(index) {
  const card = $('deck').children[index];
  if (!card || card.classList.contains('is-skeleton') || card.classList.contains('is-seen')) return;
  countUp(card);
  card.querySelectorAll('.card-tags li').forEach((li, row) => {
    li.querySelectorAll('.on').forEach((dot, k) => dot.animate(
      [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'none' }],
      { duration: 220, delay: 120 + row * 50 + k * 22, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' }));
  });
  card.classList.add('is-seen');
}

/**
 * Lifting a card opens the album in the Spotify app (spotify: link). If the app did not take over
 * (the page is still in front and focused 1.5 s later), the web player opens in a new tab: the app
 * itself never navigates away, so coming back finds the same cards. On a computer, a tab at once.
 * A test, or anything else, can take the request over by cancelling the "hillb:open" event.
 */
function openInSpotify(album) {
  if (!album) return;
  const uri = `spotify:album:${album.id}`;
  const go = new CustomEvent('hillb:open', { detail: { uri, url: album.url }, cancelable: true });
  if (!window.dispatchEvent(go)) return;
  if (!matchMedia('(pointer: coarse)').matches) {
    window.open(album.url, '_blank', 'noopener');
    return;
  }
  const fallback = setTimeout(() => {
    stop();
    if (document.visibilityState === 'visible' && document.hasFocus()) window.open(album.url, '_blank', 'noopener');
  }, 1500);
  const stop = () => {
    clearTimeout(fallback);
    removeEventListener('blur', stop);
    removeEventListener('pagehide', stop);
    document.removeEventListener('visibilitychange', stop);
  };
  // Any sign that Spotify (or its "open in Spotify?" prompt) took the front cancels the fallback.
  addEventListener('blur', stop);
  addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', stop);
  location.href = uri;
}

/** The running time and the kilometres count up together: 600 ms, strong ease-out. */
function countUp(card) {
  const time = card.querySelector('.card-time');
  const dist = card.querySelector('.card-km');
  const total = Number(time?.dataset.seconds);
  const km = Number(dist?.dataset.km);
  if (!time || !total) return;
  const start = performance.now();
  const ease = (t) => 1 - (1 - t) ** 4; // close to cubic-bezier(0.23, 1, 0.32, 1)
  const frame = (now) => {
    const t = Math.min(1, (now - start) / 600);
    time.textContent = formatDuration(total * ease(t));
    if (dist && km) dist.textContent = formatKmValue(km * ease(t));
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ---------- Colour from the cover ---------- */

/** Runs `fn` when the main thread is free (Safari has no requestIdleCallback: a short wait then). */
function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1200 });
  else setTimeout(fn, 400);
}

function applyColor(el, c) {
  if (!c) return;
  el.style.setProperty('--card-bg', c.bg);
  el.style.setProperty('--card-ink', c.ink);
}

function sampleColor(img) {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    // Bucket pixels by hue (twelve families plus greys) and keep the family that covers the most
    // vivid area. Averaging every hue would invent colours the cover does not have (navy + pink = violet).
    const buckets = Array.from({ length: 13 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const [ph, ps, pl] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const weight = Math.max(0, ps * (1 - Math.abs(pl - 0.5) * 1.6)) + 0.02;
      const bucket = buckets[ps < 0.12 ? 12 : Math.floor(ph * 12) % 12];
      bucket.w += weight; bucket.r += data[i] * weight; bucket.g += data[i + 1] * weight; bucket.b += data[i + 2] * weight;
    }
    const top = buckets.reduce((a, x) => (x.w > a.w ? x : a));
    if (!top.w) return null;
    let [h, s, l] = rgbToHsl(top.r / top.w, top.g / top.w, top.b / top.w);
    // Step away from the cover's own lightness so the artwork keeps its edge on the card.
    l = l > 0.5 ? l - 0.1 : l + 0.12;
    l = Math.min(0.7, Math.max(0.36, l)); // lively, never muddy, never washed out
    s = Math.min(0.9, s);
    const bg = hslToHex(h, s, l);
    // The light ink is the brand yellow, not white: the app keeps to its two colours.
    const ink = contrast(bg, '#111111') >= contrast(bg, '#d7ff1f') ? '#111111' : '#d7ff1f';
    return { bg, ink };
  } catch {
    return null; // a cover without CORS headers keeps the neutral card
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* ---------- Helpers ---------- */

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const escapeAttr = escapeHtml;

// The wheels lost their scroll position while hidden: centre them again on the way back.
function goBack() {
  show('session', -1, () => { major.refresh(); minor.refresh(); paceWheel.refresh(); });
}
$('back').addEventListener('click', goBack);
$('reroll').addEventListener('click', () => pager.more());

/* ---------- Boot ---------- */

function boot() {
  renderSession();
  show('session', 1, renderWheels);
  loadLibrary();
  // The opening plays over the laid-out session screen, once the wordmark's font is in so the
  // drawn mark lands exactly on the header's (never waiting more than 600 ms for it).
  // If it cannot play (an old browser), the yellow goes at once instead of covering the app.
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]).then(() => playSplash({
    brand: document.querySelector('.bar .brand'),
    start: $('find'),
    arriving: [document.querySelector('.segmented'), $('picker'), $('picker-unit'), $('intensity'), $('library')]
      .filter((el) => el && !el.hidden && el.offsetParent),
  })).catch(() => {
    $('splash')?.remove();
    document.querySelector('.bar .brand').style.opacity = '';
  });
  // Page-colour transitions start after the first screen is painted.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-live')));
}

boot();
