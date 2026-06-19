import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* =========================================================
   1. WEBGL — the sealed core
   A glowing particle core (your data) contained inside
   nested wireframe shells (the bunker). Reacts to cursor,
   never escapes the shell.
   ========================================================= */
let renderer, scene, cam, group, core, coreGeo;
const mouse = { x: 0, y: 0 };
const tmouse = { x: 0, y: 0 };

function initScene() {
  const canvas = document.querySelector('#bg');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  cam.position.z = 7;

  group = new THREE.Group();
  scene.add(group);

  // --- particle core (the data) ---
  const N = innerWidth < 700 ? 1600 : 3200;
  const pos = new Float32Array(N * 3);
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // even-ish distribution inside a sphere of radius ~1.7
    const u = Math.random(), v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 1.7 * Math.cbrt(Math.random());
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    rnd[i] = Math.random();
  }
  coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const coreMat = new THREE.PointsMaterial({
    size: 0.045, color: 0xf2b65a, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  core = new THREE.Points(coreGeo, coreMat);
  group.add(core);

  // --- nested shells (the bunker) ---
  const shellDefs = [
    { r: 2.5, detail: 1, color: 0x4a4a55, opacity: 0.42 },
    { r: 3.1, detail: 1, color: 0x2f2f38, opacity: 0.26 },
    { r: 3.7, detail: 0, color: 0x262630, opacity: 0.16 }
  ];
  group.userData.shells = [];
  shellDefs.forEach(s => {
    const geo = new THREE.IcosahedronGeometry(s.r, s.detail);
    const wire = new THREE.WireframeGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: s.opacity });
    const shell = new THREE.LineSegments(wire, mat);
    group.add(shell);
    group.userData.shells.push(shell);
  });

  // faint accent vertices on the inner shell
  const dotGeo = new THREE.IcosahedronGeometry(2.5, 1);
  const dotMat = new THREE.PointsMaterial({ size: 0.07, color: 0xe9a23b, transparent: true, opacity: 0.7, depthWrite: false });
  group.add(new THREE.Points(dotGeo, dotMat));

  addEventListener('pointermove', e => {
    tmouse.x = (e.clientX / innerWidth - 0.5);
    tmouse.y = (e.clientY / innerHeight - 0.5);
  });
  addEventListener('resize', onResize);

  renderer.setAnimationLoop(render);
}

function render(t) {
  t *= 0.001;
  mouse.x += (tmouse.x - mouse.x) * 0.05;
  mouse.y += (tmouse.y - mouse.y) * 0.05;

  if (group) {
    group.rotation.y = t * 0.08 + mouse.x * 0.6;
    group.rotation.x = Math.sin(t * 0.15) * 0.12 + mouse.y * 0.4;
    // breathing core
    const pulse = 1 + Math.sin(t * 0.8) * 0.04;
    core.scale.setScalar(pulse);
    // shells drift at different rates for depth
    const shells = group.userData.shells;
    shells[0].rotation.z = t * 0.05;
    shells[1].rotation.z = -t * 0.035;
    shells[2].rotation.y = t * 0.02;
  }
  cam.position.x += (mouse.x * 1.2 - cam.position.x) * 0.04;
  cam.position.y += (-mouse.y * 1.0 - cam.position.y) * 0.04;
  cam.lookAt(0, 0, 0);
  renderer.render(scene, cam);
}

function onResize() {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

/* =========================================================
   2. LENIS smooth scroll + GSAP ticker sync
   ========================================================= */
function initScroll() {
  if (reduced) return;
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // anchor links through lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: 0, duration: 1.4 }); }
    });
  });
}

/* =========================================================
   3. PRELOADER
   ========================================================= */
function initPreloader() {
  const pre = document.querySelector('#preloader');
  const count = pre.querySelector('.count');
  if (reduced) { pre.remove(); revealHero(); buildScrollAnims(); return; }
  const n = { v: 0 };
  gsap.to(n, {
    v: 100, duration: 1.8, ease: 'power2.inOut',
    onUpdate: () => count.textContent = Math.round(n.v),
    onComplete: () => gsap.to(pre, {
      yPercent: -100, duration: 0.95, ease: 'expo.inOut',
      onComplete: () => { pre.remove(); revealHero(); buildScrollAnims(); ScrollTrigger.refresh(); }
    })
  });
}

/* =========================================================
   4. HERO reveal
   ========================================================= */
function revealHero() {
  const split = new SplitType('.hero-title', { types: 'lines,chars' });
  gsap.set('.hero-title', { opacity: 1 });
  const tl = gsap.timeline();
  tl.from(split.chars, {
      yPercent: 120, opacity: 0, rotateX: -50, stagger: 0.018,
      duration: 1, ease: 'expo.out'
    })
    .from('.eyebrow', { opacity: 0, y: 20, duration: .8, ease: 'power2.out' }, 0.2)
    .from('.hero-sub', { opacity: 0, y: 24, duration: .9, ease: 'power3.out' }, '-=0.5')
    .from('.hero-actions .btn', { opacity: 0, y: 24, stagger: .1, duration: .8, ease: 'power3.out' }, '-=0.6')
    .from('.hero-meta', { opacity: 0, duration: .8 }, '-=0.5')
    .from('.scroll-hint', { opacity: 0, duration: .8 }, '-=0.4')
    .from('.nav', { opacity: 0, y: -20, duration: .8, ease: 'power2.out' }, '-=0.9');
}

/* =========================================================
   5. SCROLL-DRIVEN animations
   ========================================================= */
function buildScrollAnims() {
  // generic reveals
  gsap.utils.toArray('.reveal').forEach(el => {
    if (el.classList.contains('hero-title') || el.closest('.hero')) return;
    gsap.from(el, {
      yPercent: 18, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // statement: word-by-word reveal, pinned + scrubbed
  const stEl = document.querySelector('.statement-text');
  const stSplit = new SplitType(stEl, { types: 'words' });
  gsap.set(stEl, { opacity: 1 });
  gsap.from(stSplit.words, {
    opacity: 0.12, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top 70%', end: 'bottom 65%', scrub: 1 }
  });

  // staggered children in grids
  gsap.from('.steps .step', {
    y: 40, opacity: 0, stagger: .12, duration: .9, ease: 'power3.out',
    scrollTrigger: { trigger: '.steps', start: 'top 80%' }
  });
  gsap.from('.feature-grid .feature', {
    y: 30, opacity: 0, stagger: .07, duration: .7, ease: 'power2.out',
    scrollTrigger: { trigger: '.feature-grid', start: 'top 82%' }
  });
  gsap.from('.verticals li', {
    x: -30, opacity: 0, stagger: .08, duration: .7, ease: 'power2.out',
    scrollTrigger: { trigger: '.verticals', start: 'top 82%' }
  });

  // subtle parallax on section heads
  gsap.utils.toArray('.section-head').forEach(h => {
    gsap.to(h, { yPercent: -12, ease: 'none',
      scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // architecture diagram: nodes fade in, flow lines draw themselves
  const arch = document.querySelector('.arch');
  if (arch) {
    gsap.from(arch.querySelector('.dg-perimeter'), {
      opacity: 0, scale: 0.96, transformOrigin: '50% 50%', duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: arch, start: 'top 80%' }
    });
    gsap.from(arch.querySelectorAll('.dg-box-g,.dg-engine-g,.dg-cloud-g'), {
      opacity: 0, y: 18, stagger: 0.12, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: arch, start: 'top 74%' }
    });
    arch.querySelectorAll('.dg-flow').forEach(f => {
      const len = f.getTotalLength();
      gsap.set(f, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(f, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut',
        scrollTrigger: { trigger: arch, start: 'top 68%' } });
    });
    gsap.from('.dg-blocked', { opacity: 0, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: arch, start: 'top 64%' } });
    gsap.from('.dg-barrier', { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.6,
      ease: 'back.out(2.5)', scrollTrigger: { trigger: arch, start: 'top 58%' } });
  }

  // tie the 3D core a touch to scroll velocity (extra rotation)
  ScrollTrigger.create({
    trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: 1.5,
    onUpdate: self => { if (group) group.rotation.y += self.getVelocity() * 0.00002; }
  });
}

/* =========================================================
   6. CUSTOM CURSOR + MAGNETIC
   ========================================================= */
function initCursor() {
  if (matchMedia('(hover:none)').matches) return;
  const cur = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor-dot');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; gsap.set(dot, { x: mx, y: my }); });
  gsap.ticker.add(() => { cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16; gsap.set(cur, { x: cx, y: cy }); });

  document.querySelectorAll('a,button,.magnetic').forEach(el => {
    el.addEventListener('pointerenter', () => gsap.to(cur, { scale: 2.2, duration: .3 }));
    el.addEventListener('pointerleave', () => gsap.to(cur, { scale: 1, duration: .3 }));
  });
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.4, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: .4 });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.3)' }));
  });
}

/* =========================================================
   boot
   ========================================================= */
initScene();
initScroll();
initCursor();
initPreloader();
