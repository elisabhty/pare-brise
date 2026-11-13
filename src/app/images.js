/* Les illustrations (fichiers docs/img/<nom>.webp) : une image n'est affichée que si elle existe.
   Noms : scènes des cours hors route « a1 », « f2 »… (codes de la liste de génération), étapes de l'examen « e1 » à « e4 »,
   expressions de Plot « p1 » à « p8 ». */
import { IMAGES } from './content.js';
import { esc } from './util.js';

export const hasImg = k => !!k && IMAGES.has(k);
export const imgSrc = k => `img/${k}.webp`;
/* la balise, ou '' si l'image n'existe pas (l'appelant garde alors ce qu'il affichait avant) */
export const imgTag = (k, cls = '', alt = '') => (hasImg(k) ? `<img class="${esc(cls)}" src="${imgSrc(k)}" alt="${esc(alt)}" decoding="async" draggable="false">` : '');
/* Plot dans une humeur : son image dédiée si elle existe (p1 coucou, p2 joie, p3 pouce, p4 déçu, p5 pensif, p6 inquiet,
   p7 endormi, p8 trophée), sinon null : l'appelant garde le sprite animé */
const HUMEURS = { coucou: 'p1', joie: 'p2', pouce: 'p3', decu: 'p4', pensif: 'p5', inquiet: 'p6', dort: 'p7', trophee: 'p8' };
export const plotImg = h => (hasImg(HUMEURS[h]) ? HUMEURS[h] : null);

/* Les cours qui ne parlent pas de conduire (alcool, fatigue, papiers…) : chaque scène peut être une image plutôt que la route.
   Le code d'une image = la lettre du cours + le numéro de la scène (a1 = scène 1 du cours Alcool). Le titre et la fin
   reprennent l'image 0 du cours quand ils n'ont pas la leur. Les mises en situation et les questions restent en 3D. */
const COURS_IMG = {
  alcool: 'a', 'fatigue-distractions': 'f', 'drogues-medicaments': 'd', 'permis-points': 'r', infractions: 'i',
  'securite-passagers': 's', 'poste-conduite': 'c', 'premiers-secours': 'h', 'papiers-assurance': 'k', entretien: 'n',
  'aides-conduite': 'g', ecoconduite: 'o', 'vehicules-propres': 'v', 'controles-vehicule': 'x', 'demarches-conducteur': 'm'
};
/* scènes qui reprennent l'image d'un autre cours (même sujet) */
const REPRISES = { 'controles-vehicule': { 5: 'n3' }, 'demarches-conducteur': { 1: 'k0', 2: 'k2', 3: 'k3' } };
const AVEC_IMAGE = new Set(['titre', 'chiffres', 'liste', 'fin']);
export function sceneImg(c, i, sc) {
  const p = c && COURS_IMG[c.id];
  if (!p || !sc || !AVEC_IMAGE.has(sc.type)) return null;
  const r = (REPRISES[c.id] || {})[i];
  return [r, p + i, sc.type === 'titre' || sc.type === 'fin' ? p + '0' : null].find(hasImg) || null;
}
export const coursAvecImages = () => Object.keys(COURS_IMG);
