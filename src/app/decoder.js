/* Décodeur : forme + couleur → famille et sens, dans un studio 3D. */
import { $, $$, esc, haptic } from './util.js';
import { STUDIO } from './world.js';
import { sign, meta, FAM, K, triUp, ring, disc, square, octo, triDown, losange, endDisc, bars } from './signs.js';
import { Sound } from './sound.js';

const SHAPES = [['tri', 'Triangle'], ['cercle', 'Rond'], ['carre', 'Carré'], ['octo', 'Octogone'], ['triBas', 'Triangle inversé'], ['losange', 'Losange']];
const STYLES = [['rouge', 'Bord rouge'], ['bleu', 'Fond bleu'], ['jaune', 'Fond jaune'], ['barre', 'Barré']];
const DEC = {
  'tri-rouge': { f: 'danger', t: 'Il te prévient d’un danger, environ 150 m avant hors agglomération.', d: 'Ralentis, anticipe', ex: ['A14', 'A1a', 'AB1'] },
  'tri-jaune': { f: 'temporaire', t: 'Danger temporaire, souvent des travaux. Il prime sur la signalisation permanente.', d: 'Ralentis, suis les consignes', ex: ['AK5', 'AK14'] },
  'cercle-rouge': { f: 'interdiction', t: 'Ce qui est dessiné à l’intérieur est interdit.', d: 'Ne le fais pas', ex: ['B14', 'B1', 'B6a1'] },
  'cercle-bleu': { f: 'obligation', t: 'Ce qui est dessiné est obligatoire.', d: 'Fais-le', ex: ['B211', 'B21a1', 'B22a'] },
  'cercle-barre': { f: 'fin', t: 'Fin d’une interdiction (bandes noires) ou d’une obligation (barre rouge sur bleu).', d: 'La règle s’arrête', ex: ['B33', 'B31', 'B40'] },
  'carre-bleu': { f: 'indication', t: 'Il te renseigne : il n’interdit rien et n’oblige à rien.', d: 'Informe-toi', ex: ['C12', 'C20a', 'C1a'] },
  'carre-jaune': { f: 'temporaire', t: 'Indication temporaire, par exemple une déviation pendant des travaux.', d: 'Suis l’itinéraire indiqué', ex: ['AK5'] },
  'carre-rouge': { f: 'localisation', n: 'Entrée de ville', t: 'Rectangle blanc bordé de rouge avec un nom de ville : tu entres en agglomération.', d: '50 km/h, sauf panneau contraire', ex: ['EB10'] },
  'carre-barre': { f: 'localisation', n: 'Sortie de ville', t: 'Le même panneau barré de rouge : tu quittes l’agglomération.', d: 'La limite de la route reprend', ex: ['EB20'] },
  'octo-rouge': { f: 'priorite', n: 'Stop', t: 'Forme réservée au stop : arrêt obligatoire, puis tu cèdes le passage.', d: 'Arrête-toi, regarde, repars', ex: ['AB4'] },
  'triBas-rouge': { f: 'priorite', n: 'Cédez le passage', t: 'Tu laisses passer les autres. Tu ne t’arrêtes que si quelqu’un arrive.', d: 'Laisse passer', ex: ['AB3a'] },
  'losange-jaune': { f: 'priorite', n: 'Route prioritaire', t: 'Aux intersections, les autres te cèdent le passage.', d: 'Tu passes, prudemment', ex: ['AB6'] },
  'losange-barre': { f: 'fin', n: 'Fin de priorité', t: 'Ta route n’est plus prioritaire. Les règles normales reprennent.', d: 'Sois prêt à céder', ex: ['AB7'] }
};
const NOPE = {
  octo: 'L’octogone est toujours rouge : c’est le stop, et lui seul.',
  triBas: 'Le triangle pointe en bas n’existe qu’en blanc bordé de rouge : cédez le passage.',
  losange: 'Le losange n’existe qu’en jaune : route prioritaire, ou barré quand elle s’arrête.',
  tri: 'Un triangle pointe en haut annonce un danger : bord rouge, ou fond jaune s’il est temporaire.',
  cercle: 'Un rond interdit (bord rouge), oblige (fond bleu) ou met fin à une règle (barré).',
  carre: 'Un carré ou un rectangle bleu indique, un fond jaune signale du temporaire.'
};

export const Decoder = {
  shape: 'tri', style: 'rouge', onUse: () => {},
  init(onUse) {
    this.onUse = onUse || (() => {});
    const mini = { tri: triUp(), cercle: ring(), carre: square(), octo: octo(), triBas: triDown(), losange: losange() };
    const sw = { rouge: ring(), bleu: disc(), jaune: `<circle cx="50" cy="50" r="46" fill="${K.y}"/>`, barre: endDisc() + bars() };
    $('#decShapes').innerHTML = SHAPES.map(([k, n]) => `<button class="chipb" data-shape="${k}" aria-pressed="false"><svg viewBox="0 0 100 100">${mini[k]}</svg>${n}</button>`).join('');
    $('#decStyles').innerHTML = STYLES.map(([k, n]) => `<button class="chipb" data-style="${k}" aria-pressed="false"><svg viewBox="0 0 100 100">${sw[k]}</svg>${n}</button>`).join('');
    $$('#decShapes .chipb').forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tap'); this.shape = b.dataset.shape; this.onUse(); this.paint(); }));
    $$('#decStyles .chipb').forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tap'); this.style = b.dataset.style; this.onUse(); this.paint(); }));
    this.paint(true);
  },
  paint(silent) {
    $$('#decShapes .chipb').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shape === this.shape)));
    $$('#decStyles .chipb').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.style === this.style)));
    STUDIO.setSign(`GEN:${this.shape}:${this.style}`);
    if (!silent) Sound.ui('rise');
    const r = DEC[this.shape + '-' + this.style];
    if (r) {
      const F = FAM[r.f];
      $('#decRes').innerHTML = `<div class="eyebrow">Famille</div><div class="d dec-fam" style="color:${F.t}">${esc(r.n || F.n)}</div><p class="dec-txt">${esc(r.t)}</p><div class="dec-do">→ ${esc(r.d)}</div>`;
      $('#decExT').hidden = !r.ex.length;
      $('#decEx').innerHTML = r.ex.map(id => `<figure class="glass">${sign(id)}<figcaption>${esc(meta(id).n)}</figcaption></figure>`).join('');
    } else {
      $('#decRes').innerHTML = `<div class="eyebrow" style="color:var(--brume)">Combinaison inconnue</div><div class="d dec-fam" style="color:var(--brume)">Pas en France</div><p class="dec-txt">${esc(NOPE[this.shape])}</p><div class="dec-do">→ La forme suffit souvent à trancher</div>`;
      $('#decExT').hidden = true; $('#decEx').innerHTML = '';
    }
  }
};
