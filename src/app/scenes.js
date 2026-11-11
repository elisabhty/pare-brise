/* Registre des types de scènes d'un cours.
   Un cours (JSON) est une suite de scènes ; chaque scène a un "type" défini ici.
   Ajouter un type = ajouter une entrée : { enter(scene, ctx) } ou { question: true, enter }. */
import { $, esc } from './util.js';
import { R } from './world.js';
import { FAM } from './signs.js';
import { Labels } from './labels.js';
import { Sound } from './sound.js';

export const ov = {
  clear() { $('#ovt').innerHTML = ''; $('#lower3').innerHTML = ''; $('#verdictBox').innerHTML = ''; $('#tapHint').hidden = true; },
  title(html) { $('#ovt').innerHTML = html; },
  lower(html) { $('#lower3').innerHTML = html; }
};
const lower3 = ({ eyebrow, titre, couleur, puce, q }) =>
  `${eyebrow ? `<div class="eyebrow rise">${esc(eyebrow)}</div>` : ''}<div class="d ${q ? 'q' : 'fam'} rise" style="--d:.1s${couleur ? ';color:' + couleur : ''}">${esc(titre)}</div>${puce ? `<span class="chip rise" style="--d:.25s">${esc(puce)}</span>` : ''}`;
const stats = list => `<div class="stats rise" style="--d:.35s">${list.map(([v, l]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;

export const TYPES = {
  /* Titre plein écran sur la route */
  titre: {
    enter(sc) {
      R.drive(sc.vitesse || 55);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise" style="--d:.15s">${esc(sc.titre)}</h2>${sc.sous ? `<p class="rise" style="--d:.35s">${esc(sc.sous)}</p>` : ''}`);
    }
  },
  /* Des panneaux défilent à grande vitesse, puis un grand chiffre apparaît */
  defile: {
    enter(sc, ctx) {
      R.burst(sc.panneaux); Sound.ui('whoosh');
      if (sc.grand) setTimeout(() => { if (!ctx.live()) return; ov.title(`<div class="big7 rise"><b class="num">${esc(sc.grand)}</b><span class="d">${esc(sc.texte || '')}</span></div>`); Sound.ui('neon'); }, sc.delai || 6400);
    }
  },
  /* Une famille de panneaux : ils sortent de la route, la forme se trace en néon */
  famille: {
    async enter(sc, ctx) {
      const F = FAM[sc.famille] || FAM.danger;
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
      ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce, couleur: sc.couleurTitre }));
      const ok = await R.present(sc.panneaux);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.panneaux, sc.etiquettes);
      if (sc.forme) await R.outline(sc.forme, sc.couleur || '#FF7A1A', sc.barre);
    }
  },
  /* De grands chiffres pendant que la voiture roule */
  chiffres: {
    enter(sc) {
      R.drive(sc.vitesse ?? 50);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || '')}</div><h2 class="d rise sm" style="--d:.1s">${esc(sc.titre || '')}</h2>
        <div class="nums">${(sc.items || []).map(([v, u, l], k) => `<div class="rise" style="--d:${0.3 + k * 0.25}s"><b class="num">${esc(v)}<small>${esc(u || '')}</small></b><span>${esc(l || '')}</span></div>`).join('')}</div>`);
    }
  },
  /* Repères lumineux posés sur la route à une distance donnée (en mètres) */
  reperes: {
    async enter(sc, ctx) {
      ov.lower(lower3({ eyebrow: sc.eyebrow, titre: sc.titre, puce: sc.puce }));
      const ok = await R.markers(sc.reperes);
      if (!ctx.live() || ok === false) return;
      Labels.set(sc.reperes.map(r => r[1]), sc.reperes.map(r => [`${String(r[0]).replace('.', ',')} m`, r[1].split('·')[0].trim()]));
    }
  },
  /* Question : toucher le bon panneau directement dans la scène 3D */
  touche: {
    question: true,
    enter(sc, ctx) {
      ov.lower(lower3({ eyebrow: 'Question surprise · le film attend', titre: sc.question, q: true }));
      R.present(sc.panneaux).then(ok => { if (!ctx.live() || ok === false) return; Labels.set(sc.panneaux, sc.panneaux.map((id, k) => ['ABCD'[k], ' '])); $('#tapHint').hidden = false; });
    }
  },
  /* Question à choix, pendant que la voiture roule doucement */
  quiz: {
    question: true,
    enter(sc) {
      R.drive(sc.vitesse ?? 30);
      ov.lower(lower3({ eyebrow: 'Question surprise · le film attend', titre: sc.question, q: true }));
    }
  },
  /* Écran de fin du cours */
  fin: {
    enter(sc) {
      R.drive(sc.vitesse || 90);
      ov.title(`<div class="eyebrow rise">${esc(sc.eyebrow || 'Fin du cours')}</div><h2 class="d rise" style="--d:.15s">${esc(sc.titre || 'Cours terminé')}</h2>${sc.stats ? stats(sc.stats) : ''}`);
    }
  }
};
export const isQuestion = sc => !!(TYPES[sc.type] && TYPES[sc.type].question);
