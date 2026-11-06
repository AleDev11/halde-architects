import { DEFAULT_DATE, dayRange, formatHour, sunPosition } from './solar';

/**
 * Everything the hero shows that does not need WebGL. It stays out of the
 * Three.js chunk so the readouts are right from the first frame, including on
 * a reload halfway through the hero.
 */

export type SunState = { p: number; day: number; offset: number };

/** Highest sun of the year over Copenhagen, the reference for warmth and intensity. */
const PEAK_ELEVATION = 57.8;
/** Below this the directional light would graze the board and lose its shadows. */
const MIN_ELEVATION = 2;
/** Where the axonometric camera starts, and how far it turns over the day. */
const CAMERA_ANGLE = -0.62;
const CAMERA_TRAVEL = 0.5;
/** Fixed progress for visitors who prefer reduced motion. */
const REDUCED_PROGRESS = 0.69;

export function initialState(section: HTMLElement, reduced: boolean): SunState {
  return {
    p: reduced ? REDUCED_PROGRESS : scrollProgress(section),
    day: DEFAULT_DATE.day,
    offset: DEFAULT_DATE.utcOffset,
  };
}

/** How far the pinned hero has been scrolled, from 0 to 1. */
export function scrollProgress(section: HTMLElement) {
  const travel = section.offsetHeight - window.innerHeight;
  if (travel <= 0) return 0;
  return Math.min(Math.max(-section.getBoundingClientRect().top / travel, 0), 1);
}

export function cameraAngle(p: number) {
  return CAMERA_ANGLE + p * CAMERA_TRAVEL;
}

export function sunFrame({ p, day, offset }: SunState) {
  const { start, end } = dayRange(day, offset);
  const hour = start + p * (end - start);
  const position = sunPosition(day, hour, offset);
  const elevation = Math.max(position.elevation, MIN_ELEVATION);
  const warmth = Math.min(Math.max(elevation / PEAK_ELEVATION, 0), 1);
  return { hour, azimuth: position.azimuth, elevation, warmth };
}

export function createReadout(root: HTMLElement) {
  const time = root.querySelector<HTMLElement>('[data-sun-time]');
  const az = root.querySelector<HTMLElement>('[data-sun-az]');
  const el = root.querySelector<HTMLElement>('[data-sun-el]');
  const north = root.querySelector<HTMLElement>('[data-north]');
  const phases = [...root.querySelectorAll<HTMLElement>('[data-phase]')];
  let lastPhase = -1;

  return (state: SunState, angle = cameraAngle(state.p)) => {
    const { hour, azimuth, elevation, warmth } = sunFrame(state);
    if (time) time.textContent = formatHour(hour);
    if (az) az.textContent = `${azimuth.toFixed(1)}°`;
    if (el) el.textContent = `${elevation.toFixed(1)}°`;
    if (north) north.style.transform = `rotate(${(angle * 180) / Math.PI + 180}deg)`;
    root.style.setProperty('--day', state.p.toFixed(4));
    root.style.setProperty('--warmth', (1 - warmth).toFixed(3));
    // the glow drifts across the screen through the day
    root.style.setProperty('--sun-x', `${94 - state.p * 86}%`);

    const phase = state.p < 0.33 ? 0 : state.p < 0.7 ? 1 : 2;
    if (phase !== lastPhase) {
      phases.forEach((item, i) => item.classList.toggle('is-active', i === phase));
      lastPhase = phase;
    }
  };
}
