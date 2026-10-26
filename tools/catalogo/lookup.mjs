// Busca el álbum de estudio original de cada canción que no viene de uno.
// Uso: node lookup.mjs <entries.json> <cache.json> <out.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { caseOf, LIVE, COMP, DELUXE, REMASTER } from './classify.mjs';

const [entriesPath, cachePath, outPath] = process.argv.slice(2);
const SESSION = '/home/user/Hill-B/.sync/session.json';
const CLIENT_ID = '6b13ef05e42d4331a1fbbbc839bc1092';
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath)) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function token() {
  let s = JSON.parse(readFileSync(SESSION));
  if (Date.now() < s.expiresAt) return s.access;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: s.refresh }),
  });
  const d = await r.json();
  s = { access: d.access_token, refresh: d.refresh_token ?? s.refresh, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  writeFileSync(SESSION, JSON.stringify(s));
  return s.access;
}

class Quota extends Error {}
async function search(q, offset = 0) {
  const key = `${q}|${offset}`;
  if (cache[key]) return cache[key];
  if (process.env.OFFLINE) return { next: false, items: [] };
  for (let attempt = 0; ; attempt++) {
    const url = `https://api.spotify.com/v1/search?type=track&limit=10&offset=${offset}&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });
    calls++;
    if (r.status === 429) {
      const wait = Number(r.headers.get('retry-after') ?? 5);
      if (wait > 60 || attempt > 4) throw new Quota(`429, Retry-After ${wait}s`);
      await sleep(wait * 1000 + 500);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${await r.text()} (${q})`);
    const d = await r.json();
    const slim = {
      next: !!d.tracks?.next,
      items: (d.tracks?.items ?? []).filter(Boolean).map((t) => ({
        name: t.name, artists: t.artists.map((a) => a.id),
        album: { id: t.album.id, name: t.album.name, type: t.album.album_type, date: t.album.release_date,
          artists: t.album.artists.map((a) => a.id), url: t.album.external_urls?.spotify },
      })),
    };
    cache[key] = slim;
    return slim;
  }
}

const strip = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
// "Song - Live at X", "Song (Remastered 2011)", "Song - Marian Hill Remix" → "song"
export const baseTitle = (name) =>
  strip(name).replace(/\s+-\s+.*$/, '').replace(/\s*[([].*?[)\]]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const baseAlbum = (name) => name.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim();
const OTHER = /\b(remix(es)?|covers?|tribut[eo]|lullaby|karaoke|instrumental|tour|gira|navidad|christmas|rom[aá]nticas|baladas|duetos)\b/i;
const special = (n) => LIVE.test(n) || COMP.test(n) || DELUXE.test(n) || REMASTER.test(n);
const liveTrack = (n) => /[-(]\s*(live|en vivo|ao vivo|en directo|directo|acoustic|ac[uú]stico)\b/i.test(n);

function pick(candidates, song) {
  // A studio original comes before the live/compilation/deluxe it is taken from; a single's album at most ~3 years after.
  const own = song.album.release_date || '9999';
  const limit = song.album.album_type === 'single' ? `${Number(own.slice(0, 4)) + 3}${own.slice(4)}` : `${own}~`;
  const ids = new Set(song.artists.map((a) => a.id));
  const ok = candidates.filter((c) => c.album.type === 'album' && c.album.id !== song.album.id
    && (c.artists.some((a) => ids.has(a)) || c.album.artists.some((a) => ids.has(a)))
    && !liveTrack(c.name) && !LIVE.test(c.album.name) && !COMP.test(c.album.name) && !OTHER.test(c.album.name)
    && (c.album.date || '9999') <= limit);
  const byDate = (a, b) => (a.album.date || '9999').localeCompare(b.album.date || '9999');
  const clean = ok.filter((c) => !DELUXE.test(c.album.name) && !REMASTER.test(c.album.name)).sort(byDate);
  if (clean.length) return { album: clean[0].album, edition: false };
  const any = ok.sort(byDate);
  return any.length ? { album: any[0].album, edition: true } : null;
}

async function collect(q, pages) {
  const out = [];
  for (let p = 0; p < pages; p++) {
    const r = await search(q, p * 10);
    out.push(...r.items);
    if (!r.next) break;
  }
  return out;
}

const entries = JSON.parse(readFileSync(entriesPath));
const results = existsSync(outPath) ? JSON.parse(readFileSync(outPath)) : {};
let stopped = null;
try {
  for (const [i, e] of entries.entries()) {
    const t = e.item;
    const kind = caseOf(t);
    if (kind === 'Directa') continue;
    if (process.env.OFFLINE ? !results[t.id] : results[t.id]) continue;
    const title = baseTitle(t.name);
    const main = t.artists[0];
    let hit = null, how = '';
    if (t.external_ids?.isrc) {
      const c = await collect(`isrc:${t.external_ids.isrc}`, 2);
      hit = pick(c, t);
      if (hit) how = 'Misma grabación (ISRC)';
    }
    if (!hit || hit.edition) {
      const c = (await collect(`track:"${title}" artist:"${main.name}"`, 3)).filter((x) => baseTitle(x.name) === title);
      const byName = pick(c, t);
      if (byName && (!hit || !byName.edition)) { hit = byName; how = 'Misma canción en otro disco (título y artista)'; }
    }
    results[t.id] = hit
      ? { kind, album: hit.album.name, date: hit.album.date, url: hit.album.url, how: how + (hit.edition ? '; Spotify solo la tiene en una edición especial' : '') }
      : { kind, album: null, how: 'No encontrado' };
    if (i % 20 === 0) { writeFileSync(cachePath, JSON.stringify(cache)); writeFileSync(outPath, JSON.stringify(results)); process.stdout.write(`\r${i}/${entries.length} llamadas ${calls}`); }
  }
} catch (err) {
  stopped = err;
}
writeFileSync(cachePath, JSON.stringify(cache));
writeFileSync(outPath, JSON.stringify(results));
const n = Object.values(results);
console.log(`\nResueltas ${n.filter((r) => r.album).length}, sin encontrar ${n.filter((r) => !r.album).length}, llamadas ${calls}`);
if (stopped) { console.log('Parado:', stopped.message); process.exitCode = 2; }
