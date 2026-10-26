# Draws the Hill-B logo from Archivo's B: weight 700, width 75, lying on its back (turned 90°
# counterclockwise) so its two bowls become two hills on flat ground. The right hill (the B's
# lower bowl) is drawn from a lighter B and enlarged 1.4×, so it is clearly the bigger hill
# with the same stroke; then the lying mark is slanted 12° so the hills lean forward.
# Writes the icons and logo files as SVG; `node tools/logo-png.mjs` then renders the PNGs.
#
#   pip install fonttools brotli
#   python3 tools/logo.py
import copy
import math
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "public/fonts/archivo-latin.woff2"
INK, VOLT = "#111111", "#d7ff1f"
WEIGHT, WIDTH = 700, 75  # the mark's B
RIGHT_HILL = 1.4         # the right hill against the left one
RIGHT_HOLLOW = 0.85      # the right hill's hollow, shrunk inside the same outline
SLANT = 12               # degrees, applied to the lying mark


def glyphs(wght, wdth):
    font = instantiateVariableFont(TTFont(FONT), {"wght": wght, "wdth": wdth})
    return font, font.getGlyphSet(), font.getBestCmap()


def path(glyphset, name, transform):
    pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    glyphset[name].draw(TransformPen(pen, transform))
    return pen.getCommands()


def lying_b(wght):
    """The B's points turned 90° counterclockwise: X along the ground, Y up from it."""
    font, _, cmap = glyphs(wght, WIDTH)
    glyph = font["glyf"][cmap[ord("B")]]
    coords, ends, _ = glyph.getCoordinates(font["glyf"])
    x0, y1 = min(x for x, _ in coords), max(y for _, y in coords)
    return font, glyph, ends, [(y1 - y, x - x0) for x, y in coords]


def spine(wght):
    """The B's stem: from the outer edge to the counters, i.e. the ground's thickness."""
    _, _, ends, pts = lying_b(wght)
    return min(y for _, y in pts[ends[0] + 1:])


font, glyph, ends, heavy = lying_b(WEIGHT)
# The lighter B whose stem, enlarged, matches the mark's: a coarse pass, then a fine one.
target = spine(WEIGHT) / RIGHT_HILL
coarse = min(range(100, WEIGHT + 1, 50), key=lambda w: abs(spine(w) - target))
light_w = min(range(max(100, coarse - 40), min(WEIGHT, coarse + 40) + 1, 10),
              key=lambda w: abs(spine(w) - target))
light = lying_b(light_w)[3]
outer, first, second = ends[0] + 1, ends[1] + 1, len(heavy)
counters = [range(outer, first), range(first, second)]
counters.sort(key=lambda r: min(heavy[i][0] for i in r))
left_c, right_c = counters
bar_left = max(heavy[i][0] for i in left_c)  # the bar between the counters (the B's middle bar)
bar = min(heavy[i][0] for i in right_c) - bar_left
light_c = min(light[i][0] for i in right_c)
# Enlarging about this point on the ground keeps the middle bar as thick as before.
pivot = (bar_left + bar - RIGHT_HILL * light_c) / (1 - RIGHT_HILL)
split = bar_left + bar / 2
lean = math.tan(math.radians(SLANT))
pts = []
for (hx, hy), (lx, ly) in zip(heavy, light):
    pts.append((pivot + RIGHT_HILL * (lx - pivot), RIGHT_HILL * ly) if hx > split else (hx, hy))
# The right hollow shrinks towards its bottom left corner, so the middle bar and the ground keep
# their thickness and the hill's top and far side get fuller.
ax, ay = min(pts[i][0] for i in right_c), min(pts[i][1] for i in right_c)
for i in right_c:
    x, y = pts[i]
    pts[i] = (ax + RIGHT_HOLLOW * (x - ax), ay + RIGHT_HOLLOW * (y - ay))
pts = [(x + y * lean, y) for x, y in pts]
MARK = copy.deepcopy(glyph)
MARK.coordinates = type(glyph.coordinates)(pts)
_rec = RecordingPen()
MARK.draw(_rec, font["glyf"])
_bp = BoundsPen(None)
_rec.replay(_bp)
X0, Y0, X1, Y1 = _bp.bounds
MARK_W, MARK_H = X1 - X0, Y1 - Y0


def mark(width, left, top):
    s = width / MARK_W
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    _rec.replay(TransformPen(pen, (s, 0, 0, -s, left - X0 * s, top + Y1 * s)))
    return pen.getCommands()


def mark_centred(size, width, up=0.0, left=0.0):
    h = MARK_H * width / MARK_W
    return mark(width, (size - width) / 2 - left, (size - h) / 2 - up)


def svg(view, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{body}</svg>\n'


def write(rel, text):
    (ROOT / rel).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / rel).write_text(text)
    print("wrote", rel)


# Rounded-square app icon; maskable keeps the mark inside the 80% safe circle. The flat, heavy
# base and the bigger right hill pull the mark's weight low and right, so it sits a little up
# and to the left of centre.
write("public/icon.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" rx="112" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 328, up=9, left=6)}"/>'))
write("public/icon-maskable.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 272, up=8, left=5)}"/>'))
# Favicon (16-32px in a tab): the same mark, larger in a tighter tile so its notch and counters stay open.
write("public/favicon.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" rx="88" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 448, up=10, left=6)}"/>'))

# The mark alone, tight to its ink.
mw = 688
mh = MARK_H * mw / MARK_W
write("diseno/logo/hill-b-marca.svg", svg(f"0 0 {mw} {mh:.1f}", f'<path fill="{INK}" d="{mark(mw, 0, 0)}"/>'))

# Lockup: the mark next to the wordmark set like the app bar's brand (800, width 75, caps).
font, W, wcmap = glyphs(800, 75)
CAP = 688  # Archivo cap height in font units
word, pen_x, parts = "HILL-B", 0.0, []
tracking = -0.01 * font["head"].unitsPerEm
for ch in word:
    g = wcmap[ord(ch)]
    parts.append(path(W, g, (1, 0, 0, -1, pen_x, CAP)))
    pen_x += font["hmtx"][g][0] + tracking
word_w = pen_x - tracking
OVERSHOOT = 1.015  # round hill tops rise slightly past the flat caps so they look as tall
lock_h = CAP * OVERSHOOT
lock_mw = MARK_W * lock_h / MARK_H
gap = 0.4 * font["head"].unitsPerEm  # 0.4em, the app bar's 8px at 20px
word_body = "".join(f'<path d="{d}"/>' for d in parts)
rise = lock_h - CAP  # the mark shares the baseline, so its overshoot goes above the caps
lockup = (f'<path d="{mark(lock_mw, 0, 0)}"/>'
          f'<g transform="translate({lock_mw + gap:.1f} {rise:.1f})">{word_body}</g>')
view = f"0 0 {lock_mw + gap + word_w:.1f} {lock_h:.1f}"
write("diseno/logo/hill-b-logo.svg", svg(view, f'<g fill="{INK}">{lockup}</g>'))
write("diseno/logo/hill-b-logo-volt.svg", svg(
    f"-{0.5 * CAP:.0f} -{0.5 * CAP:.0f} {lock_mw + gap + word_w + CAP:.1f} {lock_h + CAP:.1f}",
    f'<rect x="-{0.5 * CAP:.0f}" y="-{0.5 * CAP:.0f}" width="100%" height="100%" fill="{VOLT}"/>'
    f'<g fill="{INK}">{lockup}</g>'))

# The app bar symbol, 32 units wide and tight to its ink, pasted into public/index.html as #i-mark.
print(f"\n#i-mark (viewBox 0 0 32 {MARK_H * 32 / MARK_W:.1f}):")
print(mark(32, 0, 0))
