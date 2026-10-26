// The album deck as a pager driven by the finger, not by native scrolling: native scroll cannot tell
// a pull past the first or the last card, and those pulls are actions here.
//   sideways        one card at a time; a flick is enough
//   past the first  (pulling right)  → onBack: back to the run
//   past the last   (pulling left)   → onMore: five other albums, when there are any
//   up on a card                     → onOpen: the album in Spotify
// Pulls past an edge resist like a rubber band and reveal what letting go will do.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const SLOP = 8; // px before a drag picks its axis
const FLICK = 0.45; // px/ms: a release this fast counts even when short
const SETTLE = 'transform 420ms cubic-bezier(0.32, 0.72, 0, 1)'; // --ease-drawer

// The further past the edge, the less the card follows (Apple's rubber band).
const rubber = (over, size, c = 0.55) => (over * size * c) / (size + c * Math.abs(over));

export function createPager(pager, track, { onIndex, onBack, onMore, canMore, onOpen }) {
  const pulls = {
    back: pager.querySelector('.pull-back'),
    more: pager.querySelector('.pull-more'),
    open: pager.querySelector('.pull-open'),
  };
  let index = 0;
  let drag = null;

  const cards = () => [...track.children];
  const step = () => {
    const [a, b] = cards();
    if (!a) return 1;
    return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
  };
  const xOf = (i) => -i * step();
  const last = () => Math.max(0, cards().length - 1);
  // Commit distances: about a quarter of a card sideways, a fair lift upwards.
  const sideReach = () => Math.min(110, pager.clientWidth * 0.28);
  const liftReach = () => Math.min(130, pager.clientHeight * 0.16);

  function place(x, animate) {
    track.style.transition = animate && !reducedMotion.matches ? SETTLE : 'none';
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function lift(card, y, animate) {
    if (!card) return;
    card.style.transition = animate && !reducedMotion.matches ? SETTLE : 'none';
    card.style.transform = y ? `translate3d(0, ${y}px, 0)` : '';
  }

  // Each hint grows with the pull and is "armed" (full size, a tick under the thumb) once letting go acts.
  let armed = null;
  function reveal(which, progress) {
    for (const [name, el] of Object.entries(pulls)) {
      const p = name === which ? Math.max(0, Math.min(1, progress)) : 0;
      el.style.opacity = String(p);
      el.style.transform = `scale(${0.8 + 0.2 * p})`;
      el.classList.toggle('is-armed', p >= 1);
    }
    const now = which && progress >= 1 ? which : null;
    if (now && now !== armed) navigator.vibrate?.(8);
    armed = now;
  }
  const hide = () => {
    for (const el of Object.values(pulls)) {
      el.style.transition = 'opacity 200ms ease, transform 200ms cubic-bezier(0.23, 1, 0.32, 1)';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.8)';
      el.classList.remove('is-armed');
    }
    armed = null;
  };

  function go(i, { animate = true } = {}) {
    const next = Math.max(0, Math.min(last(), i));
    const changed = next !== index;
    index = next;
    place(xOf(index), animate);
    if (changed) onIndex(index);
  }

  pager.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag || !cards().length) return;
    // Grab the deck where it is, mid-glide included.
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    place(m.m41, false);
    for (const el of Object.values(pulls)) el.style.transition = 'none';
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: m.m41, axis: null, dx: 0, dy: 0, trail: [] };
    pager.setPointerCapture(e.pointerId);
  });

  pager.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    drag.trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (drag.trail.length > 6) drag.trail.shift();
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < SLOP) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    drag.dx = dx;
    drag.dy = dy;
    if (drag.axis === 'x') {
      const raw = drag.base + dx;
      const max = xOf(0);
      const min = xOf(last());
      const width = pager.clientWidth;
      if (raw > max) {
        place(max + rubber(raw - max, width), false);
        reveal('back', (raw - max) / sideReach());
      } else if (raw < min) {
        place(min - rubber(min - raw, width), false);
        reveal(canMore() ? 'more' : null, (min - raw) / sideReach());
      } else {
        place(raw, false);
        reveal(null, 0);
      }
    } else {
      // Only up does something; down just resists.
      const height = pager.clientHeight;
      lift(cards()[index], dy < 0 ? -rubber(-dy, height) : rubber(dy, height) * 0.3, false);
      reveal('open', -dy / liftReach());
    }
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { axis, dx, dy, base, trail } = drag;
    drag = null;
    const first = trail[0];
    const end = trail[trail.length - 1];
    const dt = first && end ? Math.max(1, end.t - first.t) : 1;
    const vx = first ? (end.x - first.x) / dt : 0;
    const vy = first ? (end.y - first.y) / dt : 0;
    const action = armed;
    hide();

    if (axis === 'x') {
      const raw = base + dx;
      const pastStart = raw - xOf(0);
      const pastEnd = xOf(last()) - raw;
      if (action === 'back' || (pastStart > 32 && vx > FLICK)) {
        place(xOf(index), true);
        onBack();
        return;
      }
      if (canMore() && (action === 'more' || (pastEnd > 32 && vx < -FLICK))) {
        place(xOf(index), true);
        onMore();
        return;
      }
      // One card per swipe: far enough, or fast enough, in either direction.
      const far = Math.abs(dx) > step() * 0.22;
      const fast = Math.abs(vx) > FLICK;
      go(far || fast ? index - Math.sign(dx || -vx) : index);
    } else if (axis === 'y') {
      lift(cards()[index], 0, true);
      if (action === 'open' || (dy < -36 && vy < -FLICK)) onOpen(index);
    }
  }
  pager.addEventListener('pointerup', release);
  pager.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    hide();
    place(xOf(index), true);
    lift(cards()[index], 0, true);
  });

  // The keyboard does the same: arrows move, past the ends they act; up or Enter opens; Escape goes back.
  pager.addEventListener('keydown', (e) => {
    const n = cards().length;
    if (!n) return;
    const actions = {
      ArrowRight: () => (index < last() ? go(index + 1) : canMore() && onMore()),
      ArrowLeft: () => (index > 0 ? go(index - 1) : onBack()),
      ArrowUp: () => onOpen(index),
      Enter: () => onOpen(index),
      Escape: () => onBack(),
      Home: () => go(0),
      End: () => go(last()),
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    actions[e.key]();
  });

  // Card widths follow the screen: keep the current card centred through rotation and resizing.
  new ResizeObserver(() => place(xOf(index), false)).observe(pager);

  return {
    /** A new set of cards: start at the first one, without a glide. */
    reset() {
      index = 0;
      place(0, false);
      onIndex(0);
    },
    get index() { return index; },
  };
}
