// Álbumes originales encontrados que aún no están en la lista de discos (ni por ID ni por nombre + artista).
import { readFileSync, writeFileSync } from 'node:fs';
const [entriesPath, resultsPath, flatPath, out] = process.argv.slice(2);
const entries = JSON.parse(readFileSync(entriesPath));
const results = JSON.parse(readFileSync(resultsPath));
const flat = JSON.parse(readFileSync(flatPath));
const norm = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const haveId = new Set(flat.albums.map((a) => a.id));
const byName = new Map(flat.albums.map((a) => [`${norm(a.name)}|${a.artists.split(', ')[0]}`, a.id]));
const remap = {};
const add = new Map();
for (const e of entries) {
  const r = results[e.item.id];
  const id = r?.url?.match(/album\/(\w{22})/)?.[1];
  if (!id || haveId.has(id)) continue;
  const same = byName.get(`${norm(r.album)}|${e.item.artists[0].name}`);
  if (same) { remap[id] = same; continue; }
  if (!add.has(id)) add.set(id, { id, name: r.album, artists: e.item.artists[0].name, release: r.date, url: r.url });
}
writeFileSync(out, JSON.stringify({ add: [...add.values()], remap }));
console.log(add.size, Object.keys(remap).length);
