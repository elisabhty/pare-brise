/* Après un examen (blanc, rapide, ou le vrai raté) : d'où viennent les erreurs, cours par cours.
   On montre les 3 cours où l'on a perdu le plus de points, chacun avec un lien pour le revoir, et le piège
   du cours qui coûte le plus (le champ « piege » du cours : l'erreur classique et le bon réflexe). */
import { esc } from './util.js';
import { course, courseNumber } from './content.js';
import { piegeHTML } from './piege.js';

/* lignes : [{ cours, ok }] → [{ c, n }] du plus coûteux au moins coûteux */
export function erreursParCours(lignes) {
  const n = {};
  (lignes || []).forEach(l => { if (l && l.ok === false && l.cours && course(l.cours)) n[l.cours] = (n[l.cours] || 0) + 1; });
  return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([id, k]) => ({ c: course(id), n: k }));
}

export function diagHTML(lignes, { titre = 'À revoir en priorité', max = 3 } = {}) {
  const d = erreursParCours(lignes).slice(0, max);
  if (!d.length) return '';
  return `<div class="diag">
    <span class="diag-k">${esc(titre)}</span>
    <ul class="diag-l">${d.map(({ c, n }) => `<li><button data-go="fiche" data-arg="${esc(c.id)}"><span class="diag-n num">${courseNumber(c)}</span><span class="diag-t"><b>${esc(c.titre)}</b><small>${n} erreur${n > 1 ? 's' : ''}</small></span><span class="diag-go">Revoir</span></button></li>`).join('')}</ul>
    ${d[0].c.piege ? piegeHTML(d[0].c, { titre: 'Le piège qui t’a eu', lien: true }) : ''}
  </div>`;
}
