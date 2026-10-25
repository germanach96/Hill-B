# Hill-B

¿Qué disco entero me conviene escuchar en esta sesión de correr? Hill-B lee tu playlist de Spotify ("The Magic Bus"), junta los discos de sus canciones y te propone los cinco que mejor cubren lo que vas a correr, por tiempo o por distancia y ritmo.

Web estática instalable en el móvil (PWA). Sin servidor: el inicio de sesión con Spotify (PKCE) ocurre en el navegador y la sesión queda guardada en el teléfono.

## Spotify

En [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), en la app con Client ID `6b13ef05e42d4331a1fbbbc839bc1092`, añade estas Redirect URIs:

- `https://<tu-servicio>.onrender.com/callback`
- `http://127.0.0.1:5173/callback` (para probar en local; Spotify no acepta `localhost`)

Requisitos de Spotify en modo desarrollo (2026): la cuenta dueña de la app necesita Premium, y la playlist tiene que ser tuya o colaborativa.

## Render

`render.yaml` publica `public/` como sitio estático y reescribe `/callback` a `index.html`. En Render: New → Blueprint → este repositorio.

## Desarrollo

```bash
npm run dev    # http://127.0.0.1:5173
npm test       # lógica de ranking (Node)
npm run e2e    # recorrido en navegador con Spotify simulado y datos inventados; capturas en .impeccable/review/
```
