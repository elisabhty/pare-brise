/* Écrans : salle (accueil), parcours (catalogue), fiche cours, examen (hub), et branchement des autres. */
import { $, $$, esc, wait, haptic, store } from './util.js';
import { has3D, R, SALLE, STUDIO } from './world.js';
import { sign } from './signs.js';
import { THEMES, COURSES, SERIES, course, theme, coursesOf, courseNumber, seriesOfCourse, signsOfCourse, allQuestionIds } from './content.js';
import { courseState, seriesBest, seriesTotal, toReview, mastered, nextCourse, doneCount, readiness, exams } from './progress.js';
import { Voice, splitSentences, estimate } from './voice.js';
import { Sound } from './sound.js';
import { register, show, curtain } from './nav.js';
import { Player, setPlayerLinks, notes } from './player.js';
import { Serie, setSerieDone, drawExam } from './serie.js';
import { Reflex } from './reflex.js';
import { Decoder } from './decoder.js';
import { Labels } from './labels.js';
import { roadmap } from './roadmap.js';
import { renderHomeExos, Exos, practiceOf, defisOf, best as exoBest, starsHtml, icon } from './exos.js';
import { setupPlanning, renderPlanning, todayCardHTML, bindToday, getPlan, plannedDays, refreshBadge, launch, openSheet } from './planning.js';
import { getProfil, salut, avatarHTML, openProfil } from './profil.js';
import { weekHTML, streak, activeToday, FLAME } from './streak.js';
import { currentScreen } from './nav.js';

/* ---------- utilitaires d'affichage ---------- */
export const courseMinutes = c => Math.max(1, Math.round(c.scenes.reduce((a, s) => a + splitSentences(s.dire || '').reduce((b, t) => b + estimate(t) + 180, 0) + 450, 0) / 60000));
const qCount = c => (practiceOf(c.id) || { situations: [] }).situations.length;
const status = c => { const st = courseState(c.id); return st.done ? ['done', 'Vu'] : c === nextCourse() ? ['now', 'À suivre'] : st.scene > 0 ? ['started', 'Commencé'] : ['todo', 'Dispo']; };
const pct = (s, t) => (t ? Math.round(s / t * 100) : 0);
const courseRow = (c, compact) => {
  const [st, tag] = status(c);
  return `<li class="${st}"><button data-go="fiche" data-arg="${c.id}"><span class="node num">${st === 'done' ? '✓' : courseNumber(c)}</span><div><b>${esc(c.titre)}</b><small>${compact ? esc(theme(c.theme).nom) : `${courseMinutes(c)} min · ${(c.chapitres || []).length} chapitres · ${qCount(c)} situations`}</small></div><span class="tag">${tag}</span></button></li>`;
};

export function drawPoster(c = nextCourse()) {
  if (!has3D || !c) return;
  SALLE.setPoster((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2E7BFF'); g.addColorStop(1, '#0A2E8A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const FONT = '"Inter Variable", -apple-system, "SF Pro Display", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`Cours ${courseNumber(c)} · ${theme(c.theme).nom}`, 70, 110);
    ctx.fillStyle = '#FFFFFF';
    const words = c.titre.split(' '); const lines = []; let line = '';
    ctx.font = `800 92px ${FONT}`;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > w - 140 && line) { lines.push(line); line = wd; } else line = t; });
    lines.push(line);
    lines.slice(0, 3).forEach((l, k) => ctx.fillText(l, 66, 212 + k * 100));
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `500 26px ${FONT}`;
    ctx.fillText(`${courseMinutes(c)} min · ${(c.chapitres || []).length} chapitres · ${qCount(c)} situations`, 70, 212 + Math.min(3, lines.length) * 100 - 22);
  });
  const ids = signsOfCourse(c).slice(0, 6); let n = 0; const imgs = [];
  ids.forEach((id, k) => { const im = new Image(); im.onload = () => { imgs[k] = im; if (++n === ids.length) SALLE.setPoster((ctx, w, h) => imgs.forEach((m, j) => m && ctx.drawImage(m, 70 + j * 96, h - 120, 80, 80))); }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sign(id, 'width="160" height="160"')); });
}

/* ---------- SALLE (accueil) ---------- */
function renderHello() {
  const p = getProfil() || {}, n = streak();
  $('#helloT').textContent = p.prenom ? `${salut()}, ${p.prenom}` : salut();
  $('#helloP').textContent = p.pseudo ? '@' + p.pseudo : '';
  $('#meAv').innerHTML = avatarHTML(p.perso || 'lea');
  const sp = $('#stkPill'); sp.innerHTML = `${FLAME}<b class="num">${n}</b>`; sp.className = 'stk-pill' + (n ? ' hot' : '') + (activeToday() ? ' done' : '');
  sp.setAttribute('aria-label', `${n} jour${n > 1 ? 's' : ''} d’affilée, voir le planning`);
}
function renderHome() {
  const c = nextCourse(), st = courseState(c.id);
  renderHello();
  const plan = getPlan();
  $('#homeToday').innerHTML = plan ? todayCardHTML({ home: true }) : '';
  bindToday($('#homeToday'), renderHome, id => (id[0] === 'c' ? seatAndPlay(id.slice(2)) : launch(id)));
  $('#nextC').hidden = !!plan;
  $('#homeStreak').innerHTML = weekHTML(plannedDays());
  refreshBadge();
  $('#heroEyebrow').textContent = `Ton prochain cours · Cours ${courseNumber(c)} · ${courseMinutes(c)} min`;
  $('#heroLead').textContent = `« ${c.titre} ». ${c.resume}`;
  $('#takeSeat').textContent = st.scene > 0 && !st.done ? 'Reprendre le cours' : 'Lancer le cours';
  const r = readiness();
  $('#readyPct').textContent = r + ' %'; $('#readyBar').style.width = r + '%';
  const rev = toReview().length;
  $('#readyTxt').textContent = `${doneCount()}/${COURSES.length} cours vus · ${mastered()} questions maîtrisées${exams().length ? ` · dernier examen ${exams().slice(-1)[0].score}/${exams().slice(-1)[0].total}` : ''}`;
  $('#reviewCard').hidden = !rev;
  $('#reviewN').textContent = rev;
  const i0 = Math.max(0, Math.min(COURSES.indexOf(c) - 1, COURSES.length - 4));
  roadmap($('#homeRoad'), COURSES.slice(i0, i0 + 4).map(courseRowData), { here: 'À suivre' });
}
function courseRowData(c) {
  const [st, tag] = status(c);
  return { type: 'course', id: c.id, num: courseNumber(c), title: c.titre, sub: `${courseMinutes(c)} min · ${qCount(c)} situations`, status: st, tag };
}
let seating = false;
async function seatAndPlay(id) {
  if (seating) return; seating = true;
  Voice.unlock(); Sound.init(); haptic('heavy');
  $('#s-salle').scrollTo({ top: 0, behavior: 'smooth' });
  $('.hero').style.transition = 'opacity .5s'; $('.hero').style.opacity = '0';
  $('#tabbar').style.transition = 'opacity .4s'; $('#tabbar').style.opacity = '0';
  Sound.ui('whoosh');
  await SALLE.takeSeat();
  await curtain('Les lumières s’éteignent', async () => {
    $('.hero').style.opacity = ''; $('#tabbar').style.opacity = ''; seating = false;
    await show('cours', { noCurtain: true, course: id, play: true });
  });
}

/* ---------- PARCOURS (catalogue) ---------- */
let filter = 'tous';
function renderParcours() {
  const total = COURSES.length, done = doneCount();
  $('#pStats').innerHTML = `<div><b class="num">${done}/${total}</b><span>cours vus</span></div><div><b class="num">${mastered()}</b><span>questions maîtrisées</span></div><div><b class="num">${toReview().length}</b><span>à revoir</span></div>`;
  $('#pChips').innerHTML = [['tous', 'Tous']].concat(THEMES.map(t => [t.id, t.nom])).map(([id, n]) => { const k = id === 'tous' ? total : coursesOf(id).length; return `<button class="chipb sm" data-f="${id}" aria-pressed="${filter === id}">${esc(n)}<i class="num">${k}</i></button>`; }).join('');
  $$('#pChips .chipb').forEach(b => b.addEventListener('click', () => { Sound.ui('tap'); filter = b.dataset.f; renderParcours(); }));
  const themes = filter === 'tous' ? THEMES : THEMES.filter(t => t.id === filter);
  const rows = [];
  themes.forEach(t => {
    const list = coursesOf(t.id);
    rows.push({ type: 'theme', num: String(THEMES.indexOf(t) + 1).padStart(2, '0'), title: t.nom, sub: list.length ? `${list.length} cours` : 'Travaux en cours · bientôt', empty: !list.length });
    list.forEach(c => rows.push(courseRowData(c)));
  });
  roadmap($('#pList'), rows);
}

/* ---------- FICHE COURS ---------- */
let ficheId = null;
function renderFiche(id) {
  const c = course(id) || nextCourse(); ficheId = c.id;
  const st = courseState(c.id);
  drawPoster(c);
  $('#fEyebrow').textContent = `Cours ${courseNumber(c)} · ${theme(c.theme).nom}`;
  $('#fTitle').textContent = c.titre;
  $('#fResume').textContent = c.resume || '';
  $('#fFacts').innerHTML = `<div><b class="num">${courseMinutes(c)}</b><span>minutes</span></div><div><b class="num">${(c.chapitres || []).length}</b><span>chapitres</span></div><div><b class="num">${qCount(c)}</b><span>situations en pratique</span></div>`;
  $('#fPlay').textContent = st.done ? 'Revoir le cours' : st.scene > 0 ? 'Reprendre le cours' : 'Lancer le cours';
  $('#fChapters').innerHTML = (c.chapitres || []).map((n, k) => `<li><button data-ch="${k}"><span class="cn">${k + 1}</span><b>${esc(n)}</b><small>${c.scenes.filter(s => (s.ch || 0) === k).length} scènes</small></button></li>`).join('');
  $$('#fChapters button').forEach(b => b.addEventListener('click', () => show('cours', { course: c.id, at: c.scenes.findIndex(s => (s.ch || 0) === +b.dataset.ch), play: true })));
  const pr = practiceOf(c.id), pb = pr && exoBest(pr.id), defis = defisOf(c.id);
  $('#fSeries').innerHTML = (pr ? `<li><button class="pr-card" data-exo="${pr.id}"><span class="pr-ic">${icon('examen')}</span><div><b>Pratique : ${esc(c.titre)}</b><small>${pr.situations.length} situations en 3D · ${esc(pr.duree)}</small></div><span class="pr-r">${pb ? starsHtml(pb.score) : '<i>Jouer</i>'}</span></button></li>` : '')
    + defis.map(x => { const b = exoBest(x.id); return `<li><button class="cell sub" data-exo="${x.id}"><span class="cell-ic m-${x.meca}">${icon(x.meca)}</span><span class="cell-t"><b>${esc(x.titre)}</b><small>Défi 3D · ${esc(x.sous || '')}</small></span><span class="cell-r">${b ? starsHtml(b.score) : `<em>${esc(x.duree || '')}</em>`}</span></button></li>`; }).join('');
  $('#fMemo').innerHTML = (c.memo || []).map(m => `<li>${m.panneau ? sign(m.panneau) : '<i class="memo-dot"></i>'}<b>${esc(m.texte)}</b><span>${esc(m.tag || '')}</span></li>`).join('');
  $('#fMemoT').hidden = !(c.memo || []).length;
  // les passages que l'élève a retenus pendant le cours (étoile du lecteur)
  const ns = notes().filter(n => n.c === c.id && n.i < c.scenes.length).sort((a, b) => a.i - b.i);
  $('#fNotesT').hidden = $('#fNotes').hidden = !ns.length;
  $('#fNotes').innerHTML = ns.map(n => `<li><button data-i="${n.i}" data-k="${n.k || 0}"><i>★</i><div><b>${esc(n.t)}</b><span>${esc(n.s)}</span></div></button></li>`).join('');
  $$('#fNotes button').forEach(b => b.addEventListener('click', () => { Voice.unlock(); Sound.init(); show('cours', { course: c.id, at: +b.dataset.i, k: +b.dataset.k, play: true }); }));
}
export function startSerie(id, extra = {}) {
  const s = SERIES.get(id); if (!s) return;
  Serie.start(Object.assign({ titre: s.titre, ids: s.questions, mode: 'entrainement', serieId: s.id }, extra));
}

/* ---------- EXAMEN (hub) ---------- */
function renderHub() {
  const n = Math.min(20, allQuestionIds().length), rev = toReview();
  $('#hubExamN').textContent = n;
  $('#hubReview').hidden = !rev.length; $('#hubReviewN').textContent = rev.length;
  const last = exams().slice(-1)[0];
  $('#hubLast').textContent = last ? `Dernier examen blanc : ${last.score}/${last.total}` : 'Pas encore d’examen blanc.';
  $('#hubSeries').innerHTML = [...SERIES.values()].map(s => { const c = course(s.cours); const best = seriesBest(s.id), tot = seriesTotal(s.id); return `<li><button class="srow glass" data-s="${s.id}"><div><b>${esc(s.titre)}</b><small>${c ? `Cours ${courseNumber(c)} · ` : ''}${s.questions.length} questions</small></div><span class="tag num">${best !== undefined ? `${best}/${tot}` : 'Nouveau'}</span></button></li>`; }).join('');
  $$('#hubSeries [data-s]').forEach(b => b.addEventListener('click', () => startSerie(b.dataset.s, { retour: 'examen' })));
}

/* ---------- Enregistrement des écrans ---------- */
export function setupScreens() {
  register('salle', { world: 'salle', amb: 'salle', enter(prev) { renderHome(); renderHomeExos(); drawPoster(nextCourse()); if (prev && prev !== 'bienvenue') SALLE.reset(1200); } });
  register('planning', { world: 'salle', amb: 'salle', still: true, region: () => $('#s-planning'), enter() { renderPlanning(); SALLE.reset(900); } });
  // une activité du planning s'ouvre là où elle vit, et revient à l'écran d'où on l'a lancée
  setupPlanning({ minutesCours: courseMinutes, ouvrir(kind, ref) {
    const from = currentScreen() || 'planning';
    if (kind === 'cours') { Voice.unlock(); Sound.init(); show('cours', { course: ref, play: true }); }
    else if (kind === 'serie') startSerie(ref, { retour: from });
    else Exos.run(ref, from);
  } });
  $('#meBtn').addEventListener('click', () => { haptic(); Sound.ui('tap'); openProfil(openSheet, renderHome); });
  document.addEventListener('pb:profil', () => { if (currentScreen() === 'salle') renderHello(); });
  register('parcours', { world: 'salle', amb: 'salle', still: true, region: () => $('#s-parcours'), enter() { renderParcours(); SALLE.reset(900); } });
  register('fiche', { world: 'salle', amb: 'salle', tab: 'parcours', enter(prev, o) { renderFiche(o.arg || ficheId || (Player.c && Player.c.id)); SALLE.focusScreen(1100); } });
  register('cours', { world: 'route', amb: 'route', noTab: true,
    enter(prev, o) { if (o.course) { ficheId = o.course; R.reset(); Player.load(o.course, o.at > 0 ? o.at : (o.at === undefined ? courseState(o.course).scene || 0 : 0)); if (o.play) { if (o.k > 0) Player.goTo(o.at, o.k); else Player.play(); } } },
    leave() { if (Player.mode === 'explore') Player.explore(false, false); Player.closeInfo(false); Player.pause(); Labels.clear(); if (Player.closeChapters) Player.closeChapters(); if (Player.closeText) Player.closeText(); $('#s-cours').classList.remove('immersif', 'explore', 'ralenti'); } });
  register('serie', { world: 'route', amb: null, noTab: true, tab: 'examen', enter() { R.reset(); }, leave() { Serie.stop(); } });
  register('examen', { world: 'salle', amb: 'salle', still: true, region: () => $('#s-examen'), enter() { renderHub(); SALLE.reset(900); } });
  register('parebrise', { world: 'route', amb: 'route', enter() { R.reset(); R.setSpeed(40, 20); R.pose('reflex', 1); }, leave() { Reflex.stop(); } });
  register('decodeur', { world: 'studio', amb: null, enter() { Decoder.paint(true); } });

  setPlayerLinks(id => Exos.run(id, 'fiche'), () => show('parcours'));
  setSerieDone(cfg => show(cfg.retour || 'examen', cfg.retourArg ? { arg: cfg.retourArg } : {}));
  Player.bindUI();
  Reflex.init(() => {});
  Decoder.init(() => store.set('decoderUsed', true));

  $('#takeSeat').addEventListener('click', () => seatAndPlay(nextCourse().id));
  $('#fPlay').addEventListener('click', () => { Voice.unlock(); Sound.init(); const st = courseState(ficheId); show('cours', { course: ficheId, at: st.done ? 0 : undefined, play: true }); });
  $('#reviewCard').addEventListener('click', () => Serie.start({ titre: 'À revoir', ids: toReview().slice(0, 15), mode: 'entrainement', retour: 'salle' }));
  $('#hubExam').addEventListener('click', () => Serie.start({ titre: 'Examen blanc', ids: drawExam(20), mode: 'examen', examen: true, retour: 'examen' }));
  $('#hubReview').addEventListener('click', () => Serie.start({ titre: 'À revoir', ids: toReview().slice(0, 15), mode: 'entrainement', retour: 'examen' }));
  $('#sQuit').addEventListener('click', () => { Serie.stop(); show(Serie.cfg && Serie.cfg.retour ? Serie.cfg.retour : 'examen', Serie.cfg && Serie.cfg.retourArg ? { arg: Serie.cfg.retourArg } : {}); });

  // regarder autour de soi dans la salle
  const v = $('#v-salle'); let px = 0, py = 0, down = false;
  v.addEventListener('pointerdown', e => { down = true; px = e.clientX; py = e.clientY; SALLE.setDrag(true); });
  v.addEventListener('pointermove', e => { if (!down) return; SALLE.look(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY; });
  const up = () => { down = false; SALLE.setDrag(false); };
  v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up); v.addEventListener('pointerleave', up);
}
