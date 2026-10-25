# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no framework and no build step, installable on the phone as a PWA, deployed as a Render static site. Spotify login runs in the browser with Authorization Code + PKCE (no client secret, no server). Spotify Client ID: `6b13ef05e42d4331a1fbbbc839bc1092` (public identifier).

## Users

One person: the owner (Germán), a runner who listens to whole albums while running. He opens the app on his phone right before heading out, with the session about to start, and needs one answer: which full album to play for this run.

## Product Purpose

Hill-B answers "¿qué disco entero me conviene escuchar en esta sesión de correr?". It reads every track of a Spotify playlist the owner curates (default: "🚌 The Magic Bus", `spotify:playlist:77Yaz4xSfZjJqRTIXo4ZE2`), collects the albums those tracks come from, and proposes the albums that fit the session. Success: he picks an album in seconds and it lasts the whole run.

## Positioning

The candidates are not generic recommendations: they are the albums behind songs he already chose for his own running playlist, matched to how long he will run.

## Operating Context

Used on a phone, outdoors or at the door, often one-handed, just before a run; playback itself happens in the Spotify app. Spotify Web API in Development Mode (2026 rules): the owner needs Premium, at most 5 users, `GET /playlists/{id}/items` only works for playlists the user owns or collaborates on, batch `GET /albums` is gone (albums are fetched one by one with `GET /albums/{id}`), and track/album `popularity` is no longer returned.

## Capabilities and Constraints

- Confirmed: read the playlist, group its tracks by album, compute each album's full running time, and match albums to the run duration the user enters.
- Open decision: **mood**. The user will specify how mood is defined later. Spotify audio features are not available to new apps, so mood cannot come from the API's valence/energy.
- Open decision: **random factor**. Planned, to be designed later.
- Album lookups are one request per album and count against the shared Development Mode quota, so album data is cached on the device.

## Evidence on Hand

The owner's real playlist "🚌 The Magic Bus" on Spotify. No other content, testimonials or data exist; none may be invented.

## Product Principles

1. One answer, fast: the first thing on screen after choosing the run length is the recommended album.
2. The whole album or nothing: candidates are full albums, judged by their full running time, not by single tracks.
3. Only his music: every candidate traces back to a song in his own playlist, and the app says which songs.
4. Hand off to Spotify: open the album in Spotify to play; the app does not try to be a player.
