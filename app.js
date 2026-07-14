(function () {
  const THREE = window.THREE;
  const { RoomEnvironment } = window.MCV;
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

  // ---------- cena ----------
  const wrap = document.getElementById('canvas-wrap');
  const scene = new THREE.Scene();
  const BG = 0x1a2030;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 9, 22); // esconde a "emenda" do loop

  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  wrap.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2f45, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2); sun.position.set(6, 12, 4); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.7); rim.position.set(-5, 4, -6); scene.add(rim);

  // ---------- hélice ----------
  const STEPS_PER_TURN = 12;
  const DA = (Math.PI * 2) / STEPS_PER_TURN;
  const STEP_H = 0.62, R = 3.0, NSTEPS = 34, BEHIND = 9;
  function helix(u) { const a = u * DA; return new THREE.Vector3(Math.cos(a) * R, u * STEP_H, Math.sin(a) * R); }

  // ---------- degraus ----------
  const stepMatA = new THREE.MeshStandardMaterial({ color: 0x9aa1ad, roughness: 1 });
  const stepMatB = new THREE.MeshStandardMaterial({ color: 0x828a98, roughness: 1 });
  const stepGeo = new THREE.BoxGeometry(2.0, 0.32, 1.25);
  const steps = [];
  for (let i = 0; i < NSTEPS; i++) { const m = new THREE.Mesh(stepGeo, i % 2 ? stepMatA : stepMatB); scene.add(m); steps.push({ mesh: m, u: i - BEHIND }); }

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 44, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x4a5160, roughness: 1, side: THREE.DoubleSide }));
  scene.add(column);

  // ---------- gatinho (blocos), focinho no -Z ----------
  const cat = new THREE.Group();
  const ORANGE = new THREE.MeshStandardMaterial({ color: 0xe8963f, roughness: 0.85 });
  const ORANGE_D = new THREE.MeshStandardMaterial({ color: 0xcf7d2c, roughness: 0.85 });
  const WHITE = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.9 });
  const PINK = new THREE.MeshStandardMaterial({ color: 0xe98fa8, roughness: 0.9 });
  const DARK = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6 });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  const body = box(0.9, 0.85, 1.5, ORANGE); cat.add(body);
  const belly = box(0.6, 0.3, 1.2, WHITE); belly.position.set(0, -0.32, 0); cat.add(belly);
  for (let i = 0; i < 3; i++) { const s = box(0.92, 0.12, 0.16, ORANGE_D); s.position.set(0, 0.35, -0.3 + i * 0.4); cat.add(s); }
  const head = box(0.82, 0.78, 0.8, ORANGE); head.position.set(0, 0.35, -0.95); cat.add(head);
  const muzzle = box(0.5, 0.32, 0.22, WHITE); muzzle.position.set(0, 0.18, -1.34); cat.add(muzzle);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 4), ORANGE); ear.position.set(sx * 0.26, 0.82, -0.9); ear.rotation.y = Math.PI / 4; cat.add(ear);
    const einner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), PINK); einner.position.set(sx * 0.26, 0.8, -0.88); einner.rotation.y = Math.PI / 4; cat.add(einner);
    const eye = box(0.12, 0.16, 0.05, DARK); eye.position.set(sx * 0.2, 0.42, -1.37); cat.add(eye);
  }
  const nose = box(0.12, 0.1, 0.06, PINK); nose.position.set(0, 0.2, -1.46); cat.add(nose);
  function leg(x, z) { const g = new THREE.Group(); g.position.set(x, -0.35, z); const l = box(0.26, 0.7, 0.26, ORANGE); l.position.y = -0.35; g.add(l); const paw = box(0.28, 0.14, 0.3, WHITE); paw.position.set(0, -0.66, -0.02); g.add(paw); cat.add(g); return g; }
  const legFL = leg(-0.32, -0.48), legFR = leg(0.32, -0.48), legBL = leg(-0.32, 0.52), legBR = leg(0.32, 0.52);
  const tail = new THREE.Group(); tail.position.set(0, 0.15, 0.78);
  const t1 = box(0.2, 0.2, 0.5, ORANGE); t1.position.set(0, 0, 0.25); tail.add(t1);
  const t2 = box(0.17, 0.17, 0.45, ORANGE_D); t2.position.set(0, 0.15, 0.62); tail.add(t2);
  const t3 = box(0.14, 0.14, 0.3, WHITE); t3.position.set(0, 0.35, 0.85); tail.add(t3);
  cat.add(tail);
  cat.scale.setScalar(0.72);
  scene.add(cat);

  // ---------- estado ----------
  let uCat = 0;
  const SPEEDS = [1.6, 2.8, 4.6], SPEED_NAMES = ['devagar', 'normal', 'rápido'];
  let speedIdx = 1, playing = true, userAz = 0, userEl = 0, camMode = 0;
  const CAM_MODES = [{ back: 2.5, rad: 6.6, up: 2.7, look: 0.6 }, { back: Math.PI, rad: 5.4, up: 4.0, look: 0.2 }, { back: 1.15, rad: 7.0, up: 1.6, look: 0.7 }];

  function placeStep(s) {
    s.mesh.position.copy(helix(s.u));
    s.mesh.rotation.y = -s.u * DA;
    if (s.u - uCat > NSTEPS - BEHIND) s.u -= NSTEPS;
    else if (uCat - s.u > BEHIND) s.u += NSTEPS;
  }

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (playing) uCat += SPEEDS[speedIdx] * dt;
    if (uCat > NSTEPS) { uCat -= NSTEPS; steps.forEach(s => s.u -= NSTEPS); }

    const p = helix(uCat);
    const behind = helix(uCat - 0.9); // +Z do objeto encara "trás" -> focinho (-Z) sobe
    const bob = Math.abs(Math.sin(uCat * Math.PI)) * 0.09;
    cat.position.set(p.x, p.y + 0.42 + bob, p.z);
    cat.lookAt(behind.x, behind.y + 0.42, behind.z);

    const ph = uCat * Math.PI;
    const sw = Math.sin(ph) * 0.6, sw2 = Math.sin(ph + Math.PI) * 0.6;
    legFL.rotation.x = sw; legBR.rotation.x = sw; legFR.rotation.x = sw2; legBL.rotation.x = sw2;
    tail.rotation.y = Math.sin(uCat * 2.2) * 0.5;
    tail.rotation.x = -0.5 + Math.sin(uCat * 1.7) * 0.15;

    steps.forEach(placeStep);
    column.position.y = p.y;

    const cm = CAM_MODES[camMode];
    const a = uCat * DA + cm.back + userAz;
    camera.position.set(Math.cos(a) * cm.rad, p.y + cm.up + userEl, Math.sin(a) * cm.rad);
    camera.lookAt(p.x, p.y + cm.look, p.z);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // ---------- controles ----------
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const playBtn = document.getElementById('play-btn');
  playBtn.addEventListener('click', () => { playing = !playing; playBtn.classList.toggle('active', playing); playBtn.querySelector('svg').innerHTML = playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>'; });
  document.getElementById('speed-btn').addEventListener('click', () => { speedIdx = (speedIdx + 1) % SPEEDS.length; document.getElementById('spd').textContent = 'Velocidade: ' + SPEED_NAMES[speedIdx]; });
  document.getElementById('cam-btn').addEventListener('click', () => { camMode = (camMode + 1) % CAM_MODES.length; userAz = 0; userEl = 0; });

  let dragging = false, dpx = 0, dpy = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { dragging = true; dpx = e.clientX; dpy = e.clientY; });
  addEventListener('pointerup', () => dragging = false);
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    userAz += (e.clientX - dpx) * 0.006; userEl += (e.clientY - dpy) * 0.03;
    userEl = Math.max(-2.5, Math.min(6, userEl)); dpx = e.clientX; dpy = e.clientY;
  });

  window.__gato = { setU: (u) => { uCat = u; } };
})();
