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

OWN-WORLD: The whole app stands on volt (#D7FF1F), Hill-B's logo yellow, with near-black ink (#111111) as the one contrast (owner's decision, 2026-10-26: "el fondo sea el amarillo color hill b… principalmente el negro como contraste… el blanco como 3er color, pero intentemos evitarlo"). No white anywhere: secondary tones are ink mixed over volt (surface #C5EA1E, press #B7D71D, muted #485415), and an album card on a dark cover colour takes volt as its light ink. Selected states (active segment, chosen intensity) and the START pill are ink with volt text. One family, Archivo variable: condensed black uppercase for numbers, START and album titles, normal width for text. Each album card is a full field of the colour sampled from its own cover's dominant hue. Pill controls, 24px cards, no shadows at rest, no lines.

STORY: He swipes the two huge number wheels to his run (hours : minutes, or km , hundreds of metres), swipes the ritmo strip sideways (both modes: it turns time into km and km into time), taps START, and five albums fill the screen one at a time, each showing its running time drawn to scale against his run and the Magic Bus songs that brought it. He swipes between them, lifts the one he wants into Spotify, pulls past the last for five others or past the first to change the run.

FIRST VIEWPORT: Session view, no visible question (an sr-only h1 only): segmented Tiempo/Distancia at the top; two vertical scroll-snap wheels of condensed numerals hugging a ":" or "," separator, three rows tall with the value in a surface band at mid-screen (the spare height splits above and below), the unit under them; for distance, "Intensidad min/km" with the computed run time and a sideways strip of pace pills; the ink START pill pinned at the bottom above the safe area. No − / + buttons, no presets. Switching mode slides the wheels to their new place (FLIP, 260ms). Results: only the Hill-B wordmark and the album cards, each exactly one phone screen with no scroll (square cover that shrinks on short phones, running time and meter pinned to the foot and growing on tall ones). No title, ticks or buttons: pull right past the first card to go back, left past the last for five others, lift a card to open it in Spotify; each pull reveals its hint circle, inked when letting go will act.

FORM: canon played straight against the user's named reference (Nike Run Club), chosen by the user over the dealt direction (bus destination roll sign, grounded #4). Signature move: the card's two equal figures, running time and the kilometres it lasts at his pace, counting up as the card lands, with the album's tags as plain bars that grow to their strength, no numbers. seed:57b5a340a968dab1

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Mood step: in the flow after the session, definition pending from the user.
- Random factor: pending.
- Which album details beyond cover, artist and duration: pending.
