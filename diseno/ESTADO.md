# Estado del proyecto (para retomar en otra conversación)

Actualizado: 2026-10-26.

## Qué es
Hill-B: app web móvil (PWA estática) que responde "¿qué disco entero me conviene escuchar en esta sesión de correr?". Propone 5 discos de la playlist "The Magic Bus" (`77Yaz4xSfZjJqRTIXo4ZE2`, del usuario) cuya duración se acerca a la salida, por tiempo o por km + ritmo.

## Dónde está
- Publicada en **https://hill-b.onrender.com** (Render, sitio estático desde `main`, `render.yaml` → `public/`). Cada merge a `main` redespliega.
- `main` es la rama por defecto. **Claude Code solo cambia `main` por PR** (regla en `CLAUDE.md` + hook `.claude/hooks/no-direct-main.sh`). No hay protección en GitHub y el usuario no la quiere.
- PR #1 (la app) mergeado. PR #2 (hook + este archivo) mergeado. PR #3 (datos de The Magic Bus + catálogo con originales) abierto.

## Decisiones del usuario (no reabrir)
- Sin inicio de sesión en la app y sin página de carga. La app solo lee `public/data/albums.json`; Spotify solo sirve para cargar datos y para el botón "Abrir en Spotify".
- Los datos los carga Claude: el usuario dice la playlist y Claude lee, guarda y abre PR. Son ~800 discos; se leen una vez y a veces se releen (solo se miden los nuevos).
- Estilo Nike Run Club, paleta clara, viva y sencilla, mucha animación, 5 discos que se deslizan. Diseño documentado en `diseno/DESIGN.md` y producto en `diseno/PRODUCT.md`.
- Cuenta de Spotify Premium. Client ID `6b13ef05e42d4331a1fbbbc839bc1092`.
- Claude le manda al usuario el catálogo en Excel (`python3 tools/excel.py <archivo.xlsx>`): pestaña Canciones (con caso y álbum original) y pestaña Discos.

## Cómo elige los 5 discos (decidido por el usuario, 2026-10-26)
`pickAlbums` en `public/js/recommend.js`, pruebas en `tests/recommend.test.mjs`.
- Toma los discos que duran entre la salida −5 min y +5 min (1 h → de 0:55 a 1:05).
- Si en esa ventana hay menos de 10 discos (el doble de los que se muestran), la abre 5 min más por cada lado, y así hasta tener 10.
- De ahí elige 5 al azar: con el mismo tiempo, cada búsqueda da otros discos. Los 5 que se acaban de mostrar solo repiten si la ventana no tiene otros.
- Se muestran del más cercano al más lejano.
- **Botón "Otros 5"** (cabecera de resultados): saca 5 que no hayas visto en esta búsqueda. Si en el rango ya no quedan 5 sin ver, lo agranda 5 min por lado. El subtítulo dice el rango ("5 discos de 40 a 50 min"). Cuando ya viste todos, vuelven a salir.

## Flujo de una canción nueva (decidido por el usuario, 2026-10-26)
Lo hace `node tools/sync.mjs read`; las reglas están en `tools/catalog.mjs` y sus pruebas en `tests/catalog.test.mjs`.
1. Se toma el disco de la canción.
2. Si el disco ya está en el catálogo (mismo ID, o mismo nombre y artista: copias regionales y reediciones), la canción solo se añade a las canciones de ese disco.
3. Si el disco es una versión especial (sencillo, deluxe o edición especial, en vivo, recopilatorio, remasterizado), se busca el álbum de estudio original: misma grabación (ISRC) y, si no, título + artista; el más antiguo que no sea posterior.
4. Entran las dos versiones, sin repetir: la especial y la original. **Los sencillos y EP nunca entran.**
5. Se miden los discos nuevos (duración entera, portada, artistas, año, pistas) y van a `public/data/albums.json`.
- **No se quita nada**: si una canción sale de la playlist, sus discos se quedan. El usuario avisa si quiere quitar algo.
- **Sin original encontrado**: el usuario lo revisa a mano en el Excel. Si encuentra el disco, Claude lo pone en `data/manual.json` (`{"originals": {"<ID canción>": "<ID o enlace del disco>"}}`) y corre `read`; si no dice nada, se ignora.
- **La app recomienda una sola versión**: una edición y su original (mismo disco, por ejemplo *Night Visions* y *Night Visions (Deluxe)*) comparten `group` y solo sale una de las dos. Un en vivo o un recopilatorio es otro disco y puede salir junto al original.

## Pendiente: bloqueado por la cuota de Spotify (retomar el 2026-10-27)
El usuario dirá "sigue" en la misma conversación. Spotify devolvió 429 con `Retry-After` ≈ 24 h el 2026-10-26: primero en `/albums`, `/tracks` y `/artists` por ID, y después también en `/search`. `/me` y leer la playlist siguen funcionando.

Estado en `data/catalog.json`: 1596 canciones, 1204 discos (112 son originales encontrados). En la app: 568 discos medidos.
- **196 canciones por buscar su original** (27 de ellas son ediciones especiales).
- **334 discos por medir** (112 son originales encontrados).

Con un solo `node tools/sync.mjs read` se busca, se mide y se regenera `albums.json` (reanuda si se vuelve a cortar). Después: `python3 tools/excel.py` → mandar el Excel al usuario, commit y PR a `main` (o al PR #3 si sigue abierto).

Si el contenedor es nuevo, la sesión de Spotify (`.sync/`, fuera de git) se perdió: `node tools/sync.mjs login`, el usuario abre el enlace y pega la URL de vuelta, y luego `node tools/sync.mjs read "<URL>"`. La Redirect URI ya está en el dashboard.

## Pendiente de definir por el usuario
- Paso de *mood* (va después de elegir tiempo/km). No está construido.
- Detalles extra de cada disco además de portada, artista y duración.

## Notas técnicas
- Pruebas: `npm test` (lógica) y `npm run e2e` (Playwright con datos inventados; capturas en `.impeccable/review/`).
- El MCP de Playwright no arranca en el contenedor cloud (busca Google Chrome); se usa la librería de Playwright (`require('playwright')`). Figma MCP sin autenticar.
- Spotify 2026: `GET /playlists/{id}/items` solo para playlists propias; sin `GET /albums` por lotes (un disco por llamada); modo desarrollo con cuota compartida.
