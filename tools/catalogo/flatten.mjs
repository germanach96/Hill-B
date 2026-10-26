import { readFileSync, writeFileSync } from 'node:fs';
const [entriesPath, out] = process.argv.slice(2);
const entries = JSON.parse(readFileSync(entriesPath));
const lib = JSON.parse(readFileSync('/home/user/Hill-B/public/data/albums.json'));
const seconds = { ...Object.fromEntries(lib.albums.map((a) => [a.id, a.seconds])), ...JSON.parse(readFileSync('/home/user/Hill-B/.sync/seconds.json')) };
const inApp = new Set(lib.albums.map((a) => a.id));
const names = (xs) => (xs ?? []).map((x) => x.name).join(', ');
const songs = entries.map((e, i) => {
  const t = e.item, a = t.album;
  return {
    pos: i + 1, name: t.name, artists: names(t.artists), album: a.name, albumArtists: names(a.artists),
    albumType: a.album_type, release: a.release_date, disc: t.disc_number, track: t.track_number,
    ms: t.duration_ms, explicit: t.explicit, playable: t.is_playable, isrc: t.external_ids?.isrc ?? '',
    added: e.added_at, url: t.external_urls?.spotify, id: t.id, albumId: a.id,
  };
});
const albums = new Map();
for (const e of entries) {
  const a = e.item.album;
  if (albums.has(a.id)) continue;
  albums.set(a.id, {
    id: a.id, name: a.name, artists: names(a.artists), type: a.album_type, release: a.release_date,
    totalTracks: a.total_tracks, seconds: seconds[a.id] ?? null,
    status: inApp.has(a.id) ? 'En la app' : a.album_type === 'single' ? 'Fuera: sencillo o EP' : 'Por medir',
    image: [...(a.images ?? [])].sort((x, y) => y.width - x.width)[0]?.url ?? '', url: a.external_urls?.spotify,
  });
}
writeFileSync(out, JSON.stringify({ songs, albums: [...albums.values()], snapshot: lib.playlist.snapshot }));
const c = {}; for (const a of albums.values()) c[a.status] = (c[a.status] || 0) + 1;
console.log(songs.length, albums.size, c);
