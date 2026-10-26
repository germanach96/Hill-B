import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectAlbums, countSongs, sessionSeconds, rankAlbums, albumsToMeasure, buildLibrary, displayName,
  formatDuration, describeDelta, formatPace,
} from '../public/js/recommend.js';

const track = (name, album, extra = {}) => ({
  item: {
    type: 'track', name,
    album: { id: album.id, name: album.name, album_type: album.type ?? 'album', total_tracks: 10,
      release_date: '1999-05-01', artists: [{ name: 'Los Faros' }], images: [
        { url: 'small', width: 64 }, { url: 'big', width: 640 }, { url: 'mid', width: 300 },
      ] },
    ...extra,
  },
});

test('collectAlbums groups songs by album and skips episodes, local files and empty slots', () => {
  const a = { id: 'a', name: 'Norte' };
  const b = { id: 'b', name: 'Sur', type: 'single' };
  const entries = [
    track('Uno', a), track('Dos', a), track('Uno', a), track('Tres', b),
    { item: { type: 'episode', name: 'Podcast', album: { id: 'p' } } },
    track('Local', a, { is_local: true }),
    { item: null },
    { track: { type: 'track', name: 'Viejo formato', album: { id: 'c', name: 'Este', album_type: 'album' } } },
  ];
  const albums = collectAlbums(entries);
  assert.equal(countSongs(entries), 5);
  assert.deepEqual(albums.map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(albums[0].songs, ['Uno', 'Dos']);
  assert.equal(albums[0].image, 'big');
  assert.equal(albums[0].year, '1999');
  assert.equal(albums[0].url, 'https://open.spotify.com/album/a');
});

test('sessionSeconds reads minutes, or distance at a pace', () => {
  assert.equal(sessionSeconds({ mode: 'time', minutes: 45 }), 2700);
  assert.equal(sessionSeconds({ mode: 'distance', km: 10, pace: 330 }), 3300);
  assert.equal(sessionSeconds({ mode: 'distance', km: 21.1, pace: 300 }), 6330);
});

const album = (id, seconds, songs = ['x']) => ({ id, seconds, songs });

test('rankAlbums prefers albums that cover the run, penalises falling short twice as much', () => {
  const albums = [album('long', 3000), album('short', 2500), album('exact', 2710), album('way-long', 5000)];
  const ranked = rankAlbums(albums, 2700, 5);
  assert.deepEqual(ranked.map((r) => r.album.id), ['exact', 'long', 'short', 'way-long']);
  assert.equal(ranked[0].delta, 10);
  assert.equal(ranked[2].delta, -200);
});

test('rankAlbums breaks ties with the album that has more songs in the playlist, and caps the count', () => {
  assert.equal(rankAlbums([album('one', 3000), album('three', 3000, ['a', 'b', 'c'])], 2700)[0].album.id, 'three');
  assert.equal(rankAlbums(Array.from({ length: 9 }, (_, i) => album(`a${i}`, 2000 + i * 100)), 2400, 5).length, 5);
});

test('buildLibrary keeps measured full albums only; albumsToMeasure lists the rest', () => {
  const a = { id: 'a', name: 'Norte' };
  const b = { id: 'b', name: 'Sur', type: 'single' };
  const c = { id: 'c', name: 'Este' };
  const entries = [track('Uno', a), track('Dos', a), track('Tres', b), track('Cuatro', c)];
  assert.deepEqual(albumsToMeasure(entries, { a: 2800 }).map((x) => x.id), ['c']);
  const lib = buildLibrary({ playlist: { id: 'p', name: 'The Magic Bus', snapshot: 's' }, entries, seconds: { a: 2800, b: 200 }, syncedAt: 't' });
  assert.deepEqual(lib.albums.map((x) => [x.id, x.seconds, x.songs.length]), [['a', 2800, 2]]);
  assert.equal(lib.songCount, 4);
  assert.equal('type' in lib.albums[0], false);
});

test('displayName drops the emoji and the @handle', () => {
  assert.equal(displayName('🚌 The Magic Bus @germanch96'), 'The Magic Bus');
});

test('formatting', () => {
  assert.equal(formatDuration(2894), '48:14');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(59), '0:59');
  assert.equal(describeDelta(192), 'Sobran 3:12');
  assert.equal(describeDelta(-90), 'Faltan 1:30');
  assert.equal(describeDelta(20), 'Justo lo que corres');
  assert.equal(formatPace(330), '5:30');
  assert.equal(formatPace(305), '5:05');
});
