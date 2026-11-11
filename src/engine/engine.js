/* Pare-Brise — moteur 3D (Three.js + bloom)
   Trois mondes : salle (salle de code), route (cours, examen, réflexe), studio (décodeur). */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const E = { ok: false };
window.Engine = E;

let renderer, composer, renderPass, bloom, camera, canvas;
let W = 1, H = 1, last = 0;
let region = { top: 0, height: 1 };
let worldName = null;
const worlds = {};
let signFactory = () => '';
const texCache = new Map();
const listeners = {};
const frameHooks = new Set();
const tweens = new Set();
let slowFrames = 0, frameCount = 0, bloomOn = true;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  back: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  lin: t => t
};
function tween(ms, fn, ez = ease.io) {
  return new Promise(res => tweens.add({ t0: performance.now(), ms: Math.max(1, ms), fn, ez, res }));
}
function runTweens(now) {
  for (const t of [...tweens]) {
    const k = Math.max(0, Math.min(1, (now - t.t0) / t.ms));
    t.fn(t.ez(k), k);
    if (k >= 1) { tweens.delete(t); t.res(); }
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function emit(n, d) { (listeners[n] || []).forEach(f => { try { f(d); } catch (e) {} }); }
E.on = (n, f) => { (listeners[n] = listeners[n] || []).push(f); };
E.onFrame = f => { frameHooks.add(f); return () => frameHooks.delete(f); };
E.setSignFactory = f => { signFactory = f; };

/* ---------- textures ---------- */
function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return t;
}
function radialCanvas(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
}
let RADIAL = null;
function svgToCanvas(svg, size) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size); res(c); };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function signTex(id) {
  if (texCache.has(id)) return texCache.get(id);
  const p = (async () => {
    const c = await svgToCanvas(signFactory(id), 512);
    if (!c) return null;
    const tex = canvasTex(c);
    const m = document.createElement('canvas'); m.width = m.height = 128;
    const mx = m.getContext('2d'); mx.drawImage(c, 0, 0, 128, 128);
    mx.globalCompositeOperation = 'source-in'; mx.fillStyle = '#fff'; mx.fillRect(0, 0, 128, 128);
    return { tex, mask: canvasTex(m, false) };
  })();
  texCache.set(id, p);
  return p;
}
E.preload = ids => Promise.all(ids.map(signTex));

/* ---------- panneau 3D ---------- */
let signGeo, poleGeo, poleMat, ringGeo;
function makeSign(id, size = 1, pole = 1, glow = 0.32) {
  const g = new THREE.Group(); g.userData.id = id;
  const head = new THREE.Group(); head.position.y = pole + size / 2; g.add(head);
  const front = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ alphaTest: 0.5, color: new THREE.Color(1, 1, 1).multiplyScalar(0.84 + glow * 0.4) }));
  const back = new THREE.Mesh(signGeo, new THREE.MeshStandardMaterial({ color: 0x6d747e, alphaTest: 0.5, roughness: 0.55, metalness: 0.5 }));
  front.scale.setScalar(size); back.scale.setScalar(size);
  back.rotation.y = Math.PI; back.position.z = -0.014;
  front.visible = back.visible = false;
  const halo = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: RADIAL, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(size * 2.1); halo.position.z = -0.03;
  head.add(halo, front, back);
  if (pole > 0) {
    const p = new THREE.Mesh(poleGeo, poleMat);
    const ph = pole + size * 0.45;
    p.scale.set(1, ph, 1); p.position.set(0, ph / 2, -0.04); g.add(p);
  }
  front.userData.sign = g;
  g.userData.front = front; g.userData.head = head; g.userData.halo = halo; g.userData.size = size; g.userData.pole = pole;
  signTex(id).then(r => {
    if (!r) return;
    front.material.map = r.tex; front.material.needsUpdate = true;
    back.material.map = r.mask; back.material.needsUpdate = true;
    front.visible = back.visible = true;
  });
  return g;
}
function swapSign(g, id) {
  g.userData.id = id;
  const f = g.userData.front;
  return signTex(id).then(r => { if (!r) return; f.material.map = r.tex; f.material.needsUpdate = true; const b = g.userData.head.children[2]; b.material.map = r.mask; b.material.needsUpdate = true; f.visible = b.visible = true; });
}
function flashSign(g, color, ms = 900) {
  const h = g.userData.halo; h.material.color.set(color).multiplyScalar(2.2);
  return tween(ms, (e, k) => { h.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.9; }, ease.lin);
}
function disposeObj(o) {
  o.traverse(n => {
    if (n.geometry && n.geometry !== signGeo && n.geometry !== poleGeo && n.geometry !== ringGeo) n.geometry.dispose();
    if (n.material && n.material !== poleMat) n.material.dispose();
  });
}

/* ---------- contours néon ---------- */
const SHAPES = {
  tri: [[0, 0.56], [0.5, -0.3], [-0.5, -0.3]],
  triBas: [[-0.5, 0.3], [0.5, 0.3], [0, -0.56]],
  carre: [[-0.46, 0.46], [0.46, 0.46], [0.46, -0.46], [-0.46, -0.46]],
  losange: [[0, 0.58], [0.58, 0], [0, -0.58], [-0.58, 0]],
  octo: Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return [0.5 * Math.cos(a), 0.5 * Math.sin(a)]; }),
  cercle: Array.from({ length: 64 }, (_, i) => { const a = i / 64 * Math.PI * 2 + Math.PI / 2; return [0.5 * Math.cos(a), 0.5 * Math.sin(a)]; })
};
function neonShape(shape, color, barred) {
  const g = new THREE.Group();
  const pts = SHAPES[shape];
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; path.add(new THREE.LineCurve3(V(a[0], a[1], 0), V(b[0], b[1], 0))); }
  const col = new THREE.Color(color);
  const mat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(3.2), toneMapped: false });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, shape === 'cercle' ? 256 : 220, 0.012, 6, false), mat);
  tube.geometry.setDrawRange(0, 0);
  g.add(tube);
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  fill.position.z = -0.01; g.add(fill);
  let bar = null;
  if (barred) {
    const bp = new THREE.CurvePath(); bp.add(new THREE.LineCurve3(V(-0.33, -0.33, 0.005), V(0.33, 0.33, 0.005)));
    bar = new THREE.Mesh(new THREE.TubeGeometry(bp, 30, 0.012, 6, false), mat.clone());
    bar.geometry.setDrawRange(0, 0); g.add(bar);
  }
  g.userData.draw = async () => {
    const n = tube.geometry.index.count;
    await tween(1300, e => tube.geometry.setDrawRange(0, Math.floor(n * e / 3) * 3), ease.io);
    if (bar) { const m = bar.geometry.index.count; await tween(420, e => bar.geometry.setDrawRange(0, Math.floor(m * e / 3) * 3), ease.out); }
    tween(700, e => { fill.material.opacity = 0.11 * e; });
  };
  return g;
}

/* =========================================================
   MONDE 1 — LA SALLE DE CODE
   ========================================================= */
function buildSalle() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x03050b);
  s.fog = new THREE.FogExp2(0x03050b, 0.03);
  const ROWS = 8, PER = 6;
  const rowZ = r => -2.4 + r * 1.15, rowY = r => r * 0.3;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), floorMat); floor.rotation.x = -Math.PI / 2; s.add(floor);
  for (let r = 1; r < ROWS; r++) {
    const h = rowY(r);
    const step = new THREE.Mesh(new THREE.BoxGeometry(15, h, 1.15), floorMat); step.position.set(0, h / 2, rowZ(r)); s.add(step);
  }
  // sièges (instanciés)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const cushion = new RoundedBoxGeometry(0.52, 0.14, 0.5, 3, 0.05), backG = new RoundedBoxGeometry(0.54, 0.68, 0.12, 3, 0.06), arm = new RoundedBoxGeometry(0.06, 0.32, 0.5, 2, 0.025);
  const seats = [];
  for (let r = 0; r < ROWS; r++) for (const side of [-1, 1]) for (let k = 0; k < PER; k++) seats.push({ r, x: side * (0.95 + k * 0.64), y: rowY(r), z: rowZ(r), me: r === 2 && side === 1 && k === 0 });
  const others = seats.filter(t => !t.me);
  const imC = new THREE.InstancedMesh(cushion, seatMat, others.length), imB = new THREE.InstancedMesh(backG, seatMat, others.length), imA = new THREE.InstancedMesh(arm, seatMat, others.length);
  const m4 = new THREE.Matrix4();
  others.forEach((t, i) => {
    m4.makeTranslation(t.x, t.y + 0.45, t.z); imC.setMatrixAt(i, m4);
    m4.makeTranslation(t.x, t.y + 0.8, t.z + 0.24); imB.setMatrixAt(i, m4);
    m4.makeTranslation(t.x + 0.3, t.y + 0.55, t.z); imA.setMatrixAt(i, m4);
  });
  const tint = new THREE.Color();
  others.forEach((t, i) => { tint.setHSL(0.62, 0.42, 0.13 + ((i * 53) % 7) / 220); imC.setColorAt(i, tint); imB.setColorAt(i, tint); imA.setColorAt(i, tint); });
  s.add(imC, imB, imA);
  const me = seats.find(t => t.me);
  const meMat = new THREE.MeshStandardMaterial({ color: 0xffc629, emissive: 0xffb000, emissiveIntensity: 1.4, roughness: 0.5 });
  const meC = new THREE.Mesh(cushion, meMat); meC.position.set(me.x, me.y + 0.45, me.z);
  const meB = new THREE.Mesh(backG, meMat); meB.position.set(me.x, me.y + 0.8, me.z + 0.24);
  s.add(meC, meB);
  const meLight = new THREE.PointLight(0xffc629, 4, 4, 2); meLight.position.set(me.x, me.y + 1.4, me.z + 0.4); s.add(meLight);
  // élèves (silhouettes)
  const occupied = others.filter((t, i) => ((i * 7919) % 13) < 6 && !(t.r === 2 && Math.abs(t.x - me.x) < 0.7));
  const head = new THREE.CapsuleGeometry(0.19, 0.3, 4, 10);
  const stuMat = new THREE.MeshStandardMaterial({ color: 0x141c30, roughness: 0.6 });
  const imS = new THREE.InstancedMesh(head, stuMat, occupied.length);
  occupied.forEach((t, i) => { const sc = 0.92 + ((i * 37) % 10) / 60; m4.compose(V(t.x + ((i % 3) - 1) * 0.03, t.y + 1.05, t.z + 0.05), new THREE.Quaternion(), V(sc, sc, sc)); imS.setMatrixAt(i, m4); });
  s.add(imS);
  // lumières de marches
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc629).multiplyScalar(2.4), toneMapped: false });
  const led = new THREE.BoxGeometry(0.22, 0.025, 0.04);
  for (let r = 0; r < ROWS; r++) for (const sx of [-0.55, 0.55]) { const l = new THREE.Mesh(led, ledMat); l.position.set(sx, rowY(r) + 0.02, rowZ(r) + 0.57); s.add(l); }
  // murs + bandeaux lumineux
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 1 });
  for (const sx of [-7.6, 7.6]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), wallMat); w.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2; w.position.set(sx, 6, 0); s.add(w);
    for (let i = 0; i < 6; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(1.4), toneMapped: false }));
      strip.position.set(sx * 0.995, 2.4, -6 + i * 3); s.add(strip);
    }
  }
  // écran
  const SW = 9.6, SH = 5.4, SZ = -7.6, SY = 3.2;
  const posterC = document.createElement('canvas'); posterC.width = 1024; posterC.height = 576;
  const posterT = canvasTex(posterC);
  const screenMat = new THREE.MeshBasicMaterial({ map: posterT, toneMapped: false }); screenMat.color.setScalar(1.15);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat); screen.position.set(0, SY, SZ); s.add(screen);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.35, SH + 0.35, 0.1), new THREE.MeshStandardMaterial({ color: 0x05070c })); frame.position.set(0, SY, SZ - 0.07); s.add(frame);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ map: RADIAL, color: 0x5a78c8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.02, SZ + 3); s.add(glow);
  // projecteur + faisceau
  const P = V(0, 5.2, 8.6), S = V(0, SY, SZ);
  const proj = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x0b0e15 })); proj.position.copy(P).add(V(0, 0, 0.35)); s.add(proj);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(6), toneMapped: false })); lens.position.copy(P); s.add(lens);
  const L = P.distanceTo(S);
  const beamGeo = new THREE.CylinderGeometry(4.6, 0.1, L, 48, 1, true);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying float vF; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vec3 n=normalize(normalMatrix*normal); vF=abs(dot(n,normalize(-mv.xyz))); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vF; void main(){ float along=vUv.y; float a=0.075*(0.35+0.65*along)*smoothstep(0.05,0.75,vF)*(0.85+0.15*sin(uTime*1.7+vUv.x*40.0)); gl_FragColor=vec4(vec3(1.0,0.9,0.72)*a,a); }`
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(P).lerp(S, 0.5);
  beam.quaternion.setFromUnitVectors(V(0, 1, 0), S.clone().sub(P).normalize());
  s.add(beam);
  // poussière dans le faisceau
  const N = 520, dp = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) {
    const t = 0.3 + Math.random() * 0.66, rr = (0.1 + 4.3 * t) * 0.85 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
    const base = P.clone().lerp(S, t); seeds.push({ base, rr, a, sp: 0.05 + Math.random() * 0.12, ph: Math.random() * 6 });
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.022, color: 0xffe2b5, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.add(dust);
  // lumières
  s.add(new THREE.AmbientLight(0x30406e, 0.55));
  const scrL = new THREE.PointLight(0x9db6ff, 60, 26, 1.5); scrL.position.set(0, 3, SZ + 1.5); s.add(scrL);
  const warm = new THREE.PointLight(0xffb070, 4, 24, 1.6); warm.position.set(0, 6.5, 6.5); s.add(warm);
  const rim = new THREE.DirectionalLight(0x8fa8ff, 0.7); rim.position.set(0, 4, -10); s.add(rim);

  // caméra
  const IDLE = { pos: V(0, 4.4, 10.4), target: V(0, 2.5, SZ), fov: 52 };
  const rig = { pos: IDLE.pos.clone(), target: IDLE.target.clone(), fov: IDLE.fov };
  const look = { yaw: 0, pitch: 0, vy: 0, vp: 0, drag: false };
  let mode = 'idle', t0 = 0;
  const seatEye = V(me.x, me.y + 1.2, me.z + 0.05);

  const W1 = {
    scene: s,
    enter() { mode = 'idle'; },
    update(dt, t) {
      beamMat.uniforms.uTime.value = t;
      for (let i = 0; i < N; i++) {
        const d = seeds[i]; const a = d.a + t * d.sp;
        dp[i * 3] = d.base.x + Math.cos(a) * d.rr; dp[i * 3 + 1] = d.base.y + Math.sin(a) * d.rr * 0.55 + Math.sin(t * 0.4 + d.ph) * 0.05; dp[i * 3 + 2] = d.base.z + Math.sin(a * 0.7) * 0.2;
      }
      dustGeo.attributes.position.needsUpdate = true;
      meMat.emissiveIntensity = 1.1 + Math.sin(t * 2.4) * 0.35;
      if (!look.drag) { look.yaw *= 0.94; look.pitch *= 0.94; }
      const drift = mode === 'idle' ? V(Math.sin(t * 0.13) * 0.7, Math.sin(t * 0.21) * 0.12, 0) : V(0, 0, 0);
      camera.position.copy(rig.pos).add(drift);
      const dir = rig.target.clone().sub(rig.pos);
      dir.applyAxisAngle(V(0, 1, 0), look.yaw);
      dir.y += look.pitch * dir.length();
      camera.lookAt(rig.pos.clone().add(drift.multiplyScalar(0.4)).add(dir));
      setFov(rig.fov);
    },
    look(dx, dy) { look.yaw = Math.max(-0.55, Math.min(0.55, look.yaw - dx * 0.0035)); look.pitch = Math.max(-0.18, Math.min(0.22, look.pitch - dy * 0.002)); },
    setDrag(v) { look.drag = v; },
    setPoster(draw) { draw(posterC.getContext('2d'), posterC.width, posterC.height); posterT.needsUpdate = true; },
    async takeSeat() {
      mode = 'seat';
      const p0 = rig.pos.clone(), tg0 = rig.target.clone();
      const aisle1 = V(0, rowY(5) + 1.65, rowZ(5) + 0.4), aisle2 = V(0.05, rowY(2) + 1.55, rowZ(2) + 0.75);
      const curve = new THREE.CatmullRomCurve3([p0, aisle1, aisle2, seatEye], false, 'centripetal');
      const tgs = [tg0, V(0, 2.1, SZ), V(me.x + 0.2, me.y + 0.7, me.z - 0.4), V(0, SY, SZ)];
      await tween(3400, e => {
        rig.pos.copy(curve.getPoint(e));
        const f = e * 3, i = Math.min(2, Math.floor(f)), k = ease.io(Math.min(1, f - i));
        rig.target.copy(tgs[i]).lerp(tgs[i + 1], k);
        rig.pos.y -= Math.sin(Math.PI * Math.max(0, (e - 0.82) / 0.18)) * 0.06;
      }, ease.io);
      emit('sit');
      await sleep(350);
      const pA = rig.pos.clone();
      await tween(1200, e => { rig.pos.copy(pA).lerp(V(0, SY - 0.1, SZ + 3.2), e); rig.fov = lerp(52, 40, e); }, ease.io);
    },
    async reset(ms = 1400) {
      mode = 'idle';
      const p0 = rig.pos.clone(), tg0 = rig.target.clone(), f0 = rig.fov;
      await tween(ms, e => { rig.pos.copy(p0).lerp(IDLE.pos, e); rig.target.copy(tg0).lerp(IDLE.target, e); rig.fov = lerp(f0, IDLE.fov, e); }, ease.io);
    },
    async focusScreen(ms = 1200) {
      mode = 'focus';
      const p0 = rig.pos.clone(), tg0 = rig.target.clone(), f0 = rig.fov;
      await tween(ms, e => { rig.pos.copy(p0).lerp(V(0, 3.5, 3.6), e); rig.target.copy(tg0).lerp(V(0, SY, SZ), e); rig.fov = lerp(f0, 50, e); }, ease.io);
    },
    snapIdle() { mode = 'idle'; rig.pos.copy(IDLE.pos); rig.target.copy(IDLE.target); rig.fov = IDLE.fov; },
    pickables: () => [],
    anchors: () => []
  };
  return W1;
}

/* =========================================================
   MONDE 2 — LA ROUTE AU CRÉPUSCULE
   ========================================================= */
function buildRoute() {
  const s = new THREE.Scene();
  s.fog = new THREE.Fog(0x3b3c58, 22, 185);
  // ciel
  const sunDir = V(-0.22, 0.035, -1).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x060f26) }, mid: { value: new THREE.Color(0x2a3966) }, hor: { value: new THREE.Color(0xf09a58) }, sunDir: { value: sunDir } },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vP;
      void main(){ float h=vP.y; vec3 c=mix(hor,mid,smoothstep(-0.01,0.2,h)); c=mix(c,top,smoothstep(0.2,0.75,h));
      float sd=max(dot(normalize(vP),sunDir),0.0); c+=vec3(1.0,0.5,0.22)*pow(sd,24.0)*0.8+vec3(1.0,0.78,0.5)*pow(sd,1400.0)*9.0;
      if(h<0.0) c=mix(hor*0.6,vec3(0.06,0.07,0.1),smoothstep(0.0,-0.06,h));
      gl_FragColor=vec4(c,1.0); }`
  }));
  sky.renderOrder = -1; s.add(sky);
  // sol
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x111a16, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; s.add(ground);
  // route (texture qui défile)
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 1024;
  const rx = rc.getContext('2d');
  rx.fillStyle = '#2b2e34'; rx.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 9000; i++) { const v = 30 + Math.random() * 40; rx.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.35 + Math.random() * 0.4})`; rx.fillRect(Math.random() * 256, Math.random() * 1024, 1.4, 1.4); }
  rx.fillStyle = '#e9e9e4'; rx.fillRect(9, 0, 5, 1024); rx.fillRect(242, 0, 5, 1024);
  rx.fillRect(126, 0, 4, 256); rx.fillRect(126, 512, 4, 256);
  const roadT = canvasTex(rc); roadT.wrapT = THREE.RepeatWrapping; roadT.repeat.set(1, 400 / 24);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 400), new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.78, metalness: 0.05 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -190); s.add(road);
  for (const sx of [-4.4, 4.4]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 400), new THREE.MeshStandardMaterial({ color: 0x252b26, roughness: 1 })); sh.rotation.x = -Math.PI / 2; sh.position.set(sx, 0.003, -190); s.add(sh); }
  // collines + lumières lointaines (fixes)
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.95 + i / 25 * Math.PI * 0.9 - Math.PI * 0.05, r = 210 + (i * 53 % 40);
    const hgt = 14 + (i * 31 % 22), hill = new THREE.Mesh(new THREE.ConeGeometry(40 + (i * 17 % 30), hgt, 5), hillMat);
    hill.position.set(Math.cos(a) * r, hgt / 2 - 2, Math.sin(a) * r); s.add(hill);
  }
  const cityN = 260, cp = new Float32Array(cityN * 3);
  for (let i = 0; i < cityN; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; const r = 170 + Math.random() * 30; cp[i * 3] = Math.cos(a) * r + 30; cp[i * 3 + 1] = 0.4 + Math.random() * 2.2; cp[i * 3 + 2] = Math.sin(a) * r; }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
  s.add(new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.9, color: new THREE.Color(0xffc887).multiplyScalar(2), transparent: true, opacity: 0.9, fog: false, depthWrite: false, toneMapped: false })));
  // décor qui défile
  const tread = [];
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6, metalness: 0.6 });
  const lampHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd7a0).multiplyScalar(3.2), toneMapped: false });
  const poolMat = new THREE.MeshBasicMaterial({ map: RADIAL, color: 0xffb36b, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  const LSP = 34, LN = 10;
  for (let i = 0; i < LN; i++) for (const side of [1, -1]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7.5, 8), lampMat); pole.position.y = 3.75; g.add(pole);
    const armM = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), lampMat); armM.position.set(-side * 0.8, 7.45, 0); g.add(armM);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.25), lampHead); hd.position.set(-side * 1.5, 7.38, 0); g.add(hd);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(-side * 2.6, 0.02, 0); g.add(pool);
    g.position.set(side * 5.3, 0, -i * LSP - (side < 0 ? LSP / 2 : 0));
    s.add(g); tread.push({ o: g, span: LN * LSP });
  }
  const postMat = new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: 0.6 });
  const refl = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa23a).multiplyScalar(2.2), toneMapped: false });
  const postG = new THREE.BoxGeometry(0.1, 0.95, 0.1), reflG = new THREE.BoxGeometry(0.11, 0.14, 0.02);
  const DSP = 14, DN = 18;
  for (let i = 0; i < DN; i++) for (const side of [1, -1]) {
    const g = new THREE.Group(); const p = new THREE.Mesh(postG, postMat); p.position.y = 0.48; g.add(p);
    const r = new THREE.Mesh(reflG, refl); r.position.set(0, 0.78, 0.055); g.add(r);
    g.position.set(side * 4.05, 0, -i * DSP - 3); s.add(g); tread.push({ o: g, span: DN * DSP });
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x0f1d17, roughness: 1, flatShading: true });
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1, x = side * (9 + ((i * 37) % 22)), z = -((i * 61) % 300);
    const h = 4 + (i % 5) * 1.3, tr = new THREE.Mesh(new THREE.ConeGeometry(1.4 + (i % 3) * 0.5, h, 6), treeMat);
    tr.position.set(x, h / 2, z); s.add(tr); tread.push({ o: tr, span: 300 });
  }
  // capot (mode réflexe)
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x06080c, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.12 }));
  hood.scale.set(1.9, 0.28, 1.5); hood.position.set(1.7, 0.6, 2.45); hood.visible = false; s.add(hood);
  // lumières
  s.add(new THREE.HemisphereLight(0x8193c8, 0x1d140d, 0.85));
  const sun = new THREE.DirectionalLight(0xffb27a, 1.6); sun.position.set(-40, 10, -120); s.add(sun);
  const head = new THREE.SpotLight(0xfff0d8, 45, 75, 0.42, 0.65, 1.3); head.position.set(1.7, 0.75, 0.6); head.target.position.set(1.8, 0, -30); s.add(head, head.target);
  // environnement pour les reflets du capot
  try { const pm = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene(); envScene.add(sky.clone()); s.environment = pm.fromScene(envScene, 0.04).texture; s.environmentIntensity = 0.35; pm.dispose(); } catch (e) {}

  const CAM = V(1.7, 1.25, 4);
  const POSES = {
    drive: { pos: CAM.clone(), target: V(1.5, 1.15, -40), fov: 54 },
    show: { pos: CAM.clone(), target: V(1.7, 0.95, -1.6), fov: 50 },
    reflex: { pos: V(1.7, 1.2, 4), target: V(1.9, 1.35, -40), fov: 60 }
  };
  const rig = { pos: POSES.drive.pos.clone(), target: POSES.drive.target.clone(), fov: 54 };
  let speed = 0, speedTarget = 0, accel = 6; // m/s
  let showcase = [], moving = [], examSigns = [], neon = null, rings = [], gen = 0, markers = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc629).multiplyScalar(2.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  function poseTo(p, ms = 900) {
    const a = rig.pos.clone(), b = rig.target.clone(), f = rig.fov;
    const P = typeof p === 'string' ? POSES[p] : p;
    return tween(ms, e => { rig.pos.copy(a).lerp(P.pos, e); rig.target.copy(b).lerp(P.target, e); rig.fov = lerp(f, P.fov, e); });
  }
  const markGeo = new THREE.BoxGeometry(3.3, 0.03, 0.22);
  function clearMarkers() { markers.forEach(m => { s.remove(m.g); m.g.traverse(n => { if (n.material) n.material.dispose(); }); }); markers = []; }
  function removeList(list) { list.forEach(g => { s.remove(g); disposeObj(g); }); list.length = 0; }
  async function sinkShowcase() {
    if (!showcase.length && !neon) return;
    const list = showcase.slice(); showcase = [];
    const nn = neon; neon = null;
    await tween(420, e => {
      list.forEach(g => { g.position.y = -e * 2.6; g.rotation.y = e * 0.8; });
      if (nn) nn.scale.setScalar(nn.userData.sc * (1 - e * 0.9));
    }, ease.io);
    list.forEach(g => { s.remove(g); disposeObj(g); });
    if (nn) { s.remove(nn); disposeObj(nn); }
  }

  const W2 = {
    scene: s,
    enter() {},
    get speed() { return speed; },
    get kmh() { return Math.round(speed * 3.6); },
    setSpeed(kmh, ac = 6) { speedTarget = kmh / 3.6; accel = ac; },
    setHood(v) { hood.visible = v; },
    pose: poseTo,
    update(dt, t) {
      const d = speedTarget - speed; speed += Math.sign(d) * Math.min(Math.abs(d), accel * dt);
      roadT.offset.y = (roadT.offset.y + speed * dt / 24) % 1;
      const dz = speed * dt;
      for (const it of tread) { it.o.position.z += dz; if (it.o.position.z > 10) it.o.position.z -= it.span; }
      for (let i = moving.length - 1; i >= 0; i--) {
        const g = moving[i]; g.position.z += dz;
        g.lookAt(camera.position.x, g.position.y, camera.position.z); g.rotation.x = 0; g.rotation.z = 0;
        if (!g.userData.passed && g.position.z > CAM.z - 0.5) { g.userData.passed = true; emit('pass', g.userData.handle); }
        if (g.position.z > CAM.z + 6) { s.remove(g); disposeObj(g); moving.splice(i, 1); }
      }
      rings.forEach(r => { r.rotation.z += dt * 0.6; });
      const sway = Math.min(1, speed / 25);
      camera.position.copy(rig.pos).add(V(Math.sin(t * 0.9) * 0.02 * sway, Math.sin(t * 7.3) * 0.006 * sway + Math.sin(t * 1.3) * 0.01, 0));
      camera.lookAt(rig.target);
      camera.rotateZ(Math.sin(t * 0.7) * 0.004 * sway);
      setFov(rig.fov);
    },
    async present(ids, opt = {}) {
      const my = ++gen; clearMarkers();
      this.setSpeed(0, opt.brake || 9);
      const waitStop = Math.min(1400, speed / 9 * 1000);
      await Promise.all([sinkShowcase(), poseTo('show', Math.max(700, waitStop))]);
      if (my !== gen) return false;
      removeList(moving);
      const n = ids.length, gap = n > 3 ? 1.12 : n > 2 ? 1.42 : 1.9, size = opt.size || (n > 3 ? 0.86 : n > 2 ? 1.0 : 1.15);
      const z = -1.6;
      ids.forEach((id, k) => {
        const g = makeSign(id, size, 0.85, 0.1);
        g.position.set(CAM.x + (k - (n - 1) / 2) * gap, -2.6, z); g.rotation.y = -1.3;
        s.add(g); showcase.push(g);
        const ring = new THREE.Mesh(ringGeo, ringMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(g.position.x, 0.015, z); s.add(ring);
        ring.scale.setScalar(size * 0.9);
        rings.push(ring);
        setTimeout(() => {
          emit('rise', k);
          tween(820, e => { g.position.y = lerp(-2.6, 0, e); g.rotation.y = lerp(-1.3, 0, e); }, ease.back);
          tween(1300, (e, kk) => { ring.material.opacity = Math.sin(Math.PI * kk) * 0.9; ring.scale.setScalar(size * (0.6 + e * 0.8)); }, ease.out).then(() => { s.remove(ring); ring.material.dispose(); rings.splice(rings.indexOf(ring), 1); });
        }, 160 + k * 200);
      });
      await sleep(160 + n * 200 + 700);
      return my === gen;
    },
    async outline(shape, color, barred) {
      const my = gen;
      if (neon) { s.remove(neon); disposeObj(neon); neon = null; }
      if (my !== gen) return;
      neon = neonShape(shape, color, barred);
      neon.userData.sc = 4.6; neon.scale.setScalar(4.6); neon.position.set(CAM.x, 2.9, -11); s.add(neon);
      emit('neon');
      await neon.userData.draw();
    },
    clearShowcase: sinkShowcase,
    async markers(list, opt = {}) {
      const my = ++gen;
      clearMarkers(); removeList(moving);
      this.setSpeed(0, 12);
      await Promise.all([sinkShowcase(), poseTo({ pos: V(1.7, 2.9, 5.5), target: V(1.7, 0.2, -26), fov: 46 }, 1000)]);
      if (my !== gen) return false;
      const cols = [0xffc629, 0xff4d61, 0x5c9dff];
      for (let k = 0; k < list.length; k++) {
        const [d, label] = list[k];
        const col = new THREE.Color(cols[k % cols.length]);
        const g = new THREE.Group(); g.position.set(1.7, 0.02, CAM.z - d);
        const bar = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(3), toneMapped: false })); bar.scale.x = 0.001; g.add(bar);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ map: RADIAL, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01; g.add(glow);
        s.add(g); markers.push({ g, d, label });
        emit('rise', k);
        tween(700, e => { bar.scale.x = Math.max(0.001, e); glow.material.opacity = 0.5 * e; }, ease.out);
        await sleep(650);
        if (my !== gen) return false;
      }
      return true;
    },
    clearMarkers,
    async drive(kmh = 60) { ++gen; clearMarkers(); await sinkShowcase(); this.setSpeed(kmh, 5); await poseTo('drive', 1100); },
    burst(ids) {
      ++gen; clearMarkers();
      sinkShowcase(); poseTo('drive', 900);
      this.setSpeed(118, 14);
      ids.forEach((id, k) => {
        const side = k % 2 ? -1 : 1;
        const g = makeSign(id, 1.0, 1.5, 0.22); g.position.set(side * 4.3, 0, -30 - k * 9); g.userData.handle = { id };
        s.add(g); moving.push(g);
      });
    },
    spawn(id, opt = {}) {
      const g = makeSign(id, opt.size || 1.25, opt.pole || 1.45, 0.3);
      g.position.set(opt.x || 4.25, 0, opt.z || -78);
      const handle = { id, g, get dist() { return Math.max(0, CAM.z - g.position.z); }, get passed() { return !!g.userData.passed; }, flash: c => flashSign(g, c, 700) };
      g.userData.handle = handle; s.add(g); moving.push(g);
      return handle;
    },
    clearMoving() { removeList(moving); },
    async exam(ids) {
      ++gen; clearMarkers();
      this.setSpeed(0, 60); speed = 0;
      removeList(examSigns); await sinkShowcase(); removeList(moving);
      if (!ids || !ids.length) {
        await poseTo({ pos: CAM.clone(), target: V(1.4, 1.1, -40), fov: 50 }, 700);
      } else if (ids.length === 1) {
        const g = makeSign(ids[0], 1.0, 1.4, 0.16); g.position.set(3.6, 0, -2); g.lookAt(CAM.x, g.position.y, CAM.z); s.add(g); examSigns.push(g);
        await poseTo({ pos: CAM.clone(), target: V(2.55, 1.75, -2), fov: 36 }, 700);
      } else {
        ids.forEach((id, k) => { const g = makeSign(id, 1.0, 1.4, 0.16); g.position.set(k === 0 ? 3.0 : 4.35, 0, -2); g.lookAt(CAM.x, 0, CAM.z); s.add(g); examSigns.push(g); });
        await poseTo({ pos: CAM.clone(), target: V(2.75, 1.75, -2), fov: 36 }, 700);
      }
    },
    clearExam() { removeList(examSigns); },
    flash(i, ok) { const g = showcase[i]; if (!g) return; flashSign(g, ok ? 0x2fbf71 : 0xff4d61, 1100); const r0 = g.rotation.y; tween(900, e => { g.rotation.y = r0 + e * Math.PI * 2; }, ease.io); },
    dim(except) { showcase.forEach((g, i) => { if (i !== except) tween(500, e => { g.position.y = -e * 0.5; }); }); },
    pickables: () => showcase.map(g => g.userData.front),
    anchors() { if (markers.length) return markers.map(m => ({ id: m.label, p: m.g.position.clone().add(V(-1.85, 0.05, 0)) })); return showcase.map(g => ({ id: g.userData.id, p: g.position.clone().add(V(0, 0.85 - 0.08, 0)) })); },
    reset() { ++gen; clearMarkers(); this.setSpeed(0, 60); speed = 0; removeList(moving); removeList(examSigns); showcase.forEach(g => { s.remove(g); disposeObj(g); }); showcase = []; if (neon) { s.remove(neon); disposeObj(neon); neon = null; } hood.visible = false; rig.pos.copy(POSES.drive.pos); rig.target.copy(POSES.drive.target); rig.fov = POSES.drive.fov; }
  };
  return W2;
}

/* =========================================================
   MONDE 3 — LE STUDIO (décodeur)
   ========================================================= */
function buildStudio() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x05070d);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshBasicMaterial({ map: RADIAL, color: 0x2a3d73, transparent: true, opacity: 0.9, depthWrite: false }));
  back.position.set(0, 2.2, -4); s.add(back);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x0b101c, roughness: 0.3, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; s.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 64), new THREE.MeshStandardMaterial({ color: 0x141b2c, roughness: 0.4, metalness: 0.7 }));
  disc.position.y = 0.04; s.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc629).multiplyScalar(2.5), toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.085; s.add(ring);
  s.add(new THREE.HemisphereLight(0x9fb1e0, 0x0a0a10, 0.7));
  const key = new THREE.SpotLight(0xffffff, 26, 14, 0.5, 0.6, 1.2); key.position.set(1.5, 4.5, 3.5); key.target.position.set(0, 1.2, 0); s.add(key, key.target);
  const rimY = new THREE.PointLight(0xffc629, 10, 6, 2); rimY.position.set(-1.4, 2.4, -1.4); s.add(rimY);
  const rimB = new THREE.PointLight(0x5c8dff, 10, 6, 2); rimB.position.set(1.6, 1.4, -1.2); s.add(rimB);
  const holder = new THREE.Group(); s.add(holder);
  let sign = null, spin = 0, wantId = null;
  const rig = { pos: V(0, 1.55, 4.3), target: V(0, 1.38, 0), fov: 36 };
  return {
    scene: s,
    enter() {},
    update(dt, t) {
      spin += dt * 0.45;
      holder.rotation.y = Math.sin(spin) * 0.55;
      holder.position.y = Math.sin(t * 1.2) * 0.02;
      camera.position.copy(rig.pos); camera.lookAt(rig.target); setFov(rig.fov);
    },
    async setSign(id) {
      wantId = id;
      await signTex(id);
      if (wantId !== id) return;
      if (!sign) { sign = makeSign(id, 1.25, 0.75, 0.05); holder.add(sign); }
      const r0 = holder.rotation.y;
      await swapSign(sign, id);
      tween(650, e => { sign.rotation.y = e * Math.PI * 2; sign.scale.setScalar(0.85 + 0.15 * ease.back(e)); }, ease.io);
      flashSign(sign, 0xffc629, 700);
      void r0;
    },
    pickables: () => [],
    anchors: () => []
  };
}

/* =========================================================
   Moteur
   ========================================================= */
function setFov(fovRegion) {
  // la « fenêtre » utile est une bande de l'écran (region) : on décale le centre optique
  const rTop = region.top * H, rH = Math.max(1, region.height * H);
  const yc = rTop + rH / 2;
  const pxPerTan = rH / (2 * Math.tan(THREE.MathUtils.degToRad(fovRegion) / 2));
  let Hf, y0;
  if (yc <= H / 2) { Hf = 2 * (H - yc); y0 = H - 2 * yc; } else { Hf = 2 * yc; y0 = 0; }
  const fovFull = THREE.MathUtils.radToDeg(2 * Math.atan((Hf / 2) / pxPerTan));
  if (camera.fov !== fovFull || camera.aspect !== W / Hf || !camera.view || camera.view.offsetY !== y0 || camera.view.fullHeight !== Hf) {
    camera.fov = fovFull; camera.aspect = W / Hf;
    camera.setViewOffset(W, Hf, 0, y0, W, H);
  }
}
function resize() {
  const r = canvas.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  composer.setPixelRatio(dpr); composer.setSize(W, H);
  bloom.resolution.set(W * dpr / 2, H * dpr / 2);
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  runTweens(now);
  const w = worlds[worldName]; if (!w) return;
  w.update(dt, now / 1000);
  frameHooks.forEach(f => { try { f(dt); } catch (e) {} });
  if (bloomOn) composer.render(); else renderer.render(w.scene, camera);
  frameCount++;
  if (!window.__noAutoPerf && frameCount > 30 && frameCount < 400) { if (dt > 0.034) slowFrames++; if (slowFrames > 90) { bloomOn = false; renderer.toneMapping = THREE.ACESFilmicToneMapping; } }
}

E.init = cv => {
  canvas = cv;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
  RADIAL = canvasTex(radialCanvas([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]), false);
  signGeo = new THREE.PlaneGeometry(1, 1);
  poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 10);
  poleMat = new THREE.MeshStandardMaterial({ color: 0x8b929c, roughness: 0.35, metalness: 0.8 });
  ringGeo = new THREE.RingGeometry(0.52, 0.56, 64);
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(new THREE.Scene(), camera);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.5, 1.0);
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
  worlds.salle = buildSalle();
  worlds.route = buildRoute();
  worlds.studio = buildStudio();
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
  E.ok = true;
  requestAnimationFrame(loop);
  return true;
};
E.world = n => {
  if (!worlds[n]) return;
  worldName = n; renderPass.scene = worlds[n].scene; worlds[n].enter();
  bloom.strength = n === 'studio' ? 0.5 : n === 'salle' ? 0.9 : 0.8;
};
E.get = n => worlds[n];
Object.defineProperty(E, 'current', { get: () => worldName });
E.region = (top, height) => { region = { top, height }; };
E.regionFromEl = el => { if (!el || !canvas) return; const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect(); region = { top: (r.top - c.top) / c.height, height: r.height / c.height }; };
E.pick = (cx, cy) => {
  const w = worlds[worldName]; if (!w) return null;
  const list = w.pickables(); if (!list.length) return null;
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height * 2 - 1));
  const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
  const hit = rc.intersectObjects(list, false)[0];
  if (!hit) return null;
  return list.indexOf(hit.object);
};
E.anchors = () => {
  const w = worlds[worldName]; if (!w) return [];
  const r = canvas.getBoundingClientRect();
  return w.anchors().map(a => { const v = a.p.clone().project(camera); return { id: a.id, x: (v.x + 1) / 2 * r.width + r.left, y: (1 - v.y) / 2 * r.height + r.top, vis: v.z < 1 }; });
};
E.tween = tween;
