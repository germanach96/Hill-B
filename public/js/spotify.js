// Spotify Web API in the browser: Authorization Code with PKCE, no client secret, no server.

export const CLIENT_ID = '6b13ef05e42d4331a1fbbbc839bc1092';
export const PLAYLIST_ID = '77Yaz4xSfZjJqRTIXo4ZE2'; // The Magic Bus
const SCOPES = 'playlist-read-private playlist-read-collaborative';
const API = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const TOKENS_KEY = 'hillb.tokens';
const VERIFIER_KEY = 'hillb.pkce';

export class SpotifyError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.kind = kind; // 'auth' | 'forbidden' | 'quota' | 'network' | 'http'
    this.status = status;
  }
}

export const redirectUri = () => `${location.origin}/callback`;

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: session-only */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
export { store };

function randomString(bytes = 48) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return base64url(values);
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startLogin() {
  const verifier = randomString(64);
  const state = randomString(16);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  store.set(VERIFIER_KEY, { verifier, state });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: base64url(new Uint8Array(digest)),
    state,
  });
  location.assign(`${ACCOUNTS}/authorize?${params}`);
}

/** Finishes the redirect from Spotify. Returns true when a login was completed. */
export async function finishLogin() {
  const params = new URLSearchParams(location.search);
  if (location.pathname !== '/callback') return false;
  const pending = store.get(VERIFIER_KEY);
  store.remove(VERIFIER_KEY);
  history.replaceState(null, '', '/');
  if (params.get('error')) throw new SpotifyError('auth', 'Cancelaste la conexión con Spotify.');
  if (!pending || params.get('state') !== pending.state || !params.get('code')) {
    throw new SpotifyError('auth', 'La conexión con Spotify no se completó. Prueba otra vez.');
  }
  await requestToken({
    grant_type: 'authorization_code',
    code: params.get('code'),
    redirect_uri: redirectUri(),
    client_id: CLIENT_ID,
    code_verifier: pending.verifier,
  });
  return true;
}

async function requestToken(body) {
  let res;
  try {
    res = await fetch(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
  } catch {
    throw new SpotifyError('network', 'Sin conexión con Spotify.');
  }
  if (!res.ok) {
    store.remove(TOKENS_KEY);
    throw new SpotifyError('auth', 'Tu sesión de Spotify caducó. Conéctate otra vez.', res.status);
  }
  const data = await res.json();
  const previous = store.get(TOKENS_KEY);
  const tokens = {
    access: data.access_token,
    // Spotify may or may not rotate the refresh token; keep the old one when it doesn't.
    refresh: data.refresh_token ?? previous?.refresh,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  store.set(TOKENS_KEY, tokens);
  return tokens;
}

export const isLoggedIn = () => Boolean(store.get(TOKENS_KEY)?.refresh);

export function logout() {
  store.remove(TOKENS_KEY);
}

let refreshing = null;
async function accessToken({ force = false } = {}) {
  const tokens = store.get(TOKENS_KEY);
  if (!tokens?.refresh) throw new SpotifyError('auth', 'Conéctate con Spotify para empezar.');
  if (!force && tokens.access && Date.now() < tokens.expiresAt) return tokens.access;
  refreshing ??= requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: CLIENT_ID })
    .finally(() => { refreshing = null; });
  return (await refreshing).access;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, { retried = false, attempt = 0 } = {}) {
  const token = await accessToken({ force: retried });
  let res;
  try {
    res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new SpotifyError('network', 'Sin conexión con Spotify.');
  }
  if (res.status === 401 && !retried) return api(path, { retried: true, attempt });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const reason = body?.error?.reason ?? body?.reason;
    const wait = Number(res.headers.get('Retry-After') ?? 2);
    if (reason === 'QUOTA_EXCEEDED' || wait > 30 || attempt >= 3) {
      throw new SpotifyError('quota', 'Spotify limitó las consultas por ahora.', 429);
    }
    await sleep(wait * 1000);
    return api(path, { retried, attempt: attempt + 1 });
  }
  if (res.status === 403 || res.status === 404) {
    throw new SpotifyError('forbidden', 'Spotify no deja leer esta playlist: tiene que ser tuya o colaborativa.', res.status);
  }
  if (!res.ok) throw new SpotifyError('http', `Spotify respondió con un error (${res.status}).`, res.status);
  return res.json();
}

export function getPlaylist(id = PLAYLIST_ID) {
  return api(`/playlists/${id}?fields=name,snapshot_id`);
}

/** Every entry of the playlist, following `next` 50 at a time. */
export async function getPlaylistEntries(id = PLAYLIST_ID, onPage) {
  const entries = [];
  let url = `/playlists/${id}/items?limit=50`;
  while (url) {
    const page = await api(url);
    entries.push(...(page.items ?? []));
    onPage?.(entries.length, page.total ?? entries.length);
    url = page.next;
  }
  return entries;
}

/** The album's full running time in seconds. Batch GET /albums is gone, so one album per call. */
export async function getAlbumSeconds(albumId) {
  const album = await api(`/albums/${albumId}`);
  let ms = (album.tracks?.items ?? []).reduce((sum, t) => sum + (t.duration_ms ?? 0), 0);
  let next = album.tracks?.next;
  while (next) {
    const page = await api(next);
    ms += (page.items ?? []).reduce((sum, t) => sum + (t.duration_ms ?? 0), 0);
    next = page.next;
  }
  return Math.round(ms / 1000);
}
