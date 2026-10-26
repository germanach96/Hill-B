// A picker wheel on native snap scrolling: the phone's own momentum and rubber band, one value per
// row, and the row in the centre is the value. Vertical for time and distance, horizontal for pace.


export function createWheel(el, { axis = 'y', label, onChange }) {
  const vertical = axis === 'y';
  let values = [];
  let format = String;
  let index = 0;
  let frame = 0;
  let touching = false;
  let target = null; // a row set by code: it wins over the scroll positions passed on the way there

  el.classList.add(vertical ? 'wheel-y' : 'wheel-x');
  el.setAttribute('aria-label', label);

  // The exact row size from CSS: rows can be fractional (12.5svh), so offsetHeight's rounding drifts
  // row by row, and getBoundingClientRect would include the scale on the rows around the value.
  const size = () => {
    const first = el.firstElementChild;
    if (!first) return 1;
    const css = getComputedStyle(first);
    return parseFloat(vertical ? css.height : css.width) || 1;
  };
  const position = () => (vertical ? el.scrollTop : el.scrollLeft);
  const clampIndex = (i) => Math.min(values.length - 1, Math.max(0, i));

  function mark() {
    [...el.children].forEach((item, i) => item.classList.toggle('is-selected', i === index));
    el.setAttribute('aria-valuenow', String(index));
    el.setAttribute('aria-valuetext', format(values[index]));
  }

  function scrollTo(i, smooth) {
    el.scrollTo({ [vertical ? 'top' : 'left']: i * size(), behavior: smooth ? 'smooth' : 'instant' });
  }

  el.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (target != null) {
        if (Math.abs(position() - target * size()) < 1) target = null;
        return;
      }
      const i = clampIndex(Math.round(position() / size()));
      if (i === index) return;
      index = i;
      mark();
      // A tick under the thumb on each step, where the phone can (Android); never on programmatic moves.
      if (touching) navigator.vibrate?.(4);
      onChange(values[index]);
    });
  }, { passive: true });

  // A finger on the wheel takes over from any move made by code.
  const grab = () => { touching = true; target = null; };
  el.addEventListener('pointerdown', grab);
  el.addEventListener('touchstart', grab, { passive: true });
  const release = () => { touching = false; };
  el.addEventListener('pointerup', release);
  el.addEventListener('touchend', release);
  el.addEventListener('wheel', grab, { passive: true });
  el.addEventListener('scrollend', () => {
    release();
    // A glide replaced by a newer one also ends: only arriving clears the target.
    if (target != null && Math.abs(position() - target * size()) < 1) target = null;
  });

  el.addEventListener('keydown', (e) => {
    // Spinbutton keys: up and right raise the value (what VoiceOver's increment sends). On the
    // vertical wheel the next value is the row below, so it rolls up the way a swipe up does.
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
    const target = e.key === 'Home' ? 0 : e.key === 'End' ? values.length - 1 : step != null ? index + step : null;
    if (target == null) return;
    e.preventDefault();
    set(clampIndex(target), { smooth: true, notify: true });
  });

  // Snap positions change with the row size (rotation, text zoom): keep the value centred.
  new ResizeObserver(() => scrollTo(index, false)).observe(el);

  function setValues(next, { format: fmt = String, selected = 0 } = {}) {
    values = next;
    format = fmt;
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', String(values.length - 1));
    el.replaceChildren(...values.map((v) => {
      const item = document.createElement('div');
      item.className = 'wheel-item';
      item.textContent = fmt(v);
      return item;
    }));
    set(selected, { smooth: false });
  }

  function set(i, { smooth = false, notify = false } = {}) {
    const next = clampIndex(i);
    // Glide a step or two; a long jump (Home, End, a clamp) lands at once instead of reeling past.
    const glide = smooth && Math.abs(next - index) <= 3;
    index = next;
    target = index;
    mark();
    scrollTo(index, glide);
    if (notify) onChange(values[index]);
  }

  return {
    setValues,
    set,
    /** Re-centre after the wheel was hidden: display:none drops scroll positions. */
    refresh: () => scrollTo(index, false),
    get value() { return values[index]; },
  };
}
