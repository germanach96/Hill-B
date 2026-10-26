// Reads a Spotify playlist and writes public/data/albums.json, the data the app ships with.
// Run by Claude in the dev container; the app itself never talks to Spotify.
//
//   node tools/sync.mjs login                  prints the one-time Spotify login link
//   node tools/sync.mjs read "<redirect URL>"  finishes that login and reads the playlist
//   node tools/sync.mjs read                   reads again with the session kept in .sync/
//   --playlist <id or open.spotify.com URL>    another playlist (default: The Magic Bus)
//
// Only albums the data file does not have yet are measured; an interrupted read resumes.
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { buildLibrary, albumsToMeasure, displayName } from '../public/js/recommend.js';

const CLIENT_ID = '6b13ef05e42d4331a1fbbbc839bc1092';
const REDIRECT = 'http://127.0.0.1:5173/callback';
const DEFAULT_PLAYLIST = '77Yaz4xSfZjJqRTIXo4ZE2'; // The Magic Bus
const ROOT = new URL('..', import.meta.url).pathname;
const STATE = `${ROOT}.sync`; // gitignored: PKCE verifier, session, partial measurements
const DATA = `${ROOT}public/data/albums.json`;

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

  const current = readJson(DATA);
  const known = {
    ...(current?.playlist?.id === id ? Object.fromEntries(current.albums.map((a) => [a.id, a.seconds])) : {}),
    ...readJson(`${STATE}/seconds.json`),
  };
  const missing = albumsToMeasure(entries, known);
  console.log(`\nDiscos nuevos por medir: ${missing.length}`);
  let done = 0;
  let stopped = null;
  const worker = async () => {
    while (missing.length && !stopped) {
      const album = missing.shift();
      try {
        const a = await api(`/albums/${album.id}`);
        let ms = a.tracks.items.reduce((s, t) => s + t.duration_ms, 0);
        for (let next = a.tracks.next; next;) {
          const page = await api(next);
          ms += page.items.reduce((s, t) => s + t.duration_ms, 0);
          next = page.next;
        }
        known[album.id] = Math.round(ms / 1000);
        if (++done % 10 === 0) { writeJson(`${STATE}/seconds.json`, known); process.stdout.write(`\rMedidos: ${done}`); }
      } catch (err) {
        stopped = err;
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  writeJson(`${STATE}/seconds.json`, known);

  const lib = buildLibrary({ playlist, entries, seconds: known });
  mkdirSync(`${ROOT}public/data`, { recursive: true });
  writeJson(DATA, lib);
  console.log(`\n${lib.albums.length} discos enteros de ${lib.songCount} canciones → public/data/albums.json`);
  if (stopped) {
    console.log(`Interrumpido: ${stopped.message} Faltan ${albumsToMeasure(entries, known).length}; vuelve a correr \`read\` para seguir.`);
    process.exitCode = 2;
  }
}

const [cmd, arg] = process.argv.slice(2).filter((x, i, all) => x !== '--playlist' && all[i - 1] !== '--playlist');
const playlistArg = process.argv.includes('--playlist') ? process.argv[process.argv.indexOf('--playlist') + 1] : undefined;
if (cmd === 'login') login();
else if (cmd === 'read') await read(arg, playlistArg);
else console.log('Uso: node tools/sync.mjs login | read ["<redirect URL>"] [--playlist <id>]');
