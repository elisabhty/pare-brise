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
