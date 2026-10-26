// The catalog behind the app: every song of the playlist, the album it comes from and, when that
// album is a special version, the studio album it was first released on. Pure logic, no network:
// tools/sync.mjs does the Spotify calls and tests/catalog.test.mjs covers the rules.
//
// Rules agreed with the owner:
// - A new song whose album is already in the catalog only joins that album's songs.
// - A song from a special version (single, deluxe, live, compilation, remaster) also gets its original
//   album. Both versions go in, never twice the same album; singles and EPs never do.
// - Nothing is removed: albums stay when their songs leave the playlist.
// - Songs with no original found stay without one; the owner sets them by hand in data/manual.json.
// - The app proposes one version per album (see `group` and pickAlbums).

export const LIVE = /\b(live|en vivo|ao vivo|en directo|unplugged|ac[uú]stico|mtv|concierto|in concert|on stage|bbc sessions?)\b|\bvivo\b/i;
export const COMP = /\b(greatest hits|grandes [eé]xitos|best of|the best|lo mejor|essential|esencial|collection|colecci[oó]n|anthology|antolog[ií]a|hits|singles|retrospective|gold|platinum|definitive|the very best|20th century masters|b-sides|rarities|rarezas|exitos|éxitos)\b/i;
export const DELUXE = /\b(deluxe|expanded|edition|edici[oó]n|anniversary|aniversario|bonus|special|legacy|super|version|versi[oó]n|reissue|collector)\b/i;
export const REMASTER = /\bremaster(ed)?\b|\bremasterizado\b/i;
const OTHER = /\b(remix(es)?|covers?|tribut[eo]|lullaby|karaoke|instrumental|tour|gira|navidad|christmas|rom[aá]nticas|baladas|duetos)\b/i;
const LIVE_TRACK = /[-(]\s*(live|en vivo|ao vivo|en directo|directo|acoustic|ac[uú]stico)\b/i;

export const CASES = {
  direct: 'Directa', single: 'Sencillo', edition: 'Deluxe o edición especial',
  live: 'En vivo', compilation: 'Recopilatorio', remaster: 'Remasterizado',
};
/** Same album, other edition: the app shows only one of the two. Live and compilations are other records. */
const SAME_RECORD = new Set(['edition', 'remaster']);

export const FULL_ALBUM_TYPES = new Set(['album', 'compilation']);

export const emptyCatalog = (playlistId) => ({ playlist: playlistId, songs: {}, albums: {} });

const playable = (entry) => {
  // The 2026 API puts the track under `item`; older responses used `track`.
  const t = entry?.item ?? entry?.track;
  return t && t.type !== 'episode' && !t.is_local && t.album?.id ? t : null;
};

/** Which kind of release a playlist track comes from. */
export function caseOf(track) {
  const a = track.album;
  if (a.album_type === 'single') return 'single';
  if (a.album_type === 'compilation' || COMP.test(a.name)) return 'compilation';
  if (LIVE.test(a.name) || /[-(]\s*(live|en vivo|ao vivo|en directo)\b/i.test(track.name)) return 'live';
  if (DELUXE.test(a.name)) return 'edition';
  if (REMASTER.test(a.name)) return 'remaster';
  return 'direct';
}

const strip = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** "Song - Live at X", "Song (Remastered 2011)", "Song - Marian Hill Remix" → "song". */
export const baseTitle = (name) =>
  strip(name).replace(/\s+-\s+.*$/, '').replace(/\s*[([].*?[)\]]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** "Blur (Special Edition)" → "Blur". */
export const baseAlbum = (name) => name.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim() || name;
const albumKey = (name) => strip(name).replace(/[^\p{L}\p{N}]/gu, '');

function pickImage(images = []) {
  // Spotify lists 640, 300, 64; the card shows the cover at about 340 CSS px, so 640 for 2x screens.
  return [...images].sort((x, y) => (y.width ?? 0) - (x.width ?? 0))[0]?.url ?? null;
}

/** Album fields from a Spotify album object (the one inside a track, or GET /albums/{id}). */
export function albumFields(a) {
  return {
    name: a.name,
    artists: (a.artists ?? []).map((x) => x.name),
    artistIds: (a.artists ?? []).map((x) => x.id),
    type: a.album_type,
    release: a.release_date ?? '',
    totalTracks: a.total_tracks ?? null,
    image: pickImage(a.images),
    url: a.external_urls?.spotify ?? `https://open.spotify.com/album/${a.id}`,
  };
}

/**
 * Adds the playlist songs the catalog does not have yet. A song whose album is already there only
 * joins it, also when Spotify has the same record under another id (same name and artist), as with
 * regional copies or reissues. Returns the ids of the new songs.
 */
export function addEntries(catalog, entries) {
  const added = [];
  for (const entry of entries) {
    const t = playable(entry);
    if (!t || catalog.songs[t.id]) continue;
    const kind = caseOf(t);
    const albumId = (t.album.album_type !== 'single'
      && sameAlbum(catalog, { id: t.album.id, name: t.album.name, artists: (t.album.artists ?? []).map((x) => x.id) }))
      || t.album.id;
    catalog.songs[t.id] = {
      name: t.name,
      artists: (t.artists ?? []).map((x) => x.name),
      artistIds: (t.artists ?? []).map((x) => x.id),
      album: albumId,
      case: kind,
      isrc: t.external_ids?.isrc ?? '',
      ms: t.duration_ms ?? 0,
      explicit: !!t.explicit,
      disc: t.disc_number ?? null,
      track: t.track_number ?? null,
      added: entry.added_at ?? '',
      url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
      // A song from the studio album is its own original; the rest wait for the search.
      ...(kind === 'direct' ? { original: albumId, how: 'Es el álbum original' } : {}),
    };
    if (!catalog.albums[albumId]) catalog.albums[albumId] = { ...albumFields(t.album), seconds: null, source: 'playlist' };
    added.push(t.id);
  }
  return added;
}

/** Songs from a special version whose original has not been searched yet. */
export const songsWithoutOriginal = (catalog) =>
  Object.keys(catalog.songs).filter((id) => catalog.songs[id].original === undefined);

/**
 * From search results (tracks), the album the song was first released on: a studio album by the same
 * artist, not live, compilation, remix or tribute, and not later than the song's own release
 * (a single's album may come up to three years after it). Prefers a standard edition, then the oldest.
 * `candidates` are tracks in the shape of `slimTrack`.
 */
export function pickOriginal(candidates, song, own) {
  const ids = new Set(song.artistIds);
  const date = own.release || '9999';
  const limit = own.type === 'single' ? `${Number(date.slice(0, 4)) + 3}${date.slice(4)}` : `${date}~`;
  const ok = candidates.filter((c) => c.album.type === 'album' && c.album.id !== song.album
    && (c.artists.some((a) => ids.has(a)) || c.album.artists.some((a) => ids.has(a)))
    && !LIVE_TRACK.test(c.name) && !LIVE.test(c.album.name) && !COMP.test(c.album.name) && !OTHER.test(c.album.name)
    && (c.album.date || '9999') <= limit);
  const byDate = (a, b) => (a.album.date || '9999').localeCompare(b.album.date || '9999');
  const standard = ok.filter((c) => !DELUXE.test(c.album.name) && !REMASTER.test(c.album.name)).sort(byDate);
  if (standard.length) return { album: standard[0].album, edition: false };
  const any = ok.sort(byDate);
  return any.length ? { album: any[0].album, edition: true } : null;
}

/** The parts of a search result track that pickOriginal needs. */
export const slimTrack = (t) => ({
  name: t.name,
  artists: (t.artists ?? []).map((a) => a.id),
  album: {
    id: t.album.id, name: t.album.name, type: t.album.album_type, date: t.album.release_date ?? '',
    artists: (t.album.artists ?? []).map((a) => a.id), names: (t.album.artists ?? []).map((a) => a.name),
    url: t.album.external_urls?.spotify, images: t.album.images,
  },
});

/** An album of the catalog that is the same record: same id, or same name and a shared artist. */
export function sameAlbum(catalog, album) {
  if (catalog.albums[album.id]) return album.id;
  const key = albumKey(album.name);
  const artists = new Set(album.artists);
  return Object.keys(catalog.albums).find((id) => {
    const a = catalog.albums[id];
    return a.type !== 'single' && albumKey(a.name) === key && a.artistIds.some((x) => artists.has(x));
  }) ?? null;
}

/**
 * Records the result of the original search for a song. `found` is pickOriginal's result or null.
 * A found album that is already in the catalog (by id, or by name and artist) is not added again.
 */
export function setOriginal(catalog, songId, found, how) {
  const song = catalog.songs[songId];
  if (!found) {
    song.original = null;
    song.how = 'No encontrado';
    return null;
  }
  const a = found.album;
  let id = sameAlbum(catalog, a);
  if (!id) {
    id = a.id;
    catalog.albums[id] = {
      name: a.name, artists: a.names ?? [], artistIds: a.artists, type: a.type, release: a.date ?? '',
      totalTracks: null, image: pickImage(a.images), url: a.url ?? `https://open.spotify.com/album/${id}`,
      seconds: null, source: 'original',
    };
  }
  song.original = id;
  song.how = how + (found.edition ? '; Spotify solo la tiene en una edición especial' : '');
  return id;
}

/** Originals the owner found by hand: data/manual.json → { "originals": { "<song id>": "<album id or URL>" } }. */
export function applyManual(catalog, manual) {
  for (const [songId, value] of Object.entries(manual?.originals ?? {})) {
    const song = catalog.songs[songId];
    const id = String(value).match(/([A-Za-z0-9]{22})/)?.[1];
    if (!song || !id || song.how === 'A mano' && song.original === id) continue;
    song.original = id;
    song.how = 'A mano';
    if (!catalog.albums[id]) {
      catalog.albums[id] = { name: '', artists: [], artistIds: [], type: 'album', release: '', totalTracks: null,
        image: null, url: `https://open.spotify.com/album/${id}`, seconds: null, source: 'manual' };
    }
  }
}

/** Full albums (not singles or EPs) that still need their running time, or their data for the hand-set ones. */
export const albumsToMeasure = (catalog) =>
  Object.keys(catalog.albums).filter((id) => {
    const a = catalog.albums[id];
    return FULL_ALBUM_TYPES.has(a.type) && !(a.seconds > 0) && inUse(catalog, id);
  });

/** An album some song comes from or leads to. */
function inUse(catalog, id) {
  return Object.values(catalog.songs).some((s) => s.album === id || s.original === id);
}

/** Stores GET /albums/{id} data and the album's running time. */
export function setMeasured(catalog, id, apiAlbum, seconds) {
  const prev = catalog.albums[id];
  catalog.albums[id] = { ...prev, ...albumFields(apiAlbum), seconds };
}

/** "Norte (Deluxe Edition)" is an edition of "Norte"; a deluxe whose song first came out on another record is not. */
const sameRecord = (edition, original) =>
  !!edition && !!original && !!original.name && albumKey(edition.name).startsWith(albumKey(original.name));

/**
 * The data file the app ships with: every measured full album of the catalog, with the playlist songs
 * it holds or is the original of. Two editions of the same record share a `group`, so the app proposes one.
 */
export function buildLibrary(catalog, { playlist, syncedAt = new Date().toISOString() }) {
  const songsOf = new Map();
  const groupOf = new Map();
  for (const s of Object.values(catalog.songs)) {
    for (const id of new Set([s.album, s.original].filter(Boolean))) {
      if (!songsOf.has(id)) songsOf.set(id, []);
      if (!songsOf.get(id).includes(s.name)) songsOf.get(id).push(s.name);
    }
    if (SAME_RECORD.has(s.case) && s.original && s.original !== s.album && !groupOf.has(s.album)
      && sameRecord(catalog.albums[s.album], catalog.albums[s.original])) groupOf.set(s.album, s.original);
  }
  const albums = Object.entries(catalog.albums)
    .filter(([id, a]) => FULL_ALBUM_TYPES.has(a.type) && a.seconds > 0 && songsOf.has(id))
    .map(([id, a]) => ({
      id, name: a.name, artists: a.artists, year: (a.release || '').slice(0, 4), image: a.image, url: a.url,
      songs: songsOf.get(id), seconds: a.seconds, group: groupOf.get(id) ?? id,
    }));
  return {
    playlist: { id: playlist.id, name: playlist.name, snapshot: playlist.snapshot },
    syncedAt,
    songCount: Object.keys(catalog.songs).length,
    albums,
  };
}
