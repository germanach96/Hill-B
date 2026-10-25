import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectAlbums, countSongs, sessionSeconds, rankAlbums, formatDuration, describeDelta, formatPace,
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

test('rankAlbums prefers albums that cover the run, penalises falling short twice as much', () => {
  const albums = ['long', 'short', 'exact', 'single', 'way-long'].map((id) => ({
    id, type: id === 'single' ? 'single' : 'album', songs: ['x'],
  }));
  const durations = { long: 2700 + 300, short: 2700 - 200, exact: 2700 + 10, single: 2700, 'way-long': 5000 };
  const ranked = rankAlbums(albums, durations, 2700, 5);
  assert.deepEqual(ranked.map((r) => r.album.id), ['exact', 'long', 'short', 'way-long']);
  assert.equal(ranked[0].delta, 10);
  assert.equal(ranked[2].delta, -200);
});

test('rankAlbums breaks ties with the album that has more songs in the playlist', () => {
  const albums = [{ id: 'one', type: 'album', songs: ['a'] }, { id: 'three', type: 'album', songs: ['a', 'b', 'c'] }];
  const ranked = rankAlbums(albums, { one: 3000, three: 3000 }, 2700);
  assert.equal(ranked[0].album.id, 'three');
});

test('rankAlbums ignores albums not measured yet and caps the count', () => {
  const albums = Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, type: 'album', songs: [] }));
  const durations = Object.fromEntries(albums.slice(0, 7).map((a, i) => [a.id, 2000 + i * 100]));
  assert.equal(rankAlbums(albums, durations, 2400, 5).length, 5);
  assert.equal(rankAlbums(albums, {}, 2400, 5).length, 0);
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
