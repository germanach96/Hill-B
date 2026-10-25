// Pure logic: no DOM, no network. Shared by the app and the Node tests.

export const FULL_ALBUM_TYPES = new Set(['album', 'compilation']);

const playableTrack = (entry) => {
  // The 2026 API puts the track under `item`; older responses used `track`.
  const track = entry?.item ?? entry?.track;
  return track && track.type !== 'episode' && !track.is_local && track.album?.id ? track : null;
};

/** Songs in the playlist, without podcast episodes, local files or removed tracks. */
export const countSongs = (entries) => entries.filter(playableTrack).length;

/** Groups playlist entries by album. */
export function collectAlbums(entries) {
  const albums = new Map();
  for (const entry of entries) {
    const track = playableTrack(entry);
    if (!track) continue;
    const a = track.album;
    let album = albums.get(a.id);
    if (!album) {
      album = {
        id: a.id,
        name: a.name,
        type: a.album_type,
        artists: (a.artists ?? []).map((x) => x.name),
        year: (a.release_date ?? '').slice(0, 4),
        totalTracks: a.total_tracks ?? 0,
        image: pickImage(a.images),
        url: a.external_urls?.spotify ?? `https://open.spotify.com/album/${a.id}`,
        songs: [],
      };
      albums.set(a.id, album);
    }
    if (!album.songs.includes(track.name)) album.songs.push(track.name);
  }
  return [...albums.values()];
}

function pickImage(images = []) {
  // Spotify lists 640, 300, 64; the card shows the cover at about 340 CSS px, so 640 for 2x screens.
  const sorted = [...images].sort((x, y) => (y.width ?? 0) - (x.width ?? 0));
  return sorted[0]?.url ?? null;
}

export function isFullAlbum(album) {
  return FULL_ALBUM_TYPES.has(album.type);
}

/** Seconds the run will last. Distance uses the pace in seconds per km. */
export function sessionSeconds({ mode, minutes, km, pace }) {
  if (mode === 'distance') return Math.round(km * pace);
  return Math.round(minutes * 60);
}

/**
 * Orders albums by how well their full running time covers the run.
 * An album that ends before the run is worth half as much per second as one that runs over,
 * because silence mid-run is worse than stopping the record at the door.
 */
export function rankAlbums(albums, durations, targetSec, count = 5) {
  return albums
    .filter((a) => isFullAlbum(a) && durations[a.id] > 0)
    .map((album) => {
      const duration = durations[album.id];
      const delta = duration - targetSec;
      const cost = delta >= 0 ? delta : -delta * 2;
      return { album, duration, delta, cost };
    })
    .sort((x, y) => x.cost - y.cost || y.album.songs.length - x.album.songs.length)
    .slice(0, count);
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
