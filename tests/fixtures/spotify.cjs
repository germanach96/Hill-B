// Synthetic Spotify data for the browser tests. Invented albums and artists: nothing here is real.
const PLAYLIST_ID = '77Yaz4xSfZjJqRTIXo4ZE2';

const ALBUMS = [
  { id: 'alb01', name: 'Carretera Norte', artist: 'Los Faros', year: 1998, seconds: 2850, cover: 1, songs: ['Faro apagado', 'Ruta 9', 'Gasolina y sal', 'Norte'] },
  { id: 'alb02', name: 'Luz de Sodio', artist: 'Marea Baja', year: 2004, seconds: 2650, cover: 2, songs: ['Farolas', 'Turno de noche', 'Sodio'] },
  { id: 'alb03', name: 'Hill Repeats', artist: 'The Lanterns', year: 2011, seconds: 3125, cover: 3, songs: ['Uphill', 'Breathe Out', 'Second Climb', 'Summit Light', 'Down Again'] },
  { id: 'alb04', name: 'Kilómetro Cero', artist: 'Nubes de Agosto', year: 2016, seconds: 2320, cover: 4, songs: ['Salida', 'Kilómetro cero'] },
  { id: 'alb05', name: 'Second Wind', artist: 'Paper Harbour', year: 2009, seconds: 3680, cover: 5, songs: ['Second Wind', 'Harbour Lights', 'Undertow'] },
  { id: 'alb06', name: 'Sal y Asfalto', artist: 'Los Faros', year: 2002, seconds: 2755, cover: 6, songs: ['Asfalto', 'Marea', 'Sal en los ojos', 'Volver corriendo', 'Brisa'] },
  { id: 'alb07', name: 'Northbound', artist: 'Glass Orchard', year: 2014, seconds: 2472, cover: 7, songs: ['Northbound', 'Orchard Road'] },
  { id: 'alb08', name: 'Pulso', artist: 'Vera Montes', year: 2019, seconds: 2988, cover: 8, songs: ['Pulso', 'Cuesta arriba', 'Ciento sesenta', 'Zancada'] },
  { id: 'alb09', name: 'Low Tide Radio', artist: 'Marea Baja', year: 2007, seconds: 4350, cover: 9, songs: ['Low Tide', 'Static', 'Radio Sur'] },
  { id: 'alb10', name: 'Fiebre de Domingo', artist: 'Cometa Club', year: 2021, seconds: 2115, cover: 10, songs: ['Domingo', 'Fiebre'] },
  { id: 'sgl01', name: 'Ida y Vuelta', artist: 'Vera Montes', year: 2023, seconds: 220, cover: 11, type: 'single', songs: ['Ida y vuelta'] },
  { id: 'ep01', name: 'Calentamiento', artist: 'Cometa Club', year: 2022, seconds: 1080, cover: 12, type: 'single', songs: ['Estirar', 'Trote suave'] },
];

const albumObject = (a, base) => ({
  id: a.id,
  name: a.name,
  album_type: a.type ?? 'album',
  total_tracks: 10,
  release_date: `${a.year}-03-14`,
  artists: [{ name: a.artist }],
  images: [{ url: `https://i.scdn.co/image/test-c${a.cover}`, width: 640, height: 640 }],
  external_urls: { spotify: `https://open.spotify.com/album/${a.id}` },
});

function entries() {
  const list = [];
  for (const a of ALBUMS) for (const song of a.songs) {
    list.push({ added_at: '2026-01-01T00:00:00Z', item: { type: 'track', name: song, duration_ms: 240000, album: albumObject(a) } });
  }
  // A podcast episode and a local file live in real playlists too; the app must skip them.
  list.splice(7, 0, { item: { type: 'episode', name: 'Charla de running', duration_ms: 1800000 } });
  list.splice(15, 0, { item: { type: 'track', is_local: true, name: 'Demo local', album: { id: null } } });
  return list;
}

function albumTracks(a) {
  // Ten tracks that add up to the album's running time exactly.
  const n = 10;
  const base = Math.floor((a.seconds * 1000) / n);
  return Array.from({ length: n }, (_, i) => ({
    duration_ms: i === n - 1 ? a.seconds * 1000 - base * (n - 1) : base,
  }));
}

/** Routes api.spotify.com and i.scdn.co for one Playwright context. */
async function mockSpotify(context, { quotaAfter = Infinity, covers } = {}) {
  const all = entries();
  let albumCalls = 0;
  const stats = { albumCalls: 0, playlistPages: 0 };

  await context.route('https://api.spotify.com/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

    if (url.pathname === `/v1/playlists/${PLAYLIST_ID}`) {
      return json({ name: '🚌 The Magic Bus @germanch96', snapshot_id: 'snap-1' });
    }
    if (url.pathname === `/v1/playlists/${PLAYLIST_ID}/items`) {
      stats.playlistPages += 1;
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const next = offset + limit < all.length
        ? `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/items?offset=${offset + limit}&limit=${limit}`
        : null;
      return json({ items: all.slice(offset, offset + limit), total: all.length, next });
    }
    const m = url.pathname.match(/^\/v1\/albums\/(\w+)$/);
    if (m) {
      albumCalls += 1;
      stats.albumCalls = albumCalls;
      if (albumCalls > quotaAfter) {
        return json({ error: { status: 429, message: 'Too many requests', reason: 'QUOTA_EXCEEDED' } }, 429, { 'Retry-After': '3600' });
      }
      const a = ALBUMS.find((x) => x.id === m[1]);
      return json({ ...albumObject(a), tracks: { items: albumTracks(a), next: null, total: 10 } });
    }
    return json({ error: { status: 404, message: 'Not found' } }, 404);
  });

  await context.route('https://i.scdn.co/image/**', (route) => {
    const n = route.request().url().match(/test-c(\d+)/)[1];
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      path: `${covers}/c${n}.png`,
    });
  });

  return stats;
}

module.exports = { mockSpotify, ALBUMS, PLAYLIST_ID };
