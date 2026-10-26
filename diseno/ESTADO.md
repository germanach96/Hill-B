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
- Logo: una B en negrita acostada (Archivo 900, girada a la izquierda, sus panzas son dos colinas). Archivos en `diseno/logo/`, reglas en `diseno/DESIGN.md` § Logo.
- Cuenta de Spotify Premium. Client ID `6b13ef05e42d4331a1fbbbc839bc1092`.

## Siguiente paso: terminar de medir los discos (en curso)
Lectura del 2026-10-26 (rama `claude/clever-cannon-xdcy2b`): 1598 canciones → 829 discos enteros (álbum o compilación; sencillos y EP fuera). Hay **600 medidos** en `public/data/albums.json`; faltan 229 porque Spotify agotó la cuota diaria (`Retry-After` ≈ 24 h).
1. Pasadas ~24 h, `node tools/sync.mjs read` reanuda: solo mide los que faltan (los ya medidos salen de `albums.json`).
2. La sesión de Spotify vive en `.sync/` (fuera de git). En un contenedor nuevo hay que repetir el login: `node tools/sync.mjs login`, el usuario abre el enlace y pega la URL de vuelta, y `node tools/sync.mjs read "<URL>"`. La Redirect URI `http://127.0.0.1:5173/callback` ya está en el dashboard.
3. Con los 829 medidos: commit y PR a `main`.

## Pendiente de definir por el usuario
- Paso de *mood* (va después de elegir tiempo/km). No está construido.
- Factor aleatorio.
- Detalles extra de cada disco además de portada, artista y duración.

## Notas técnicas
- Logo e iconos: `python3 tools/logo.py` (necesita `pip install fonttools brotli`) y después `node tools/logo-png.mjs`.
- Pruebas: `npm test` (lógica) y `npm run e2e` (Playwright con datos inventados; capturas en `.impeccable/review/`).
- El MCP de Playwright no arranca en el contenedor cloud (busca Google Chrome); se usa la librería de Playwright (`require('playwright')`). Figma MCP sin autenticar.
- Spotify 2026: `GET /playlists/{id}/items` solo para playlists propias; sin `GET /albums` por lotes (un disco por llamada); modo desarrollo con cuota compartida.
