import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionSeconds, pickAlbums, displayName, formatDuration, describeDelta, formatPace } from '../public/js/recommend.js';

test('sessionSeconds reads minutes, or distance at a pace', () => {
  assert.equal(sessionSeconds({ mode: 'time', minutes: 45 }), 2700);
  assert.equal(sessionSeconds({ mode: 'distance', km: 10, pace: 330 }), 3300);
  assert.equal(sessionSeconds({ mode: 'distance', km: 21.1, pace: 300 }), 6330);
});

const album = (id, seconds, songs = ['x'], group) => ({ id, seconds, songs, ...(group ? { group } : {}) });

// Deterministic "random" for repeatable tests.
const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (...args) => pickAlbums(...args).picks;
const ids = (picked) => picked.map((r) => r.album.id).sort();

test('pickAlbumsAlbums only picks inside ±5 min of the run when there are enough albums there', () => {
  const near = Array.from({ length: 12 }, (_, i) => album(`near${i}`, 3600 - 300 + i * 50));
  const far = [album('short', 3000), album('long', 4300)];
  for (let seed = 1; seed < 40; seed++) {
    const picked = pick([...near, ...far], 3600, { random: seeded(seed) });
    assert.equal(picked.length, 5);
    assert.ok(picked.every((r) => Math.abs(r.delta) <= 300));
  }
});

test('pickAlbumsAlbums gives different sets for the same run', () => {
  const albums = Array.from({ length: 20 }, (_, i) => album(`a${i}`, 3300 + i * 30));
  const sets = new Set(Array.from({ length: 10 }, (_, s) => ids(pick(albums, 3600, { random: seeded(s + 1) })).join()));
  assert.ok(sets.size > 5);
});

test('pickAlbumsAlbums widens the window 5 min at a time until it holds twice the deck', () => {
  const deltas = [0, 100, -200, 450, -480, 550, -590, 650, 700, -720, 2400];
  const albums = deltas.map((d, i) => album(`a${i}`, 3600 + d));
  for (let seed = 1; seed < 40; seed++) {
    const picked = pick(albums, 3600, { random: seeded(seed) });
    assert.equal(picked.length, 5);
    assert.ok(picked.every((r) => Math.abs(r.delta) <= 900), 'the window stops at ±15 min, where it has 10 albums');
  }
  assert.equal(pick(albums.slice(0, 2), 3600).length, 2, 'a small library gives what it has');
});

test('pickAlbumsAlbums returns the picked albums closest first, with their delta', () => {
  const albums = [album('long', 3800), album('exact', 3610), album('short', 3450)];
  const picked = pick(albums, 3600, { random: seeded(7) });
  assert.deepEqual(picked.map((r) => r.album.id), ['exact', 'short', 'long']);
  assert.deepEqual(picked.map((r) => r.delta), [10, -150, 200]);
});

test('pickAlbumsAlbums leaves out the set just shown while the window has others', () => {
  const albums = Array.from({ length: 10 }, (_, i) => album(`a${i}`, 3500 + i * 20));
  const first = pick(albums, 3600, { random: seeded(5) });
  const second = pick(albums, 3600, { random: seeded(9), seen: first.map((r) => r.album.id) });
  assert.equal(second.filter((r) => first.some((f) => f.album.id === r.album.id)).length, 0);
  const third = pick(albums.slice(0, 7), 3600, { random: seeded(2), seen: ['a0', 'a1', 'a2', 'a3', 'a4'] });
  assert.ok(['a5', 'a6'].every((id) => third.some((r) => r.album.id === id)), 'fresh albums go first, the rest fill in');
});

test('pickAlbumsAlbums proposes one edition per record', () => {
  const albums = [album('orig', 3550, ['x'], 'orig'), album('deluxe', 3700, ['x'], 'orig'), album('other', 3600)];
  for (let seed = 1; seed < 20; seed++) {
    const picked = pick(albums, 3600, { random: seeded(seed) });
    assert.equal(picked.length, 2);
    assert.equal(picked.filter((r) => r.album.group === 'orig').length, 1);
  }
});

test('pickAlbums widens the window when everything near the run has been seen', () => {
  const near = Array.from({ length: 10 }, (_, i) => album(`near${i}`, 3400 + i * 40));
  const further = Array.from({ length: 6 }, (_, i) => album(`far${i}`, 2900 - i * 20));
  const { picks, reach } = pickAlbums([...near, ...further], 3600, { seen: near.map((a) => a.id), random: seeded(4) });
  assert.equal(reach, 900);
  assert.equal(picks.length, 5);
  assert.ok(picks.every((r) => r.album.id.startsWith('far')));
  assert.equal(pickAlbums([...near, ...further], 3600, { random: seeded(4) }).reach, 300);
});

test('pickAlbums counts a record as seen once one edition is seen, and starts over when all are', () => {
  const albums = [album('orig', 3600, ['x'], 'orig'), album('deluxe', 3620, ['x'], 'orig'), album('other', 3500)];
  assert.deepEqual(ids(pick(albums, 3600, { count: 1, seen: ['orig'] })), ['other']);
  assert.equal(pick(albums, 3600, { seen: ['orig', 'other'] }).length, 2, 'seen records fill in when nothing else is left');
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
