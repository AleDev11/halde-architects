import * as THREE from 'three';
import { animate, onScroll, stagger } from 'animejs';
import { DEFAULT_DATE, SUN_DATES, dayRange, formatHour, hourTicks, sunPosition, type SunDate } from './solar';

/**
 * Sun study: a white maquette on a board, lit by the real sun over Copenhagen.
 * Scrolling moves the clock from sunrise to sunset; the date control changes
 * which day of the year the sun is following.
 */

const MODEL = 0xf7f5f1;
const INK = 0x151515;

// Volumes: [width, height, depth, x, z]
const VOLUMES: [number, number, number, number, number][] = [
  [8, 3.2, 5.2, -4.6, -2.4],
  [4.6, 7.2, 4.6, 1.8, -3.6],
  [11, 2.4, 3.6, 2.2, 2.6],
  [4, 4.6, 4, -6.4, 3.8],
  [0.35, 1.8, 9.5, 9.4, -0.6],
  [2.4, 1.2, 2.4, 6.2, -5.2],
];

// Roof plates and slabs that float on columns
const SLABS: [number, number, number, number, number, number][] = [
  // w, thickness, d, x, y, z
  [9.6, 0.3, 6.6, -4.2, 3.2, -2.1],
];

const TREES: [number, number, number][] = [
  [-10.5, -6.5, 1.1],
  [-9.2, 8.2, 0.9],
  [10.8, 6.4, 1.2],
  [12.4, -6.8, 0.8],
  [-1.4, 7.9, 0.75],
  [6.6, -8.5, 1],
];

/** Highest sun of the year over Copenhagen, the reference for warmth and intensity. */
const PEAK_ELEVATION = 57.8;
/** Below this the directional light would graze the board and lose its shadows. */
const MIN_ELEVATION = 2;

export function initSunStudy(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  root.classList.add('has-gl');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();

  // ── Camera: axonometric, like a presentation drawing
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const target = new THREE.Vector3(0, 1.4, 0);
  const orbit = { angle: -0.62, tilt: 0.62, radius: 90, zoom: 1 };

  // ── Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe2ddd3, 2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  const shadowMap = root.clientWidth < 760 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowMap, shadowMap);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);

  // ── Table (shadow catcher, invisible except for shadows)
  const table = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: INK, opacity: 0.12 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.6;
  table.receiveShadow = true;
  scene.add(table);

  const modelMat = new THREE.MeshStandardMaterial({ color: MODEL, roughness: 0.92, metalness: 0 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xeeebe4, roughness: 1 });
  const treeMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 1 });
  const edgeMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.38 });

  const withEdges = (mesh: THREE.Mesh, opacity?: number) => {
    const mat = opacity ? edgeMat.clone() : edgeMat;
    if (opacity) mat.opacity = opacity;
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), mat);
    mesh.add(lines);
    return mesh;
  };

  // ── Board
  const board = withEdges(new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 22).translate(0, -0.3, 0), boardMat), 0.22);
  board.receiveShadow = true;
  board.castShadow = true;
  const boardGroup = new THREE.Group();
  boardGroup.add(board);
  scene.add(boardGroup);

  // ── Building volumes (grow from the board during the intro)
  const pieces: THREE.Object3D[] = [];
  const model = new THREE.Group();
  scene.add(model);

  VOLUMES.forEach(([w, h, d, x, z]) => {
    const m = withEdges(new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), modelMat));
    m.position.set(x, 0, z);
    m.castShadow = m.receiveShadow = true;
    model.add(m);
    pieces.push(m);
  });

  // columns under the floating slab
  const colGeo = new THREE.BoxGeometry(0.22, 3.2, 0.22).translate(0, 1.6, 0);
  [
    [-8.8, 0.9],
    [-8.8, -5.2],
    [0.4, 0.9],
  ].forEach(([x, z]) => {
    const c = withEdges(new THREE.Mesh(colGeo, modelMat));
    c.position.set(x, 0, z);
    c.castShadow = true;
    model.add(c);
    pieces.push(c);
  });

  SLABS.forEach(([w, t, d, x, y, z]) => {
    const s = withEdges(new THREE.Mesh(new THREE.BoxGeometry(w, t, d).translate(0, t / 2, 0), modelMat));
    s.position.set(x, y, z);
    s.castShadow = s.receiveShadow = true;
    model.add(s);
    pieces.push(s);
  });

  // window slots on the tower: thin dark recesses read as glazing
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x6d6862, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.05), slotMat);
    slot.position.set(0, 2.2 + i * 1.7, 2.31);
    pieces[1].add(slot);
  }
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.7, 0.05), slotMat);
  ribbon.position.set(0, 1.25, 1.81);
  pieces[2].add(ribbon);

  // balsa trees
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6).translate(0, 0.8, 0);
  TREES.forEach(([x, z, r]) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, treeMat);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), treeMat);
    crown.position.y = 1.6 + r * 0.7;
    trunk.castShadow = crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    model.add(tree);
    pieces.push(tree);
  });

  // ── Sizing
  const frame = { w: 1, h: 1 };
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = root;
    frame.w = w;
    frame.h = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const wide = aspect > 1.2 && w >= 760;
    // vertical world-units in view: keeps the board readable from phone to ultrawide
    const span = Math.max(41, 40 / aspect);
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    // wide screens: push the model right so the headline has room; tall screens: lift it
    if (wide) camera.setViewOffset(w, h, -w * 0.19, h * 0.07, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.14, w, h);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(root);
  resize();

  // ── State driven by scroll
  const state = { p: reduced ? 0.69 : 0, day: DEFAULT_DATE.day, offset: DEFAULT_DATE.utcOffset };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  const ui = {
    time: root.querySelector<HTMLElement>('[data-sun-time]'),
    az: root.querySelector<HTMLElement>('[data-sun-az]'),
    el: root.querySelector<HTMLElement>('[data-sun-el]'),
    north: root.querySelector<HTMLElement>('[data-north]'),
    phases: [...root.querySelectorAll<HTMLElement>('[data-phase]')],
    ticks: root.querySelector<HTMLElement>('[data-sun-ticks]'),
    caption: root.querySelector<HTMLElement>('[data-sun-caption]'),
    dates: [...root.querySelectorAll<HTMLInputElement>('input[name="sun-date"]')],
  };

  const warm = new THREE.Color(0xffa877);
  const noon = new THREE.Color(0xfff7ec);
  const sunColor = new THREE.Color();
  let lastPhase = -1;

  const update = () => {
    const { start, end } = dayRange(state.day, state.offset);
    const hour = start + state.p * (end - start);
    const position = sunPosition(state.day, hour, state.offset);
    const { azimuth } = position;
    const elevation = Math.max(position.elevation, MIN_ELEVATION);
    const el = THREE.MathUtils.degToRad(elevation);
    const az = THREE.MathUtils.degToRad(azimuth);
    const dist = 60;
    // north = -z, east = +x
    sun.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -Math.cos(az) * Math.cos(el) * dist);
    const k = THREE.MathUtils.clamp(elevation / PEAK_ELEVATION, 0, 1);
    sunColor.copy(warm).lerp(noon, Math.pow(k, 0.6));
    sun.color.copy(sunColor);
    sun.intensity = 2.2 + k * 1.3;
    hemi.intensity = 1.7 + k * 0.5;
    (table.material as THREE.ShadowMaterial).opacity = 0.08 + (1 - k) * 0.08;

    // camera: slow orbit tied to the day + pointer parallax
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    const p = state.p;
    const a = orbit.angle + p * 0.5 + pointer.sx * 0.06;
    const t = orbit.tilt + pointer.sy * 0.04;
    camera.position.set(
      target.x + Math.sin(a) * Math.cos(t) * orbit.radius,
      target.y + Math.sin(t) * orbit.radius,
      target.z + Math.cos(a) * Math.cos(t) * orbit.radius,
    );
    camera.zoom = orbit.zoom;
    camera.updateProjectionMatrix();
    camera.lookAt(target);

    // overlay readouts
    if (ui.time) ui.time.textContent = formatHour(hour);
    if (ui.az) ui.az.textContent = `${azimuth.toFixed(1)}°`;
    if (ui.el) ui.el.textContent = `${elevation.toFixed(1)}°`;
    if (ui.north) ui.north.style.transform = `rotate(${THREE.MathUtils.radToDeg(a) + 180}deg)`;
    root.style.setProperty('--day', p.toFixed(4));
    root.style.setProperty('--warmth', (1 - k).toFixed(3));
    // sun glow drifts across the screen through the day
    root.style.setProperty('--sun-x', `${94 - p * 86}%`);

    const phase = p < 0.33 ? 0 : p < 0.7 ? 1 : 2;
    if (phase !== lastPhase) {
      ui.phases.forEach((ph, i) => ph.classList.toggle('is-active', i === phase));
      lastPhase = phase;
    }
  };

  // ── Date control
  const renderTicks = (date: SunDate) => {
    if (!ui.ticks) return;
    const { start, end } = dayRange(date.day, date.utcOffset);
    ui.ticks.replaceChildren(
      ...hourTicks(start, end).map(({ hour, at }) => {
        const tick = document.createElement('span');
        const major = hour % 2 === 0;
        tick.className = major ? 'sun__tick mono major' : 'sun__tick mono';
        tick.style.setProperty('--i', String(at));
        if (major) tick.append(Object.assign(document.createElement('b'), { textContent: String(hour).padStart(2, '0') }));
        return tick;
      }),
    );
  };

  ui.dates.forEach((input) =>
    input.addEventListener('change', () => {
      const date = SUN_DATES.find((d) => d.id === input.value);
      if (!date) return;
      if (ui.caption) ui.caption.textContent = date.long;
      renderTicks(date);
      animate(state, { day: date.day, offset: date.utcOffset, duration: reduced ? 0 : 1200, ease: 'inOut(3)' });
    }),
  );

  // ── Render loop, paused when off-screen
  let visible = true;
  let raf = 0;
  const loop = () => {
    update();
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }).observe(root);
  loop();

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  if (reduced) {
    root.classList.add('is-ready');
    return;
  }

  // ── Intro: the board settles, then each piece rises out of it
  pieces.forEach((p) => p.scale.set(1, 0.001, 1));
  boardGroup.scale.set(0.82, 1, 0.82);
  orbit.zoom = 0.86;

  animate(boardGroup.scale, { x: 1, z: 1, duration: 1600, ease: 'out(4)' });
  animate(orbit, { zoom: 1, duration: 2600, ease: 'inOut(3)' });
  animate(
    pieces.map((p) => p.scale),
    {
      y: 1,
      duration: 1400,
      delay: stagger(70, { start: 350, from: 'random' }),
      ease: 'out(4)',
      onComplete: () => root.classList.add('is-ready'),
    },
  );

  // ── Scroll drives the clock from sunrise to sunset
  const section = root.closest<HTMLElement>('[data-sun-section]')!;
  animate(state, {
    p: [0, 1],
    ease: 'linear',
    autoplay: onScroll({ target: section, enter: 'top top', leave: 'bottom bottom', sync: 0.12 }),
  });
}
