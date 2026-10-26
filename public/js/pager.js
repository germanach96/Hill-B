// The album deck as a pager driven by the finger, not by native scrolling: native scroll cannot tell
// a pull past the first or the last card, and those pulls are actions here.
//   sideways        one card at a time; a flick is enough
//   past the first  (pulling right)  → onBack: back to the run
//   past the last   (pulling left)   → onMore: five other albums, when there are any
//   up on a card                     → onOpen: the album in Spotify
//
// Everything moves on springs (Apple's response / damping-ratio form) that start from where the
// deck is and carry the finger's speed, so a release never jumps and a flick keeps its momentum.
// The cards' size, their fade and the position bars are all drawn from the deck's position, so they
// follow the finger instead of switching when the gesture ends.
//
// While the finger is down the deck follows it directly. Once it lets go, the spring is worked out
// in advance and handed to the browser as Web Animations keyframes (one per 1/60 s): the glide then
// runs on the compositor, so covers decoding or colours being sampled on the main thread cannot
// drop its frames. A frame-by-frame JavaScript loop is exactly what stuttered on the phone.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const SLOP = 8; // px before a drag picks its axis
const FLICK = 0.35; // px/ms: a release this fast counts even when short
const MAX_SPEED = 4000; // px/s handed to a spring, so a wild flick cannot fling the deck
const HZ = 60; // keyframes per second of spring
// A new animation shows its first frame one frame late, so the glide starts a frame in: the deck
// is already at the first keyframe (the finger left it there) and must move on the very next frame.
const LEAD = 1000 / HZ;

// The further past the edge, the less the card follows (Apple's rubber band).
const rubber = (over, size, c = 0.55) => (over * size * c) / (size + c * Math.abs(over));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * A spring from `from` to `to`, sampled HZ times a second until it rests. The finger's speed is
 * handed over, but never more than a clean glide to the target can carry: a critically damped
 * spring starting at ω·distance eases out like a pure exponential. Faster than that, a hard flick
 * crossed the whole card in two or three frames and read as a jump. Speed away from the target (a
 * drag reversed at release) is kept small, so the card turns round softly instead of lurching.
 */
function springPath(from, to, velocity = 0, { response = 0.45, damping = 1 } = {}) {
  const omega = (2 * Math.PI) / response;
  const k = omega * omega; // stiffness for mass 1
  const c = 2 * damping * omega; // damping coefficient
  const toward = Math.sign(to - from);
  const cap = omega * Math.abs(to - from) + 60;
  let v = clamp(velocity, -MAX_SPEED, MAX_SPEED);
  v = Math.sign(v) === toward ? clamp(v, -cap, cap) : clamp(v, -cap * 0.25, cap * 0.25);
  let x = from;
  const out = [x];
  const sub = 8;
  const h = 1 / (HZ * sub);
  for (let f = 0; f < HZ * 3; f++) {
    for (let i = 0; i < sub; i++) {
      v += (-k * (x - to) - c * v) * h;
      x += v * h;
    }
    if (Math.abs(x - to) < 0.25 && Math.abs(v) < 6) break;
    out.push(x);
  }
  out.push(to);
  return out;
}

export function createPager(pager, track, { ticks, onIndex, onSettle, onBack, onMore, canMore, onOpen }) {
  const pulls = {
    back: pager.querySelector('.pull-back'),
    more: pager.querySelector('.pull-more'),
    open: pager.querySelector('.pull-open'),
  };
  const pos = { x: 0, y: 0 }; // the track's x and the front card's lift, in px, when nothing plays
  let running = null; // the glide being played: its sampled path and its animations
  let index = 0;
  let drag = null;
  let fling = 0; // px/s of the gesture that asked for five others: the new set arrives with it

  const cards = () => [...track.children];
  const fills = () => (ticks ? [...ticks.children].map((t) => t.firstElementChild) : []);
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

  /* ---------- Drawing: everything from the deck's x and the lift's y ---------- */

  function styles(x, y) {
    const s = step();
    const w = cards()[0]?.offsetWidth ?? 0;
    const at = -x / s; // the deck's position in cards, fractional while moving
    return {
      track: `translate3d(${x}px, 0, 0)`,
      cards: cards().map((card, i) => {
        const d = Math.min(1, Math.abs(i - at)); // 0 in front, 1 a card away or more
        const scale = 1 - 0.05 * d;
        // Neighbours shrink towards the card in front, so their edge keeps showing beside it
        // (a scale about the near edge, written as a shift so the origin never has to flip).
        const shift = i < at ? (w * (1 - scale)) / 2 : -(w * (1 - scale)) / 2;
        return {
          transform: `translate3d(${shift}px, ${i === index ? y : 0}px, 0) scale(${scale})`,
          opacity: String(1 - 0.2 * d),
        };
      }),
      ticks: fills().map((_, i) => String(1 - Math.min(1, Math.abs(i - clamp(at, 0, last()))))),
    };
  }

  function draw(x = pos.x, y = pos.y) {
    const st = styles(x, y);
    track.style.transform = st.track;
    cards().forEach((card, i) => {
      card.style.transform = st.cards[i].transform;
      card.style.opacity = st.cards[i].opacity;
    });
    fills().forEach((f, i) => { f.style.opacity = st.ticks[i]; });
  }

  /** Where the glide is right now, and how fast it is going (px/s), read from its own clock. */
  function now() {
    if (!running) return { x: pos.x, y: pos.y, vx: 0, vy: 0 };
    const t = (((running.anims[0].currentTime ?? 0) + LEAD) / 1000) * HZ;
    const read = (path) => {
      const i = Math.min(path.length - 1, Math.floor(t));
      const j = Math.min(path.length - 1, i + 1);
      const f = t - i;
      return { v: path[i] + (path[j] - path[i]) * Math.min(1, f), speed: (path[j] - path[i]) * HZ };
    };
    const x = read(running.px);
    const y = read(running.py);
    return { x: x.v, y: y.v, vx: x.speed, vy: y.speed };
  }

  /** Stops the glide where it is (a finger landing on it); the deck stays exactly there. */
  function stop() {
    if (!running) return;
    const at = now();
    const { anims } = running;
    running = null;
    pos.x = at.x;
    pos.y = at.y;
    draw();
    anims.forEach((a) => a.cancel());
  }

  /**
   * Glides the deck (x) and the lift (y) to their targets on springs, from wherever they are now and
   * at whatever speed they have, played by the browser from precomputed keyframes.
   */
  function glide({ x, y } = {}, done = null) {
    const at = now();
    stop();
    const px = x ? springPath(at.x, x.to, x.velocity ?? at.vx, x) : [at.x];
    const py = y ? springPath(at.y, y.to, y.velocity ?? at.vy, y) : [at.y];
    const n = Math.max(px.length, py.length);
    const fx = (i) => px[Math.min(i, px.length - 1)];
    const fy = (i) => py[Math.min(i, py.length - 1)];
    const endX = fx(n - 1);
    const endY = fy(n - 1);
    if (reducedMotion.matches || n < 2) {
      pos.x = endX;
      pos.y = endY;
      draw();
      done?.();
      return;
    }
    const frames = Array.from({ length: n }, (_, i) => styles(fx(i), fy(i)));
    const opts = { duration: ((n - 1) * 1000) / HZ, delay: -LEAD, easing: 'linear', fill: 'forwards' };
    const anims = [
      track.animate(frames.map((f) => ({ transform: f.track })), opts),
      ...cards().map((card, c) => card.animate(frames.map((f) => f.cards[c]), opts)),
      ...fills().map((el, t) => el.animate(frames.map((f) => ({ opacity: f.ticks[t] })), opts)),
    ];
    const run = { px: Array.from({ length: n }, (_, i) => fx(i)), py: Array.from({ length: n }, (_, i) => fy(i)), anims };
    running = run;
    anims[0].finished.then(() => {
      if (running !== run) return;
      running = null;
      pos.x = endX;
      pos.y = endY;
      draw(); // the end state as plain styles, then the animations step aside
      anims.forEach((a) => a.cancel());
      done?.();
    }, () => {});
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

  function go(i, velocity) {
    const next = clamp(i, 0, last());
    const changed = next !== index;
    index = next;
    // Critically damped: the card glides in and stops, never wobbles; whatever the flick, the glide
    // takes about the same time (90% in 0.2 s, still at 0.4 s). A card caught mid-lift drops back.
    glide({
      x: { to: xOf(index), velocity, response: 0.55, damping: 1 },
      y: pos.y || running ? { to: 0, response: 0.42, damping: 0.82 } : undefined,
    }, () => onSettle?.(index));
    if (changed) onIndex(index);
  }

  function back(velocity = 0) {
    // The deck keeps travelling right as the run screen slides in: one motion, not a cut.
    glide({ x: { to: xOf(index) + pager.clientWidth * 0.5, velocity: Math.max(velocity, 300), response: 0.45 } });
    onBack();
  }

  function more(velocity = 0) {
    // This set leaves to the left at the finger's speed; the next one arrives from the right with it.
    fling = Math.min(velocity, -600);
    glide({ x: { to: xOf(last()) - pager.clientWidth * 0.6, velocity: fling, response: 0.42 } });
    track.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion.matches ? 0 : 160, easing: 'ease', fill: 'forwards' })
      .finished.then(() => onMore(), () => onMore());
  }

  function open(velocity = -300) {
    // The card keeps rising a little as Spotify takes over, then settles back for when you return.
    glide({ y: { to: -Math.min(140, pager.clientHeight * 0.18), velocity: Math.min(velocity, -300), response: 0.36 } }, () => {
      setTimeout(() => { if (!drag) glide({ y: { to: 0, response: 0.45, damping: 0.82 } }); }, 260);
    });
    onOpen(index);
  }

  /* ---------- The finger ---------- */

  pager.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag || !cards().length) return;
    // Grab the deck where it is, mid-glide included: the glide stops under the finger.
    stop();
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: pos.x, axis: null, dx: 0, dy: 0, trail: [] };
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
        pos.x = max + rubber(raw - max, width);
        reveal('back', (raw - max) / sideReach());
      } else if (raw < min) {
        pos.x = min - rubber(min - raw, width);
        reveal(canMore() ? 'more' : null, (min - raw) / sideReach());
      } else {
        pos.x = raw;
        reveal(null, 0);
      }
    } else {
      // Only up does something; down just resists.
      const height = pager.clientHeight;
      pos.y = dy < 0 ? -rubber(-dy, height) : rubber(dy, height) * 0.3;
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
      glide({ y: { to: 0, velocity: vy * 1000, response: 0.42, damping: 0.82 } });
    } else {
      go(index); // a tap mid-glide: finish the glide
    }
  });

  pager.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    hide();
    go(index);
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
    if (running || drag) return;
    pos.x = xOf(index);
    draw();
  }).observe(pager);

  return {
    /**
     * A new set of cards. After a search it simply starts at the first card; after "five others"
     * the set glides in from the right at the speed of the pull that asked for it.
     */
    reset({ arriving = false } = {}) {
      stop();
      index = 0;
      pos.y = 0;
      track.getAnimations().forEach((a) => a.cancel());
      if (arriving && !reducedMotion.matches) {
        pos.x = pager.clientWidth * 0.55;
        draw();
        glide({ x: { to: 0, velocity: fling, response: 0.6 } }, () => onSettle?.(0));
        track.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      } else {
        pos.x = 0;
        draw();
      }
      onIndex(0);
      if (!arriving || reducedMotion.matches) onSettle?.(0);
    },
    more: () => more(),
    get index() { return index; },
  };
}
