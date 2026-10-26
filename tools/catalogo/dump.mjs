import { readFileSync, writeFileSync } from 'node:fs';
const tok = JSON.parse(readFileSync('/home/user/Hill-B/.sync/session.json')).access;
const all = [];
for (let url = 'https://api.spotify.com/v1/playlists/77Yaz4xSfZjJqRTIXo4ZE2/items?limit=50'; url;) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) throw new Error(r.status + ' ' + await r.text());
  const p = await r.json(); all.push(...p.items); url = p.next;
}
writeFileSync(process.argv[2], JSON.stringify(all));
console.log(all.length);
