---
name: Hill-B
description: El disco entero que te dura toda la salida a correr, sacado de tu playlist.
colors:
  volt: "#d7ff1f"
  volt-hover: "#cdf713"
  volt-press: "#c6ef0a"
  ink: "#111111"
  ink-hover: "#262626"
  ink-press: "#2a2a2a"
  ground: "#ffffff"
  surface: "#f1f1ee"
  surface-press: "#e4e4df"
  muted: "#55554f"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(6.5rem, 36vw, 9.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
    fontFeature: "'tnum'"
  display-welcome:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(3.5rem, 16vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
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
  title:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.5
    fontFeature: "'tnum'"
  lede:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.45
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
  action:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.005em"
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
  button-volt:
    backgroundColor: "{colors.volt}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    height: "60px"
    width: "100%"
  button-volt-hover:
    backgroundColor: "{colors.volt-hover}"
  button-volt-active:
    backgroundColor: "{colors.volt-press}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    height: "60px"
    width: "100%"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
  button-ink-active:
    backgroundColor: "{colors.ink-press}"
  stepper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "56px"
  stepper-active:
    backgroundColor: "{colors.surface-press}"
  stepper-small:
    backgroundColor: "{colors.ground}"
    size: "44px"
  segmented:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-thumb:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    height: "48px"
  chip-preset:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "44px"
  chip-preset-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
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

Hill-B habla el registro de Nike Run Club puesto en serio: suelo blanco, tinta casi negra, un único voltio, y números enormes en Archivo estrecho y negro que ocupan la pantalla como el objetivo de una carrera. La duración de la salida es la protagonista; todo lo demás (controles, textos, discos) se mide contra ella. Es una app de un solo pulgar, en la puerta de casa: pocos elementos por pantalla, controles grandes en píldora, y una sola acción principal anclada abajo.

La profundidad no existe: superficies planas que se separan del blanco por un paso tonal, nunca por sombras ni bordes. El color vivo llega de dos sitios y de ninguno más: el voltio en la acción principal (y como campo completo en la pantalla de bienvenida) y la portada de cada disco, que tiñe su tarjeta entera. El movimiento es abundante pero funcional: cada cambio de vista se desliza en la dirección del flujo, los números empujan al cambiar, y la barra del disco se llena a escala contra la salida.

Rechazos confirmados por el propietario y por la dirección: no parecerse a Spotify (suelo oscuro, rejilla de portadas pequeñas, acento verde) ni a un panel de fitness (tarjetas de estadísticas, anillos).

**Key Characteristics:**
- Solo modo claro (`color-scheme: light`); el suelo blanco es parte de la identidad.
- Un acento, el voltio, reservado a la acción principal y al campo de bienvenida.
- Una sola familia, Archivo variable: estrecha, negra y en mayúsculas para cifras y títulos; ancho normal para el texto.
- Controles en píldora, tarjetas de 24px, sin sombras ni bordes.
- Cifras tabulares en todo lo que cuenta tiempo o distancia.
- Movimiento con curvas de salida fuertes y respeto completo a `prefers-reduced-motion`.

## Colors

Paleta de alto contraste casi acromática con un único acento eléctrico; el resto del color lo ponen las portadas.

### Primary
- **Voltio** (volt): fondo de la acción principal ("Buscar discos") y campo completo de la pantalla de conexión, donde la página entera pasa a voltio y el botón es de tinta. Sus estados hover (volt-hover) y pulsado (volt-press) son el mismo tono ligeramente más oscuro. Con tinta encima siempre, nunca blanco.

### Neutral
- **Tinta** (ink): texto, iconos, estados seleccionados (pastilla del segmentado, preset activo), botón secundario, anillo de foco, relleno de las barras de progreso. Hover y pulsado en ink-hover / ink-press.
- **Suelo** (ground): fondo de página fuera de la bienvenida; texto sobre tinta; fondo de los pasos pequeños dentro de un panel.
- **Superficie** (surface): un paso tonal sobre el suelo para todo contenedor o control en reposo: pasos −/+, pista del segmentado, presets, panel de ritmo, estados, tarjeta sin color y esqueletos.
- **Superficie pulsada** (surface-press): respuesta al pulsar o pasar por encima de un control de superficie; bloques del esqueleto.
- **Gris de apoyo** (muted): texto secundario (unidad, subtítulos, recuento de biblioteca, total de carrera, "Salir"). 7.4:1 sobre blanco.

### Color de portada (dinámico)
Cada tarjeta de disco recibe `--card-bg` y `--card-ink` calculados de su portada: se agrupan los píxeles en doce familias de tono más grises, gana la familia con más área viva, y su color se aleja de la luminosidad de la portada (−0.10 si es clara, +0.12 si es oscura), limitado a luminosidad HSL 0.36–0.70 y saturación ≤ 0.90. La tinta de la tarjeta es `#111111` o `#ffffff`, la de mayor contraste. Sin muestra (portada sin CORS), la tarjeta queda en superficie.

### Named Rules
**The One Volt Rule.** El voltio marca la única acción principal de la pantalla, o es el campo completo de la bienvenida. Los estados seleccionados son tinta, nunca voltio.

**The Cover Field Rule.** El color de una tarjeta sale de su propia portada, nunca de una paleta inventada; la página que la rodea sigue blanca.

**The Page Tone Rule.** `--page` es el color de la vista (voltio en conexión, blanco en el resto) y lo comparten `html`, `body`, el dock inferior y `theme-color`, con una transición de 450ms al cambiar.

## Typography

**Display Font:** Archivo variable a `font-stretch: 62%` (con system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Archivo variable a ancho normal (mismo respaldo)

**Character:** Una sola familia en dos voces. La voz de pantalla es Archivo en su ancho mínimo y peso máximo, en mayúsculas: la de la pantalla de objetivo de Nike. La voz de texto es la misma familia a ancho normal, tranquila y legible a un brazo de distancia.

### Hierarchy
- **Display** (900, clamp(6.5rem, 36vw, 9.5rem), 0.86): la cifra editable de la sesión; una por pantalla.
- **Display de bienvenida** (900, clamp(3.5rem, 16vw, 5.5rem), 0.9, `text-wrap: balance`): el titular de la pantalla de conexión.
- **Figure** (900, 3.25rem, 0.9): duración del disco en la tarjeta; cuenta hacia arriba al llegar.
- **Headline** (900, 2rem, 1): títulos de vista y título del disco (0.95, máximo dos líneas).
- **Title** (800, 22px): valores numéricos dentro de un panel (ritmo).
- **Lede** (500, 19px, 1.45, máx. 30ch): la frase de bienvenida.
- **Body** (400, 16px, 1.5): texto general, canciones de la tarjeta (1.4, dos líneas), etiquetas de control (700).
- **Label** (600, 15px): textos secundarios, leyendas del medidor, avisos.
- **Action** (700, 18px, −0.005em): texto de los botones grandes; 17px dentro de la tarjeta.
- **Marca** (800, 20px, `font-stretch: 75%`, mayúsculas): solo el logotipo de la barra.

### Named Rules
**The Two Voices Rule.** Estrecha (62%), 900 y mayúsculas para cifras, títulos de vista y títulos de disco; ancho normal para todo lo demás. No hay pesos ni anchos intermedios en la voz de pantalla.

**The Tabular Rule.** Toda cifra de tiempo, distancia o recuento usa `font-variant-numeric: tabular-nums` para que no baile al cambiar.

## Layout

Una columna de teléfono: `max-width: 480px`, centrada, con 20px de margen lateral (pad) y altura mínima `100dvh`. La barra superior mide 56px más el área segura. Cada vista es una columna flexible con un dock pegado abajo (16px arriba, 16px más el área segura abajo) que lleva la acción principal a ancho completo, al alcance del pulgar.

El ritmo de espaciado es 4 / 8 / 12 / 16 / 20 / 24px. El dial de la sesión es una rejilla `56px 1fr 56px` con los pasos a los lados de la cifra; su separación vertical se adapta con `clamp(16px, 5vh, 48px)`.

Los resultados son un carrusel horizontal con snap obligatorio: tarjeta de `min(78vw, 376px)`, separación de 12px, centrada y con ambas vecinas asomando; el carril sangra hasta el borde del viewport. Por encima, cinco segmentos de posición de 4px. A partir de 520px, el carril se desvanece con una máscara de 32px en los bordes de la columna.

## Elevation & Depth

Plano por completo: no hay ni una `box-shadow` en el sistema. La profundidad se transmite con pasos tonales (suelo, superficie, superficie pulsada) y con el campo de color de cada tarjeta. En el carrusel, la tarjeta central se distingue por escala y opacidad (las vecinas a 0.95 y 0.8), dirigido por el scroll, no por sombra.

### Named Rules
**The Flat Field Rule.** Ninguna superficie lleva sombra ni borde; se separa del suelo por tono o por color de portada.

## Shapes

Formas blandas y llenas. Todo control es una píldora (999px) o un círculo (pasos de 56px y 44px, botón atrás). Las tarjetas de disco usan 24px; los paneles (ritmo, estados) 20px; la portada 8px, casi cuadrada como la entrega Spotify; las barras del medidor 6px y las marcas finas 2px. El anillo de foco es de 3px en tinta, separado 3px, con radio de 12px. No hay bordes ni divisores: las barras de progreso y la marca de la salida en el medidor son rellenos, no líneas de estructura.

## Components

### Buttons
Grandes, llenos y para el pulgar.
- **Shape:** píldora (999px), ancho completo, 60px de alto (52px dentro de tarjetas y estados), icono de 22px a 10px del texto.
- **Primary (volt):** voltio con tinta; solo la acción principal de la vista.
- **Ink:** tinta con texto blanco; acción principal donde el fondo ya es voltio (conexión) y reintentos.
- **Hover / Active:** hover solo en punteros finos; al pulsar, `scale(0.97)` en 140ms con `--ease-out` y el tono de pulsado. Deshabilitado a opacidad 0.45 sin escala.
- **En tarjeta ("Abrir en Spotify"):** invierte los colores de la tarjeta (fondo `--card-ink`, texto `--card-bg`).

### Stepper
- **Style:** círculo de superficie de 56px con icono de 22px; variante pequeña de 44px / 18px, en blanco cuando vive dentro de un panel de superficie.
- **State:** al pulsar `scale(0.92)` y superficie pulsada; deshabilitado a 0.35.

### Segmented control
- **Style:** pista de superficie en píldora con 4px de holgura; dos opciones de 48px, 700, 16px.
- **State:** una pastilla de tinta se desliza bajo la opción activa (`translateX`, 260ms `--ease-in-out`); el texto activo pasa a blanco en 200ms.

### Chips (presets)
- **Style:** píldora de superficie, 44px de alto, mínimo 64px, 700, 16px, cifras tabulares.
- **State:** seleccionado en tinta con texto blanco; al pulsar `scale(0.95)`.

### Cards / Containers
- **Panel** (ritmo, estados): superficie, radio de 20px, 20px de relleno (ritmo: 14px 14px 14px 20px), sin borde.
- **Esqueleto:** la tarjeta final a su tamaño real con bloques planos de superficie pulsada; sin brillo animado.

### Inputs / Fields
- **Style:** la cifra de la sesión es un campo de texto numérico sin caja: transparente, centrado, en la voz Display.
- **Focus:** subrayado de tinta de 4px a 10px del texto, en lugar del anillo.

### Navigation
- **Barra:** marca a la izquierda (icono de colina de 28px + "Hill-B"), "Salir" en gris de apoyo a la derecha (600, 15px, 44px de zona táctil).
- **Atrás:** círculo de 44px con flecha de 20px.
- **Otros 5:** píldora de 44px en la cabecera de resultados, a la derecha del título: icono de barajar de 18px + "Otros 5" (700, 16px), mismo gris translúcido que Atrás, `scale(0.95)` al pulsar. Por debajo de 360px queda en círculo de 44px solo con el icono (el texto sigue para lectores de pantalla). Saca otros cinco discos con la entrada escalonada de siempre; se oculta si la biblioteca no tiene más discos.
- **Subtítulo de resultados:** el rango del que salen los discos, "5 discos de 40 a 50 min"; crece cuando la búsqueda se agranda. Se anuncia con `aria-live`.
- **Entre vistas:** View Transitions de 280ms con `--ease-drawer`; la vista nueva entra 18% desde la derecha al avanzar y desde la izquierda al volver.

### Album card (signature)
Un campo completo del color de su portada: portada cuadrada de ancho completo, título en Headline (dos líneas máximo), artista y año, la duración en Figure con la diferencia frente a la salida, el medidor, las canciones de The Magic Bus que lo trajeron y el botón a Spotify anclado abajo.
- **Medidor:** pista de 12px en `currentColor` al 18%, relleno en `currentColor` que crece a escala (`scaleX(--album)`) en 600ms con `--ease-out` la primera vez que la tarjeta queda centrada, mientras la duración cuenta hacia arriba con la misma curva. Una marca de 3px en `left: --run` señala la salida, recortada del relleno con un contorno del color de la tarjeta.
- **Entrada:** las tarjetas suben 28px desde `scale(0.97)` en 460ms, escalonadas 60ms.

## Do's and Don'ts

### Do:
- **Do** reservar el voltio (#d7ff1f) para la única acción principal de la vista o para el campo de bienvenida, siempre con tinta encima.
- **Do** marcar la selección con tinta (#111111) y texto blanco.
- **Do** separar contenedores del suelo con superficie (#f1f1ee) y responder al pulsar con superficie pulsada (#e4e4df) o escala (0.92–0.97, 140ms).
- **Do** poner cifras y títulos en Archivo a 62%, 900 y mayúsculas, con cifras tabulares.
- **Do** teñir cada tarjeta con el color de su propia portada dentro de los límites de luminosidad 0.36–0.70 y elegir su tinta por contraste.
- **Do** anclar la acción principal en el dock inferior, a ancho completo, por encima del área segura.
- **Do** dar a cada animación su alternativa con `prefers-reduced-motion` (fundido o nada).

### Don't:
- **Don't** usar suelo oscuro, rejilla de portadas pequeñas ni acento verde: no debe parecer Spotify.
- **Don't** usar tarjetas de estadísticas ni anillos de progreso de panel de fitness.
- **Don't** añadir sombras ni bordes a superficies o controles.
- **Don't** usar el voltio para estados seleccionados, texto o decoración.
- **Don't** usar una segunda familia tipográfica ni pesos intermedios en la voz de pantalla.
- **Don't** animar esqueletos con brillo; son la maqueta plana de la tarjeta final.
