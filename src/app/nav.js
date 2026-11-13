/* Navigation entre écrans : chaque écran déclare son monde 3D, son ambiance sonore et ses hooks. */
import { $, $$, wait, haptic } from './util.js';
import { has3D, Engine } from './world.js';
import { Sound } from './sound.js';

const screens = {};
let current = null;
export const register = (name, def) => { screens[name] = def; };
export const currentScreen = () => current;

/* n images réellement dessinées (et pas un minuteur : sur un téléphone occupé à compiler la 3D, un setTimeout peut attendre
   plusieurs secondes alors que l'image est déjà là) */
export const frames = (n = 2) => new Promise(res => { const step = k => requestAnimationFrame(() => (k <= 1 ? res() : step(k - 1))); step(n); });
/* le rideau est levé et l'image du nouvel écran est à l'écran : la voix peut partir */
export const settled = () => new Promise(res => { const step = k => requestAnimationFrame(() => { if ($('#curtain').classList.contains('on')) return step(2); if (k <= 1) res(); else step(k - 1); }); step(2); });
/* rideau : clair entre deux écrans ; sombre, avec le titre, quand une séance commence (« les lumières s'éteignent ») */
function slate(s) {
  const cur = $('#curtain'); cur.classList.toggle('dark', !!s);
  $('#curtainK').textContent = (s && s.k) || ''; $('#curtainT').textContent = (s && s.t) || ''; $('#curtainTxt').textContent = '';
}

export function syncRegion() {
  if (!has3D || !current) return;
  const def = screens[current] || {};
  if (def.reframe) { def.reframe(); return; }
  const el = def.region ? def.region() : $(`#s-${current} .view3d`);
  if (el && !el.hidden && el.offsetParent !== null) Engine.regionFromEl(el);
}

/* deux navigations coup sur coup (double toucher, téléphone lent) : seule la dernière aboutit. Sans cela, la première,
   qui attendait son rideau, reprenait la main après la seconde et ramenait l'élève sur le mauvais écran. */
let navTok = 0, enVol = 0, rideauOublie = false;
/* les anciens écrans « Examen » (questions) et « Exercices » (conduite 3D) sont les deux volets de « S'entraîner » */
const ALIAS = { examen: ['entrainer', 'questions'], exos: ['entrainer', 'conduite'] };
export async function show(name, opts = {}) {
  if (ALIAS[name]) { opts = Object.assign({ volet: ALIAS[name][1] }, opts); name = ALIAS[name][0]; }
  if (!screens[name]) name = 'salle';
  const tok = ++navTok;
  const prev = current, def = screens[name];
  if (prev === name && !opts.force) { def.enter && def.enter(prev, opts); return; }
  if (prev && screens[prev].leave) screens[prev].leave(name);
  const worldChange = has3D && def.world && Engine.current !== def.world;
  const cur = $('#curtain');
  if (worldChange && prev && !opts.noCurtain) { slate(opts.slate); cur.classList.add('on'); enVol++; await wait(opts.slate ? 380 : 260); enVol--;
    // dépassée par une navigation plus récente : on s'arrête là ; si personne d'autre ne relèvera le rideau, on le relève
    if (tok !== navTok) { if (enVol) rideauOublie = true; else { await frames(2); if (!enVol) cur.classList.remove('on'); } return; } }
  current = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name));
  $('#tabbar').classList.toggle('hide', !!def.noTab);
  const tab = def.tab || name;
  $$('#tabbar button').forEach(b => { if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  try { history.replaceState(null, '', '#' + name); } catch (e) {}
  if (!opts.keepScroll) $('#s-' + name).scrollTop = 0;
  if (has3D && def.world) Engine.world(def.world);
  if (has3D) Engine.pause(!!def.still);
  if (def.enter) def.enter(prev, opts);
  Sound.ambience(def.amb === undefined ? null : def.amb);
  requestAnimationFrame(() => { syncRegion(); requestAnimationFrame(syncRegion); });
  try { document.dispatchEvent(new CustomEvent('pb:ecran', { detail: name })); } catch (e) {}
  // le rideau se lève dès que le nouveau monde a dessiné ses premières images (les shaders sont compilés)
  // (une navigation imbriquée, comme l'exercice qui se relance lui-même, ne doit pas laisser le rideau baissé : seule une
  // navigation encore en attente derrière son rideau le relèvera elle-même)
  if (worldChange && prev && !opts.noCurtain) { await frames(2); if (!enVol) { cur.classList.remove('on'); rideauOublie = false; } }
  else if (rideauOublie && tok === navTok) { rideauOublie = false; await frames(2); cur.classList.remove('on'); }
}

export async function curtain(text, fn, s) {
  const cur = $('#curtain'); slate(s); if (!s) $('#curtainTxt').textContent = text || ''; cur.classList.add('on');
  await wait(450); await fn(); await frames(2);
  cur.classList.remove('on'); setTimeout(() => { if (!cur.classList.contains('on')) { $('#curtainTxt').textContent = ''; } }, 500);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  haptic(); Sound.ui('tap');
  show(b.dataset.go, b.dataset.arg ? { arg: b.dataset.arg } : {});
});
window.addEventListener('resize', () => requestAnimationFrame(syncRegion));
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('active')) syncRegion(); }, { capture: true, passive: true });
