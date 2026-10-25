import * as spotify from './spotify.js';
import {
  collectAlbums, countSongs, isFullAlbum, sessionSeconds, rankAlbums,
  formatDuration, describeDelta, formatPace,
} from './recommend.js';

const { store } = spotify;
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const PREFS_KEY = 'hillb.prefs';
const LIBRARY_KEY = 'hillb.library';
const DURATIONS_KEY = 'hillb.durations';
const COLORS_KEY = 'hillb.colors';

const LIMITS = {
  time: { min: 5, max: 300, step: 5, presets: [30, 45, 60, 90] },
  distance: { min: 1, max: 60, step: 1, presets: [5, 10, 15, 21.1] },
};
const PACE = { min: 180, max: 600, step: 5 };
const RESULT_COUNT = 5;

const prefs = { mode: 'time', minutes: 45, km: 10, pace: 330, ...store.get(PREFS_KEY) };

// library.status: idle | playlist | measuring | ready | partial | error
const library = {
  status: 'idle', name: 'The Magic Bus', albums: [], songCount: 0,
  done: 0, total: 0, error: null,
};
let durations = store.get(DURATIONS_KEY) ?? {};
const colors = store.get(COLORS_KEY) ?? {};

/* ---------- Views ---------- */

const VIEWS = ['connect', 'session', 'results'];

function show(view, dir = 1, then) {
  const apply = () => {
    root.dataset.view = view;
    for (const v of VIEWS) $(`view-${v}`).hidden = v !== view;
    $('logout').hidden = view === 'connect';
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
  const value = getComputedStyle(root).getPropertyValue('--page').trim() || '#ffffff';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', value);
}

/* ---------- Connect ---------- */

function showConnect(message) {
  const note = $('connect-error');
  note.textContent = message ?? '';
  note.hidden = !message;
  show('connect');
}

$('connect').addEventListener('click', () => {
  $('connect').disabled = true;
  spotify.startLogin().catch(() => {
    $('connect').disabled = false;
    showConnect('No se pudo abrir Spotify. Prueba otra vez.');
  });
});

$('logout').addEventListener('click', () => {
  spotify.logout();
  library.status = 'idle';
  showConnect();
});

/* ---------- Session ---------- */

const amount = $('amount');

function formatKm(km) {
  return Number.isInteger(km) ? String(km) : km.toFixed(1).replace('.', ',');
}

function currentValue() {
  return prefs.mode === 'time' ? prefs.minutes : prefs.km;
}

function setValue(value) {
  const { min, max } = LIMITS[prefs.mode];
  const clamped = Math.min(max, Math.max(min, value));
  if (prefs.mode === 'time') prefs.minutes = Math.round(clamped);
  else prefs.km = Math.round(clamped * 10) / 10;
  store.set(PREFS_KEY, prefs);
  renderSession();
}

function renderSession() {
  const isTime = prefs.mode === 'time';
  const seg = document.querySelector('.segmented');
  seg.dataset.mode = prefs.mode;
  for (const b of seg.querySelectorAll('.segment')) b.setAttribute('aria-checked', String(b.dataset.mode === prefs.mode));

  const value = currentValue();
  if (document.activeElement !== amount) amount.value = isTime ? String(value) : formatKm(value);
  amount.inputMode = isTime ? 'numeric' : 'decimal';
  $('amount-label').textContent = isTime ? 'Minutos' : 'Kilómetros';
  $('unit').textContent = isTime ? 'minutos' : 'kilómetros';
  const { min, max } = LIMITS[prefs.mode];
  $('less').disabled = value <= min;
  $('more').disabled = value >= max;

  const presets = $('presets');
  presets.replaceChildren(...LIMITS[prefs.mode].presets.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.textContent = isTime ? `${p}′` : `${formatKm(p)} km`;
    b.setAttribute('aria-label', isTime ? `${p} minutos` : `${formatKm(p)} kilómetros`);
    b.setAttribute('aria-pressed', String(p === value));
    b.addEventListener('click', () => { nudge(p > value ? 1 : -1); setValue(p); });
    return b;
  }));

  $('pace').hidden = isTime;
  $('pace-value').textContent = formatPace(prefs.pace);
  $('pace-total').textContent = `${formatDuration(sessionSeconds(prefs))} de carrera`;
  $('pace-less').disabled = prefs.pace <= PACE.min;
  $('pace-more').disabled = prefs.pace >= PACE.max;
}

function nudge(direction) {
  if (reducedMotion.matches) return;
  amount.classList.remove('tick-up', 'tick-down');
  void amount.offsetWidth; // restart the nudge on rapid taps
  amount.classList.add(direction > 0 ? 'tick-up' : 'tick-down');
}

for (const b of document.querySelectorAll('.segment')) {
  b.addEventListener('click', () => {
    if (prefs.mode === b.dataset.mode) return;
    prefs.mode = b.dataset.mode;
    store.set(PREFS_KEY, prefs);
    renderSession();
  });
}
document.querySelector('.segmented').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const next = prefs.mode === 'time' ? 'distance' : 'time';
  document.querySelector(`.segment[data-mode="${next}"]`).click();
  document.querySelector(`.segment[data-mode="${next}"]`).focus();
});

$('less').addEventListener('click', () => { nudge(-1); setValue(currentValue() - LIMITS[prefs.mode].step); });
$('more').addEventListener('click', () => { nudge(1); setValue(currentValue() + LIMITS[prefs.mode].step); });

amount.addEventListener('input', () => {
  const allowed = prefs.mode === 'time' ? /[^0-9]/g : /[^0-9.,]/g;
  amount.value = amount.value.replace(allowed, '').slice(0, 5);
});
amount.addEventListener('change', () => {
  const parsed = parseFloat(amount.value.replace(',', '.'));
  amount.blur();
  setValue(Number.isFinite(parsed) ? parsed : currentValue());
});
amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') amount.blur(); });
amount.addEventListener('focus', () => amount.select());

function setPace(value) {
  prefs.pace = Math.min(PACE.max, Math.max(PACE.min, value));
  store.set(PREFS_KEY, prefs);
  renderSession();
}
$('pace-less').addEventListener('click', () => setPace(prefs.pace - PACE.step));
$('pace-more').addEventListener('click', () => setPace(prefs.pace + PACE.step));

$('find').addEventListener('click', () => {
  amount.blur();
  show('results', 1, () => renderResults({ entering: true }));
});

/* ---------- Library: the playlist, its albums and their running times ---------- */

function renderLibrary() {
  const el = $('library');
  const bar = (ratio) => `<span class="library-bar"><span style="--progress:${ratio.toFixed(3)}"></span></span>`;
  const n = (x) => x.toLocaleString('es');
  switch (library.status) {
    case 'playlist':
      el.innerHTML = `Leyendo ${escapeHtml(library.name)}… ${n(library.done)} canciones${bar(library.total ? library.done / library.total : 0)}`;
      break;
    case 'measuring':
      el.innerHTML = `Midiendo discos: ${n(library.done)} de ${n(library.total)}${bar(library.total ? library.done / library.total : 0)}`;
      break;
    case 'ready':
      el.textContent = `${library.name}: ${n(library.songCount)} canciones, ${n(fullAlbums().length)} discos enteros`;
      break;
    case 'partial':
      el.textContent = `Spotify limitó las consultas: ${n(measuredCount())} de ${n(fullAlbums().length)} discos medidos. El resto, en un rato.`;
      break;
    case 'error':
      el.textContent = library.error;
      break;
    default:
      el.textContent = '';
  }
}

const fullAlbums = () => library.albums.filter(isFullAlbum);
const measuredCount = () => fullAlbums().filter((a) => durations[a.id] > 0).length;

let loading = null;
function loadLibrary() {
  loading ??= runLoad().finally(() => { loading = null; });
  return loading;
}

async function runLoad() {
  try {
    library.status = 'playlist';
    library.done = 0;
    library.total = 0;
    libraryChanged();

    const meta = await spotify.getPlaylist();
    library.name = cleanName(meta.name);
    const cached = store.get(LIBRARY_KEY);
    if (cached?.snapshot === meta.snapshot_id) {
      library.albums = cached.albums;
      library.songCount = cached.songCount;
    } else {
      const entries = await spotify.getPlaylistEntries(undefined, (done, total) => {
        library.done = done;
        library.total = total;
        libraryChanged();
      });
      library.albums = collectAlbums(entries);
      library.songCount = countSongs(entries);
      store.set(LIBRARY_KEY, { snapshot: meta.snapshot_id, albums: library.albums, songCount: library.songCount });
    }

    const missing = fullAlbums().filter((a) => !(durations[a.id] > 0));
    library.status = 'measuring';
    library.total = missing.length;
    library.done = 0;
    if (missing.length) libraryChanged();
    await measure(missing);

    library.status = 'ready';
    libraryChanged();
  } catch (err) {
    store.set(DURATIONS_KEY, durations);
    if (err.kind === 'auth') { showConnect(err.message); return; }
    if (err.kind === 'quota' && measuredCount() > 0) library.status = 'partial';
    else {
      library.status = 'error';
      library.error = err.kind === 'quota'
        ? 'Spotify limitó las consultas por ahora. Prueba en un rato.'
        : err.message;
    }
    libraryChanged();
  }
}

async function measure(albums) {
  const queue = [...albums];
  let sinceSave = 0;
  // Three at a time: fast enough for a first run, gentle on the shared Development Mode quota.
  const worker = async () => {
    while (queue.length) {
      const album = queue.shift();
      durations[album.id] = await spotify.getAlbumSeconds(album.id);
      library.done += 1;
      if (++sinceSave >= 5) { store.set(DURATIONS_KEY, durations); sinceSave = 0; }
      libraryChanged();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  store.set(DURATIONS_KEY, durations);
}

function cleanName(name = '') {
  // The playlist's emoji and @handle stay in Spotify; the interface says "The Magic Bus".
  return name.replace(/\p{Extended_Pictographic}️?/gu, '').replace(/@\S+/g, '').trim() || 'tu playlist';
}

function libraryChanged() {
  renderLibrary();
  if (root.dataset.view === 'results') renderResults();
}

/* ---------- Results ---------- */

let renderedKey = '';
let observer = null;

function renderResults({ entering = false } = {}) {
  const target = sessionSeconds(prefs);
  const isTime = prefs.mode === 'time';
  const ready = ['ready', 'partial'].includes(library.status);
  const ranked = ready ? rankAlbums(library.albums, durations, target, RESULT_COUNT) : [];

  $('results-title').textContent = isTime ? `Para ${prefs.minutes} min` : `Para ${formatKm(prefs.km)} km`;
  const count = ranked.length === 1 ? 'Un disco' : `${ranked.length} discos`;
  $('results-sub').textContent = !ready || !ranked.length ? `De ${library.name}`
    : library.status === 'partial' ? `Spotify cortó tras medir ${measuredCount()} de ${fullAlbums().length} discos`
    : isTime ? `${count} de ${library.name}`
    : `${count}, ${formatDuration(target)} a ${formatPace(prefs.pace)}\u00a0/km`;

  const state = $('results-state');
  const deck = $('deck');

  if (library.status === 'error') {
    renderedKey = 'error';
    deck.replaceChildren();
    $('ticks').replaceChildren();
    state.hidden = false;
    state.innerHTML = `<p>${escapeHtml(library.error)}</p><button class="btn btn-ink" type="button" id="retry">Reintentar</button>`;
    $('retry').addEventListener('click', () => loadLibrary());
    return;
  }

  if (!ready) {
    if (renderedKey !== 'loading') {
      renderedKey = 'loading';
      deck.replaceChildren(...[0, 1, 2].map(skeletonCard));
      $('ticks').replaceChildren(...[0, 1, 2, 3, 4].map(() => tick()));
    }
    state.hidden = false;
    state.innerHTML = `<p>${library.status === 'measuring' ? 'Midiendo cuánto dura cada disco.' : `Leyendo ${escapeHtml(library.name)}.`}</p>
      <p>${library.status === 'measuring' ? `${library.done} de ${library.total} discos. Solo la primera vez: luego queda guardado.` : 'Un momento.'}</p>`;
    return;
  }

  if (!ranked.length) {
    renderedKey = 'empty';
    deck.replaceChildren();
    $('ticks').replaceChildren();
    state.hidden = false;
    state.innerHTML = `<p>No hay discos enteros en ${escapeHtml(library.name)} todavía.</p>
      <p>Los sencillos y EP no cuentan. Añade canciones de discos completos en Spotify y vuelve a buscar.</p>`;
    return;
  }

  const key = `${target}|${ranked.map((r) => r.album.id).join(',')}`;
  state.hidden = library.status !== 'partial';
  if (library.status === 'partial') {
    state.innerHTML = `<p>${ranked.length === 1 ? 'Este disco sale' : `Estos ${ranked.length} discos salen`} de los ${measuredCount()} que Spotify dejó medir.</p>
      <p>Vuelve a intentarlo en un rato para medir los otros ${fullAlbums().length - measuredCount()}.</p>
      <button class="btn btn-ink" type="button" id="retry">Reintentar</button>`;
    $('retry').addEventListener('click', () => loadLibrary());
  }
  if (key === renderedKey && !entering) return;
  renderedKey = key;

  deck.replaceChildren(...ranked.map((r, i) => albumCard(r, i, target, ranked.length)));
  $('ticks').replaceChildren(...ranked.map(() => tick()));
  deck.scrollLeft = 0;
  watchActive(deck);
  setActive(0);

  deck.classList.remove('is-entering');
  void deck.offsetWidth;
  deck.classList.add('is-entering');
  setTimeout(() => deck.classList.remove('is-entering'), 460 + ranked.length * 60 + 80);
}

function tick() {
  const t = document.createElement('span');
  t.className = 'tick';
  return t;
}

function skeletonCard(i) {
  const li = document.createElement('li');
  li.className = 'card is-skeleton';
  li.style.setProperty('--i', i);
  li.setAttribute('aria-hidden', 'true');
  li.innerHTML = `<div class="card-inner"><span class="sk sk-cover"></span><span class="sk sk-title"></span>
    <span class="sk sk-meta"></span><span class="sk sk-time"></span><span class="sk sk-meter"></span></div>`;
  return li;
}

function albumCard({ album, duration, delta }, i, target, count) {
  const scale = Math.max(duration, target);
  const li = document.createElement('li');
  li.className = 'card';
  li.style.setProperty('--i', i);
  li.style.setProperty('--album', (duration / scale).toFixed(4));
  li.style.setProperty('--run', (target / scale).toFixed(4));
  li.dataset.album = album.id;
  li.setAttribute('aria-label', `${i + 1} de ${count}: ${album.name}`);
  applyColor(li, colors[album.id]);

  const songs = album.songs.slice(0, 3).map(escapeHtml);
  const more = album.songs.length > 3 ? ` y ${album.songs.length - 3} más` : '';
  const artists = album.artists.join(', ');

  li.innerHTML = `
    <div class="card-inner">
      <img class="cover" alt="Portada de ${escapeAttr(album.name)}" width="640" height="640"
        ${album.image ? `src="${escapeAttr(album.image)}"` : ''} crossorigin="anonymous" decoding="async" ${i > 1 ? 'loading="lazy"' : ''}>
      <h2 class="card-title">${escapeHtml(album.name)}</h2>
      <p class="card-meta">${escapeHtml(artists)}${album.year ? ` <span>${album.year}</span>` : ''}</p>
      <div class="card-run">
        <div class="card-time-row">
          <span class="card-time" data-seconds="${duration}">${formatDuration(duration)}</span>
          <span class="card-delta">${describeDelta(delta)}</span>
        </div>
        <div class="meter" role="img" aria-label="El disco dura ${formatDuration(duration)}; tu salida, ${formatDuration(target)}">
          <span class="meter-fill"></span><span class="meter-run"></span>
        </div>
        <div class="meter-legend"><span>Disco</span><span>Tu salida ${formatDuration(target)}</span></div>
      </div>
      <p class="card-songs">En ${escapeHtml(library.name)}: <strong>${songs.join(', ')}</strong>${more}</p>
      <div class="card-open">
        <a class="btn" href="${escapeAttr(album.url)}" target="_blank" rel="noopener">
          <svg class="btn-icon" aria-hidden="true"><use href="#i-spotify"/></svg>
          Abrir en Spotify
        </a>
      </div>
    </div>`;

  const img = li.querySelector('img');
  if (!colors[album.id] && album.image) {
    const sample = () => {
      const c = sampleColor(img);
      if (!c) return;
      colors[album.id] = c;
      store.set(COLORS_KEY, colors);
      applyColor(li, c);
    };
    if (img.complete && img.naturalWidth) sample();
    else img.addEventListener('load', sample, { once: true });
  }
  return li;
}

function watchActive(deck) {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) setActive([...deck.children].indexOf(e.target));
    }
  }, { root: deck, threshold: 0.6 });
  for (const card of deck.children) observer.observe(card);
}

function setActive(index) {
  const cards = [...$('deck').children];
  const card = cards[index];
  if (!card) return;
  cards.forEach((c, i) => c.classList.toggle('is-active', i === index));
  if (!card.classList.contains('is-seen')) countUp(card);
  card.classList.add('is-seen');
  [...$('ticks').children].forEach((t, i) => t.classList.toggle('is-on', i === index));
}

/** The running time counts up while the meter fills: same 600 ms, same strong ease-out. */
function countUp(card) {
  const el = card.querySelector('.card-time');
  const total = Number(el?.dataset.seconds);
  if (!el || !total || reducedMotion.matches) return;
  const start = performance.now();
  const ease = (t) => 1 - (1 - t) ** 4; // close to cubic-bezier(0.23, 1, 0.32, 1)
  const frame = (now) => {
    const t = Math.min(1, (now - start) / 600);
    el.textContent = formatDuration(total * ease(t));
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ---------- Colour from the cover ---------- */

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
    const ink = contrast(bg, '#111111') >= contrast(bg, '#ffffff') ? '#111111' : '#ffffff';
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

$('back').addEventListener('click', () => show('session', -1));

/* ---------- Boot ---------- */

async function boot() {
  renderSession();
  try {
    await spotify.finishLogin();
  } catch (err) {
    showConnect(err.message);
    requestAnimationFrame(() => root.classList.add('is-live'));
    return;
  }
  if (!spotify.isLoggedIn()) showConnect();
  else { show('session'); loadLibrary(); }
  // Page-colour transitions start after the first screen is painted.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-live')));
}

boot();
