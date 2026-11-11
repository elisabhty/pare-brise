/* Dates « locales » (jour du téléphone), au format AAAA-MM-JJ. Le lundi est le jour 0 de la semaine. */
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => { const d = (typeof window !== 'undefined' && window.__today) ? fromIso(window.__today) : new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const wd = d => (d.getDay() + 6) % 7;
export const diffD = (a, b) => Math.round((fromIso(iso(b)) - fromIso(iso(a))) / 86400000);
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const JL = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const JC = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/* « jeudi 18 décembre » */
export const longJour = d => `${JOURS[wd(d)]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
/* « 18 déc. » */
export const court = d => `${d.getDate()} ${MC[d.getMonth()]}`;
/* « Aujourd’hui », « Demain », « Jeudi 18 décembre » */
export function relJour(d, t = today()) {
  const n = diffD(t, d);
  if (n === 0) return 'Aujourd’hui';
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  const s = longJour(d); return s[0].toUpperCase() + s.slice(1);
}
