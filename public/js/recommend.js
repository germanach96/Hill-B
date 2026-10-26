// Pure logic: no DOM, no network. Shared by the app and the Node tests.

/** Seconds the run will last. Distance uses the pace in seconds per km. */
export function sessionSeconds({ mode, minutes, km, pace }) {
  if (mode === 'distance') return Math.round(km * pace);
  return Math.round(minutes * 60);
}

export const WINDOW = { start: 5 * 60, step: 5 * 60 };

/**
 * Picks `count` albums at random among those whose full running time is close to the run.
 * The window starts at ±5 min of the run and widens 5 min each side until it holds `pool` records
 * (twice the deck, so there is room to vary) and `count` records not in `seen`, so "Otros 5" keeps
 * finding new albums by looking further out. Seen records only fill in when there are no others left.
 * Two editions of one record share a `group` (the original and its deluxe, say): one of them at most,
 * and once one edition is seen the record counts as seen.
 * Returns the picked albums closest first, and the window they came from (`reach`, ± seconds).
 */
export function pickAlbums(albums, targetSec, { count = 5, pool = count * 2, seen = [], random = Math.random } = {}) {
  const playable = albums.filter((a) => a.seconds > 0);
  const groupOf = (album) => album.group ?? album.id;
  const seenIds = new Set(seen);
  const seenGroups = new Set(playable.filter((a) => seenIds.has(a.id)).map(groupOf));
  const groupsIn = (list) => new Set(list.map(groupOf));
  const allGroups = groupsIn(playable);
  const unseenTotal = [...allGroups].filter((g) => !seenGroups.has(g)).length;
  const farthest = Math.max(0, ...playable.map((a) => Math.abs(a.seconds - targetSec)));

  let reach = WINDOW.start;
  let inWindow = [];
  for (;;) {
    inWindow = playable.filter((a) => Math.abs(a.seconds - targetSec) <= reach);
    const groups = groupsIn(inWindow);
    const unseen = [...groups].filter((g) => !seenGroups.has(g)).length;
    const enough = groups.size >= Math.min(pool, allGroups.size) && unseen >= Math.min(count, unseenTotal);
    if (enough || reach >= farthest) break;
    reach += WINDOW.step;
  }

  // One random edition per record, then a random set of records, unseen ones first.
  const byGroup = new Map();
  for (const album of shuffle(inWindow, random)) {
    const group = groupOf(album);
    const kept = byGroup.get(group);
    if (!kept || (seenIds.has(kept.id) && !seenIds.has(album.id))) byGroup.set(group, album);
  }
  const candidates = shuffle([...byGroup.values()], random);
  const fresh = candidates.filter((a) => !seenGroups.has(groupOf(a)));
  const stale = candidates.filter((a) => seenGroups.has(groupOf(a)));

  const picks = [...fresh, ...stale]
    .slice(0, count)
    .map((album) => ({ album, duration: album.seconds, delta: album.seconds - targetSec }))
    .sort((x, y) => Math.abs(x.delta) - Math.abs(y.delta));
  return { picks, reach };
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Kilometres the album lasts at a pace in seconds per km. */
export function albumKm(seconds, pace) {
  return pace > 0 ? seconds / pace : 0;
}

/** "8,8": one decimal, Spanish comma; whole numbers without it. */
export function formatKmValue(km) {
  const tenths = Math.round(km * 10) / 10;
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1).replace('.', ',');
}

// Tags that say nothing about the sound: personal lists, formats, awards. Tags with digits
// (years, decades, "s2", "chill906") and one-off tags (weight under 3) go too.
const TAG_NOISE = new Set(['favourite', 'favourites', 'favorite', 'favorites', 'favourite albums', 'favorite albums',
  'albums i own', 'seen live', 'vinyl', 'cd', 'album', 'all', 'this is music', 'fucking great', 'male vocalists',
  'female vocalists', 'male vocalist', 'female vocalist', 'canciones que me gustan mucho', 'musica del recuerdo', 'rock del bueno', 'under 2000 listeners']);
const tagKey = (name) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The few Last.fm tags worth showing on a card: the album's own and its artist's ([name, weight]
 * pairs), noise out, the artist's and the album's names out, one per spelling ("hip-hop" = "hip hop"), and a broad tag
 * left out when a more precise one that contains it scores at least half as much ("rock" under
 * "alternative rock"), whose place and strength the precise one takes. An album tag counts in full, an artist tag at 70%, both at once get a bonus.
 */
export function relevantTags(album, count = 5) {
  return rankedTags(album, count).map((t) => t.name);
}

/**
 * relevantTags with how strong each one is: `level`, its score against the strongest tag of the
 * album (which always has 1), never under 0.06 so every bar shows. The card draws it as a bar.
 */
export function rankedTags(album, count = 7) {
  // The artist's name and the album's own name are not tags ("zucchero", "la sesion cubana").
  const own = new Set([...(album.artists ?? []), album.name ?? '', (album.name ?? '').replace(/\s*[([].*?[)\]]/g, '')]
    .map(tagKey).filter(Boolean));
  const scored = new Map();
  const add = (tags = [], factor) => {
    for (const [name, weight] of tags) {
      const key = tagKey(name);
      if (weight < 3 || /\d/.test(key) || TAG_NOISE.has(key) || /grammy/.test(key) || own.has(key)) continue;
      if ([...own].some((a) => a && key.includes(a))) continue;
      const prev = scored.get(key);
      const score = weight * factor;
      scored.set(key, prev
        ? { name: prev.name, score: Math.max(prev.score, score) + 20 }
        : { name: name.trim(), score });
    }
  };
  add(album.tags, 1);
  add(album.artistTags, 0.7);
  // "chile" and "chilean", "cuba" and "cuban": one word and the same word with an ending are one tag.
  const sameWord = (a, b) => !a.includes(' ') && !b.includes(' ') && a !== b
    && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 3;
  const list = [];
  for (const entry of [...scored].sort((x, y) => y[1].score - x[1].score)) {
    if (!list.some(([key]) => sameWord(key, entry[0]))) list.push(entry);
  }
  const within = (broad, precise) => precise !== broad && ` ${precise} `.includes(` ${broad} `);
  // A precise tag takes the place, and the strength, of the broad one it stands for.
  const kept = list.filter(([key, t]) => !list.some(([other, o]) => within(key, other) && o.score >= t.score * 0.5));
  for (const [key, t] of kept) {
    for (const [broad, b] of list) if (within(broad, key) && !kept.some(([k]) => k === broad)) t.score = Math.max(t.score, b.score);
  }
  const top = kept.sort((x, y) => y[1].score - x[1].score).slice(0, count);
  const max = top[0]?.[1].score ?? 1;
  return top.map(([, t]) => ({ name: t.name, level: Math.max(0.06, Math.round((t.score / max) * 100) / 100) }));
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
