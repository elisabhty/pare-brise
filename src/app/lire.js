/* Bien lire les questions : les pièges de formulation, le lexique des mots du code, et la lecture facile
   (texte plus grand et plus aéré, pour les lecteurs dys ou qui apprennent le français). */
import { $, $$, esc, fr, haptic, store, shuffle } from './util.js';
import { COURSES, QUESTIONS, course, courseNumber } from './content.js';
import { courseState } from './progress.js';
import { piegeHTML, bindPieges } from './piege.js';
import { LEXIQUE, LIRE, motDe } from './lexique.js';
import { openSheet } from './planning.js';
import { Sound } from './sound.js';

/* ---------- lecture facile ---------- */
export const lectureFacile = () => !!store.get('lf', false);
export function setLectureFacile(on) {
  store.set('lf', !!on);
  document.documentElement.classList.toggle('lf', !!on);
  $$('[data-lf]').forEach(b => b.setAttribute('aria-checked', String(!!on)));
}
export function setupLire({ startSerie }) {
  document.documentElement.classList.toggle('lf', lectureFacile());
  $$('[data-lf]').forEach(b => b.setAttribute('aria-checked', String(lectureFacile())));
  document.addEventListener('click', e => {
    const lf = e.target.closest('[data-lf]');
    if (lf) { haptic(); Sound.ui('tick'); setLectureFacile(!lectureFacile()); return; }
    const mot = e.target.closest('[data-lx]');
    if (mot) { e.preventDefault(); haptic(); Sound.ui('tap'); ouvrirMot(mot.dataset.lx); return; }
    const ent = e.target.closest('[data-multi]');
    if (ent) { haptic(); Sound.ui('tap'); startSerie(serieMulti()); }
  });
  const f = $('#lxFiltre');
  if (f) f.addEventListener('input', () => renderLexique(f.value));
}

/* ---------- un mot, d'un toucher ---------- */
export function ouvrirMot(nom) {
  const l = LEXIQUE.find(x => x.mot === nom) || motDe(nom); if (!l) return;
  const c = l.cours && course(l.cours);
  openSheet(`<div class="bs-head"><h2>${esc(l.mot)}</h2></div><p class="lx-def">${fr(l.def)}</p>
    <div class="bs-btns">${c ? `<button class="btn ghost" data-go="fiche" data-arg="${esc(c.id)}" data-close>Cours ${courseNumber(c)} · ${esc(c.titre)}</button>` : ''}<button class="btn" data-close>Compris</button></div>`);
}

/* ---------- les pièges de l'examen ---------- */
/* une série pour s'habituer aux questions à plusieurs réponses : toutes celles de la banque, plus quelques questions à une seule réponse */
export function serieMulti() {
  const all = [...QUESTIONS.values()].filter(q => q.type === 'qcm' && q.bonnes && q.choix && q.choix.length > 1);
  const multi = all.filter(q => q.bonnes.length > 1), seules = shuffle(all.filter(q => q.bonnes.length === 1)).slice(0, Math.max(4, 20 - multi.length));
  return { titre: 'Une ou plusieurs réponses', ids: shuffle(multi.concat(seules).map(q => q.id)).slice(0, 20), mode: 'entrainement', retour: 'pieges' };
}
export function renderPieges() {
  $('#pgLire').innerHTML = LIRE.map(([t, s], k) => `<li><span class="lq-n num">${k + 1}</span><div><b>${esc(t)}</b><p>${fr(s)}</p></div></li>`).join('');
  const n = [...QUESTIONS.values()].filter(q => q.bonnes && q.bonnes.length > 1).length;
  $('#pgMultiN').textContent = `${n} questions à plusieurs réponses, mêlées à d’autres`;
  const vus = COURSES.filter(c => c.piege && courseState(c.id).done), autres = COURSES.filter(c => c.piege && !courseState(c.id).done);
  $('#pgCartesN').textContent = vus.length ? `${vus.length} cours vus d’abord` : `${autres.length} cours`;
  $('#pgCartes').innerHTML = vus.concat(autres).map(c => piegeHTML(c, { lien: true })).join('');
  bindPieges($('#pgCartes'));
}

/* ---------- le lexique ---------- */
const sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function renderLexique(filtre = '') {
  const f = sansAccent(filtre.trim());
  const liste = LEXIQUE.filter(l => !f || sansAccent(l.mot).includes(f) || sansAccent(l.def).includes(f) || l.formes.some(x => sansAccent(x).includes(f)));
  $('#lxListe').innerHTML = liste.length ? liste.map(l => { const c = l.cours && course(l.cours);
    return `<li><b>${esc(l.mot)}</b><p>${fr(l.def)}</p>${c ? `<button class="lx-c" data-go="fiche" data-arg="${esc(c.id)}">Cours ${courseNumber(c)} · ${esc(c.titre)}</button>` : ''}</li>`; }).join('')
    : '<li class="lx-vide"><p>Aucun mot ne correspond. Essaie un autre mot, sans accent si tu veux.</p></li>';
  $('#lxN').textContent = `${LEXIQUE.length} mots`;
}
