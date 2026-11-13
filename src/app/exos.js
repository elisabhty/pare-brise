/* Exercices immersifs en 3D : on conduit, on réagit, on décide.
   Chaque exercice est décrit en JSON (content/exercices.json) et joué par une « mécanique » :
   freinage · vitesse · distance · feu · priorite · depassement · danger · eclairage. */
import { $, $$, esc, fr, wait, store, haptic } from './util.js';
import { has3D, Engine, SIM } from './world.js';
import { sign } from './signs.js';
import { EXOS, COURSES, THEMES, course, courseNumber } from './content.js';
import { Sound } from './sound.js';
import { Labels } from './labels.js';
import { register, show, syncRegion, currentScreen } from './nav.js';
import { markActive } from './streak.js';
import { answer, courseState } from './progress.js';
import { plot, react } from './mascot.js';

const LANE = 1.75, FRONT = 1.9;
const ms = k => k / 3.6, kmh = v => Math.round(v * 3.6);
const n1 = x => String(Math.round(x * 10) / 10).replace('.', ',');
const m0 = x => `${Math.max(0, Math.round(x))} m`;
const pick = a => a[Math.floor(Math.random() * a.length)];
const SHIRTS = [0x3D7BFF, 0xFF7A1A, 0x8E5CF6, 0x12A150, 0xE5484D, 0x0EA5E9];

/* ---------- icônes (style SF Symbols) ---------- */
export const ICON = {
  freinage: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/>',
  vitesse: '<path d="M4.5 16a8 8 0 1 1 15 0"/><path d="M12 13l4-4"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/>',
  distance: '<path d="M3 17h18"/><rect x="3" y="9" width="6" height="5" rx="1.5"/><rect x="15" y="9" width="6" height="5" rx="1.5"/><path d="M10.5 11.5h3M12.5 10l1 1.5-1 1.5"/>',
  feu: '<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="17" r="1.6"/>',
  priorite: '<path d="M12 3v18M3 12h18"/><path d="M15.5 8.5 12 12"/><circle cx="12" cy="12" r="2.2"/>',
  depassement: '<path d="M8 20V8l-3 3M8 8l3 3"/><path d="M16 4v16"/><rect x="13.5" y="12" width="5" height="6" rx="1.4"/>',
  danger: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eclairage: '<path d="M9 6c-3 0-5 2.7-5 6s2 6 5 6h1V6H9Z"/><path d="M14 8h7M14 12h7M14 16h7"/>',
  examen: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 9h8M8 13h5"/><path d="m14 16.5 1.6 1.6 3-3.2"/>',
  reflexe: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  decodeur: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l7.5 7.5"/>'
};
export const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ICON.danger}</svg>`;

export const FAMILLES = [
  { id: 'examen', nom: 'Situations d’examen', sous: 'Comme le jour du code', meca: ['examen'] },
  { id: 'decisions', nom: 'Décisions', sous: 'Qui passe, quand doubler', meca: ['priorite', 'depassement'] },
  { id: 'regles', nom: 'Feux tricolores', sous: 'Freiner ou passer', meca: ['feu'] },
  { id: 'perception', nom: 'Voir et être vu', sous: 'Dangers et éclairage', meca: ['danger', 'eclairage'] }
];
export const best = id => (store.get('exoBest', {}) || {})[id] || null;
/* une leçon = une pratique (situations en 3D) ; les défis 3D sont rattachés à leur leçon */
export const practiceOf = cid => EXOS.find(e => e.id === 'p-' + cid) || null;
export const defisOf = cid => EXOS.filter(e => e.cours === cid && e.meca !== 'examen');
const saveBest = (id, score) => {
  const all = store.get('exoBest', {}) || {}; if (!all[id] || score > all[id].score) all[id] = { score, at: Date.now() }; store.set('exoBest', all);
  const runs = store.get('exoRuns', {}) || {}; runs[id] = (runs[id] || 0) + 1; store.set('exoRuns', runs);   // compte les examens blancs du planning
  // chaque examen blanc garde sa note : l'onglet « Réserver » dit « prêt » quand les deux derniers passent la barre du jour J
  if (id === 'x-exam-blanc') store.set('blancs', (store.get('blancs', []) || []).concat({ t: Date.now(), score }).slice(-20));
  markActive();
};
let retourX = 'exos';
export const stars = sc => (sc >= 90 ? 3 : sc >= 70 ? 2 : sc >= 40 ? 1 : 0);
export const starsHtml = sc => `<span class="stars" aria-label="${stars(sc)} étoiles sur 3">${[0, 1, 2].map(i => `<i class="${i < stars(sc) ? 'on' : ''}"></i>`).join('')}</span>`;

/* ======================= Contexte d'exécution ======================= */
class Abort extends Error {}
function makeX(ex) {
  const W = SIM;
  let alive = true; const unsubs = [];
  const X = {
    W, ex,
    live: () => alive,
    stop() { alive = false; unsubs.forEach(u => u()); },
    check() { if (!alive) throw new Abort(); },
    /* attend qu'une condition soit vraie (évaluée à chaque image) */
    tick(pred) {
      return new Promise((res, rej) => {
        const off = W.onTick(dt => { if (!alive) { off(); rej(new Abort()); return; } let r = false; try { r = pred(dt); } catch (e) { off(); rej(e); return; } if (r) { off(); res(r); } });
        unsubs.push(off);
      });
    },
    async sleep(t) { const end = performance.now() + t; await X.tick(() => performance.now() >= end); },
    msg(html, kind = '', t = 2400) {
      const el = $('#xMsg'); el.className = 'xmsg on ' + kind; el.innerHTML = html;
      clearTimeout(X._mt); if (t) X._mt = setTimeout(() => { el.classList.remove('on'); }, t);
    },
    hideMsg() { $('#xMsg').classList.remove('on'); },
    ctl(html) { const el = $('#xCtl'); el.innerHTML = html; return el; },
    hold(el, down, up) {
      if (!el) return;
      let on = false;
      const d = e => { e.preventDefault(); if (on) return; on = true; el.classList.add('down'); down(); };
      const u = e => { if (!on) return; on = false; el.classList.remove('down'); up && up(); };
      el.addEventListener('pointerdown', d); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
    },
    step(i, n) {
      $('#xStep').textContent = n > 1 ? `${i} sur ${n}` : '';
      // barre de progression en segments : une case par situation, colorée après la réponse
      const pg = $('#xProg'); if (!pg) return;
      if (n < 2) { pg.hidden = true; pg.innerHTML = ''; return; }
      if (pg.childElementCount !== n) pg.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
      pg.hidden = false; [...pg.children].forEach((e, k) => e.classList.toggle('cur', k === i - 1));
    },
    mark(i, etat) { const e = $('#xProg') && $('#xProg').children[i]; if (e) { e.classList.remove('cur'); e.classList.add(etat); } },
    speedo(on, limit) { $('#xSpeed').hidden = !on; X.limit(limit); },
    limit(v) { const el = $('#xLimit'); if (!v) { el.innerHTML = ''; el.hidden = true; return; } el.hidden = false; el.innerHTML = sign('B14:' + v); el.dataset.v = v; },
    flash(kind = 'ko') { const f = $('#xFlash'); f.className = 'xflash ' + kind; void f.offsetWidth; f.classList.add('on'); },
    card(html, cls = '') { const c = $('#xCard'); c.className = 'xcard ' + cls; c.innerHTML = html; c.hidden = false; requestAnimationFrame(() => c.classList.add('on')); return c; },
    hideCard() { const c = $('#xCard'); c.classList.remove('on'); setTimeout(() => { if (!c.classList.contains('on')) c.hidden = true; }, 260); },
    /* question à boutons, renvoie l'index choisi */
    ask(q, choices, sub = '') {
      return new Promise((res, rej) => {
        const c = X.card(`<div class="xq"><b>${esc(q)}</b>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="xchoices">${choices.map((t, i) => `<button class="xchoice" data-i="${i}">${esc(t)}</button>`).join('')}</div>`, 'xask');
        $$('.xchoice', c).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tap'); X.hideCard(); res(+b.dataset.i); }, { once: true }));
        const off = W.onTick(() => { if (!alive) { off(); rej(new Abort()); } }); unsubs.push(off);
      });
    },
    /* carte de verdict avec bouton « Continuer » */
    verdict(ok, title, body, extra = '') {
      return new Promise((res, rej) => {
        const c = X.card(`<div class="xv ${ok === null ? 'neutre' : ok ? 'ok' : 'ko'}"><i>${ok === null ? '' : ok ? '✓' : '✕'}</i><div><b>${esc(title)}</b><p>${body}</p>${extra}</div></div><button class="btn" id="xNext">Continuer</button>`, 'xverdict');
        $('#xNext', c).addEventListener('click', () => { haptic(); Sound.ui('tap'); X.hideCard(); res(); }, { once: true });
        const off = W.onTick(() => { if (!alive) { off(); rej(new Abort()); } }); unsubs.push(off);
      });
    },
    wet(on) { $('#xWet').hidden = !on; },
    async fade(on) { const f = $('#xFade'); f.classList.toggle('on', on); await wait(on ? 300 : 0); },
    gap(on) { $('#xGap').hidden = !on; },
    /* bandeau « Observe la situation » avec sa barre de progression (durée T en secondes) */
    obs(on, T = 3) {
      // l'observation s'affiche dans la pastille du titre (rien ne se superpose au compteur ni à la scène)
      const el = $('#s-exo .xtitle'), bar = $('#xObsBar');
      if (!on) { el.classList.remove('obs'); return; }
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; void bar.offsetWidth;
      bar.style.transition = `transform ${T}s linear`; bar.style.transform = 'scaleX(1)'; el.classList.add('obs');
    },
    /* loupe : le panneau de la scène, net et lisible, dans un coin de l'image */
    loupe(ids) {
      const el = $('#xZoom'); if (!el) return;
      if (!ids || !ids.length) { el.classList.remove('on'); return; }
      el.innerHTML = ids.slice(0, 3).map(id => `<span>${sign(id)}</span>`).join('') + '<em>Zoom</em>'; el.classList.toggle('n3', ids.length > 2); el.classList.toggle('multi', ids.length > 1); el.style.setProperty('--n', Math.min(3, ids.length));
      el.hidden = false;
      // cadrage serré sur le panneau (un panneau d'agglomération n'occupe que le milieu de son carré)
      $$('svg', el).forEach(sv => { try { const b = sv.getBBox(); if (b.width > 4 && b.height > 4) sv.setAttribute('viewBox', `${(b.x - 2).toFixed(1)} ${(b.y - 2).toFixed(1)} ${(b.width + 4).toFixed(1)} ${(b.height + 4).toFixed(1)}`); } catch (e) {} });
      requestAnimationFrame(() => el.classList.add('on'));
    }
  };
  return X;
}

/* ======================= Dangers pour le freinage ======================= */
/* Chaque danger : { S, trig (m devant le pare-chocs au déclenchement), half, real, start(), tick(dt), inLane(), resume(), nom } */
const stopD = (v, a, tr = 1) => v * tr + v * v / (2 * a);
const HZ = {
  pieton(W, S, o) {
    const ville = W.cfg.env === 'ville', x0 = ville ? 3.95 : 4.6;
    if (ville) { W.voiture({ S: S - 4.6, x: 4.6, couleur: 0x9AA3AF }); W.voiture({ S: S + 4.6, x: 4.6, couleur: 0x2E3440 }); }
    const a = W.pieton({ S, x: x0, haut: o.nuit ? 0x30343c : pick(SHIRTS), bas: o.nuit ? 0x22252b : 0x2B3445 });
    a.g.rotation.y = Math.PI / 2;
    return { S, half: 0.3, real: true, nom: 'Piéton qui surgit', extra: 1.0,
      start() { a.go(0, o.nuit ? -1.15 : -1.5); }, tick() { if (!this.free && a.x <= LANE + 0.15) { a.go(0, 0); a.g.rotation.y = Math.PI / 2; } },
      inLane: () => Math.abs(a.x - W.player.x) < 1.3, resume() { this.free = true; a.go(0, -1.5); } };
  },
  enfant(W, S, o) {
    const h = HZ.pieton(W, S, o); const a = W.enfant({ S, x: 4.1 }); a.g.rotation.y = Math.PI / 2;
    W.actors.filter(x => x.kind === 'pieton' && Math.abs(x.S - S) < 0.1 && x !== a).forEach(x => x.remove());
    return { ...h, nom: 'Enfant qui traverse en courant', start() { a.go(0, -2.6); }, tick() { if (!this.free && a.x <= LANE + 0.1) a.go(0, 0); }, inLane: () => Math.abs(a.x - W.player.x) < 1.3, resume() { this.free = true; a.go(0, -2.2); } };
  },
  ballon(W, S, o) {
    const ville = W.cfg.env === 'ville';
    if (ville) { W.voiture({ S: S - 4.8, x: 4.6, couleur: 0xF2B233 }); W.voiture({ S: S + 4.4, x: 4.6, couleur: 0x3A6DF0 }); }
    const b = W.ballon({ S: S - 1.2, x: 4.3 }), k = W.enfant({ S, x: 4.6 }); k.g.rotation.y = Math.PI / 2;
    return { S, half: 0.3, real: true, nom: 'Ballon puis enfant', extra: 1.45,
      start() { b.go(0, -3.6); setTimeout(() => k.go(0, -2.5), 750); }, tick() { if (!this.free && k.x <= LANE + 0.1) k.go(0, 0); if (b.x < -9) b.go(0, 0); },
      inLane: () => Math.abs(k.x - W.player.x) < 1.3, resume() { this.free = true; k.go(0, -2.2); } };
  },
  portiere(W, S, o) {
    const p = W.portiere({ S, x: 4.6, couleur: pick([0x2E3440, 0x9AA3AF, 0xE84A4A]) });
    return { S: S - 0.6, half: 0.2, real: true, nom: 'Portière qui s’ouvre', extra: 0.9, opened: false,
      start() { p.open(700); this.opened = true; }, inLane() { return this.opened && W.player.x > 1.2; }, resume() {} };
  },
  sortie(W, S, o) {
    const a = W.voiture({ S, x: 8.2, couleur: pick([0x2FA37A, 0x3A6DF0, 0xF4F6FA]) }); a.g.rotation.y = Math.PI / 2; a.fixedHeading = true;
    return { S, half: 1.0, real: true, nom: 'Voiture qui sort d’un parking', extra: 1.15,
      start() { a.go(0, -2.6); }, tick() { if (!this.free && a.x <= 3.9) { a.go(0, 0); a.brake = true; } },
      inLane: () => a.x - 2.1 < W.player.x + 0.95, resume() { this.free = true; a.brake = false; a.go(0, -3); } };
  },
  biche(W, S, o) {
    const a = W.biche({ S, x: -9 }); a.g.rotation.y = -Math.PI / 2;
    return { S, half: 0.7, real: true, nom: 'Animal sauvage', extra: 1.0,
      start() { a.go(0, 5.2); }, tick() { if (!this.free && a.x >= LANE - 0.1) a.go(0, 0); },
      inLane: () => Math.abs(a.x - W.player.x) < 1.4, resume() { this.free = true; a.go(0, 5); } };
  },
  bouchon(W, S, o) {
    const cars = [0, 6.2, 12.4].map((d, i) => { const c = W.voiture({ S: S + 2.1 + d, x: LANE, couleur: [0x2E3440, 0xE84A4A, 0x9AA3AF][i] }); c.brake = true; return c; });
    return { S: S + 0.1, half: 0, real: true, nom: 'Bouchon à l’arrêt', extra: 3.2, start() {}, inLane: () => true, resume() { cars.forEach((c, i) => { c.brake = false; c.go(0, 0); setTimeout(() => c.go(7, 0), 300 + i * 250); }); this.cleared = true; } };
  },
  'freine-devant'(W, S, o) {
    const v0 = W.player.v || 13; let c = null, vl = v0 * 0.82, braking = false;
    return { get S() { return c ? c.S - 2.1 : Infinity; }, half: 0, real: true, nom: 'La voiture de devant pile', extra: 0, follow: true,
      prepare() { c = W.voiture({ S: W.player.s + FRONT + 2.1 + v0 * 3.4, x: LANE, couleur: pick([0x2E3440, 0x9AA3AF, 0x3A6DF0]) }); c.vS = vl; c.tick = dt => { if (braking) { vl = Math.max(0, vl - 7 * dt); c.brake = true; } c.vS = vl; }; },
      start() { braking = true; Sound.ui('brake'); }, inLane: () => true, resume() { braking = false; if (c) c.brake = false; vl = 0; setTimeout(() => { vl = v0 * 1.7; }, 400); setTimeout(() => { if (c) c.remove(); }, 9000); } };
  },
  bus(W, S, o) {
    const b = W.bus({ S: S + 7, x: 4.5 }); b.brake = true;
    const a = W.pieton({ S: S + 0.6, x: 3.2, haut: pick(SHIRTS) }); a.g.rotation.y = Math.PI / 2; a.g.visible = true;
    return { S, half: 0.3, real: true, nom: 'Piéton qui passe devant le bus', extra: 0.95,
      start() { a.go(0, -1.6); }, tick() { if (!this.free && a.x <= LANE + 0.15) a.go(0, 0); },
      inLane: () => Math.abs(a.x - W.player.x) < 1.3, resume() { this.free = true; a.go(0, -1.5); } };
  },
  'faux-pieton'(W, S, o) {
    const ville = W.cfg.env === 'ville';
    const a = W.pieton({ S, x: ville ? 6.3 : 5.2, haut: pick(SHIRTS) }); a.g.rotation.y = Math.PI / 2;
    return { S, half: 0.3, real: false, nom: 'Piéton qui attend', extra: 1.6, start() {}, inLane: () => false, resume() {} };
  }
};

/* Vue « bilan » : la caméra s'élève et montre la distance de réaction (orange) et de freinage (rouge) */
async function showBands(X, bands, dR, dB) {
  const W = X.W, list = (bands || []).map((m, i) => ({ m, t: i ? ['Freinage', m0(dB)] : ['Réaction', m0(dR)] })).filter(b => b.m);
  if (!list.length) return;
  await X.sleep(500);
  W.pose('bilan', 1100);
  W.setAnchors(list.map((b, i) => ({ id: 'b' + i, obj: b.m, dy: 0.3 })));
  Labels.set(list.map((b, i) => 'b' + i), list.map(b => b.t), 'exo');
  const off = W.onTick(() => Labels.frame());
  try { await X.sleep(2600); } finally { off(); Labels.clear(); W.setAnchors([]); list.forEach(b => { const m0p = b.m.material.opacity; Engine.tween(700, e => { b.m.material.opacity = m0p * (1 - e); }); }); }
  await W.pose('cockpit', 900);
}

/* ======================= Mécaniques ======================= */
const MECA = {};

/* ---------- Situations d'examen : une courte vidéo, un arrêt sur image, une question, des réponses A à D ---------- */
const TYPES3D = ['moto', 'trottinette', 'tram', 'train', 'voiture', 'velo', 'pieton', 'enfant', 'bus', 'camion', 'tracteur', 'biche', 'ambulance', 'police', 'pompiers', 'triangle', 'portiere', 'feu', 'ballon'];
const OBS = 3.6;                                                   // durée de la « vidéo » avant l'arrêt sur image (s)
const BIG = ['moto', 'tram', 'train', 'voiture', 'velo', 'ambulance', 'police', 'pompiers', 'bus', 'camion', 'tracteur'];
const rollOf = sc => { const v = (sc.kmh ?? 30) / 3.6; return { v, d: Math.min(8, v * 0.6) }; };
/* T : durée de la vidéo. La voiture et les usagers mobiles partent en arrière d'autant,
   pour se trouver exactement à la place prévue au moment de l'arrêt sur image. */
function stageScene(W, sc, T = 0) {
  const env = sc.env || 'ville', cars = sc.carrefour ? [sc.carrefour.S] : [], { v, d } = rollOf(sc), tR = v > 0 ? d / v : 0.6;
  const ligne = typeof sc.ligne === 'string' ? [{ de: -200, a: 900, type: sc.ligne }] : sc.ligne && sc.ligne.map(g => (g.de <= 0 ? { ...g, de: -200 } : g));
  W.load({ env, meteo: sc.meteo || 'jour', kmh: sc.kmh ?? 30, longueur: 900, depart: v > 0 ? d - v * T : 0, graine: sc.graine || 9, camera: sc.camera || 'vue', voie: sc.voie, relief: sc.relief,
    ligne, carrefours: cars,
    zones: [].concat(sc.giratoire ? [{ de: sc.giratoire - 4, a: sc.giratoire + 34 }] : [], sc.tunnel ? [{ de: sc.tunnel - 10, a: 900 }] : [], sc.rails ? [{ de: sc.rails - 8, a: sc.rails + 8 }] : []),
    // pas de voiture garée entre nous et un piéton ou un usager au bord de la route : il doit rester bien visible
    reserve: [d].concat((sc.acteurs || []).flatMap(a => (a.x > 2.4 ? [a.S || 0, (a.S || 0) - 10, (a.S || 0) - 20] : [a.S || 0])), sc.passage ? [sc.passage, sc.passage - 10, sc.passage - 20] : []) });
  W.lights(Object.assign({ position: false, croisement: ['nuit', 'brouillard', 'pluie', 'neige'].includes(sc.meteo), route: false, brouillardAv: sc.meteo === 'brouillard', brouillardAr: false, detresse: false, clignotant: null }, sc.feux || {}));
  if (sc.carrefour) W.carrefour(sc.carrefour.S, { ligne: sc.carrefour.ligne, forme: sc.carrefour.forme });
  if (sc.giratoire) W.giratoire(sc.giratoire);
  if (sc.passage) W.passage(sc.passage);
  if (sc.chevrons) W.chevrons(-190, 800, 38);
  if (sc.tunnel) W.tunnel(sc.tunnel, 900);
  if (sc.maisons) W.maisons(-160, 300);
  if (sc.rails) W.rails(sc.rails);
  (sc.marquages || []).forEach(([S, x, k]) => W.marquage(S, x, k));
  const sx = env === 'ville' ? 5.9 : env === 'autoroute' ? 7.2 : 4.4;
  const signs = (sc.signaux || []).map(([id, S, x, t]) => W.panneau(id, S, x ?? sx, { taille: t || 1.2 }));
  // vue du conducteur : le tableau de bord en bas de l'image, comme dans les vidéos de l'examen
  { const d = $('#v-exo .dash'); if (d) d.hidden = !['vue', 'cockpit'].includes(sc.camera || 'vue'); }
  const actors = (sc.acteurs || []).map(o => {
    const t = TYPES3D.includes(o.type) ? o.type : 'voiture';
    // positions de la fiche = départ d'un court roulage (tR) : on en déduit la place à l'arrêt sur image, puis le départ de la vidéo
    const vS = o.kmh ? o.kmh / 3.6 : 0, vx = o.vx || 0, x1 = (o.x ?? LANE) + vx * tR;
    // un piéton qui traverse part du trottoir (pas de l'intérieur d'un immeuble) : il attend puis se met en marche
    let xs = x1 - vx * T, attente = 0;
    if (vx) { const lim = BIG.includes(t) ? 45 : env === 'ville' ? 8.4 : 11; if (Math.abs(xs) > lim && Math.abs(xs) > Math.abs(x1)) { const xc = Math.sign(xs) * lim; attente = T - Math.abs(xc - x1) / Math.abs(vx); xs = xc; } }
    const a = t === 'feu' ? W.feu({ S: o.S, x: o.x ?? 5.4, etat: o.etat || 'vert' })
      : W[t]({ S: (o.S ?? 20) + vS * (tR - T), x: xs, couleur: o.couleur, gilet: o.gilet, haut: o.haut, sens: (o.kmh || 0) < 0 ? -1 : 1 });
    if (vS) a.vS = vS;
    if (vx) {
      if (o.cap === undefined) a.g.rotation.y = Math.atan2(-vx, vS);
      if (attente > 0) { let w = attente; const prev = a.tick; a.tick = (dt, tt, self) => { if (w > 0 && (w -= dt) <= 0) a.vx = vx; if (prev) prev(dt, tt, self); }; } else a.vx = vx;
    }
    if (o.cap !== undefined) { a.g.rotation.y = o.cap * Math.PI / 180; a.fixedHeading = true; }
    if (o.freine) a.brake = true;
    if (t === 'portiere' && o.ouverte) a.open(10);
    if (t === 'feu' && o.etat === 'clignotant') { let on = true; a.tick = (dt, tt) => { const k = Math.sin(tt * 6) > 0; if (k !== on) { on = k; a.set(k ? 'clignotant' : 'eteint'); } }; }
    return a;
  });
  return { actors, signs };
}
/* Trois façons de poser une situation (champ « mode », posé par gen/pratique.py) :
   video : la scène se joue quelques secondes puis se fige (il faut observer) ; image : l'image figée au moment de décider,
   sans vidéo (un panneau à lire, une scène à l'arrêt) ; qcm : une question de cours, posée directement, sans décor. */
const modeOf = sc => sc.mode || 'video';
/* la mise en situation, en sous-titre pendant la vidéo (« Un ami propose un café après plusieurs verres. ») */
function sub(text) { const el = $('#xSub'); if (!el) return; if (!text) { el.classList.remove('on'); return; } el.textContent = text; el.hidden = false; requestAnimationFrame(() => el.classList.add('on')); }
/* Joue la situation comme une courte vidéo, puis fige l'image et zoome sur le panneau à lire.
   head : [libellé, numéro] affichés pendant le fondu ; null pour « Revoir la scène ». */
async function playScene(X, sc, head) {
  const W = X.W, f = $('#xFade');
  X.demo = (X.demo || 0) + 1;   // une démonstration en cours s'arrête là
  if (head) { $('#xFiK').textContent = head[0]; $('#xFiN').textContent = head[1]; }
  f.classList.toggle('txt', !!head);
  X.loupe(null);
  await X.fade(true); $('#s-exo').classList.remove('qcm');
  if (Engine.hidden) Engine.hidden(false);
  if (Engine && Engine.hiRes) Engine.hiRes(false);
  const st = stageScene(W, sc, OBS); W.slow(0, 0);
  X.wet(sc.meteo === 'pluie'); X.speedo(!!sc.compteur, sc.limite || null);
  W.setAnchors(sc.etiquettes ? sc.etiquettes.map(([k]) => ({ id: 'q' + k, obj: st.actors[k], dy: 2.3 })) : []);
  await X.sleep(head ? 800 : 200);
  X.fade(false);
  // la vidéo : quelques secondes à vitesse réelle, avec une barre de progression
  const { v, d } = rollOf(sc);
  X.obs(true, OBS); sub(sc.contexte);
  W.slow(1, 0);
  if (v > 0) await X.tick(() => W.player.s >= d - v * 0.25); else await X.sleep((OBS - 0.25) * 1000);
  await W.slow(0, 500);
  X.obs(false);
  if (Engine && Engine.hiRes) Engine.hiRes(true);   // image figée : rendu à la pleine résolution de l'écran
  // arrêt sur image : la caméra se rapproche du panneau, puis recule pour montrer toute la scène
  // sans panneau : on se rapproche de l'usager à observer (piéton, ballon, cycliste…)
  // vue extérieure pendant la vidéo, puis place du conducteur au moment de décider
  if (sc.puis) { const d = $('#v-exo .dash'); await W.pose(sc.puis, 900); if (d) d.hidden = !['vue', 'cockpit'].includes(sc.puis); }
  const cam = sc.puis || sc.camera || 'vue', proche = a => { const e = a.S - W.player.s; return a.kind !== 'feu' && e > 6 && e < 90; };
  const sign = st.signs[sc.cle ?? 0], key = sign || (sc.focus !== undefined ? st.actors[sc.focus] : st.actors.find(proche));
  if (key && (cam === 'vue' || cam === 'cockpit')) {
    if (sign) { W.eclaire(sign, 0xffc629, 1300); await W.regarde(sign, 17, 1000, 1); }
    else await W.regarde(key, 24, 1000, 0.85, 0.9);
    await X.sleep(800);
    await (sign ? W.regarde(sign, 34, 800, 0.55) : W.regarde(key, 36, 800, 0.55, 0.9));
  } else await X.sleep(400);
  sub(null);
  if (sc.signaux && sc.signaux.length) X.loupe(sc.signaux.map(g => g[0]));
  if (sc.etiquettes) Labels.set(sc.etiquettes.map(([k]) => 'q' + k), sc.etiquettes.map(e => [e[1], e[2]]), 'exo');
  return st;
}
/* Image figée : la scène est posée directement au moment de décider, cadrée sur ce qu'il faut lire. Pas de vidéo. */
async function showStill(X, sc, head) {
  const W = X.W, f = $('#xFade');
  X.demo = (X.demo || 0) + 1;
  $('#xFiK').textContent = head[0]; $('#xFiN').textContent = head[1]; f.classList.add('txt');
  X.loupe(null); sub(null);
  await X.fade(true); $('#s-exo').classList.remove('qcm');
  if (Engine.hidden) Engine.hidden(false);
  const st = stageScene(W, sc, 0); W.slow(0, 0);
  X.wet(sc.meteo === 'pluie'); X.speedo(!!sc.compteur, sc.limite || null);
  W.setAnchors(sc.etiquettes ? sc.etiquettes.map(([k]) => ({ id: 'q' + k, obj: st.actors[k], dy: 2.3 })) : []);
  await X.tick(() => true);   // une image du nouveau décor d'abord : la position des panneaux est alors à jour pour cadrer
  const cam = sc.puis || sc.camera || 'vue';
  if (sc.puis) { W.pose(sc.puis, 0); const d = $('#v-exo .dash'); if (d) d.hidden = !['vue', 'cockpit'].includes(sc.puis); }
  const proche = a => { const e = a.S - W.player.s; return a.kind !== 'feu' && e > 6 && e < 90; };
  const sign = st.signs[sc.cle ?? 0], key = sign || (sc.focus !== undefined ? st.actors[sc.focus] : st.actors.find(proche));
  if (key && (cam === 'vue' || cam === 'cockpit')) { if (sign) W.regarde(sign, 34, 0, 0.55); else W.regarde(key, 36, 0, 0.55, 0.9); }
  if (Engine && Engine.hiRes) Engine.hiRes(true);
  await X.sleep(650);
  f.classList.remove('txt'); X.fade(false);
  if (sign) W.eclaire(sign, 0xffc629, 1300);
  if (sc.signaux && sc.signaux.length) X.loupe(sc.signaux.map(g => g[0]));
  if (sc.etiquettes) Labels.set(sc.etiquettes.map(([k]) => 'q' + k), sc.etiquettes.map(e => [e[1], e[2]]), 'exo');
  return st;
}
/* Question de cours : un fond uni, la question s'affiche tout de suite (la 3D n'est plus dessinée derrière) */
async function showSheet(X, head) {
  const f = $('#xFade');
  X.demo = (X.demo || 0) + 1;
  X.loupe(null); sub(null); Labels.clear(); X.W.setAnchors([]); X.speedo(false, null); X.wet(false);
  { const d = $('#v-exo .dash'); if (d) d.hidden = true; }
  if (!f.classList.contains('on')) { $('#xFiK').textContent = head[0]; $('#xFiN').textContent = head[1]; f.classList.add('txt'); await X.fade(true); await X.sleep(420); }
  f.classList.remove('txt'); $('#s-exo').classList.add('qcm');
  if (Engine.hidden) Engine.hidden(true);
  return null;
}
/* Après la réponse : la scène reprend et la voiture fait ce qu'il fallait faire, pendant que la correction s'affiche.
   apres : { action, kmh, S (point d'arrêt), voie, cote, feux, acteurs: [[i, km/h, vx]], feu: [[i, état, s]], ouvrir: [i, s], camera, duree } */
function demonstre(X, sc, st) {
  const W = X.W, a = sc.apres, tok = X.demo, k = a.action;
  const live = () => X.demo === tok && Engine.current === 'sim';
  const at = (s, fn) => setTimeout(() => { if (live()) fn(); }, s * 1000);
  const cam = a.camera || sc.puis || sc.camera || 'vue';
  X.loupe(null);
  W.pose(cam, 900); { const d = $('#v-exo .dash'); if (d) d.hidden = !['vue', 'cockpit'].includes(cam); }
  if (k === 'aucune') return;
  W.slow(1, 500);
  const stopAt = S => { const v = W.player.v; if (v < 0.2) return; const dd = Math.max(1.5, S - FRONT - W.player.s); W.auto(0, Math.max(0.5, v * v / (2 * dd))); };
  (a.acteurs || []).forEach(([i, kmh, vx]) => { const o = st.actors[i]; if (o) o.go((kmh || 0) / 3.6, vx || 0); });
  (a.feu || []).forEach(([i, etat, t]) => at(t || 0, () => { const o = st.actors[i]; if (o && o.set) o.set(etat); }));
  if (a.ouvrir) at(a.ouvrir[1] || 0.8, () => { const o = st.actors[a.ouvrir[0]]; if (o && o.open) o.open(700); });
  if (a.feux && k !== 'garer') W.lights(a.feux);
  const kmh0 = W.player.v * 3.6;
  if (k === 'ralentir' || k === 'distance') W.auto(a.kmh ?? Math.max(10, kmh0 * 0.6), a.acc || 2);
  else if (k === 'arret') { if (a.S !== undefined) stopAt(a.S); else W.auto(0, a.acc || 2.5); }
  else if (k === 'freinage') { const v = W.player.v; W.bandes(W.player.s + FRONT, v, v * v / 12); at(1, () => W.auto(0, 6)); }
  else if (k === 'voie') { W.lights({ clignotant: a.cote || (a.voie < W.player.x ? 'g' : 'd') }); if (a.kmh) W.auto(a.kmh, 2); at(a.attente ?? 0.9, () => W.lane(a.voie, 2400)); at(3.8, () => W.lights({ clignotant: null })); }
  else if (k === 'inserer') { W.lights({ clignotant: 'g' }); W.auto(a.kmh || 100, 2.2); at(a.attente || 1.6, () => W.lane(a.voie ?? LANE, 2600)); at((a.attente || 1.6) + 3, () => W.lights({ clignotant: null })); }
  else if (k === 'garer') { W.lights({ clignotant: 'd' }); at(0.6, () => W.lane(a.voie, 2600)); if (a.S !== undefined) stopAt(a.S); else W.auto(0, a.acc || 1.6); at(3.4, () => W.lights(Object.assign({ clignotant: null }, a.feux || {}))); }
  else if (k === 'depasser') {
    const o = st.actors[a.i || 0]; W.lights({ clignotant: 'g' });
    at(0.6, () => { W.lane(a.voie ?? -LANE, 1600); W.auto(a.kmh || 60, 3); });
    at(1.8, () => W.lights({ clignotant: null }));
    let back = false; const off = W.onTick(() => {
      if (!live()) { off(); return; }
      if (!back && o && W.player.s - FRONT > o.S + (o.len || 2) / 2 + 7) { back = true; W.lights({ clignotant: 'd' }); at(0.7, () => W.lane(LANE, 1600)); at(2.6, () => { W.lights({ clignotant: null }); off(); }); }
    });
  }
  at(a.duree || 6, () => W.slow(0, 700));
}
MECA.examen = async (ex, X) => {
  const W = X.W, res = [], L = 'ABCD', blanc = ex.mode === 'blanc', n = ex.situations.length, v3 = $('#v-exo');
  // une étiquette ne passe jamais sur la carte de la question (elle grandit avec l'explication)
  const offL = W.onTick(() => { const c = document.querySelector('#s-exo .xcard.on:not([hidden]):not(.xqcm)'); Labels.frame(c || undefined); });
  try {
    for (let i = 0; i < n; i++) {
      const sc = ex.situations[i], mode = modeOf(sc), qcm = mode === 'qcm'; X.step(i + 1, n);
      const head = [blanc || qcm ? 'Question' : 'Situation', `${i + 1} sur ${n}`];
      let st = qcm ? await showSheet(X, head) : mode === 'image' ? await showStill(X, sc, head) : await playScene(X, sc, head);
      // question façon examen : une ou plusieurs bonnes réponses ; « Lequel de ces panneaux » : les panneaux sont les réponses
      const chosen = new Set(), pc = sc.panneauxChoix;
      const answers = pc
        ? `<div class="xans xsigns n${pc.length}">${pc.map((id, k) => `<button class="xan xsg" data-k="${k}" aria-pressed="false" aria-label="Panneau ${L[k]}"><span class="xsg-s">${sign(id)}</span><i>${L[k]}</i></button>`).join('')}</div>`
        : `<div class="xans">${sc.choix.map((t, k) => `<button class="xan" data-k="${k}" aria-pressed="false"><i>${L[k]}</i><span>${fr(t)}</span></button>`).join('')}</div>`;
      const c = X.card(`<div class="xq">${qcm ? `<span class="xq-k">${blanc ? `Question ${i + 1}` : 'Question de cours'}</span>` : ''}${sc.contexte ? `<p class="xq-ctx">${fr(sc.contexte)}</p>` : ''}<b>${fr(sc.q)}</b>${!blanc && sc.bonnes.length > 1 ? '<span class="xq-multi">Plusieurs réponses possibles</span>' : ''}</div>
        ${answers}
        ${blanc ? '<div class="xtimer"><i id="xQbar"></i></div>' : ''}
        <div class="xbtns">${blanc || mode !== 'video' ? '' : '<button class="btn ghost" id="xReplay" aria-label="Revoir la scène"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg><span>Revoir</span></button>'}<button class="btn" id="xOk" disabled>Valider</button></div>`, 'xask' + (qcm ? ' xqcm' : ''));
      $$('.xan', c).forEach(b => b.addEventListener('click', () => { const k = +b.dataset.k; chosen.has(k) ? chosen.delete(k) : chosen.add(k); b.setAttribute('aria-pressed', chosen.has(k)); $('#xOk', c).disabled = !chosen.size; haptic(); Sound.ui('tick'); }));
      const frame = () => { if (qcm || c.hidden || !c.classList.contains('on')) return; v3.style.bottom = Math.round(c.getBoundingClientRect().height + 20) + 'px'; syncRegion(); };
      requestAnimationFrame(() => requestAnimationFrame(frame));
      // « Revoir la scène » : la carte s'efface, la vidéo est rejouée, puis la carte revient telle quelle
      let busy = false;
      const replay = async () => {
        if (busy) return; busy = true; haptic(); Sound.ui('tap');
        c.classList.remove('on'); X.loupe(null); Labels.clear(); v3.style.bottom = ''; syncRegion();
        await wait(260); c.hidden = true;
        try { st = await playScene(X, sc, null); } catch (e) { busy = false; return; }
        c.hidden = false; requestAnimationFrame(() => { c.classList.add('on'); requestAnimationFrame(frame); });
        busy = false;
      };
      const rb = $('#xReplay', c); if (rb) rb.addEventListener('click', () => { replay(); });
      const tQ = performance.now(), limit = 20000;
      await Promise.race([new Promise(r => $('#xOk', c).addEventListener('click', r, { once: true })),
        X.tick(() => { if (!blanc) return false; const k = (performance.now() - tQ) / limit; const bar = $('#xQbar'); if (bar) bar.style.transform = `scaleX(${Math.max(0, 1 - k)})`; return k >= 1; })]);
      const good = new Set(sc.bonnes), ok = good.size === chosen.size && [...good].every(k => chosen.has(k));
      if (sc.qid) answer(sc.qid, ok);
      const attendu = [...good].sort().map(k => L[k]).join(' et ');
      if (blanc) {
        res.push({ nom: sc.q, ok, score: ok ? 100 : 0, txt: ok ? 'Bonne réponse' : `${chosen.size ? 'Faux' : 'Temps écoulé'} · attendu ${attendu} : ${sc.explication}` });
        X.mark(i, 'vu');
        Sound.ui('tap'); X.hideCard(); X.loupe(null); Labels.clear(); v3.style.bottom = ''; syncRegion();
        continue;
      }
      $$('.xan', c).forEach(b => { const k = +b.dataset.k; b.classList.add(good.has(k) ? 'good' : chosen.has(k) ? 'bad' : 'dim'); b.disabled = true; });
      $('#xOk', c).remove();
      if (ok) { Sound.ui('ok'); haptic('ok'); } else { Sound.ui('ko'); haptic('ko'); }
      const montre = st && sc.apres && sc.apres.action && sc.apres.action !== 'aucune';
      $('.xbtns', c).insertAdjacentHTML('beforebegin', `<div class="xexp ${ok ? 'ok' : 'ko'}"><b>${ok ? fr(sc.bien || 'Bonne réponse') : `Réponse\u00a0: ${attendu}${montre ? ' · regarde la scène' : ''}`}</b><p>${fr(sc.explication)}</p></div>`);
      if (st && sc.apres) demonstre(X, sc, st);
      $('.xbtns', c).insertAdjacentHTML('beforeend', `<button class="btn" id="xNext">${i + 1 < n ? (modeOf(ex.situations[i + 1]) === 'qcm' ? 'Question suivante' : 'Situation suivante') : 'Voir le résultat'}</button>`);
      requestAnimationFrame(frame);
      res.push({ nom: sc.titre || sc.q, ok, score: ok ? 100 : 0, txt: ok ? 'Bonne réponse' : `Réponse attendue : ${[...good].sort().map(k => L[k]).join(', ')}` });
      X.mark(i, ok ? 'ok' : 'ko');
      await Promise.race([new Promise(r => $('#xNext', c).addEventListener('click', () => { if (busy) return; haptic(); Sound.ui('tap'); r(); })), X.tick(() => false)]);
      X.hideCard(); X.loupe(null); Labels.clear(); W.setAnchors([]);
      v3.style.bottom = ''; syncRegion();
    }
  } finally { offL(); sub(null); if (Engine.hidden) Engine.hidden(false); $('#s-exo').classList.remove('qcm'); { const f = $('#xFade'); if (f) f.classList.remove('on', 'txt'); } }
  const nOk = res.filter(r => r.ok).length, score = Math.round(nOk / res.length * 100);
  if (blanc) { const pass = nOk >= Math.ceil(res.length * 0.875); return { score, total: `${nOk} / ${res.length}`, lignes: res, conseil: pass ? `Reçu : ${nOk} bonnes réponses sur ${res.length}. Il en faut 35 sur 40 le jour J.` : `Pas encore : ${nOk} sur ${res.length}. Il faut 35 bonnes réponses sur 40. Relis les corrections ci-dessus.` }; }
  return { score, lignes: res, conseil: score >= 90 ? 'Niveau examen : 35 bonnes réponses sur 40 suffisent le jour J.' : 'Relis chaque explication, puis rejoue : à l’examen, il faut 35 bonnes réponses sur 40.' };
};

/* ---------- 1. Freinage d'urgence ---------- */
MECA.feu = async (ex, X) => {
  const W = X.W, meteo = ex.meteo || 'jour', v0 = ms(ex.kmh);
  const pas = 175, Ss = ex.distances.map((d, i) => 120 + i * pas);
  W.load({ env: 'ville', meteo, kmh: ex.kmh, longueur: Ss[Ss.length - 1] + 220, carrefours: Ss, reserve: Ss, graine: 21 });
  W.lights({ croisement: meteo !== 'jour', position: false, route: false, brouillardAv: false, brouillardAr: false });
  X.wet(meteo === 'pluie');
  const feux = Ss.map(S => { W.carrefour(S, { ligne: 'feu' }); return W.feu({ S: S - 4.6, x: 6.0, etat: 'vert' }); });
  X.speedo(true, 50);
  let pressed = false, onPress = null, phase = 'drive';
  X.ctl(`<button class="pedal brake big" id="xBrake"><span>Freiner</span></button>`);
  X.hold($('#xBrake'), () => { pressed = true; W.emergency(); Sound.ui('brake'); haptic('heavy'); onPress && onPress(); }, () => { pressed = false; if (phase === 'drive') W.auto(ex.kmh); });
  X.msg('<b>Feu orange : je m’arrête… sauf si c’est dangereux</b><span>Freine seulement si tu peux t’arrêter avant la ligne.</span>', '', 3600);
  const res = [];
  for (let i = 0; i < Ss.length; i++) {
    X.step(i + 1, Ss.length);
    const line = Ss[i] - 4.1, D = ex.distances[i], f = feux[i], a = W.player.decel;
    await X.tick(() => W.player.s + FRONT >= line - D);
    f.set('orange'); Sound.ui('tick');
    const t0 = performance.now(), v = W.player.v, need = stopD(v, a, 1);
    const should = D >= need;
    let tPress = pressed ? t0 : 0; onPress = () => { if (!tPress) tPress = performance.now(); };
    phase = 'light';
    let red = false, crossState = null;
    const redT = setTimeout(() => { f.set('rouge'); red = true; }, 3000);
    await X.tick(() => {
      const front = W.player.s + FRONT;
      if (crossState === null && front > line + 0.3) crossState = red ? 'rouge' : 'orange';
      if (W.player.v < 0.15 && tPress) return true;
      return front > line + 14;
    });
    onPress = null;
    const stopped = W.player.v < 0.15, front = W.player.s + FRONT;
    let ok, title, body;
    if (stopped && front <= line + 0.3) { ok = true; title = should ? 'Arrêt correct' : 'Arrêté, de justesse'; body = should ? `Le feu est passé à l’orange à ${m0(D)}. Il te fallait environ ${m0(need)} pour t’arrêter : l’arrêt s’imposait.` : `Le feu est passé à l’orange à ${m0(D)} seulement. Tu as réussi à t’arrêter, mais un freinage aussi brusque peut surprendre la voiture qui te suit.`; }
    else if (stopped) { ok = false; title = 'Arrêté dans le carrefour'; body = `Freiner trop tard t’a immobilisé au milieu du carrefour. À ${m0(D)} de la ligne, il fallait ${should ? 'freiner tout de suite' : 'continuer'}.`; }
    else if (crossState === 'rouge') { ok = false; title = 'Feu rouge franchi'; body = `Le feu était déjà rouge quand tu as passé la ligne. À ${m0(D)}, tu avais la place pour t’arrêter (${m0(need)} nécessaires).`; Sound.ui('horn'); X.flash('ko'); }
    else if (should) { ok = false; title = 'Tu pouvais t’arrêter'; body = `Orange à ${m0(D)} : il te fallait environ ${m0(need)}. Le feu orange impose l’arrêt quand c’est possible sans danger.`; }
    else { ok = true; title = 'Bonne décision'; body = `Orange à ${m0(D)} : trop près pour t’arrêter sans danger (${m0(need)} nécessaires). Continuer était la bonne réponse.`; }
    if (ok) { Sound.ui('ok'); haptic('ok'); } else { Sound.ui('ko'); haptic('ko'); }
    res.push({ nom: `Feu ${i + 1} · orange à ${m0(D)}`, ok, score: ok ? 100 : 0, txt: title });
    X.msg(`<b>${esc(title)}</b><span>${body}</span>`, ok ? 'ok' : 'ko', stopped ? 4200 : 3600);
    if (stopped) { await X.tick(() => red); await X.sleep(2200); f.set('vert'); await X.sleep(400); }
    clearTimeout(redT); setTimeout(() => f.set('vert'), 4000);
    phase = 'drive'; if (!pressed) W.auto(ex.kmh);
  }
  await X.sleep(600);
  const score = Math.round(res.filter(r => r.ok).length / res.length * 100);
  return { score, lignes: res, conseil: 'Calcule vite ta distance d’arrêt : à 50 km/h sur sol sec, il faut 25 à 30 m (réaction comprise).' };
};

/* ---------- 5 & 6. Décisions : priorités et dépassements ---------- */
function mover(W, a, { axis, dir, speed, stopAt, wait }) {
  a.data = { axis, dir, speed, stopAt, wait, go: false, cur: 0, panic: false };
  a.tick = dt => {
    const d = a.data;
    let target = d.go ? d.speed : 0;
    const pos = axis === 'x' ? a.x : a.S;
    if (d.wait && stopAt !== undefined) { const rem = (stopAt - pos) * dir; if (rem < 14) target = Math.min(target, Math.max(0, d.speed * rem / 14)); if (rem < 0.4) target = 0; }
    if (d.panic) target = 0;
    const acc = target > d.cur ? 2.6 : d.panic ? 9 : 4;
    d.cur += Math.sign(target - d.cur) * Math.min(Math.abs(target - d.cur), acc * dt);
    a.brake = target < d.cur - 0.2 || (d.cur < 0.2 && d.go);
    if (axis === 'x') { a.vx = dir * d.cur; a.vS = 0; } else { a.vS = dir * d.cur; a.vx = 0; }
  };
  return a;
}

function stagePriorite(sc, X) {
  const W = X.W, Sc = 100, w = 7, env = sc.env || 'ville', gir = sc.ctrl === 'giratoire';
  W.load({ env, meteo: sc.meteo || 'jour', kmh: sc.kmh || 30, longueur: 300, depart: 12, carrefours: gir ? [] : [Sc], zones: gir ? [{ de: Sc - 4, a: Sc + 34 }] : [], reserve: [Sc - 8, Sc + 8], graine: 31, camera: 'cockpit' });
  W.lights({ croisement: sc.meteo === 'nuit', position: false, route: false, brouillardAv: false, brouillardAr: false });
  const sx = env === 'ville' ? 6.3 : 4.5;
  let ring = null;
  if (gir) { ring = W.giratoire(Sc); W.panneau('AB25', Sc - 48, sx); W.panneau('AB3a', Sc - 2, 4.6); }
  else {
    const ligne = sc.ctrl === 'stop' ? 'stop' : sc.ctrl === 'cedez' ? 'cedez' : (sc.ctrl || '').startsWith('feu') ? 'feu' : null;
    W.carrefour(Sc, { ligne, forme: sc.forme });
    if (sc.ctrl === 'stop') W.panneau('AB4', Sc - w / 2 - 1.2, 4.7);
    if (sc.ctrl === 'cedez') W.panneau('AB3a', Sc - w / 2 - 1.2, 4.7);
    if (sc.ctrl === 'prioritaire') W.panneau(sc.panneau || 'AB2', Sc - 45, sx);
    if (sc.ctrl === 'aucun' && sc.annonce) W.panneau('AB1', Sc - 45, sx);
    if ((sc.ctrl || '').startsWith('feu')) { const f = W.feu({ S: Sc - w / 2 - 1.0, x: 5.2 }); f.set(sc.ctrl === 'feu-vert' ? 'vert' : sc.ctrl === 'feu-rouge' ? 'rouge' : 'clignotant'); if (sc.ctrl === 'feu-clignotant') { let on = true; f.tick = (dt, t) => { const k = Math.sin(t * 6) > 0; if (k !== on) { on = k; f.set(k ? 'clignotant' : 'eteint'); } }; } }
    if (sc.passage) W.passage(Sc + w / 2 + 3, {});
  }
  (sc.panneaux || []).forEach(([id, d, x]) => W.panneau(id, Sc + d, x ?? sx));
  const actors = [];
  const meZone = { in: gir ? Sc - 0.5 : Sc - w / 2, out: gir ? Sc + 4 : Sc + w / 2 };
  (sc.acteurs || []).forEach(o => {
    const sp = ms(o.kmh || 30), cede = o.role === 'cede';
    let a;
    if (o.depuis === 'droite') { a = (o.type === 'velo' ? W.velo : ['ambulance', 'police', 'pompiers'].includes(o.type) ? W[o.type] : W.voiture)({ S: Sc + 1.75, x: 41, couleur: o.couleur }); a.g.rotation.y = Math.PI / 2; mover(W, a, { axis: 'x', dir: -1, speed: sp, stopAt: 6.6, wait: cede }); a.place = eta => { a.x = 9.5 + sp * eta * 0.85; }; a.conflict = () => a.x < 7.5 && a.x > -3; a.dist = () => a.x - 3.5; }
    else if (o.depuis === 'gauche') { a = (o.type === 'velo' ? W.velo : ['ambulance', 'police', 'pompiers'].includes(o.type) ? W[o.type] : W.voiture)({ S: Sc - 1.75, x: -41, couleur: o.couleur }); a.g.rotation.y = -Math.PI / 2; mover(W, a, { axis: 'x', dir: 1, speed: sp, stopAt: -6.6, wait: cede }); a.place = eta => { a.x = -(9.5 + sp * eta * 0.85); }; a.conflict = () => a.x > -7.5 && a.x < 3.5; a.dist = () => -3.5 - a.x; }
    else if (o.depuis === 'face') { a = (o.type === 'bus' ? W.bus : W.voiture)({ S: Sc + 48, x: -LANE, couleur: o.couleur, sens: -1 }); a.g.rotation.y = Math.PI; mover(W, a, { axis: 'S', dir: -1, speed: sp, stopAt: Sc + w / 2 + 2.4, wait: cede }); a.place = eta => { a.S = Sc + 12 + sp * eta * 0.85; }; a.conflict = () => a.S < Sc + w / 2 + 2 && a.S > Sc - w / 2 - 2; a.dist = () => a.S - (Sc + w / 2); }
    else if (o.depuis === 'pieton') { a = W.pieton({ S: o.S ? Sc + o.S : Sc + w / 2 + 3, x: o.x ?? 6.4, haut: pick(SHIRTS) }); a.g.rotation.y = Math.PI / 2; mover(W, a, { axis: 'x', dir: -1, speed: 1.4, stopAt: -8, wait: false }); a.conflict = () => a.x < 3.8 && a.x > -0.2; a.dist = () => 0; a.ped = true; }
    else if (o.depuis === 'derriere') { a = (['police', 'pompiers'].includes(o.type) ? W[o.type] : W.ambulance)({ S: -48, x: LANE }); mover(W, a, { axis: 'S', dir: 1, speed: ms(55), wait: false }); a.urgence = true; a.conflict = () => false; a.dist = () => 99; }
    else if (o.depuis === 'anneau') {
      a = W.voiture({ S: Sc, x: -12, couleur: o.couleur }); a.fixedHeading = true; const R = ring.R, cS = Sc + 14; let th = 1.5 * Math.PI - 14 / R - sp * 4 / R;
      a.data = { go: false, cur: 0, speed: sp, panic: false };
      a.tick = dt => { const d = a.data; const tgt = d.go && !d.panic ? d.speed : 0; d.cur += Math.sign(tgt - d.cur) * Math.min(Math.abs(tgt - d.cur), (d.panic ? 9 : 3) * dt); th += d.cur / R * dt; a.x = R * Math.cos(th); a.S = cS + R * Math.sin(th); a.vS = a.vx = 0; a.g.rotation.y = Math.atan2(R * Math.sin(th), R * Math.cos(th)) + Math.PI; a.brake = d.panic; a.th = th; };
      a.tick(0); a.conflict = () => { const t = ((a.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return t > Math.PI * 1.25 && t < Math.PI * 1.75; }; a.dist = () => { const t = ((a.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return (Math.PI * 1.25 - t) * R; };
    }
    a.role = o.role; actors.push(a);
  });
  return { Sc, gir, meZone, actors, Sdec: Sc - (gir ? 9 : w / 2 + 8.5), stopS: Sc - (gir ? 2.2 : w / 2 + 1.6), siren: (sc.acteurs || []).some(o => ['ambulance', 'police', 'pompiers'].includes(o.type)) };
}

async function playPriorite(st, sc, choice, X) {
  const W = X.W, passer = choice === 'passer';
  const amb = st.actors.find(a => a.urgence);
  if (amb) {
    if (!passer) { W.lane(3.0, 1300); W.auto(0, 3); } else { W.auto(sc.kmh || 30); }
    await X.tick(() => { if (amb.S > W.player.s - 14 && passer) { amb.data.speed = W.player.v; Sound.ui('horn'); return true; } if (amb.S > W.player.s + 25) return true; return false; });
    if (!passer) { amb.x = -LANE; await X.sleep(1800); W.lane(LANE, 1000); W.auto(25); } else { await X.sleep(2000); }
    return;
  }
  st.actors.forEach(a => { if (a.data) a.data.go = true; });
  let crossed = false, nearMiss = false;
  if (passer) W.auto(Math.max(20, sc.kmh || 30) * 0.8, 2.5);
  else W.auto(0, 2.6);
  const t0 = performance.now();
  await X.tick(() => {
    const p = W.player.s + FRONT;
    if (!passer) { if (W.player.s + FRONT > st.stopS) { W.player.v = Math.max(0, W.player.v - 0.6); } }
    if (st.gir && W.player.s + FRONT > st.Sc + 3) { W.auto(0, 6); W.player.v = Math.max(0, W.player.v - 0.5); }
    const meIn = p > st.meZone.in - 1 && W.player.s - 2 < st.meZone.out;
    st.actors.forEach(a => {
      if (a.role === 'prioritaire' && passer && !a.data.panic && meIn && a.dist() < 9 && a.dist() > -2) { a.data.panic = true; nearMiss = true; }
      if (a.role === 'cede' && a.data && W.player.s - 2 > st.meZone.out) a.data.wait = false;
      if (a.role === 'cede' && !passer && performance.now() - t0 > 2600 && a.data) a.data.wait = false;
    });
    if (W.player.s - 2 > st.meZone.out) crossed = true;
    if (!passer) {
      const busy = st.actors.some(a => a.conflict() || (a.role === 'prioritaire' && a.dist() > -1 && a.dist() < 22) || (a.ped && a.x > -1));
      if (!busy && performance.now() - t0 > 1800) { W.auto(22, 2.4); }
    }
    return performance.now() - t0 > 5200 || (crossed && performance.now() - t0 > 2600);
  });
  if (nearMiss) { Sound.ui('horn'); W.shake(0.9); X.flash('ko'); haptic('ko'); }
  return nearMiss;
}

async function stageDepassement(sc, X) {
  const W = X.W, slow = sc.lent || 'tracteur', vS = ms(slow === 'velo' ? 20 : slow === 'camion' ? 60 : 28);
  W.load({ env: 'route', meteo: sc.meteo || 'jour', kmh: kmh(vS), longueur: 1400, depart: 0, ligne: sc.ligne || [{ de: 0, a: 1400, type: 'discontinue' }], graine: 41, camera: 'cockpit', carrefours: sc.carrefour ? [sc.carrefour] : [] });
  const veh = slow === 'velo' ? W.velo({ S: 16, x: 2.7, haut: 0xFF7A1A }) : slow === 'camion' ? W.camion({ S: 20, x: LANE }) : W.tracteur({ S: 16, x: LANE });
  veh.vS = vS;
  (sc.panneaux || []).forEach(([id, S, x]) => W.panneau(id, S, x ?? 4.4));
  if (sc.carrefour) W.carrefour(sc.carrefour, {});
  let opp = null;
  if (sc.enFace) { opp = W.voiture({ S: sc.enFace, x: -LANE, couleur: 0xE84A4A, sens: -1 }); opp.vS = -ms(80); opp.g.rotation.y = Math.PI; }
  W.auto(kmh(vS));
  return { veh, opp, vS };
}
async function playDepassement(st, sc, choice, X) {
  const W = X.W;
  if (choice === 'rester') { W.auto(kmh(st.vS)); await X.sleep(2600); return false; }
  const straddle = sc.lent === 'velo';
  W.auto(kmh(st.vS) + (straddle ? 22 : 35), 3);
  Sound.ui('blink'); await X.sleep(500);
  const lc = W.lane(straddle ? 0.15 : -LANE, 1500);
  let abort = false;
  await X.tick(() => {
    if (st.opp && st.opp.S - W.player.s < 60 && !abort) { abort = true; return true; }
    return W.player.s > st.veh.S + (straddle ? 5 : 9);
  });
  if (abort) { Sound.ui('horn'); X.flash('ko'); W.shake(0.8); haptic('ko'); W.auto(kmh(st.vS) - 5, 5); await W.lane(LANE, 900); await X.sleep(1600); return true; }
  await lc; await W.lane(LANE, 1500); W.auto(kmh(st.vS) + 15); await X.sleep(1400); return false;
}

MECA.priorite = async (ex, X) => decision(ex, X, stagePriorite, playPriorite, ['Je passe', 'Je cède le passage'], ['passer', 'ceder']);
MECA.depassement = async (ex, X) => decision(ex, X, stageDepassement, playDepassement, ['Je double', 'Je reste derrière'], ['doubler', 'rester']);

async function decision(ex, X, stage, play, labels, keys) {
  const W = X.W, res = [];
  const list = ex.scenarios;
  for (let i = 0; i < list.length; i++) {
    const sc = list[i]; X.step(i + 1, list.length);
    if (i) await X.fade(true);
    const st = await stage(sc, X);
    if (i) { await wait(120); X.fade(false); }
    X.speedo(true, sc.limite || null); X.wet(sc.meteo === 'pluie');
    X.msg(`<b>${esc(sc.titre || '')}</b>${sc.contexte ? `<span>${esc(sc.contexte)}</span>` : ''}`, '', 2600);
    if (keys[0] === 'passer') {
      W.auto(sc.kmh || 30);
      await X.tick(() => { const rem = st.Sdec - W.player.s; if (rem < 30) W.auto(Math.max(14, (sc.kmh || 30) * 0.55), 2.5); if (rem < 22 && !st.woke) { st.woke = true; const vt = ms(Math.max(14, (sc.kmh || 30) * 0.55)), eta = rem / Math.max(2, (W.player.v + vt) / 2); st.actors.forEach(a => { if (a.place) a.place(eta); if (a.data && !a.urgence) a.data.go = true; }); } if (st.actors.some(a => a.urgence)) st.actors.forEach(a => { if (a.urgence) a.data.go = true; }); return rem <= 0; });
      if (st.actors.some(a => a.urgence)) { Sound.ui('siren'); X.msg('<b>Sirène deux tons derrière toi</b>', 'ko', 2200); }
      if (st.siren) { Sound.ui('siren'); X.msg('<b>Sirène deux tons</b><span>Un véhicule d’urgence arrive par la droite.</span>', 'ko', 2400); }
    } else await X.sleep(sc.attente || 2600);
    await W.slow(0.02, 500); X.speedo(false);
    W.pose(keys[0] === 'passer' ? 'drone' : 'poursuite', 1300);
    const c = await X.ask(sc.question || (keys[0] === 'passer' ? 'Tu passes ou tu cèdes ?' : 'Tu doubles maintenant ?'), labels, sc.indice || '');
    const choice = keys[c], ok = choice === sc.bonne;
    W.slow(1, 300); X.speedo(true, sc.limite || null);
    const incident = await play(st, sc, choice, X);
    if (ok) { Sound.ui('ok'); haptic('ok'); } else { Sound.ui('ko'); haptic('ko'); }
    res.push({ nom: sc.titre, ok, score: ok ? 100 : 0, txt: ok ? 'Bonne décision' : 'À revoir' });
    await X.verdict(ok, ok ? 'Bonne décision' : incident ? 'Accident évité de justesse' : 'Mauvaise décision', esc(sc.explication || ''));
    W.pose('cockpit', 600);
  }
  const score = Math.round(res.filter(r => r.ok).length / res.length * 100);
  return { score, lignes: res, conseil: keys[0] === 'passer' ? 'Regarde d’abord la signalisation, puis les autres usagers : panneau > feu > priorité à droite.' : 'Pour doubler : visibilité, ligne discontinue, personne en face, pas d’intersection. Si un seul manque, on attend.' };
}

/* ---------- 7. Perception des dangers ---------- */
const PERC = {
  ballon(W, S) { const b = W.ballon({ S, x: 3.9 }); const k = W.enfant({ S: S + 1.6, x: 5.3 }); k.g.rotation.y = Math.PI / 2; W.voiture({ S: S + 2.4, x: 4.6, couleur: 0x9AA3AF }); return { obj: b, hit: W.hitbox(b, 1.6, 1.4, 1.6), nom: 'Ballon sur la chaussée', exp: 'Un ballon annonce souvent un enfant qui court derrière.', danger: true }; },
  portiere(W, S) { const p = W.portiere({ S, x: 4.6 }); p.brake = true; return { obj: p, hit: W.hitbox(p, 2.2, 1.8, 4.4), nom: 'Conducteur dans une voiture garée', exp: 'Quelqu’un est assis au volant : la portière peut s’ouvrir.', danger: true }; },
  bus(W, S) { const b = W.bus({ S, x: 4.4 }); const p = W.pieton({ S: S - 6.2, x: 4.0, haut: 0xFF7A1A }); p.g.rotation.y = Math.PI / 2; return { obj: b, hit: W.hitbox(b, 3, 3.2, 11.5), nom: 'Bus à l’arrêt', exp: 'Des piétons peuvent surgir devant le bus.', danger: true }; },
  telephone(W, S) { const p = W.pieton({ S, x: 6.0, haut: 0x8E5CF6 }); p.g.rotation.y = Math.PI / 2; p.g.userData.anim.arms[1].rotation.x = -1.6; return { obj: p, hit: W.hitbox(p, 1.4, 2.1, 1.4), nom: 'Piéton distrait au bord du trottoir', exp: 'Les yeux sur son téléphone, il peut traverser sans regarder.', danger: true }; },
  velo(W, S) { const v = W.velo({ S, x: 3.0, haut: 0x12A150 }); W.voiture({ S: S + 6, x: 4.6, couleur: 0xE84A4A }); return { obj: v, hit: W.hitbox(v, 1.5, 2, 2.2), nom: 'Cycliste près des voitures garées', exp: 'Il peut s’écarter pour éviter une portière ou un obstacle.', danger: true }; },
  recul(W, S) { const c = W.voiture({ S, x: 6.8, couleur: 0x2FA37A }); c.g.rotation.y = Math.PI / 2 + 0.3; c.fixedHeading = true; c.g.userData.tail.color.set(0xffffff); c.g.userData.tail.emissive.set(0xffffff); c.brake = true; return { obj: c, hit: W.hitbox(c, 2.4, 1.8, 4.6), nom: 'Feux de recul allumés', exp: 'Feux blancs à l’arrière : la voiture va reculer vers la chaussée.', danger: true }; },
  camion(W, S) { const c = W.camion({ S, x: 4.5, couleur: 0xFF7A1A }); W.passage(S - 8); return { obj: c, hit: W.hitbox(c, 3, 3.2, 12), nom: 'Camion qui masque un passage piéton', exp: 'Un piéton peut sortir de derrière le camion, invisible pour toi.', danger: true }; },
  enfants(W, S) { const k = W.enfant({ S, x: 6.2 }); const k2 = W.enfant({ S: S + 1.2, x: 6.8, haut: 0x0EA5E9 }); k.g.rotation.y = Math.PI / 2; k2.g.rotation.y = Math.PI / 2; return { obj: k, hit: W.hitbox(k, 2.2, 1.4, 3.2), nom: 'Enfants au bord du trottoir', exp: 'Les enfants sont imprévisibles : ralentis et prépare-toi à freiner.', danger: true }; },
  pietonNuit(W, S) { const p = W.pieton({ S, x: 3.8, haut: 0x2a2e36, bas: 0x1d2026 }); p.g.rotation.y = Math.PI; return { obj: p, hit: W.hitbox(p, 1.6, 2.1, 1.6), nom: 'Piéton sans gilet sur le bas-côté', exp: 'Vêtements sombres : on ne le voit qu’au dernier moment.', danger: true }; },
  veloNuit(W, S) { const v = W.velo({ S, x: 3.0, haut: 0x2a2e36 }); return { obj: v, hit: W.hitbox(v, 1.5, 2, 2.2), nom: 'Cycliste sans éclairage', exp: 'Sans feux ni gilet, il est presque invisible la nuit.', danger: true }; },
  biche(W, S) { const b = W.biche({ S, x: -7.5 }); b.g.rotation.y = -Math.PI / 2; return { obj: b, hit: W.hitbox(b, 2, 2, 2), nom: 'Animal au bord de la route', exp: 'Un animal peut traverser d’un bond, souvent suivi d’un autre.', danger: true }; },
  tracteur(W, S) { const t = W.tracteur({ S, x: 9 }); t.g.rotation.y = Math.PI / 2; t.fixedHeading = true; return { obj: t, hit: W.hitbox(t, 2.6, 3, 4.6), nom: 'Tracteur qui sort d’un champ', exp: 'Lent et large, il va s’engager sur la route.', danger: true }; },
  panne(W, S) { const c = W.voiture({ S, x: 4.2, couleur: 0x9AA3AF }); c.brake = true; const p = W.pieton({ S: S - 3, x: 3.1, gilet: true }); p.g.rotation.y = Math.PI / 2; return { obj: c, hit: W.hitbox(c, 2.4, 1.9, 6), nom: 'Voiture en panne sur le bas-côté', exp: 'Quelqu’un marche à côté, sur la chaussée.', danger: true }; },
  joggeur(W, S) { const p = W.pieton({ S, x: 3.4, haut: 0xFF2D55 }); p.go(-2.4, 0); return { obj: p, hit: W.hitbox(p, 1.3, 2.1, 1.3), nom: 'Joggeur sur le bord de la chaussée', exp: 'Il court vers toi, au ras de ta voie.', danger: true }; },
  // leurres
  passant(W, S) { const p = W.pieton({ S, x: 7.6, haut: pick(SHIRTS) }); p.go(1.1, 0); return { obj: p, hit: W.hitbox(p, 1.2, 2, 1.2), nom: 'Passant qui s’éloigne', exp: 'Il marche sur le trottoir, loin de la chaussée.', danger: false }; },
  garee(W, S) { const c = W.voiture({ S, x: 4.6, couleur: 0x9AA3AF }); return { obj: c, hit: W.hitbox(c, 2.2, 1.8, 4.4), nom: 'Voiture garée vide', exp: 'Personne à bord, feux éteints.', danger: false }; },
  face(W, S) { const c = W.voiture({ S, x: -LANE, couleur: 0x3A6DF0, sens: -1 }); c.g.rotation.y = Math.PI; return { obj: c, hit: W.hitbox(c, 2.2, 1.8, 4.4), nom: 'Voiture en face, dans sa voie', exp: 'Elle reste dans sa voie.', danger: false }; }
};
MECA.danger = async (ex, X) => {
  const W = X.W, res = [];
  for (let i = 0; i < ex.scenes.length; i++) {
    const sc = ex.scenes[i]; X.step(i + 1, ex.scenes.length);
    if (i) await X.fade(true);
    const items = sc.elements.map(([t, d]) => ({ t, d }));
    // la rue défile quelques secondes avant l'arrêt sur image : la voiture part un peu plus loin en arrière
    const EXTRA = 2.2;
    if (Engine && Engine.hiRes) Engine.hiRes(false);
    W.load({ env: sc.env || 'ville', meteo: sc.meteo || 'jour', kmh: 18, longueur: 400, depart: -5 * EXTRA, reserve: items.map(it => it.d + 18), graine: 50 + i });
    W.lights({ croisement: sc.meteo === 'nuit', position: false, route: false, brouillardAv: false, brouillardAr: false });
    (sc.panneaux || []).forEach(([id, d, x]) => W.panneau(id, d, x));
    const els = items.map(it => PERC[it.t](W, it.d + 18));
    els.forEach(e => { const a = e.obj; if (a && a.vS) a.S -= a.vS * EXTRA; });
    if (i) { await wait(120); X.fade(false); }
    X.speedo(true);
    W.auto(18);
    X.obs(true, 1.3 + EXTRA + 0.3);
    await X.sleep(1300 + EXTRA * 1000);
    await W.slow(0, 600);
    X.obs(false);
    if (Engine && Engine.hiRes) Engine.hiRes(true);
    X.speedo(false);
    W.setPick(els.map(e => e.hit));
    W.setAnchors(els.map(e => ({ id: e.nom, obj: e.obj, dy: 2.2 })));
    const n = els.filter(e => e.danger).length; let found = 0, wrong = 0; const marks = new Set();
    X.msg(`<b>Arrêt sur image</b><span>Touche les ${n} dangers potentiels.</span>`, '', 2200);
    const T = sc.temps || 14;
    X.ctl(`<div class="xtimer"><i id="xTbar"></i></div><div class="xfound"><b class="num" id="xFound">0</b><span>/ ${n} trouvés</span></div>`);
    const t0 = performance.now();
    const view = $('#v-exo');
    const tap = e => {
      const k = Engine.pick(e.clientX, e.clientY); if (k === null || k === undefined || k < 0 || marks.has(k)) return;
      marks.add(k); const el = els[k];
      if (el.danger) { found++; Sound.ui('ok'); haptic('ok'); $('#xFound').textContent = found; } else { wrong++; Sound.ui('ko'); haptic('ko'); }
      Labels.set([...marks].map(j => els[j].nom), [...marks].map(j => [els[j].danger ? '✓ Danger' : '✕ Pas un danger', els[j].nom]), 'exo');
      W.setAnchors([...marks].map(j => ({ id: els[j].nom, obj: els[j].obj, dy: 2.2 })));
    };
    view.addEventListener('pointerdown', tap);
    try { await X.tick(() => { const k = (performance.now() - t0) / 1000 / T; const bar = $('#xTbar'); if (bar) bar.style.transform = `scaleX(${Math.max(0, 1 - k)})`; Labels.frame(); return k >= 1 || found >= n; }); }
    finally { view.removeEventListener('pointerdown', tap); }
    // révélation
    W.setAnchors(els.filter(e => e.danger).map(e => ({ id: e.nom, obj: e.obj, dy: 2.2 })));
    const dang = els.filter(e => e.danger);
    Labels.set(dang.map(e => e.nom), dang.map(e => [marks.has(els.indexOf(e)) ? '✓ Trouvé' : '! Manqué', e.nom]), 'exo');
    const stopL = W.onTick(() => Labels.frame());
    const sc100 = Math.max(0, Math.round((found / n) * 100 - wrong * 15));
    res.push({ nom: sc.titre || `Scène ${i + 1}`, ok: sc100 >= 70, score: sc100, txt: `${found}/${n} dangers · ${wrong} erreur${wrong > 1 ? 's' : ''}` });
    await X.verdict(sc100 >= 70, `${found} sur ${n} dangers repérés`, dang.map(e => `<span class="xli ${marks.has(els.indexOf(e)) ? 'ok' : 'ko'}"><b>${esc(e.nom)}</b> ${esc(e.exp)}</span>`).join(''));
    stopL(); Labels.clear(); W.setPick([]); W.setAnchors([]); X.ctl('');
    await W.slow(1, 1);
  }
  const score = Math.round(res.reduce((a, r) => a + r.score, 0) / res.length);
  return { score, lignes: res, conseil: 'Balaye toute la scène : trottoirs, voitures garées, intersections. Un danger se devine avant d’arriver.' };
};

/* ---------- 8. Éclairage ---------- */
const FEUX = [
  { k: 'position', n: 'Position', i: '<path d="M8 7c-2.5 0-4 2.2-4 5s1.5 5 4 5h1V7H8Z"/><path d="M13 9.5h3M13 14.5h3"/>' },
  { k: 'croisement', n: 'Croisement', i: '<path d="M8 6c-3 0-5 2.7-5 6s2 6 5 6h1V6H8Z"/><path d="M12 9l7 2M12 12.5l7 2M12 16l7 2"/>' },
  { k: 'route', n: 'Route', i: '<path d="M8 6c-3 0-5 2.7-5 6s2 6 5 6h1V6H8Z"/><path d="M12 8h8M12 12h8M12 16h8"/>' },
  { k: 'brouillardAv', n: 'Brouillard AV', i: '<path d="M8 6c-3 0-5 2.7-5 6s2 6 5 6h1V6H8Z"/><path d="M12 9l7 2M12 12.5l7 2M12 16l7 2"/><path d="M15 7.5v11" stroke-dasharray="1.6 1.6"/>' },
  { k: 'brouillardAr', n: 'Brouillard AR', i: '<path d="M16 6c3 0 5 2.7 5 6s-2 6-5 6h-1V6h1Z"/><path d="M4 9h7M4 12h7M4 15h7"/><path d="M8 7v10" stroke-dasharray="1.6 1.6"/>' },
  { k: 'detresse', n: 'Détresse', i: '<path d="M12 4 3 19h18L12 4Z"/><path d="M12 9.5 7.5 17h9L12 9.5Z"/>' }
];
MECA.eclairage = async (ex, X) => {
  const W = X.W, res = [];
  for (let i = 0; i < ex.situations.length; i++) {
    const sc = ex.situations[i]; X.step(i + 1, ex.situations.length);
    if (i) await X.fade(true);
    W.load({ env: sc.env || 'route', meteo: sc.meteo || 'nuit', kmh: sc.kmh ?? 50, longueur: 2400, graine: 60 + i, camera: sc.camera || 'cockpit', zones: sc.tunnel ? [{ de: 30, a: 900 }] : [] });
    if (sc.tunnel) W.tunnel(40, 900);
    if (sc.bouchon) [0, 6.4, 12.8].forEach((d, k) => { const c = W.voiture({ S: sc.bouchon + d, x: LANE, couleur: [0x2E3440, 0xE84A4A, 0x9AA3AF][k] }); c.brake = true; });
    if (sc.kmh === 0) W.auto(0);
    const cur = { position: false, croisement: false, route: false, brouillardAv: false, brouillardAr: false, detresse: false };
    W.lights(cur);
    if (i) { await wait(120); X.fade(false); }
    if (sc.enFace) { const c = W.voiture({ S: 260, x: -LANE, couleur: 0x9AA3AF, sens: -1 }); c.vS = -ms(60); c.g.rotation.y = Math.PI; }
    if (sc.devant) { const c = W.voiture({ S: 26, x: LANE, couleur: 0x2E3440 }); c.vS = ms(sc.kmh || 50); }
    if (sc.bouchon && sc.kmh) { const stopAt = sc.bouchon - 9; const t0 = W.onTick(() => { const rem = stopAt - (W.player.s + FRONT); if (rem < W.player.v * W.player.v / 6 + 6) { W.auto(0, 3); t0(); } }); }
    X.wet(sc.meteo === 'pluie'); X.speedo(true);
    X.msg(`<b>${esc(sc.titre)}</b><span>${esc(sc.contexte || 'Allume les bons feux, puis valide.')}</span>`, '', 3400);
    X.ctl(`<div class="xlights">${FEUX.map(f => `<button class="xlight" data-k="${f.k}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${f.i}</svg><span>${f.n}</span></button>`).join('')}</div><button class="btn" id="xValide">Valider</button>`);
    $$('.xlight').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; cur[k] = !cur[k]; if (k === 'route' && cur.route) cur.croisement = false; if (k === 'croisement' && cur.croisement) cur.route = false; $$('.xlight').forEach(x => x.setAttribute('aria-pressed', cur[x.dataset.k])); W.lights(cur); Sound.ui('tick'); haptic(); }));
    await Promise.race([new Promise(r => $('#xValide').addEventListener('click', r, { once: true })), X.tick(() => false)]);
    const want = sc.bons, also = sc.permis || [], keys = FEUX.map(f => f.k);
    const ok = keys.every(k => want.includes(k) ? (!!cur[k] || (k === 'position' && (cur.croisement || cur.route))) : (!cur[k] || also.includes(k) || (k === 'position' && (cur.croisement || cur.route))));
    if (ok) { Sound.ui('ok'); haptic('ok'); } else { Sound.ui('ko'); haptic('ko'); }
    const good = want.length ? want.map(k => FEUX.find(f => f.k === k).n).join(' + ') : 'Aucun feu à allumer';
    res.push({ nom: sc.titre, ok, score: ok ? 100 : 0, txt: ok ? 'Bons feux' : `Attendu : ${good}` });
    X.ctl('');
    await X.verdict(ok, ok ? 'Bons feux' : `Il fallait : ${good}`, esc(sc.explication || ''));
  }
  const score = Math.round(res.filter(r => r.ok).length / res.length * 100);
  return { score, lignes: res, conseil: 'Voir et être vu : croisement dès que la visibilité baisse, route seulement si personne n’est ébloui.' };
};

/* ======================= Écran d'exercice ======================= */
let X = null, curEx = null;
function examBlanc() {
  // comme le jour du code : surtout des situations (vidéo ou image), et quelques questions de cours
  const all = EXOS.filter(e => e.meca === 'examen').flatMap(e => e.situations), mix = a => a.slice().sort(() => Math.random() - 0.5);
  const s3 = mix(all.filter(s => modeOf(s) !== 'qcm')), sq = mix(all.filter(s => modeOf(s) === 'qcm'));
  const nq = Math.min(sq.length, 8), pool = mix(s3.slice(0, Math.min(40 - nq, s3.length)).concat(sq.slice(0, nq)));
  return { id: 'x-exam-blanc', meca: 'examen', mode: 'blanc', famille: 'Examen blanc', niveau: 3, duree: '15 min', titre: 'Examen blanc en situation', sous: `${pool.length} situations, correction à la fin`,
    consigne: `${pool.length} situations comme le jour du code : 20 secondes pour répondre, pas de correction avant la fin. Il faut 35 bonnes réponses sur 40 pour réussir.`,
    astuce: 'Une ou plusieurs réponses peuvent être justes : coche-les toutes.', env: pool[0].env || 'ville', situations: pool };
}
async function runExo(id, retour) {
  const ex = id === 'x-exam-blanc' ? examBlanc() : EXOS.find(e => e.id === id); if (!ex) return;
  retourX = retour && retour !== 'exo' ? retour : 'exos';
  if (ex.meca === 'decodeur') { show('decodeur'); return; }
  curEx = ex;
  await show('exo', { force: true });
  intro(ex);
}
function intro(ex) {
  stopRun();
  const W = SIM;
  if (W) { W.load({ env: ex.env || (ex.scenes ? ex.scenes[0].env : null) || (ex.situations && ex.situations[0].env) || 'route', meteo: ex.meteo || 'jour', kmh: 22, longueur: 1600, graine: 3 }); W.pose('poursuite', 0); W.lights({ croisement: ex.meteo === 'nuit', position: false, route: false, brouillardAv: false, brouillardAr: false }); }
  $('#xTitle').textContent = ex.titre; $('#xStep').textContent = ''; X && X.ctl('');
  $('#xCtl').innerHTML = ''; $('#xSpeed').hidden = true; $('#xGap').hidden = true; $('#xWet').hidden = ex.meteo !== 'pluie'; $('#xMsg').classList.remove('on');
  const b = best(ex.id);
  const c = $('#xCard'); c.className = 'xcard xintro'; c.hidden = false;
  c.innerHTML = `<div class="xi-top"><span class="xi-ic">${icon(ex.meca)}</span><div><span class="xi-k">${esc(ex.famille || '')}</span><h2>${esc(ex.titre)}</h2></div></div>
    <p class="xi-p">${fr(ex.consigne || ex.sous || '')}</p>
    ${ex.astuce ? `<div class="xi-tip">${plot({ size: 54 })}<p>${fr(ex.astuce)}</p></div>` : ''}
    <div class="xi-meta"><span>${esc(ex.duree || '2 min')}</span><span>${'●'.repeat(ex.niveau || 1)}${'○'.repeat(3 - (ex.niveau || 1))} niveau</span>${b ? `<span>Record ${b.score}</span>` : ''}</div>
    <button class="btn" id="xGo">Démarrer</button>`;
  requestAnimationFrame(() => c.classList.add('on'));
  $('#xGo').addEventListener('click', () => start(ex), { once: true });
}
async function start(ex) {
  haptic(); Sound.init(); Sound.ui('tap');
  const c = $('#xCard'); c.classList.remove('on'); setTimeout(() => { c.hidden = true; }, 250);
  stopRun();
  X = makeX(ex);
  // compte à rebours
  const cd = $('#xCount'); cd.hidden = false;
  for (const n of ['3', '2', '1']) { cd.textContent = n; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); Sound.ui('tick'); await wait(650); if (!X.live()) return; }
  cd.hidden = true;
  Sound.ambience('route');
  let sndT = 0, lastK = -1; const kEl = $('#xKmh');
  const stopSnd = SIM.onTick(dt => { sndT += dt; if (sndT > 0.12) { sndT = 0; Sound.speed(SIM.player.v * 3.6); } });
  const stopKmh = SIM.onTick(() => { const k = Math.round(SIM.player.v * 3.6); if (k !== lastK) { lastK = k; kEl.textContent = k; } });
  let out = null;
  try { out = await MECA[ex.meca](ex, X); }
  catch (e) { if (!(e instanceof Abort)) console.error(e); }
  finally { stopSnd(); stopKmh(); Sound.speed(0); }
  if (!out || !X.live()) return;
  X.stop();
  saveBest(ex.id, out.score);
  results(ex, out);
}
function results(ex, out) {
  $('#xCtl').innerHTML = ''; $('#xSpeed').hidden = true; $('#xGap').hidden = true; Labels.clear();
  SIM.pose('poursuite', 1400); SIM.auto(0, 2);
  const cr = ex.cours && course(ex.cours);
  const nextL = ex.id.startsWith('p-') && cr && out.score >= 70 ? COURSES[COURSES.indexOf(cr) + 1] : null;
  const c = $('#xCard'); c.className = 'xcard xresult'; c.hidden = false;
  c.innerHTML = `<div class="xr-head">${plot({ size: 64, mood: out.score >= 70 ? 'cheer' : 'oops' })}<div><span class="xi-k">${esc(ex.titre)}</span><div class="xr-score">${out.total ? `<b class="num">${out.total.split(' / ')[0]}</b><span>/ ${out.total.split(' / ')[1]}</span>` : `<b class="num">${out.score}</b><span>/ 100</span>`}</div>${starsHtml(out.score)}</div></div>
    <ul class="xr-list">${out.lignes.map(l => `<li class="${l.ok === null ? 'n' : l.ok ? 'ok' : 'ko'}"><i></i><div><b>${esc(l.nom)}</b><span>${esc(l.txt)}</span></div></li>`).join('')}</ul>
    <p class="xr-tip">${esc(out.conseil || '')}</p>
    <div class="xr-btns"><button class="btn ghost" id="xAgain">Rejouer</button><button class="btn" id="xDone">Terminer</button></div>
    ${cr ? `<button class="more" data-go="fiche" data-arg="${cr.id}">Revoir le cours « ${esc(cr.titre)} » →</button>` : ''}${nextL ? `<button class="more" data-go="fiche" data-arg="${nextL.id}">Leçon suivante : « ${esc(nextL.titre)} » →</button>` : ''}`;
  requestAnimationFrame(() => c.classList.add('on'));
  react(c, out.score >= 70);
  $('#xAgain').addEventListener('click', () => intro(ex), { once: true });
  $('#xDone').addEventListener('click', () => show(retourX), { once: true });
  Sound.ui(out.score >= 70 ? 'ok' : 'ko');
}
function stopRun() { sub(null); if (Engine && Engine.hidden) Engine.hidden(false); { const se = $('#s-exo'); if (se) se.classList.remove('qcm'); } { const pg = $('#xProg'); if (pg) { pg.hidden = true; pg.innerHTML = ''; } } if (Engine && Engine.hiRes) Engine.hiRes(false); { const d = $('#v-exo .dash'); if (d) d.hidden = true; } const v3 = $('#v-exo'); if (v3 && v3.style.bottom) { v3.style.bottom = ''; syncRegion(); } { const z = $('#xZoom'); if (z) z.classList.remove('on'); const t = $('#s-exo .xtitle'); if (t) t.classList.remove('obs'); } { const f = $('#xFade'); if (f) f.classList.remove('on', 'txt'); } if (X) X.stop(); X = null; if (SIM) { SIM.slow(1, 0); SIM.guide(0); SIM.setPick([]); SIM.setAnchors([]); } Labels.clear(); }

/* ======================= Hub « Exercices » ======================= */
export function renderExos() {
  const P = EXOS.filter(e => e.meca === 'examen'), done = P.filter(e => best(e.id)).length;
  $('#xHubStats').innerHTML = `<div><b class="num">${done}/${P.length}</b><span>pratiques faites</span></div><div><b class="num">${P.reduce((a, e) => a + e.situations.length, 0)}</b><span>situations</span></div><div><b class="num">${EXOS.reduce((a, e) => a + stars((best(e.id) || {}).score || 0), 0)}</b><span>étoiles</span></div>`;
  // la pratique de la prochaine leçon à travailler : cours vu, pratique pas encore faite (sinon la première non faite)
  const nx = COURSES.find(c => courseState(c.id).done && !best('p-' + c.id)) || COURSES.find(c => !best('p-' + c.id)) || COURSES[0];
  const feat = practiceOf(nx.id) || P[0];
  $('#xFeat').innerHTML = `<button class="feat" data-exo="${feat.id}"><span class="feat-k">${icon('examen')}Pratique · Cours ${courseNumber(nx)}</span><b>${esc(feat.titre)}</b><span>${esc(feat.sous || '')}</span><i>Jouer</i></button>`;
  $('#xHubList').innerHTML = THEMES.map(t => {
    const list = COURSES.filter(c => c.theme === t.id && practiceOf(c.id)); if (!list.length) return '';
    return `<h2 class="h-sec">${esc(t.nom)}<small>${list.length} leçon${list.length > 1 ? 's' : ''}</small></h2><ul class="cells">${list.map(c => {
      const e = practiceOf(c.id), b = best(e.id), d = defisOf(c.id);
      return `<li><button class="cell" data-exo="${e.id}"><span class="cell-ic m-examen"><b class="num">${courseNumber(c)}</b></span><span class="cell-t"><b>${esc(c.titre)}</b><small>${esc(e.sous || `${e.situations.length} situations`)}${d.length ? ` · ${d.length} défi${d.length > 1 ? 's' : ''}` : ''}</small></span><span class="cell-r">${b ? starsHtml(b.score) : `<em>${esc(e.duree || '')}</em>`}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></button></li>${d.map(x => { const bx = best(x.id); return `<li><button class="cell sub" data-exo="${x.id}"><span class="cell-ic m-${x.meca}">${icon(x.meca)}</span><span class="cell-t"><b>${esc(x.titre)}</b><small>Défi 3D · ${esc(x.sous || '')}</small></span><span class="cell-r">${bx ? starsHtml(bx.score) : `<em>${esc(x.duree || '')}</em>`}</span></button></li>`; }).join('')}`;
    }).join('')}</ul>`;
  }).join('');
}
export function renderHomeExos() {
  const el = $('#homeExos'); if (!el) return;
  const nx = COURSES.find(c => !best('p-' + c.id)) || COURSES[0], i0 = Math.max(0, COURSES.indexOf(nx));
  const pickL = COURSES.slice(i0, i0 + 6).map(c => 'p-' + c.id);
  el.innerHTML = pickL.map(id => EXOS.find(e => e.id === id)).filter(Boolean).map(e => { const b = best(e.id); return `<button class="xcar m-${e.meca}" data-exo="${e.id}"><span class="cell-ic m-${e.meca}">${icon(e.meca)}</span><b>${esc(e.titre)}</b><small>${esc(e.sous || '')}</small><span class="xcar-f">${b ? starsHtml(b.score) : `<em>${esc(e.duree || '')}</em>`}</span></button>`; }).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-exo]'); if (!b) return; haptic(); Sound.ui('tap'); runExo(b.dataset.exo, currentScreen()); });

export function setupExos() {
  // la liste des exercices vit dans l'onglet « S'entraîner » (screens.js) ; « exos » y mène toujours, côté conduite
  register('exo', { world: 'sim', amb: null, noTab: true, tab: 'entrainer', region: () => $('#v-exo'), enter(prev, o) { if (o && o.arg) runExo(o.arg); }, leave() { stopRun(); Sound.ambience(null); } });
  $('#xQuit').addEventListener('click', () => { haptic(); stopRun(); show(retourX); });
}
export const Exos = { run: runExo, list: () => EXOS };
