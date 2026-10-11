import Lenis from 'lenis';
import { animate, onScroll, splitText, stagger } from 'animejs';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export let lenis: Lenis | null = null;

function smoothScroll() {
  if (reduced) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9 });
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      lenis?.scrollTo(target as HTMLElement, { duration: 1.6 });
    });
  });
}

/** Text that rises line by line from behind a mask. */
function revealLines() {
  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    const split = splitText(el, { lines: { class: 'split-line', wrap: 'clip' } });
    const delay = Number(el.dataset.delay ?? 0);
    el.style.visibility = 'visible';
    split.addEffect(({ lines }) =>
      animate(lines, {
        y: ['105%', '0%'],
        duration: 1300,
        delay: stagger(90, { start: delay }),
        ease: 'out(4)',
        autoplay: el.hasAttribute('data-instant') ? true : onScroll({ target: el, enter: 'bottom-=8% top' }),
      }),
    );
  });
}

/** Image curtains: the frame opens upward while the photo settles. */
function revealImages() {
  document.querySelectorAll<HTMLElement>('[data-reveal="image"]').forEach((el) => {
    const img = el.querySelector('img');
    const trigger = onScroll({ target: el, enter: 'bottom-=6% top' });
    animate(el, { clipPath: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'], duration: 1500, ease: 'inOut(4)', autoplay: trigger });
    if (img)
      animate(img, {
        scale: [1.18, 1],
        duration: 2200,
        ease: 'out(3)',
        autoplay: onScroll({ target: el, enter: 'bottom-=6% top' }),
        // hand the transform back to CSS so hover states keep working
        onComplete: () => {
          el.classList.add('is-revealed');
          img.style.removeProperty('transform');
        },
      });
  });
}

function revealFades() {
  document.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
    animate(el, {
      opacity: [0, 1],
      y: ['1.5rem', '0rem'],
      duration: 1100,
      delay: Number(el.dataset.delay ?? 0),
      ease: 'out(3)',
      autoplay: onScroll({ target: el, enter: 'bottom-=5% top' }),
    });
  });
  document.querySelectorAll<HTMLElement>('[data-reveal="rule"]').forEach((el) => {
    animate(el, { scaleX: [0, 1], duration: 1600, ease: 'inOut(3)', autoplay: onScroll({ target: el, enter: 'bottom-=5% top' }) });
  });
}

/** Numbers that count up once in view. */
function counters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const pad = el.dataset.pad ? Number(el.dataset.pad) : 0;
    const state = { v: 0 };
    const render = () => (el.textContent = String(Math.round(state.v)).padStart(pad, '0'));
    render();
    animate(state, {
      v: end,
      duration: 2200,
      ease: 'out(4)',
      onUpdate: render,
      autoplay: onScroll({ target: el, enter: 'bottom-=10% top' }),
    });
  });
}

/** Gentle scroll-synced drift for images inside overflow frames. */
function parallax() {
  if (window.matchMedia('(max-width: 760px)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax || 8);
    animate(el, {
      y: [`-${amount}%`, `${amount}%`],
      ease: 'linear',
      autoplay: onScroll({ target: el.parentElement!, enter: 'bottom top', leave: 'top bottom', sync: 0.25 }),
    });
  });
}

/** Header hides on the way down, returns on the way up. */
function header() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;
  let last = window.scrollY;
  const update = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (Math.abs(y - last) > 6) {
      nav.classList.toggle('is-hidden', y > last && y > 240);
      last = y;
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/** Live Copenhagen time for any [data-cph-time]. */
function clocks() {
  const els = document.querySelectorAll<HTMLElement>('[data-cph-time]');
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tick = () => els.forEach((el) => (el.textContent = fmt.format(new Date())));
  tick();
  setInterval(tick, 1000);
}

/** Small cursor that grows into a label over [data-cursor] elements. */
function cursor() {
  if (!window.matchMedia('(pointer: fine)').matches || reduced) return;
  const el = document.querySelector<HTMLElement>('[data-cursor-el]');
  if (!el) return;
  const label = el.querySelector('span')!;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    el.classList.add('is-on');
  });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.querySelectorAll<HTMLElement>('[data-cursor]').forEach((t) => {
    t.addEventListener('pointerenter', () => {
      label.textContent = t.dataset.cursor || 'View';
      el.classList.add('is-big');
    });
    t.addEventListener('pointerleave', () => el.classList.remove('is-big'));
  });
}

/** Press "G" to reveal the 12-column grid the site is drawn on. */
function blueprint() {
  const bp = document.querySelector('.blueprint');
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey) return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    bp?.classList.toggle('on');
  });
}

export function initMotion() {
  header();
  clocks();
  blueprint();
  if (reduced) return;
  smoothScroll();
  revealLines();
  revealImages();
  revealFades();
  counters();
  parallax();
  cursor();
}
