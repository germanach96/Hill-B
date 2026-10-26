// The opening: a runner's dot crosses the screen along a line that climbs the two hills of the
// Hill-B mark, filling the mark in behind it. At the finish the mark settles into the header beside
// its name, and the dot runs down to the START button and becomes it. About three seconds, all of it
// Web Animations on transform, opacity and clip-path, so it stays smooth while the app boots behind.
// A tap skips it; with reduced motion the yellow simply fades away.

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

// The route, in the mark's own units (viewBox 0 0 32 17.4): ground from off-screen left, up the
// small hill and the big one along the mark's top edge, down to the ground on the far side.
const ROUTE = 'M-14 17.4H0L5.4 9.7Q6.5 8.1 7.9 6.9Q9.2 5.8 10.7 5.1Q12.2 4.5 13.6 4.5Q14.8 4.5 15.4 4.9'
  + 'Q16.1 5.3 16.2 5.9Q16.4 6.6 16.2 7.4L16.3 7.4Q19.4 3.2 20.9 2.2Q22.4 1.2 24.1 0.6Q25.8 0 27.8 0'
  + 'Q30.5 0 31.4 1Q32.4 2 31.8 3.9L35.5 17.4H36.5';
const DOT = 0.72; // dot radius, mark units

// Timeline, ms.
const T = {
  ready: 220, // the dot appears at the start line
  run: 1650, // the run along the route
  gather: 400, // the mark steps back and its name arrives
  home: 480, // mark to the header; the yellow lifts; the screen arrives
  toStart: 430, // the dot runs down to START
  open: 360, // START grows out of the dot
};
const t1 = T.ready;
const t2 = t1 + T.run;
const t3 = t2 + T.gather;
const t4 = t3 + T.toStart;
const END = t4 + T.open;

const svgEl = (name, attrs) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/**
 * Plays the opening over the session screen, which must already be laid out underneath.
 * Resolves when the app is showing.
 */
export function playSplash({ brand, start, arriving = [] }) {
  const splash = document.getElementById('splash');
  if (!splash) return Promise.resolve();
  const ground = splash.querySelector('.splash-ground');
  const done = () => {
    brand.style.opacity = '';
    splash.remove();
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return ground.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease', fill: 'forwards' })
      .finished.then(done, done);
  }

  const vw = innerWidth;
  const vh = innerHeight;
  const H = brand.getBoundingClientRect();
  const M = brand.querySelector('.brand-mark').getBoundingClientRect();
  const markPath = document.querySelector('#i-mark path').getAttribute('d');

  // A replica of the header's wordmark, built large so it only ever scales down (always sharp).
  const S1 = Math.min(vw * 0.72, 320) / M.width; // the mark fills most of the width while it is drawn
  const S2 = Math.min(vw * 0.62, 300) / H.width; // mark and name together, before they go home
  const unit = (M.width * S1) / 32; // px per mark unit at the large size
  const big = document.createElement('span');
  big.className = 'brand splash-brand';
  big.style.fontSize = `${20 * S1}px`;
  const mark = svgEl('svg', { class: 'brand-mark', viewBox: '0 0 32 17.4', overflow: 'visible' });
  const route = svgEl('path', { d: ROUTE, class: 'splash-route', pathLength: '1' });
  const fill = svgEl('path', { d: markPath, fill: 'currentColor' });
  const cover = svgEl('rect', { x: '0', y: '-2', width: '40', height: '21', class: 'splash-cover' });
  mark.append(fill, cover, route);
  const word = document.createElement('span');
  word.className = 'splash-word';
  word.textContent = brand.textContent.trim();
  big.append(mark, word);
  splash.append(big);
  const dot = document.createElement('span');
  dot.className = 'splash-dot';
  dot.style.width = dot.style.height = `${DOT * 2 * unit}px`;
  splash.append(dot);
  brand.style.opacity = '0'; // the replica lands exactly on it, then hands over

  // Where the replica sits at each stage (transform-origin 0 0; k scales the large replica).
  const mx = (M.left - H.left) * S1;
  const my = (M.top - H.top) * S1;
  const cy = vh * 0.44;
  const stageRun = { x: vw / 2 - mx - (M.width * S1) / 2, y: cy - my - (M.height * S1) / 2, k: 1 };
  const stageName = { x: vw / 2 - (H.width * S2) / 2, y: cy - (H.height * S2) / 2, k: S2 / S1 };
  const stageHome = { x: H.left, y: H.top, k: 1 / S1 };
  const tf = (s) => `translate(${s.x}px, ${s.y}px) scale(${s.k})`;

  // Sample the route: the dot's screen positions and how far the fill has come, at even speed.
  const probe = svgEl('path', { d: ROUTE });
  mark.append(probe);
  const length = probe.getTotalLength();
  const samples = 48;
  const points = Array.from({ length: samples + 1 }, (_, i) => probe.getPointAtLength((length * i) / samples));
  probe.remove();
  const toScreen = (p) => ({
    x: stageRun.x + mx + p.x * unit - DOT * unit,
    y: stageRun.y + my + p.y * unit - DOT * unit,
  });

  // The first animation of a property holds its start until it plays (fill both); the ones that
  // follow it on the same property only hold their end (fill forwards), or they would override it.
  const S = (from, ms) => ({ delay: from, duration: ms, fill: 'both' });
  const F = (from, ms) => ({ delay: from, duration: ms, fill: 'forwards' });
  const anims = [];
  const play = (el, frames, opts) => anims.push(el.animate(frames, opts));

  // 1. The run.
  play(dot, [{ opacity: 0 }, { opacity: 1 }], { ...S(0, T.ready), easing: EASE_OUT });
  const end = toScreen(points[samples]);
  const target = start.getBoundingClientRect();
  const startCentre = { x: target.left + target.width / 2 - DOT * unit, y: target.top + target.height / 2 - DOT * unit };
  // A steady runner: even speed along the line, so the keyframes are linear between samples.
  play(dot, points.map((p) => ({ transform: `translate(${toScreen(p).x}px, ${toScreen(p).y}px)` })),
    { ...S(t1, T.run), easing: 'linear' });
  play(route, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { ...S(t1, T.run), easing: 'linear' });
  play(cover, points.map((p) => ({ transform: `translateX(${Math.max(0, p.x)}px)` })), { ...S(t1, T.run), easing: 'linear' });
  play(big, [{ transform: tf(stageRun) }, { transform: tf(stageRun) }], S(0, t2));

  // 2. The finish: the line fades, the mark steps back and its name comes in beside it.
  play(route, [{ opacity: 1 }, { opacity: 0 }], { ...F(t2, 260), easing: 'ease' });
  play(big, [{ transform: tf(stageRun) }, { transform: tf(stageName) }], { ...F(t2, T.gather), easing: EASE_IN_OUT });
  // The name arrives once the mark has nearly shrunk to size, so it never shows at the giant scale.
  play(word, [{ opacity: 0, transform: 'translateX(-0.25em)' }, { opacity: 1, transform: 'none' }],
    { ...S(t2 + T.gather * 0.55, T.gather * 0.6), easing: EASE_OUT });

  // 3. Home: the wordmark flies to the header, the yellow lifts off the screen behind it,
  //    the dot runs down to START and the button grows out of it.
  play(big, [{ transform: tf(stageName) }, { transform: tf(stageHome) }], { ...F(t3, T.home), easing: EASE_DRAWER });
  play(ground, [{ opacity: 1 }, { opacity: 0 }], { ...F(t3 + 40, 320), easing: 'ease' });
  play(dot, [{ transform: `translate(${end.x}px, ${end.y}px)` }, { transform: `translate(${startCentre.x}px, ${startCentre.y}px)` }],
    { ...F(t3, T.toStart), easing: EASE_IN_OUT });
  play(dot, [{ opacity: 1 }, { opacity: 0 }], { ...F(t4 + 40, 120), easing: 'ease' });
  arriving.forEach((el, i) => play(el, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
    { ...S(t3 + 160 + i * 70, 420), easing: EASE_OUT })); // after the wordmark has passed over them
  const ox = target.width / 2;
  const oy = target.height / 2;
  // Nothing of the button shows until the dot is on it; then it grows out from under the dot.
  play(start, [{ clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(${Math.hypot(ox, oy) + 2}px at ${ox}px ${oy}px)` }],
    { ...S(t4, T.open), easing: EASE_OUT });

  // A tap anywhere jumps to the end.
  const skip = () => anims.forEach((a) => a.finish());
  splash.addEventListener('pointerdown', skip, { once: true });

  return Promise.all(anims.map((a) => a.finished)).then(() => {
    for (const a of anims) a.cancel(); // the app's own styles take over, unchanged
    done();
  }, done);
}

export const SPLASH_MS = END;
