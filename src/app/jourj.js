/* Onglet « Mon examen » : le vrai examen, de la demande du numéro NEPH au résultat.
   La réservation et le paiement se font chez l'opérateur agréé (La Poste d'abord) : l'app y envoie l'élève au bon endroit,
   puis garde sa session (compte à rebours, planning, affaires du jour J). Elle n'encaisse rien et ne demande pas le NEPH. */
import { $, $$, esc, fr, haptic, store } from './util.js';
import { Sound } from './sound.js';
import { iso, fromIso, today, addD, longJour, court } from './dates.js';
import { COURSES } from './content.js';
import { doneCount, exams, readiness, toReview } from './progress.js';
import { getPlan, adaptPlan, openSheet } from './planning.js';
import { plot } from './mascot.js';
import { hasImg, imgTag, plotImg } from './images.js';
import { lire, PRIX, OPERATEURS, operateur, ANTS, AGES, DOCS, ageOk, docsNeph, docsPrets, NEPH_SEMAINES, attenteNeph, REGLES, cpOk, lienLaPoste, heureOk, dateOk, heureFr, joursAvant, dernierJourPourReserver, etape, niveau, badge } from './jourj-core.js';

export const getJJ = () => lire(store.get('jourj', null));
const put = patch => { const e = Object.assign(getJJ(), patch); store.set('jourj', e); refreshJJBadge(); try { document.dispatchEvent(new CustomEvent('pb:jj')); } catch (x) {} return e; };

/* tous les examens faits dans l'app, du plus ancien au plus récent : examens blancs (en %) et examens rapides */
const examens = () => (store.get('blancs', []) || []).map(b => ({ t: b.t, score: b.score, total: 100 }))
  .concat(exams().map(x => ({ t: x.t, score: x.score, total: x.total }))).sort((a, b) => a.t - b.t);
const niv = () => niveau({ examens: examens(), coursVus: doneCount(), coursTotal: COURSES.length });
export const niveauActuel = niv;

const I = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5.5 12.5 4.2 4.2 8.8-9.4"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5h5v5M19 5l-8 8M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
};
const lien = (url, label, cls = 'btn') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}${I.ext}</a>`;
const quand = r => `${longJour(fromIso(r.d))}${heureOk(r.h) ? ` à\u00a0${heureFr(r.h)}` : ''}`;

/* ---------- l'écran : une grande carte « où j'en suis » (image, une ligne, un bouton) et les 4 étapes ----------
   Presque pas de texte sur la page : le détail de chaque étape s'ouvre dans une feuille, au toucher. */
const cap = s => s[0].toUpperCase() + s.slice(1);
const ETAPES = [['neph', 'Mon numéro NEPH'], ['niveau', 'Être prêt'], ['reserver', 'Réserver ma place'], ['jourj', 'Le jour J']];
const courante = et => ({ neph: 'neph', niveau: 'niveau', reserver: 'reserver', attente: 'jourj', jourj: 'jourj', resultat: 'jourj', reussi: null, rate: 'reserver' }[et]);
const numEtape = et => ({ neph: 1, niveau: 2, reserver: 3, rate: 3 }[et] || 4);

/* l'illustration de la carte : l'image générée si elle existe, sinon Plot dans la bonne humeur */
const visuel = (img, humeur, mood) => `<div class="jx-vis${hasImg(img) ? ' img' : ''}">${imgTag(img, 'jx-img') || (plotImg(humeur) ? imgTag(plotImg(humeur), 'jx-plot') : plot({ size: 112, mood }))}</div>`;
const heroCard = ({ img, humeur, mood, ton = '', k, t, s, extra = '', btns = '' }) => `<div class="jx-hero ${ton}">${visuel(img, humeur, mood)}
    <div class="jx-txt">${k ? `<span class="jx-k">${k}</span>` : ''}<b class="jx-t">${t}</b>${s ? `<span class="jx-s">${s}</span>` : ''}</div>${extra}${btns ? `<div class="jx-btns">${btns}</div>` : ''}</div>`;
const barre = pct => `<div class="jx-bar" aria-hidden="true"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></div>`;

function heroHTML(e, et, n) {
  const r = e.resa, j = joursAvant(e, today()), op = r ? operateur(r.op) : OPERATEURS[0], k = `Étape ${numEtape(et)} sur 4`;
  if (et === 'attente' || et === 'jourj') {
    const prets = SAC.filter(([x]) => e.sac[x]).length;
    return `<div class="jx-hero compte${et === 'jourj' ? ' auj' : ''}">
      <div class="jx-count"><b class="num">${et === 'jourj' ? 'Jour J' : `J-${j}`}</b><div><strong>${esc(cap(quand(r)))}</strong><span>${esc(op.nom)}${r.lieu ? ` · ${esc(r.lieu)}` : ''}</span></div></div>
      <span class="jx-s">${et === 'jourj' ? 'Arrive 15 minutes avant. Tu vas assurer !' : prets === 3 ? 'Tes affaires sont prêtes.' : `Tes affaires : ${prets} sur 3 prêtes.`}</span>
      <div class="jx-btns"><button class="btn" data-jx="jourj">Mes affaires</button>${lien(op.url, 'Convocation', 'btn ghost')}</div></div>`;
  }
  if (et === 'resultat') return heroCard({ humeur: 'pensif', k: `Session du ${esc(court(fromIso(r.d)))}`, t: 'Alors, ce code ?', s: 'Le résultat arrive par e-mail, en général 24 à 72 heures après.', btns: '<button class="btn" data-jj="ok">Je l’ai !</button><button class="btn ghost" data-jj="ko">Pas cette fois</button>' });
  if (et === 'reussi') return heroCard({ img: 'e4', humeur: 'trophee', mood: 'loop', ton: 'vert', k: 'Résultat favorable', t: 'Code en poche !', s: 'Garde ton NEPH : il te suit jusqu’à la conduite.', btns: '<button class="btn ghost" data-jj="raz">Effacer cette session</button>' });
  if (et === 'rate') return heroCard({ humeur: 'decu', ton: 'orange', k, t: 'On y retourne', s: 'Revois tes erreurs, puis réserve une nouvelle session.', btns: `${toReview().length ? '<button class="btn ghost" data-go="entrainer">Mes erreurs</button>' : ''}<button class="btn" data-jj="encore">Nouvelle session</button>` });
  if (et === 'neph') {
    const a = e.neph === 'attente' ? attenteNeph(e.nephLe, today()) : null;
    if (a && a.etat === 'tard') return heroCard({ img: 'e1', humeur: 'inquiet', ton: 'orange', k, t: 'Regarde ta demande', s: `Plus de ${NEPH_SEMAINES[1]} semaines : un document manque peut-être.`, btns: `${lien(ANTS, 'Ma demande')}<button class="btn ghost" data-neph="oui">Je l’ai reçu</button>` });
    if (a) return heroCard({ img: 'e1', humeur: 'pensif', k, t: 'Ton NEPH arrive', s: `Attendu entre le ${esc(court(a.tot))} et le ${esc(court(a.tard))}`, extra: barre(a.part * 100), btns: `<button class="btn" data-neph="oui">Je l’ai reçu</button><button class="btn ghost" data-jx="neph">Ma demande</button>` });
    return heroCard({ img: 'e1', humeur: 'coucou', k, t: 'Demande ton NEPH', s: `Ton numéro de candidat. Gratuit, ${NEPH_SEMAINES[0]} à ${NEPH_SEMAINES[1]} semaines d’attente.`, btns: '<button class="btn" data-jx="neph">Faire ma demande</button>' });
  }
  if (et === 'reserver') return heroCard({ img: 'e3', humeur: 'joie', mood: 'cheer', ton: 'vert', k, t: 'Tu es prêt !', s: `Réserve ta place : ${PRIX} €, en ligne.`, btns: '<button class="btn" data-jx="reserver">Réserver ma place</button>' });
  const pct = readiness(), reste = COURSES.length - doneCount();
  return heroCard({ img: 'e2', humeur: 'pouce', k, t: `Prêt à ${pct} %`, s: reste > 0 ? `Encore ${reste} cours, puis 2 examens blancs réussis.` : n.reussis ? 'Encore 1 examen blanc réussi.' : '2 examens blancs de suite à 35 sur 40.', extra: barre(pct), btns: reste > 0 ? '<button class="btn" data-go="parcours">Continuer mes cours</button>' : '<button class="btn" data-exo="x-exam-blanc">Faire un examen blanc</button>' });
}

/* une ligne par étape : numéro (ou coche), titre, où j'en suis ; le toucher ouvre son détail */
function lignesHTML(e, et, n) {
  const tient = !!e.resa && et !== 'rate', j = joursAvant(e, today()), cur = courante(et);
  const faite = { neph: e.neph === 'oui', niveau: n.pret, reserver: tient, jourj: et === 'reussi' };
  const sous = {
    neph: e.neph === 'oui' ? 'Je l’ai' : e.neph === 'attente' ? (dateOk(e.nephLe) ? `Demandé le ${esc(court(fromIso(e.nephLe)))}` : 'Demandé') : 'Gratuit, à demander d’abord',
    niveau: n.pret ? 'Prêt' : `${readiness()} %`,
    reserver: tient ? `${esc(operateur(e.resa.op).nom)} · ${esc(court(fromIso(e.resa.d)))}` : `${PRIX} €, en ligne`,
    jourj: et === 'reussi' ? 'Réussi' : tient && j !== null && j >= 0 ? `${j ? `J-${j}` : 'Aujourd’hui'} · affaires ${SAC.filter(([x]) => e.sac[x]).length}/3` : tient ? 'Résultat à noter' : 'Après ta réservation'
  };
  return `<ol class="jx-steps">${ETAPES.map(([id, t], k) => { const st = faite[id] ? 'done' : id === cur ? 'now' : 'todo';
    return `<li class="${st}"><button data-jx="${id}"><span class="jx-n num">${st === 'done' ? I.ok : k + 1}</span><span class="jx-st"><b>${t}</b><small>${sous[id]}</small></span><span class="jx-chev">${I.chev}</span></button></li>`; }).join('')}</ol>`;
}

/* ---------- les feuilles de détail ---------- */
const pas = items => `<ol class="jj-how serre">${items.map(([t, d]) => `<li><b>${t}</b>${d ? `<span>${d}</span>` : ''}</li>`).join('')}</ol>`;
const coche = (attr, k, on, t, d) => `<li><button role="checkbox" aria-checked="${!!on}" ${attr}="${k}"><i>${I.ok}</i><span><b>${t}</b>${d ? `<small>${d}</small>` : ''}</span></button></li>`;
const plis = (t, corps) => `<details class="jj-autres jj-faq"><summary>${t}</summary><div>${corps}</div></details>`;
const tete = (t, s) => `<div class="bs-head"><h2>${t}</h2>${s ? `<p>${s}</p>` : ''}</div>`;

function nephHTML(e) {
  const seg = `<div class="rf-seg jj-seg3" role="radiogroup" aria-label="Où en est ton numéro NEPH">${[['non', 'Pas encore'], ['attente', 'Demandé'], ['oui', 'Je l’ai']].map(([v, l]) => `<button type="button" role="radio" data-neph="${v}" aria-checked="${e.neph === v}">${l}</button>`).join('')}</div>`;
  const perdu = plis('NEPH perdu, ou vieux de plus de 5 ans ?', `<p class="jj-note">Un téléservice officiel te renvoie ton numéro, ou le réactive. Ton auto-école peut aussi le faire.</p>${lien(ANTS, 'Retrouver mon NEPH', 'btn ghost sm')}`);
  if (e.neph === 'oui') return tete('Mon numéro NEPH', '12 chiffres, sur ton attestation d’inscription au permis.') + seg
    + '<p class="jj-note">Garde-le avec ta pièce d’identité : le site de réservation te le demandera.</p>' + perdu;
  if (e.neph === 'attente') {
    const a = attenteNeph(e.nephLe, today()), t = iso(today());
    return tete('Mon numéro NEPH', 'Ta demande est partie.') + seg + `<div class="jj-wait${a && a.etat === 'tard' ? ' tard' : ''}">
        <label class="jj-wd"><span>Envoyée le</span><input type="date" id="jjDemLe" max="${t}" value="${esc(e.nephLe || t)}"></label>
        ${a ? `<div class="jj-wbar" aria-hidden="true"><i style="width:${Math.max(4, Math.round(a.part * 100))}%"></i><u style="left:${Math.round(NEPH_SEMAINES[0] / NEPH_SEMAINES[1] * 100)}%"></u></div>
        <div class="jj-wl"><span>Envoyée</span><span>${esc(court(a.tot))}</span><span>${esc(court(a.tard))}</span></div>` : ''}
      </div>
      <p class="jj-note">France Titres te prévient par e-mail (regarde tes indésirables). ${NEPH_SEMAINES[0]} à ${NEPH_SEMAINES[1]} semaines, c’est un repère, pas un engagement de l’administration.</p>
      <div class="jj-2">${lien(ANTS, 'Ma demande', 'btn ghost')}<button class="btn" data-neph="oui">Je l’ai reçu</button></div>`;
  }
  const liste = docsNeph(e.age), prets = docsPrets(e);
  return tete('Demande ton NEPH', 'Gratuit, en ligne, une quinzaine de minutes.') + seg
    + `<div class="jj-bloc"><div class="jj-bh"><b>Tes documents</b><span class="num">${prets}/${liste.length}</span></div>
      <div class="jj-ages" role="radiogroup" aria-label="Ton âge">${AGES.map(a => `<button type="button" role="radio" class="chipb sm" data-age="${a.id}" aria-checked="${e.age === a.id}" aria-pressed="${e.age === a.id}">${a.nom}</button>`).join('')}</div>
      <ul class="jj-sac jj-docs">${liste.map(k => coche('data-doc', k, e.docs[k], DOCS[k][0], DOCS[k][1])).join('')}</ul>
    </div>
    <p class="jj-warn">La demande est gratuite sur le site officiel : son adresse finit par <b>ants.gouv.fr</b>. Des sites privés font payer la même chose.</p>
    ${lien(ANTS, 'Faire ma demande')}
    <button class="btn ghost" data-neph="attente">C’est envoyé</button>`
    + plis('Je suis en auto-école', '<p class="jj-note">Elle peut faire la demande pour toi, avec les mêmes documents.</p>') + perdu;
}

function niveauHTML(n) {
  const d = examens().slice(-2);
  return tete('Être prêt', 'Notre repère : deux examens blancs de suite à 35 sur 40.')
    + `<div class="jj-facts"><div><b class="num">${doneCount()}<small>/${COURSES.length}</small></b><span>cours vus</span></div><div><b class="num">${n.reussis}<small>/2</small></b><span>examens réussis de suite</span></div><div><b class="num">${readiness()}<small>&nbsp;%</small></b><span>prêt</span></div></div>
    ${d.length ? `<p class="jj-note">${d.length > 1 ? 'Tes deux derniers' : 'Ton dernier'} : ${d.map(x => `${Math.round(x.score / x.total * 40)}/40`).join(', puis ')}.</p>` : ''}
    <button class="btn" data-exo="x-exam-blanc" data-close>Faire un examen blanc</button>`;
}

function reserverHTML(e) {
  const ok = cpOk(e.cp), p = getPlan(), vise = !e.resa && p && dateOk(p.examen) && p.examen > iso(today()) ? p.examen : null;
  return tete('Réserver ma place', `${PRIX} €, le même prix partout. Au plus tard la veille.`)
    + `${vise ? `<p class="jj-note">Ton planning vise le ${esc(longJour(fromIso(vise)))} : réserve avant le ${esc(longJour(dernierJourPourReserver(vise)))}.</p>` : ''}${e.neph === 'oui' ? '' : '<p class="jj-warn">Il te faut ton NEPH pour valider. Tu peux déjà regarder les dates.</p>'}
    <div class="jj-poste">
      <div class="jj-ph"><span class="jj-logo" aria-hidden="true">LP</span><div><b>La Poste</b><small>Plus de ${fr(REGLES.centresLaPoste.toLocaleString('fr-FR'))} centres</small></div></div>
      <label class="jj-cp"><span>Ton code postal</span><input id="jjCp" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="75011" value="${esc(e.cp || '')}"></label>
      <a class="btn" id="jjPoste" href="${esc(lienLaPoste(e.cp))}" target="_blank" rel="noopener">${ok ? `Sessions près du ${esc(e.cp)}` : 'Voir les sessions'}${I.ext}</a>
    </div>
    <div class="jj-bloc"><div class="jj-bh"><b>Aie sous la main</b></div>
      <ul class="jj-need"><li><b>Ton NEPH</b></li><li><b>Ton nom, ton prénom, ta date de naissance</b><span>comme sur ta pièce d’identité</span></li><li><b>Une adresse e-mail</b><span>pour ta convocation</span></li><li><b>Une carte bancaire</b></li></ul>
    </div>
    ${plis('Changer, annuler, repasser', `<ul class="jj-list"><li>Changer ou annuler : jusqu’à ${REGLES.annulation}, remboursé sous ${REGLES.remboursementH}&nbsp;h (hors week-ends et jours fériés).</li><li>Absent ou en retard : pas remboursé.</li><li>Raté : ${PRIX}&nbsp;€ de nouveau, et une nouvelle session.</li><li>Réservation jusqu’à ${REGLES.moisAvance} mois à l’avance.</li></ul>`)}
    <details class="jj-autres"><summary>Les autres centres agréés</summary>
      <ul>${OPERATEURS.slice(1).map(o => `<li><a href="${esc(o.url)}" target="_blank" rel="noopener"><span><b>${esc(o.nom)}</b><small>${esc(o.marque)}</small></span>${I.ext}</a></li>`).join('')}</ul>
    </details>
    <button class="btn ghost" data-jj="session">J’ai réservé : noter ma session</button>`;
}

const SAC = [
  ['convocation', 'Ma convocation', 'Pour La Poste, imprimée ou sur ton téléphone ; ailleurs, imprime-la.'],
  ['identite', 'Ma pièce d’identité, l’original', 'En cours de validité. Une photocopie est refusée.'],
  ['trajet', 'Arriver 15 minutes avant', 'Un candidat en retard n’entre pas.']
];
function jourjHTML(e, et) {
  const r = et === 'rate' ? null : e.resa;
  if (!r) return tete('Le jour J', 'Une fois ta place réservée, note-la ici : je compte les jours avec toi.') + '<button class="btn" data-jj="session">Noter ma session</button>';
  return tete(cap(quand(r)), `${esc(operateur(r.op).nom)}${r.lieu ? ` · ${esc(r.lieu)}` : ''}`)
    + `<ul class="jj-sac">${SAC.map(([k, t, s]) => coche('data-sac', k, e.sac[k], t, s)).join('')}</ul>
    <div class="jj-facts"><div><b class="num">40</b><span>questions</span></div><div><b class="num">35</b><span>pour réussir</span></div><div><b class="num">24<small>&nbsp;h</small></b><span>au plus tôt, le résultat</span></div></div>
    <button class="btn ghost" data-jj="session">Modifier ma session</button>`;
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
      close(); apres();
    });
    const del = $('#jsDel', sh);
    if (del) del.addEventListener('click', () => { if (del.dataset.sure) { put({ resa: null, resultat: null, sac: {} }); if (getPlan()) adaptPlan({ examen: null }); close(); apres(); return; } del.dataset.sure = '1'; del.textContent = 'Toucher encore pour confirmer'; });
  });
}

/* ---------- l'écran ---------- */
let feuille = null;   // la feuille de détail ouverte (neph, niveau, reserver, jourj), redessinée à chaque changement
export function renderJourJ() {
  const host = $('#jjBody'); if (!host) return;
  const e = getJJ(), n = niv(), et = etape(e, today(), n.pret);
  host.innerHTML = heroHTML(e, et, n) + lignesHTML(e, et, n)
    + '<p class="small jx-pied">Tu réserves et tu paies sur le site du centre. Pare-Brise n’encaisse rien et ne garde pas ton NEPH.</p>';
  bind(host);
  refreshJJBadge();
}

const CORPS = { neph: e => nephHTML(e), niveau: () => niveauHTML(niv()), reserver: e => reserverHTML(e), jourj: e => jourjHTML(e, etape(e, today(), niv().pret)) };
function ouvrir(id) {
  feuille = id;
  openSheet(`<div class="jx-sheet" data-feuille="${id}">${CORPS[id](getJJ())}</div>`, (sh, close) => {
    const redo = () => { renderJourJ(); const box = $('.jx-sheet', sh); if (box && feuille === id) { box.innerHTML = CORPS[id](getJJ()); bind(box, close); } };
    bind($('.jx-sheet', sh), close, redo);
  });
}

/* les gestes, sur la page comme dans une feuille (root) ; redo redessine la page et, s'il y en a une, la feuille ouverte */
function bind(root, close, redoSheet) {
  if (!root) return;
  const redo = redoSheet || (() => renderJourJ());
  const fini = () => { if (close) close(); feuille = null; renderJourJ(); };
  $$('[data-jx]', root).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tap'); ouvrir(b.dataset.jx); }));
  $$('[data-neph]', root).forEach(b => b.addEventListener('click', () => {
    haptic(); Sound.ui('tick'); const v = b.dataset.neph, e = getJJ();
    put({ neph: v, nephLe: v === 'attente' ? (e.neph === 'attente' && e.nephLe) || iso(today()) : null });
    if (v === 'oui' && b.classList.contains('btn')) fini(); else redo();
  }));
  $$('[data-age]', root).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); const v = b.dataset.age; put({ age: getJJ().age === v || !ageOk(v) ? null : v }); redo(); }));
  $$('[data-doc]', root).forEach(b => b.addEventListener('click', () => { const e = getJJ(), k = b.dataset.doc; e.docs[k] = !e.docs[k]; haptic(e.docs[k] ? 'ok' : undefined); Sound.ui(e.docs[k] ? 'ok' : 'tick'); put({ docs: e.docs }); redo(); }));
  const le = $('#jjDemLe', root);
  if (le) le.addEventListener('change', () => { const v = le.value, t = iso(today()); if (dateOk(v) && v <= t) { put({ nephLe: v }); redo(); } else le.value = getJJ().nephLe || t; });
  $$('[data-sac]', root).forEach(b => b.addEventListener('click', () => { const e = getJJ(), k = b.dataset.sac; e.sac[k] = !e.sac[k]; haptic(e.sac[k] ? 'ok' : undefined); Sound.ui(e.sac[k] ? 'ok' : 'tick'); put({ sac: e.sac }); redo(); }));
  $$('[data-jj]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.jj; haptic(); Sound.ui('tap');
    if (a === 'session') { feuille = null; return ouvrirSession(() => renderJourJ()); }
    if (a === 'ok') put({ resultat: 'ok' });
    else if (a === 'ko') put({ resultat: 'ko' });
    else if (a === 'encore' || a === 'raz') { put({ resa: null, resultat: null, sac: {} }); if (getPlan()) adaptPlan({ examen: null }); }
    renderJourJ();
  }));
  // le code postal : gardé pour la prochaine fois, et le bouton pointe sur la commune dès qu'il est complet
  const cp = $('#jjCp', root), go = $('#jjPoste', root);
  if (cp && go) cp.addEventListener('input', () => {
    cp.value = cp.value.replace(/\D/g, '').slice(0, 5);
    const ok = cpOk(cp.value); if (ok || !cp.value) put({ cp: cp.value });
    go.href = lienLaPoste(cp.value);
    go.firstChild.textContent = ok ? `Sessions près du ${cp.value}` : 'Voir les sessions';
  });
}

/* l'onglet compte les jours : son nom devient « J-12 », puis « Jour J », tant qu'une session est à venir */
export function refreshJJBadge() {
  const el = $('#jjTab'); if (!el) return;
  const t = badge(getJJ(), today());
  el.textContent = t || 'Mon examen'; el.classList.toggle('num', !!t);
  el.parentElement.classList.toggle('compte', !!t);
  el.parentElement.setAttribute('aria-label', t ? `Mon examen, ${t === 'Jour J' ? 'c’est aujourd’hui' : `dans ${t.slice(2)} jour${t === 'J-1' ? '' : 's'}`}` : 'Mon examen');
}

/* la ligne de l'accueil, sous « Prêt pour l'examen » */
export function accueilJJ() {
  const e = getJJ(), n = niv(), et = etape(e, today(), n.pret), j = joursAvant(e, today());
  if (et === 'attente') return `J-${j} · ma session`;
  if (et === 'jourj') return 'C’est aujourd’hui !';
  if (et === 'resultat') return 'Note ton résultat';
  if (et === 'reussi') return 'Code en poche';
  if (et === 'neph') return e.neph === 'attente' ? 'NEPH demandé' : 'Étape 1 : mon NEPH';
  return et === 'reserver' ? 'Tu es prêt : réserver' : 'Étape 2 : être prêt';
}

export function setupJourJ() {
  document.addEventListener('pb:ecran', refreshJJBadge);
  refreshJJBadge();
}
