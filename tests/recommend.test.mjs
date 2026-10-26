import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionSeconds, rankAlbums, displayName, formatDuration, describeDelta, formatPace } from '../public/js/recommend.js';

test('sessionSeconds reads minutes, or distance at a pace', () => {
  assert.equal(sessionSeconds({ mode: 'time', minutes: 45 }), 2700);
  assert.equal(sessionSeconds({ mode: 'distance', km: 10, pace: 330 }), 3300);
  assert.equal(sessionSeconds({ mode: 'distance', km: 21.1, pace: 300 }), 6330);
});

const album = (id, seconds, songs = ['x'], group) => ({ id, seconds, songs, ...(group ? { group } : {}) });

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

test('rankAlbums proposes one edition per record: the better fit of an original and its deluxe', () => {
  const albums = [album('orig', 2650, ['x'], 'orig'), album('deluxe', 2760, ['x'], 'orig'), album('other', 3300)];
  assert.deepEqual(rankAlbums(albums, 2700, 5).map((r) => r.album.id), ['deluxe', 'other']);
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
