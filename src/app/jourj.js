/* Onglet « Réserver » : le vrai examen, de la demande du numéro NEPH au résultat.
   La réservation et le paiement se font chez l'opérateur agréé (La Poste d'abord) : l'app y envoie l'élève au bon endroit,
   puis garde sa session (compte à rebours, planning, affaires du jour J). Elle n'encaisse rien et ne demande pas le NEPH. */
import { $, $$, esc, fr, haptic, store } from './util.js';
import { Sound } from './sound.js';
import { iso, fromIso, today, addD, longJour, court } from './dates.js';
import { COURSES } from './content.js';
import { doneCount, exams, readiness, toReview } from './progress.js';
import { getPlan, adaptPlan, openSheet } from './planning.js';
import { lire, PRIX, OPERATEURS, operateur, ANTS, AGES, DOCS, ageOk, docsNeph, docsPrets, NEPH_SEMAINES, attenteNeph, REGLES, cpOk, lienLaPoste, heureOk, dateOk, heureFr, joursAvant, dernierJourPourReserver, etape, niveau, badge } from './jourj-core.js';

export const getJJ = () => lire(store.get('jourj', null));
const put = patch => { const e = Object.assign(getJJ(), patch); store.set('jourj', e); refreshJJBadge(); return e; };

/* tous les examens faits dans l'app, du plus ancien au plus récent : examens blancs (en %) et examens rapides */
const examens = () => (store.get('blancs', []) || []).map(b => ({ t: b.t, score: b.score, total: 100 }))
  .concat(exams().map(x => ({ t: x.t, score: x.score, total: x.total }))).sort((a, b) => a.t - b.t);
const niv = () => niveau({ examens: examens(), coursVus: doneCount(), coursTotal: COURSES.length });

const I = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5.5 12.5 4.2 4.2 8.8-9.4"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5h5v5M19 5l-8 8M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
};
const lien = (url, label, cls = 'btn') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}${I.ext}</a>`;
const quand = r => `${longJour(fromIso(r.d))}${heureOk(r.h) ? ` à\u00a0${heureFr(r.h)}` : ''}`;

/* ---------- la carte du haut : où j'en suis ---------- */
function heroHTML(e, et, n) {
  const r = e.resa, j = joursAvant(e, today()), op = r ? operateur(r.op) : OPERATEURS[0];
  if (et === 'attente' || et === 'jourj') {
    const prets = ['convocation', 'identite', 'trajet'].filter(k => e.sac[k]).length;
    return `<div class="jj-hero resa${et === 'jourj' ? ' auj' : ''}">
      <span class="jj-k">${et === 'jourj' ? 'C’est aujourd’hui' : 'Ta session est notée'}</span>
      <div class="jj-count"><b class="num">${et === 'jourj' ? 'Jour J' : `J-${j}`}</b><div><strong>${esc(cap(quand(r)))}</strong><span>${esc(op.nom)}${r.lieu ? ` · ${esc(r.lieu)}` : ''}</span></div></div>
      <p>${et === 'jourj' ? 'Arrive 15 minutes avant l’heure : aucun retard n’est accepté.' : prets === 3 ? 'Tes affaires sont prêtes. Continue tes examens blancs jusqu’au bout.' : `Affaires du jour J : ${prets} sur 3 prêtes.`}</p>
      <div class="jj-row"><button class="jj-chip" data-jj="session">Modifier</button>${lien(op.url, 'Ma convocation', 'jj-chip')}</div>
    </div>`;
  }
  if (et === 'resultat') return `<div class="jj-hero attente">
      <span class="jj-k">Session du ${esc(court(fromIso(r.d)))}</span><b class="jj-t">Alors, ce code ?</b>
      <p>Le résultat arrive par e-mail, en général 24 à 72 heures après la session.</p>
      <div class="jj-row"><button class="jj-chip plein" data-jj="ok">Je l’ai !</button><button class="jj-chip" data-jj="ko">Pas cette fois</button></div>
    </div>`;
  if (et === 'reussi') return `<div class="jj-hero resa">
      <span class="jj-k">Résultat favorable</span><b class="jj-t">Code en poche</b>
      <p>Bravo. Garde ton numéro NEPH : il te suit jusqu’à l’épreuve de conduite.</p>
      <div class="jj-row"><button class="jj-chip" data-jj="raz">Effacer cette session</button></div>
    </div>`;
  if (et === 'rate') return `<div class="jj-hero attente">
      <span class="jj-k">Ce n’est que partie remise</span><b class="jj-t">On y retourne</b>
      <p>Reprends les questions qui t’ont coûté des points, puis réserve une nouvelle session. Chaque passage coûte ${PRIX}&nbsp;€.</p>
      <div class="jj-row">${toReview().length ? '<button class="jj-chip" data-go="entrainer">Mes questions à revoir</button>' : ''}<button class="jj-chip plein" data-jj="encore">Réserver une nouvelle session</button></div>
    </div>`;
  if (et === 'neph') {
    const a = e.neph === 'attente' ? attenteNeph(e.nephLe, today()) : null;
    if (a) return `<div class="jj-hero attente">
      <span class="jj-k">Étape 1 sur 5 · demande envoyée</span><b class="jj-t">${a.etat === 'tard' ? 'Regarde où en est ta demande' : 'Ton NEPH arrive'}</b>
      <p>${a.etat === 'tard' ? `Ta demande a plus de ${NEPH_SEMAINES[1]} semaines. Ouvre ton espace France Titres : un document est peut-être à renvoyer.` : `Attendu entre le ${esc(court(a.tot))} et le ${esc(court(a.tard))}, en général. Rien d’autre à faire : avance dans tes cours.`}</p>
      <div class="jj-bar"><i style="width:${Math.round(a.part * 100)}%"></i></div>
    </div>`;
    return `<div class="jj-hero">
      <span class="jj-k">Étape 1 sur 5</span><b class="jj-t">Demande ton numéro NEPH</b>
      <p>C’est ton numéro de candidat : sans lui, aucun centre ne peut t’inscrire. Gratuit, en ligne, ${NEPH_SEMAINES[0]} à ${NEPH_SEMAINES[1]} semaines d’attente. Lance la demande maintenant, tu révises pendant ce temps.</p>
    </div>`;
  }
  const pct = readiness();
  return `<div class="jj-hero${et === 'reserver' ? ' pret' : ''}">
      <span class="jj-k">${et === 'reserver' ? 'Tu es prêt' : 'Ton niveau'}</span><b class="jj-t">${et === 'reserver' ? 'Tu peux réserver' : `Prêt à ${pct}&nbsp;%`}</b>
      <p>${fr(n.conseil)}</p>
      ${et === 'reserver' ? '' : `<div class="jj-bar"><i style="width:${pct}%"></i></div>`}
    </div>`;
}
const cap = s => s[0].toUpperCase() + s.slice(1);

/* ---------- les étapes ---------- */
let ouverte = null;   // l'étape dépliée à la main ; sinon celle où en est l'élève
const ORDRE = ['neph', 'niveau', 'reserver', 'session', 'sac'];
const courante = et => ({ neph: 'neph', niveau: 'niveau', reserver: 'reserver', attente: 'sac', jourj: 'sac', resultat: 'session', reussi: null, rate: 'reserver' }[et]);

function etapeHTML(id, num, titre, etat, sous, corps, open) {
  return `<section class="jj-step ${etat}${open ? ' open' : ''}" data-step="${id}">
    <button class="jj-sh" data-jj-open="${id}" aria-expanded="${open}"><span class="jj-n num">${etat === 'done' ? I.ok : num}</span><span class="jj-st"><b>${titre}</b><small>${sous}</small></span><span class="jj-chev">${I.chev}</span></button>
    ${open ? `<div class="jj-in">${corps}</div>` : ''}
  </section>`;
}

const pas = (items, cls = '') => `<ol class="jj-how${cls}">${items.map(([t, d]) => `<li><b>${t}</b>${d ? `<span>${d}</span>` : ''}</li>`).join('')}</ol>`;
const coche = (attr, k, on, t, d) => `<li><button role="checkbox" aria-checked="${!!on}" ${attr}="${k}"><i>${I.ok}</i><span><b>${t}</b><small>${d}</small></span></button></li>`;
const plis = (t, corps) => `<details class="jj-autres jj-faq"><summary>${t}</summary><div>${corps}</div></details>`;

function nephHTML(e) {
  const seg = `<div class="rf-seg jj-seg3" role="radiogroup" aria-label="Où en est ton numéro NEPH">${[['non', 'Pas encore'], ['attente', 'Demandé'], ['oui', 'Je l’ai']].map(([v, l]) => `<button type="button" role="radio" data-neph="${v}" aria-checked="${e.neph === v}">${l}</button>`).join('')}</div>`;
  const def = '<p class="jj-def"><b>NEPH</b> = ton numéro de candidat au permis. 12 chiffres : il te suit du code jusqu’à la conduite.</p>';
  const perdu = plis('NEPH perdu, ou vieux de plus de 5 ans ?', `<p class="jj-note">Pas besoin de tout refaire. Un téléservice officiel te renvoie une attestation avec ton numéro, ou le réactive s’il est trop ancien. Ton auto-école peut aussi le faire pour toi.</p>${lien(ANTS, 'Retrouver mon NEPH', 'btn ghost sm')}`);

  if (e.neph === 'oui') return seg + def
    + `<ul class="pg-facts jj-resa"><li><span>Où il est écrit</span><b>sur ton attestation d’inscription au permis</b></li><li><span>Où la retrouver</span><b>dans ton espace France Titres (ANTS)</b></li><li><span>Qui te le demande</span><b>le site de réservation, pas Pare-Brise</b></li></ul>
      <p class="jj-note">Garde-le sous la main avec ta pièce d’identité : le centre vérifie que ton nom et ta date de naissance correspondent.</p>`
    + perdu;

  if (e.neph === 'attente') {
    const a = attenteNeph(e.nephLe, today()), t = iso(today());
    const mot = { debut: 'C’est en cours. Rien à faire pour l’instant.', fenetre: 'Il peut arriver d’un jour à l’autre : regarde tes e-mails.', tard: `Plus de ${NEPH_SEMAINES[1]} semaines : ouvre ton espace, un document est peut-être à renvoyer.` }[a ? a.etat : 'debut'];
    return seg + `<div class="jj-wait${a && a.etat === 'tard' ? ' tard' : ''}">
        <label class="jj-wd"><span>Demande envoyée le</span><input type="date" id="jjDemLe" max="${t}" value="${esc(e.nephLe || t)}"></label>
        ${a ? `<div class="jj-wbar" aria-hidden="true"><i style="width:${Math.max(4, Math.round(a.part * 100))}%"></i><u style="left:${Math.round(NEPH_SEMAINES[0] / NEPH_SEMAINES[1] * 100)}%"></u></div>
        <div class="jj-wl"><span>Envoyée</span><span>${esc(court(a.tot))}</span><span>${esc(court(a.tard))}</span></div>
        <p class="jj-wm"><b>${a.etat === 'tard' ? 'À vérifier' : `Attendu entre le ${esc(court(a.tot))} et le ${esc(court(a.tard))}`}</b>${mot}</p>` : ''}
      </div>`
      + '<b class="jj-h">Ce qui va se passer</b>' + pas([['France Titres te prévient par e-mail', 'Ton attestation d’inscription au permis est alors disponible. Pense à regarder tes indésirables.'], ['Tu ouvres ton espace en ligne', 'Ton NEPH est écrit sur cette attestation.'], ['Tu reviens ici', 'Passe sur « Je l’ai » : l’app t’ouvre la réservation.']])
      + `<p class="jj-note">La fourchette de ${NEPH_SEMAINES[0]} à ${NEPH_SEMAINES[1]} semaines est un repère, pas un engagement de l’administration. France Titres te prévient si un document manque.</p>
      <div class="jj-2"><a class="btn ghost" href="${esc(ANTS)}" target="_blank" rel="noopener">Ma demande${I.ext}</a><button class="btn" data-neph="oui">Je l’ai reçu</button></div>
      <button class="lnk jj-l" data-go="parcours">En attendant, avancer dans mes cours</button>`;
  }

  const liste = docsNeph(e.age), prets = docsPrets(e), tout = prets === liste.length;
  return seg + def
    + `<div class="jj-facts"><div><b class="num">0&nbsp;€</b><span>sur le site officiel</span></div><div><b>En ligne</b><span>sur France Titres (ANTS)</span></div><div><b class="num">${NEPH_SEMAINES[0]} à ${NEPH_SEMAINES[1]}<small>&nbsp;sem.</small></b><span>d’attente, en général</span></div></div>
    <div class="jj-bloc"><div class="jj-bh"><b>Tes documents à préparer</b><span class="num">${prets}/${liste.length}</span></div>
      <div class="jj-ages" role="radiogroup" aria-label="Ton âge">${AGES.map(a => `<button type="button" role="radio" class="chipb sm" data-age="${a.id}" aria-checked="${e.age === a.id}" aria-pressed="${e.age === a.id}">${a.nom}</button>`).join('')}</div>
      ${e.age ? '' : '<p class="jj-note">Choisis ton âge : la liste s’adapte. Voici déjà ce que tout le monde fournit.</p>'}
      <ul class="jj-sac jj-docs">${liste.map(k => coche('data-doc', k, e.docs[k], DOCS[k][0], DOCS[k][1])).join('')}</ul>
      <p class="jj-note">En photo ou scannés, bien lisibles. Tu n’es pas français ? Un justificatif de séjour s’ajoute. L’inscription est ouverte dès ${REGLES.ageMin} ans, ${REGLES.ageMinAac} ans en conduite accompagnée.</p>
    </div>`
    + '<b class="jj-h">La marche à suivre</b>' + pas([['Prépare tes documents', 'Coche-les ci-dessus au fur et à mesure.'], ['Fais ta demande d’inscription au permis', 'Sur le site officiel France Titres (ANTS), depuis ton téléphone ou un ordinateur.'], ['Reçois ton attestation d’inscription', 'Ton NEPH est écrit dessus.']])
    + `<p class="jj-warn">La demande est gratuite sur le site officiel. Des sites privés font payer cette même démarche : vérifie l’adresse, elle finit par <b>ants.gouv.fr</b>.</p>
    ${lien(ANTS, tout ? 'Tout est prêt : faire ma demande' : 'Faire ma demande')}
    <button class="btn ghost" data-neph="attente">C’est envoyé : suivre l’attente</button>`
    + plis('Je suis en auto-école', '<p class="jj-note">Elle peut faire la demande à ta place, avec les mêmes documents. Tu reçois alors un e-mail pour activer toi-même ton compte France Titres.</p>')
    + perdu;
}

function niveauHTML(n) {
  const ex = examens(), d = ex.slice(-2);
  return `<div class="jj-facts"><div><b class="num">${doneCount()}<small>/${COURSES.length}</small></b><span>cours vus</span></div><div><b class="num">${n.reussis}<small>/2</small></b><span>derniers examens réussis</span></div><div><b class="num">${readiness()}<small>&nbsp;%</small></b><span>prêt</span></div></div>
    <p class="jj-p">${fr(n.conseil)}</p>
    ${d.length ? `<p class="jj-note">${d.length > 1 ? 'Tes deux derniers examens' : 'Ton dernier examen'} : ${d.map(x => `${Math.round(x.score / x.total * 40)} sur 40`).join(', puis ')}. Le jour J, il en faut 35.</p>` : '<p class="jj-note">Notre repère : deux examens blancs réussis de suite, à 35 bonnes réponses sur 40 ou plus.</p>'}
    <button class="btn ghost" data-exo="x-exam-blanc">Faire un examen blanc</button>`;
}

function reserverHTML(e) {
  const ok = cpOk(e.cp), p = getPlan(), vise = !e.resa && p && dateOk(p.examen) && p.examen > iso(today()) ? p.examen : null;
  return `${vise ? `<p class="jj-note">Ton planning vise le ${esc(longJour(fromIso(vise)))} : réserve au plus tard le ${esc(longJour(dernierJourPourReserver(vise)))}.</p>` : ''}${e.neph === 'oui' ? '' : '<p class="jj-warn">Il te faut ton numéro NEPH pour valider une réservation. Tu peux déjà regarder les sessions près de chez toi.</p>'}
    <div class="jj-bloc"><div class="jj-bh"><b>Aie sous la main</b><span>quelques minutes</span></div>
      <ul class="jj-need"><li><b>Ton NEPH</b><span>les 12 chiffres de ton attestation</span></li><li><b>Ton nom, ton prénom, ta date de naissance</b><span>écrits comme sur ta pièce d’identité</span></li><li><b>Une adresse e-mail</b><span>ta convocation y arrive</span></li><li><b>Une carte bancaire</b><span>${PRIX}&nbsp;€, le prix fixé par l’État</span></li></ul>
    </div>
    <div class="jj-poste">
      <div class="jj-ph"><span class="jj-logo" aria-hidden="true">LP</span><div><b>La Poste</b><small>Plus de ${fr(REGLES.centresLaPoste.toLocaleString('fr-FR'))} centres d’examen</small></div></div>
      <label class="jj-cp"><span>Ton code postal</span><input id="jjCp" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="75011" value="${esc(e.cp || '')}" aria-describedby="jjCpAide"></label>
      <a class="btn" id="jjPoste" href="${esc(lienLaPoste(e.cp))}" target="_blank" rel="noopener">${ok ? `Sessions près du ${esc(e.cp)}` : 'Voir les sessions La Poste'}${I.ext}</a>
      <p class="jj-note" id="jjCpAide">Le site de La Poste s’ouvre sur les centres autour de chez toi.</p>
    </div>
    <b class="jj-h">Ensuite, sur le site du centre</b>
    ${pas([['Choisis ton centre, ta date, ton heure', ''], ['Crée ton compte et saisis ton NEPH', ''], [`Paie ${PRIX}&nbsp;€ par carte`, ''], ['Ta convocation arrive par e-mail', 'Reviens la noter ici : l’app compte les jours et prépare tes affaires.']], ' serre')}
    <div class="jj-facts"><div><b class="num">${PRIX}&nbsp;€</b><span>par passage, partout</span></div><div><b>La veille</b><span>dernier délai pour réserver</span></div><div><b class="num">${REGLES.moisAvance}<small>&nbsp;mois</small></b><span>à l’avance au maximum</span></div></div>
    ${plis('Changer de date, annuler, repasser', `<ul class="jj-list"><li>À La Poste, tu changes ou tu annules jusqu’à ${REGLES.annulation}. Annulé à temps, c’est remboursé sous ${REGLES.remboursementH}&nbsp;heures, hors week-ends et jours fériés.</li><li>Absent ou en retard le jour J : la session n’est pas remboursée.</li><li>En cas d’échec, tu repaies ${PRIX}&nbsp;€ et tu réserves une nouvelle session dès que tu as ton résultat.</li></ul>`)}
    <details class="jj-autres"><summary>Les autres centres agréés</summary>
      <p class="jj-note">Même épreuve, même prix : choisis le centre le plus proche ou la date qui t’arrange.</p>
      <ul>${OPERATEURS.slice(1).map(o => `<li><a href="${esc(o.url)}" target="_blank" rel="noopener"><span><b>${esc(o.nom)}</b><small>${esc(o.marque)}</small></span>${I.ext}</a></li>`).join('')}</ul>
    </details>
    <button class="btn ghost" data-jj="session">J’ai réservé : noter ma session</button>`;
}

function sessionHTML(e) {
  const r = e.resultat === 'ko' ? null : e.resa, p = getPlan();
  if (!r) return '<p class="jj-p">Une fois ta place réservée, note-la ici : l’app compte les jours, prévient ton planning et prépare tes affaires.</p><button class="btn" data-jj="session">Noter ma session</button>';
  const fin = p && (p.sessions || []).length ? fromIso(p.sessions[p.sessions.length - 1].d) : null, tard = fin && fin >= fromIso(r.d);
  return `<ul class="pg-facts jj-resa"><li><span>Date</span><b>${esc(cap(quand(r)))}</b></li><li><span>Centre</span><b>${esc(operateur(r.op).nom)}${r.lieu ? ` · ${esc(r.lieu)}` : ''}</b></li><li><span>Changer de date</span><b>depuis ton espace candidat, sur le site du centre</b></li></ul>
    ${p ? (tard ? '<p class="jj-warn">À ton rythme actuel, ton planning se termine après ta session. <button class="lnk" data-go="planning">Adapter mon planning</button></p>' : '<p class="jj-note">Ton planning connaît ton jour J et se termine avant.</p>') : '<p class="jj-note">Crée ton planning : il répartira ce qui reste jusqu’à cette date. <button class="lnk" data-go="planning">Créer mon planning</button></p>'}
    <button class="btn ghost" data-jj="session">Modifier ma session</button>`;
}

const SAC = [
  ['convocation', 'Ma convocation', 'Reçue par e-mail après ta réservation. La Poste l’accepte imprimée ou sur ton téléphone ; ailleurs, imprime-la pour être tranquille.'],
  ['identite', 'Ma pièce d’identité, l’original', 'En cours de validité. Une photocopie est refusée : il faut l’original.'],
  ['trajet', 'Mon trajet, avec de l’avance', 'Arrive 15 minutes avant. Depuis juillet 2026, un candidat en retard n’entre plus.']
];
function sacHTML(e) {
  return `<ul class="jj-sac">${SAC.map(([k, t, s]) => `<li><button role="checkbox" aria-checked="${!!e.sac[k]}" data-sac="${k}"><i>${I.ok}</i><span><b>${t}</b><small>${s}</small></span></button></li>`).join('')}</ul>
    <div class="jj-facts"><div><b class="num">40</b><span>questions, sur tablette</span></div><div><b class="num">35</b><span>bonnes réponses pour réussir</span></div><div><b class="num">24<small>&nbsp;h</small></b><span>au plus tôt pour le résultat</span></div></div>`;
}

/* ---------- la feuille « Ma session » ---------- */
function ouvrirSession(apres) {
  const e = getJJ(), r = e.resa || { d: iso(addD(today(), 14)), h: '', lieu: '', op: 'laposte' }, t = iso(today()), max = iso(addD(today(), 365));
  openSheet(`<div class="bs-head"><h2>Ma session</h2><p>Recopie ce qui figure sur ta convocation.</p></div>
    <div class="rf">
      <label class="rf-date"><span>Date</span><input type="date" id="jsD" min="${t}" max="${max}" value="${esc(r.d)}"></label>
      <label class="rf-date"><span>Heure</span><input type="time" id="jsH" value="${esc(r.h || '')}"></label>
      <label class="rf-date jj-txt"><span>Lieu</span><input type="text" id="jsL" maxlength="60" placeholder="Bureau de poste, ville" value="${esc(r.lieu || '')}"></label>
      <div class="rf-q"><b>Centre</b><div class="jj-ops" role="radiogroup" aria-label="Centre d’examen">${OPERATEURS.map(o => `<button type="button" role="radio" class="chipb sm" data-op="${o.id}" aria-checked="${r.op === o.id}" aria-pressed="${r.op === o.id}">${esc(o.nom)}</button>`).join('')}</div></div>
      <p class="rf-warn" id="jsErr" hidden></p>
    </div>
    <div class="bs-btns"><button class="btn" id="jsOk">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>
    ${e.resa ? '<button class="bs-danger" id="jsDel">Supprimer ma session</button>' : ''}`, (sh, close) => {
    let op = r.op;
    $$('[data-op]', sh).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); op = b.dataset.op; $$('[data-op]', sh).forEach(x => { x.setAttribute('aria-checked', x === b); x.setAttribute('aria-pressed', x === b); }); }));
    $('#jsOk', sh).addEventListener('click', () => {
      const d = $('#jsD', sh).value, h = $('#jsH', sh).value, err = $('#jsErr', sh);
      if (!dateOk(d) || d < t) { err.textContent = 'Choisis une date à partir d’aujourd’hui.'; err.hidden = false; return; }
      haptic('ok'); Sound.ui('ok');
      put({ resa: { d, h: heureOk(h) ? h : '', lieu: $('#jsL', sh).value.trim().slice(0, 60), op }, resultat: null, neph: 'oui' });
      if (getPlan()) adaptPlan({ examen: d });   // le planning connaît le jour J
      ouverte = null; close(); apres();
    });
    const del = $('#jsDel', sh);
    if (del) del.addEventListener('click', () => { if (del.dataset.sure) { put({ resa: null, resultat: null, sac: {} }); if (getPlan()) adaptPlan({ examen: null }); ouverte = null; close(); apres(); return; } del.dataset.sure = '1'; del.textContent = 'Toucher encore pour confirmer'; });
  });
}

/* ---------- l'écran ---------- */
export function renderJourJ(frais) {
  const host = $('#jjBody'); if (!host) return;
  if (frais === true) ouverte = null;
  const e = getJJ(), n = niv(), et = etape(e, today(), n.pret), cur = courante(et), open = ouverte || cur;
  const j = joursAvant(e, today());
  const tient = !!e.resa && et !== 'rate';   // après un échec, l'ancienne session ne compte plus : il faut réserver à nouveau
  const faite = { neph: e.neph === 'oui', niveau: n.pret, reserver: tient, session: tient, sac: tient && SAC.every(([k]) => e.sac[k]) };
  const sous = {
    neph: e.neph === 'oui' ? 'Je l’ai' : e.neph === 'attente' ? (dateOk(e.nephLe) ? `Demandé le ${esc(court(fromIso(e.nephLe)))} · en attente` : 'Demande en cours') : `Gratuit · ${docsPrets(e)} sur ${docsNeph(e.age).length} documents prêts`,
    niveau: n.pret ? 'Deux examens réussis de suite' : `Prêt à ${readiness()} %`,
    reserver: tient ? `Réservé · ${esc(operateur(e.resa.op).nom)}` : `${PRIX} €, en ligne, au plus tard la veille`,
    session: tient ? esc(cap(quand(e.resa))) : 'À noter après ta réservation',
    sac: tient && j !== null && j >= 0 ? `${SAC.filter(([k]) => e.sac[k]).length} sur 3 prêtes` : 'Convocation, pièce d’identité, trajet'
  };
  const titres = { neph: 'Mon numéro NEPH', niveau: 'Mon niveau', reserver: 'Réserver ma place', session: 'Ma session', sac: 'Mes affaires du jour J' };
  const corps = { neph: () => nephHTML(e), niveau: () => niveauHTML(n), reserver: () => reserverHTML(e), session: () => sessionHTML(e), sac: () => sacHTML(e) };
  host.innerHTML = heroHTML(e, et, n)
    + `<div class="jj-steps">${ORDRE.map((id, k) => etapeHTML(id, k + 1, titres[id], faite[id] ? 'done' : id === cur ? 'now' : 'todo', sous[id], open === id ? corps[id]() : '', open === id)).join('')}</div>`
    + `<p class="small">L’épreuve se passe dans un centre agréé par l’État. La réservation et le paiement se font sur le site du centre : Pare-Brise n’encaisse rien et ne conserve pas ton numéro NEPH.</p>`;
  bind(host);
  refreshJJBadge();
}

function bind(host) {
  const redo = () => renderJourJ();
  $$('[data-jj-open]', host).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); const id = b.dataset.jjOpen, deja = b.getAttribute('aria-expanded') === 'true'; ouverte = deja ? '-' : id; redo(); if (!deja) requestAnimationFrame(() => { const s = $(`[data-step="${id}"]`, host); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); }));
  $$('[data-neph]', host).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); const v = b.dataset.neph, e = getJJ(); put({ neph: v, nephLe: v === 'attente' ? (e.neph === 'attente' && e.nephLe) || iso(today()) : null }); ouverte = v === 'oui' ? null : 'neph'; redo(); }));
  $$('[data-age]', host).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); const v = b.dataset.age; put({ age: getJJ().age === v || !ageOk(v) ? null : v }); ouverte = 'neph'; redo(); }));
  $$('[data-doc]', host).forEach(b => b.addEventListener('click', () => { const e = getJJ(), k = b.dataset.doc; e.docs[k] = !e.docs[k]; haptic(e.docs[k] ? 'ok' : undefined); Sound.ui(e.docs[k] ? 'ok' : 'tick'); put({ docs: e.docs }); ouverte = 'neph'; redo(); }));
  const le = $('#jjDemLe', host);
  if (le) le.addEventListener('change', () => { const v = le.value, t = iso(today()); if (dateOk(v) && v <= t) { put({ nephLe: v }); ouverte = 'neph'; redo(); } else le.value = getJJ().nephLe || t; });
  $$('[data-sac]', host).forEach(b => b.addEventListener('click', () => { const e = getJJ(), k = b.dataset.sac; e.sac[k] = !e.sac[k]; haptic(e.sac[k] ? 'ok' : undefined); Sound.ui(e.sac[k] ? 'ok' : 'tick'); put({ sac: e.sac }); ouverte = 'sac'; redo(); }));
  $$('[data-jj]', host).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.jj; haptic(); Sound.ui('tap');
    if (a === 'session') return ouvrirSession(redo);
    if (a === 'ok') put({ resultat: 'ok' });
    else if (a === 'ko') put({ resultat: 'ko' });
    else if (a === 'encore') { put({ resa: null, resultat: null, sac: {} }); if (getPlan()) adaptPlan({ examen: null }); ouverte = 'reserver'; }
    else if (a === 'raz') { put({ resa: null, resultat: null, sac: {} }); if (getPlan()) adaptPlan({ examen: null }); }
    redo();
  }));
  // le code postal : gardé pour la prochaine fois, et le bouton pointe sur la commune dès qu'il est complet
  const cp = $('#jjCp', host), go = $('#jjPoste', host);
  if (cp && go) cp.addEventListener('input', () => {
    cp.value = cp.value.replace(/\D/g, '').slice(0, 5);
    const ok = cpOk(cp.value); if (ok || !cp.value) put({ cp: cp.value });
    go.href = lienLaPoste(cp.value);
    go.firstChild.textContent = ok ? `Sessions près du ${cp.value}` : 'Voir les sessions La Poste';
  });
}

/* l'onglet compte les jours : son nom devient « J-12 », puis « Jour J », tant qu'une session est à venir */
export function refreshJJBadge() {
  const el = $('#jjTab'); if (!el) return;
  const t = badge(getJJ(), today());
  el.textContent = t || 'Réserver'; el.classList.toggle('num', !!t);
  el.parentElement.classList.toggle('compte', !!t);
  el.parentElement.setAttribute('aria-label', t ? `Réserver, ${t === 'Jour J' ? 'c’est aujourd’hui' : `examen dans ${t.slice(2)} jour${t === 'J-1' ? '' : 's'}`}` : 'Réserver');
}

/* la ligne de l'accueil, sous « Prêt pour l'examen » */
export function accueilJJ() {
  const e = getJJ(), n = niv(), et = etape(e, today(), n.pret), j = joursAvant(e, today());
  if (et === 'attente') return `Jour J dans ${j} jour${j > 1 ? 's' : ''} · voir ma session →`;
  if (et === 'jourj') return 'C’est aujourd’hui · mes affaires du jour J →';
  if (et === 'resultat') return 'Alors, ce code ? Note ton résultat →';
  if (et === 'reussi') return 'Code en poche · voir →';
  if (et === 'neph') return 'Demander mon numéro NEPH →';
  return et === 'reserver' ? 'Tu es prêt : réserver mon examen →' : 'Réserver mon examen →';
}

export function setupJourJ() {
  document.addEventListener('pb:ecran', refreshJJBadge);
  refreshJJBadge();
}
