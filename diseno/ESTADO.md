# Estado del proyecto (para retomar en otra conversación)

Actualizado: 2026-10-26.

## Qué es
Hill-B: app web móvil (PWA estática) que responde "¿qué disco entero me conviene escuchar en esta sesión de correr?". Propone 5 discos de la playlist "The Magic Bus" (`77Yaz4xSfZjJqRTIXo4ZE2`, del usuario) cuya duración mejor cubre la salida, por tiempo o por km + ritmo.

## Dónde está
- Publicada en **https://hill-b.onrender.com** (Render, sitio estático desde `main`, `render.yaml` → `public/`). Cada merge a `main` redespliega.
- `main` es la rama por defecto. **Claude Code solo cambia `main` por PR** (regla en `CLAUDE.md` + hook `.claude/hooks/no-direct-main.sh`). No hay protección en GitHub y el usuario no la quiere.
- PR #1 (la app) mergeado. PR #2 (hook + este archivo) pendiente de merge.

## Decisiones del usuario (no reabrir)
- Sin inicio de sesión en la app y sin página de carga. La app solo lee `public/data/albums.json`; Spotify solo sirve para cargar datos y para el botón "Abrir en Spotify".
- Los datos los carga Claude: el usuario dice la playlist y Claude lee, guarda y abre PR. Son ~800 discos; se leen una vez y a veces se releen (solo se miden los nuevos).
- Estilo Nike Run Club, paleta clara, viva y sencilla, mucha animación, 5 discos que se deslizan. Diseño documentado en `diseno/DESIGN.md` y producto en `diseno/PRODUCT.md`.
- Cuenta de Spotify Premium. Client ID `6b13ef05e42d4331a1fbbbc839bc1092`.

## Siguiente paso: cargar los discos reales (pendiente)
`public/data/albums.json` aún no existe (la app muestra "Todavía no hay discos cargados").
1. El usuario añade la Redirect URI `http://127.0.0.1:5173/callback` en el dashboard de Spotify (no confirmado aún).
2. Claude genera el enlace: `node tools/sync.mjs login` (guarda el verificador PKCE en `.sync/`, que no está en git: el enlace solo vale en el mismo contenedor que lo generó).
3. El usuario abre el enlace, acepta y pega la URL de la página de error a la que vuelve.
4. Claude ejecuta `node tools/sync.mjs read "<URL>"` → escribe `public/data/albums.json` (si Spotify corta la cuota, volver a ejecutar `read` reanuda), commit en una rama y PR a `main`.

## Pendiente de definir por el usuario
- Paso de *mood* (va después de elegir tiempo/km). No está construido.
- Factor aleatorio.
- Detalles extra de cada disco además de portada, artista y duración.

## Notas técnicas
- Pruebas: `npm test` (lógica) y `npm run e2e` (Playwright con datos inventados; capturas en `.impeccable/review/`).
- El MCP de Playwright no arranca en el contenedor cloud (busca Google Chrome); se usa la librería de Playwright (`require('playwright')`). Figma MCP sin autenticar.
- Spotify 2026: `GET /playlists/{id}/items` solo para playlists propias; sin `GET /albums` por lotes (un disco por llamada); modo desarrollo con cuota compartida.
