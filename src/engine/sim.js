/* Pare-Brise — simulateur de conduite (monde « sim »).
   Une route (campagne, ville ou autoroute), une météo, des acteurs (piétons, voitures, vélos, animaux, feux…)
   et la voiture de l'élève : vitesse, pédales, freinage réaliste, vue cockpit, poursuite ou drone.
   Les exercices (app/exos.js) et les mises en situation des cours pilotent ce monde par son API.
   Repère : la route file vers -z. Une position sur la route s'écrit S (mètres depuis le départ). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export const LANE = 1.75;      // centre de notre voie
export const FRONT = 1.9;      // du conducteur au pare-chocs avant
export const DECEL = { sec: 6, pluie: 4, brouillard: 6, nuit: 6, neige: 2 }; // m/s² en freinage d'urgence

/* ---------- caches de géométries et matériaux (jamais libérés) ---------- */
const G = {}, M = {};
const geo = (k, f) => G[k] || (G[k] = f());
const mat = (k, f) => M[k] || (M[k] = f());
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
const cloth = c => mat('c' + c, () => std(c, { roughness: 0.85 }));
const glow = (c, i = 1) => mat('g' + c + i, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false }));
const shadowAll = (g, cast = true) => { g.traverse(n => { if (n.isMesh) { n.castShadow = cast; n.receiveShadow = true; } }); return g; };

function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

/* ======================= Modèles ======================= */
function carMesh(color = 0x3A6DF0, o = {}) {
  const g = new THREE.Group();
  const paint = mat('paint' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.35 }));
  const glass = mat('glass', () => new THREE.MeshStandardMaterial({ color: 0x172235, roughness: 0.08, metalness: 0.45 }));
  const tire = mat('tire', () => std(0x1c1f25, { roughness: 0.92 }));
  const rim = mat('rim', () => std(0xCDD3DC, { metalness: 0.85, roughness: 0.28 }));
  const trim = mat('trim', () => std(0x2a2f38, { roughness: 0.6 }));
  const len = o.long || 4.2;
  const body = new THREE.Mesh(geo('body' + len, () => new RoundedBoxGeometry(1.82, 0.6, len, 3, 0.2)), paint); body.position.y = 0.62;
  const skirt = new THREE.Mesh(geo('skirt' + len, () => new RoundedBoxGeometry(1.86, 0.18, len - 0.3, 2, 0.06)), trim); skirt.position.y = 0.36;
  const cab = new THREE.Mesh(geo('cab', () => new RoundedBoxGeometry(1.6, 0.54, 2.2, 3, 0.24)), glass); cab.position.set(0, 1.12, 0.2);
  const roof = new THREE.Mesh(geo('roof', () => new RoundedBoxGeometry(1.5, 0.09, 1.72, 2, 0.04)), paint); roof.position.set(0, 1.4, 0.26);
  g.add(body, skirt, cab, roof);
  const wg = geo('wheel', () => new THREE.CylinderGeometry(0.35, 0.35, 0.26, 22).rotateZ(Math.PI / 2));
  const rg = geo('rimg', () => new THREE.CylinderGeometry(0.21, 0.21, 0.27, 14).rotateZ(Math.PI / 2));
  const wz = len / 2 - 0.75;
  g.userData.wheels = [];
  for (const [x, z] of [[-0.8, -wz], [0.8, -wz], [-0.8, wz + 0.05], [0.8, wz + 0.05]]) {
    const w = new THREE.Group(); w.position.set(x, 0.35, z);
    w.add(new THREE.Mesh(wg, tire), new THREE.Mesh(rg, rim)); g.add(w); g.userData.wheels.push(w);
  }
  const hlg = geo('hl', () => new RoundedBoxGeometry(0.4, 0.13, 0.06, 2, 0.03));
  const head = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, emissive: 0xfff3dc, emissiveIntensity: 0.25 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a0d18, emissive: 0xff1a2a, emissiveIntensity: 0.25 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(hlg, head); h.position.set(x, 0.74, -len / 2 + 0.01); g.add(h);
    const t = new THREE.Mesh(hlg, tail); t.position.set(x, 0.76, len / 2 - 0.01); g.add(t);
  }
  g.userData.head = head; g.userData.tail = tail; g.userData.own = [head, tail];
  if (o.ecole) {
    const sign = new THREE.Mesh(geo('ecole', () => new RoundedBoxGeometry(0.9, 0.24, 0.3, 2, 0.05)), mat('ecoleM', () => new THREE.MeshStandardMaterial({ color: 0x1E5BFF, roughness: 0.4 })));
    sign.position.set(0, 1.58, 0.3); g.add(sign);
  }
  if (o.gyro) {
    const bar = new THREE.Group(); bar.position.set(0, 1.5, 0.1);
    const b1 = new THREE.MeshStandardMaterial({ color: 0x1238ff, emissive: 0x2a5bff, emissiveIntensity: 0.2 });
    const b2 = b1.clone();
    const gg = geo('gyro', () => new RoundedBoxGeometry(0.42, 0.14, 0.26, 2, 0.05));
    const l = new THREE.Mesh(gg, b1); l.position.x = -0.24; const r = new THREE.Mesh(gg, b2); r.position.x = 0.24;
    bar.add(l, r); g.add(bar); g.userData.gyro = [b1, b2]; g.userData.own.push(b1, b2);
    const band = new THREE.Mesh(geo('band' + len, () => new THREE.BoxGeometry(1.84, 0.12, len - 0.4)), mat('bandR', () => std(0xE32636))); band.position.y = 0.78; g.add(band);
  }
  return shadowAll(g);
}

function personMesh(o = {}) {
  const shirt = o.haut ?? 0x3D7BFF, pants = o.bas ?? 0x2B3445, skin = o.peau ?? 0xE6B796, hair = o.cheveux ?? 0x2b1d16;
  const g = new THREE.Group(), body = new THREE.Group(); const k = o.enfant ? 0.64 : 1;
  body.scale.setScalar(k); g.add(body);
  const sk = mat('sk' + skin, () => std(skin, { roughness: 0.6 }));
  const torso = new THREE.Mesh(geo('torso', () => new THREE.CapsuleGeometry(0.2, 0.42, 6, 14)), o.gilet ? mat('gilet', () => new THREE.MeshStandardMaterial({ color: 0xE8FF2E, emissive: 0x8a9a00, emissiveIntensity: 0.35, roughness: 0.6 })) : cloth(shirt));
  torso.position.y = 1.2; torso.scale.z = 0.8;
  const head = new THREE.Mesh(geo('head', () => new THREE.SphereGeometry(0.135, 22, 16)), sk); head.position.y = 1.66;
  const hr = new THREE.Mesh(geo('hair', () => new THREE.SphereGeometry(0.143, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)), cloth(hair)); hr.position.y = 1.675; hr.rotation.x = 0.22;
  body.add(torso, head, hr);
  const legG = geo('leg', () => new THREE.CapsuleGeometry(0.082, 0.6, 4, 10).translate(0, -0.4, 0));
  const armG = geo('arm', () => new THREE.CapsuleGeometry(0.06, 0.46, 4, 10).translate(0, -0.29, 0));
  const legs = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.1, 0.9, 0); p.add(new THREE.Mesh(legG, cloth(pants))); body.add(p); return p; });
  const arms = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.26, 1.45, 0); const a = new THREE.Mesh(armG, o.gilet ? M.gilet : cloth(shirt)); p.add(a); const h = new THREE.Mesh(geo('hand', () => new THREE.SphereGeometry(0.06, 10, 8).translate(0, -0.56, 0)), sk); p.add(h); body.add(p); return p; });
  if (o.cartable) { const b = new THREE.Mesh(geo('bag', () => new RoundedBoxGeometry(0.34, 0.4, 0.16, 2, 0.05)), cloth(0xFF7A1A)); b.position.set(0, 1.22, 0.22); body.add(b); }
  g.userData.anim = { legs, arms, phase: Math.random() * 6, k };
  return shadowAll(g);
}
function animWalk(g, dist, run) {
  const a = g.userData.anim; if (!a) return;
  a.phase += dist * (run ? 3.4 : 4.4) / a.k;
  const sw = Math.sin(a.phase) * (run ? 0.85 : 0.55);
  a.legs[0].rotation.x = sw; a.legs[1].rotation.x = -sw;
  a.arms[0].rotation.x = -sw * 0.8; a.arms[1].rotation.x = sw * 0.8;
}

function bikeMesh(o = {}) {
  const g = new THREE.Group();
  const frame = cloth(o.cadre ?? 0xFF4D3D), dark = mat('dark', () => std(0x222730, { roughness: 0.5, metalness: 0.4 }));
  const wheel = geo('bw', () => new THREE.TorusGeometry(0.34, 0.035, 8, 28).rotateY(Math.PI / 2));
  const wheels = [-0.52, 0.52].map(z => { const w = new THREE.Mesh(wheel, dark); w.position.set(0, 0.36, z); g.add(w); return w; });
  const tube = (a, b, m) => { const d = b.clone().sub(a); const t = new THREE.Mesh(geo('tube', () => new THREE.CylinderGeometry(0.025, 0.025, 1, 6)), m); t.scale.y = d.length(); t.position.copy(a).add(b).multiplyScalar(0.5); t.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(t); };
  const rear = V(0, 0.36, 0.52), front = V(0, 0.36, -0.52), seat = V(0, 0.92, 0.18), bar = V(0, 1.02, -0.42), crank = V(0, 0.38, 0);
  tube(rear, seat, frame); tube(seat, crank, frame); tube(crank, rear, frame); tube(crank, bar, frame); tube(front, bar, dark); tube(seat, bar, frame);
  const rider = personMesh({ haut: o.haut ?? 0x12A150, bas: 0x2B3445, gilet: o.gilet });
  rider.position.set(0, -0.02, 0.22); g.add(rider);
  const a = rider.userData.anim;
  a.arms.forEach(p => { p.rotation.x = -1.05; });
  rider.children[0].children[0].rotation.x = -0.28;
  g.userData.anim = { bikeLegs: a.legs, wheels, phase: 0, k: 1 };
  return shadowAll(g);
}
/* Moto : deux grosses roues, un réservoir, un pilote casqué penché sur le guidon */
function motoMesh(o = {}) {
  const g = new THREE.Group(), body = mat('motoB' + (o.couleur ?? 0x2E3440), () => std(o.couleur ?? 0x2E3440, { roughness: 0.35, metalness: 0.5 })), dark = mat('dark', () => std(0x222730, { roughness: 0.5, metalness: 0.4 }));
  const wheel = geo('mw', () => new THREE.TorusGeometry(0.3, 0.1, 10, 28).rotateY(Math.PI / 2));
  const wheels = [-0.7, 0.7].map(z => { const w = new THREE.Mesh(wheel, dark); w.position.set(0, 0.4, z); g.add(w); return w; });
  const tank = new THREE.Mesh(geo('mTank', () => new RoundedBoxGeometry(0.42, 0.34, 0.8, 2, 0.12)), body); tank.position.set(0, 0.86, -0.2); g.add(tank);
  const frame = new THREE.Mesh(geo('mFrame', () => new RoundedBoxGeometry(0.3, 0.28, 1.3, 2, 0.08)), dark); frame.position.set(0, 0.6, 0.05); g.add(frame);
  const seat = new THREE.Mesh(geo('mSeat', () => new RoundedBoxGeometry(0.34, 0.12, 0.6, 2, 0.05)), dark); seat.position.set(0, 0.98, 0.35); g.add(seat);
  const bar = new THREE.Mesh(geo('mBar', () => new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6).rotateZ(Math.PI / 2)), dark); bar.position.set(0, 1.12, -0.62); g.add(bar);
  const rider = personMesh({ haut: o.haut ?? 0x1E222A, bas: 0x2B3445 }); rider.position.set(0, -0.02, 0.32); g.add(rider);
  rider.userData.anim.arms.forEach(p => { p.rotation.x = -1.2; });
  rider.userData.anim.legs.forEach(p => { p.rotation.x = -1.1; });
  rider.children[0].children[0].rotation.x = -0.38;
  const helmet = new THREE.Mesh(geo('helmet', () => new THREE.SphereGeometry(0.17, 16, 12)), body); helmet.position.set(0, 1.68, 0); rider.children[0].add(helmet);
  g.userData.wheels = wheels;
  return shadowAll(g);
}
function animBike(g, dist) {
  const a = g.userData.anim; a.phase += dist * 2.4;
  a.bikeLegs[0].rotation.x = -1.2 + Math.sin(a.phase) * 0.45; a.bikeLegs[1].rotation.x = -1.2 - Math.sin(a.phase) * 0.45;
  a.wheels.forEach(w => { w.rotation.x -= dist / 0.34; });
}

function deerMesh() {
  const g = new THREE.Group(), fur = cloth(0x9A6643), belly = cloth(0xD9B48F), dark = cloth(0x3a2a20);
  const b = new THREE.Mesh(geo('deerB', () => new THREE.CapsuleGeometry(0.24, 0.72, 6, 14).rotateX(Math.PI / 2)), fur); b.position.y = 1.02;
  const n = new THREE.Mesh(geo('deerN', () => new THREE.CapsuleGeometry(0.09, 0.42, 4, 10)), fur); n.position.set(0, 1.36, -0.5); n.rotation.x = 0.55;
  const h = new THREE.Mesh(geo('deerH', () => new THREE.CapsuleGeometry(0.085, 0.2, 4, 10).rotateX(Math.PI / 2)), fur); h.position.set(0, 1.62, -0.66);
  const ears = [-1, 1].map(s => { const e = new THREE.Mesh(geo('ear', () => new THREE.ConeGeometry(0.05, 0.16, 6)), fur); e.position.set(s * 0.08, 1.74, -0.6); e.rotation.z = s * -0.5; return e; });
  const tail = new THREE.Mesh(geo('tailD', () => new THREE.SphereGeometry(0.07, 8, 6)), belly); tail.position.set(0, 1.12, 0.6);
  g.add(b, n, h, ...ears, tail);
  const legG = geo('deerL', () => new THREE.CylinderGeometry(0.035, 0.03, 0.9, 6).translate(0, -0.45, 0));
  const legs = [[-0.14, -0.38], [0.14, -0.38], [-0.14, 0.38], [0.14, 0.38]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0.92, z); p.add(new THREE.Mesh(legG, dark)); g.add(p); return p; });
  g.userData.anim = { legs, arms: [], phase: 0, k: 1, deer: true };
  return shadowAll(g);
}
function animDeer(g, dist) { const a = g.userData.anim; a.phase += dist * 2.6; const s = Math.sin(a.phase) * 0.7; a.legs[0].rotation.x = s; a.legs[1].rotation.x = s; a.legs[2].rotation.x = -s; a.legs[3].rotation.x = -s; g.children[0].position.y = 1.02 + Math.abs(Math.sin(a.phase)) * 0.12; }

function ballMesh() {
  const t = mat('ballT', () => { const c = canvas(128, 64, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#FF3B30'; for (let i = 0; i < 4; i++) x.fillRect(i * 32, 0, 16, h); }); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; });
  const m = new THREE.Mesh(geo('ball', () => new THREE.SphereGeometry(0.12, 20, 14)), mat('ballM', () => new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })));
  m.position.y = 0.12; const g = new THREE.Group(); g.add(m); g.userData.ball = m; return shadowAll(g);
}

function tractorMesh() {
  const g = new THREE.Group(), green = mat('tracG', () => std(0x2F9E44, { roughness: 0.5 })), glass = M.glass || mat('glass', () => new THREE.MeshStandardMaterial({ color: 0x172235, roughness: 0.08, metalness: 0.45 })), tire = mat('tire', () => std(0x1c1f25, { roughness: 0.92 })), yel = mat('yel', () => std(0xF2C230));
  const body = new THREE.Mesh(geo('trB', () => new RoundedBoxGeometry(1.2, 0.95, 2.4, 3, 0.12)), green); body.position.set(0, 1.0, -0.3);
  const cab = new THREE.Mesh(geo('trC', () => new RoundedBoxGeometry(1.35, 1.25, 1.3, 3, 0.1)), glass); cab.position.set(0, 2.05, 0.45);
  const roofT = new THREE.Mesh(geo('trR', () => new RoundedBoxGeometry(1.45, 0.12, 1.45, 2, 0.04)), green); roofT.position.set(0, 2.72, 0.45);
  g.add(body, cab, roofT);
  const big = geo('trW', () => new THREE.CylinderGeometry(0.82, 0.82, 0.5, 22).rotateZ(Math.PI / 2)), small = geo('trw', () => new THREE.CylinderGeometry(0.45, 0.45, 0.32, 18).rotateZ(Math.PI / 2)), hub = geo('trH', () => new THREE.CylinderGeometry(0.32, 0.32, 0.52, 12).rotateZ(Math.PI / 2));
  for (const s of [-1, 1]) { const w = new THREE.Mesh(big, tire); w.position.set(s * 0.95, 0.82, 0.6); const hb = new THREE.Mesh(hub, yel); hb.position.copy(w.position); const f = new THREE.Mesh(small, tire); f.position.set(s * 0.78, 0.45, -1.15); g.add(w, hb, f); }
  const beacon = new THREE.MeshStandardMaterial({ color: 0xff9500, emissive: 0xff7a00, emissiveIntensity: 0.4 });
  const bc = new THREE.Mesh(geo('bcn', () => new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12)), beacon); bc.position.set(0, 2.86, 0.45); g.add(bc);
  g.userData.beacon = beacon; g.userData.own = [beacon];
  return shadowAll(g);
}

function busMesh(color = 0x1E5BFF, truck = false) {
  const g = new THREE.Group(), white = mat('busW', () => std(0xF4F6FA, { roughness: 0.4 })), band = cloth(color), glass = mat('glass', () => new THREE.MeshStandardMaterial({ color: 0x172235, roughness: 0.08, metalness: 0.45 })), tire = mat('tire', () => std(0x1c1f25, { roughness: 0.92 }));
  const L = truck ? 9 : 11;
  const b = new THREE.Mesh(geo('busB' + L, () => new RoundedBoxGeometry(2.5, 2.8, L, 3, 0.22)), white); b.position.y = 1.75;
  g.add(b);
  if (truck) { const cab = new THREE.Mesh(geo('trkC', () => new RoundedBoxGeometry(2.45, 2.4, 2.2, 3, 0.2)), band); cab.position.set(0, 1.55, -L / 2 - 1.1); const ws = new THREE.Mesh(geo('trkW', () => new THREE.BoxGeometry(2.2, 0.9, 0.05)), glass); ws.position.set(0, 2.15, -L / 2 - 2.21); g.add(cab, ws); }
  else { const w = new THREE.Mesh(geo('busG', () => new THREE.BoxGeometry(2.54, 1.0, L - 0.8)), glass); w.position.set(0, 2.35, 0); const s = new THREE.Mesh(geo('busS', () => new THREE.BoxGeometry(2.55, 0.32, L - 0.2)), band); s.position.y = 1.2; const f = new THREE.Mesh(geo('busF', () => new THREE.BoxGeometry(2.3, 1.4, 0.05)), glass); f.position.set(0, 2.1, -L / 2 - 0.01); g.add(w, s, f); }
  const wg = geo('busWh', () => new THREE.CylinderGeometry(0.5, 0.5, 0.4, 18).rotateZ(Math.PI / 2));
  for (const z of truck ? [-L / 2 - 1.3, L / 2 - 1.8, L / 2 - 0.8] : [-L / 2 + 2.2, L / 2 - 2.4]) for (const s of [-1, 1]) { const w = new THREE.Mesh(wg, tire); w.position.set(s * 1.1, 0.5, z); g.add(w); }
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a0d18, emissive: 0xff1a2a, emissiveIntensity: 0.25 });
  for (const s of [-1, 1]) { const t = new THREE.Mesh(geo('busT', () => new THREE.BoxGeometry(0.3, 0.3, 0.05)), tail); t.position.set(s * 1.0, 0.9, L / 2 + 0.01); g.add(t); }
  g.userData.tail = tail; g.userData.own = [tail];
  return shadowAll(g);
}

/* Tramway : deux caisses articulées, longues de 23 m en tout. */
function tramMesh(color = 0x2FA37A) {
  const g = new THREE.Group();
  for (const z of [-5.8, 5.8]) { const b = busMesh(color); b.position.z = z; g.add(b); }
  g.userData.tail = g.children[1].userData.tail;
  return g;
}
/* Marquages peints : flèches de direction, de rabattement, « BUS » */
const MARKS = {};
function markTex(kind, K) {
  if (MARKS[kind]) return MARKS[kind];
  const c = canvas(192, 384, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#F2F2EC'; x.strokeStyle = '#F2F2EC'; x.lineCap = 'butt'; x.lineJoin = 'round'; x.lineWidth = 16;
    const head = (cx, cy, ang) => { x.save(); x.translate(cx, cy); x.rotate(ang); x.beginPath(); x.moveTo(0, -46); x.lineTo(30, 6); x.lineTo(-30, 6); x.closePath(); x.fill(); x.restore(); };
    const line = (...pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
    const curve = (x0, y0, sd, y1) => { x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0, y1, x0 + sd * 40, y1); x.stroke(); head(x0 + sd * 44, y1, sd * Math.PI / 2); };
    const up = () => { line([96, 384], [96, 90]); head(96, 70, 0); };
    if (kind === 'tout-droit') up();
    else if (kind === 'gauche' || kind === 'droite') { line([96, 384], [96, 210]); curve(96, 212, kind === 'droite' ? 1 : -1, 160); }
    else if (kind === 'tout-droit-gauche' || kind === 'tout-droit-droite') { up(); curve(96, 320, kind.endsWith('droite') ? 1 : -1, 262); }
    else if (kind === 'rabat-droite' || kind === 'rabat-gauche') { const sd = kind === 'rabat-droite' ? 1 : -1; line([96 - sd * 36, 384], [96 - sd * 36, 260], [96 + sd * 30, 120]); head(96 + sd * 30, 118, sd * 0.44); }
    else if (kind === 'bus') { x.font = 'bold 92px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.save(); x.translate(96, 192); x.scale(0.62, 1.9); x.fillText('BUS', 0, 30); x.restore(); }
  });
  const t = K.canvasTex(c); t.anisotropy = 8; return (MARKS[kind] = t);
}

function lightMesh() {
  const g = new THREE.Group(), pole = mat('poleD', () => std(0x3B414B, { roughness: 0.4, metalness: 0.6 })), box = mat('boxD', () => std(0x1E222A, { roughness: 0.5 }));
  const p = new THREE.Mesh(geo('tlP', () => new THREE.CylinderGeometry(0.07, 0.08, 3.1, 10)), pole); p.position.y = 1.55; g.add(p);
  const heads = [[2.55, 1], [1.45, 0.5]].map(([y, sc]) => {
    const h = new THREE.Group(); h.position.set(0, y, 0.1); h.scale.setScalar(sc);
    const b = new THREE.Mesh(geo('tlB', () => new RoundedBoxGeometry(0.36, 1.0, 0.24, 3, 0.06)), box); h.add(b);
    const lamps = [0.3, 0, -0.3].map(ly => { const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, roughness: 0.3 }); const d = new THREE.Mesh(geo('tlD', () => new THREE.CircleGeometry(0.12, 20)), m); d.position.set(0, ly, 0.125); h.add(d); return m; });
    g.add(h); return lamps;
  });
  g.userData.lamps = heads; g.userData.own = heads.flat();
  return shadowAll(g);
}
const TL_COL = { rouge: [0xff2d2d, 0], orange: [0xffa21a, 1], vert: [0x2bd96b, 2] };
function setLight(g, state) {
  g.userData.state = state;
  g.userData.lamps.forEach(ls => ls.forEach((m, i) => {
    const on = (state === 'rouge' && i === 0) || (state === 'orange' && i === 1) || (state === 'vert' && i === 2) || (state === 'clignotant' && i === 1);
    const c = [0xff2d2d, 0xffa21a, 0x2bd96b][i];
    m.color.set(on ? c : 0x2a2a2a); m.emissive.set(on ? c : 0x000000); m.emissiveIntensity = on ? 2.4 : 0;
  }));
}

function triangleMesh() {
  const g = new THREE.Group(), red = mat('triR', () => new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1010, emissiveIntensity: 0.5 }));
  const sh = new THREE.Shape(); sh.moveTo(-0.3, 0); sh.lineTo(0.3, 0); sh.lineTo(0, 0.52); sh.lineTo(-0.3, 0);
  const hole = new THREE.Path(); hole.moveTo(-0.2, 0.06); hole.lineTo(0.2, 0.06); hole.lineTo(0, 0.4); hole.lineTo(-0.2, 0.06); sh.holes.push(hole);
  const m = new THREE.Mesh(geo('tri', () => new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false })), red); m.position.y = 0.06; g.add(m);
  const foot = new THREE.Mesh(geo('triF', () => new THREE.BoxGeometry(0.4, 0.04, 0.3)), mat('dark', () => std(0x222730))); foot.position.y = 0.02; g.add(foot);
  return shadowAll(g);
}

/* ======================= Monde ======================= */
export function buildSim(K) {
  const s = new THREE.Scene();
  const root = new THREE.Group(); s.add(root);              // tout ce qui est posé sur la route (suit S)
  let run = new THREE.Group(); root.add(run);                // contenu de l'étape en cours

  /* ciel */
  const SKY = {
    jour: [0x2F7BEA, 0x7DB6F5, 0xE4F1FF], pluie: [0x6B7686, 0x9AA5B4, 0xC9D0DA], brouillard: [0xC9D0D8, 0xD9DEE5, 0xE2E6EC],
    nuit: [0x030714, 0x0C1838, 0x22325E], neige: [0xAFC0D4, 0xD3DCE7, 0xEEF2F7], couchant: [0x26407E, 0x7C8FC4, 0xF5B47E]
  };
  const sunDir = V(-0.35, 0.42, -1).normalize();
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: sunDir }, sunK: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform float sunK; varying vec3 vP;
      void main(){ float h=vP.y; vec3 c=mix(hor,mid,smoothstep(-0.01,0.18,h)); c=mix(c,top,smoothstep(0.18,0.7,h));
      float sd=max(dot(normalize(vP),sunDir),0.0); c+=sunK*(vec3(1.0,0.96,0.88)*pow(sd,32.0)*0.3+vec3(1.0)*pow(sd,1800.0)*2.2);
      gl_FragColor=vec4(c,1.0); }`
  }));
  sky.renderOrder = -1; s.add(sky);

  /* sol + collines lointaines */
  const groundMat = std(0x86B66A, { roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; s.add(ground);
  const hillMat = std(0x7FA9CF, { roughness: 1, flatShading: true });
  const hills = new THREE.Group(); s.add(hills);
  for (let i = 0; i < 16; i++) { const r = 30 + (i * 37) % 50, h = new THREE.Mesh(new THREE.ConeGeometry(r, 14 + (i * 13) % 26, 7), hillMat); const a = -1.4 + i * 0.19; h.position.set(Math.sin(a) * 300, 4, -Math.cos(a) * 300); h.scale.y = 0.6; hills.add(h); }

  /* textures de chaussée */
  const noise = (x, w, h, base, amp, n) => { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = amp[0] + Math.random() * amp[1]; x.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.3 + Math.random() * 0.4})`; x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); } };
  const tex = c => { const t = K.canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  // enrobé en double résolution, grain fin : reste net au premier plan, même agrandi sur un écran 3×
  const ROADT = {
    route: () => canvas(512, 2048, (x, w, h) => { noise(x, w, h, '#5F646C', [72, 50], 52000); x.fillStyle = '#ECECE6'; for (let y = 0; y < h; y += 256) { x.fillRect(16, y, 12, 160); x.fillRect(w - 28, y, 12, 160); } }),
    ville: () => canvas(512, 2048, (x, w, h) => { noise(x, w, h, '#55595F', [64, 46], 52000); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, 12, h); x.fillRect(w - 12, 0, 12, h); x.fillStyle = '#E8E8E2'; for (let y = 0; y < h; y += 340) { x.fillRect(96, y, 6, 180); x.fillRect(410, y, 6, 180); } }),
    autoroute: () => canvas(512, 2048, (x, w, h) => { noise(x, w, h, '#5A5F66', [70, 48], 52000); x.fillStyle = '#EFEFEA'; x.fillRect(8, 0, 14, h); for (let y = 0; y < h; y += 512) { x.fillRect(188, y, 10, 320); x.fillRect(366, y, 18, 400); } })
  };
  const roadTex = {}; const roadT = k => roadTex[k] || (roadTex[k] = tex(ROADT[k]()));
  const roadMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02, envMapIntensity: 0.6 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(1, 520), roadMat); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; s.add(road);
  const shoulderMat = std(0xB8BCA6, { roughness: 1 });
  const shoulders = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 520), shoulderMat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; s.add(m); return m; });

  /* lumières */
  const hemi = new THREE.HemisphereLight(0xDDEBFF, 0x6B8455, 1.6); s.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFF8EE, 2.6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 40, bottom: -40, near: 10, far: 220 });
  s.add(sun, sun.target);
  const heads = [-0.62, 0.62].map(dx => { const l = new THREE.SpotLight(0xfff1dc, 0, 70, 0.42, 0.55, 1.2); s.add(l, l.target); l.userData.dx = dx; return l; });
  const fogLamps = [-0.7, 0.7].map(dx => { const l = new THREE.SpotLight(0xfff6e6, 0, 24, 1.0, 0.8, 1.5); s.add(l, l.target); l.userData.dx = dx; return l; });

  /* notre voiture : capot (cockpit) + modèle complet (vues extérieures) */
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xF2F5FA, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 }));
  hood.scale.set(1.0, 0.26, 1.0); s.add(hood);
  const me = carMesh(0xF4F6FA, { ecole: true }); me.visible = false; s.add(me);
  const amber = new THREE.MeshStandardMaterial({ color: 0xffa21a, emissive: 0xff8a00, emissiveIntensity: 0.1 }), fogR = new THREE.MeshStandardMaterial({ color: 0x8a0d18, emissive: 0xff1020, emissiveIntensity: 0 });
  const amberR = amber.clone();   // clignotants : gauche (x < 0) et droit séparés
  for (const [x, z] of [[-0.86, -2.05], [0.86, -2.05], [-0.86, 2.06], [0.86, 2.06]]) { const b = new THREE.Mesh(geo('blink', () => new RoundedBoxGeometry(0.16, 0.1, 0.06, 2, 0.02)), x < 0 ? amber : amberR); b.position.set(x, 0.74, z); me.add(b); }
  const fr = new THREE.Mesh(geo('fogR', () => new RoundedBoxGeometry(0.22, 0.08, 0.05, 2, 0.02)), fogR); fr.position.set(-0.5, 0.42, 2.11); me.add(fr);

  /* pluie / neige */
  const RAIN_N = 800;
  const rainGeo = new THREE.BufferGeometry(); const rp = new Float32Array(RAIN_N * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xc9d6e6, transparent: true, opacity: 0.55 })); rain.frustumCulled = false; rain.visible = false; s.add(rain);
  const drops = Array.from({ length: RAIN_N }, () => ({ x: (Math.random() - 0.5) * 40, y: Math.random() * 14, z: -Math.random() * 60 + 6 }));
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N * 3), 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9 })); snow.frustumCulled = false; snow.visible = false; s.add(snow);

  /* ---------- état ---------- */
  const P = { s: 0, v: 0, mode: 'auto', target: 0, gas: 0, brake: 0, decel: 6, x: LANE, lastA: 0 };
  let cfg = { env: 'route', meteo: 'jour' };
  let actors = [], ticks = new Set(), pick = [], anchorList = [], ownMats = [], signs = [], chunks = [];
  let camMode = 'cockpit', camT = { pos: V(0, 0, 0), target: V(0, 0, 0), fov: 58 }, camFree = null;
  let shakeK = 0, envLen = 1600, stopAtEnd = true, timeScale = 1;
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x34C759, transparent: true, opacity: 0.32, depthWrite: false })); guide.visible = false; s.add(guide);
  let guideLen = 0;
  const lightsCfg = { position: false, croisement: false, route: false, brouillardAv: false, brouillardAr: false, detresse: false, clignotant: null };

  const local = S => -S;                         // z local (dans root) pour une position S
  const ahead = S => S - P.s;                   // distance devant le conducteur

  function clearRun() {
    actors.forEach(a => a.dispose && a.dispose());
    signs.forEach(g => K.disposeObj(g));
    ownMats.forEach(m => m.dispose());
    root.remove(run); run = new THREE.Group(); root.add(run);
    actors = []; signs = []; ownMats = []; pick = []; anchorList = []; chunks = [];
  }
  const own = g => { (g.userData.own || []).forEach(m => ownMats.push(m)); return g; };

  /* ---------- chargement d'une étape ---------- */
  const envCache = {};
  function applyWeather(meteo, env) {
    const night = meteo === 'nuit';
    const k = SKY[meteo === 'sec' ? 'jour' : meteo] || SKY.jour;
    skyU.top.value.set(k[0]); skyU.mid.value.set(k[1]); skyU.hor.value.set(k[2]);
    skyU.sunK.value = meteo === 'jour' || meteo === 'sec' || meteo === 'couchant' ? 1 : 0;
    const fogC = { pluie: 0xB9C2CD, brouillard: 0xD5DAE0, nuit: 0x0B1430, neige: 0xDCE3EC }[meteo] ?? 0xD6E6F8;
    const fogR = { pluie: [18, 170], brouillard: [4, 62], nuit: [25, 160], neige: [12, 120] }[meteo] ?? [60, 330];
    s.fog = new THREE.Fog(fogC, fogR[0], fogR[1]);
    hemi.intensity = night ? 0.4 : meteo === 'pluie' ? 1.25 : meteo === 'brouillard' ? 1.5 : 1.6;
    hemi.color.set(night ? 0x5568a8 : 0xDDEBFF); hemi.groundColor.set(night ? 0x0b0f1c : meteo === 'neige' ? 0xb8c4d4 : 0x6B8455);
    sun.intensity = night ? 0.05 : meteo === 'pluie' ? 0.7 : meteo === 'brouillard' ? 0.35 : meteo === 'neige' ? 1.1 : 2.6;
    sun.castShadow = !night && meteo !== 'brouillard';
    groundMat.color.set(meteo === 'neige' ? 0xF1F4F8 : night ? 0x1d2a1f : env === 'ville' ? 0x9DA79A : 0x86B66A);
    hillMat.color.set(night ? 0x0d1528 : meteo === 'neige' ? 0xE4EAF2 : meteo === 'brouillard' || meteo === 'pluie' ? 0xA7B1BE : 0x7FA9CF);
    shoulderMat.color.set(meteo === 'neige' ? 0xEEF2F6 : env === 'autoroute' ? 0x8E968A : 0xB8BCA6);
    const wet = meteo === 'pluie';
    roadMat.roughness = wet ? 0.18 : 0.82; roadMat.metalness = wet ? 0.35 : 0.02; roadMat.color.set(wet ? 0x9aa0a8 : night ? 0x8a8f99 : 0xffffff);
    rain.visible = wet; snow.visible = meteo === 'neige';
    K.setBloom(night ? 0.5 : 0.22);
    P.decel = DECEL[meteo] ?? 6;
    // environnement pour les reflets
    try { const key = meteo === 'sec' ? 'jour' : meteo; if (!envCache[key]) { const pm = new THREE.PMREMGenerator(K.renderer()); const es = new THREE.Scene(); es.add(sky.clone()); envCache[key] = pm.fromScene(es, 0.04).texture; pm.dispose(); } s.environment = envCache[key]; s.environmentIntensity = night ? 0.15 : 0.7; } catch (e) {}
  }

  const roadWidth = { route: 7, ville: 11.4, autoroute: 10 };
  const roadX = { route: 0, ville: 0, autoroute: 1.25 };
  function load(spec = {}) {
    clearRun();
    cfg = { env: spec.env || 'route', meteo: spec.meteo || 'jour', ...spec };
    envLen = spec.longueur || 1600; stopAtEnd = spec.stopFin !== false;
    lightsCfg.clignotant = null;
    P.s = spec.depart || 0; P.v = (spec.kmh || 0) / 3.6; P.target = P.v; P.mode = 'auto'; P.gas = P.brake = 0; P.x = spec.voie ?? LANE;
    const env = cfg.env;
    road.scale.x = roadWidth[env]; road.position.set(roadX[env], 0, -200);
    roadMat.map = roadT(env); roadMat.map.repeat.set(1, 520 / (env === 'ville' ? 26 : 24)); roadMat.needsUpdate = true;
    shoulders.forEach((m, i) => { const sx = i ? 1 : -1; m.visible = env !== 'ville'; m.position.set(roadX[env] + sx * (roadWidth[env] / 2 + 0.7), -0.01, -200); });
    applyWeather(cfg.meteo, env);
    const zones = (spec.zones || []).concat((spec.carrefours || []).map(S => ({ de: S - 14, a: S + 14 })));
    const free = S => !zones.some(z => S > z.de && S < z.a);
    buildDecor(env, free, spec);
    buildCenterLine(env, spec.ligne, free);
    lights(lightsCfg);
    pose(spec.camera || 'cockpit', 0);
    return W;
  }

  /* ---------- marquage axial ---------- */
  function buildCenterLine(env, ligne, free) {
    if (env === 'autoroute') return;
    const segs = ligne || [{ de: -200, a: envLen, type: 'discontinue' }];
    const white = mat('paintW', () => new THREE.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.6 }));
    const dashG = geo('dash', () => new THREE.PlaneGeometry(0.15, 3).rotateX(-Math.PI / 2));
    let n = 0; const list = [];
    segs.forEach(sg => {
      if (sg.type === 'continue') { const m = new THREE.Mesh(geo('cont', () => new THREE.PlaneGeometry(0.15, 1).rotateX(-Math.PI / 2)), white); m.scale.z = sg.a - sg.de; m.position.set(0, 0.012, local((sg.de + sg.a) / 2)); m.receiveShadow = true; run.add(m); return; }
      const per = sg.type === 'annonce' ? 4.33 : 13;
      for (let S = sg.de; S < sg.a; S += per) if (free(S)) list.push(S + 1.5);
    });
    if (!list.length) return;
    const im = new THREE.InstancedMesh(dashG, white, list.length); const o = new THREE.Object3D();
    list.forEach((S, i) => { o.position.set(0, 0.012, local(S)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); n++; });
    im.receiveShadow = true; run.add(im);
  }

  /* ---------- décor ---------- */
  /* décor instancié, découpé en tronçons de 140 m : seuls les tronçons proches sont dessinés */
  const CHUNK = 140;
  function inst(geoK, geoF, material, items, cast = false) {
    if (!items.length) return null;
    const groups = new Map();
    items.forEach(it => { const k = Math.floor(-it[2] / CHUNK); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
    const o = new THREE.Object3D(), col = new THREE.Color(); let first = null;
    groups.forEach((list, k) => {
      const im = new THREE.InstancedMesh(geo(geoK, geoF), material, list.length);
      list.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.rotation.set(0, it[6] || 0, 0); o.scale.set(it[3], it[4], it[5]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (it[7] !== undefined) im.setColorAt(i, col.set(it[7])); });
      im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); run.add(im);
      chunks.push({ m: im, S0: k * CHUNK - 30, S1: (k + 1) * CHUNK + 30 }); first = first || im;
    });
    return first;
  }
  function buildDecor(env, free, spec) {
    const r = rng(spec.graine || 7), L = envLen + 120;
    const night = cfg.meteo === 'nuit';
    if (env === 'route') {
      const pines = [], round = [], trunks = [], houses = [], roofs = [], posts = [];
      for (let S = -200; S < L; S += 7 + r() * 9) for (const side of [-1, 1]) {
        if (r() < 0.45 || !free(S)) continue;
        const x = side * (9 + r() * 26), h = 5 + r() * 6;
        if (r() < 0.55) pines.push([x, h / 2, local(S), 1.5 + r(), h, 1.5 + r()]);
        else { round.push([x, 3.2 + r(), local(S), 2 + r() * 1.4, 1.8 + r(), 2 + r() * 1.4, 0, [0x4E9A52, 0x5BA65A, 0x3F8A4C][(r() * 3) | 0]]); trunks.push([x, 1.2, local(S), 1, 2.4, 1]); }
      }
      for (let S = -150; S < L; S += 140 + r() * 160) { if (!free(S)) continue; const side = r() < 0.5 ? -1 : 1, x = side * (16 + r() * 14); const rot = r() * 0.3; houses.push([x, 2, local(S), 8, 4, 7, rot, [0xF5EFE6, 0xEDE6DA, 0xF3F0EA][(r() * 3) | 0]]); roofs.push([x, 4, local(S), 8.8, 2.4, 7.6, rot]); }
      for (let S = -200; S < L; S += 50) if (free(S)) posts.push([4.3, 0.5, local(S), 1, 1, 1]);
      inst('pine', () => new THREE.ConeGeometry(1, 1, 7), mat('pineM', () => std(0x3E8A4C, { flatShading: true, roughness: 1 })), pines);
      inst('crown', () => new THREE.IcosahedronGeometry(1, 1), mat('crownM', () => std(0xffffff, { flatShading: true, roughness: 1 })), round);
      inst('trunk', () => new THREE.CylinderGeometry(0.14, 0.2, 1, 6), mat('trunkM', () => std(0x6B4F3A)), trunks);
      inst('house', () => new THREE.BoxGeometry(1, 1, 1), mat('houseM', () => std(0xffffff, { roughness: 0.9 })), houses);
      inst('roofP', () => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]), { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5), mat('roofM', () => std(0xC2593E, { roughness: 0.8 })), roofs);
      inst('post', () => new THREE.BoxGeometry(0.12, 1, 0.12), mat('postM', () => std(0xF4F4F0)), posts, false);
    }
    if (env === 'ville') {
      const blds = [], swalk = [], parked = [], trees = [], lampP = [], lampH = [], pools = [];
      const PALETTE = [0xF6F1E9, 0xE9EEF6, 0xF4E6DE, 0xE7F0EA, 0xFFFFFF, 0xF2ECF8];
      // trottoirs par tronçons (coupés aux carrefours)
      let a = -220;
      for (let S = -220; S <= L; S += 2) { if (!free(S) || S >= L) { if (S - a > 2) for (const sd of [-1, 1]) swalk.push([sd * 7.35, 0.08, local((a + S) / 2), 3.3, 0.16, S - a]); a = S + 2; } }
      for (const sd of [-1, 1]) {
        let S = -210; while (S < L) { const w = 8 + r() * 8; if (free(S) && free(S + w)) blds.push([sd * (9.5 + 5), 0, local(S + w / 2), 10, 7 + r() * 13, w - 0.6, 0, PALETTE[(r() * PALETTE.length) | 0]]); S += w; }
        const reserve = spec.reserve || []; for (let S2 = -190; S2 < L; S2 += 6 + r() * 7) { if (!free(S2) || r() < 0.35 || reserve.some(q => Math.abs(q - S2) < 9)) continue; parked.push({ S: S2, x: sd * 4.6, c: [0x3A6DF0, 0xE84A4A, 0x2E3440, 0xF4F6FA, 0x9AA3AF, 0x2FA37A, 0xF2B233][(r() * 7) | 0], sd }); S2 += 3; }
        for (let S2 = -190; S2 < L; S2 += 18) if (free(S2)) { trees.push([sd * 6.4, 3.4, local(S2), 1.5, 1.6, 1.5, 0, [0x5BA65A, 0x4E9A52][Math.abs(S2 | 0) % 2]]); }
        for (let S2 = -208; S2 < L; S2 += 26) if (free(S2)) { lampP.push([sd * 6.0, 3, local(S2), 1, 6, 1]); lampH.push([sd * 5.0, 6.05, local(S2), 1, 1, 1]); pools.push([sd * 4.2, 0.03, local(S2), 9, 1, 9]); }
      }
      inst('bld', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat('bldM', () => new THREE.MeshStandardMaterial({ map: tex(canvas(256, 512, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); for (let yy = 30; yy < h - 90; yy += 62) for (let xx = 18; xx < w - 30; xx += 60) { x.fillStyle = '#8FA6C4'; x.fillRect(xx, yy, 36, 40); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(xx, yy, 36, 4); } x.fillStyle = '#6E7F98'; x.fillRect(0, h - 70, w, 70); x.fillStyle = '#B9C8DB'; x.fillRect(16, h - 62, w - 32, 50); })), roughness: 0.9 })), blds.map(b => [b[0] + (b[0] > 0 ? b[3] / 2 - 5 : -b[3] / 2 + 5), b[1], b[2], b[3], b[4], b[5], 0, b[7]]));
      inst('swk', () => new THREE.BoxGeometry(1, 1, 1), mat('swkM', () => std(0xD8DCE3, { roughness: 0.95 })), swalk, false);
      inst('crownV', () => new THREE.IcosahedronGeometry(1, 1), mat('crownM', () => std(0xffffff, { flatShading: true, roughness: 1 })), trees);
      inst('trunk', () => new THREE.CylinderGeometry(0.14, 0.2, 1, 6), mat('trunkM', () => std(0x6B4F3A)), trees.map(t => [t[0], 1.3, t[2], 1, 2.6, 1]));
      inst('lampP', () => new THREE.CylinderGeometry(0.06, 0.09, 1, 8), mat('lampPM', () => std(0x59606B, { metalness: 0.6, roughness: 0.4 })), lampP);
      inst('lampH', () => new THREE.BoxGeometry(2.2, 0.12, 0.4), night ? glow(0xffe2b0, 3) : mat('lampHM', () => std(0xE9EEF5)), lampH, false);
      if (night) { const pm = mat('poolM', () => new THREE.MeshBasicMaterial({ map: K.radial(), color: 0xffc98a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); inst('pool', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), pm, pools, false); }
      if (parked.length) {
        const paint = mat('paintI', () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.35 }));
        const glass = mat('glass', () => new THREE.MeshStandardMaterial({ color: 0x172235, roughness: 0.08, metalness: 0.45 }));
        const P0 = parked.map(p => [p.x, 0, local(p.S)]);
        const put = (k, f, m, dy, dz, sc, col) => inst(k, f, m, P0.map((q, i) => [q[0], q[1] + dy, q[2] + dz, sc[0], sc[1], sc[2], 0, col ? parked[i].c : undefined]));
        put('body4.2i', () => new RoundedBoxGeometry(1.82, 0.6, 4.2, 2, 0.2), paint, 0.62, 0, [1, 1, 1], true);
        put('skirt4.2', () => new RoundedBoxGeometry(1.86, 0.18, 3.9, 2, 0.06), mat('trim', () => std(0x2a2f38, { roughness: 0.6 })), 0.36, 0, [1, 1, 1]);
        put('cabI', () => new RoundedBoxGeometry(1.6, 0.54, 2.2, 2, 0.24), glass, 1.12, 0.2, [1, 1, 1]);
        put('roof', () => new RoundedBoxGeometry(1.5, 0.09, 1.72, 2, 0.04), paint, 1.4, 0.26, [1, 1, 1], true);
        const wheels = []; P0.forEach(q => [[-0.8, -1.35], [0.8, -1.35], [-0.8, 1.4], [0.8, 1.4]].forEach(([x, z]) => wheels.push([q[0] + x, 0.35, q[2] + z, 1, 1, 1])));
        inst('wheelI', () => new THREE.CylinderGeometry(0.35, 0.35, 0.26, 12).rotateZ(Math.PI / 2), mat('tire', () => std(0x1c1f25, { roughness: 0.92 })), wheels);
        put('tailI', () => new THREE.BoxGeometry(1.5, 0.12, 0.05), mat('tailM', () => new THREE.MeshStandardMaterial({ color: 0x8a0d18, emissive: 0xff1a2a, emissiveIntensity: 0.25 })), 0.76, 2.11, [1, 1, 1]);
      }
    }
    if (env === 'autoroute') {
      const rails = [], posts = [], far = [], opp = [];
      for (let S = -200; S < L; S += 4) { posts.push([6.6, 0.4, local(S), 1, 1, 1]); posts.push([-3.95, 0.4, local(S), 1, 1, 1]); }
      for (let S = -200; S < L; S += 9 + r() * 12) for (const sd of [-1, 1]) if (r() < 0.5) far.push([sd > 0 ? 12 + r() * 30 : -24 - r() * 30, 3.5, local(S), 2 + r(), 2 + r(), 2 + r(), 0, [0x4E9A52, 0x5BA65A, 0x3F8A4C][(r() * 3) | 0]]);
      inst('post', () => new THREE.BoxGeometry(0.12, 1, 0.12), mat('postM', () => std(0xF4F4F0)), posts, false);
      const rail = mat('railM', () => std(0xC6CCD4, { metalness: 0.7, roughness: 0.35 }));
      for (const x of [6.6, -3.95]) { const m = new THREE.Mesh(geo('rail', () => new THREE.BoxGeometry(0.08, 0.32, 1)), rail); m.scale.z = L + 240; m.position.set(x, 0.7, local(L / 2 - 100)); m.castShadow = true; run.add(m); rails.push(m); }
      const med = new THREE.Mesh(geo('med', () => new THREE.BoxGeometry(0.6, 0.9, 1)), mat('medM', () => std(0xD5D8DC))); med.scale.z = L + 240; med.position.set(-4.4, 0.45, local(L / 2 - 100)); med.castShadow = true; run.add(med);
      const oppRoad = new THREE.Mesh(geo('oppR', () => new THREE.PlaneGeometry(8, 1).rotateX(-Math.PI / 2)), roadMat); oppRoad.scale.z = L + 240; oppRoad.position.set(-9.4, 0.001, local(L / 2 - 100)); oppRoad.receiveShadow = true; run.add(oppRoad);
      inst('crownA', () => new THREE.IcosahedronGeometry(1, 1), mat('crownM', () => std(0xffffff, { flatShading: true, roughness: 1 })), far);
      void opp; void rails;
    }
  }

  /* ======================= Acteurs ======================= */
  /* Un acteur : un groupe 3D posé en (S, x), avec une vitesse sur la route (vS) et en travers (vx).
     Le cap du modèle suit automatiquement son déplacement. */
  function actor(g, o = {}) {
    const a = { g, S: o.S || 0, x: o.x || 0, y: o.y || 0, vS: o.vS || 0, vx: o.vx || 0, kind: o.kind, len: o.len || 4.2, wid: o.wid || 1.8, alive: true, heading: o.heading, brake: false, data: o.data || {}, tick: null, hit: null };
    g.position.set(a.x, a.y, local(a.S)); if (a.heading !== undefined) g.rotation.y = a.heading;
    run.add(g); own(g); actors.push(a);
    a.go = (vS = 0, vx = 0) => { a.vS = vS; a.vx = vx; return a; };
    a.remove = () => { a.alive = false; run.remove(g); };
    a.dispose = () => {};
    a.ahead = () => a.S - P.s;
    return a;
  }
  const API = {
    voiture(o = {}) { const g = carMesh(o.couleur ?? [0x3A6DF0, 0xE84A4A, 0x2E3440, 0x9AA3AF, 0x2FA37A][(Math.random() * 5) | 0], { gyro: o.gyro, long: o.long }); return actor(g, { kind: 'voiture', ...o, heading: o.heading ?? (o.sens === -1 ? Math.PI : 0) }); },
    ambulance(o = {}) { return API.voiture({ gyro: true, ...o, couleur: o.couleur ?? 0xF4F6FA }); },
    pieton(o = {}) { const g = personMesh(o); return actor(g, { kind: 'pieton', len: 0.5, wid: 0.5, ...o }); },
    enfant(o = {}) { return API.pieton({ enfant: true, haut: 0xFF5A5F, cartable: true, ...o }); },
    velo(o = {}) { const g = bikeMesh(o); return actor(g, { kind: 'velo', len: 1.8, wid: 0.7, ...o }); },
    biche(o = {}) { const g = deerMesh(); return actor(g, { kind: 'biche', len: 1.4, wid: 0.6, ...o }); },
    ballon(o = {}) { const g = ballMesh(); return actor(g, { kind: 'ballon', len: 0.3, wid: 0.3, ...o }); },
    tracteur(o = {}) { const g = tractorMesh(); return actor(g, { kind: 'tracteur', len: 4, wid: 2.2, ...o }); },
    bus(o = {}) { const g = busMesh(o.couleur ?? 0x1E5BFF); return actor(g, { kind: 'bus', len: 11, wid: 2.5, ...o, heading: o.heading ?? (o.sens === -1 ? Math.PI : 0) }); },
    camion(o = {}) { const g = busMesh(o.couleur ?? 0xE84A4A, true); return actor(g, { kind: 'camion', len: 11, wid: 2.5, ...o, heading: o.heading ?? (o.sens === -1 ? Math.PI : 0) }); },
    moto(o = {}) { const g = motoMesh(o); return actor(g, { kind: 'moto', len: 2.1, wid: 0.8, ...o }); },
    tram(o = {}) { const g = tramMesh(o.couleur ?? 0x2FA37A); return actor(g, { kind: 'tram', len: 23, wid: 2.5, ...o, heading: o.heading ?? (o.sens === -1 ? Math.PI : 0) }); },
    triangle(o = {}) { const g = triangleMesh(); return actor(g, { kind: 'triangle', len: 0.4, wid: 0.6, ...o }); },
    feu(o = {}) { const g = lightMesh(); const a = actor(g, { kind: 'feu', len: 0.3, wid: 0.3, x: 4.3, ...o }); a.set = st => setLight(g, st); a.set(o.etat || 'vert'); return a; },
    portiere(o = {}) {
      const g = carMesh(o.couleur ?? 0x2E3440); const door = new THREE.Group(); door.position.set(-0.92, 0.62, -0.55);
      const d = new THREE.Mesh(geo('door', () => new RoundedBoxGeometry(0.08, 0.95, 1.05, 2, 0.03).translate(0, 0.1, 0.52)), M['paint' + (o.couleur ?? 0x2E3440)]); door.add(d); g.add(door);
      const p = personMesh({ haut: 0x5856D6 }); p.scale.setScalar(0.92); p.position.set(-0.35, -0.55, 0.1); g.add(p);
      const a = actor(g, { kind: 'portiere', x: 4.6, ...o }); a.open = (ms = 650) => K.tween(ms, e => { door.rotation.y = -1.05 * e; }); return a;
    },
    panneau(id, S, x = 4.3, o = {}) { const g = K.makeSign(id, o.taille || 0.9, o.mat ?? 1.35, 0.15); g.position.set(x, 0, local(S)); if (o.face) g.rotation.y = o.face; run.add(g); signs.push(g); return g; },
    /* marquage au sol : flèche ou « BUS », posé dans une voie (x = centre de la voie) */
    marquage(S, x, kind) {
      const m = new THREE.Mesh(geo('mark', () => new THREE.PlaneGeometry(2.25, 4.5).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: markTex(kind, K), transparent: true, depthWrite: false, toneMapped: false, color: cfg.meteo === 'nuit' ? 0x9aa0a8 : 0xffffff }));
      ownMats.push(m.material); m.position.set(x, 0.016, local(S)); m.renderOrder = 1; run.add(m); return m;
    },
    /* voie de tramway qui traverse la route en S */
    rails(S) {
      const steel = mat('railS', () => std(0x9AA1AB, { metalness: 0.8, roughness: 0.35 })), slab = mat('railB', () => std(0x5C6168, { roughness: 0.9 }));
      const bed = new THREE.Mesh(geo('railBed', () => new THREE.PlaneGeometry(1, 2.6).rotateX(-Math.PI / 2)), slab); bed.scale.x = 160; bed.position.set(0, 0.009, local(S)); bed.receiveShadow = true; run.add(bed);
      for (const dz of [-0.72, 0.72]) { const r = new THREE.Mesh(geo('railL', () => new THREE.BoxGeometry(1, 0.04, 0.09)), steel); r.scale.x = 160; r.position.set(0, 0.02, local(S) + dz); run.add(r); }
    },
    passage(S, o = {}) {
      const white = mat('paintW', () => new THREE.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.6 }));
      const half = (o.largeur || (cfg.env === 'ville' ? 11.4 : 7)) / 2;
      for (let x = -half + 0.5; x < half - 0.3; x += 1.0) { const m = new THREE.Mesh(geo('zebra', () => new THREE.PlaneGeometry(0.5, 4).rotateX(-Math.PI / 2)), white); m.position.set(x, 0.014, local(S)); m.receiveShadow = true; run.add(m); }
    },
    ligneStop(S, type = 'stop') {
      const white = mat('paintW', () => new THREE.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.6 }));
      if (type === 'stop' || type === 'feu') { const m = new THREE.Mesh(geo('stopL', () => new THREE.PlaneGeometry(3.4, 0.5).rotateX(-Math.PI / 2)), white); m.position.set(LANE, 0.014, local(S)); run.add(m); }
      else for (let x = 0.2; x < 3.4; x += 0.85) { const m = new THREE.Mesh(geo('cedL', () => new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2)), white); m.position.set(x + 0.25, 0.014, local(S)); run.add(m); }
    },
    carrefour(S, o = {}) {
      const asph = mat('crossM', () => new THREE.MeshStandardMaterial({ color: 0x666b73, roughness: 0.85 }));
      const w = o.largeur || 7;
      const parts = o.forme === 'T-droite' ? [[0, 100]] : o.forme === 'T-gauche' ? [[-100, 0]] : [[-100, 100]];
      parts.forEach(([x0, x1]) => { const m = new THREE.Mesh(geo('crossR', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), asph); m.scale.set(x1 - x0, 1, w); m.position.set((x0 + x1) / 2, 0.006, local(S)); m.receiveShadow = true; run.add(m); });
      if (o.ligne) API.ligneStop(S - w / 2 - 0.6, o.ligne);
      if (cfg.env === 'ville') { const sw = mat('swkM', () => std(0xD8DCE3, { roughness: 0.95 })); for (const sd of [-1, 1]) for (const dz of [-1, 1]) { if ((o.forme === 'T-droite' && sd < 0) || (o.forme === 'T-gauche' && sd > 0)) continue; const m = new THREE.Mesh(geo('swc', () => new THREE.BoxGeometry(1, 0.16, 3.3)), sw); m.scale.x = 40; m.position.set(sd * 26, 0.08, local(S + dz * (w / 2 + 1.65))); run.add(m); } }
    },
    giratoire(S, o = {}) {
      const R0 = o.rIn || 7, R1 = o.rOut || 14, cz = local(S + R1);
      const ring = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(7, 14, 72).rotateX(-Math.PI / 2)), mat('crossM', () => new THREE.MeshStandardMaterial({ color: 0x666b73, roughness: 0.85 })));
      ring.position.set(0, 0.008, cz); ring.receiveShadow = true; run.add(ring);
      const isl = new THREE.Mesh(geo('isl', () => new THREE.CylinderGeometry(6.6, 7, 0.4, 64)), mat('islM', () => std(0x8CC46E, { roughness: 1 }))); isl.position.set(0, 0.2, cz); isl.receiveShadow = true; run.add(isl);
      const curb = new THREE.Mesh(geo('islC', () => new THREE.TorusGeometry(6.8, 0.18, 6, 72).rotateX(Math.PI / 2)), mat('swkM', () => std(0xD8DCE3))); curb.position.set(0, 0.2, cz); run.add(curb);
      const t = new THREE.Mesh(geo('crownV2', () => new THREE.IcosahedronGeometry(2.2, 1)), mat('crownG', () => std(0x5BA65A, { flatShading: true }))); t.position.set(0, 3.2, cz); t.castShadow = true; run.add(t);
      API.ligneStop(S - 0.4, 'cedez');
      return { cz, R: (R0 + R1) / 2, S };
    },
    chevrons(de, a, pas = 40) {
      const white = mat('paintW', () => new THREE.MeshStandardMaterial({ color: 0xF2F2EC, roughness: 0.6 }));
      for (let S = de; S < a; S += pas) for (const sd of [-1, 1]) { const m = new THREE.Mesh(geo('chev', () => new THREE.PlaneGeometry(0.25, 1.7).rotateX(-Math.PI / 2)), white); m.position.set(LANE + sd * 0.48, 0.014, local(S) + 0.4); m.rotation.y = sd * 0.75; run.add(m); }
    }
  };

  function updateActors(dt, t) {
    for (const a of actors) {
      if (!a.alive) continue;
      if (a.tick) a.tick(dt, t, a);
      a.g.visible = Math.abs(a.S - P.s) < 280;
      const dS = a.vS * dt, dx = a.vx * dt;
      a.S += dS; a.x += dx;
      const g = a.g; g.position.set(a.x, a.y, local(a.S));
      const sp = Math.hypot(a.vS, a.vx);
      if (sp > 0.05 && !a.fixedHeading) g.rotation.y = Math.atan2(-a.vx, a.vS);
      const dist = sp * dt;
      if (a.kind === 'pieton') animWalk(g, dist, sp > 2.2);
      else if (a.kind === 'velo') animBike(g, dist);
      else if (a.kind === 'biche') animDeer(g, dist);
      else if (a.kind === 'ballon') { const b = g.userData.ball; b.rotation.z -= dx / 0.12; b.rotation.x -= dS / 0.12; }
      else if (g.userData.wheels) g.userData.wheels.forEach(w => { w.rotation.x -= dS / 0.35; });
      if (g.userData.tail) g.userData.tail.emissiveIntensity = a.brake ? 3.2 : cfg.meteo === 'nuit' ? 1.2 : 0.25;
      if (g.userData.head) g.userData.head.emissiveIntensity = cfg.meteo === 'nuit' || cfg.meteo === 'brouillard' ? 2.5 : 0.25;
      if (g.userData.gyro) { const on = Math.sin(t * 14) > 0; g.userData.gyro[0].emissiveIntensity = on ? 4 : 0.1; g.userData.gyro[1].emissiveIntensity = on ? 0.1 : 4; }
      if (g.userData.beacon) g.userData.beacon.emissiveIntensity = 1.5 + Math.sin(t * 9) * 1.5;
    }
  }

  /* ======================= Caméra ======================= */
  const POSES = {
    cockpit: () => ({ pos: V(P.x - 0.36, 1.2, 0.25), target: V(P.x - 0.3, 0.1, -30), fov: 58 }),
    poursuite: () => ({ pos: V(P.x - 0.2, 3.1, 8.6), target: V(P.x, 1.0, -14), fov: 52 }),
    drone: () => ({ pos: V(P.x * 0.4, 19, 10), target: V(0.6, 0, -13), fov: 72 }),
    haut: () => ({ pos: V(0.6, 34, -4), target: V(0.4, 0, -22), fov: 46 }),
    cote: () => ({ pos: V(-9, 2.2, -6), target: V(2, 1, -16), fov: 50 }),
    bilan: () => ({ pos: V(P.x + 7.5, 12, 21), target: V(P.x, 0, -5), fov: 50 }),
    vue: () => ({ pos: V(P.x - 0.36, 1.25, 0.25), target: V(P.x + 0.4, 0.4, -30), fov: 68 }),
    arriere: () => ({ pos: V(P.x + 2.6, 4.2, -9), target: V(P.x - 0.4, 0.8, 9), fov: 56 })
  };
  function pose(name, ms = 1100) {
    const to = typeof name === 'string' ? POSES[name] : () => name;
    if (typeof name === 'string') camMode = name;
    const from = { pos: camT.pos.clone(), target: camT.target.clone(), fov: camT.fov };
    camFree = to;
    if (!ms) { const p = to(); camT.pos.copy(p.pos); camT.target.copy(p.target); camT.fov = p.fov; camBlend = 1; return Promise.resolve(); }
    camFrom = from; camBlend = 0;
    return K.tween(ms, e => { camBlend = e; }, K.ease.io);
  }
  let camFrom = null, camBlend = 1;

  /* ======================= Feux du véhicule ======================= */
  function lights(c) {
    Object.assign(lightsCfg, c);
    const night = cfg.meteo === 'nuit', murk = night || cfg.meteo === 'brouillard' || cfg.meteo === 'pluie';
    heads.forEach(l => {
      l.intensity = lightsCfg.route ? (night ? 140 : 20) : lightsCfg.croisement ? (night ? 70 : 10) : lightsCfg.position ? (night ? 2 : 0) : 0;
      l.distance = lightsCfg.route ? 150 : 60; l.angle = lightsCfg.route ? 0.3 : 0.5;
      l.userData.far = lightsCfg.route ? -120 : -28;
    });
    fogLamps.forEach(l => { l.intensity = lightsCfg.brouillardAv ? (murk ? 30 : 6) : 0; });
  }
  /* tunnel : murs, voûte et éclairage, entre deux positions S */
  function tunnel(de, a) {
    const len = a - de, mid = local((de + a) / 2);
    const wall = mat('tunW', () => std(0x8C929C, { roughness: 0.9 })), dark = mat('tunD', () => std(0x4A5059, { roughness: 1 }));
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(geo('tunWall', () => new THREE.BoxGeometry(0.6, 5.6, 1)), wall); w.scale.z = len; w.position.set(sx * 4.9, 2.8, mid); w.castShadow = true; w.receiveShadow = true; run.add(w); }
    const roof = new THREE.Mesh(geo('tunRoof', () => new THREE.BoxGeometry(10.4, 0.6, 1)), dark); roof.scale.z = len; roof.position.set(0, 5.9, mid); roof.castShadow = true; run.add(roof);
    const portal = new THREE.Mesh(geo('tunPortal', () => new THREE.BoxGeometry(13, 7.5, 1.2)), mat('tunP', () => std(0xB9BFC8, { roughness: 0.8 })));
    const hole = new THREE.Mesh(geo('tunHole', () => new THREE.PlaneGeometry(9.2, 5.6)), mat('tunHoleM', () => new THREE.MeshBasicMaterial({ color: 0x0b0e14 }))); void hole;
    for (const S of [de]) { for (const sx of [-1, 1]) { const p = new THREE.Mesh(geo('tunJamb', () => new THREE.BoxGeometry(2.2, 7.5, 1.2)), portal.material); p.position.set(sx * 6.3, 3.75, local(S) + 0.6); p.castShadow = true; run.add(p); } const top = new THREE.Mesh(geo('tunTop', () => new THREE.BoxGeometry(13, 1.6, 1.2)), portal.material); top.position.set(0, 6.7, local(S) + 0.6); top.castShadow = true; run.add(top); }
    const lamps = []; for (let S = de + 3; S < a; S += 6) for (const sx of [-1, 1]) lamps.push([sx * 3.6, 5.5, local(S), 1, 1, 1]);
    inst('tunLamp', () => new THREE.BoxGeometry(0.5, 0.12, 1.6), glow(0xffd29a, 2.2), lamps);
  }

  /* ======================= Boucle ======================= */
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0);
  const W = {
    scene: s,
    bloom: 0.22,
    LANE, FRONT,
    get player() { return P; },
    get cfg() { return cfg; },
    get actors() { return actors; },
    enter() {},
    load, clear: clearRun, pose, lights,
    get lightsCfg() { return { ...lightsCfg }; },
    tunnel,
    meteo(m) { cfg.meteo = m; applyWeather(m, cfg.env); lights(lightsCfg); },
    ...API,
    ahead,
    local,
    onTick(f) { ticks.add(f); return () => ticks.delete(f); },
    auto(kmh, acc) { P.mode = 'auto'; P.target = kmh / 3.6; if (acc) P.acc = acc; else P.acc = 0; },
    manual() { P.mode = 'manual'; },
    pedals(gas, brake) { P.gas = gas; P.brake = brake; },
    emergency() { P.mode = 'code'; },
    kmh: () => P.v * 3.6,
    lane(x, ms = 1600) { const x0 = P.x; return K.tween(ms, e => { P.x = lerp(x0, x, e); }, K.ease.io); },
    shake(k = 1) { shakeK = Math.max(shakeK, k); },
    showMe(v) { me.visible = v; },
    setPick(list) { pick = list; },
    pickables: () => pick,
    setAnchors(list) { anchorList = list; },
    anchors() { return anchorList.map(a => { const o = a.obj; const p = new THREE.Vector3(); (o.isObject3D ? o : o.g).getWorldPosition(p); p.y += a.dy ?? 1.9; return { id: a.id, p }; }); },
    /* bandes colorées sur la chaussée : réaction (orange) + freinage (rouge) */
    bandes(S0, dReac, dFrein) {
      const mk = (from, len, color) => { if (len <= 0.05) return; const m = new THREE.Mesh(geo('band', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })); ownMats.push(m.material); m.scale.set(2.6, 1, len); m.position.set(P.x, 0.02, local(from + len / 2)); run.add(m); K.tween(500, e => { m.material.opacity = 0.62 * e; }); return m; };
      return [mk(S0, dReac, 0xFF9F0A), mk(S0 + dReac, dFrein, 0xFF375F)];
    },
    slow(k, ms = 450) { const k0 = timeScale; if (!ms) { timeScale = k; return Promise.resolve(); } return K.tween(ms, e => { timeScale = lerp(k0, k, e); }, K.ease.io); },
    get timeScale() { return timeScale; },
    guide(len, color) { guideLen = len; guide.visible = len > 0.5; if (color !== undefined) guide.material.color.set(color); },
    maisons(de, a, graine = 3) {
      const r = rng(graine), H = [], R2 = [];
      for (let S = de; S < a; S += 13 + r() * 6) for (const sd of [-1, 1]) { if (r() < 0.2) continue; const x = sd * (10.5 + r() * 3), rot = (r() - 0.5) * 0.1; H.push([x, 2.2, local(S), 8, 4.4, 9, rot, [0xF7F1E8, 0xEFE8DC, 0xF2EEE6, 0xE9EEF4][(r() * 4) | 0]]); R2.push([x, 4.4, local(S), 8.8, 2.6, 9.6, rot]); }
      inst('house', () => new THREE.BoxGeometry(1, 1, 1), mat('houseM', () => std(0xffffff, { roughness: 0.9 })), H);
      inst('roofP', () => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]), { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5), mat('roofM', () => std(0xC2593E, { roughness: 0.8 })), R2);
    },
    /* zoom de la caméra sur un objet (panneau, acteur) sans la déplacer : k = part du regard tournée vers l'objet */
    regarde(o, fov = 20, ms = 1000, k = 1, dy = 0) {
      const p = new THREE.Vector3(); const obj = o.isObject3D ? (o.userData.head || o) : o.g; obj.getWorldPosition(p); p.y += dy;
      const base = (POSES[camMode] || POSES.vue)();
      return pose({ pos: base.pos, target: base.target.clone().lerp(p, k), fov }, ms);
    },
    eclaire(g, color = 0xffc629, ms = 1200) { if (g && g.userData && g.userData.halo && K.flashSign) return K.flashSign(g, color, ms); },
    hitbox(a, w = 1.2, h = 2, d = 1.2, dy = 0) { const m = new THREE.Mesh(geo('hit', () => new THREE.BoxGeometry(1, 1, 1)), mat('hitM', () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))); m.scale.set(w, h, d); m.position.y = h / 2 + dy; (a.g || a).add(m); return m; },
    marque(S, x, color = 0x34C759) { const m = new THREE.Mesh(geo('mark', () => new THREE.RingGeometry(0.5, 0.62, 40).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false })); ownMats.push(m.material); m.position.set(x, 0.03, local(S)); run.add(m); return m; },
    update(dt, t) {
      dt *= timeScale;
      // conduite
      const v0 = P.v;
      if (P.mode === 'auto') { const d = P.target - P.v; const acc = d > 0 ? (P.acc || 2.4) : (P.acc || 3.6); P.v += Math.sign(d) * Math.min(Math.abs(d), acc * dt); }
      else if (P.mode === 'manual') {
        if (P.brake > 0) P.v -= 6.5 * P.brake * dt;
        else if (P.gas > 0) P.v += P.gas * (3.4 * (1 - P.v / 42) + 0.3) * dt;
        else P.v -= (0.45 + P.v * 0.012) * dt;
      } else if (P.mode === 'code') P.v -= P.decel * dt;
      P.v = Math.max(0, P.v);
      if (stopAtEnd && P.s > envLen - 60) P.v = Math.max(0, P.v - 8 * dt);
      P.lastA = (P.v - v0) / Math.max(dt, 1e-4);
      P.s += P.v * dt;
      root.position.z = P.s;
      for (const c of chunks) c.m.visible = c.S1 > P.s - 40 && c.S0 < P.s + 360;
      const ox = roadX[cfg.env] || 0;
      if (roadMat.map) roadMat.map.offset.y = (P.s / (cfg.env === 'ville' ? 26 : 24)) % 1;
      road.position.x = ox;
      updateActors(dt, t);
      ticks.forEach(f => { try { f(dt, t); } catch (e) { console.error(e); } });
      if (guide.visible) { guide.scale.z = guideLen; guide.position.set(P.x, 0.025, -FRONT - guideLen / 2); }
      // pluie / neige
      if (rain.visible) { for (let i = 0; i < RAIN_N; i++) { const d = drops[i]; d.y -= 22 * dt; d.z += (P.v * 0.9 + 2) * dt; if (d.y < 0 || d.z > 6) { d.y = 8 + Math.random() * 8; d.z = -Math.random() * 60 + 4; d.x = (Math.random() - 0.5) * 40; } rp[i * 6] = d.x; rp[i * 6 + 1] = d.y; rp[i * 6 + 2] = d.z; rp[i * 6 + 3] = d.x; rp[i * 6 + 4] = d.y + 0.35; rp[i * 6 + 5] = d.z - 0.02 - P.v * 0.012; } rainGeo.attributes.position.needsUpdate = true; }
      if (snow.visible) { const sp = snowGeo.attributes.position.array; for (let i = 0; i < RAIN_N; i++) { const d = drops[i]; d.y -= 1.6 * dt; d.z += (P.v * 0.9 + 0.5) * dt; d.x += Math.sin(t + i) * 0.3 * dt; if (d.y < 0 || d.z > 6) { d.y = 6 + Math.random() * 8; d.z = -Math.random() * 60 + 4; d.x = (Math.random() - 0.5) * 40; } sp[i * 3] = d.x; sp[i * 3 + 1] = d.y; sp[i * 3 + 2] = d.z; } snowGeo.attributes.position.needsUpdate = true; }
      // soleil (ombres qui suivent la voiture)
      sun.target.position.set(0, 0, -24); sun.position.copy(sun.target.position).add(V(-38, 70, 30));
      // nous
      hood.position.set(P.x - 0.02, 0.3, -2.0); hood.visible = false;
      me.position.set(P.x, 0, 0.1); me.visible = camMode !== 'cockpit' && camMode !== 'vue';
      me.userData.wheels.forEach(w => { w.rotation.x -= P.v * dt / 0.35; });
      const lit = lightsCfg.croisement || lightsCfg.route || lightsCfg.position;
      me.userData.tail.emissiveIntensity = (P.lastA < -1.5 || P.brake > 0) ? 3.2 : lit ? 1.4 : 0.25;
      me.userData.head.emissiveIntensity = lightsCfg.route || lightsCfg.croisement ? 3 : lightsCfg.position ? 1.2 : 0.25;
      const blink = Math.sin(t * 8) > 0;
      amber.emissiveIntensity = (lightsCfg.detresse || lightsCfg.clignotant === 'g') && blink ? 4 : 0.1;
      amberR.emissiveIntensity = (lightsCfg.detresse || lightsCfg.clignotant === 'd') && blink ? 4 : 0.1;
      fogR.emissiveIntensity = lightsCfg.brouillardAr ? 4 : 0;
      heads.forEach(l => { l.position.set(P.x + l.userData.dx, 0.72, -2.0); l.target.position.set(P.x + l.userData.dx * 2, 0, l.userData.far || -28); });
      fogLamps.forEach(l => { l.position.set(P.x + l.userData.dx, 0.4, -2.1); l.target.position.set(P.x + l.userData.dx * 4, 0, -12); });
      // caméra
      const p = camFree ? camFree() : POSES.cockpit();
      if (camBlend < 1 && camFrom) { camT.pos.copy(camFrom.pos).lerp(p.pos, camBlend); camT.target.copy(camFrom.target).lerp(p.target, camBlend); camT.fov = lerp(camFrom.fov, p.fov, camBlend); }
      else { camT.pos.copy(p.pos); camT.target.copy(p.target); camT.fov = p.fov; }
      const cam = K.camera();
      const sway = camMode === 'cockpit' || camMode === 'vue' ? Math.min(1, P.v / 20) : 0;
      shakeK *= Math.pow(0.02, dt);
      tmpA.set((Math.random() - 0.5) * shakeK * 0.12, Math.sin(t * 7.1) * 0.006 * sway + (Math.random() - 0.5) * shakeK * 0.1, 0);
      cam.position.copy(camT.pos).add(tmpA);
      tmpB.copy(camT.target);
      cam.lookAt(tmpB);
      if (camMode === 'cockpit') cam.rotateZ(Math.sin(t * 0.6) * 0.003 * sway);
      K.setFov(camT.fov);
    }
  };
  load({ env: 'route', meteo: 'jour', kmh: 0 });
  return W;
}
