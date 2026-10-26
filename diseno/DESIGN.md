---
name: Hill-B
description: El disco entero que te dura toda la salida a correr, sacado de tu playlist.
colors:
  volt: "#d7ff1f"
  ground: "#d7ff1f"
  ink: "#111111"
  ink-hover: "#262626"
  ink-press: "#2a2a2a"
  surface: "#c5ea1e"
  surface-press: "#b7d71d"
  muted: "#485415"
typography:
  figures:
    fontFamily: "Hill-B Figures, Archivo, system-ui, sans-serif"
    fontSize: "1em"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.05em"
    fontFeature: "'tnum'"
  wheel:
    fontFamily: "Hill-B Figures, Archivo, system-ui, sans-serif"
    fontSize: "clamp(120px, min(24svh, calc((100vw - 2 * 20px) / 1.8)), 240px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.05em"
    fontFeature: "'tnum'"
  figure:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
    fontFeature: "'tnum'"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
  start:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 62"
  pace:
    fontFamily: "Hill-B Figures, Archivo, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.05em"
    fontFeature: "'tnum'"
  action:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  brand:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
rounded:
  pill: "999px"
  card: "24px"
  panel: "20px"
  focus: "12px"
  cover: "8px"
  bar: "6px"
  hairline: "2px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  pad: "20px"
  lg: "24px"
components:
  button-start:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    typography: "{typography.start}"
    rounded: "{rounded.pill}"
    height: "64px"
    width: "100%"
  button-start-hover:
    backgroundColor: "{colors.ink-hover}"
  button-start-active:
    backgroundColor: "{colors.ink-press}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    height: "60px"
    width: "100%"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
  button-ink-active:
    backgroundColor: "{colors.ink-press}"
  segmented:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-thumb:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    rounded: "{rounded.pill}"
    height: "48px"
  picker:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.wheel}"
    rounded: "{rounded.card}"
    height: "calc(clamp(120px, min(24svh, calc((100vw - 2 * 20px) / 1.8)), 240px) * 0.84)"
  pace-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    typography: "{typography.pace}"
    rounded: "{rounded.pill}"
    width: "144px"
    height: "64px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-active:
    backgroundColor: "{colors.surface-press}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
  album-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 16px 18px"
    width: "min(78vw, 376px)"
---

# Design System: Hill-B

## Overview

**Creative North Star: "La pantalla de objetivo"**

Hill-B habla el registro de Nike Run Club puesto en serio, sobre el color de su propia marca: toda la app se apoya en el voltio, con la tinta casi negra como único contraste, y números enormes, largos e inclinados como los de un cronómetro, que ocupan la pantalla como el objetivo de una carrera. La duración de la salida es la protagonista: dos ruedas de cifras gigantes que se deslizan con el pulgar, y todo lo demás (interruptor, intensidad, discos) se mide contra ella. Es una app de un solo pulgar, en la puerta de casa: pocos elementos por pantalla, controles grandes en píldora y una sola acción principal, START, anclada abajo.

La profundidad no existe: superficies planas que se separan del voltio por un paso tonal de tinta mezclada, nunca por sombras ni bordes. El blanco no aparece. Lo que destaca es tinta (selección, START, reintento) con el texto en voltio; el otro color vivo es la portada de cada disco, que tiñe su tarjeta entera. El movimiento es abundante pero funcional: las ruedas giran con el scroll nativo del teléfono, cambian de sitio con un FLIP al cambiar de modo, cada cambio de vista se desliza en la dirección del flujo, y la barra del disco se llena a escala contra la salida.

Rechazos confirmados por el propietario y por la dirección: no parecerse a Spotify (suelo oscuro, rejilla de portadas pequeñas, acento verde) ni a un panel de fitness (tarjetas de estadísticas, anillos).

**Key Characteristics:**
- Solo modo claro (`color-scheme: light`); el suelo voltio es la identidad, en toda la app.
- Dos colores: voltio y tinta. Sin blanco; los tonos secundarios son tinta mezclada sobre voltio, no grises.
- Tres voces: Archivo a ancho normal para el texto; Archivo estrecha, negra y en mayúsculas para START, títulos y la duración del disco; y Hill-B Figures (Roboto Flex fijada estrecha e inclinada) para las cifras de las ruedas y la intensidad.
- Ruedas de selección con scroll y snap nativos en lugar de botones − / + o atajos.
- Controles en píldora, tarjetas de 24px, sin sombras ni bordes.
- Cifras tabulares en todo lo que cuenta tiempo o distancia.
- Movimiento con curvas de salida fuertes y respeto completo a `prefers-reduced-motion`.

## Colors

Paleta de dos colores: **el voltio es el color principal de Hill-B y, con el negro de la tinta, es su pareja de marca** (decisión del propietario, 2026-10-26). El voltio es el suelo de toda la app; la tinta, el único contraste. El resto del color lo ponen las portadas.

### Primary
- **Voltio** (volt): el color de marca y el suelo de cada vista (`--ground` y `--page` apuntan a él): página, dock inferior, `theme-color`. Sobre tinta es el texto de la selección: pastilla del interruptor, ritmo elegido, START, reintento, selección de texto. También es la tinta clara de una tarjeta de disco oscura.

### Neutral
- **Tinta** (ink): texto, iconos, estados seleccionados (pastilla del interruptor, ritmo elegido), botón START y botón de reintento, anillo de foco, relleno de la barra de biblioteca y del segmento de posición activo. Hover y pulsado en ink-hover / ink-press.
- **Superficie** (surface): tinta al 9% sobre voltio. Todo contenedor o control en reposo: pista del interruptor, botón atrás y "Otros 5", paneles de estado, tarjeta sin color y esqueletos, pista de la barra de biblioteca.
- **Superficie pulsada** (surface-press): tinta al 16% sobre voltio. Respuesta al pulsar o pasar por encima de un control de superficie; bloques del esqueleto; segmentos de posición inactivos.
- **Tinta de apoyo** (muted): tinta al 72% sobre voltio. Texto secundario: unidad bajo las ruedas, "min/km", total de carrera, subtítulo de resultados, recuento de biblioteca. 7.1:1 sobre voltio, 5.9:1 sobre superficie.

### Color de portada (dinámico)
Cada tarjeta de disco recibe `--card-bg` y `--card-ink` calculados de su portada: se agrupan los píxeles en doce familias de tono más grises, gana la familia con más área viva, y su color se aleja de la luminosidad de la portada (−0.10 si es clara, +0.12 si es oscura), limitado a luminosidad HSL 0.36–0.70 y saturación ≤ 0.90. La tinta de la tarjeta es `#111111` o el voltio `#d7ff1f`, la de mayor contraste; nunca blanco. Sin muestra (portada sin CORS), la tarjeta queda en superficie con tinta.

Valores fuera de la paleta, intencionados: el `#000` dentro de la `mask-image` del carrusel (es una máscara alfa, no un color que se vea) y el velo `rgb(0 0 0 / 0.08)` del hueco de la portada mientras carga, que oscurece el color de la tarjeta sea cual sea.

### Named Rules
**The Brand Pair Rule.** La identidad es voltio y tinta, nada más: ningún otro color de marca, ningún blanco. Los tonos secundarios se hacen mezclando tinta sobre voltio, nunca con grises.

**The Ink Accent Rule.** Lo que destaca es tinta con texto en voltio: la acción principal, la opción elegida, el valor elegido. El voltio como texto solo existe sobre tinta (o sobre el color oscuro de una tarjeta).

**The Cover Field Rule.** El color de una tarjeta sale de su propia portada, nunca de una paleta inventada; la página que la rodea sigue en voltio.

**The Page Tone Rule.** `--page` es el color de la vista y lo comparten `html`, `body`, el dock inferior y `theme-color`, para que el contenido pase bajo el dock sin corte. Hoy vale voltio en todas las vistas.

## Typography

**Display Font:** Archivo variable a `font-stretch: 62%` (con system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Archivo variable a ancho normal (mismo respaldo)
**Figure Font:** Hill-B Figures (`public/fonts/hillb-figures.woff2`, ~2 KB): Roboto Flex (OFL) fijada a wdth 25, slnt −10, wght 800, opsz 144, YTUC 760 y reducida a "0-9 : ,". Respaldo Archivo.

**Character:** Tres voces. La voz de texto es Archivo a ancho normal, tranquila y legible a un brazo de distancia. La voz de pantalla es Archivo en su ancho mínimo y peso máximo, en mayúsculas: la de la pantalla de objetivo de Nike. La voz de cifras es Hill-B Figures: las cifras más largas, afiladas y rápidas de un muestrario de diez fuentes, elegidas por el propietario (2026-10-26). La inclinación va dentro de la fuente (sin `font-style: italic`), con `font-synthesis: none`, cifras tabulares, `letter-spacing: 0.05em` (las cifras inclinadas van sobre avances estrechos: un pelo entre el 4 y el 5) y `line-height: 1`.

### Hierarchy
- **Wheel** (Hill-B Figures 800, `--fig`, 1): las cifras de las dos ruedas y su separador ":" o ","; `--fig` vale `clamp(120px, min(24svh, calc((100vw - 2 * var(--pad)) / 1.8)), 240px)`: "60,9" con sus márgenes ocupa unas 1.8 em, así que la cifra llena el ancho y la altura la frena. La fila mide 0.84 × `--fig` (las cifras miden 0.72 em de alto).
- **Figure** (900, 3.25rem, 0.9): duración del disco en la tarjeta; cuenta hacia arriba al llegar.
- **Headline** (900, 2rem, 1): título de resultados ("Para 45 min") y título del disco (0.95, máximo dos líneas).
- **Start** (900, 2rem, +0.02em): la palabra START del botón principal, más abierta que el resto de la voz de pantalla para leerse como una orden.
- **Pace** (Hill-B Figures 800, 3rem): el ritmo dentro de la píldora de intensidad.
- **Action** (700, 18px, −0.005em): texto de los botones grandes de texto (reintento), y la unidad bajo las ruedas en tinta de apoyo.
- **Body** (400, 16px, 1.5): texto general, canciones de la tarjeta (1.4, dos líneas); 700 en el interruptor, la etiqueta "Intensidad" y "Otros 5".
- **Label** (600, 15px): textos secundarios, leyendas del medidor, diferencia frente a la salida, subtítulo de resultados, avisos.
- **Marca** (800, 20px, `font-stretch: 75%`, mayúsculas): solo el logotipo de la barra.

El botón "Abrir en Spotify" de la tarjeta usa 17px, un punto por debajo de Action, para caber en la tarjeta de 52px de alto; es intencionado.

### Named Rules
**The Three Voices Rule.** Texto en Archivo a ancho normal; pantalla en Archivo estrecha (62%), 900 y mayúsculas para START, títulos de vista, títulos de disco y la duración del disco; cifras en Hill-B Figures (800, inclinación de la fuente) solo para las ruedas, su separador y el ritmo. No hay pesos ni anchos intermedios en la voz de pantalla, ni itálica sintetizada en ninguna voz.

**The Tabular Rule.** Toda cifra de tiempo, distancia, ritmo o recuento usa `font-variant-numeric: tabular-nums` para que no baile al cambiar ni al girar la rueda.

## Logo

La marca son **dos colinas sobre el suelo**, sacadas de una B acostada. Se parte de la B de Archivo a peso 700 y ancho 75, girada 90° a la izquierda: su lomo queda abajo como suelo y sus dos panzas son las colinas. La colina de la derecha (la panza de abajo de la B) sale de una B más fina ampliada 1.4×, así que es visiblemente más grande con el mismo trazo, y la barra entre los huecos conserva su grosor. Su hueco se reduce al 85% dentro del mismo contorno (el suelo no cambia y la cima engorda, así que la colina grande se ve más llena) y se desplaza a la derecha la mitad del camino hacia el centro de su colina tal como se ve ya inclinada (centros del hueco y de la silueta de la colina medidos después de la inclinación; elección del propietario entre tres opciones). Por último, la marca acostada se inclina 35° hacia delante, como una cursiva aplicada ya en horizontal: las colinas se inclinan, el suelo sigue plano. La genera `tools/logo.py` desde `public/fonts/archivo-latin.woff2` (los PNG, `node tools/logo-png.mjs`).

- **Marca sola:** `diseno/logo/hill-b-marca.svg`. Tinta sobre voltio o sobre blanco; voltio sobre tinta solo en piezas fuera de la app.
- **Logo horizontal:** `diseno/logo/hill-b-logo.svg` (y `hill-b-logo-volt.svg` sobre campo voltio). La marca comparte la línea base con "HILL-B" (800, ancho 75, recta), su colina mayor sube a la altura de las mayúsculas más un 1.5% para que lo redondo parezca tan alto como lo plano, y se separa de la palabra 0.4em (los 8px de la barra).
- **Icono de la app:** campo voltio con la marca en tinta al 70% del ancho, desplazada 7/512 arriba y 9/512 a la izquierda porque la base plana y la colina grande cargan el peso abajo a la derecha (`public/icon.svg`). La versión enmascarable la deja al 59% para que quepa en el círculo seguro del 80% (`public/icon-maskable.svg`).
- **Favicon:** la misma marca al 88% de un cuadro de esquinas más cerradas (`public/favicon.svg` y `icons/favicon-32.png`), para que sus huecos sigan abiertos a 16-32px.
- **En la barra:** la misma proporción que el logo horizontal: 0.698em de alto, 1.28em de ancho, 8px antes de la palabra. En la app siempre en tinta sobre voltio.

**The Two Hills Rule.** La colina pequeña a la izquierda, la grande a la derecha, ambas inclinadas hacia delante sobre un suelo plano; nunca de pie, boca abajo ni en espejo. No lleva contorno, sombra ni degradado, y solo va en tinta y voltio (blanco como suelo cuando hace falta, fuera de la app).

## Layout

Una columna de teléfono: `max-width: 480px`, centrada, con 20px de margen lateral (pad) y altura mínima `100dvh`. La barra superior mide 56px más el área segura y solo lleva la marca. Cada vista es una columna flexible con un dock pegado abajo (16px arriba, 16px más el área segura abajo, fondo `--page`) que lleva la acción principal a ancho completo, al alcance del pulgar.

El ritmo de espaciado es 4 / 8 / 12 / 16 / 20 / 24px. Las separaciones verticales de la vista de sesión respiran con la altura de pantalla: bajo el interruptor `clamp(12px, 3svh, 32px)`, sobre la intensidad `clamp(16px, 3.5svh, 36px)`.

**Sesión:** interruptor arriba; las ruedas en una rejilla `auto auto auto` centrada (`justify-content: center`: el valor se centra como un solo grupo y cada rueda mide lo que su valor más ancho, "60", "59") de una fila de alto más un margen táctil invisible arriba y abajo (`--reach`, `clamp(24px, 5svh, 48px)`), empujadas con `margin-top: auto` para que la altura sobrante se reparta arriba y abajo y el valor quede a media pantalla, al alcance del pulgar. Las dos cifras se pegan al separador (la de la izquierda alineada a la derecha y al revés) para leerse como un solo valor: 1:05, 10,5. Margen lateral en em: la rueda mayor `0.1em 0.05em` y la menor `0.05em 0.1em`, más holgura por fuera para la bandera del 1 y la punta de la inclinación, justa contra el separador. La unidad va 10px por debajo, centrada. La tira de intensidad sangra hasta el borde del viewport: todo su ancho se desliza, pero solo se pinta la píldora del centro.

**Resultados:** cabecera en rejilla `44px 1fr auto` (atrás, título y subtítulo, "Otros 5"); cinco segmentos de posición de 4px; y un carrusel horizontal con snap obligatorio: tarjeta de `min(78vw, 376px)`, separación de 12px, centrada y con ambas vecinas asomando; el carril sangra hasta el borde del viewport. A partir de 520px, el carril se desvanece con una máscara de 32px en los bordes de la columna.

## Elevation & Depth

Plano por completo: no hay ni una `box-shadow` en el sistema. La profundidad se transmite con pasos tonales de tinta sobre voltio (suelo, superficie, superficie pulsada) y con el campo de color de cada tarjeta. Lo que no está elegido no se ve o retrocede, nunca con sombra: las ruedas y la intensidad no enseñan valores vecinos (una máscara pinta solo la ventana), y las tarjetas vecinas del carrusel quedan a 0.95 y 0.8 (dirigidas por el scroll).

### Named Rules
**The Flat Field Rule.** Ninguna superficie lleva sombra ni borde; se separa del suelo por tono o por color de portada.

**The One Value Rule.** Las ruedas y la intensidad enseñan solo el valor actual, grande e inclinado, dentro de su ventana (decisión del dueño, 2026-10-26). Al deslizar, el valor siguiente entra por el borde de la ventana; antes no se ve. En las ruedas la ventana es invisible: el valor va directo sobre el voltio, sin banda detrás; en la intensidad la ventana es la píldora de tinta.

## Shapes

Formas blandas y llenas. Todo control es una píldora (999px) o un círculo (atrás, "Otros 5" estrecho, 44px). Las tarjetas de disco usan 24px; los paneles de estado 20px; la portada 8px, casi cuadrada como la entrega Spotify; las barras del medidor y los bloques del esqueleto 6px y las marcas finas 2px. El anillo de foco es de 3px en tinta, separado 3px, con radio de 12px; en las ruedas rodea el valor entero (`.picker`), metido hacia dentro `--reach` menos 6px, con el radio de 24px. No hay bordes ni divisores: las barras de progreso y la marca de la salida en el medidor son rellenos, no líneas de estructura.

## Components

### Buttons
Grandes, llenos y para el pulgar. Todos de tinta con texto voltio.
- **START (principal):** píldora de tinta a ancho completo, 64px de alto como mínimo, "Start" en la voz Start (estrecha, 900, 2rem, mayúsculas) en voltio. Única acción principal de la sesión, en el dock.
- **Ink:** píldora de tinta con texto voltio en Action, 60px (52px dentro de paneles de estado); reintentos.
- **Hover / Active:** hover solo en punteros finos (ink-hover); al pulsar, `scale(0.97)` en 140ms con `--ease-out` y ink-press. Deshabilitado a opacidad 0.45 sin escala.
- **En tarjeta ("Abrir en Spotify"):** invierte los colores de la tarjeta (fondo `--card-ink`, texto `--card-bg`), 52px, 17px, icono de 20px.

### Segmented control (Tiempo / Distancia)
- **Style:** pista de superficie en píldora con 4px de holgura; dos opciones de 48px, 700, 16px.
- **State:** una pastilla de tinta se desliza bajo la opción activa (`translateX`, 260ms `--ease-in-out`); el texto activo pasa a voltio en 200ms. Flechas izquierda y derecha cambian de modo.
- **Al cambiar de modo:** las ruedas se deslizan a su nuevo sitio con un FLIP (`translateY` desde donde estaban y opacidad de 0.4 a 1, 260ms `cubic-bezier(0.77, 0, 0.175, 1)`); en distancia la intensidad entra 12px desde abajo en 220ms con `--ease-out` y 60ms de retraso.

### Picker wheels (signature)
Dos columnas de cifras gigantes con scroll y snap nativos: el impulso y el rebote del propio teléfono, una cifra por fila, y la fila central es el valor. Horas : minutos (0:05 a 5:59) o km , cientos de metros (1,0 a 60,9).
- **Style:** una sola fila visible, la ventana, invisible: sin banda ni fondo, el valor va directo sobre el voltio. Cifras en la voz Wheel (Hill-B Figures a `--fig`, fila de 0.84 × `--fig`), con margen lateral de 0.1em por fuera y 0.05em contra el separador; el separador ":" o "," en la misma voz entre ambas.
- **State:** `mask-image` pinta solo la ventana; la rueda se extiende `--reach` por encima y por debajo, invisible pero táctil (una máscara, a diferencia de `clip-path`, no recorta el área de toque). Al deslizar, las cifras pasan por la ventana como en un contador. Una vibración de 4ms por paso bajo el dedo donde el teléfono lo permite.
- **Accesibilidad:** cada rueda es un `spinbutton` con valor y texto; flechas, Re Pág/Av Pág (±5), Inicio y Fin. Un salto de más de tres filas llega sin deslizarse.
- **Foco de teclado:** la máscara cortaría un anillo en la rueda, así que el anillo (3px de tinta, radio de 24px) rodea todo el valor (`.picker:has(.wheel-y:focus-visible)`, separación `calc(var(--reach) * -1 + 6px)`) y la rueda que no tiene las teclas retrocede a opacidad 0.45, para que se vea qué número mueven las flechas.

### Intensity strip
El ritmo (3:00 a 9:00 /km, de 5 en 5 s) como una tira que se desliza de lado; solo en distancia.
- **Cabecera:** "Intensidad" (700, 16px) con "min/km" en tinta de apoyo (500), y a la derecha el total de carrera en tinta de apoyo con cifras tabulares.
- **Style:** una píldora fija de tinta de 144 × 64px en el centro; los ritmos, en voltio y en la voz Pace (Hill-B Figures, 3rem), pasan por ella con snap al centro (paso de 144px).
- **State:** `mask-image` pinta solo la píldora; el resto de la tira es invisible pero se desliza con el pulgar. El foco de teclado rodea la píldora.

### Icon buttons (atrás, "Otros 5")
- **Atrás:** círculo de superficie de 44px con flecha de 20px; `scale(0.92)` al pulsar.
- **Otros 5:** píldora de superficie de 44px a la derecha del título: icono de barajar de 18px + "Otros 5" (700, 16px), `scale(0.95)` y superficie pulsada al pulsar. Por debajo de 360px queda en círculo de 44px solo con el icono (el texto sigue para lectores de pantalla). Se oculta si la biblioteca no tiene más discos.
- **Hover:** superficie pulsada, solo en punteros finos.

### Cards / Containers
- **Panel de estado:** superficie, radio de 20px, 20px de relleno, sin borde; su segunda línea en tinta de apoyo, 15px.
- **Esqueleto:** la tarjeta final a su tamaño real en superficie con bloques planos de superficie pulsada; sin brillo animado.

### Navigation
- **Barra:** solo la marca a la izquierda (la B acostada a la altura de las mayúsculas + "Hill-B"). No hay sesión que cerrar.
- **Subtítulo de resultados:** el rango del que salen los discos, "5 discos de 40 a 50 min"; crece cuando la búsqueda se agranda. Se anuncia con `aria-live`.
- **Segmentos de posición:** cinco barras de 4px, superficie pulsada; la de la tarjeta centrada en tinta (200ms).
- **Entre vistas:** View Transitions de 280ms con `--ease-drawer`; la vista nueva entra 18% desde la derecha al avanzar y desde la izquierda al volver.

### Album card (signature)
Un campo completo del color de su portada: portada cuadrada de ancho completo, título en Headline (dos líneas máximo), artista y año, la duración en Figure con la diferencia frente a la salida, el medidor, las canciones de The Magic Bus que lo trajeron y el botón a Spotify anclado abajo.
- **Medidor:** pista de 12px en `currentColor` al 18%, relleno en `currentColor` que crece a escala (`scaleX(--album)`) en 600ms con `--ease-out` la primera vez que la tarjeta queda centrada, mientras la duración cuenta hacia arriba con la misma curva. Una marca de 3px en `left: --run` señala la salida, recortada del relleno con un contorno del color de la tarjeta.
- **Entrada:** las tarjetas suben 28px desde `scale(0.97)` en 460ms, escalonadas 60ms.

## Do's and Don'ts

### Do:
- **Do** usar el voltio (#d7ff1f) como suelo de toda vista y la tinta (#111111) como su único contraste.
- **Do** marcar la selección y la acción principal con tinta y texto voltio.
- **Do** separar contenedores del suelo con superficie (#c5ea1e) y responder al pulsar con superficie pulsada (#b7d71d) o escala (0.92–0.97, 140ms).
- **Do** escribir el texto secundario en tinta de apoyo (#485415), tinta mezclada sobre voltio.
- **Do** poner START, títulos y la duración del disco en Archivo a 62%, 900 y mayúsculas, y las cifras de las ruedas y del ritmo en Hill-B Figures; siempre con cifras tabulares.
- **Do** elegir valores con ruedas de scroll y snap nativos, accesibles con teclado como `spinbutton`.
- **Do** teñir cada tarjeta con el color de su propia portada dentro de los límites de luminosidad 0.36–0.70 y elegir su tinta (tinta o voltio) por contraste.
- **Do** anclar la acción principal en el dock inferior, a ancho completo, por encima del área segura.
- **Do** dar a cada animación su alternativa con `prefers-reduced-motion` (fundido o nada).

### Don't:
- **Don't** usar blanco: ni suelo, ni texto, ni tinta de tarjeta.
- **Don't** hacer tonos secundarios con grises; se mezcla tinta sobre voltio.
- **Don't** usar suelo oscuro, rejilla de portadas pequeñas ni acento verde: no debe parecer Spotify.
- **Don't** usar tarjetas de estadísticas ni anillos de progreso de panel de fitness.
- **Don't** añadir sombras ni bordes a superficies o controles.
- **Don't** volver a botones − / + ni a atajos de sesión: el valor se elige girando la rueda.
- **Don't** añadir una cuarta voz ni pesos intermedios en la voz de pantalla; Hill-B Figures solo lleva cifras, ":" y ",".
- **Don't** volver a poner una banda de superficie detrás del valor de las ruedas ni sintetizar itálica.
- **Don't** animar esqueletos con brillo; son la maqueta plana de la tarjeta final.
