/* Le cerveau de Plot, sans DOM (testé à part) : ce qu'il dit, selon où en est l'élève.
   Un seul conseil à la fois, le plus utile maintenant, avec au plus une action. Plot ne parle des règles du code
   qu'avec ce que l'app affiche déjà ailleurs (35 sur 40, 30 €, la veille, 2 à 6 semaines pour le NEPH) : aucune règle nouvelle ici.

   L'état reçu (tout est facultatif) :
   { prenom, heure (0-23), jour (numéro du jour, pour varier les phrases),
     serie, record, actifAuj, absence (jours depuis la dernière activité, null si jamais actif),
     coursVus, coursTotal, prochain: { id, num, titre, min, enCours, chapitre, nCh },
     revoir (questions à revoir), pratique: { id, num } (pratique d'un cours vu, pas encore faite),
     plan: null | { reste, late, seanceFaite, libre, fin: 'AAAA-MM-JJ', examen: 'AAAA-MM-JJ' | null },
     pret, reussis (0 à 3, examens blancs de suite à 37 sur 40 ou plus), dernierBlanc (sur 40) | null, blancs (nombre), blancReussi,
     jj: { etape, j, neph: 'non' | 'attente' | 'oui', attente: 'debut' | 'fenetre' | 'tard' | null, resa, resultat } } */

const pl = (n, m, p = m + 's') => `${n} ${n > 1 ? p : m}`;
/* une phrase parmi plusieurs, stable dans la journée : Plot ne se répète pas d'un jour à l'autre, ni d'un écran à l'autre */
const un = (liste, jour = 0) => liste[((jour % liste.length) + liste.length) % liste.length];
/* « 21 décembre », « 1er mars » : en toutes lettres, pour ne pas finir une phrase sur un point d'abréviation */
const dateLongue = d => { const [, m, j] = String(d).split('-').map(Number); return `${j === 1 ? '1er' : j} ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][m - 1]}`; };

/* où en sont les examens blancs, en une phrase : il en faut 35 le jour J, l'app demande 37 trois fois de suite pour réserver */
function aVenir(s) {
  const d = s.dernierBlanc, r = s.reussis || 0;
  if (d == null) return 'Fais un examen blanc pour te situer : 40 situations, comme le jour J.';
  if (d < 35) return `Dernier examen blanc : ${d} sur 40. Il en manquait ${35 - d} : revois tes erreurs, puis on en refait un.`;
  if (d < 37) return `Dernier examen blanc : ${d} sur 40. Ça passerait de justesse : vise 37 pour garder de la marge.`;
  return `Dernier examen blanc : ${d} sur 40. Encore ${3 - r > 1 ? `${3 - r} de suite` : 'un'} à 37 ou plus, et tu es prêt.`;
}

/* ---------- le conseil de l'accueil ---------- */
export function conseil(s = {}) {
  const jj = s.jj || {}, h = s.heure ?? 12, jour = s.jour || 0, nom = s.prenom ? `, ${s.prenom}` : '';
  const rev = s.revoir || 0, p = s.plan;
  const allerRevoir = { label: `Revoir mes ${pl(rev, 'question')}`, revoir: true };

  // 1. l'examen, et ce qui l'entoure
  if (jj.etape === 'jourj') return { id: 'jourj', humeur: 'cheer', texte: `C’est aujourd’hui${nom} ! Pièce d’identité originale, convocation, et arrive 15 minutes avant. Je crois en toi !`, action: { label: 'Mes affaires du jour J', go: 'jourj' } };
  if (jj.etape === 'resultat') return { id: 'resultat', humeur: '', texte: 'Alors, ce code ? Le résultat arrive par e-mail, en général 24 à 72 heures après. Dis-moi quand tu l’as.', action: { label: 'Noter mon résultat', go: 'jourj' } };
  if (jj.etape === 'reussi') return { id: 'reussi', humeur: 'loop', texte: `Code en poche${nom} ! Garde ton NEPH : il te suit jusqu’à l’examen de conduite.`, action: null };
  if (jj.etape === 'rate') return { id: 'rate', humeur: '', texte: rev ? `Ce n’est que partie remise. On commence par tes ${pl(rev, 'question')} à revoir, puis on réserve une nouvelle session.` : 'Ce n’est que partie remise. Un examen blanc pour voir où ça a coincé, puis on réserve une nouvelle session.', action: rev ? allerRevoir : { label: 'Faire un examen blanc', exo: 'x-exam-blanc' } };
  if (jj.etape === 'attente' && jj.j <= 3) return { id: 'j-moins', humeur: 'cheer', texte: jj.j === 1 ? 'C’est demain ! Un dernier examen blanc ce soir, puis prépare tes affaires et dors bien.' : `Plus que ${jj.j} jours. Un examen blanc par jour d’ici là, et on garde le rythme.`, action: jj.j === 1 ? { label: 'Mes affaires du jour J', go: 'jourj' } : { label: 'Faire un examen blanc', exo: 'x-exam-blanc' } };

  // 2. le retour après une absence, la série en danger, le retard
  if (s.absence >= 3 && !s.actifAuj) return { id: 'retour', humeur: 'cheer', texte: `${un(['Content de te revoir', 'Te revoilà', 'Ah, te voilà'], jour)}${nom} ! On reprend en douceur : ${rev ? `${pl(rev, 'question')} à revoir, pour te remettre dans le bain` : 'une activité, et c’est reparti'}.`, action: rev ? allerRevoir : null };
  if (s.serie >= 2 && !s.actifAuj && h >= 18) return { id: 'serie', humeur: 'oops', texte: `Ta série de ${s.serie} jours s’arrête à minuit ! Une seule activité suffit pour la garder.`, action: rev ? allerRevoir : null };
  if (p && p.late) return { id: 'retard', humeur: '', texte: `${pl(p.late, 'activité')} en retard. Pas de panique : je les replace sur tes prochaines séances.`, action: { label: 'Voir mon planning', go: 'planning' } };
  if (p && p.examen && p.fin && p.fin > p.examen) return { id: 'rythme', humeur: 'oops', texte: `À ce rythme, tu finis le ${dateLongue(p.fin)}, après ton examen du ${dateLongue(p.examen)}. Ajoute un jour, ou du temps par séance.`, action: { label: 'Adapter mon rythme', adapter: true } };

  // 3. la journée est faite
  if (s.actifAuj && (!p || p.seanceFaite || p.libre)) return { id: 'fait', humeur: 'cheer', texte: `${un(['C’est fait pour aujourd’hui', 'Belle séance', 'Journée validée'], jour)}${nom} !${s.serie >= 2 ? ` ${s.serie} jours d’affilée.` : ''}${rev >= 3 ? ` Encore 5 minutes ? ${pl(rev, 'question')} à revoir.` : ' Reviens demain pour continuer.'}`, action: rev >= 3 ? allerRevoir : null };

  // 4. ce qui fait gagner le plus de points
  if (rev >= 8) return { id: 'revoir', humeur: '', texte: `${pl(rev, 'question')} à revoir. Ce sont tes erreurs : les remettre en place, c’est gagner des points le jour J.`, action: allerRevoir };
  if (s.pret && jj.neph === 'oui' && !jj.resa) return { id: 'reserver', humeur: 'cheer', texte: 'Trois examens blancs à 37 sur 40 ou plus : tu as de la marge. Il est temps de réserver ta place.', action: { label: 'Réserver mon examen', go: 'jourj' } };
  if (jj.neph === 'non' && s.coursVus >= 3) return { id: 'neph', humeur: '', texte: 'Pense à demander ton NEPH dès maintenant : il met 2 à 6 semaines à arriver. Autant qu’il soit là quand tu seras prêt.', action: { label: 'Voir comment faire', go: 'jourj' } };
  if (jj.neph === 'attente' && jj.attente === 'tard') return { id: 'neph-tard', humeur: 'oops', texte: 'Ta demande de NEPH a plus de 6 semaines. Jette un œil à ton espace France Titres : un document est peut-être à renvoyer.', action: { label: 'Voir ma demande', go: 'jourj' } };
  if (s.coursTotal && s.coursVus >= s.coursTotal) {
    if (!s.blancs) return { id: 'blanc', humeur: 'cheer', texte: 'Tous les cours sont vus ! Place à l’examen blanc : 40 situations, comme le jour J.', action: { label: 'Faire un examen blanc', exo: 'x-exam-blanc' } };
    if (!s.pret) return { id: 'blanc', humeur: '', texte: aVenir(s), action: rev && s.dernierBlanc != null && s.dernierBlanc < 35 ? allerRevoir : { label: 'Faire un examen blanc', exo: 'x-exam-blanc' } };
  }
  if (s.pratique) return { id: 'pratique', humeur: '', texte: `Tu as vu le cours ${s.pratique.num}, mais pas encore sa pratique en 3D. C’est là que ça rentre vraiment.`, action: { label: 'Lancer la pratique', exo: s.pratique.id } };
  if (rev >= 3) return { id: 'revoir', humeur: '', texte: `${pl(rev, 'question')} à revoir : 5 minutes pour les remettre en place.`, action: allerRevoir };
  if (!p && s.coursVus >= 2) return { id: 'planning', humeur: '', texte: 'Tu veux que je range la suite de ton parcours dans ta semaine ? Choisis tes jours, je m’occupe du reste.', action: { label: 'Créer mon planning', go: 'planning' } };

  // 5. par défaut : le prochain cours (la carte juste en dessous a son bouton, Plot n'en ajoute pas)
  const c = s.prochain;
  if (c && c.enCours) return { id: 'cours', humeur: '', texte: `On reprend le cours ${c.num} ? Tu t’étais arrêté au chapitre ${c.chapitre} sur ${c.nCh}.`, action: null };
  if (c && !s.coursVus) return { id: 'cours', humeur: 'loop', texte: `${h < 5 || h >= 18 ? 'Bonsoir' : 'Salut'}${nom} ! Je suis Plot, ton moniteur. On commence par le cours ${c.num} : ${c.min} minutes, et je t’explique tout.`, action: null };
  if (c) return { id: 'cours', humeur: '', texte: `${un(['Prochaine étape', 'On enchaîne', 'Au programme'], jour)} : le cours ${c.num}, « ${c.titre} ». ${c.min} minutes.`, action: null };
  return { id: 'rien', humeur: '', texte: 'Je suis là si tu as besoin.', action: null };
}

/* ---------- ce que Plot ajoute sur un onglet (null : rien d'utile à ajouter, il se tait) ---------- */
export function conseilEcran(ecran, s = {}) {
  const rev = s.revoir || 0, p = s.plan;
  if (ecran === 'planning') {
    if (!p) return null;
    if (p.examen && p.fin && p.fin > p.examen) return { id: 'rythme', humeur: 'oops', texte: `À ce rythme, tu finis le ${dateLongue(p.fin)}, après ton examen du ${dateLongue(p.examen)}. Ajoute un jour, ou du temps par séance.`, action: { label: 'Adapter mon rythme', adapter: true } };
    if (p.late) return { id: 'retard', humeur: '', texte: `${pl(p.late, 'activité')} en retard. Touche « Replacer » : je les répartis sur tes prochaines séances, sans rien perdre.`, action: null };
    if (s.serie >= 3 && s.actifAuj) return { id: 'serie', humeur: 'cheer', texte: `${s.serie} jours d’affilée, tu tiens le rythme. Continue comme ça !`, action: null };
    return null;
  }
  if (ecran === 'questions') {
    if (!s.coursVus) return { id: 'cours', humeur: '', texte: 'Les questions viennent des cours. Commence par le cours 1 : sa série t’attend juste après.', action: s.prochain && s.prochain.id ? { label: 'Voir le cours 1', go: 'fiche', arg: s.prochain.id } : { label: 'Voir les cours', go: 'parcours' } };
    if (s.pret) return { id: 'pret', humeur: 'cheer', texte: 'Trois examens blancs à 37 sur 40 ou plus : tu es prêt. Tu peux réserver ta place.', action: { label: 'Réserver mon examen', go: 'jourj' } };
    if (rev) return { id: 'revoir', humeur: '', texte: `Commence par tes ${pl(rev, 'question')} à revoir : ce sont tes erreurs, et chacune remise en place, c’est un point de plus le jour J.`, action: null };
    if (s.dernierBlanc != null) return { id: 'blanc', humeur: s.dernierBlanc >= 37 ? 'cheer' : '', texte: aVenir(s), action: null };
    return { id: 'repere', humeur: '', texte: 'Le jour J, il faut 35 sur 40. Mon repère pour réserver : 37 sur 40 à trois examens blancs de suite.', action: null };
  }
  if (ecran === 'conduite') {
    if (s.pratique) return { id: 'pratique', humeur: '', texte: `La pratique du cours ${s.pratique.num} t’attend : c’est en conduisant qu’on retient le mieux.`, action: { label: 'Lancer la pratique', exo: s.pratique.id } };
    return null;
  }
  return null;
}

/* ---------- les étapes à fêter ---------- */
/* dans l'ordre où Plot les fête quand plusieurs arrivent ensemble (la plus importante d'abord) */
export const JALONS = [
  { id: 'code', titre: 'Code en poche !', texte: p => `Bravo${p ? ` ${p}` : ''}, tu l’as ! Garde ton NEPH : il te suit jusqu’à l’examen de conduite.` },
  { id: 'resa', titre: 'Place réservée !', texte: () => 'Je compte les jours avec toi. On garde le rythme jusqu’au jour J.' },
  { id: 'pret', titre: 'Tu es prêt !', texte: () => 'Trois examens blancs de suite à 37 sur 40 ou plus. Il est temps de réserver ta place.', action: { label: 'Réserver mon examen', go: 'jourj' } },
  { id: 'neph', titre: 'Ton NEPH est là !', texte: () => 'Une étape de moins. Plus qu’à être prêt, et à réserver.' },
  { id: 'blanc', titre: 'Examen blanc réussi !', texte: () => '35 sur 40 ou plus, comme le jour J. Vise 37 trois fois de suite pour avoir de la marge.' },
  { id: 'cours-tous', titre: 'Tous les cours sont vus !', texte: () => 'Place aux examens blancs : trois de suite à 37 sur 40, et tu es prêt.', action: { label: 'Faire un examen blanc', exo: 'x-exam-blanc' } },
  { id: 'cours-20', titre: '20 cours vus !', texte: () => 'Tu as fait le plus dur. Garde le rythme, et pense à tes questions à revoir.' },
  { id: 'cours-10', titre: '10 cours vus !', texte: () => 'Tu as pris le rythme. Tes questions à revoir fixent ce que tu as vu.' },
  { id: 'cours-5', titre: '5 cours vus !', texte: () => 'Ça avance bien. Un peu chaque jour, c’est comme ça qu’on retient.' },
  { id: 'cours-1', titre: 'Premier cours bouclé !', texte: () => 'C’est parti. Fais sa pratique en 3D pendant que c’est frais.' },
  { id: 'serie-30', titre: '30 jours d’affilée !', texte: () => 'Un mois sans lâcher. Chapeau.' },
  { id: 'serie-14', titre: '14 jours d’affilée !', texte: () => 'Deux semaines de suite. Tu es inarrêtable.' },
  { id: 'serie-7', titre: '7 jours d’affilée !', texte: () => 'Une semaine entière. C’est la régularité qui fait réussir.' },
  { id: 'serie-3', titre: '3 jours d’affilée !', texte: () => 'Un peu chaque jour : c’est comme ça qu’on retient le mieux.' }
];
/* les étapes atteintes, d'après l'état */
export function atteints(s = {}) {
  const jj = s.jj || {}, vus = s.coursVus || 0, tot = s.coursTotal || 0, rec = Math.max(s.record || 0, s.serie || 0), out = new Set();
  if (jj.resultat === 'ok') out.add('code');
  if (jj.resa) out.add('resa');
  if (s.pret) out.add('pret');
  if (jj.neph === 'oui') out.add('neph');
  if (s.blancReussi) out.add('blanc');
  if (tot && vus >= tot) out.add('cours-tous');
  [20, 10, 5, 1].forEach(n => { if (vus >= n && tot > n) out.add(`cours-${n}`); });
  [30, 14, 7, 3].forEach(n => { if (rec >= n) out.add(`serie-${n}`); });
  return JALONS.map(j => j.id).filter(id => out.has(id));
}
/* la prochaine étape à fêter : la plus importante parmi celles atteintes et pas encore fêtées */
export const aFeter = (s, deja = []) => { const vu = new Set(deja); const id = atteints(s).find(x => !vu.has(x)); return id ? JALONS.find(j => j.id === id) : null; };
