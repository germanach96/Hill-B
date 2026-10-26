// Reads a Spotify playlist into the catalog (data/catalog.json) and writes public/data/albums.json,
// the data the app ships with. Run by Claude in the dev container; the app itself never talks to Spotify.
//
//   node tools/sync.mjs login                  prints the one-time Spotify login link
//   node tools/sync.mjs read "<redirect URL>"  finishes that login and reads the playlist
//   node tools/sync.mjs read                   reads again with the session kept in .sync/
//   --playlist <id or open.spotify.com URL>    another playlist (default: The Magic Bus)
//
// For each new song (rules in tools/catalog.mjs):
//   1. its album comes with the song; if the catalog has it, the song only joins it;
//   2. if that album is a special version, search the studio original (same recording by ISRC,
//      then title and artist) and add it too, unless it is already there;
//   3. measure every full album still without its running time (GET /albums/{id}, one per call).
// Originals set by hand go in data/manual.json. Each step saves as it goes: when Spotify's quota
// runs out, run `read` again later and it carries on where it stopped.
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { displayName } from '../public/js/recommend.js';
import {
  emptyCatalog, addEntries, songsWithoutOriginal, pickOriginal, slimTrack, baseTitle, setOriginal,
  applyManual, albumsToMeasure, setMeasured, buildLibrary,
} from './catalog.mjs';

const CLIENT_ID = '6b13ef05e42d4331a1fbbbc839bc1092';
const REDIRECT = 'http://127.0.0.1:5173/callback';
const DEFAULT_PLAYLIST = '77Yaz4xSfZjJqRTIXo4ZE2'; // The Magic Bus
const ROOT = new URL('..', import.meta.url).pathname;
const STATE = `${ROOT}.sync`; // gitignored: PKCE verifier, session, partial measurements
const DATA = `${ROOT}public/data/albums.json`;
const CATALOG = `${ROOT}data/catalog.json`; // every song, its album and its original
const MANUAL = `${ROOT}data/manual.json`; // originals the owner found by hand

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 1));
const b64url = (buf) => buf.toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(STATE, { recursive: true });

async function token(body) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) throw new Error(`Spotify rechazó el inicio de sesión (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const previous = readJson(`${STATE}/session.json`);
  const session = {
    access: data.access_token,
    refresh: data.refresh_token ?? previous?.refresh,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  writeJson(`${STATE}/session.json`, session);
  return session;
}

async function accessToken() {
  let s = readJson(`${STATE}/session.json`);
  const refresh = s?.refresh ?? process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refresh) throw new Error('No hay sesión de Spotify: corre primero `node tools/sync.mjs login`.');
  if (!s?.access || Date.now() >= s.expiresAt) s = await token({ grant_type: 'refresh_token', refresh_token: refresh });
  return s.access;
}

async function api(url, attempt = 0) {
  const res = await fetch(url.startsWith('http') ? url : `https://api.spotify.com/v1${url}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const wait = Number(res.headers.get('Retry-After') ?? 5);
    if ((body?.error?.reason ?? body?.reason) === 'QUOTA_EXCEEDED' || wait > 120 || attempt > 5) {
      const err = new Error('Spotify limitó las consultas por ahora.');
      err.quota = true;
      throw err;
    }
    await sleep(wait * 1000);
    return api(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

function login() {
  const verifier = b64url(randomBytes(64));
  const state = b64url(randomBytes(16));
  writeJson(`${STATE}/pkce.json`, { verifier, state });
  const params = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT,
    scope: 'playlist-read-private playlist-read-collaborative',
    code_challenge_method: 'S256',
    code_challenge: b64url(createHash('sha256').update(verifier).digest()),
    state,
  });
  console.log(`https://accounts.spotify.com/authorize?${params}`);
}

async function read(redirectUrl, playlistArg) {
  if (redirectUrl) {
    const params = new URL(redirectUrl).searchParams;
    const pkce = readJson(`${STATE}/pkce.json`);
    if (!pkce || params.get('state') !== pkce.state) throw new Error('El enlace no corresponde al último login: pide uno nuevo.');
    await token({ grant_type: 'authorization_code', code: params.get('code'), redirect_uri: REDIRECT, code_verifier: pkce.verifier });
  }
  const id = (playlistArg ?? DEFAULT_PLAYLIST).match(/([A-Za-z0-9]{22})/)?.[1];
  const meta = await api(`/playlists/${id}?fields=name,snapshot_id`);
  const playlist = { id, name: displayName(meta.name), snapshot: meta.snapshot_id };

  const entries = [];
  for (let url = `/playlists/${id}/items?limit=50`; url;) {
    const page = await api(url);
    entries.push(...(page.items ?? []));
    process.stdout.write(`\rCanciones: ${entries.length}/${page.total}`);
    url = page.next;
  }

  const catalog = readJson(CATALOG) ?? emptyCatalog(id);
  if (catalog.playlist !== id) throw new Error(`data/catalog.json es de la playlist ${catalog.playlist}, no de ${id}.`);
  const save = () => {
    mkdirSync(`${ROOT}data`, { recursive: true });
    writeJson(CATALOG, catalog);
  };
  const added = addEntries(catalog, entries);
  applyManual(catalog, readJson(MANUAL));
  console.log(`\nCanciones nuevas: ${added.length}`);
  save();

  let stopped = null;
  const pending = songsWithoutOriginal(catalog);
  console.log(`Canciones por buscar su álbum original: ${pending.length}`);
  let searched = 0;
  try {
    for (const songId of pending) {
      await findOriginal(catalog, songId);
      if (++searched % 10 === 0) { save(); process.stdout.write(`\rBuscadas: ${searched}`); }
    }
  } catch (err) {
    if (!err.quota) throw err;
    stopped = err;
  }
  save();

  const missing = albumsToMeasure(catalog);
  console.log(`\nDiscos por medir: ${missing.length}`);
  let done = 0;
  let measureStop = null;
  const worker = async () => {
    while (missing.length && !measureStop) {
      const albumId = missing.shift();
      try {
        const a = await api(`/albums/${albumId}`);
        let ms = a.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);
        for (let next = a.tracks.next; next;) {
          const page = await api(next);
          ms += page.items.reduce((sum, t) => sum + t.duration_ms, 0);
          next = page.next;
        }
        setMeasured(catalog, albumId, a, Math.round(ms / 1000));
        if (++done % 10 === 0) { save(); process.stdout.write(`\rMedidos: ${done}`); }
      } catch (err) {
        if (!err.quota) throw err;
        measureStop = err;
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  save();

  const lib = buildLibrary(catalog, { playlist });
  mkdirSync(`${ROOT}public/data`, { recursive: true });
  writeJson(DATA, lib);
  console.log(`\n${lib.albums.length} discos enteros de ${lib.songCount} canciones → public/data/albums.json`);
  const left = { search: songsWithoutOriginal(catalog).length, measure: albumsToMeasure(catalog).length };
  if (left.search || left.measure) {
    console.log(`Spotify limitó las consultas: faltan ${left.search} canciones por buscar y ${left.measure} discos por medir. Vuelve a correr \`read\` más tarde.`);
    process.exitCode = 2;
  }
}

/** Searches the studio original of a song from a special version: same recording, then title and artist. */
async function findOriginal(catalog, songId) {
  const song = catalog.songs[songId];
  const own = catalog.albums[song.album];
  const search = async (q, pages) => {
    const out = [];
    for (let p = 0; p < pages; p++) {
      // Search returns 10 results per call at most (2026 API).
      const r = await api(`/search?type=track&limit=10&offset=${p * 10}&q=${encodeURIComponent(q)}`);
      out.push(...(r.tracks?.items ?? []).filter(Boolean).map(slimTrack));
      if (!r.tracks?.next) break;
    }
    return out;
  };
  let found = null;
  let how = '';
  if (song.isrc) {
    found = pickOriginal(await search(`isrc:${song.isrc}`, 2), song, own);
    if (found) how = 'Misma grabación (ISRC)';
  }
  if (!found || found.edition) {
    const title = baseTitle(song.name);
    const byName = pickOriginal((await search(`track:"${title}" artist:"${song.artists[0]}"`, 3))
      .filter((t) => baseTitle(t.name) === title), song, own);
    if (byName && (!found || !byName.edition)) { found = byName; how = 'Misma canción en otro disco (título y artista)'; }
  }
  setOriginal(catalog, songId, found, how);
}

const [cmd, arg] = process.argv.slice(2).filter((x, i, all) => x !== '--playlist' && all[i - 1] !== '--playlist');
const playlistArg = process.argv.includes('--playlist') ? process.argv[process.argv.indexOf('--playlist') + 1] : undefined;
if (cmd === 'login') login();
else if (cmd === 'read') await read(arg, playlistArg);
else console.log('Uso: node tools/sync.mjs login | read ["<redirect URL>"] [--playlist <id>]');
