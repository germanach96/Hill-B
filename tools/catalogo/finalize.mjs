// Junta clasificación + búsqueda en una fila por canción, con reglas para lo no encontrado.
import { readFileSync, writeFileSync } from 'node:fs';
import { caseOf } from './classify.mjs';
const [entriesPath, resultsPath, out] = process.argv.slice(2);
const entries = JSON.parse(readFileSync(entriesPath));
const results = JSON.parse(readFileSync(resultsPath));
const baseAlbum = (n) => n.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim() || n;
const rows = {};
const tally = {};
for (const e of entries) {
  const t = e.item, a = t.album, kind = caseOf(t), r = results[t.id];
  const own = { album: a.name, year: (a.release_date || '').slice(0, 4), url: a.external_urls?.spotify };
  let row;
  if (kind === 'Directa') row = { ...own, how: 'Es el álbum original' };
  else if (!r && (kind === 'Deluxe o edición especial' || kind === 'Remasterizado'))
    row = { album: baseAlbum(a.name), year: '', url: '', how: 'Edición estándar, deducida del nombre; falta verificar en Spotify (cuota)' };
  else if (!r) row = { album: null, year: '', url: '', how: 'Pendiente: Spotify cortó la búsqueda por cuota' };
  else if (r.album) {
    row = { album: r.how.includes('edición especial') ? baseAlbum(r.album) : r.album, year: (r.date || '').slice(0, 4), url: r.url, how: r.how };
    const later = (r.date || '') > (a.release_date || '');
    const gap = Number(row.year) - Number(own.year);
    if ((kind !== 'Sencillo' && later && gap >= 1) || (kind === 'Sencillo' && gap > 3)) row.how += '. Revisar: el original es posterior';
  } else if (kind === 'Deluxe o edición especial' || kind === 'Remasterizado')
    row = { album: baseAlbum(a.name), year: '', url: '', how: 'Edición estándar del mismo disco; Spotify solo tiene esta edición' };
  else if (kind === 'Sencillo')
    row = { album: 'Sin álbum (solo sencillo)', year: '', url: '', how: 'No aparece en ningún álbum del artista en Spotify' };
  else if (kind === 'Recopilatorio')
    row = { ...own, how: 'No aparece en otro disco: este es donde salió' };
  else row = { album: null, year: '', url: '', how: 'No encontrado' };
  rows[t.id] = { kind, ...row };
  const k = `${kind} · ${row.how.split(/[.;]/)[0]}`; tally[k] = (tally[k] || 0) + 1;
}
writeFileSync(out, JSON.stringify(rows));
console.log(tally);
console.log('Revisar:', Object.values(rows).filter((r) => r.how.includes('Revisar')).length);
