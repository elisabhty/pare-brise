/* Pont vers le moteur 3D, avec un repli 2D si WebGL n'est pas disponible.
   Le reste de l'app n'appelle que R (route), SALLE et STUDIO : le même code marche dans les deux cas. */
import '../engine/engine.js';
import { factory, sign, inner, genericInner } from './signs.js';
import { $, wait, haptic } from './util.js';
import { Sound } from './sound.js';

const E = window.Engine;
export const has3D = !!(E && E.init(document.getElementById('gl')));
if (!has3D) document.getElementById('app').classList.add('no3d');
export const Engine = E;
export let R, SALLE, STUDIO;

export function roadPhoto(ids) {
  const posts = ids.length === 1 ? [{ x: 258, s: 74 }] : [{ x: 210, s: 60 }, { x: 274, s: 60 }];
  let s = `<svg viewBox="0 0 320 180" style="width:100%;height:100%" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="skyE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F7BEA"/><stop offset="1" stop-color="#D8EBFF"/></linearGradient></defs><rect width="320" height="180" fill="url(#skyE)"/><rect y="102" width="320" height="78" fill="#7FB062"/><polygon points="150,101 170,101 276,180 44,180" fill="#5E636B"/>`;
  ids.forEach((id, k) => { const p = posts[k]; if (!p) return; s += `<rect x="${p.x - 1.8}" y="${26 + p.s * .8}" width="3.6" height="${124 - p.s * .8}" fill="#80868F"/><svg x="${p.x - p.s / 2}" y="26" width="${p.s}" height="${p.s}" viewBox="0 0 100 100">${inner(id)}</svg>`; });
  return s + '</svg>';
}

if (has3D) {
  E.setSignFactory(factory);
  R = E.get('route'); SALLE = E.get('salle'); STUDIO = E.get('studio');
  E.on('rise', () => Sound.ui('rise'));
  E.on('neon', () => Sound.ui('neon'));
  E.on('sit', () => { Sound.ui('sit'); haptic('heavy'); });
} else {
  const box = id => $('#' + id);
  let moving = [], spd = 0, target = 0, passCb = () => {};
  const loop = () => {
    spd += Math.sign(target - spd) * Math.min(Math.abs(target - spd), 0.3);
    const wrap = box('fb-pb');
    if (wrap) {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      moving.forEach(m => { m.z -= spd / 60; const k = 1 - Math.max(0, m.z) / 80, s = 12 + 160 * k * k; m.el.style.width = m.el.style.height = s + 'px'; m.el.style.left = (w * 0.52 + w * 0.6 * k * k) + 'px'; m.el.style.top = (h * 0.46 - s * 1.2 * k) + 'px'; if (m.z <= 0 && !m.passed) { m.passed = true; passCb(m.handle); } if (m.z < -6) m.el.remove(); });
      moving = moving.filter(m => m.z > -6);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const fb = () => box('fb-cours');
  R = {
    get kmh() { return Math.round(spd * 3.6); }, get speed() { return spd; },
    setSpeed(k) { target = k / 3.6; }, setHood() {}, pose: async () => {},
    reset() { moving.forEach(m => m.el.remove()); moving = []; if (fb()) fb().innerHTML = ''; },
    async present(ids) { fb().innerHTML = ids.map((id, k) => sign(id, `data-k="${k}" style="animation-delay:${k * 0.15}s"`)).join(''); return true; },
    async outline() {}, async clearShowcase() { fb().innerHTML = ''; }, async drive() { fb().innerHTML = ''; },
    burst(ids) { fb().innerHTML = ids.slice(0, 6).map(id => sign(id)).join(''); },
    async markers(list) { fb().innerHTML = `<div class="fb-marks">${list.map(([d, l]) => `<div><b>${d} m</b><span>${l}</span></div>`).join('')}</div>`; return true; },
    clearMarkers() {},
    spawn(id) { const el = document.createElement('img'); el.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sign(id, 'width="200" height="200"')); box('fb-pb').appendChild(el); const m = { el, z: 80, passed: false }; m.handle = { id, get dist() { return Math.max(0, m.z); }, get passed() { return m.passed; }, flash: () => {} }; moving.push(m); return m.handle; },
    clearMoving() { moving.forEach(m => m.el.remove()); moving = []; },
    async exam(ids) { const b = box('fb-serie'); if (b) b.innerHTML = roadPhoto(ids || []); }, clearExam() {},
    flash(i, ok) { const el = fb().children[i]; if (el) el.style.filter = `drop-shadow(0 0 18px ${ok ? '#12A150' : '#D7263D'})`; }, dim() {},
    onPass(f) { passCb = f; }
  };
  SALLE = { setPoster() {}, look() {}, setDrag() {}, takeSeat: () => wait(400), reset: async () => {}, focusScreen: async () => {}, snapIdle() {} };
  STUDIO = { setSign(id) { box('fb-dec').innerHTML = id.startsWith('GEN:') ? `<svg viewBox="0 0 100 100" style="width:46%">${genericInner(...id.split(':').slice(1))}</svg>` : sign(id); } };
}
