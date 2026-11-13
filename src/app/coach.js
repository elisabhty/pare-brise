/* Plot, ton moniteur, dans toute l'app : le conseil du moment à l'accueil, un mot sur les onglets quand il a quelque chose
   d'utile à dire, la fête aux étapes clés, et un petit rappel de cours quand on le touche.
   Ce qu'il dit vient de coach-core.js (testé) ; ici, on lit l'état de l'élève et on l'affiche. */
import { $, $$, esc, fr, haptic, store } from './util.js';
import { Sound } from './sound.js';
import { plot, react } from './mascot.js';
import { sign } from './signs.js';
import { COURSES, courseNumber } from './content.js';
import { courseState, doneCount, toReview, nextCourse } from './progress.js';
import { streak, best as record, activeToday, lastActive } from './streak.js';
import { todayInfo, openSheet, openAdapt } from './planning.js';
import { lastDay } from './planning-core.js';
import { getJJ, niveauActuel } from './jourj.js';
import { etape, joursAvant, attenteNeph } from './jourj-core.js';
import { practiceOf, best as exoBest } from './exos.js';
import { Serie } from './serie.js';
import { currentScreen } from './nav.js';
import { today, iso, fromIso, diffD } from './dates.js';
import { getProfil } from './profil.js';
import { conseil, conseilEcran, aFeter, atteints } from './coach-core.js';

let cfg = { minutes: () => 5 };

/* ---------- l'état de l'élève, tel que Plot le voit ---------- */
export function etat() {
  const t = today(), p = getProfil() || {}, e = getJJ(), n = niveauActuel(), c = nextCourse(), st = courseState(c.id);
  const i = todayInfo(), fin = i && lastDay(i.plan);
  const blancs = store.get('blancs', []) || [], der = blancs.length ? blancs[blancs.length - 1] : null;
  const vus = COURSES.filter(x => courseState(x.id).done);
  const pr = vus.map(x => practiceOf(x.id)).find(x => x && !exoBest(x.id));
  const der0 = lastActive(), actif = activeToday();
  const nSc = c.scenes.length, enCours = st.scene > 0 && !st.done;
  const a = e.neph === 'attente' ? attenteNeph(e.nephLe, t) : null;
  return {
    prenom: p.prenom || '',
    heure: typeof window !== 'undefined' && window.__hour !== undefined ? window.__hour : new Date().getHours(),
    jour: Math.floor(t.getTime() / 86400000),
    serie: streak(), record: record(), actifAuj: actif,
    absence: actif ? 0 : der0 ? diffD(fromIso(der0), t) : null,
    coursVus: doneCount(), coursTotal: COURSES.length,
    prochain: { id: c.id, num: courseNumber(c), titre: c.titre, min: cfg.minutes(c), enCours, chapitre: enCours ? ((c.scenes[Math.min(st.scene, nSc - 1)] || {}).ch || 0) + 1 : 1, nCh: (c.chapitres || []).length || 1 },
    revoir: toReview().length,
    pratique: pr ? { id: pr.id, num: courseNumber(COURSES.find(x => practiceOf(x.id) === pr)) } : null,
    plan: i ? { reste: i.reste.length, late: i.late.length, seanceFaite: !!i.s && !i.reste.length, libre: !i.s, fin: fin ? iso(fin) : null, examen: i.plan.examen || null } : null,
    pret: n.pret, reussis: n.reussis,
    dernierBlanc: der ? Math.round(der.score / 100 * 40) : null, blancs: blancs.length, blancReussi: blancs.some(b => b.score >= 87.5),
    jj: { etape: etape(e, t, n.pret), j: joursAvant(e, t), neph: e.neph, attente: a ? a.etat : null, resa: !!e.resa, resultat: e.resultat }
  };
}

/* ---------- la bulle de Plot ---------- */
const actionHTML = a => {
  if (!a) return '';
  const attr = a.go ? `data-go="${esc(a.go)}"${a.arg ? ` data-arg="${esc(a.arg)}"` : ''}` : a.exo ? `data-exo="${esc(a.exo)}"` : a.revoir ? 'data-coach="revoir"' : a.adapter ? 'data-coach="adapter"' : '';
  return `<button class="coach-a" ${attr}>${esc(a.label)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`;
};
/* l'expression de Plot selon ce qu'il dit (son image si elle existe, sinon le sprite) */
const POSES = {
  jourj: 'joie', resultat: 'pensif', reussi: 'trophee', rate: 'decu', 'j-moins': 'pouce', retour: 'coucou', serie: 'inquiet',
  retard: 'pensif', rythme: 'inquiet', fait: 'pouce', revoir: 'pensif', reserver: 'joie', pret: 'joie', neph: 'pensif',
  'neph-tard': 'inquiet', blanc: 'pouce', pratique: 'pensif', planning: 'pensif', cours: 'coucou', repere: 'pensif', rien: 'coucou'
};
export const poseDe = id => POSES[id] || '';
export const bulleHTML = (c, { petit = false, invite = false } = {}) => `<div class="coach${petit ? ' petit' : ''}" data-id="${esc(c.id)}">
    <button class="coach-p" aria-label="Plot, ton moniteur : toucher pour un petit rappel de cours">${plot({ size: petit ? 50 : 70, mood: c.humeur, pose: poseDe(c.id), bubble: invite ? 'Touche-moi' : '' })}</button>
    <div class="coach-b" aria-live="polite"><span class="coach-k">${petit ? 'Plot' : 'Plot, ton moniteur'}</span><p class="coach-t">${fr(c.texte)}</p>${actionHTML(c.action)}</div>
  </div>`;

/* ---------- toucher Plot : un rappel tiré des fiches mémo des cours déjà vus ---------- */
let rang = null;
function rappels() {
  const vus = COURSES.filter(c => courseState(c.id).done), base = vus.length ? vus : [nextCourse()];
  return base.flatMap(c => (c.memo || []).map(m => ({ c, m })));
}
function rappel(host) {
  const l = rappels(); if (!l.length) return;
  if (rang === null) rang = Math.floor(today().getTime() / 86400000) * 7;
  const { c, m } = l[rang++ % l.length], b = $('.coach-b', host);
  b.innerHTML = `<span class="coach-k">Petit rappel · Cours ${courseNumber(c)}</span><div class="coach-r">${m.panneau ? `<span class="coach-sg">${sign(m.panneau)}</span>` : ''}<p><b>${fr(m.texte)}</b>${m.tag ? `<span>${fr(m.tag)}</span>` : ''}</p></div><span class="coach-h">Touche Plot pour un autre rappel</span>`;
  host.classList.add('rappel');
  const inv = $('.bubble', host); if (inv) inv.remove();
  if (!store.get('plotTouche', false)) store.set('plotTouche', true);
  haptic(); Sound.ui('tick'); react(host, true);
}

function lier(root, apres) {
  $$('.coach', root).forEach(h => {
    $('.coach-p', h).addEventListener('click', () => rappel(h));
    $$('[data-coach]', h).forEach(b => b.addEventListener('click', () => {
      haptic(); Sound.ui('tap');
      if (b.dataset.coach === 'revoir') { const ids = toReview().slice(0, 15); if (ids.length) Serie.start({ titre: 'À revoir', ids, mode: 'entrainement', retour: currentScreen() === 'entrainer' ? 'examen' : (currentScreen() || 'salle') }); }
      if (b.dataset.coach === 'adapter') openAdapt(apres);
    }));
  });
}

/* l'accueil : Plot parle toujours, une phrase à la fois */
export function renderCoachAccueil(apres) {
  const host = $('#homeCoach'); if (!host) return;
  host.innerHTML = bulleHTML(conseil(etat()), { invite: !store.get('plotTouche', false) });
  lier(host, apres);
}
/* un onglet : Plot ne parle que s'il a quelque chose d'utile à ajouter */
export function renderCoachEcran(ecran, hostSel, apres) {
  const host = $(hostSel); if (!host) return;
  const c = conseilEcran(ecran, etat());
  host.hidden = !c; host.innerHTML = c ? bulleHTML(c, { petit: true }) : '';
  if (c) lier(host, apres);
}

/* ---------- la fête aux étapes clés ---------- */
const ONGLETS = ['salle', 'parcours', 'entrainer', 'planning', 'jourj'];
const CONFETTIS = ['#0A66FF', '#FF7A1A', '#1A9E54', '#FFD400', '#E5484D', '#7C5CFF'];
export function feter() {
  const ov = $('#sheetOv');
  if (!ONGLETS.includes(currentScreen()) || !ov || !ov.hidden || ov.classList.contains('on')) return;   // jamais par-dessus une autre feuille
  const s = etat(), deja = store.get('plotFetes', []) || [], j = aFeter(s, deja);
  if (!j) return;
  store.set('plotFetes', deja.concat(j.id));
  const conf = Array.from({ length: 18 }, (_, k) => `<i style="--x:${(k * 37) % 100}%;--d:${(k % 6) * 0.12}s;--c:${CONFETTIS[k % CONFETTIS.length]};--r:${(k * 47) % 360}deg"></i>`).join('');
  const a = j.action;
  openSheet(`<div class="fete"><div class="fete-conf" aria-hidden="true">${conf}</div>
      <div class="fete-p">${plot({ size: 128, mood: 'loop', pose: j.id === 'code' || j.id === 'cours-tous' || j.id === 'serie-30' ? 'trophee' : 'joie' })}</div>
      <h2>${fr(j.titre)}</h2><p>${fr(j.texte(s.prenom))}</p>
      <div class="bs-btns">${a ? `<button class="btn" data-close ${a.go ? `data-go="${esc(a.go)}"` : `data-exo="${esc(a.exo)}"`}>${esc(a.label)}</button>` : ''}<button class="btn${a ? ' ghost' : ''}" data-close>${a ? 'Plus tard' : 'Merci Plot !'}</button></div>
    </div>`, sh => {
    haptic('ok'); Sound.ui('ok');
    setTimeout(() => react(sh, true), 380);
  });
}
const plusTard = () => setTimeout(feter, 650);

export function setupCoach(o = {}) {
  cfg = Object.assign(cfg, o);
  // à la première version qui connaît les fêtes, ce qui est déjà acquis ne se fête pas une seconde fois
  if (store.get('plotFetes', null) === null) store.set('plotFetes', atteints(etat()));
  document.addEventListener('pb:ecran', plusTard);
  document.addEventListener('pb:jj', plusTard);
  // le planning se redessine seul (Replacer, Adapter) : le mot de Plot suit
  document.addEventListener('pb:planning', () => { if (currentScreen() === 'planning') renderCoachEcran('planning', '#plCoach', () => document.dispatchEvent(new CustomEvent('pb:replanifie'))); });
}
