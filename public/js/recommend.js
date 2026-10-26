// Pure logic: no DOM, no network. Shared by the app and the Node tests.

/** Seconds the run will last. Distance uses the pace in seconds per km. */
export function sessionSeconds({ mode, minutes, km, pace }) {
  if (mode === 'distance') return Math.round(km * pace);
  return Math.round(minutes * 60);
}

export const WINDOW = { start: 5 * 60, step: 5 * 60 };

/**
 * Picks `count` albums at random among those whose full running time is close to the run.
 * The window starts at ±5 min of the run and widens 5 min each side until it holds `pool` records
 * (twice the deck, so there is room to vary), and the same run gives a different set each time. Albums in `recent` (the set just shown) are only
 * picked when the window has nothing else, so asking again really changes the deck.
 * Two editions of one record share a `group` (the original and its deluxe, say): one of them at most.
 * The picked albums come back closest first.
 */
export function pickAlbums(albums, targetSec, { count = 5, pool = count * 2, recent = [], random = Math.random } = {}) {
  const playable = albums.filter((a) => a.seconds > 0);
  const groupOf = (album) => album.group ?? album.id;
  const allGroups = new Set(playable.map(groupOf)).size;
  const farthest = Math.max(0, ...playable.map((a) => Math.abs(a.seconds - targetSec)));

  let reach = WINDOW.start;
  let inWindow = [];
  for (;;) {
    inWindow = playable.filter((a) => Math.abs(a.seconds - targetSec) <= reach);
    const groups = new Set(inWindow.map(groupOf)).size;
    if (groups >= Math.min(pool, allGroups) || reach >= farthest) break;
    reach += WINDOW.step;
  }

  // One random edition per record, then a random set of records, fresh ones first.
  const seen = new Set(recent);
  const byGroup = new Map();
  for (const album of shuffle(inWindow, random)) {
    const group = groupOf(album);
    const kept = byGroup.get(group);
    if (!kept || (seen.has(kept.id) && !seen.has(album.id))) byGroup.set(group, album);
  }
  const candidates = shuffle([...byGroup.values()], random);
  const fresh = candidates.filter((a) => !seen.has(a.id));
  const stale = candidates.filter((a) => seen.has(a.id));

  return [...fresh, ...stale]
    .slice(0, count)
    .map((album) => ({ album, duration: album.seconds, delta: album.seconds - targetSec }))
    .sort((x, y) => Math.abs(x.delta) - Math.abs(y.delta));
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "🚌 The Magic Bus @germanch96" reads as "The Magic Bus": emoji and @handle stay in Spotify. */
export function displayName(name = '') {
  return name.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/@\S+/g, '').trim() || 'tu playlist';
}

export function formatDuration(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "Sobran 3:12", "Faltan 1:30" or "Justo": the delta in the runner's words. */
export function describeDelta(delta) {
  if (Math.abs(delta) < 30) return 'Justo lo que corres';
  return delta > 0 ? `Sobran ${formatDuration(delta)}` : `Faltan ${formatDuration(-delta)}`;
}

export function formatPace(secPerKm) {
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')}`;
}
