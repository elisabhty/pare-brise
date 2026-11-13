/* Cœur de l'onglet « Réserver » (le vrai examen), sans DOM : testé à part.
   L'état : { neph: 'non' | 'attente' | 'oui', nephLe: 'AAAA-MM-JJ' | null, cp: '75011',
              resa: { d: 'AAAA-MM-JJ', h: 'HH:MM', lieu: '', op: 'laposte' } | null,
              sac: { convocation, identite, trajet }, resultat: null | 'ok' | 'ko' }.
   Le numéro NEPH lui-même n'est jamais demandé ni enregistré : l'app n'en a pas besoin, seul son site de réservation le demande. */
import { iso, fromIso, diffD } from './dates.js';

export const VIDE = () => ({ neph: 'non', nephLe: null, cp: '', resa: null, sac: {}, resultat: null });
export const lire = brut => Object.assign(VIDE(), brut || {}, { sac: Object.assign({}, (brut && brut.sac) || {}) });

/* ---------- les centres agréés par l'État (même épreuve, même prix partout) ---------- */
/* adresses officielles, celles que les préfectures publient dans leurs listes de centres */
export const PRIX = 30;
export const OPERATEURS = [
  { id: 'laposte', nom: 'La Poste', marque: 'Le Code avec La Poste', url: 'https://www.lecode.laposte.fr/' },
  { id: 'sgs', nom: 'ObjectifCode', marque: 'SGS', url: 'https://www.objectifcode.sgs.com/' },
  { id: 'pearson', nom: 'Pointcode', marque: 'Pearson Vue', url: 'https://www.pointcode.fr/' },
  { id: 'veritas', nom: 'Code’nGo', marque: 'Bureau Veritas', url: 'https://codengo.bureauveritas.fr/portal' },
  { id: 'dekra', nom: 'Le Code Dekra', marque: 'Dekra', url: 'https://www.le-code-dekra.fr/' }
];
export const operateur = id => OPERATEURS.find(o => o.id === id) || OPERATEURS[0];
export const ANTS = 'https://permisdeconduire.ants.gouv.fr/';

/* ---------- la recherche de sessions à La Poste ---------- */
/* un code postal français : 5 chiffres, département de 01 à 98 (2A et 2B s'écrivent 20) */
export const cpOk = cp => /^(0[1-9]|[1-8]\d|9[0-8])\d{3}$/.test(String(cp || '').trim());
/* la page de recherche de La Poste s'ouvre directement sur la commune quand on lui donne le code postal */
export const lienLaPoste = cp => (cpOk(cp)
  ? `https://www.lecode.laposte.fr/passermonexamenducodeaveclaposte/common/recherche-session?city=${String(cp).trim()}`
  : OPERATEURS[0].url);

/* ---------- la session notée par l'élève ---------- */
export const heureOk = h => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ''));
export const dateOk = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && iso(fromIso(d)) === d;
/* « 14 h 30 », « 9 h » (espaces insécables : l'heure ne se coupe pas en fin de ligne) */
export const heureFr = h => { if (!heureOk(h)) return ''; const [a, b] = h.split(':'); return `${+a}\u00a0h${b === '00' ? '' : '\u00a0' + b}`; };
/* jours qui restent avant la session (0 = aujourd'hui, négatif = passée) */
export const joursAvant = (e, t) => (e.resa && dateOk(e.resa.d) ? diffD(t, fromIso(e.resa.d)) : null);
/* la règle nationale depuis le 1er juillet 2026 : on s'inscrit au plus tard la veille de l'épreuve */
export const dernierJourPourReserver = d => { const x = fromIso(d); x.setDate(x.getDate() - 1); return x; };

/* ---------- où en est l'élève ---------- */
/* 'neph' : il lui manque son numéro · 'niveau' : il révise encore · 'reserver' : il peut réserver ·
   'attente' : session notée, à venir · 'jourj' : c'est aujourd'hui · 'resultat' : session passée, résultat attendu ·
   'reussi' / 'rate' : résultat connu */
export function etape(e, t, pret) {
  if (e.resultat === 'ok') return 'reussi';
  const j = joursAvant(e, t);
  if (j !== null) return j > 0 ? 'attente' : j === 0 ? 'jourj' : e.resultat === 'ko' ? 'rate' : 'resultat';
  if (e.resultat === 'ko') return 'rate';
  if (e.neph !== 'oui') return 'neph';
  return pret ? 'reserver' : 'niveau';
}

/* ---------- le niveau : notre repère, pas une règle officielle ---------- */
/* prêt quand les deux derniers examens (blancs ou rapides) atteignent le seuil du jour J : 35 sur 40, soit 87,5 % */
export const SEUIL = 35 / 40;
export function niveau({ examens = [], coursVus = 0, coursTotal = 0 }) {
  const derniers = examens.slice(-2), reussis = derniers.filter(x => x.total && x.score / x.total >= SEUIL).length;
  const pret = derniers.length === 2 && reussis === 2;
  const reste = coursTotal - coursVus;
  let conseil;
  if (pret) conseil = 'Tes deux derniers examens passent la barre du jour J. Tu peux réserver.';
  else if (reste > 0) conseil = `Il te reste ${reste} cours à voir. Réserve quand tu réussis deux examens blancs de suite.`;
  else if (!derniers.length) conseil = 'Tous les cours sont vus. Fais un examen blanc pour te situer.';
  else conseil = reussis ? 'Encore un examen blanc réussi et tu peux réserver.' : 'Vise 35 bonnes réponses sur 40 à deux examens blancs de suite avant de réserver.';
  return { pret, reussis, conseil };
}

/* le badge de l'onglet : « J-12 », « J-1 », « Jour J » ; rien sans session à venir */
export const badge = (e, t) => { const j = joursAvant(e, t); return j === null || j < 0 || e.resultat ? '' : j === 0 ? 'Jour J' : `J-${j}`; };
