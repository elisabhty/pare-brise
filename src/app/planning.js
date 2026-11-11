/* Planning : le parcours (cours, séries, exercices 3D, examens blancs) réparti sur les jours choisis, jusqu'au jour J.
   Comme dans Requête : la séance du jour, la semaine (6 jours à partir d'aujourd'hui), l'avancement global, « Adapter mon rythme »,
   les retards à replacer et la bulle de l'onglet (activités restantes aujourd'hui). */
import { $, $$, esc, store, haptic } from './util.js';
import { COURSES, EXOS, SERIES, course, courseNumber } from './content.js';
import { courseState, seriesBest } from './progress.js';
import { iso, fromIso, today, addD, wd, diffD, JL, JC, court, longJour, relJour } from './dates.js';
import { buildOrder, replan, lateItems, sessionOf, lastDay, preview } from './planning-core.js';
import { weekHTML } from './streak.js';
import { Sound } from './sound.js';

/* ---------- les activités ---------- */
/* une leçon, puis sa pratique (les défis 3D restent en accès libre depuis la leçon et l'onglet Exercices) */
const exosOf = c => EXOS.filter(e => e.id === 'p-' + c.id);
let cfg = { minutesCours: () => 3, ouvrir: () => {} };
let ORDER = null;
export const order = () => ORDER || (ORDER = buildOrder(COURSES, {
  seriesOf: () => [], exosOf,
  minCours: c => cfg.minutesCours(c), minSerie: s => Math.max(3, Math.round(s.questions.length * 0.45)), minExo: e => Math.max(3, Math.round((e.situations || []).length * 0.6) + 1)
}));
const minOf = id => (order().find(o => o.id === id) || { min: 0 }).min;
const exoRuns = () => store.get('exoRuns', {}) || {};
const exoBest = id => (store.get('exoBest', {}) || {})[id];

export function isDone(id) {
  const k = id[0], ref = id.slice(2);
  if (k === 'c') return !!courseState(ref).done;
  if (k === 's') return seriesBest(ref) !== undefined;
  if (k === 'x') return !!exoBest(ref);
  if (k === 'b') return (exoRuns()['x-exam-blanc'] || 0) >= +ref;
  return false;
}
const IC = {
  cours: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V5.5Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V5.5Z"/>',
  serie: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  exo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 14.2v6.3M9.9 11.4 4 9.6M14.1 11.4 20 9.6"/>',
  blanc: '<path d="M9 4.5h6M9 4.5A1.5 1.5 0 0 0 7.5 6H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 18 6h-1.5A1.5 1.5 0 0 0 15 4.5"/><path d="m8.5 13 2.3 2.3L15.5 10.5"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
export function meta(id) {
  const k = id[0], ref = id.slice(2), min = minOf(id);
  if (k === 'c') { const c = course(ref); return { kind: 'cours', titre: c ? c.titre : ref, sous: c ? `Cours ${courseNumber(c)} · ${min} min` : '', min }; }
  if (k === 's') { const s = SERIES.get(ref); return { kind: 'serie', titre: s ? s.titre : ref, sous: `Série · ${s ? s.questions.length : ''} questions`, min }; }
  if (k === 'x') { const e = EXOS.find(x => x.id === ref); const pr = e && e.meca === 'examen'; return { kind: 'exo', titre: e ? (pr ? `Pratique : ${e.titre}` : e.titre) : ref, sous: pr ? `${e.situations.length} situations en 3D · ${min} min` : `Défi 3D · ${e ? e.duree : ''}`, min }; }
  return { kind: 'blanc', titre: `Examen blanc n°${ref}`, sous: '40 questions, comme le jour J', min };
}
export function launch(id) {
  haptic(); Sound.ui('tap');
  const k = id[0], ref = id.slice(2);
  cfg.ouvrir(k === 'c' ? 'cours' : k === 's' ? 'serie' : 'exo', k === 'b' ? 'x-exam-blanc' : ref);
}

/* ---------- le plan ---------- */
/* un ancien planning (séries, anciens exercices) est réparti à nouveau sur le parcours actuel, avec les mêmes réglages */
export function getPlan() {
  const p = store.get('plan', null); if (!p) return null;
  const ids = new Set(order().map(o => o.id));
  // un plan fait avant l'ajout de cours (ou d'une pratique) est refait : rien de nouveau ne doit rester hors planning
  const planned = new Set((p.sessions || []).flatMap(s => s.items));
  if ((p.sessions || []).some(s => s.items.some(id => !ids.has(id))) || order().some(o => !planned.has(o.id) && !isDone(o.id))) { const n = replan(Object.assign({}, p, { sessions: [] }), order(), isDone, today()); store.set('plan', n); return n; }
  return p;
}
function savePlan(p) { store.set('plan', p); refreshBadge(); }
export function createPlan({ jours, minutes, examen }) {
  const p = replan({ jours: jours.slice().sort(), minutes, examen: examen || null, cree: Date.now(), sessions: [] }, order(), isDone, today());
  savePlan(p); return p;
}
export function adaptPlan(opts = {}) { const p = getPlan(); if (!p) return null; const n = replan(Object.assign({}, p, opts), order(), isDone, today()); savePlan(n); return n; }
export const deletePlan = () => { store.set('plan', null); refreshBadge(); };
export function stats() {
  const o = order(), done = o.filter(x => isDone(x.id)).length;
  return { done, total: o.length };
}
export function todayInfo() {
  const p = getPlan(); if (!p) return null;
  const t = today(), s = sessionOf(p, t), items = s ? s.items : [];
  const next = (p.sessions || []).find(x => x.d > iso(t) && x.items.some(id => !isDone(id))) || null;
  return { plan: p, s, items, reste: items.filter(id => !isDone(id)), next, late: lateItems(p, isDone, t) };
}
/* la prochaine activité à faire : celle de la séance du jour, sinon de la prochaine séance, sinon du parcours */
export function nextItem() {
  const i = todayInfo();
  if (i) return i.late[0] || i.reste[0] || (i.next && i.next.items.find(id => !isDone(id))) || null;
  const o = order().find(x => !isDone(x.id)); return o ? o.id : null;
}
export function refreshBadge() {
  const b = $('#plBadge'); if (!b) return;
  const i = todayInfo(), n = i ? i.reste.length + i.late.length : 0;
  b.hidden = !i || !n; b.textContent = n > 99 ? '99+' : String(n);
  b.setAttribute('aria-label', n ? `${n} activité${n > 1 ? 's' : ''} à faire aujourd’hui` : '');
}
export const plannedDays = () => new Set(((getPlan() || {}).sessions || []).map(s => s.d));

/* ---------- formulaire « Ton rythme » (onboarding, planning, feuille Adapter) ---------- */
export const MINUTES = [10, 20, 30, 45];
export const draftFrom = p => ({ jours: p ? p.jours.slice() : [0, 1, 3, 4], minutes: p ? p.minutes : 20, examen: p ? p.examen : null, avecDate: !!(p && p.examen) });
export function rythmeHTML(d) {
  const t = iso(today()), max = iso(addD(today(), 365));
  return `<div class="rf">
    <div class="rf-q"><b>Quels jours tu révises&nbsp;?</b><div class="rf-days" role="group" aria-label="Jours de révision">${JL.map((l, i) => `<button type="button" class="rf-day" data-j="${i}" aria-pressed="${d.jours.includes(i)}" aria-label="${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][i]}">${l}</button>`).join('')}</div></div>
    <div class="rf-q"><b>Combien de temps par séance&nbsp;?</b><div class="rf-mins" role="radiogroup" aria-label="Durée d’une séance">${MINUTES.map(m => `<button type="button" role="radio" class="rf-min" data-m="${m}" aria-checked="${d.minutes === m}"><b class="num">${m}</b><span>min</span></button>`).join('')}</div></div>
    <div class="rf-q"><b>Ta date d’examen</b><div class="rf-seg" role="radiogroup" aria-label="Date d’examen"><button type="button" role="radio" data-e="0" aria-checked="${!d.avecDate}">Pas encore fixée</button><button type="button" role="radio" data-e="1" aria-checked="${d.avecDate}">Je la connais</button></div>
      <label class="rf-date"${d.avecDate ? '' : ' hidden'}><span>Le jour J</span><input type="date" id="rfDate" min="${t}" max="${max}" value="${esc(d.examen || '')}"></label></div>
    <div class="rf-prev" id="rfPrev" aria-live="polite">${previewHTML(d)}</div>
  </div>`;
}
export function previewHTML(d) {
  if (!d.jours.length) return '<p class="rf-warn">Choisis au moins un jour.</p>';
  const pv = preview(order(), isDone, d, today());
  if (!pv.activites) return '<p><b>Tout le parcours est fait.</b> Les examens blancs restent dans Examen.</p>';
  let ex = '';
  if (d.avecDate && d.examen) {
    const marge = diffD(pv.fin, fromIso(d.examen));
    ex = marge >= 0 ? `<p class="rf-ok">Prêt ${marge ? `${marge} jour${marge > 1 ? 's' : ''} avant` : 'la veille de'} ton examen.</p>` : `<p class="rf-warn">À ce rythme, tu finis ${-marge} jour${marge < -1 ? 's' : ''} après ton examen : ajoute un jour ou allonge tes séances.</p>`;
  }
  return `<div class="rf-nums"><div><b class="num">${pv.seances}</b><span>séances</span></div><div><b class="num">${pv.activites}</b><span>activités</span></div><div><b>${court(pv.fin)}</b><span>fin prévue</span></div></div>${ex}`;
}
export function bindRythme(root, d, onChange = () => {}) {
  const upd = () => { const p = $('#rfPrev', root); if (p) p.innerHTML = previewHTML(d); onChange(d); };
  $$('.rf-day', root).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); const j = +b.dataset.j; d.jours = d.jours.includes(j) ? d.jours.filter(x => x !== j) : d.jours.concat(j).sort(); b.setAttribute('aria-pressed', d.jours.includes(j)); upd(); }));
  $$('.rf-min', root).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); d.minutes = +b.dataset.m; $$('.rf-min', root).forEach(x => x.setAttribute('aria-checked', x === b)); upd(); }));
  $$('.rf-seg [data-e]', root).forEach(b => b.addEventListener('click', () => {
    haptic(); Sound.ui('tick'); d.avecDate = b.dataset.e === '1'; $$('.rf-seg [data-e]', root).forEach(x => x.setAttribute('aria-checked', x === b));
    const l = $('.rf-date', root); l.hidden = !d.avecDate; const inp = $('#rfDate', root);
    if (d.avecDate && !inp.value) { inp.value = iso(addD(today(), 42)); d.examen = inp.value; }
    upd();
  }));
  const inp = $('#rfDate', root); if (inp) inp.addEventListener('change', () => { d.examen = inp.value || null; upd(); });
}
export const draftOut = d => ({ jours: d.jours, minutes: d.minutes, examen: d.avecDate ? d.examen : null });

/* ---------- feuille (bas de l'écran) ---------- */
export function openSheet(html, bind) {
  const ov = $('#sheetOv'), sh = $('#bsheet');
  sh.innerHTML = `<div class="bs-grab" aria-hidden="true"></div>${html}`;
  ov.hidden = false; requestAnimationFrame(() => ov.classList.add('on'));
  const close = () => { ov.classList.remove('on'); setTimeout(() => { if (!ov.classList.contains('on')) ov.hidden = true; }, 320); };
  ov.onclick = e => { if (e.target === ov) close(); };
  $$('[data-close]', sh).forEach(b => b.addEventListener('click', close));
  if (bind) bind(sh, close);
  return close;
}
export function openAdapt(after) {
  const d = draftFrom(getPlan());
  openSheet(`<div class="bs-head"><h2>Adapter mon rythme</h2><p>Tes activités sont réparties à nouveau à partir d’aujourd’hui, dans l’ordre du parcours.</p></div>${rythmeHTML(d)}
    <div class="bs-btns"><button class="btn" id="rfApply">Appliquer</button><button class="btn ghost" data-close>Annuler</button></div>
    <button class="bs-danger" id="rfDel">Supprimer mon planning</button>`, (sh, close) => {
    bindRythme(sh, d, () => { $('#rfApply', sh).disabled = !d.jours.length; });
    $('#rfApply', sh).addEventListener('click', () => { haptic('ok'); Sound.ui('ok'); adaptPlan(draftOut(d)); close(); after && after(); });
    $('#rfDel', sh).addEventListener('click', () => { if ($('#rfDel', sh).dataset.sure) { deletePlan(); close(); after && after(); return; } $('#rfDel', sh).dataset.sure = '1'; $('#rfDel', sh).textContent = 'Toucher encore pour confirmer'; });
  });
}

/* ---------- lignes d'activité ---------- */
function rowHTML(id, { late = false } = {}) {
  const m = meta(id), ok = isDone(id);
  return `<li><button class="pl-row ${ok ? 'ok' : ''} k-${m.kind}${late && !ok ? ' late' : ''}" data-item="${id}"><span class="pl-ic">${ico(m.kind)}</span><span class="pl-t"><b>${esc(m.titre)}</b><small>${esc(m.sous)}${late && !ok ? ' · en retard' : ''}</small></span><span class="pl-ck" aria-label="${ok ? 'Fait' : 'À faire'}">${ok ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>' : ''}</span></button></li>`;
}
const minsLeft = ids => ids.filter(id => !isDone(id)).reduce((a, id) => a + minOf(id), 0);
document.addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) launch(b.dataset.item); });

/* ---------- carte « Séance du jour » (accueil et planning) ---------- */
export function todayCardHTML({ home = false } = {}) {
  const i = todayInfo();
  if (!i) return '';
  const lateL = i.late.length ? `<button class="pl-late" data-replacer><span>${i.late.length} activité${i.late.length > 1 ? 's' : ''} en retard</span><b>Replacer</b></button>` : '';
  if (i.s && i.reste.length) {
    const tot = i.items.length, faites = tot - i.reste.length, pctv = Math.round(faites / tot * 100);
    const list = i.items.slice(0, home ? 4 : 12);
    return `<div class="tdc">
      <div class="td-top"><span class="eyebrow">Aujourd’hui · ${i.reste.length} à faire · ~${minsLeft(i.items)} min</span>${faites ? `<span class="td-n num">${faites}/${tot}</span>` : ''}</div>
      <div class="td-bar"><i style="width:${pctv}%"></i></div>
      <ul class="pl-list">${list.map(id => rowHTML(id)).join('')}</ul>${home && i.items.length > 4 ? `<button class="more" data-go="planning">Voir les ${i.items.length} activités →</button>` : ''}
      ${lateL}<button class="btn" data-seance>${faites ? 'Continuer la séance' : 'Commencer la séance'}</button></div>`;
  }
  const nx = i.next, nd = nx ? fromIso(nx.d) : null;
  const titre = i.s ? 'Séance terminée' : 'Journée libre', sous = i.s ? `Tes ${i.items.length} activités du jour sont faites.` : 'Rien de prévu aujourd’hui.';
  return `<div class="tdc ${i.s ? 'fini' : 'libre'}">
    <div class="td-top"><span class="eyebrow">Aujourd’hui</span></div>
    <div class="td-rest"><span class="td-ic">${i.s ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>'}</span><div><b>${titre}</b><p>${sous}${nd ? ` Prochaine séance ${relJour(nd).toLowerCase()} : ${nx.items.length} activité${nx.items.length > 1 ? 's' : ''}.` : ''}</p></div></div>
    ${lateL}${nd || i.late.length ? `<button class="btn ${i.late.length ? '' : 'ghost'}" data-seance>${i.late.length ? 'Rattraper mon retard' : 'Prendre de l’avance'}</button>` : ''}</div>`;
}

/* ---------- écran Planning ---------- */
let weekOff = 0, daySel = null;
const NB = 6;
export function renderPlanning() {
  const host = $('#plBody'); if (!host) return;
  const p = getPlan();
  $('#plSub').textContent = p ? 'Ta semaine, organisée rien que pour toi.' : 'Ton parcours réparti sur les jours qui t’arrangent, jusqu’au jour J.';
  if (!p) {
    const d = draftFrom(null);
    host.innerHTML = `<div class="pl-setup"><div class="pl-intro"><span class="pl-intro-ic">${ico('cours')}</span><div><b>Ton planning personnalisé</b><p>${COURSES.length} leçons, chacune suivie de sa pratique en 3D, et 4 examens blancs, répartis dans l’ordre. Tu pourras tout ajuster ensuite.</p></div></div>${rythmeHTML(d)}<button class="btn" id="plCreate">Créer mon planning</button></div>`;
    bindRythme(host, d, () => { $('#plCreate').disabled = !d.jours.length; });
    $('#plCreate').addEventListener('click', () => { haptic('ok'); Sound.ui('ok'); createPlan(draftOut(d)); weekOff = 0; daySel = null; renderPlanning(); });
    return;
  }
  const t = today(), tIso = iso(t), st = stats(), fin = lastDay(p);
  const d0 = addD(t, weekOff * NB), daysV = Array.from({ length: NB }, (_, k) => addD(d0, k));
  if (!daySel || !daysV.some(d => iso(d) === daySel)) daySel = iso(daysV.find(d => sessionOf(p, d)) || daysV[0]);
  const stateOf = d => { const s = sessionOf(p, d); if (!s) return 'rest'; const n = s.items.filter(isDone).length; return n === s.items.length ? 'done' : iso(d) < tIso ? 'late' : n ? 'part' : 'todo'; };
  const sel = fromIso(daySel), ss = sessionOf(p, sel);
  const exD = p.examen ? fromIso(p.examen) : null, jj = exD ? diffD(t, exD) : null;
  const pctv = st.total ? Math.round(st.done / st.total * 100) : 0;
  host.innerHTML = `
    <div class="pl-tools"><button class="chipb" data-today>Aujourd’hui</button><button class="chipb" data-adapt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>Adapter mon rythme</button></div>
    ${todayCardHTML()}
    <section class="pl-week glass">
      <div class="wk-head"><button class="wk-arrow" data-wk="-1" aria-label="Jours précédents"${weekOff <= 0 && !(p.sessions || []).some(s => s.d < tIso) ? ' disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg></button><b>${court(daysV[0])} – ${court(daysV[NB - 1])}</b><button class="wk-arrow" data-wk="1" aria-label="Jours suivants"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></button></div>
      <div class="wk-days">${daysV.map(d => { const k = iso(d), s = stateOf(d); return `<button class="wk-day ${s}${k === daySel ? ' sel' : ''}${k === tIso ? ' auj' : ''}" data-day="${k}" aria-pressed="${k === daySel}"><span>${JC[wd(d)]}</span><b class="num">${d.getDate()}</b><i></i></button>`; }).join('')}</div>
      <div class="wk-sel"><div class="wk-sel-h"><b>${relJour(sel)}</b><span>${ss ? `${ss.items.length} activité${ss.items.length > 1 ? 's' : ''} · ~${ss.items.reduce((a, id) => a + minOf(id), 0)} min` : 'Pas de séance'}</span></div>
        ${ss ? `<ul class="pl-list">${ss.items.map(id => rowHTML(id, { late: daySel < tIso })).join('')}</ul>${daySel > tIso && ss.items.some(id => !isDone(id)) ? '<button class="more" data-avance="' + daySel + '">Prendre de l’avance sur cette séance →</button>' : ''}` : `<p class="wk-empty">${daySel < tIso ? 'Aucune séance ce jour-là.' : 'Jour de repos : profite, ou fais une activité de plus.'}</p>`}
      </div>
    </section>
    <h2 class="h-sec">Ta série</h2>
    ${weekHTML(plannedDays())}
    <h2 class="h-sec">Avancement</h2>
    <div class="pl-glob glass">
      <div class="pg-top"><b class="num">${pctv} %</b><span>${st.done} / ${st.total} activités</span></div>
      <div class="bar"><i style="width:${pctv}%"></i></div>
      <ul class="pg-facts">
        <li><span>Fin prévue</span><b>${fin ? longJour(fin) : '—'}</b></li>
        <li><span>Rythme</span><b>${p.jours.map(j => JC[j].replace('.', '')).join(', ')} · ${p.minutes} min</b></li>
        ${exD ? `<li><span>Jour J</span><b>${longJour(exD)}${jj >= 0 ? ` · ${jj ? `dans ${jj} jour${jj > 1 ? 's' : ''}` : 'aujourd’hui'}` : ''}</b></li>` : ''}
      </ul>
      ${exD && fin && fin > exD ? `<p class="rf-warn">À ce rythme, tu finis après ton examen. <button class="lnk" data-adapt>Adapter mon rythme</button></p>` : ''}
    </div>`;
  $$('[data-adapt]', host).forEach(b => b.addEventListener('click', () => openAdapt(renderPlanning)));
  $('[data-today]', host).addEventListener('click', () => { haptic(); weekOff = 0; daySel = tIso; renderPlanning(); });
  $$('[data-wk]', host).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); weekOff += +b.dataset.wk; daySel = null; renderPlanning(); }));
  $$('[data-day]', host).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); daySel = b.dataset.day; renderPlanning(); }));
  $$('[data-avance]', host).forEach(b => b.addEventListener('click', () => { const s = sessionOf(p, b.dataset.avance); const id = s && s.items.find(x => !isDone(x)); if (id) launch(id); }));
  bindToday(host, renderPlanning);
}
/* boutons communs de la carte du jour : « Commencer la séance », « Replacer » */
export function bindToday(root, after, startFn = launch) {
  $$('[data-replacer]', root).forEach(b => b.addEventListener('click', () => { haptic('ok'); Sound.ui('ok'); adaptPlan({}); after && after(); }));
  $$('[data-seance]', root).forEach(b => b.addEventListener('click', () => { const id = nextItem(); if (id) startFn(id); }));
}

export function setupPlanning(o) {
  cfg = Object.assign(cfg, o);
  document.addEventListener('pb:actif', refreshBadge);
  document.addEventListener('pb:ecran', refreshBadge);
  refreshBadge();
}
