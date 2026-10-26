# Estado del proyecto (para retomar en otra conversación)

Actualizado: 2026-10-26.

## Qué es
Hill-B: app web móvil (PWA estática) que responde "¿qué disco entero me conviene escuchar en esta sesión de correr?". Propone 5 discos de la playlist "The Magic Bus" (`77Yaz4xSfZjJqRTIXo4ZE2`, del usuario) cuya duración se acerca a la salida, por tiempo o por km + ritmo.

## Dónde está
- Publicada en **https://hill-b.onrender.com** (Render, sitio estático desde `main`, `render.yaml` → `public/`). Cada merge a `main` redespliega.
- `main` es la rama por defecto. **Claude Code solo cambia `main` por PR** (regla en `CLAUDE.md` + hook `.claude/hooks/no-direct-main.sh`). No hay protección en GitHub y el usuario no la quiere.
- PR #1 (la app) mergeado. PR #2 (hook + este archivo) mergeado. PR #3 (datos de The Magic Bus + catálogo con originales) abierto.

## Decisiones del usuario (no reabrir)
- Sin inicio de sesión en la app y sin página de carga. La app solo lee `public/data/albums.json`; Spotify solo sirve para cargar datos y para abrir un disco (deslizando su tarjeta hacia arriba).
- Los datos los carga Claude: el usuario dice la playlist y Claude lee, guarda y abre PR. Son ~800 discos; se leen una vez y a veces se releen (solo se miden los nuevos).
- Estilo Nike Run Club, paleta clara, viva y sencilla, mucha animación, 5 discos que se deslizan. Diseño documentado en `diseno/DESIGN.md` y producto en `diseno/PRODUCT.md`.
- Color principal: el voltio `#d7ff1f`; con el negro (`#111111`) es la pareja de marca.
- **Fondo de toda la app: el amarillo `#d7ff1f`, con el negro `#111111` como contraste.** El blanco solo como tercer color si hace falta; hoy no se usa: una tarjeta de disco oscura lleva el amarillo como tinta clara. Los tonos secundarios son negro mezclado sobre amarillo, no grises.
- **Pantalla de inicio (2026-10-26):** sin la pregunta "¿Cuánto vas a correr?" (queda solo para lectores de pantalla) y sin botones − / + ni atajos. Interruptor Tiempo/Distancia arriba; debajo, **dos ruedas verticales** que se deslizan con el dedo: horas : minutos (de 0:05 a 5:59) o km , cientos de metros (de 1,0 a 60,9). En distancia, el **ritmo** (de 3:00 a 9:00 /km **de 15 en 15 s**; antes se llamaba "intensidad") es una tira que se desliza de izquierda a derecha. El botón principal dice **Start**. La unidad de distancia dice **KM**. **No hay línea de la biblioteca** ("The Magic Bus: N discos enteros, leídos el…") cuando hay discos; solo aparece si no hay discos o si fallan. Las ruedas quedan a media pantalla (al alcance del pulgar) y el ritmo muestra su unidad (min/km). **Solo se ve el valor actual, grande** (ruedas y ritmo): al deslizar, el valor nuevo entra por el borde de una ventana invisible y los vecinos nunca se ven antes. Sin recuadro: el número va directo sobre el amarillo. **Letra de las cifras: Roboto Flex** (la 7 de las muestras; ancho 25, inclinada, 800), recortada a números en `public/fonts/hillb-figures.woff2`; las ruedas ocupan casi todo el ancho. Código en `public/js/wheel.js` (scroll nativo con snap; accesible con teclado).
- **Pantalla de discos (2026-10-26): solo el logo Hill-B y las tarjetas.** Sin título, sin subtítulo, sin marcas de posición y sin botones (ni volver, ni "Otros 5", ni "Abrir en Spotify"). Cada tarjeta ocupa exactamente una pantalla de móvil, sin scroll: la portada se encoge si el teléfono es bajo y en uno alto crecen el título y la duración. Todo se hace con gestos (`public/js/pager.js`):
  - en la primera tarjeta, deslizar hacia la derecha (como para ir a la anterior) = volver al inicio;
  - después de la última, deslizar hacia la izquierda = otros 5 discos;
  - deslizar una tarjeta hacia arriba = abrir ese disco en la app de Spotify.
  - Mientras tiras aparece la pista de lo que pasará (flecha, barajar, Spotify), que se pone negra cuando ya al soltar se hace.
  - Arriba, **5 barritas** dicen en qué disco estás; la marca se desliza con el dedo.
  - **Movimiento (2026-10-26, el usuario lo pidió más suave):** todo va con muelles que salen de donde está la tarjeta y conservan la velocidad del dedo; el tamaño de las vecinas y las barritas siguen la posición en vivo. Las acciones continúan el gesto: al pedir otros 5 la tanda se va a la izquierda y la nueva entra por la derecha con esa velocidad; al abrir Spotify la tarjeta sigue subiendo y vuelve sola; al volver, la pantalla sale rápida con un leve desenfoque y la otra entra suave. Las portadas que tardan entran con un fundido. **Por rápido que sea el gesto, el viaje dura lo mismo** (~0.3 s, sin rebote): la velocidad del dedo se entrega al muelle con tope, porque en el iPhone un golpe fuerte cruzaba la tarjeta en 2–3 cuadros y se veía como un salto (vídeo del usuario, 2026-10-26). La cuenta de la duración empieza cuando la tarjeta ya llegó.
  - **Deslizamiento fuera del hilo principal (2026-10-26, el usuario seguía viendo saltos en el iPhone):** al soltar, el muelle se calcula entero y se reproduce como animación nativa (Web Animations, en el compositor), arrancando un fotograma adelantado; las cinco portadas se cargan a la vez y se decodifican antes de mostrarse, y el color de cada tarjeta se lee cuando el teléfono está libre.
  - **Animación siempre (2026-10-26, decisión del usuario):** la app no atiende a «Reducir movimiento». En su iPhone ese ajuste hacía que la tarjeta saltara al soltar y que la apertura no saliera; el usuario pidió forzar las animaciones.
- **Apertura (2026-10-26, opción 3 elegida por el usuario):** ~3 s sobre el amarillo: un punto corre por una línea que sube las dos colinas del logo y lo va rellenando; el logo vuela a la barra y el punto baja y se convierte en START. Un toque la salta; sale siempre, también con «Reducir movimiento». Código en `public/js/splash.js`, diseño en `diseno/DESIGN.md` § Apertura. Sale en cada apertura de la app; se propuso que salga solo la primera vez de cada día (sin respuesta del usuario).
- Logo: dos colinas de una B acostada (Archivo 700, girada a la izquierda, la colina derecha 1.4× más grande con su hueco al 85% y desplazado a medias hacia su centro, inclinada 35° ya en horizontal). Archivos en `diseno/logo/`, reglas en `diseno/DESIGN.md` § Logo.
- Cuenta de Spotify Premium. Client ID `6b13ef05e42d4331a1fbbbc839bc1092`.
- Claude le manda al usuario el catálogo en Excel (`python3 tools/excel.py <archivo.xlsx>`): pestaña Canciones (con caso y álbum original) y pestaña Discos.

## Cómo elige los 5 discos (decidido por el usuario, 2026-10-26)
`pickAlbums` en `public/js/recommend.js`, pruebas en `tests/recommend.test.mjs`.
- Toma los discos que duran entre la salida −5 min y +5 min (1 h → de 0:55 a 1:05).
- Si en esa ventana hay menos de 10 discos (el doble de los que se muestran), la abre 5 min más por cada lado, y así hasta tener 10.
- De ahí elige 5 al azar: con el mismo tiempo, cada búsqueda da otros discos. Los 5 que se acaban de mostrar solo repiten si la ventana no tiene otros.
- Se muestran del más cercano al más lejano.
- **Otros 5** (deslizar hacia la izquierda después de la última tarjeta): saca 5 que no hayas visto en esta búsqueda. Si en el rango ya no quedan 5 sin ver, lo agranda 5 min por lado. Cuando ya viste todos, vuelven a salir.

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
- Logo e iconos: `python3 tools/logo.py` (necesita `pip install fonttools brotli`) y después `node tools/logo-png.mjs`.
- Pruebas: `npm test` (lógica) y `npm run e2e` (Playwright con datos inventados; capturas en `.impeccable/review/`).
- El MCP de Playwright no arranca en el contenedor cloud (busca Google Chrome); se usa la librería de Playwright (`require('playwright')`). Figma MCP sin autenticar.
- Spotify 2026: `GET /playlists/{id}/items` solo para playlists propias; sin `GET /albums` por lotes (un disco por llamada); modo desarrollo con cuota compartida.
