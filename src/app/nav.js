/* Navigation entre écrans : chaque écran déclare son monde 3D, son ambiance sonore et ses hooks. */
import { $, $$, wait, haptic } from './util.js';
import { has3D, Engine } from './world.js';
import { Sound } from './sound.js';

const screens = {};
let current = null;
export const register = (name, def) => { screens[name] = def; };
export const currentScreen = () => current;

export function syncRegion() {
  if (!has3D || !current) return;
  const def = screens[current] || {};
  const el = def.region ? def.region() : $(`#s-${current} .view3d`);
  if (el && !el.hidden && el.offsetParent !== null) Engine.regionFromEl(el);
}

export async function show(name, opts = {}) {
  if (!screens[name]) name = 'salle';
  const prev = current, def = screens[name];
  if (prev === name && !opts.force) { def.enter && def.enter(prev, opts); return; }
  if (prev && screens[prev].leave) screens[prev].leave(name);
  const worldChange = has3D && def.world && Engine.current !== def.world;
  const cur = $('#curtain');
  if (worldChange && prev && !opts.noCurtain) { cur.classList.add('on'); await wait(260); }
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
  if (worldChange && prev && !opts.noCurtain) { await wait(80); cur.classList.remove('on'); }
}

export async function curtain(text, fn) {
  const cur = $('#curtain'); $('#curtainTxt').textContent = text || ''; cur.classList.add('on');
  await wait(450); await fn(); await wait(250);
  cur.classList.remove('on'); setTimeout(() => { $('#curtainTxt').textContent = ''; }, 500);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  haptic(); Sound.ui('tap');
  show(b.dataset.go, b.dataset.arg ? { arg: b.dataset.arg } : {});
});
window.addEventListener('resize', () => requestAnimationFrame(syncRegion));
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('active')) syncRegion(); }, { capture: true, passive: true });
