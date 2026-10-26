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
 * (twice the deck, so there is room to vary) and `count` records not in `seen`, so "Otros 5" keeps
 * finding new albums by looking further out. Seen records only fill in when there are no others left.
 * Two editions of one record share a `group` (the original and its deluxe, say): one of them at most,
 * and once one edition is seen the record counts as seen.
 * Returns the picked albums closest first, and the window they came from (`reach`, ± seconds).
 */
export function pickAlbums(albums, targetSec, { count = 5, pool = count * 2, seen = [], random = Math.random } = {}) {
  const playable = albums.filter((a) => a.seconds > 0);
  const groupOf = (album) => album.group ?? album.id;
  const seenIds = new Set(seen);
  const seenGroups = new Set(playable.filter((a) => seenIds.has(a.id)).map(groupOf));
  const groupsIn = (list) => new Set(list.map(groupOf));
  const allGroups = groupsIn(playable);
  const unseenTotal = [...allGroups].filter((g) => !seenGroups.has(g)).length;
  const farthest = Math.max(0, ...playable.map((a) => Math.abs(a.seconds - targetSec)));

  let reach = WINDOW.start;
  let inWindow = [];
  for (;;) {
    inWindow = playable.filter((a) => Math.abs(a.seconds - targetSec) <= reach);
    const groups = groupsIn(inWindow);
    const unseen = [...groups].filter((g) => !seenGroups.has(g)).length;
    const enough = groups.size >= Math.min(pool, allGroups.size) && unseen >= Math.min(count, unseenTotal);
    if (enough || reach >= farthest) break;
    reach += WINDOW.step;
  }

  // One random edition per record, then a random set of records, unseen ones first.
  const byGroup = new Map();
  for (const album of shuffle(inWindow, random)) {
    const group = groupOf(album);
    const kept = byGroup.get(group);
    if (!kept || (seenIds.has(kept.id) && !seenIds.has(album.id))) byGroup.set(group, album);
  }
  const candidates = shuffle([...byGroup.values()], random);
  const fresh = candidates.filter((a) => !seenGroups.has(groupOf(a)));
  const stale = candidates.filter((a) => seenGroups.has(groupOf(a)));

  const picks = [...fresh, ...stale]
    .slice(0, count)
    .map((album) => ({ album, duration: album.seconds, delta: album.seconds - targetSec }))
    .sort((x, y) => Math.abs(x.delta) - Math.abs(y.delta));
  return { picks, reach };
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
