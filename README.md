# Hill-B

¿Qué disco entero me conviene escuchar en esta sesión de correr? Hill-B lee tu playlist de Spotify ("The Magic Bus"), junta los discos de sus canciones y te propone los cinco que mejor cubren lo que vas a correr, por tiempo o por distancia y ritmo.

Web estática instalable en el móvil (PWA), sin inicio de sesión: los discos van dentro de la app en `public/data/albums.json`. Spotify solo se usa para leer la playlist cuando se pide (lo hace Claude con `tools/sync.mjs`) y para el botón "Abrir en Spotify".

## Leer o releer la playlist

```bash
node tools/sync.mjs login                    # enlace de inicio de sesión de Spotify, una vez
node tools/sync.mjs read "<URL de vuelta>"   # termina el login y escribe public/data/albums.json
node tools/sync.mjs read                     # relee con la sesión guardada en .sync/
```

La Redirect URI `http://127.0.0.1:5173/callback` tiene que estar en la app del dashboard de Spotify. Solo se miden los discos nuevos.

## Render

`render.yaml` publica `public/` como sitio estático. En Render: New → Blueprint → este repositorio.

## Desarrollo

```bash
npm run dev    # http://127.0.0.1:5173
npm test       # lógica de ranking (Node)
npm run e2e    # recorrido en navegador con datos inventados; capturas en .impeccable/review/
```
