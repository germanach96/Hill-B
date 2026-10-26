---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: []
---

# Hill-B app (public/index.html)

Scope: the whole phone app, one page with four views: connect, session, results, error. Visitor mode: **Operate** (he completes one task: pick a whole album for this run).

Audience and job: the owner alone, on his phone at the door before a run. Task: say how long (time, or km with pace), then the mood (not yet defined), then swipe through ~5 albums and open one in Spotify. Content: his own playlist "🚌 The Magic Bus" and the albums behind its songs. Constraints: big type, few steps, session never lost, must not look like Spotify.

Pinned by the user (beats the roll): Nike Run Club style, light palette, lively and simple, lots of animation, ~5 albums he swipes through.

## Direction contract

THESIS: The run length is the hero, set as a giant number like Nike Run Club's goal screen; the answer is five whole albums measured against that number. It refuses the music-app default (dark ground, grid of small covers, green accent) and the fitness-dashboard default (stat tiles, rings).

OWN-WORLD: White ground, near-black ink, one volt accent (#D7FF1F) on the one primary action ("Buscar discos"). The first-run connect screen is the single exception: a full volt field with an ink button, the welcome moment of the user's "viva y sencilla" Nike Run Club register. Selected states (active segment, active preset) are ink pills, so volt stays the one action. One family, Archivo variable: condensed black uppercase for numbers and album titles, normal width for text. Each album card is a full field of the colour sampled from its own cover's dominant hue; the page itself stays white. Pill controls, 24px cards, no shadows at rest, no lines.

STORY: He sees one huge editable number, nudges it, taps one volt button, and five albums slide in, each showing its running time drawn to scale against his run and the Magic Bus songs that brought it. He swipes, picks, and goes to Spotify.

FIRST VIEWPORT: Session view: segmented Tiempo/Distancia at the top; the number at 6-9rem, centred, with − and + either side and the unit under it; for distance, the pace stepper and the computed time; the volt "Buscar discos" pill pinned at the bottom above the safe area. Results: a title line with the run length, a horizontal snap carousel with the active card at about 78% width and both neighbours visibly peeking, position segments above.

FORM: canon played straight against the user's named reference (Nike Run Club), chosen by the user over the dealt direction (bus destination roll sign, grounded #4). Signature move: the duration bar that fills to exact scale against the run when a card arrives, while the running time counts up beside it. seed:57b5a340a968dab1

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Mood step: in the flow after the session, definition pending from the user.
- Random factor: pending.
- Which album details beyond cover, artist and duration: pending.
