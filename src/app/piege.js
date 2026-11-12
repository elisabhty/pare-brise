/* « Le piège de l'examen » : pour chaque cours, l'erreur classique et le bon réflexe (champ « piege » du cours).
   Une carte à retourner : on lit le piège, on cherche, puis on touche pour voir le bon réflexe. */
import { esc, fr, haptic } from './util.js';
import { COURSES, courseNumber } from './content.js';
import { Sound } from './sound.js';

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 21.5 20h-19Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>';
const OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5"/></svg>';

/* la carte : titre = « Le piège de l'examen » (ou « Le piège du jour »), lien facultatif vers le cours */
export function piegeHTML(c, { titre = 'Le piège de l’examen', lien = false, ouvert = false } = {}) {
  if (!c || !c.piege) return '';
  const [piege, reflexe] = c.piege;
  return `<button class="piege${ouvert ? ' vu' : ''}" aria-expanded="${ouvert}" data-piege="${esc(c.id)}">
    <span class="pg-k">${ICON}${esc(titre)}${lien ? `<em>Cours ${courseNumber(c)}</em>` : ''}</span>
    <b class="pg-q">${fr(piege)}</b>
    <span class="pg-a"><i>${OK}</i><span>${fr(reflexe)}</span></span>
    <span class="pg-h">Touche pour voir le bon réflexe</span>
  </button>`;
}
/* les cartes d'un conteneur se retournent au toucher (une fois ouvertes, elles restent ouvertes) */
export function bindPieges(root) {
  if (!root) return;
  root.querySelectorAll('.piege').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('vu')) return;
    b.classList.add('vu'); b.setAttribute('aria-expanded', 'true'); haptic('ok'); Sound.ui('ok');
  }));
}
/* le piège du jour : il change chaque jour, parmi les cours déjà vus (sinon, celui du prochain cours) */
export function piegeDuJour(vus, prochain) {
  const pool = COURSES.filter(c => c.piege && vus(c.id));
  if (!pool.length) return prochain && prochain.piege ? prochain : null;
  const d = new Date(), jour = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return pool[jour % pool.length];
}
