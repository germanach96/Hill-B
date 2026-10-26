import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyCatalog, caseOf, addEntries, songsWithoutOriginal, pickOriginal, setOriginal, applyManual,
  albumsToMeasure, setMeasured, buildLibrary, baseTitle, baseAlbum, normalizeTags, albumsToTag, artistsToTag,
  setAlbumTags, setArtistTags,
} from '../tools/catalog.mjs';

// Invented albums and artists.
const artist = { id: 'faros', name: 'Los Faros' };
const alb = (id, name, type = 'album', release = '2001-03-01') => ({
  id, name, album_type: type, release_date: release, total_tracks: 10, artists: [artist],
  images: [{ url: 'small', width: 64 }, { url: 'big', width: 640 }],
});
const entry = (id, name, album, isrc = `ISRC${id}`) => ({
  added_at: '2020-01-01T00:00:00Z',
  item: { type: 'track', id, name, album, artists: [artist], duration_ms: 200000, external_ids: { isrc } },
});
const hit = (name, album) => ({ name, artists: ['faros'], album: { id: album.id, name: album.name, type: album.album_type, date: album.release_date, artists: ['faros'] } });

const norte = alb('norte', 'Norte');
const norteDeluxe = alb('norte-dx', 'Norte (Deluxe Edition)', 'album', '2011-03-01');
const vivo = alb('vivo', 'Los Faros En Vivo', 'album', '2010-06-01');
const sencillo = alb('sg', 'Ruta 9', 'single', '2000-11-01');

test('caseOf tells studio albums from singles, editions, live records, compilations and remasters', () => {
  const t = (album, name = 'Uno') => ({ name, album });
  assert.equal(caseOf(t(norte)), 'direct');
  assert.equal(caseOf(t(sencillo)), 'single');
  assert.equal(caseOf(t(norteDeluxe)), 'edition');
  assert.equal(caseOf(t(vivo)), 'live');
  assert.equal(caseOf(t(alb('gh', 'Grandes Éxitos'))), 'compilation');
  assert.equal(caseOf(t(alb('bso', 'Película', 'compilation'))), 'compilation');
  assert.equal(caseOf(t(alb('rm', 'Sur (2011 Remaster)'))), 'remaster');
  assert.equal(caseOf(t(norte, 'Uno - En Vivo')), 'live');
});

test('a new song from an album already in the catalog only joins it', () => {
  const c = emptyCatalog('p');
  assert.deepEqual(addEntries(c, [entry('s1', 'Uno', norte)]), ['s1']);
  assert.deepEqual(addEntries(c, [entry('s1', 'Uno', norte), entry('s2', 'Dos', norte)]), ['s2']);
  assert.deepEqual(Object.keys(c.albums), ['norte']);
  assert.equal(c.songs.s2.original, 'norte');
  assert.equal(c.albums.norte.image, 'big');
});

test('a song from another copy of an album already there (same name and artist) joins it', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte), entry('s2', 'Dos', { ...norte, id: 'norte-copia' })]);
  assert.deepEqual(Object.keys(c.albums), ['norte']);
  assert.equal(c.songs.s2.album, 'norte');
  assert.equal(c.songs.s2.original, 'norte');
});

test('songs from special versions wait for the original search; studio songs do not', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte), entry('s2', 'Dos', norteDeluxe), entry('s3', 'Ruta 9', sencillo)]);
  assert.deepEqual(songsWithoutOriginal(c), ['s2', 's3']);
});

test('pickOriginal takes the oldest standard studio album, never a later, live or compilation one', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Faro - En Vivo', vivo)]);
  const song = c.songs.s1;
  const own = c.albums.vivo;
  const later = alb('later', 'Otra Vez', 'album', '2015-01-01');
  const hits = alb('hits', 'Grandes Éxitos', 'album', '2005-01-01');
  const picked = pickOriginal([hit('Faro', later), hit('Faro', hits), hit('Faro', norteDeluxe), hit('Faro', norte)], song, own);
  assert.equal(picked.album.id, 'norte');
  assert.equal(picked.edition, false);
  assert.equal(pickOriginal([hit('Faro', later), hit('Faro', hits)], song, own), null);
  // Only a deluxe on Spotify: it counts, flagged as an edition.
  assert.deepEqual(pickOriginal([hit('Faro', alb('dx', 'Norte (Deluxe)', 'album', '2001-03-01'))], song, own).edition, true);
});

test("a single's album may come out up to three years after it", () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Ruta 9', sencillo)]);
  const soon = alb('soon', 'Norte', 'album', '2001-03-01');
  const late = alb('late', 'Viejo', 'album', '2009-01-01');
  assert.equal(pickOriginal([hit('Ruta 9', late), hit('Ruta 9', soon)], c.songs.s1, c.albums.sg).album.id, 'soon');
  assert.equal(pickOriginal([hit('Ruta 9', late)], c.songs.s1, c.albums.sg), null);
});

test('both versions go in once: the original found is not repeated by id nor by name and artist', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte), entry('s2', 'Dos', norteDeluxe), entry('s3', 'Tres', norteDeluxe)]);
  const otherNorte = { id: 'norte-mx', name: 'Norte', type: 'album', date: '2001-03-01', artists: ['faros'] };
  assert.equal(setOriginal(c, 's2', { album: otherNorte, edition: false }, 'ISRC'), 'norte');
  assert.equal(setOriginal(c, 's3', { album: { ...otherNorte, id: 'norte' }, edition: false }, 'ISRC'), 'norte');
  assert.deepEqual(Object.keys(c.albums).sort(), ['norte', 'norte-dx']);
  const fresh = { id: 'sur', name: 'Sur', type: 'album', date: '1999-01-01', artists: ['faros'] };
  addEntries(c, [entry('s4', 'Cuatro', alb('sur-live', 'Sur En Vivo'))]);
  assert.equal(setOriginal(c, 's4', { album: fresh, edition: false }, 'Título'), 'sur');
  assert.equal(c.albums.sur.source, 'original');
  assert.equal(setOriginal(c, 's1', null), null);
  assert.equal(c.songs.s1.how, 'No encontrado');
});

test('singles never enter the app; originals and editions do, with the songs that lead to them', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Ruta 9', sencillo), entry('s2', 'Dos', norteDeluxe), entry('s3', 'Uno', norte)]);
  setOriginal(c, 's1', { album: { id: 'norte', name: 'Norte', type: 'album', artists: ['faros'] }, edition: false }, 'ISRC');
  setOriginal(c, 's2', { album: { id: 'norte', name: 'Norte', type: 'album', artists: ['faros'] }, edition: false }, 'ISRC');
  assert.deepEqual(albumsToMeasure(c).sort(), ['norte', 'norte-dx']);
  setMeasured(c, 'norte', norte, 2800);
  setMeasured(c, 'norte-dx', norteDeluxe, 3600);
  c.albums.sg.seconds = 200;
  const lib = buildLibrary(c, { playlist: { id: 'p', name: 'The Magic Bus', snapshot: 's' }, syncedAt: 't' });
  assert.deepEqual(lib.albums.map((a) => [a.id, a.seconds, a.group, a.songs]), [
    ['norte-dx', 3600, 'norte', ['Dos']],
    ['norte', 2800, 'norte', ['Ruta 9', 'Dos', 'Uno']],
  ]);
  assert.equal(lib.songCount, 3);
});

test('live records and compilations are other records: they keep their own group', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno - En Vivo', vivo), entry('s2', 'Uno', norte)]);
  setOriginal(c, 's1', { album: { id: 'norte', name: 'Norte', type: 'album', artists: ['faros'] }, edition: false }, 'Título');
  setMeasured(c, 'vivo', vivo, 4000);
  setMeasured(c, 'norte', norte, 2800);
  const lib = buildLibrary(c, { playlist: { id: 'p', name: 'x' }, syncedAt: 't' });
  assert.deepEqual(lib.albums.map((a) => [a.id, a.group]), [['vivo', 'vivo'], ['norte', 'norte']]);
});

test('an edition is grouped only with an original of the same name', () => {
  const c = emptyCatalog('p');
  const cubana = alb('cubana', 'La Sesión (Spanish Version)', 'album', '2012-01-01');
  addEntries(c, [entry('s1', 'Dos', norteDeluxe), entry('s2', 'Baila', cubana)]);
  setOriginal(c, 's1', { album: { id: 'norte', name: 'Norte', type: 'album', artists: ['faros'] }, edition: false }, 'ISRC');
  setOriginal(c, 's2', { album: { id: 'sur', name: 'Sur', type: 'album', artists: ['faros'] }, edition: false }, 'ISRC');
  for (const [id, a] of [['norte', norte], ['norte-dx', norteDeluxe], ['cubana', cubana], ['sur', alb('sur', 'Sur')]]) setMeasured(c, id, a, 3000);
  const groups = Object.fromEntries(buildLibrary(c, { playlist: { id: 'p', name: 'x' } }).albums.map((a) => [a.id, a.group]));
  assert.deepEqual(groups, { 'norte-dx': 'norte', cubana: 'cubana', norte: 'norte', sur: 'sur' });
});

test('nothing is removed: albums stay when their songs leave the playlist', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte)]);
  setMeasured(c, 'norte', norte, 2800);
  addEntries(c, []);
  assert.equal(buildLibrary(c, { playlist: { id: 'p', name: 'x' } }).albums.length, 1);
});

test('originals set by hand win and get measured', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Ruta 9', sencillo)]);
  setOriginal(c, 's1', null);
  applyManual(c, { originals: { s1: 'https://open.spotify.com/album/0123456789abcdefghijkl?si=x' } });
  assert.equal(c.songs.s1.original, '0123456789abcdefghijkl');
  assert.equal(c.songs.s1.how, 'A mano');
  assert.deepEqual(albumsToMeasure(c), ['0123456789abcdefghijkl']);
});

test('titles and album names without their edition notes', () => {
  assert.equal(baseTitle('Faro (Remastered 2011)'), 'faro');
  assert.equal(baseTitle('Faro - Live at Luna Park'), 'faro');
  assert.equal(baseTitle('Canción Única'), 'cancion unica');
  assert.equal(baseAlbum('Norte (Deluxe Edition)'), 'Norte');
});

test('Last.fm tags become [name, weight] pairs: lower case, one per name, heaviest first, no zero weights', () => {
  const lastfm = [{ name: 'Stoner Rock', count: 100 }, { name: ' alternative  rock', count: '68' }, { name: 'stoner rock', count: 3 },
    { name: 'seen live', count: 0 }, { name: '', count: 5 }];
  assert.deepEqual(normalizeTags(lastfm), [['stoner rock', 100], ['alternative rock', 68]]);
  assert.deepEqual(normalizeTags({ name: 'Trova', count: 100 }), [['trova', 100]], 'a single tag comes as an object');
  assert.deepEqual(normalizeTags(undefined), []);
});

test('albums and artists are tagged once, and the app data carries both lists', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte), entry('s2', 'Dos', sencillo)]);
  setMeasured(c, 'norte', norte, 2700);
  assert.deepEqual(albumsToTag(c), ['norte'], 'singles are never tagged');
  assert.deepEqual(artistsToTag(c), ['Los Faros']);

  setAlbumTags(c, 'norte', [{ name: 'Rock', count: 100 }, { name: 'chill', count: 40 }]);
  setArtistTags(c, 'Los Faros', [{ name: 'rock chileno', count: 100 }]);
  assert.deepEqual(albumsToTag(c), []);
  assert.deepEqual(artistsToTag(c), []);

  const [a] = buildLibrary(c, { playlist: { id: 'p', name: 'x' } }).albums;
  assert.deepEqual(a.tags, [['rock', 100], ['chill', 40]]);
  assert.deepEqual(a.artistTags, [['rock chileno', 100]]);
});

test('an album Last.fm does not know keeps an empty list and is not asked again', () => {
  const c = emptyCatalog('p');
  addEntries(c, [entry('s1', 'Uno', norte)]);
  setMeasured(c, 'norte', norte, 2700);
  setAlbumTags(c, 'norte', []);
  assert.deepEqual(albumsToTag(c), []);
  assert.deepEqual(buildLibrary(c, { playlist: { id: 'p', name: 'x' } }).albums[0].tags, []);
  assert.deepEqual(buildLibrary(c, { playlist: { id: 'p', name: 'x' } }).albums[0].artistTags, [], 'artist not asked yet');
});
