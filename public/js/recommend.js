// Pure logic: no DOM, no network. Shared by the app and the Node tests.

/** Seconds the run will last. Distance uses the pace in seconds per km. */
export function sessionSeconds({ mode, minutes, km, pace }) {
  if (mode === 'distance') return Math.round(km * pace);
  return Math.round(minutes * 60);
}

/**
 * Orders albums by how well their full running time covers the run.
 * An album that ends before the run is worth half as much per second as one that runs over,
 * because silence mid-run is worse than stopping the record at the door.
 * Two editions of one record share a `group` (the original and its deluxe, say): only the better fit stays.
 */
export function rankAlbums(albums, targetSec, count = 5) {
  const seen = new Set();
  return albums
    .filter((a) => a.seconds > 0)
    .map((album) => {
      const delta = album.seconds - targetSec;
      const cost = delta >= 0 ? delta : -delta * 2;
      return { album, duration: album.seconds, delta, cost };
    })
    .sort((x, y) => x.cost - y.cost || y.album.songs.length - x.album.songs.length)
    .filter(({ album }) => {
      const group = album.group ?? album.id;
      if (seen.has(group)) return false;
      seen.add(group);
      return true;
    })
    .slice(0, count);
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
