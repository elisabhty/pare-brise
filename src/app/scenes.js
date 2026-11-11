/* Registre des types de scènes d'un cours.
   Un cours (JSON) est une suite de scènes ; chaque scène a un "type" défini ici.
   Ajouter un type = ajouter une entrée : { enter(scene, ctx) } ou { question: true, enter }. */
import { $, esc, wait } from './util.js';
import { R, SIM, Engine, has3D } from './world.js';
import { FAM } from './signs.js';
import { Labels } from './labels.js';
import { Sound } from './sound.js';

export const ov = {
  clear() { $('#ovt').innerHTML = ''; $('#lower3').innerHTML = ''; $('#verdictBox').innerHTML = ''; $('#tapHint').hidden = true; const d = $('#v-cours .dash'); if (d) d.hidden = true; },
  title(html) { $('#ovt').innerHTML = html; },
  lower(html) { $('#lower3').innerHTML = html; }
};
const lower3 = ({ eyebrow, titre, couleur, puce, q }) =>
  `${eyebrow ? `<div class="eyebrow rise">${esc(eyebrow)}</div>` : ''}<div class="d ${q ? 'q' : 'fam'} rise" style="--d:.1s${couleur ? ';color:' + couleur : ''}">${esc(titre)}</div>${puce ? `<span class="chip rise" style="--d:.25s">${esc(puce)}</span>` : ''}`;
const stats = list => `<div class="stats rise" style="--d:.35s">${list.map(([v, l]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;

/* Cadrage : une carte de texte (titre, liste, chiffres) couvre le haut de l'écran. Pour un décor, la caméra vise
   la bande libre entre la carte (toute dépliée) et les sous-titres : le sujet n'est jamais caché derrière le texte. */
export const Frame = {
  on: false, cur: null, to: null, raf: 0,
  set(on) { this.on = !!on; this.cur = null; this.apply(); },
  // la bande suit la carte : tant que la liste est courte, le décor a plus de place ; elle glisse en douceur quand la carte grandit
  apply() {
    if (!has3D || !Engine.regionPx) return;
    const s = $('#s-cours'), o = $('#ovt'), v = $('#v-cours'), dock = $('#s-cours .dock');
    if (!this.on || !o || !o.innerHTML || !s || s.classList.contains('explore') || s.classList.contains('immersif')) { this.cur = null; cancelAnimationFrame(this.raf); if (v) Engine.regionFromEl(v); return; }
    const bottom = (dock ? dock.getBoundingClientRect().top : innerHeight) - 96;   // au-dessus des sous-titres
    const top = Math.min(o.getBoundingClientRect().bottom + 6, bottom - 150);
    this.to = [top, bottom];
    if (!this.cur) { this.cur = this.to.slice(); Engine.regionPx(top, bottom); return; }
    cancelAnimationFrame(this.raf); const from = this.cur.slice(), t0 = performance.now();
    const step = () => { const e = Math.min(1, (performance.now() - t0) / 600), k = 1 - Math.pow(1 - e, 3);
      this.cur = [from[0] + (this.to[0] - from[0]) * k, from[1] + (this.to[1] - from[1]) * k]; Engine.regionPx(this.cur[0], this.cur[1]);
      if (e < 1 && this.on) this.raf = requestAnimationFrame(step); };
    this.raf = requestAnimationFrame(step);
  }
};

/* Le cours se joue sur la route (monde « route ») ; les mises en situation utilisent le simulateur (« sim »). */
const useWorld = n => { if (has3D && Engine.current !== n) { Engine.world(n); if (n === 'route') R.pose('drive', 1); } };
/* Le lecteur peut imposer un angle de vue (View.cam) ; Live garde la mise en situation en cours (usagers, panneaux) */
export const View = { cam: null };
export const Live = { sc: null, actors: [] };
export const camOf = sc => View.cam || (sc && sc.camera) || 'poursuite';
export const paintDash = cam => { const d = $('#v-cours .dash'); if (d) d.hidden = cam !== 'cockpit'; };
const ACT = { trottinette: 'trottinette', moto: 'moto', tram: 'tram', voiture: 'voiture', velo: 'velo', pieton: 'pieton', enfant: 'enfant', bus: 'bus', camion: 'camion', tracteur: 'tracteur', biche: 'biche', ambulance: 'ambulance', triangle: 'triangle', portiere: 'portiere', feu: 'feu', ballon: 'ballon' };

/* Monte une mise en scène dans le simulateur : celle d'une mise en situation, ou le décor d'un écran (liste, chiffres,
   titre, fin) pour que l'image parle de la même chose que la voix. */
function stage(sc, ctx) {
  useWorld('sim'); Live.sc = sc; Live.actors = [];
  const car = sc.carrefour ? (typeof sc.carrefour === 'object' ? sc.carrefour : { S: sc.carrefour, ligne: sc.ligneStop }) : null;
  const ligne = typeof sc.ligne === 'string' ? [{ de: -200, a: 900, type: sc.ligne }] : sc.ligne && sc.ligne.map(g => (g.de <= 0 ? { ...g, de: -200 } : g));
  SIM.load({ env: sc.env || 'route', meteo: sc.meteo || 'jour', kmh: sc.kmh ?? 30, longueur: 900, ligne, camera: camOf(sc), voie: sc.voie, graine: sc.graine,
    reserve: [0].concat((sc.acteurs || []).flatMap(a => (a.x > 2.4 ? [a.S || 0, (a.S || 0) - 10] : [a.S || 0])), sc.passage ? [sc.passage, sc.passage - 10] : []),
    carrefours: car ? [car.S] : [], zones: [].concat(sc.giratoire ? [{ de: sc.giratoire - 4, a: sc.giratoire + 34 }] : [], sc.tunnel ? [{ de: sc.tunnel - 10, a: 900 }] : [], sc.rails ? [{ de: sc.rails - 8, a: sc.rails + 8 }] : []) });
  SIM.slow(1, 0);
  SIM.lights(Object.assign({ position: false, croisement: ['nuit', 'brouillard', 'pluie', 'neige'].includes(sc.meteo), route: false, brouillardAv: sc.meteo === 'brouillard', brouillardAr: false, detresse: false, clignotant: null }, sc.feux || {}));
  if (car) SIM.carrefour(car.S, { ligne: car.ligne, forme: car.forme });
  if (sc.giratoire) SIM.giratoire(sc.giratoire);
  if (sc.passage) SIM.passage(sc.passage);
  if (sc.rails) SIM.rails(sc.rails);
  if (sc.tunnel) SIM.tunnel(sc.tunnel, 900);
  if (sc.maisons) SIM.maisons(-160, 300);
  if (sc.chevrons) SIM.chevrons(20, 800, 38);
  (sc.marquages || []).forEach(([S, x, k]) => SIM.marquage(S, x, k));
  (sc.signaux || []).forEach(([id, S, x]) => SIM.panneau(id, S, x ?? (sc.env === 'ville' ? 6.2 : sc.env === 'autoroute' ? 7.4 : 4.4)));
  const actors = (sc.acteurs || []).map(o => {
    const fn = SIM[ACT[o.type] || 'voiture'];
    const a = o.type === 'feu' ? SIM.feu({ S: o.S, x: o.x ?? 5.2, etat: o.etat === 'clignotant' ? 'eteint' : o.etat || 'vert' }) : fn({ S: o.S || 20, x: o.x ?? 1.75, couleur: o.couleur, gilet: o.gilet, gyro: o.gyro, enfant: o.enfant, haut: o.haut, sens: (o.kmh || 0) < 0 ? -1 : 1 });
    if (o.kmh) a.vS = o.kmh / 3.6;
    if (o.vx) a.vx = o.vx;
    if (o.cap !== undefined) { a.g.rotation.y = o.cap * Math.PI / 180; a.fixedHeading = true; }
    if (o.freine) a.brake = true;
    if (o.type === 'portiere' && o.ouverte) a.open(10);
    if (o.type === 'feu' && o.etat === 'clignotant') clignote(a);
    return a;
  });
  beatLabels.key = null; Live.actors = actors;
  if (sc.etiquettes) beatLabels(sc, 0); else SIM.setAnchors([]);
  Live.actors = actors; paintDash(camOf(sc));
  if (sc.script) runScript(sc.script, actors, ctx);
  return actors;
}
/* étiquettes : chacune peut n'apparaître qu'à la phrase où la voix en parle (4e élément : numéro de phrase) */
function beatLabels(sc, k) {
  if (!sc.etiquettes || !has3D || !SIM) return;
  const on = sc.etiquettes.filter(e => (e[3] || 0) <= k), key = on.map(e => e[0]).join(',');
  if (beatLabels.key === key && beatLabels.sc === sc) return; beatLabels.key = key; beatLabels.sc = sc;
  SIM.setAnchors(on.map(([i]) => ({ id: 'a' + i, obj: Live.actors[i], dy: 2.3 })));
  Labels.set(on.map(([i]) => 'a' + i), on.map(e => [e[1], e[2]]));
}

/* Les éléments d'une liste, de chiffres ou de panneaux apparaissent au moment où la voix en parle.
   sync[n] = numéro de la phrase + fraction de la phrase (2.4 : à 40 % de la 3e phrase). */
function revealAt(sc, k, ctx, dur, apply) {
  const tok = (revealAt.tok = (revealAt.tok || 0) + 1), t0 = performance.now(), all = sc.sync.length;
  const step = () => {
    if (tok !== revealAt.tok || !ctx.live()) return;
    const el = performance.now() - t0, shown = sc.sync.map(v => Math.floor(v) < k || (Math.floor(v) === k && el >= (v - Math.floor(v)) * dur));
    // l'élément « en cours » est le dernier dit par la voix (pas forcément le dernier de la liste : « 135 euros et 4 points »)
    let cur = -1; shown.forEach((on, n) => { if (on && (cur < 0 || sc.sync[n] >= sc.sync[cur])) cur = n; });
    apply(shown, k >= 999 ? -1 : cur);
    const next = sc.sync.map(v => (Math.floor(v) === k ? (v - Math.floor(v)) * dur - el : -1)).filter(x => x > 0);
    if (next.length && shown.filter(Boolean).length < all) setTimeout(step, Math.min(...next) + 20);
  };
  step();
}
const revealList = sel => (shown, cur) => { document.querySelectorAll(sel).forEach((e, n) => { e.classList.toggle('in', shown[n]); e.classList.toggle('cur', n === cur); e.classList.toggle('past', shown[n] && cur >= 0 && n !== cur); }); Frame.apply(); };
/* décor 3D de l'écran (s'il en a un), sinon la route */
function backdrop(sc, ctx, kmh) { if (sc.decor && has3D && SIM) { stage(sc.decor, ctx); return true; } useWorld('route'); R.drive(kmh); return false; }

export const TYPES = {
  /* Titre plein écran sur la route */
  titre: {
    enter(sc, ctx) {
      backdrop(sc, ctx, sc.vitesse || 55);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise" style="--d:.15s">${esc(sc.titre)}</h2>${sc.sous ? `<p class="rise" style="--d:.35s">${esc(sc.sous)}</p>` : ''}`);
    }
  },
  /* Des panneaux défilent à grande vitesse, puis un grand chiffre apparaît */
  defile: {
    enter(sc, ctx) {
      useWorld('route'); R.burst(sc.panneaux); Sound.ui('whoosh');
      if (sc.grand) setTimeout(() => { if (!ctx.live()) return; ov.title(`<div class="big7 rise"><b class="num">${esc(sc.grand)}</b><span class="d">${esc(sc.texte || '')}</span></div>`); Sound.ui('neon'); }, sc.delai || 6400);
    }
  },
  /* Une famille de panneaux : ils sortent de la route, la forme se trace en néon */
  famille: {
    async enter(sc, ctx) {
      useWorld('route'); const F = FAM[sc.famille] || FAM.danger;
      ov.lower(lower3({ eyebrow: sc.regle ? `Règle ${sc.regle}` : sc.eyebrow, titre: sc.titre || F.n, couleur: F.t, puce: sc.puce }));
      const ok = await R.present(sc.panneaux);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.panneaux, sc.etiquettes);
      if (sc.sync && ctx.phrase) TYPES.famille.beat(sc, ctx.phrase(), ctx, 0);
      if (sc.forme) await R.outline(sc.forme, sc.couleur || F.c, sc.barre);
    },
    beat(sc, k, ctx, dur) { if (!sc.sync || !has3D || !R.spot) return; revealAt(sc, k, ctx, dur, (shown, cur) => { R.spot(cur); Labels.focus(cur); }); }
  },
  /* Des panneaux présentés, avec un titre libre et des étiquettes optionnelles */
  panneaux: {
    async enter(sc, ctx) {
      useWorld('route'); ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce, couleur: sc.couleurTitre }));
      const ok = await R.present(sc.panneaux);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.panneaux, sc.etiquettes);
      if (sc.sync && ctx.phrase) TYPES.panneaux.beat(sc, ctx.phrase(), ctx, 0);
      if (sc.forme) await R.outline(sc.forme, sc.couleur || '#FF7A1A', sc.barre);
    },
    beat(sc, k, ctx, dur) { if (!sc.sync || !has3D || !R.spot) return; revealAt(sc, k, ctx, dur, (shown, cur) => { R.spot(cur); Labels.focus(cur); }); }
  },
  /* De grands chiffres pendant que la voiture roule */
  chiffres: {
    enter(sc, ctx) {
      backdrop(sc, ctx, sc.vitesse ?? 50);
      const sy = !!sc.sync;
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise sm" style="--d:.1s">${esc(sc.titre || '')}</h2>
        <div class="nums${sy ? ' sync' : ''}">${(sc.items || []).map(([v, u, l], k) => `<div class="${sy ? '' : 'rise'}" style="--d:${0.3 + k * 0.25}s"><b class="num">${esc(v)}<small>${esc(u || '')}</small></b><span>${esc(l || '')}</span></div>`).join('')}</div>`);
    },
    beat(sc, k, ctx, dur) { beatLabels(sc.decor || {}, k); if (sc.sync) revealAt(sc, k, ctx, dur, revealList('#ovt .nums > div')); }
  },
  /* Repères lumineux posés sur la route à une distance donnée (en mètres) */
  reperes: {
    async enter(sc, ctx) {
      useWorld('route'); ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce }));
      const ok = await R.markers(sc.reperes);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.reperes.map(r => r[1]), sc.reperes.map(r => [`${String(r[0]).replace('.', ',')} m`, r[1].split('·')[0].trim()]));
    }
  },
  /* Question : toucher le bon panneau directement dans la scène 3D */
  touche: {
    question: true,
    enter(sc, ctx) {
      useWorld('route'); ov.lower(lower3({ eyebrow: 'Question surprise · le film attend', titre: sc.question, q: true }));
      R.present(sc.panneaux).then(ok => { if (!ctx.live() || ok === false) return; Labels.set(sc.panneaux, sc.panneaux.map((id, k) => ['ABCD'[k], ' '])); $('#tapHint').hidden = false; });
    }
  },
  /* Question à choix, pendant que la voiture roule doucement */
  quiz: {
    question: true,
    enter(sc) {
      if (Engine && Engine.current !== 'sim') { useWorld('route'); R.drive(sc.vitesse ?? 30); }
      ov.lower(lower3({ eyebrow: 'Question surprise · le film attend', titre: sc.question, q: true }));
    }
  },
  /* Une liste d'étapes ou de règles qui apparaissent une à une, pendant que la voiture roule */
  liste: {
    enter(sc, ctx) {
      backdrop(sc, ctx, sc.vitesse ?? 40); const sy = !!sc.sync;
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise sm" style="--d:.1s">${esc(sc.titre || '')}</h2>
        <ol class="olist${sy ? ' sync' : ''}${sy && (sc.items || []).length >= 5 ? ' long' : ''}">${(sc.items || []).map((it, k) => { const [a, b] = Array.isArray(it) ? it : [it, '']; return `<li class="${sy ? '' : 'rise'}" style="--d:${0.35 + k * 0.4}s"><i class="num">${sc.puces ? esc(sc.puces[k] || '') : k + 1}</i><div><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</div></li>`; }).join('')}</ol>`);
    },
    beat(sc, k, ctx, dur) { beatLabels(sc.decor || {}, k); if (sc.sync) revealAt(sc, k, ctx, dur, revealList('#ovt .olist > li')); }
  },
  /* Mise en situation dans le simulateur : décor, météo, usagers, point de vue */
  situation: {
    enter(sc, ctx) {
      if (!has3D || !SIM) { useWorld('route'); R.drive(sc.kmh ?? 30); ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce })); return; }
      stage(sc, ctx);
      ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce, couleur: sc.couleurTitre }));
    },
    beat(sc, k) { beatLabels(sc, k); }
  },
  /* Écran de fin du cours */
  fin: {
    enter(sc, ctx) {
      backdrop(sc, ctx, sc.vitesse || 90);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || 'Fin du cours')}</div><h2 class="d rise" style="--d:.15s">${esc(sc.titre || 'Cours terminé')}</h2>${sc.stats ? stats(sc.stats) : ''}`);
    }
  }
};
/* Petit scénario d'une mise en situation : [secondes, action, ...paramètres], joué pendant que Plot parle.
   Actions : vitesse (km/h), voie (x), clignotant ('g' | 'd' | null), feux ({…}), arret (S : s'arrêter avant ce point),
   acteur (i, km/h, vx), ouvrir (i : portière), feu (i, état), depasser (i, { x, kmh, marge }),
   freiner (i, km/h, décélération en m/s²), camera (pose, ms), etiquettes (les retire). */
async function runScript(steps, actors, ctx) {
  // le temps du scénario est celui du simulateur : une pause ou un téléphone lent ne décale pas les gestes par rapport aux usagers
  let st = 0; const off = SIM.onTick(dt => { st += dt; });
  try { await playSteps(steps, actors, ctx, () => st); } finally { off(); }
}
async function playSteps(steps, actors, ctx, now) {
  const live = () => ctx.live() && Engine.current === 'sim';
  const until = async f => { while (live() && !f()) await wait(60); };
  const depasser = async (a, { x = -SIM.LANE, kmh = 65, marge = 9, retour = SIM.LANE } = {}) => {
    SIM.lights({ clignotant: 'g' }); await wait(700); if (!live()) return;
    SIM.lane(x, 1400); SIM.auto(kmh, 3.2); await wait(1200); SIM.lights({ clignotant: null });
    await until(() => SIM.player.s - SIM.FRONT > a.S + (a.len || 4) / 2 + marge); if (!live()) return;
    SIM.lights({ clignotant: 'd' }); await wait(700); SIM.lane(retour, 1600); await wait(1700); SIM.lights({ clignotant: null });
  };
  for (const [t, act, ...p] of steps) {
    // un temps « p2 » ou « p2+1.5 » : à la 3e phrase de la voix (+ 1,5 s) ; sinon en secondes depuis le début de la scène
    const m = typeof t === 'string' && /^p(\d+)(?:\+([\d.]+))?$/.exec(t);
    if (m) { await until(() => (ctx.phrase ? ctx.phrase() : 0) >= +m[1]); const t1 = now(); await until(() => now() - t1 >= +(m[2] || 0)); }
    else await until(() => now() >= t);
    if (!live()) return;
    const a = actors[p[0]];
    if (act === 'vitesse') SIM.auto(p[0], p[1]);
    else if (act === 'voie') SIM.lane(p[0], p[1] || 1600);
    else if (act === 'clignotant') SIM.lights({ clignotant: p[0] || null });
    else if (act === 'feux') SIM.lights(p[0]);
    else if (act === 'meteo') SIM.meteo(p[0]);
    else if (act === 'arret') { const d = Math.max(1.5, p[0] - SIM.FRONT - SIM.player.s), v = SIM.player.v; SIM.auto(0, Math.max(0.5, v * v / (2 * d))); }
    else if (act === 'acteur' && a) a.go((p[1] || 0) / 3.6, p[2] || 0);
    else if (act === 'ouvrir' && a && a.open) a.open(700);
    else if (act === 'feu' && a && a.set) { if (p[1] === 'clignotant') { if (!a.blink) clignote(a); } else { a.blink = false; a.set(p[1]); } }
    else if (act === 'depasser' && a) depasser(a, p[1]);
    else if (act === 'freiner' && a) freiner(a, p[1] || 0, p[2] || 4);
    else if (act === 'camera') { if (!View.cam && SIM.camMode !== 'libre') { SIM.pose(p[0], p[1] || 1400); paintDash(p[0]); } }
    else if (act === 'etiquettes') { SIM.setAnchors([]); Labels.clear(); }
  }
}
/* un feu orange clignotant (le feu peut aussi passer en clignotant pendant la scène : action « feu », i, 'clignotant') */
function clignote(a) { let on = false; const prev = a.tick; a.blink = true; a.tick = (dt, tt, self) => { if (a.blink) { const k = Math.sin(tt * 6) > 0; if (k !== on) { on = k; a.set(k ? 'clignotant' : 'eteint'); } } if (prev) prev(dt, tt, self); }; }
/* un usager qui freine progressivement jusqu'à une vitesse (km/h), feux stop allumés */
function freiner(a, kmh, dec) { const v1 = kmh / 3.6, prev = a.tick; a.brake = true; a.tick = (dt, tt, self) => { if (a.vS > v1) a.vS = Math.max(v1, a.vS - dec * dt); else if (v1 > 0) a.brake = false; if (prev) prev(dt, tt, self); }; }
export const isQuestion = sc => !!(TYPES[sc.type] && TYPES[sc.type].question);
