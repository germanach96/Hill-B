// The album deck as a pager driven by the finger, not by native scrolling: native scroll cannot tell
// a pull past the first or the last card, and those pulls are actions here.
//   sideways        one card at a time; a flick is enough
//   past the first  (pulling right)  → onBack: back to the run
//   past the last   (pulling left)   → onMore: five other albums, when there are any
//   up on a card                     → onOpen: the album in Spotify
//
// Everything moves on springs (Apple's response / damping-ratio form) that start from where the
// deck is and carry the finger's speed, so a release never jumps and a flick keeps its momentum.
// The cards' size, their fade and the position bars are all drawn from the deck's live position,
// so they follow the finger instead of switching when the gesture ends.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const SLOP = 8; // px before a drag picks its axis
const FLICK = 0.35; // px/ms: a release this fast counts even when short
const MAX_SPEED = 4000; // px/s handed to a spring, so a wild flick cannot fling the deck

// The further past the edge, the less the card follows (Apple's rubber band).
const rubber = (over, size, c = 0.55) => (over * size * c) / (size + c * Math.abs(over));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** A critically or lightly damped spring on one number, stepped by the shared frame loop. */
function spring(value) {
  return { x: value, v: 0, target: value, k: 0, c: 0, on: false, done: null };
}
function aim(s, target, { response = 0.45, damping = 1, velocity } = {}, done = null) {
  const omega = (2 * Math.PI) / response;
  s.target = target;
  s.k = omega ** 2; // stiffness for mass 1
  s.c = 2 * damping * omega; // damping coefficient
  if (velocity !== undefined) {
    // Hand over the finger's speed, but never more than a clean glide to the target can carry:
    // a critically damped spring starting at ω·distance eases out like a pure exponential. Faster
    // than that, a hard flick crossed the whole card in two or three frames on the phone and read
    // as a jump. Speed away from the target (a drag reversed at release) is kept small, so the
    // card turns round softly instead of lurching.
    const toward = Math.sign(target - s.x);
    const cap = omega * Math.abs(target - s.x) + 60;
    const v = clamp(velocity, -MAX_SPEED, MAX_SPEED);
    s.v = Math.sign(v) === toward ? clamp(v, -cap, cap) : clamp(v, -cap * 0.25, cap * 0.25);
  }
  s.done = done;
  s.on = true;
  if (reducedMotion.matches) settle(s);
}
function settle(s) {
  s.x = s.target;
  s.v = 0;
  s.on = false;
  const done = s.done;
  s.done = null;
  done?.();
}
function advance(s, dt) {
  if (!s.on) return;
  const steps = 4; // small sub-steps keep a stiff spring stable at 60 and 120 Hz alike
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const a = -s.k * (s.x - s.target) - s.c * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
  if (Math.abs(s.x - s.target) < 0.25 && Math.abs(s.v) < 6) settle(s);
}

export function createPager(pager, track, { ticks, onIndex, onSettle, onBack, onMore, canMore, onOpen }) {
  const pulls = {
    back: pager.querySelector('.pull-back'),
    more: pager.querySelector('.pull-more'),
    open: pager.querySelector('.pull-open'),
  };
  const deck = spring(0); // the track's x, in px
  const lift = spring(0); // the front card's y, in px
  let index = 0;
  let drag = null;
  let fling = 0; // px/s of the gesture that asked for five others: the new set arrives with it

  const cards = () => [...track.children];
  const step = () => {
    const [a, b] = cards();
    if (!a) return 1;
    return (b ? b.offsetLeft - a.offsetLeft : a.offsetWidth) || 1; // 0 while the view is hidden
  };
  const xOf = (i) => -i * step();
  const last = () => Math.max(0, cards().length - 1);
  // Commit distances: about a quarter of a card sideways, a fair lift upwards.
  const sideReach = () => Math.min(110, pager.clientWidth * 0.28);
  const liftReach = () => Math.min(130, pager.clientHeight * 0.16);

  /* ---------- Drawing: everything from the two springs ---------- */

  function draw() {
    track.style.transform = `translate3d(${deck.x}px, 0, 0)`;
    const s = step();
    const at = -deck.x / s; // the deck's position in cards, fractional while moving
    cards().forEach((card, i) => {
      const d = Math.min(1, Math.abs(i - at)); // 0 in front, 1 a card away or more
      const scale = 1 - 0.05 * d;
      const y = i === index ? lift.x : 0;
      // Neighbours shrink towards the card in front, so their edge keeps showing beside it.
      card.style.transformOrigin = i < at ? 'right center' : 'left center';
      card.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
      card.style.opacity = String(1 - 0.2 * d);
    });
    if (ticks) {
      [...ticks.children].forEach((t, i) => {
        t.firstElementChild.style.opacity = String(1 - Math.min(1, Math.abs(i - clamp(at, 0, last()))));
      });
    }
  }

  let frame = 0;
  let then = 0;
  function loop(now) {
    const dt = Math.min(1 / 30, (now - then) / 1000 || 1 / 60);
    then = now;
    advance(deck, dt);
    advance(lift, dt);
    draw();
    frame = deck.on || lift.on ? requestAnimationFrame(loop) : 0;
  }
  function kick() {
    if (reducedMotion.matches) { draw(); return; }
    if (!frame) {
      then = performance.now();
      frame = requestAnimationFrame(loop);
    }
  }

  /* ---------- The hints under the pulls ---------- */

  // Each hint grows with the pull and is "armed" (inked, a tick under the thumb) once letting go acts.
  let armed = null;
  function reveal(which, progress) {
    for (const [name, el] of Object.entries(pulls)) {
      const p = name === which ? clamp(progress, 0, 1) : 0;
      el.style.transition = 'background-color 160ms ease, color 160ms ease';
      el.style.opacity = String(p);
      el.style.transform = `scale(${0.8 + 0.2 * p})`;
      el.classList.toggle('is-armed', p >= 1);
    }
    const now = which && progress >= 1 ? which : null;
    if (now && now !== armed) navigator.vibrate?.(8);
    armed = now;
  }
  function hide() {
    for (const el of Object.values(pulls)) {
      el.style.transition = 'opacity 240ms ease, transform 320ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, color 160ms ease';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.8)';
    }
    armed = null;
  }

  /* ---------- Moves ---------- */

  function go(i, velocity = 0) {
    const next = clamp(i, 0, last());
    const changed = next !== index;
    index = next;
    // Critically damped: the card glides in and stops, never wobbles; whatever the flick, the glide
    // takes about the same time (90% in 0.2 s, still at 0.4 s).
    aim(deck, xOf(index), { response: 0.55, damping: 1, velocity }, () => onSettle?.(index));
    kick();
    if (changed) onIndex(index);
  }

  function back(velocity = 0) {
    // The deck keeps travelling right as the run screen slides in: one motion, not a cut.
    aim(deck, xOf(index) + pager.clientWidth * 0.5, { response: 0.45, velocity: Math.max(velocity, 300) }, null);
    kick();
    onBack();
  }

  function more(velocity = 0) {
    // This set leaves to the left at the finger's speed; the next one arrives from the right with it.
    fling = Math.min(velocity, -600);
    aim(deck, xOf(last()) - pager.clientWidth * 0.6, { response: 0.42, velocity: fling }, null);
    kick();
    track.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion.matches ? 0 : 160, easing: 'ease', fill: 'forwards' })
      .finished.then(() => onMore(), () => onMore());
  }

  function open(velocity = 0) {
    // The card keeps rising a little as Spotify takes over, then settles back for when you return.
    aim(lift, -Math.min(140, pager.clientHeight * 0.18), { response: 0.36, velocity: Math.min(velocity, -300) }, () => {
      setTimeout(() => { aim(lift, 0, { response: 0.45, damping: 0.82 }); kick(); }, 260);
    });
    kick();
    onOpen(index);
  }

  /* ---------- The finger ---------- */

  pager.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag || !cards().length) return;
    // Grab the deck where it is, mid-glide included: the springs stop under the finger.
    deck.on = false;
    lift.on = false;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: deck.x, lift0: lift.x, axis: null, dx: 0, dy: 0, trail: [] };
    pager.setPointerCapture(e.pointerId);
  });

  pager.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    drag.trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (drag.trail.length > 2 && e.timeStamp - drag.trail[0].t > 100) drag.trail.shift();
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
        deck.x = max + rubber(raw - max, width);
        reveal('back', (raw - max) / sideReach());
      } else if (raw < min) {
        deck.x = min - rubber(min - raw, width);
        reveal(canMore() ? 'more' : null, (min - raw) / sideReach());
      } else {
        deck.x = raw;
        reveal(null, 0);
      }
    } else {
      // Only up does something; down just resists.
      const height = pager.clientHeight;
      lift.x = dy < 0 ? -rubber(-dy, height) : rubber(dy, height) * 0.3;
      reveal('open', -dy / liftReach());
    }
    draw();
  });

  function velocityOf(trail) {
    const a = trail[0];
    const b = trail[trail.length - 1];
    if (!a || !b || b.t === a.t) return { vx: 0, vy: 0 };
    return { vx: (b.x - a.x) / (b.t - a.t), vy: (b.y - a.y) / (b.t - a.t) }; // px/ms
  }

  pager.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { axis, dx, dy, base, trail } = drag;
    drag = null;
    const { vx, vy } = velocityOf(trail);
    const action = armed;
    hide();
    // A card caught mid-lift and then dragged sideways (or tapped) drops back into the row.
    if (axis !== 'y' && lift.x) { aim(lift, 0, { response: 0.42, damping: 0.82 }); kick(); }

    if (axis === 'x') {
      const raw = base + dx;
      const pastStart = raw - xOf(0);
      const pastEnd = xOf(last()) - raw;
      if (action === 'back' || (pastStart > 32 && vx > FLICK)) return back(vx * 1000);
      if (canMore() && (action === 'more' || (pastEnd > 32 && vx < -FLICK))) return more(vx * 1000);
      // One card per swipe: far enough, or fast enough, in either direction.
      const far = Math.abs(dx) > step() * 0.22;
      const fast = Math.abs(vx) > FLICK;
      const dir = fast ? -Math.sign(vx) : -Math.sign(dx);
      go(far || fast ? index + dir : index, vx * 1000);
    } else if (axis === 'y') {
      if (action === 'open' || (dy < -36 && vy < -FLICK)) return open(vy * 1000);
      aim(lift, 0, { response: 0.42, damping: 0.82, velocity: vy * 1000 });
      kick();
    } else {
      go(index); // a tap mid-glide: finish the glide
    }
  });

  pager.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    hide();
    go(index);
    aim(lift, 0, { response: 0.42 });
    kick();
  });

  // The keyboard does the same: arrows move, past the ends they act; up or Enter opens; Escape goes back.
  pager.addEventListener('keydown', (e) => {
    if (!cards().length) return;
    const actions = {
      ArrowRight: () => (index < last() ? go(index + 1) : canMore() && more()),
      ArrowLeft: () => (index > 0 ? go(index - 1) : back()),
      ArrowUp: () => open(),
      Enter: () => open(),
      Escape: () => back(),
      Home: () => go(0),
      End: () => go(last()),
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    actions[e.key]();
  });

  // Card widths follow the screen: keep the current card centred through rotation and resizing.
  new ResizeObserver(() => {
    if (deck.on || drag) return;
    deck.x = xOf(index);
    draw();
  }).observe(pager);

  return {
    /**
     * A new set of cards. After a search it simply starts at the first card; after "five others"
     * the set glides in from the right at the speed of the pull that asked for it.
     */
    reset({ arriving = false } = {}) {
      index = 0;
      lift.on = false;
      lift.x = 0;
      track.getAnimations().forEach((a) => a.cancel());
      if (arriving && !reducedMotion.matches) {
        deck.x = pager.clientWidth * 0.55;
        aim(deck, 0, { response: 0.6, velocity: fling }, () => onSettle?.(0));
        track.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
        kick();
      } else {
        deck.on = false;
        deck.x = 0;
      }
      draw();
      onIndex(0);
      if (!arriving || reducedMotion.matches) onSettle?.(0);
    },
    more: () => more(),
    get index() { return index; },
  };
}
