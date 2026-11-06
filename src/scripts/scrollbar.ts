import { lenis } from './motion';

const MIN_THUMB = 56;
const IDLE_AFTER = 1200;

/**
 * A scrollbar drawn like the scale on a plan: a thin bar over a ruler with a
 * tick at each section. It replaces the native bar for mouse users only, and
 * keyboard and wheel scrolling stay native, so it can stay out of the
 * accessibility tree.
 */
export function initScrollbar() {
  const root = document.documentElement;
  const rail = document.querySelector<HTMLElement>('[data-scrollbar]');
  const thumb = rail?.querySelector<HTMLElement>('[data-scrollbar-thumb]');
  const ticks = rail?.querySelector<HTMLElement>('[data-scrollbar-ticks]');
  if (!rail || !thumb || !ticks || !root.classList.contains('has-scrollbar')) return;

  let page = 0;
  let view = 0;
  let track = 0;
  let thumbSize = 0;
  let idle = 0;

  const maxScroll = () => Math.max(page - view, 0);

  const paint = () => {
    const max = maxScroll();
    const y = max > 0 ? (window.scrollY / max) * (track - thumbSize) : 0;
    thumb.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  };

  const measure = () => {
    page = root.scrollHeight;
    view = window.innerHeight;
    track = rail.clientHeight;
    thumbSize = Math.max(MIN_THUMB, track * (view / Math.max(page, 1)));
    thumb.style.height = `${thumbSize}px`;
    rail.hidden = maxScroll() === 0;
    ticks.replaceChildren(
      ...[...document.querySelectorAll('main > section, footer')].map((section) => {
        const tick = document.createElement('i');
        const top = section.getBoundingClientRect().top + window.scrollY;
        tick.style.top = `${(top / Math.max(page, 1)) * 100}%`;
        return tick;
      }),
    );
    paint();
  };

  const wake = () => {
    rail.classList.add('is-active');
    window.clearTimeout(idle);
    idle = window.setTimeout(() => rail.classList.remove('is-active'), IDLE_AFTER);
  };

  const scrollToThumb = (pointerY: number, grab: number) => {
    const span = track - thumbSize;
    if (span <= 0) return;
    const ratio = Math.min(Math.max((pointerY - rail.getBoundingClientRect().top - grab) / span, 0), 1);
    const target = ratio * maxScroll();
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo(0, target);
  };

  let grab: number | null = null;

  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const box = thumb.getBoundingClientRect();
    const onThumb = e.clientY >= box.top && e.clientY <= box.bottom;
    grab = onThumb ? e.clientY - box.top : thumbSize / 2;
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('is-dragging');
    if (!onThumb) scrollToThumb(e.clientY, grab);
  });
  rail.addEventListener('pointermove', (e) => {
    if (grab !== null) scrollToThumb(e.clientY, grab);
  });
  const release = () => {
    grab = null;
    rail.classList.remove('is-dragging');
  };
  rail.addEventListener('pointerup', release);
  rail.addEventListener('pointercancel', release);

  window.addEventListener(
    'scroll',
    () => {
      paint();
      wake();
    },
    { passive: true },
  );
  new ResizeObserver(measure).observe(document.body);
  measure();
}
