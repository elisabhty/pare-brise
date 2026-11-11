/* Exercices immersifs en 3D : on conduit, on réagit, on décide.
   Chaque exercice est décrit en JSON (content/exercices.json) et joué par une « mécanique » :
   freinage · vitesse · distance · feu · priorite · depassement · danger · eclairage. */
import { $, $$, esc, wait, store, haptic } from './util.js';
import { has3D, Engine, SIM } from './world.js';
import { sign } from './signs.js';
import { EXOS, course } from './content.js';
import { Sound } from './sound.js';
import { Labels } from './labels.js';
import { register, show } from './nav.js';
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
  reflexe: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  decodeur: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l7.5 7.5"/>'
};
export const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ICON.danger}</svg>`;

export const FAMILLES = [
  { id: 'reflexes', nom: 'Réflexes', sous: 'Réagir au bon moment', meca: ['freinage', 'feu', 'reflexe'] },
  { id: 'maitrise', nom: 'Maîtrise', sous: 'Vitesse et distances', meca: ['vitesse', 'distance'] },
  { id: 'decisions', nom: 'Décisions', sous: 'Qui passe, quand doubler', meca: ['priorite', 'depassement'] },
  { id: 'perception', nom: 'Perception', sous: 'Voir et être vu', meca: ['danger', 'eclairage'] }
];
export const best = id => (store.get('exoBest', {}) || {})[id] || null;
const saveBest = (id, score) => { const all = store.get('exoBest', {}) || {}; if (!all[id] || score > all[id].score) all[id] = { score, at: Date.now() }; store.set('exoBest', all); };
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
    step(i, n) { $('#xStep').textContent = n > 1 ? `${i} sur ${n}` : ''; },
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
    gap(on) { $('#xGap').hidden = !on; }
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

/* ---------- 1. Freinage d'urgence ---------- */
MECA.freinage = async (ex, X) => {
  const W = X.W, v0 = ms(ex.kmh), meteo = ex.meteo || 'jour', env = ex.env || 'ville';
  const gap = Math.max(150, v0 * 11);
  const evs = ex.evenements.map((t, i) => ({ t, S: 110 + i * gap }));
  W.load({ env, meteo, kmh: ex.kmh, longueur: evs[evs.length - 1].S + 240, reserve: evs.map(e => e.S), graine: ex.id.length });
  W.lights({ croisement: meteo === 'nuit' || meteo === 'brouillard', position: false, route: false, brouillardAv: false, brouillardAr: false });
  (ex.panneaux || []).forEach(([id, S, x]) => W.panneau(id, S, x ?? (env === 'ville' ? 6.2 : 4.4)));
  X.wet(meteo === 'pluie');
  const list = evs.map(e => Object.assign(HZ[e.t](W, e.S, { nuit: meteo === 'nuit' }), { type: e.t }));
  X.speedo(true, ex.limite || ex.kmh);
  let phase = 'drive', pressed = false, onPress = null;
  X.ctl(`<button class="pedal brake big" id="xBrake" aria-label="Freiner"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="4" fill="currentColor" opacity=".25"/><path d="M8 8h8M8 12h8M8 16h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Freiner</span></button>`);
  X.hold($('#xBrake'), () => { pressed = true; W.emergency(); Sound.ui('brake'); haptic('heavy'); if (onPress) onPress(); }, () => { pressed = false; if (phase === 'drive') W.auto(ex.kmh); });
  const res = [];
  for (let i = 0; i < list.length; i++) {
    const h = list[i]; X.step(i + 1, list.length);
    const a = W.player.decel;
    h.trig = h.type === 'bouchon' ? v0 * 6 : v0 * h.extra + v0 * v0 / (2 * a) + 2.5;
    await X.tick(() => W.player.s + FRONT >= h.S - h.trig);
    const sTrig = W.player.s, vTrig = W.player.v, tTrig = performance.now();
    let tPress = pressed ? tTrig : 0, sPress = pressed ? sTrig : 0;
    onPress = () => { if (!tPress) { tPress = performance.now(); sPress = W.player.s; } };
    phase = 'hazard'; h.start();
    let out = null;
    await X.tick(dt => {
      h.tick && h.tick(dt);
      const front = W.player.s + FRONT;
      if (h.real && h.inLane() && front >= h.S - h.half && W.player.v > 0.3) { out = { hit: true, v: W.player.v }; return true; }
      if (W.player.v < 0.15 && (tPress || pressed)) { out = { stop: true, rest: h.S - h.half - front }; return true; }
      if (front > h.S + 3) { out = { passed: true }; return true; }
      return false;
    });
    onPress = null;
    const tr = tPress ? (tPress - tTrig) / 1000 : null;
    if (out.hit) {
      const vi = kmh(out.v); W.player.v = 0; W.emergency(); W.shake(1.6); X.flash('ko'); Sound.ui('crash'); haptic('ko');
      if (tPress) showBands(X, W.bandes(sTrig + FRONT, sPress - sTrig, W.player.s - sPress), sPress - sTrig, W.player.s - sPress);
      X.msg(`<b>Choc à ${vi} km/h</b><span>${tr !== null ? `Réaction ${n1(tr)} s` : 'Pas de freinage'}</span>`, 'ko', 2800);
      res.push({ nom: h.nom, ok: false, score: 0, txt: `Choc à ${vi} km/h${tr !== null ? ` · réaction ${n1(tr)} s` : ' · pas de freinage'}` });
      await X.sleep(2600);
      W.actors.filter(x => Math.abs(x.S - h.S) < 3 && x.kind !== 'voiture').forEach(x => x.remove());
      if (h.type === 'bouchon' || h.type === 'sortie' || h.type === 'portiere') h.resume();
    } else if (out.stop) {
      const dR = sPress - sTrig, dB = W.player.s - sPress;
      const bandsShown = showBands(X, W.bandes(sTrig + FRONT, dR, dB), dR, dB);
      if (h.real) {
        const sc = Math.round(Math.max(55, Math.min(100, 100 - Math.max(0, (tr ?? 0) - 0.75) * 70)));
        const vp = vTrig + ms(20), avail = h.S - h.half - (sTrig + FRONT), dr = vp * (tr ?? 1), rest = avail - dr;
        const what = rest <= 0 ? `choc à ${kmh(vp)} km/h` : vp * vp / (2 * a) > rest ? `choc à ${kmh(Math.sqrt(vp * vp - 2 * a * rest))} km/h` : `arrêt à ${m0(rest - vp * vp / (2 * a))} seulement`;
        Sound.ui('ok'); haptic('ok');
        X.msg(`<b>Arrêt à ${m0(out.rest)}</b><span>Réaction ${n1(tr ?? 0)} s · ${m0(dR)} parcourus · freinage ${m0(dB)}</span><em>À ${kmh(vTrig) + 20} km/h : ${what}</em>`, 'ok', 3600);
        res.push({ nom: h.nom, ok: true, score: sc, txt: `Arrêt à ${m0(out.rest)} · réaction ${n1(tr ?? 0)} s` });
      } else {
        X.msg(`<b>Il attendait sur le trottoir</b><span>Lever le pied suffisait : un arrêt brutal surprend ceux qui te suivent.</span>`, 'neutre', 3200);
        res.push({ nom: h.nom, ok: null, txt: 'Freinage inutile, mais prudent' });
      }
      await X.sleep(2400); await bandsShown;
      h.resume(); await X.sleep(h.type === 'bouchon' ? 1800 : 1500);
    } else {
      if (!h.real) { res.push({ nom: h.nom, ok: null, txt: 'Bien vu : il attendait' }); X.msg('<b>Bien vu</b><span>Il attendait sur le trottoir.</span>', 'neutre', 1800); }
      else res.push({ nom: h.nom, ok: true, score: 80, txt: 'Danger évité' });
    }
    phase = 'drive'; if (!pressed) W.auto(ex.kmh);
  }
  await X.sleep(800);
  const real = res.filter(r => r.ok !== null);
  const score = Math.round(real.reduce((s, r) => s + r.score, 0) / Math.max(1, real.length));
  return { score, lignes: res, conseil: score >= 90 ? 'Réflexes au top. Garde cette attention en conduite réelle.' : 'Anticipe : un ballon, une portière, un piéton au bord du trottoir… le pied se prépare avant le danger.' };
};

/* ---------- 2. Respecter les limitations ---------- */
MECA.vitesse = async (ex, X) => {
  const W = X.W, meteo = ex.meteo || 'jour', env = ex.env || 'route';
  let S = 0; const zones = ex.zones.map(z => { const o = { ...z, S0: S }; S += z.d; return o; });
  const total = S;
  W.load({ env, meteo, kmh: zones[0].lim, longueur: total + 260, graine: 11, ligne: ex.ligne });
  W.lights({ croisement: meteo !== 'jour', brouillardAv: meteo === 'brouillard', route: false, position: false, brouillardAr: meteo === 'brouillard' });
  X.wet(meteo === 'pluie');
  zones.forEach((z, i) => { if (z.panneau) W.panneau(z.panneau, z.S0 + (i ? 0 : 25), env === 'autoroute' ? 7.4 : 4.4); (z.extra || []).forEach(([id, d]) => W.panneau(id, z.S0 + d, env === 'autoroute' ? 7.4 : 4.4)); if (z.maisons) W.maisons(z.S0 + 10, z.S0 + z.d - 10, i + 2); });
  W.manual(); W.player.v = ms(zones[0].lim);
  X.speedo(true, zones[0].lim);
  X.ctl(`<button class="pedal brake" id="xBrake" aria-label="Frein"><span>Frein</span></button><button class="pedal gas" id="xGas" aria-label="Accélérateur"><span>Accélérer</span></button>`);
  let g = 0, b = 0;
  X.hold($('#xGas'), () => { g = 1; W.pedals(g, b); haptic(); }, () => { g = 0; W.pedals(g, b); });
  X.hold($('#xBrake'), () => { b = 1; W.pedals(g, b); haptic(); }, () => { b = 0; W.pedals(g, b); });
  const st = zones.map(() => ({ ok: 0, over: 0, slow: 0, t: 0, max: 0 }));
  let zi = 0, since = 0, warned = 0;
  X.msg(`<b>${esc(ex.consigne || 'Respecte les limitations')}</b><span>Maintiens les pédales pour accélérer ou freiner.</span>`, '', 3200);
  await X.tick(dt => {
    const p = W.player.s;
    while (zi < zones.length - 1 && p + 4 >= zones[zi + 1].S0) { zi++; since = 0; X.limit(zones[zi].lim); if (zones[zi].msg) X.msg(`<b>${esc(zones[zi].msg)}</b>`, '', 2600); Sound.ui('tick'); }
    since += dt;
    const z = zones[zi], v = W.player.v * 3.6, s = st[zi], lim = z.lim;
    const grace = zi && lim < zones[zi - 1].lim ? 1.5 : 4;
    if (since > grace) {
      s.t += dt; s.max = Math.max(s.max, v);
      if (v > lim + 2) { s.over += dt; if (performance.now() - warned > 2500) { warned = performance.now(); X.msg(`<b>Trop vite</b><span>${Math.round(v)} km/h pour ${lim} autorisés</span>`, 'ko', 1600); haptic('ko'); } }
      else if (v < lim - 14) s.slow += dt; else s.ok += dt;
    }
    const el = $('#xKmh'); el.classList.toggle('over', v > lim + 2); el.classList.toggle('good', v <= lim + 2 && v >= lim - 14);
    return p >= total;
  });
  W.pedals(0, 1);
  const lignes = zones.map((z, i) => { const s = st[i], k = s.t ? Math.round(s.ok / s.t * 100) : 100; return { nom: z.nom || `Limite ${z.lim}`, ok: k >= 75, score: k, txt: `${k} % dans la bonne plage · pointe à ${Math.round(s.max)} km/h` }; });
  const tt = st.reduce((a, s) => a + s.t, 0), okT = st.reduce((a, s) => a + s.ok, 0), overT = st.reduce((a, s) => a + s.over, 0);
  const score = Math.round(Math.max(0, (okT / Math.max(1, tt)) * 100 - (overT / Math.max(1, tt)) * 30));
  return { score, lignes, conseil: overT > 3 ? 'Ralentis avant le panneau : la limite s’applique dès qu’on le dépasse.' : 'Bonne lecture des limitations. Pense à la météo : elle change les chiffres.' };
};

/* ---------- 3. Distance de sécurité ---------- */
MECA.distance = async (ex, X) => {
  const W = X.W, meteo = ex.meteo || 'jour', env = ex.env || 'route', cible = ex.cible || 2;
  W.load({ env, meteo, kmh: ex.kmh, longueur: 6000, stopFin: false, graine: 5 });
  W.lights({ croisement: meteo !== 'jour', position: false, route: false, brouillardAv: false, brouillardAr: false });
  X.wet(meteo === 'pluie');
  if (env === 'autoroute') { W.chevrons(60, 5000, 38); W.panneau('B14:' + (ex.limite || 130), 60, 7.4); }
  const lead = W.voiture({ S: ms(ex.kmh) * (cible + 0.4) + FRONT + 2.1, x: LANE, couleur: 0x2E3440 });
  let lv = ms(ex.kmh), phase = 0, pt = 0;
  const prof = ex.profil.map(([v, t, f]) => ({ v: ms(v), t, fort: f === 'fort' }));
  lead.tick = dt => { const p = prof[Math.min(phase, prof.length - 1)]; const d = p.v - lv; const acc = d > 0 ? 1.8 : p.fort ? 6.5 : 2.4; lv += Math.sign(d) * Math.min(Math.abs(d), acc * dt); lead.vS = lv; lead.brake = d < -0.3; pt += dt; if (pt > p.t) { pt = 0; phase++; } };
  W.manual(); W.player.v = ms(ex.kmh);
  X.speedo(true, ex.limite); X.gap(true);
  X.ctl(`<button class="pedal brake" id="xBrake"><span>Frein</span></button><button class="pedal gas" id="xGas"><span>Accélérer</span></button>`);
  let g = 0, b = 0;
  X.hold($('#xGas'), () => { g = 1; W.pedals(g, b); haptic(); }, () => { g = 0; W.pedals(g, b); });
  X.hold($('#xBrake'), () => { b = 1; W.pedals(g, b); haptic(); }, () => { b = 0; W.pedals(g, b); });
  X.msg(`<b>Garde au moins ${cible} secondes</b><span>La bande verte montre ta zone de sécurité.</span>`, '', 3400);
  let okT = 0, tT = 0, minG = 99, crash = 0, cool = 0;
  const total = prof.reduce((a, p) => a + p.t, 0);
  await X.tick(dt => {
    const v = W.player.v, gap = lead.S - 2.1 - (W.player.s + FRONT), tg = gap / Math.max(v, 0.5);
    W.guide(Math.min(cible * v, 140), tg >= cible ? 0x34C759 : tg >= 1 ? 0xFF9F0A : 0xFF3B30);
    $('#xGapV').textContent = v < 1 ? '—' : n1(Math.min(tg, 9.9)) + ' s';
    $('#xGap').dataset.k = tg >= cible ? 'ok' : tg >= 1 ? 'mid' : 'ko';
    if (v > 4) { tT += dt; if (tg >= cible) okT += dt; minG = Math.min(minG, tg); }
    cool -= dt;
    if (gap <= 0.2 && cool <= 0) { crash++; cool = 3; W.player.v = Math.max(0, lv - 4); W.shake(1.4); X.flash('ko'); Sound.ui('crash'); haptic('ko'); X.msg('<b>Collision</b><span>Trop près : tu n’as pas pu t’arrêter à temps.</span>', 'ko', 2400); lead.S += 14; }
    return phase >= prof.length;
  });
  W.guide(0); X.gap(false);
  const k = Math.round(okT / Math.max(1, tT) * 100), score = Math.max(0, k - crash * 25);
  return { score, lignes: [{ nom: `Temps à ${cible} s ou plus`, ok: k >= 75, score: k, txt: `${k} % du trajet` }, { nom: 'Écart le plus court', ok: minG >= 1, txt: `${n1(Math.min(minG, 9.9))} s` }, { nom: 'Collisions', ok: !crash, txt: crash ? `${crash}` : 'aucune' }], conseil: 'Repère un point fixe : quand la voiture de devant le passe, compte « un, deux ». Tu dois l’atteindre après.' };
};

/* ---------- 4. Feu orange ---------- */
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
    if (o.depuis === 'droite') { a = (o.type === 'velo' ? W.velo : W.voiture)({ S: Sc + 1.75, x: 41, couleur: o.couleur }); a.g.rotation.y = Math.PI / 2; mover(W, a, { axis: 'x', dir: -1, speed: sp, stopAt: 6.6, wait: cede }); a.place = eta => { a.x = 9.5 + sp * eta * 0.85; }; a.conflict = () => a.x < 7.5 && a.x > -3; a.dist = () => a.x - 3.5; }
    else if (o.depuis === 'gauche') { a = (o.type === 'velo' ? W.velo : W.voiture)({ S: Sc - 1.75, x: -41, couleur: o.couleur }); a.g.rotation.y = -Math.PI / 2; mover(W, a, { axis: 'x', dir: 1, speed: sp, stopAt: -6.6, wait: cede }); a.place = eta => { a.x = -(9.5 + sp * eta * 0.85); }; a.conflict = () => a.x > -7.5 && a.x < 3.5; a.dist = () => -3.5 - a.x; }
    else if (o.depuis === 'face') { a = (o.type === 'bus' ? W.bus : W.voiture)({ S: Sc + 48, x: -LANE, couleur: o.couleur, sens: -1 }); a.g.rotation.y = Math.PI; mover(W, a, { axis: 'S', dir: -1, speed: sp, stopAt: Sc + w / 2 + 2.4, wait: cede }); a.place = eta => { a.S = Sc + 12 + sp * eta * 0.85; }; a.conflict = () => a.S < Sc + w / 2 + 2 && a.S > Sc - w / 2 - 2; a.dist = () => a.S - (Sc + w / 2); }
    else if (o.depuis === 'pieton') { a = W.pieton({ S: o.S ? Sc + o.S : Sc + w / 2 + 3, x: o.x ?? 6.4, haut: pick(SHIRTS) }); a.g.rotation.y = Math.PI / 2; mover(W, a, { axis: 'x', dir: -1, speed: 1.4, stopAt: -8, wait: false }); a.conflict = () => a.x < 3.8 && a.x > -0.2; a.dist = () => 0; a.ped = true; }
    else if (o.depuis === 'derriere') { a = W.ambulance({ S: -48, x: LANE }); mover(W, a, { axis: 'S', dir: 1, speed: ms(55), wait: false }); a.urgence = true; a.conflict = () => false; a.dist = () => 99; }
    else if (o.depuis === 'anneau') {
      a = W.voiture({ S: Sc, x: -12, couleur: o.couleur }); a.fixedHeading = true; const R = ring.R, cS = Sc + 14; let th = 1.5 * Math.PI - 14 / R - sp * 4 / R;
      a.data = { go: false, cur: 0, speed: sp, panic: false };
      a.tick = dt => { const d = a.data; const tgt = d.go && !d.panic ? d.speed : 0; d.cur += Math.sign(tgt - d.cur) * Math.min(Math.abs(tgt - d.cur), (d.panic ? 9 : 3) * dt); th += d.cur / R * dt; a.x = R * Math.cos(th); a.S = cS + R * Math.sin(th); a.vS = a.vx = 0; a.g.rotation.y = Math.atan2(R * Math.sin(th), R * Math.cos(th)) + Math.PI; a.brake = d.panic; a.th = th; };
      a.tick(0); a.conflict = () => { const t = ((a.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return t > Math.PI * 1.25 && t < Math.PI * 1.75; }; a.dist = () => { const t = ((a.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return (Math.PI * 1.25 - t) * R; };
    }
    a.role = o.role; actors.push(a);
  });
  return { Sc, meZone, actors, Sdec: Sc - (gir ? 9 : w / 2 + 8.5), stopS: Sc - (gir ? 2.2 : w / 2 + 1.6) };
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
    const st = await stage(sc, X);
    X.speedo(true, sc.limite || null); X.wet(sc.meteo === 'pluie');
    X.msg(`<b>${esc(sc.titre || '')}</b>${sc.contexte ? `<span>${esc(sc.contexte)}</span>` : ''}`, '', 2600);
    if (keys[0] === 'passer') {
      W.auto(sc.kmh || 30);
      await X.tick(() => { const rem = st.Sdec - W.player.s; if (rem < 30) W.auto(Math.max(14, (sc.kmh || 30) * 0.55), 2.5); if (rem < 22 && !st.woke) { st.woke = true; const vt = ms(Math.max(14, (sc.kmh || 30) * 0.55)), eta = rem / Math.max(2, (W.player.v + vt) / 2); st.actors.forEach(a => { if (a.place) a.place(eta); if (a.data && !a.urgence) a.data.go = true; }); } if (st.actors.some(a => a.urgence)) st.actors.forEach(a => { if (a.urgence) a.data.go = true; }); return rem <= 0; });
      if (st.actors.some(a => a.urgence)) { Sound.ui('siren'); X.msg('<b>Sirène deux tons derrière toi</b>', 'ko', 2200); }
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
  // leurres
  passant(W, S) { const p = W.pieton({ S, x: 7.6, haut: pick(SHIRTS) }); p.go(1.1, 0); return { obj: p, hit: W.hitbox(p, 1.2, 2, 1.2), nom: 'Passant qui s’éloigne', exp: 'Il marche sur le trottoir, loin de la chaussée.', danger: false }; },
  garee(W, S) { const c = W.voiture({ S, x: 4.6, couleur: 0x9AA3AF }); return { obj: c, hit: W.hitbox(c, 2.2, 1.8, 4.4), nom: 'Voiture garée vide', exp: 'Personne à bord, feux éteints.', danger: false }; },
  face(W, S) { const c = W.voiture({ S, x: -LANE, couleur: 0x3A6DF0, sens: -1 }); c.g.rotation.y = Math.PI; return { obj: c, hit: W.hitbox(c, 2.2, 1.8, 4.4), nom: 'Voiture en face, dans sa voie', exp: 'Elle reste dans sa voie.', danger: false }; }
};
MECA.danger = async (ex, X) => {
  const W = X.W, res = [];
  for (let i = 0; i < ex.scenes.length; i++) {
    const sc = ex.scenes[i]; X.step(i + 1, ex.scenes.length);
    const items = sc.elements.map(([t, d]) => ({ t, d }));
    W.load({ env: sc.env || 'ville', meteo: sc.meteo || 'jour', kmh: 18, longueur: 400, depart: 0, reserve: items.map(it => it.d + 18), graine: 50 + i });
    W.lights({ croisement: sc.meteo === 'nuit', position: false, route: false, brouillardAv: false, brouillardAr: false });
    (sc.panneaux || []).forEach(([id, d, x]) => W.panneau(id, d, x));
    const els = items.map(it => PERC[it.t](W, it.d + 18));
    X.speedo(true);
    W.auto(18);
    await X.sleep(1300);
    await W.slow(0, 600);
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
  { k: 'brouillardAr', n: 'Brouillard AR', i: '<path d="M16 6c3 0 5 2.7 5 6s-2 6-5 6h-1V6h1Z"/><path d="M4 9h7M4 12h7M4 15h7"/><path d="M8 7v10" stroke-dasharray="1.6 1.6"/>' }
];
MECA.eclairage = async (ex, X) => {
  const W = X.W, res = [];
  for (let i = 0; i < ex.situations.length; i++) {
    const sc = ex.situations[i]; X.step(i + 1, ex.situations.length);
    W.load({ env: sc.env || 'route', meteo: sc.meteo || 'nuit', kmh: sc.kmh || 50, longueur: 2400, graine: 60 + i });
    const cur = { position: false, croisement: false, route: false, brouillardAv: false, brouillardAr: false };
    W.lights(cur);
    if (sc.enFace) { const c = W.voiture({ S: 260, x: -LANE, couleur: 0x9AA3AF, sens: -1 }); c.vS = -ms(60); c.g.rotation.y = Math.PI; }
    if (sc.devant) { const c = W.voiture({ S: 26, x: LANE, couleur: 0x2E3440 }); c.vS = ms(sc.kmh || 50); }
    X.wet(sc.meteo === 'pluie'); X.speedo(true);
    X.msg(`<b>${esc(sc.titre)}</b><span>${esc(sc.contexte || 'Allume les bons feux, puis valide.')}</span>`, '', 3400);
    X.ctl(`<div class="xlights">${FEUX.map(f => `<button class="xlight" data-k="${f.k}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${f.i}</svg><span>${f.n}</span></button>`).join('')}</div><button class="btn" id="xValide">Valider</button>`);
    $$('.xlight').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; cur[k] = !cur[k]; if (k === 'route' && cur.route) cur.croisement = false; if (k === 'croisement' && cur.croisement) cur.route = false; $$('.xlight').forEach(x => x.setAttribute('aria-pressed', cur[x.dataset.k])); W.lights(cur); Sound.ui('tick'); haptic(); }));
    await Promise.race([new Promise(r => $('#xValide').addEventListener('click', r, { once: true })), X.tick(() => false)]);
    const want = sc.bons, keys = FEUX.map(f => f.k);
    const ok = keys.every(k => !!cur[k] === want.includes(k) || (k === 'position' && (cur.croisement || cur.route)));
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
async function runExo(id) {
  const ex = EXOS.find(e => e.id === id); if (!ex) return;
  if (ex.meca === 'reflexe') { show('parebrise'); return; }
  if (ex.meca === 'decodeur') { show('decodeur'); return; }
  curEx = ex;
  await show('exo', { force: true });
  intro(ex);
}
function intro(ex) {
  stopRun();
  const W = SIM;
  if (W) { W.load({ env: ex.env || (ex.scenes ? ex.scenes[0].env : null) || 'route', meteo: ex.meteo || 'jour', kmh: 22, longueur: 1600, graine: 3 }); W.pose('poursuite', 0); W.lights({ croisement: ex.meteo === 'nuit', position: false, route: false, brouillardAv: false, brouillardAr: false }); }
  $('#xTitle').textContent = ex.titre; $('#xStep').textContent = ''; X && X.ctl('');
  $('#xCtl').innerHTML = ''; $('#xSpeed').hidden = true; $('#xGap').hidden = true; $('#xWet').hidden = ex.meteo !== 'pluie'; $('#xMsg').classList.remove('on');
  const b = best(ex.id);
  const c = $('#xCard'); c.className = 'xcard xintro'; c.hidden = false;
  c.innerHTML = `<div class="xi-top"><span class="xi-ic">${icon(ex.meca)}</span><div><span class="xi-k">${esc(ex.famille || '')}</span><h2>${esc(ex.titre)}</h2></div></div>
    <p class="xi-p">${esc(ex.consigne || ex.sous || '')}</p>
    ${ex.astuce ? `<div class="xi-tip">${plot({ size: 54 })}<p>${esc(ex.astuce)}</p></div>` : ''}
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
  const stopSnd = SIM.onTick(() => Sound.speed(SIM.player.v * 3.6));
  const stopKmh = SIM.onTick(() => { const el = $('#xKmh'); if (el) el.textContent = Math.round(SIM.player.v * 3.6); });
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
  const c = $('#xCard'); c.className = 'xcard xresult'; c.hidden = false;
  c.innerHTML = `<div class="xr-head">${plot({ size: 64, mood: out.score >= 70 ? 'cheer' : 'oops' })}<div><span class="xi-k">${esc(ex.titre)}</span><div class="xr-score"><b class="num">${out.score}</b><span>/ 100</span></div>${starsHtml(out.score)}</div></div>
    <ul class="xr-list">${out.lignes.map(l => `<li class="${l.ok === null ? 'n' : l.ok ? 'ok' : 'ko'}"><i></i><div><b>${esc(l.nom)}</b><span>${esc(l.txt)}</span></div></li>`).join('')}</ul>
    <p class="xr-tip">${esc(out.conseil || '')}</p>
    <div class="xr-btns"><button class="btn ghost" id="xAgain">Rejouer</button><button class="btn" id="xDone">Terminer</button></div>
    ${cr ? `<button class="more" data-go="fiche" data-arg="${cr.id}">Revoir le cours « ${esc(cr.titre)} » →</button>` : ''}`;
  requestAnimationFrame(() => c.classList.add('on'));
  react(c, out.score >= 70);
  $('#xAgain').addEventListener('click', () => intro(ex), { once: true });
  $('#xDone').addEventListener('click', () => show('exos'), { once: true });
  Sound.ui(out.score >= 70 ? 'ok' : 'ko');
}
function stopRun() { if (X) X.stop(); X = null; if (SIM) { SIM.slow(1, 0); SIM.guide(0); SIM.setPick([]); SIM.setAnchors([]); } Labels.clear(); }

/* ======================= Hub « Exercices » ======================= */
export function renderExos() {
  const done = EXOS.filter(e => best(e.id)).length;
  $('#xHubStats').innerHTML = `<div><b class="num">${EXOS.length}</b><span>exercices</span></div><div><b class="num">${done}</b><span>réussis</span></div><div><b class="num">${EXOS.reduce((a, e) => a + stars((best(e.id) || {}).score || 0), 0)}</b><span>étoiles</span></div>`;
  const feat = EXOS.find(e => e.vedette) || EXOS[0];
  $('#xFeat').innerHTML = `<button class="feat" data-exo="${feat.id}"><span class="feat-k">${icon(feat.meca)}${esc(feat.famille || '')}</span><b>${esc(feat.titre)}</b><span>${esc(feat.sous || '')}</span><i>Jouer</i></button>`;
  $('#xHubList').innerHTML = FAMILLES.map(F => {
    const list = EXOS.filter(e => F.meca.includes(e.meca)); if (!list.length) return '';
    return `<h2 class="h-sec">${esc(F.nom)}<small>${esc(F.sous)}</small></h2><ul class="cells">${list.map(e => { const b = best(e.id); return `<li><button class="cell" data-exo="${e.id}"><span class="cell-ic m-${e.meca}">${icon(e.meca)}</span><span class="cell-t"><b>${esc(e.titre)}</b><small>${esc(e.sous || '')}</small></span><span class="cell-r">${b ? starsHtml(b.score) : `<em>${esc(e.duree || '')}</em>`}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></button></li>`; }).join('')}</ul>`;
  }).join('');
}
export function renderHomeExos() {
  const el = $('#homeExos'); if (!el) return;
  const pickL = ['x-freinage-ville', 'x-priorites', 'x-danger-ville', 'x-vitesse-village', 'x-eclairage', 'x-depassement'];
  el.innerHTML = pickL.map(id => EXOS.find(e => e.id === id)).filter(Boolean).map(e => { const b = best(e.id); return `<button class="xcar m-${e.meca}" data-exo="${e.id}"><span class="cell-ic m-${e.meca}">${icon(e.meca)}</span><b>${esc(e.titre)}</b><small>${esc(e.sous || '')}</small><span class="xcar-f">${b ? starsHtml(b.score) : `<em>${esc(e.duree || '')}</em>`}</span></button>`; }).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-exo]'); if (!b) return; haptic(); Sound.ui('tap'); runExo(b.dataset.exo); });

export function setupExos() {
  register('exos', { world: 'salle', amb: 'salle', region: () => $('#s-exos'), enter() { renderExos(); } });
  register('exo', { world: 'sim', amb: null, noTab: true, tab: 'exos', region: () => $('#v-exo'), enter(prev, o) { if (o && o.arg) runExo(o.arg); }, leave() { stopRun(); Sound.ambience(null); } });
  $('#xQuit').addEventListener('click', () => { haptic(); stopRun(); show('exos'); });
}
export const Exos = { run: runExo, list: () => EXOS };
