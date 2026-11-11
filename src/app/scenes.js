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

/* Le cours se joue sur la route (monde « route ») ; les mises en situation utilisent le simulateur (« sim »). */
const useWorld = n => { if (has3D && Engine.current !== n) { Engine.world(n); if (n === 'route') R.pose('drive', 1); } };
const ACT = { voiture: 'voiture', velo: 'velo', pieton: 'pieton', enfant: 'enfant', bus: 'bus', camion: 'camion', tracteur: 'tracteur', biche: 'biche', ambulance: 'ambulance', triangle: 'triangle', portiere: 'portiere', feu: 'feu', ballon: 'ballon' };

export const TYPES = {
  /* Titre plein écran sur la route */
  titre: {
    enter(sc) {
      useWorld('route'); R.drive(sc.vitesse || 55);
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
      if (sc.forme) await R.outline(sc.forme, sc.couleur || F.c, sc.barre);
    }
  },
  /* Des panneaux présentés, avec un titre libre et des étiquettes optionnelles */
  panneaux: {
    async enter(sc, ctx) {
      useWorld('route'); ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce, couleur: sc.couleurTitre }));
      const ok = await R.present(sc.panneaux);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.panneaux, sc.etiquettes);
      if (sc.forme) await R.outline(sc.forme, sc.couleur || '#FF7A1A', sc.barre);
    }
  },
  /* De grands chiffres pendant que la voiture roule */
  chiffres: {
    enter(sc) {
      useWorld('route'); R.drive(sc.vitesse ?? 50);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise sm" style="--d:.1s">${esc(sc.titre || '')}</h2>
        <div class="nums">${(sc.items || []).map(([v, u, l], k) => `<div class="rise" style="--d:${0.3 + k * 0.25}s"><b class="num">${esc(v)}<small>${esc(u || '')}</small></b><span>${esc(l || '')}</span></div>`).join('')}</div>`);
    }
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
    enter(sc) {
      useWorld('route'); R.drive(sc.vitesse ?? 40);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise sm" style="--d:.1s">${esc(sc.titre || '')}</h2>
        <ol class="olist">${(sc.items || []).map((it, k) => { const [a, b] = Array.isArray(it) ? it : [it, '']; return `<li class="rise" style="--d:${0.35 + k * 0.4}s"><i class="num">${sc.puces ? esc(sc.puces[k] || '') : k + 1}</i><div><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</div></li>`; }).join('')}</ol>`);
    }
  },
  /* Mise en situation dans le simulateur : décor, météo, usagers, point de vue */
  situation: {
    enter(sc, ctx) {
      if (!has3D || !SIM) { useWorld('route'); R.drive(sc.kmh ?? 30); ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce })); return; }
      useWorld('sim');
      SIM.load({ env: sc.env || 'route', meteo: sc.meteo || 'jour', kmh: sc.kmh ?? 30, longueur: 900, ligne: sc.ligne ? [{ de: 0, a: 900, type: sc.ligne }] : undefined, camera: sc.camera || 'poursuite', reserve: (sc.acteurs || []).map(a => a.S || 0), carrefours: sc.carrefour ? [sc.carrefour] : [], voie: sc.voie });
      SIM.lights(Object.assign({ position: false, croisement: sc.meteo === 'nuit' || sc.meteo === 'brouillard' || sc.meteo === 'pluie', route: false, brouillardAv: sc.meteo === 'brouillard', brouillardAr: false, detresse: false, clignotant: null }, sc.feux || {}));
      if (sc.carrefour) SIM.carrefour(sc.carrefour, { ligne: sc.ligneStop });
      if (sc.passage) SIM.passage(sc.passage);
      if (sc.chevrons) SIM.chevrons(20, 800, 38);
      (sc.signaux || []).forEach(([id, S, x]) => SIM.panneau(id, S, x ?? (sc.env === 'ville' ? 6.2 : sc.env === 'autoroute' ? 7.4 : 4.4)));
      const actors = (sc.acteurs || []).map(o => {
        const fn = SIM[ACT[o.type] || 'voiture'];
        const a = o.type === 'feu' ? SIM.feu({ S: o.S, x: o.x ?? 5.2, etat: o.etat || 'vert' }) : fn({ S: o.S || 20, x: o.x ?? 1.75, couleur: o.couleur, gilet: o.gilet, enfant: o.enfant, sens: (o.kmh || 0) < 0 ? -1 : 1 });
        if (o.kmh) a.vS = o.kmh / 3.6;
        if (o.vx) a.vx = o.vx;
        if (o.cap !== undefined) { a.g.rotation.y = o.cap * Math.PI / 180; a.fixedHeading = true; }
        if (o.freine) a.brake = true;
        if (o.type === 'portiere' && o.ouverte) a.open(10);
        return a;
      });
      if (sc.etiquettes) { SIM.setAnchors(sc.etiquettes.map(([i]) => ({ id: 'a' + i, obj: actors[i], dy: 2.3 }))); Labels.set(sc.etiquettes.map(([i]) => 'a' + i), sc.etiquettes.map(e => [e[1], e[2]])); }
      else { SIM.setAnchors([]); }
      { const d = $('#v-cours .dash'); if (d) d.hidden = (sc.camera || 'poursuite') !== 'cockpit'; }
      ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce, couleur: sc.couleurTitre }));
      if (sc.script) runScript(sc.script, actors, ctx);
    }
  },
  /* Écran de fin du cours */
  fin: {
    enter(sc) {
      useWorld('route'); R.drive(sc.vitesse || 90);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || 'Fin du cours')}</div><h2 class="d rise" style="--d:.15s">${esc(sc.titre || 'Cours terminé')}</h2>${sc.stats ? stats(sc.stats) : ''}`);
    }
  }
};
/* Petit scénario d'une mise en situation : [secondes, action, ...paramètres], joué pendant que Plot parle.
   Actions : vitesse (km/h), voie (x), clignotant ('g' | 'd' | null), feux ({…}), arret (S : s'arrêter avant ce point),
   acteur (i, km/h, vx), ouvrir (i : portière), feu (i, état), depasser (i, { x, kmh, marge }). */
async function runScript(steps, actors, ctx) {
  const t0 = performance.now(), live = () => ctx.live() && Engine.current === 'sim';
  const until = async f => { while (live() && !f()) await wait(60); };
  const depasser = async (a, { x = -SIM.LANE, kmh = 65, marge = 9, retour = SIM.LANE } = {}) => {
    SIM.lights({ clignotant: 'g' }); await wait(700); if (!live()) return;
    SIM.lane(x, 1400); SIM.auto(kmh, 3.2); await wait(1200); SIM.lights({ clignotant: null });
    await until(() => SIM.player.s - SIM.FRONT > a.S + (a.len || 4) / 2 + marge); if (!live()) return;
    SIM.lights({ clignotant: 'd' }); await wait(700); SIM.lane(retour, 1600); await wait(1700); SIM.lights({ clignotant: null });
  };
  for (const [t, act, ...p] of steps) {
    await until(() => performance.now() - t0 >= t * 1000); if (!live()) return;
    const a = actors[p[0]];
    if (act === 'vitesse') SIM.auto(p[0], p[1]);
    else if (act === 'voie') SIM.lane(p[0], p[1] || 1600);
    else if (act === 'clignotant') SIM.lights({ clignotant: p[0] || null });
    else if (act === 'feux') SIM.lights(p[0]);
    else if (act === 'arret') { const d = Math.max(1.5, p[0] - SIM.FRONT - SIM.player.s), v = SIM.player.v; SIM.auto(0, Math.max(0.5, v * v / (2 * d))); }
    else if (act === 'acteur' && a) a.go((p[1] || 0) / 3.6, p[2] || 0);
    else if (act === 'ouvrir' && a && a.open) a.open(700);
    else if (act === 'feu' && a && a.set) a.set(p[1]);
    else if (act === 'depasser' && a) depasser(a, p[1]);
  }
}
export const isQuestion = sc => !!(TYPES[sc.type] && TYPES[sc.type].question);
