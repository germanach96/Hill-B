# Estado del proyecto (para retomar en otra conversación)

Actualizado: 2026-10-26.

## Qué es
Hill-B: app web móvil (PWA estática) que responde "¿qué disco entero me conviene escuchar en esta sesión de correr?". Propone 5 discos de la playlist "The Magic Bus" (`77Yaz4xSfZjJqRTIXo4ZE2`, del usuario) cuya duración mejor cubre la salida, por tiempo o por km + ritmo.

## Dónde está
- Publicada en **https://hill-b.onrender.com** (Render, sitio estático desde `main`, `render.yaml` → `public/`). Cada merge a `main` redespliega.
- `main` es la rama por defecto. **Claude Code solo cambia `main` por PR** (regla en `CLAUDE.md` + hook `.claude/hooks/no-direct-main.sh`). No hay protección en GitHub y el usuario no la quiere.
- PR #1 (la app) mergeado. PR #2 (hook + este archivo) mergeado.

## Decisiones del usuario (no reabrir)
- Sin inicio de sesión en la app y sin página de carga. La app solo lee `public/data/albums.json`; Spotify solo sirve para cargar datos y para el botón "Abrir en Spotify".
- Los datos los carga Claude: el usuario dice la playlist y Claude lee, guarda y abre PR. Son ~800 discos; se leen una vez y a veces se releen (solo se miden los nuevos).
- Estilo Nike Run Club, paleta clara, viva y sencilla, mucha animación, 5 discos que se deslizan. Diseño documentado en `diseno/DESIGN.md` y producto en `diseno/PRODUCT.md`.
- Cuenta de Spotify Premium. Client ID `6b13ef05e42d4331a1fbbbc839bc1092`.

## Pendiente: dos tareas bloqueadas por la cuota de Spotify (retomar el 2026-10-27)
El usuario dirá "sigue" en la misma conversación. Spotify devolvió 429 con `Retry-After` ≈ 24 h el 2026-10-26: primero en `/albums`, `/tracks` y `/artists` por ID, y después también en `/search`. `/me` y leer la playlist siguen funcionando.

1. **Medir los 229 discos que faltan** (600 de 829 en `public/data/albums.json`, PR #3): `node tools/sync.mjs read` mide solo los que faltan. Después, commit y PR a `main`.
2. **Álbum original de las canciones no directas** (para el Excel `The Magic Bus.xlsx`): quedan 169 pendientes y 27 deducidas por el nombre sin verificar. Estado y scripts en `tools/catalogo/` (ver su README):
   - `node tools/catalogo/dump.mjs <entries.json>`
   - `node tools/catalogo/lookup.mjs <entries.json> tools/catalogo/cache.json tools/catalogo/results.json` (reanuda)
   - `finalize.mjs`, `additions.mjs`, `flatten.mjs` y `build_xlsx.py` → Excel nuevo para el usuario, con los 229 discos ya medidos.
3. **Originales encontrados en la lista de discos**: el usuario quiere en la lista las dos versiones (la no original, sin sencillos ni EP, y la original encontrada), sin repetir. En el Excel ya están 112 (columna Origen = "Original encontrado"), sin medir. Mañana: medirlos con `/albums/{id}` (más los que salgan de las 169 pendientes) y proponer al usuario meterlos también en `public/data/albums.json` para que la app los recomiende.

Si el contenedor es nuevo, la sesión de Spotify (`.sync/`, fuera de git) se perdió: `node tools/sync.mjs login`, el usuario abre el enlace y pega la URL de vuelta, y luego `node tools/sync.mjs read "<URL>"`. La Redirect URI ya está en el dashboard.

## Pendiente de definir por el usuario
- Paso de *mood* (va después de elegir tiempo/km). No está construido.
- Factor aleatorio.
- Detalles extra de cada disco además de portada, artista y duración.

## Notas técnicas
- Pruebas: `npm test` (lógica) y `npm run e2e` (Playwright con datos inventados; capturas en `.impeccable/review/`).
- El MCP de Playwright no arranca en el contenedor cloud (busca Google Chrome); se usa la librería de Playwright (`require('playwright')`). Figma MCP sin autenticar.
- Spotify 2026: `GET /playlists/{id}/items` solo para playlists propias; sin `GET /albums` por lotes (un disco por llamada); modo desarrollo con cuota compartida.
