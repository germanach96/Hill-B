# Catálogo de canciones (Excel "The Magic Bus")

Scripts de un solo uso que arma Claude para el Excel de la playlist. No los usa la app.

- `dump.mjs <entries.json>`: baja todas las canciones de la playlist (API web de Spotify, sesión de `.sync/`).
- `classify.mjs`: clasifica cada canción: Directa, Sencillo, Deluxe o edición especial, En vivo, Recopilatorio, Remasterizado.
- `lookup.mjs <entries.json> <cache.json> <results.json>`: busca el álbum de estudio original (ISRC y luego título + artista). Guarda cada búsqueda en `cache.json` y reanuda donde quedó si Spotify corta la cuota. Con `OFFLINE=1` vuelve a elegir usando solo la caché.
- `finalize.mjs <entries.json> <results.json> <final.json>`: aplica las reglas para lo no encontrado.
- `flatten.mjs <entries.json> <flat.json>` y `build_xlsx.py <flat.json> <salida.xlsx> <final.json>`: arman el Excel (pestañas Canciones y Discos).

`results.json` y `cache.json` guardan el avance de la búsqueda del 2026-10-26: 414 de 610 canciones revisadas.
