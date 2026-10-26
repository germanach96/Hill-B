# Hill-B

¿Qué disco entero me conviene escuchar en esta sesión de correr? Hill-B lee tu playlist de Spotify ("The Magic Bus"), junta los discos de sus canciones y te propone los cinco que mejor cubren lo que vas a correr, por tiempo o por distancia y ritmo.

Web estática instalable en el móvil (PWA), sin inicio de sesión: los discos van dentro de la app en `public/data/albums.json`. Spotify solo se usa para leer la playlist cuando se pide (lo hace Claude con `tools/sync.mjs`) y para el botón "Abrir en Spotify".

## Leer o releer la playlist

```bash
node tools/sync.mjs login                    # enlace de inicio de sesión de Spotify, una vez
node tools/sync.mjs read "<URL de vuelta>"   # termina el login y escribe public/data/albums.json
node tools/sync.mjs read                     # relee con la sesión guardada en .sync/
```

La Redirect URI `http://127.0.0.1:5173/callback` tiene que estar en la app del dashboard de Spotify.

`read` guarda todo en `data/catalog.json` (cada canción, su disco y su álbum original) y escribe `public/data/albums.json` para la app. Solo trabaja con lo nuevo: una canción de un disco que ya está solo se suma a él; si viene de un sencillo, una deluxe, un en vivo, un recopilatorio o un remasterizado, busca también el álbum original y entran los dos (los sencillos y EP nunca entran). No borra nada. Los originales encontrados a mano van en `data/manual.json`. Si Spotify corta la cuota, se vuelve a correr y sigue donde quedó.

```bash
python3 tools/excel.py "The Magic Bus.xlsx"   # el catálogo en Excel (necesita openpyxl)
```

## Render

`render.yaml` publica `public/` como sitio estático. En Render: New → Blueprint → este repositorio.

## Desarrollo

```bash
npm run dev    # http://127.0.0.1:5173
npm test       # lógica de ranking y del catálogo (Node)
npm run e2e    # recorrido en navegador con datos inventados; capturas en .impeccable/review/
```
