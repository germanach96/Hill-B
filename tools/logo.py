# Draws the Hill-B logo: Archivo's own B at weight 900, width 75, lying on its back
# (turned 90° counterclockwise) so its two bowls become two hills on flat ground.
# Writes the icons and logo files as SVG; `node tools/logo-png.mjs` then renders the PNGs.
#
#   pip install fonttools brotli
#   python3 tools/logo.py
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "public/fonts/archivo-latin.woff2"
INK, VOLT = "#111111", "#d7ff1f"


def glyphs(wght, wdth):
    font = instantiateVariableFont(TTFont(FONT), {"wght": wght, "wdth": wdth})
    return font, font.getGlyphSet(), font.getBestCmap()


def bounds(glyphset, name, transform=(1, 0, 0, 1, 0, 0)):
    pen = BoundsPen(glyphset)
    glyphset[name].draw(TransformPen(pen, transform))
    return pen.bounds


def path(glyphset, name, transform):
    pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    glyphset[name].draw(TransformPen(pen, transform))
    return pen.getCommands()


# The mark: font units have y up and SVG has y down; turning the B 90° counterclockwise puts
# its top to the left and its spine along the bottom as the ground line.
_, B, cmap = glyphs(900, 75)
b = cmap[ord("B")]
x0, y0, x1, y1 = bounds(B, b)
MARK_W, MARK_H = y1 - y0, x1 - x0  # lying down: the glyph's height becomes the mark's width


def mark(width, left, top):
    s = width / MARK_W
    # SVG x = left + (y1 - y)·s ; SVG y = top + (x1 - x)·s
    return path(B, b, (0, -s, -s, 0, left + y1 * s, top + x1 * s))


def mark_centred(size, width, nudge=0.0):
    h = MARK_H * width / MARK_W
    return mark(width, (size - width) / 2, (size - h) / 2 + nudge)


def svg(view, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{body}</svg>\n'


def write(rel, text):
    (ROOT / rel).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / rel).write_text(text)
    print("wrote", rel)


# Rounded-square app icon; maskable keeps the mark inside the 80% safe circle. The flat, heavy
# base makes the mark look low, so it sits a little above centre.
write("public/icon.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" rx="112" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 328, -6)}"/>'))
write("public/icon-maskable.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 272, -5)}"/>'))
# Favicon (16-32px in a tab): the same B, larger in a tighter tile so its notch and counters stay open.
write("public/favicon.svg", svg("0 0 512 512",
      f'<rect width="512" height="512" rx="88" fill="{VOLT}"/>'
      f'<path fill="{INK}" d="{mark_centred(512, 448, -6)}"/>'))

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
