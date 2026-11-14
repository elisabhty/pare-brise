/* Cœur de l'onglet « Réserver » (le vrai examen), sans DOM : testé à part.
   L'état : { neph: 'non' | 'attente' | 'oui', nephLe: 'AAAA-MM-JJ' | null, age: '15' | '17' | '18' | '21' | '25' | null,
              docs: { identite, domicile, photo, assr, jdc, parent }, cp: '75011',
              resa: { d: 'AAAA-MM-JJ', h: 'HH:MM', lieu: '', op: 'laposte' } | null,
              sac: { convocation, identite, trajet }, resultat: null | 'ok' | 'ko' }.
   L'âge n'est qu'une tranche, gardée sur le téléphone : elle sert à dire quels documents préparer pour la demande de NEPH.
   Le numéro NEPH lui-même n'est jamais demandé ni enregistré : l'app n'en a pas besoin, seul son site de réservation le demande. */
import { iso, fromIso, diffD } from './dates.js';

export const VIDE = () => ({ neph: 'non', nephLe: null, age: null, docs: {}, cp: '', resa: null, sac: {}, resultat: null, fautes: null, dernierEchec: null, echecs: 0 });
/* après un examen raté : le nombre de fautes annoncé (6 à 11, 11 = « 11 ou plus »), la date du dernier passage raté
   (les examens blancs d'avant ne comptent plus pour « prêt ») et le nombre de passages ratés */
export const FAUTES = [6, 7, 8, 9, 10, 11];
export const fautesOk = f => FAUTES.includes(+f);
/* les examens blancs qui comptent : ceux faits après le dernier passage raté */
export function depuisEchec(e) {
  const d = e.resultat === 'ko' && e.resa ? e.resa.d : e.dernierEchec;
  return d && dateOk(d) ? fromIso(d).getTime() + 86400000 : 0;
}
export const lire = brut => Object.assign(VIDE(), brut || {}, { sac: Object.assign({}, (brut && brut.sac) || {}), docs: Object.assign({}, (brut && brut.docs) || {}) });

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

/* ---------- la demande de NEPH : quels documents, selon l'âge ---------- */
/* Source : service-public.gouv.fr, fiche « Permis B », étape « S'inscrire à l'examen du permis de conduire », cas « Par vous-même ».
   Tous : justificatif d'identité, justificatif de domicile de moins de 6 mois, photo d'identité ou photo-signature numérique.
   Moins de 21 ans : ASSR2 ou ASR (à défaut, déclaration sur l'honneur). Mineur : justificatif d'identité du représentant légal.
   Français de 17 ans révolus à 25 ans non révolus : justificatif de la journée défense et citoyenneté (JDC). */
export const AGES = [
  { id: '15', nom: '15-16 ans', docs: ['assr', 'parent'] },
  { id: '17', nom: '17 ans', docs: ['assr', 'jdc', 'parent'] },
  { id: '18', nom: '18-20 ans', docs: ['assr', 'jdc'] },
  { id: '21', nom: '21-24 ans', docs: ['jdc'] },
  { id: '25', nom: '25 ans et +', docs: [] }
];
export const DOCS = {
  identite: ['Un justificatif d’identité', 'Carte d’identité ou passeport, en photo ou scanné.'],
  domicile: ['Un justificatif de domicile de moins de 6 mois', 'Le site officiel liste ceux qui sont acceptés.'],
  photo: ['Une photo d’identité, ou une photo-signature numérique', 'La photo-signature se fait en cabine ou chez un photographe agréé : tu repars avec un code à recopier.'],
  assr: ['Ton ASSR2, ou ton ASR', 'L’attestation de sécurité routière. Perdue ? Une déclaration sur l’honneur la remplace.'],
  jdc: ['Ton justificatif de JDC, si tu es français', 'Certificat de participation à la journée défense et citoyenneté, ou attestation d’exemption ou de report.'],
  parent: ['La pièce d’identité d’un parent', 'Ou de ton représentant légal : elle est demandée tant que tu es mineur.']
};
const BASE = ['identite', 'domicile', 'photo'];
export const ageOk = a => AGES.some(x => x.id === a);
/* la liste à préparer : les trois documents de tous, puis ceux de la tranche d'âge (aucune tranche : seulement la base) */
export const docsNeph = age => BASE.concat((AGES.find(x => x.id === age) || { docs: [] }).docs);
export const docsPrets = e => docsNeph(e.age).filter(k => e.docs && e.docs[k]).length;

/* ---------- l'attente du NEPH ---------- */
/* Aucun délai n'est garanti. Les repères publiés vont d'environ deux semaines à six (La Poste écrit « 6 semaines environ ») :
   l'app affiche cette fourchette comme un repère, jamais comme une promesse. */
export const NEPH_SEMAINES = [2, 6];
export function fenetreNeph(nephLe) {
  if (!dateOk(nephLe)) return null;
  const plus = n => { const x = fromIso(nephLe); x.setDate(x.getDate() + n * 7); return x; };
  return { tot: plus(NEPH_SEMAINES[0]), tard: plus(NEPH_SEMAINES[1]) };
}
/* 'debut' : trop tôt pour s'inquiéter · 'fenetre' : il peut arriver d'un jour à l'autre · 'tard' : la fourchette est dépassée */
export function attenteNeph(nephLe, t) {
  const f = fenetreNeph(nephLe); if (!f) return null;
  const part = Math.max(0, Math.min(1, diffD(fromIso(nephLe), t) / (NEPH_SEMAINES[1] * 7)));
  return { etat: diffD(t, f.tot) > 0 ? 'debut' : diffD(t, f.tard) >= 0 ? 'fenetre' : 'tard', part, jours: diffD(fromIso(nephLe), t), ...f };
}

/* ---------- les règles de la réservation, telles que La Poste les publie ---------- */
/* laposte.fr, « Passez l'examen du code Auto et Moto avec La Poste » : réservation jusqu'à 3 mois à l'avance ;
   changement ou annulation jusqu'à la veille 23 h 59, remboursement sous 48 h hors week-ends et jours fériés ; plus de 1 600 centres.
   service-public.gouv.fr : inscription possible dès 16 ans, 15 ans en apprentissage anticipé de la conduite. */
export const REGLES = { moisAvance: 3, annulation: 'la veille, 23\u00a0h\u00a059', remboursementH: 48, centresLaPoste: 1600, ageMin: 16, ageMinAac: 15 };

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
/* Le jour J, il faut 35 bonnes réponses sur 40 (87,5 %). Pour réserver, l'app demande de la marge : 37 sur 40 ou plus
   à trois examens blancs de suite. Se présenter trop tôt est l'erreur la plus courante, et chaque passage raté se repaie.
   Seuls les examens blancs complets (40 questions) comptent pour « prêt » ; les examens rapides servent à s'entraîner. */
export const SEUIL = 35 / 40;
export const SEUIL_PRET = 37 / 40;
export const N_PRET = 3;
const estBlanc = x => x.blanc || x.total >= 40;
const sur40 = x => Math.round(x.score / x.total * 40);
export function niveau({ examens = [], coursVus = 0, coursTotal = 0 }) {
  const bl = examens.filter(x => x.total && estBlanc(x));
  const derniers = bl.slice(-N_PRET);
  // les réussites « avec marge » de suite, en partant du plus récent
  let reussis = 0; for (let k = bl.length - 1; k >= 0 && bl[k].score / bl[k].total >= SEUIL_PRET - 1e-9; k--) reussis++;
  reussis = Math.min(reussis, N_PRET);
  const pret = derniers.length === N_PRET && reussis === N_PRET;
  const cinq = bl.slice(-5), moyenne = cinq.length ? Math.round(cinq.reduce((a, x) => a + x.score / x.total * 40, 0) / cinq.length * 10) / 10 : null;
  const dernier = bl.length ? sur40(bl[bl.length - 1]) : null;
  const reste = coursTotal - coursVus;
  let conseil;
  if (pret) conseil = `Tes ${N_PRET} derniers examens blancs sont à 37 sur 40 ou plus : tu as de la marge. Tu peux réserver.`;
  else if (reste > 0) conseil = `Il te reste ${reste} cours à voir. Ensuite, vise 37 sur 40 à ${N_PRET} examens blancs de suite.`;
  else if (!bl.length) conseil = 'Tous les cours sont vus. Fais un examen blanc pour te situer.';
  else if (reussis) conseil = `Encore ${N_PRET - reussis} examen${N_PRET - reussis > 1 ? 's' : ''} blanc${N_PRET - reussis > 1 ? 's' : ''} à 37 ou plus, de suite, et tu peux réserver.`;
  else conseil = dernier >= 35 ? `${dernier} sur 40 : ça passerait de justesse. Vise 37 pour garder de la marge le jour J.` : `Vise 37 sur 40 à ${N_PRET} examens blancs de suite avant de réserver : un passage raté se repaie.`;
  return { pret, reussis, faits: bl.length, moyenne, dernier, presque: !pret && dernier !== null && dernier >= 35, conseil };
}

/* le badge de l'onglet : « J-12 », « J-1 », « Jour J » ; rien sans session à venir */
export const badge = (e, t) => { const j = joursAvant(e, t); return j === null || j < 0 || e.resultat ? '' : j === 0 ? 'Jour J' : `J-${j}`; };
