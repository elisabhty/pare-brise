/* Lecteur de cours générique : lit n'importe quel cours JSON, scène par scène. */
import { $, $$, esc, fr, wait, fmt, haptic, store } from './util.js';
import { has3D, Engine, R, SIM } from './world.js';
import { sign, FAM } from './signs.js';
import { course, courseNumber, COURSES, EXOS } from './content.js';
import { piegeHTML, bindPieges } from './piege.js';
import { saveCourse } from './progress.js';
import { Voice, splitSentences, estimate, sayTimed } from './voice.js';
import { Sound } from './sound.js';
import { Labels } from './labels.js';
import { TYPES, ov, isQuestion, View, Live, camOf, paintDash, Frame, sceneBeat } from './scenes.js';
import { Illu } from './illu.js';
import { actorInfo, signInfo } from './infos.js';
import { show, currentScreen, settled } from './nav.js';
import { plot, react, line } from './mascot.js';

let onSerie = () => {}, onHome = () => {};
export const setPlayerLinks = (serieFn, homeFn) => { onSerie = serieFn; onHome = homeFn; };

const sEst = s => estimate(s) + 180;
const est = sc => sc.sents.reduce((a, s) => a + sEst(s), 0) + (isQuestion(sc) ? 0 : 450);
const VUES = [[null, 'Auto'], ['cockpit', 'Conducteur'], ['poursuite', 'Derrière'], ['drone', 'Dessus']];
export const notes = () => store.get('notes', []);
const inSim = () => has3D && SIM && Engine.current === 'sim' && !!Live.sc;

export const Player = {
  c: null, scenes: [], i: 0, tok: 0, sceneTok: 0, playing: false, t0: 0, started: false, answered: -1,
  k: 0, kT0: 0, sceneT0: 0, entered: -1, frozen: false, mode: null, info: null,
  /* quiet : la séance va démarrer tout de suite (start) ; la scène ne se construit qu'une fois */
  load(id, startAt = 0, quiet = false) {
    const c = course(id); if (!c) return;
    this.tok++; this.sceneTok++; Voice.stop();
    this.c = c; this.scenes = c.scenes.map(s => Object.assign({}, s, { sents: splitSentences(s.dire || '') }));
    this.i = Math.max(0, Math.min(this.scenes.length - 1, startAt)); this.started = false; this.answered = -1;
    this.entered = -1; this.frozen = false; this.mode = null; $('#s-cours').classList.remove('explore', 'ralenti', 'immersif');
    $('#cTitle').textContent = c.titre; $('#cTitle').style.fontSize = '';
    $('#endcard').hidden = true;
    this.renderChapters(); this.renderText();
    if (!quiet) { this.enterScene(this.i); this.setPlaying(false); }
  },
  /* début de séance (fiche, accueil, planning) : la scène se construit sous le rideau, la voix attend que l'image soit à l'écran */
  start(at, k) { const gate = settled(); if (k > 0) this.goTo(at, k, gate); else this.play(gate); },
  /* (mesuré quand l'écran est visible : au chargement, la barre n'a pas encore de largeur ; la boucle d'affichage y revient) */
  fitTitle() { const t = $('#cTitle'); if (this.titleFit || !t || !t.clientWidth) return; let f = 14; t.style.fontSize = ''; while (t.scrollWidth > t.clientWidth && f > 10.5) { f -= 0.5; t.style.fontSize = f + 'px'; } if (f < 14) t.style.fontSize = (f - 0.5) + 'px'; this.titleFit = true; },   // une marge : les largeurs sont arrondies
  total() { return this.scenes.reduce((a, s) => a + est(s), 0); },
  cum() { let t = 0; for (let k = 0; k < this.i; k++) t += est(this.scenes[k]); return t; },
  renderChapters() {
    const ch = this.c.chapitres || ['Cours'];
    $('#chapters').innerHTML = ch.map((n, k) => { const d = this.scenes.filter(s => (s.ch || 0) === k).reduce((a, s) => a + est(s), 0); return `<li><button data-ch="${k}"><span class="cn">${k + 1}</span><b>${esc(n)}</b><small class="num">${fmt(d)}</small></button></li>`; }).join('');
    $$('#chapters button').forEach(b => b.addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.go(this.scenes.findIndex(s => (s.ch || 0) === +b.dataset.ch), true); }));
    const total = this.total(); let acc = 0, html = '<div class="fill" id="trackFill"></div>';
    this.scenes.forEach((s, k) => { if (k > 0) html += `<i class="${(s.ch || 0) !== (this.scenes[k - 1].ch || 0) ? 'tick' : 'sep'}" style="left:${(acc / total * 100).toFixed(2)}%"></i>`; acc += est(s); });
    $('#track').innerHTML = html + '<span class="marks" id="trackMarks"></span>';
    this.renderMarks();
  },
  /* les passages retenus, en petites étoiles sur la barre */
  renderMarks() {
    const m = $('#trackMarks'); if (!m || !this.c) return;
    const total = this.total(); const at = i => this.scenes.slice(0, i).reduce((a, s) => a + est(s), 0);
    m.innerHTML = notes().filter(n => n.c === this.c.id && n.i < this.scenes.length).map(n => `<i style="left:${(at(n.i) / total * 100).toFixed(2)}%"></i>`).join('');
  },
  enterScene(i) {
    const sc = this.scenes[i];
    const tok = ++this.sceneTok;
    // d'une scène à l'autre, un fondu enchaîné : jamais de coupure sèche, et la construction du décor suivant ne se voit pas
    if (has3D && this.entered >= 0 && currentScreen() === 'cours' && Engine.xfade) Engine.xfade();
    ov.clear(); Labels.clear(); this.closeInfo(false);
    if (this.mode === 'explore') { this.mode = null; $('#s-cours').classList.remove('explore'); if (R && R.explore) R.explore(false); }
    Live.sc = null; Live.actors = [];
    this.entered = i; this.frozen = false; this.k = 0; this.sceneT0 = this.kT0 = performance.now();
    const chs = this.c.chapitres || ['Cours'];
    $('#cChap').textContent = `Cours ${courseNumber(this.c)} · chapitre ${(sc.ch || 0) + 1} sur ${chs.length}`;
    // le titre du cours tient toujours en entier dans la barre : il rétrécit un peu plutôt que de finir par « … »
    this.titleFit = false; this.fitTitle();
    $$('#chapters li').forEach((li, k) => { li.classList.toggle('cur', k === (sc.ch || 0)); if (k < (sc.ch || 0)) li.classList.add('seen'); });
    this.caption(sc, -1);
    $('#quiz').hidden = true;
    this.answered = -1;
    const ctx = { live: () => tok === this.sceneTok && currentScreen() === 'cours', phrase: () => this.k };
    this.ctx = ctx;
    const T = TYPES[sc.type];
    if (T) T.enter(sc, ctx);
    Illu.mount(sc);
    Frame.set(sc.decor && has3D);
    if (isQuestion(sc)) this.showQuiz(sc);
    // en pause, l'écran montre tout (la liste entière, les étiquettes, l'illustration) ; en lecture, il se construit avec la voix
    if (!this.playing) setTimeout(() => { if (tok === this.sceneTok && !this.playing) try { sceneBeat(sc, 999, ctx, 0); } catch (e) {} }, 0);
    saveCourse(this.c.id, { scene: i });
    this.paintRail(); this.paintText();
  },
  /* sous-titres façon vidéo : une seule phrase à la fois, posée sur l'image */
  /* le sous-titre se remplit au rythme de la voix (durée estimée de la phrase) : on suit des yeux ce qu'on entend */
  caption(sc, k) { const el = $('#caption'), n = sc.sents.length, s = sc.sents[Math.max(0, Math.min(k, n - 1))] || ''; el.innerHTML = s ? `<span class="kar${k >= n ? ' done' : ''}" style="--kd:${Math.round(sEst(s))}ms">${fr(s)}</span>` : ''; el.classList.toggle('wait', k < 0); el.classList.toggle('long', s.length > 108); el.classList.toggle('xlong', s.length > 122); el.hidden = !s || !this.started; },
  setPlaying(p) {
    this.playing = p;
    $('#s-cours').classList.toggle('enpause', !p);
    $('#cPlay').innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4 L20 12 L7 20 Z"/></svg>';
    $('#cPlay').setAttribute('aria-label', p ? 'Pause' : 'Lecture');
    $('#playOver').hidden = p || !!this.mode || isQuestion(this.scenes[this.i]);
    $('#playOverTxt').textContent = this.started ? 'Reprendre' : 'Lancer la séance';
  },
  /* Lecture : reprend là où l'on s'était arrêté (même scène, même phrase, la 3D repart), sinon démarre la scène */
  play(gate) {
    this.started = true; $('#endcard').hidden = true; this.closeInfo(false);
    if (this.mode === 'explore') this.explore(false, false);
    const resume = this.frozen && this.entered === this.i && this.mode !== 'ralenti';
    this.mode = null; $('#s-cours').classList.remove('ralenti');
    this.setPlaying(true); const tok = ++this.tok;
    if (resume) this.unfreeze(); else this.enterScene(this.i);
    this.t0 = performance.now();
    const go = () => { if (tok !== this.tok) return; if (gate) this.sceneT0 = this.kT0 = performance.now(); this.run(tok, resume ? this.k : 0); };
    if (gate) gate.then(go); else go();
  },
  pause() { this.tok++; Voice.stop(); Sound.duck(false); this.setPlaying(false); this.freeze(); },
  /* une vraie pause : la scène 3D s'arrête aussi */
  freeze() {
    if (this.frozen || !has3D) { this.frozen = true; return; }
    this.frozen = true;
    if (Engine.current === 'sim' && SIM) SIM.slow(0, 280); else if (R && R.setSpeed) { this.kmh0 = R.kmh; R.setSpeed(0, 14); }
  },
  unfreeze() {
    if (!this.frozen) return; this.frozen = false; if (!has3D) return;
    if (Engine.current === 'sim' && SIM) SIM.slow(1, 280); else if (R && R.setSpeed && this.kmh0) R.setSpeed(this.kmh0);
  },
  /* aller à une phrase précise d'une scène (texte du cours, double toucher) */
  goTo(i, k = 0, gate) {
    this.tok++; Voice.stop(); $('#endcard').hidden = true; this.started = true; this.closeInfo(false);
    if (this.mode === 'explore') this.explore(false, false);
    this.mode = null; $('#s-cours').classList.remove('ralenti');
    this.i = Math.max(0, Math.min(this.scenes.length - 1, i));
    if (this.entered !== this.i) this.enterScene(this.i); else this.unfreeze();
    this.setPlaying(true); const tok = ++this.tok, kk = Math.max(0, Math.min(k, this.scenes[this.i].sents.length - 1));
    if (gate) gate.then(() => { if (tok === this.tok) this.run(tok, kk); }); else this.run(tok, kk);
  },
  /* phrase précédente / suivante, en passant d'une scène à l'autre */
  seek(d) {
    const sc = this.scenes[this.i]; if (!sc) return;
    const k = Math.min(this.k, sc.sents.length - 1) + d;
    if (k < 0) { if (this.i === 0) return this.goTo(0, 0); const p = this.scenes[this.i - 1]; return this.goTo(this.i - 1, p.sents.length - 1); }
    if (k >= sc.sents.length) return this.i >= this.scenes.length - 1 ? this.finish() : this.goTo(this.i + 1, 0);
    this.goTo(this.i, k);
  },
  go(i, autoplay = this.playing) {
    this.tok++; Voice.stop(); this.frozen = false;
    this.i = Math.max(0, Math.min(this.scenes.length - 1, i));
    $('#endcard').hidden = true;
    if (autoplay) this.play(); else { this.enterScene(this.i); this.setPlaying(false); }
  },
  async run(tok, from = 0) {
    const sc = this.scenes[this.i];
    const live = () => tok === this.tok;
    for (let k = from; k < sc.sents.length; k++) {
      if (!live()) return;
      this.k = k; this.kT0 = performance.now(); this.paintText();
      if (this.ctx) sceneBeat(sc, k, this.ctx, sEst(sc.sents[k]));
      this.caption(sc, k);
      Sound.duck(true); await sayTimed(sc.sents[k], live); Sound.duck(false);
      if (!live()) return;
      await wait(180);
    }
    if (!live()) return;
    this.k = sc.sents.length; this.caption(sc, sc.sents.length);
    if (this.ctx) sceneBeat(sc, 999, this.ctx, 0);
    if (isQuestion(sc)) return;
    const rest = (sc.min || 4.5) * 1000 - (performance.now() - this.sceneT0);
    if (rest > 0) await wait(rest);
    if (!live()) return;
    await wait(400);
    if (live()) this.next();
  },
  next() { if (this.i >= this.scenes.length - 1) return this.finish(); this.i++; this.play(); },
  showQuiz(sc) {
    const q = $('#quiz'); q.hidden = false;
    const opts = sc.type === 'touche'
      ? `<div class="qopts">${sc.panneaux.map((id, k) => `<button class="qopt" data-k="${k}">${sign(id)}<span>${'ABCD'[k]}</span></button>`).join('')}</div>`
      : `<div class="qopts text">${sc.choix.map((c, k) => `<button class="qopt txt" data-k="${k}"><i>${'ABCD'[k]}</i><span>${esc(c)}</span></button>`).join('')}</div>`;
    q.innerHTML = `<span class="eyebrow">${sc.type === 'touche' ? 'Touche le panneau, ou réponds ici' : 'Réponds ici'}</span><h4>${esc(sc.question)}</h4>${opts}<div class="qfb" id="qfb" hidden></div><div class="qact" id="qact" hidden></div>`;
    $$('.qopt', q).forEach(b => b.addEventListener('click', () => this.answer(+b.dataset.k)));
  },
  answer(k) {
    const sc = this.scenes[this.i];
    if (!isQuestion(sc) || this.answered === this.i) return;
    this.answered = this.i; this.tok++; Voice.stop();
    const ok = k === sc.bonne;
    haptic(ok ? 'ok' : 'ko'); Sound.ui(ok ? 'ok' : 'ko');
    if (sc.type === 'touche') { R.flash(k, ok); if (!ok) setTimeout(() => R.flash(sc.bonne, true), 500); }
    $('#tapHint').hidden = true;
    $$('.qopt').forEach((b, j) => { b.disabled = true; if (j === sc.bonne) b.classList.add('good'); else if (j === k) b.classList.add('bad'); });
    const msg = ok ? sc.bien : sc.mal;
    $('#qfb').hidden = false; $('#qfb').innerHTML = `<div class="fbrow">${plot({ size: 62 })}<div><b>${line(ok)}</b> ${esc(msg || '')}</div></div>`;
    react($('#qfb'), ok);
    $('#verdictBox').innerHTML = `<div class="verdict"><b class="d" style="color:${ok ? 'var(--vert)' : 'var(--rouge-t)'}">${ok ? 'Exact' : 'Raté'}</b><span>${esc(msg || '')}</span></div>`;
    setTimeout(() => { const v = $('#verdictBox .verdict'); if (v) { v.style.transition = 'opacity .5s'; v.style.opacity = '0'; } }, 2600);
    const act = $('#qact'); act.hidden = false;
    const canBack = !ok && Number.isInteger(sc.revoir);
    act.innerHTML = canBack ? `<button class="btn sm" id="qBack">Revoir le passage</button><button class="btn ghost sm" id="qGo">Continuer</button>` : `<button class="btn sm" id="qGo">Continuer le film</button>`;
    $('#qGo').addEventListener('click', () => { Voice.unlock(); this.next(); });
    if (canBack) $('#qBack').addEventListener('click', () => { Voice.unlock(); this.i = sc.revoir; this.play(); });
    Voice.say(msg || '');
    this.setPlaying(false); $('#playOver').hidden = true;
    $('#quiz').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  finish() {
    this.tok++; this.closeInfo(false); if (this.mode === 'explore') this.explore(false, false); this.mode = null; this.frozen = false; this.entered = -1; this.setPlaying(false); $('#playOver').hidden = true;
    const c = this.c;
    saveCourse(c.id, { done: true, scene: 0 });
    $$('#chapters li').forEach(li => li.classList.add('seen'));
    R.drive(70); ov.clear(); Labels.clear();
    ov.title(`<div class="eyebrow rise">Cours ${courseNumber(c)} terminé</div><h2 class="d rise" style="--d:.15s">${esc(c.titre)}</h2>`);
    const nxt = COURSES[COURSES.indexOf(c) + 1];
    const pr = EXOS.find(x => x.id === 'p-' + c.id);
    const memo = (c.memo || []).map(m => `<li>${m.panneau ? sign(m.panneau) : '<i class="memo-dot"></i>'}<b>${esc(m.texte)}</b><span style="color:${m.famille && FAM[m.famille] ? FAM[m.famille].t : 'var(--jaune)'}">${esc(m.tag || (m.famille && FAM[m.famille] ? FAM[m.famille].n : ''))}</span></li>`).join('');
    const e = $('#endcard'); e.hidden = false;
    e.innerHTML = `<div class="plot-hero">${plot({ size: 96, bubble: 'Cours terminé, bravo !' })}<div><span class="eyebrow">Fiche mémo</span><h3 class="d">Cours terminé</h3></div></div>${memo ? `<ul class="memo">${memo}</ul>` : ''}
      ${piegeHTML(c)}
      ${pr ? `<div class="end-pr"><span class="eyebrow">Deuxième partie</span><b>Passe à la pratique</b><p>${pr.situations.length} situations sur la route, en 3D, pour appliquer tout ce que tu viens de voir.</p><button class="btn" id="endSerie">Lancer la pratique</button></div>` : ''}
      ${this.notesHTML()}
      ${nxt ? `<button class="btn ghost sm" id="endNext">Cours suivant →</button>` : ''}
      <button class="btn ghost sm" id="endHome">Retour au parcours</button>`;
    bindPieges(e);
    if (pr) $('#endSerie').addEventListener('click', () => onSerie(pr.id));
    if (nxt) $('#endNext').addEventListener('click', () => { Voice.unlock(); this.load(nxt.id); this.play(); });
    $('#endHome').addEventListener('click', () => onHome());
    $$('#endcard [data-note]').forEach(b => b.addEventListener('click', () => { Voice.unlock(); this.goTo(+b.dataset.note, +b.dataset.k || 0); }));
    e.scrollTop = 0; $('#caption').hidden = true;
    setTimeout(() => react(e, true), 500);
    Sound.ui('ok');
  },
  /* ---------- le texte du cours : toutes les phrases, la phrase dite en surbrillance, toucher pour y aller ---------- */
  renderText() {
    const ns = notes().filter(n => n.c === this.c.id);
    $('#txtList').innerHTML = this.scenes.map((sc, i) => `<li class="tx-sc" data-i="${i}"><div class="tx-h"><span>${esc(sc.eyebrow || (this.c.chapitres || [])[sc.ch || 0] || '')}</span><b>${esc(sc.titre || '')}</b>${ns.some(n => n.i === i) ? '<i class="tx-star" aria-label="Passage retenu">★</i>' : ''}</div><p>${sc.sents.map((x, k) => `<button class="tx-s" data-i="${i}" data-k="${k}">${esc(x)}</button>`).join(' ')}</p></li>`).join('');
    this.txtAt = null; this.paintText();
  },
  paintText() {
    const key = this.i + ':' + this.k; if (this.txtAt === key) return; this.txtAt = key;
    $$('#txtList .tx-s.now, #txtList .tx-sc.cur').forEach(e => e.classList.remove('now', 'cur'));
    const li = $(`#txtList .tx-sc[data-i="${this.i}"]`); if (!li) return; li.classList.add('cur');
    const b = $(`.tx-s[data-k="${Math.min(this.k, this.scenes[this.i].sents.length - 1)}"]`, li); if (b) b.classList.add('now');
    const sh = $('#txtSheet'); if (sh && sh.classList.contains('on') && b) b.scrollIntoView({ block: 'center', behavior: 'smooth' });
  },
  notesHTML() {
    const ns = notes().filter(n => n.c === this.c.id && n.i < this.scenes.length).sort((a, b) => a.i - b.i);
    if (!ns.length) return '';
    return `<div class="end-notes"><span class="eyebrow">Tes passages retenus</span><ul>${ns.map(n => `<li><button data-note="${n.i}" data-k="${n.k || 0}"><i>★</i><div><b>${esc(n.t)}</b><span>${esc(n.s)}</span></div></button></li>`).join('')}</ul></div>`;
  },
  /* ---------- la barre d'outils à droite ---------- */
  paintRail() {
    const sim = inSim(), v = VUES.find(x => x[0] === View.cam) || VUES[0];
    $('#rView').classList.toggle('off', !sim); $('#rSlow').classList.toggle('off', !sim);
    $('#rViewT').textContent = v[1];
    $('#rExplore').classList.toggle('on', this.mode === 'explore');
    $('#rSlow').classList.toggle('on', this.mode === 'ralenti');
    this.paintNote();
  },
  paintNote() {
    const on = !!this.c && notes().some(n => n.c === this.c.id && n.i === this.i);
    $('#rNote').classList.toggle('on', on); $('#rNote').setAttribute('aria-pressed', on);
    $('#rNoteT').textContent = on ? 'Retenu' : 'Retenir';
  },
  toast(t, ms = 1900) {
    const el = $('#cToast'); el.textContent = t; el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.remove('on'), ms);
  },
  cycleView() {
    if (!inSim()) return this.toast('Les angles de vue s’activent pendant les mises en situation');
    const k = VUES.findIndex(x => x[0] === View.cam), v = VUES[(k + 1) % VUES.length];
    View.cam = v[0]; store.set('vue', View.cam);
    if (this.mode === 'explore') this.explore(false, false);
    const cam = camOf(Live.sc); SIM.pose(cam, 900); paintDash(cam);
    haptic(); Sound.ui('tap'); this.toast(v[0] ? `Vue : ${v[1].toLowerCase()}` : 'Vue : celle du cours'); this.paintRail();
  },
  toggleNote() {
    if (!this.c) return;
    const sc = this.scenes[this.i], k = Math.max(0, Math.min(this.k, sc.sents.length - 1)), list = notes();
    const j = list.findIndex(n => n.c === this.c.id && n.i === this.i);
    if (j >= 0) { list.splice(j, 1); this.toast('Passage retiré'); }
    else { list.unshift({ c: this.c.id, i: this.i, k, t: sc.titre || sc.eyebrow || this.c.titre, s: sc.sents[k] || '', d: Date.now() }); this.toast('★ Passage retenu : tu le retrouves dans la fiche du cours'); haptic('ok'); Sound.ui('ok'); }
    store.set('notes', list.slice(0, 300)); this.paintNote(); this.renderMarks(); this.renderText();
  },
  /* ---------- explorer la scène : on fige, on tourne autour, on zoome, on touche ---------- */
  explore(on, resume = true) {
    const s = $('#s-cours');
    if (on) {
      if (this.mode === 'explore') return;
      this.wasPlaying = this.playing || this.mode === 'ralenti';
      if (this.playing) this.pause(); else { this.tok++; this.freeze(); }
      this.mode = 'explore'; s.classList.add('explore'); s.classList.remove('ralenti', 'immersif'); this.closeInfo(false); this.setPlaying(false);
      if (has3D) { if (inSim()) { SIM.orbit(900); paintDash('libre'); } else if (R && R.explore) R.explore(true); }
      $('#exploreTip').textContent = inSim() ? 'Fais glisser pour tourner autour · pince pour zoomer · touche un usager ou un panneau' : 'Fais glisser pour regarder autour · pince pour zoomer · touche un panneau';
      haptic(); Sound.ui('tap');
    } else {
      if (this.mode !== 'explore') return;
      this.mode = null; s.classList.remove('explore'); this.closeInfo(false);
      if (has3D) { if (inSim()) { const cam = camOf(Live.sc); SIM.pose(cam, 900); paintDash(cam); } if (R && R.explore) R.explore(false); }
      if (resume) this.play(); else this.setPlaying(this.playing);
    }
    Frame.apply(); this.paintRail();
  },
  turn(dx, dy) { if (!has3D) return; if (inSim()) SIM.orbitBy(-dx * 0.006, dy * 0.004); else if (R && R.look) R.look(dx, dy); },
  zoom(k) { if (!has3D) return; if (inSim()) SIM.orbitBy(0, 0, k); else if (R && R.zoomBy) R.zoomBy(1 / k); },
  /* ---------- revoir la mise en situation au ralenti, sans la voix ---------- */
  async slowReplay() {
    if (!inSim()) return this.toast('Le ralenti s’active pendant les mises en situation');
    this.explore(false, false); this.closeInfo(false);
    this.tok++; Voice.stop(); Sound.duck(false); const tok = this.tok;
    this.mode = 'ralenti'; this.started = true; this.setPlaying(false);
    $('#s-cours').classList.add('ralenti'); this.enterScene(this.i); this.mode = 'ralenti'; this.paintRail();
    SIM.slow(0.35, 0);
    const sc = this.scenes[this.i], last = Math.max(0, ...(sc.script || []).map(x => x[0]));
    let t = 0; const off = SIM.onTick(dt => { t += dt; });
    this.toast('Ralenti × 0,35 : regarde bien la scène', 2400);
    while (tok === this.tok && t < Math.max(7, last + 4)) await wait(100);
    off(); if (tok !== this.tok) return;
    SIM.slow(0, 500); this.mode = null; $('#s-cours').classList.remove('ralenti');
    this.frozen = true; this.entered = -1; this.setPlaying(false); this.paintRail();
    $('#playOverTxt').textContent = 'Reprendre la scène';
  },
  /* ---------- toucher la scène ---------- */
  hitTest(x, y) {
    if (!has3D) { const el = document.elementFromPoint(x, y), f = el && el.closest('#fb-cours [data-k]'), sc = this.scenes[this.i]; return f && sc && sc.panneaux ? signInfo(sc.panneaux[+f.dataset.k]) : null; }
    if (inSim()) {
      const acts = Live.actors.filter(a => a && a.alive && a.g.visible), signs = (SIM.signs || []).filter(g => g.visible !== false);
      const objs = acts.map(a => a.g).concat(signs);
      let k = Engine.pickDeep(x, y, objs);
      if (k < 0) { let best = 44; objs.forEach((o, j) => { const p = Engine.screenOf(o, j < acts.length ? 0.9 : 1.9); if (!p.vis) return; const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; k = j; } }); }
      if (k < 0) return null;
      if (k < acts.length) { const idx = Live.actors.indexOf(acts[k]), o = (Live.sc.acteurs || [])[idx] || {}, et = (Live.sc.etiquettes || []).find(e => e[0] === idx); return actorInfo(o.type || acts[k].kind, et && [et[1], et[2]]); }
      const id = objs[k].userData.signId; return id ? signInfo(id) : null;
    }
    const k = Engine.pick(x, y), sc = this.scenes[this.i];
    return k !== null && k >= 0 && sc && sc.panneaux && sc.panneaux[k] ? signInfo(sc.panneaux[k]) : null;
  },
  openInfo(info, x, y) {
    this.closeInfo(false);
    this.infoResume = this.playing; if (this.playing) this.pause(); $('#playOver').hidden = true;
    const el = $('#infoCard');
    el.innerHTML = `<div class="ic-k">${esc(info.kicker)}</div><div class="ic-row">${info.sign ? `<span class="ic-sign">${sign(info.sign)}</span>` : ''}<div><b>${esc(info.titre)}</b><p>${esc(info.texte)}</p></div></div><button class="ic-x" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>${this.infoResume ? '<div class="ic-foot">Touche ailleurs pour reprendre</div>' : ''}`;
    el.hidden = false; el.classList.remove('on'); const lb = $('#labels'); if (lb) lb.style.visibility = 'hidden';
    const app = $('#app').getBoundingClientRect(), w = Math.min(290, app.width - 86);
    el.style.width = w + 'px'; const h = el.offsetHeight || 120; el.style.left = Math.max(12, Math.min(app.width - w - 70, x - app.left - w / 2)) + 'px';
    el.style.top = Math.max(80, Math.min(app.height - h - 210, (y - app.top) + (y - app.top < app.height * 0.45 ? 26 : -h - 26))) + 'px';
    requestAnimationFrame(() => el.classList.add('on'));
    $('.ic-x', el).addEventListener('click', e => { e.stopPropagation(); this.closeInfo(); });
    this.info = info; haptic(); Sound.ui('tick');
    if (Voice.on) Voice.say(`${info.titre}. ${info.texte}`);
  },
  closeInfo(resume = true) {
    const el = $('#infoCard'); if (!el || el.hidden) { this.info = null; const lb = $('#labels'); if (lb) lb.style.visibility = ''; return; }
    el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, 220); const lb = $('#labels'); if (lb) lb.style.visibility = '';
    this.info = null; Voice.stop();
    if (resume && this.infoResume && this.mode !== 'explore') { this.infoResume = false; this.play(); }
    else if (!this.playing && !this.mode) this.setPlaying(false);
    this.infoResume = false;
  },
  tap(x, y) {
    if (this.info) return this.closeInfo();
    const hit = this.hitTest(x, y);
    if (hit) return this.openInfo(hit, x, y);
    if (this.mode) return;
    const app = $('#app').getBoundingClientRect(), side = x - app.left < app.width / 3 ? -1 : x - app.left > app.width * 2 / 3 ? 1 : 0, now = performance.now();
    if (this.lastTap && now - this.lastTap.t < 320 && side && side === this.lastTap.side) {
      clearTimeout(this.tapT); this.lastTap = null; Voice.unlock(); this.seek(side);
      const f = $('#seekFlash'); f.className = 'seekflash ' + (side < 0 ? 'l' : 'r'); f.hidden = false; void f.offsetWidth; f.classList.add('on'); haptic(); return;
    }
    this.lastTap = { t: now, side }; clearTimeout(this.tapT);
    this.tapT = setTimeout(() => { this.lastTap = null; this.toggleChrome(); }, side ? 320 : 0);
  },
  toggleChrome() {
    const s = $('#s-cours'), on = !s.classList.contains('immersif');
    s.classList.toggle('immersif', on); Frame.apply();
    if (on && !store.get('immersifVu', false)) { store.set('immersifVu', true); this.toast('Plein écran : touche l’image pour revenir'); }
  },
  tickUI() {
    if (!this.c) return;
    const total = this.total(), sc = this.scenes[this.i]; let cur = this.cum();
    if (sc) { cur += sc.sents.slice(0, Math.min(this.k, sc.sents.length)).reduce((a, x) => a + sEst(x), 0); if (this.playing && this.k < sc.sents.length) cur += Math.min(sEst(sc.sents[this.k]), performance.now() - this.kT0); }
    if (!$('#endcard').hidden) cur = total;
    $('#trackFill').style.width = (cur / total * 100).toFixed(2) + '%';
    $('#tCur').textContent = fmt(cur); $('#tTot').textContent = fmt(total);
  },
  bindUI() {
    // la barre : on glisse, un aperçu montre la scène visée, on lâche pour y aller
    const tr = $('#track'), tip = $('#trackTip');
    const aim = x => { const r = tr.getBoundingClientRect(), f = Math.max(0, Math.min(1, (x - r.left) / r.width)), target = f * this.total(); let a = 0, idx = 0; for (let k = 0; k < this.scenes.length; k++) { idx = k; if (a + est(this.scenes[k]) > target) break; a += est(this.scenes[k]); } return { idx, f, a }; };
    const showTip = x => { const { idx, f, a } = aim(x), sc = this.scenes[idx], ch = (this.c.chapitres || [])[sc.ch || 0]; tip.innerHTML = `<span>${esc(ch ? `Chapitre ${(sc.ch || 0) + 1} · ${ch}` : '')}</span><b>${esc(sc.titre || sc.eyebrow || '')}</b><em class="num">${fmt(a)}</em>`; tip.hidden = false; const w = tip.offsetWidth, r = tr.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(r.width - w - 4, f * r.width - w / 2)) + 'px'; return idx; };
    let scrubbing = false;
    tr.addEventListener('pointerdown', e => { scrubbing = true; tr.setPointerCapture(e.pointerId); showTip(e.clientX); tr.classList.add('scrub'); });
    tr.addEventListener('pointermove', e => { if (scrubbing) showTip(e.clientX); });
    const endScrub = e => { if (!scrubbing) return; scrubbing = false; tr.classList.remove('scrub'); tip.hidden = true; const { idx } = aim(e.clientX); Voice.unlock(); haptic(); this.go(idx, true); };
    tr.addEventListener('pointerup', endScrub); tr.addEventListener('pointercancel', () => { scrubbing = false; tip.hidden = true; tr.classList.remove('scrub'); });
    this.togglePlay = () => { Sound.ui('tap'); if (this.playing || this.mode === 'ralenti') { this.pause(); if (this.mode === 'ralenti') { this.mode = null; $('#s-cours').classList.remove('ralenti'); this.entered = -1; this.setPlaying(false); this.paintRail(); } } else { Voice.unlock(); if (isQuestion(this.scenes[this.i]) && this.answered === this.i) this.i = Math.min(this.i + 1, this.scenes.length - 1); this.play(); } };
    $('#cPlay').addEventListener('click', () => this.togglePlay());
    $('#playOver').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.play(); });
    $('#cPrev').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.go(this.i - 1); });
    $('#cNext').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); if (this.i >= this.scenes.length - 1) this.finish(); else this.go(this.i + 1); });
    const rates = [1, 1.25, 1.5, 0.85];
    $('#cRate').addEventListener('click', () => { Voice.rate = rates[(rates.indexOf(Voice.rate) + 1) % rates.length]; $('#cRate').textContent = String(Voice.rate).replace('.', ',') + '×'; });
    const paintVoice = () => { $('#cVoice').innerHTML = Voice.on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z"/><path d="M16.5 8.5 a5 5 0 0 1 0 7 M19 6 a8.5 8.5 0 0 1 0 12"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z"/><path d="M17 9 l5 6 M22 9 l-5 6"/></svg>'; $('#cVoice').setAttribute('aria-label', Voice.on ? 'Couper la voix' : 'Activer la voix'); };
    paintVoice();
    $('#cVoice').addEventListener('click', () => { Voice.setOn(!Voice.on); paintVoice(); if (this.playing) this.play(); });
    // gestes sur l'image : toucher (comprendre, plein écran), double toucher sur les côtés (phrase précédente / suivante),
    // glisser (explorer la scène en 3D), pincer ou molette (zoom)
    const v = $('#v-cours'), pts = new Map(); let drag = null, pinch = 0;
    const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    v.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0 };
      if (pts.size === 2) { pinch = gap(); if (drag) drag.moved = 99; if (this.mode !== 'explore') this.explore(true); }
      try { v.setPointerCapture(e.pointerId); } catch (_) {}
      if (R && R.setDrag) R.setDrag(true);
    });
    v.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const d = gap(); if (pinch > 0 && d > 0) this.zoom(pinch / d); pinch = d; return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (this.mode !== 'explore' && drag.moved > 26 && has3D && this.c) this.explore(true);
      if (this.mode === 'explore') this.turn(dx, dy);
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (!pts.size) { if (drag && drag.moved < 10 && e.type === 'pointerup') this.tap(e.clientX, e.clientY); drag = null; pinch = 0; if (R && R.setDrag) R.setDrag(false); }
    };
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    v.addEventListener('wheel', e => { if (currentScreen() !== 'cours') return; e.preventDefault(); if (this.mode !== 'explore') this.explore(true); this.zoom(1 + Math.max(-0.4, Math.min(0.4, e.deltaY * 0.0015))); }, { passive: false });
    // la barre d'outils
    View.cam = store.get('vue', null);
    $('#rView').addEventListener('click', () => this.cycleView());
    $('#rExplore').addEventListener('click', () => { if (this.mode === 'explore') { Voice.unlock(); this.explore(false, true); } else this.explore(true); });
    $('#rSlow').addEventListener('click', () => { if (this.mode === 'ralenti') return this.togglePlay(); this.slowReplay(); });
    $('#rNote').addEventListener('click', () => this.toggleNote());
    $('#exploreGo').addEventListener('click', () => { Voice.unlock(); this.explore(false, true); });
    $('#exploreHome').addEventListener('click', () => { haptic(); if (inSim()) { SIM.orbit(700); } if (R && R.explore) { R.explore(false); setTimeout(() => this.mode === 'explore' && R.explore(true), 500); } });
    // le texte du cours : une feuille, comme les chapitres
    const txt = on => { const sh = $('#txtSheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.toggle('on', on)); if (on) { this.txtAt = null; setTimeout(() => this.paintText(), 360); } else setTimeout(() => { if (!sh.classList.contains('on')) sh.hidden = true; }, 320); };
    $('#rText').addEventListener('click', () => { haptic(); Sound.ui('tap'); txt(true); });
    $('#txtClose').addEventListener('click', () => txt(false));
    $('#txtList').addEventListener('click', e => { const b = e.target.closest('.tx-s'); if (!b) return; Voice.unlock(); haptic(); txt(false); this.goTo(+b.dataset.i, +b.dataset.k); });
    this.closeText = () => txt(false);
    // au clavier (ordinateur) : espace, flèches
    document.addEventListener('keydown', e => {
      if (currentScreen() !== 'cours' || e.target.closest('input, textarea')) return;
      if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
      else if (e.key === 'ArrowLeft') { Voice.unlock(); this.seek(-1); } else if (e.key === 'ArrowRight') { Voice.unlock(); this.seek(1); }
      else if (e.key === 'Escape') { if (this.info) this.closeInfo(); else if (this.mode === 'explore') this.explore(false, true); }
    });
    // chapitres : une feuille qui monte du bas
    const chap = on => { const sh = $('#chapSheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.toggle('on', on)); $('#cChapBtn').setAttribute('aria-expanded', on); if (!on) setTimeout(() => { if (!sh.classList.contains('on')) sh.hidden = true; }, 320); };
    $('#cChapBtn').addEventListener('click', () => { haptic(); Sound.ui('tap'); chap(!$('#chapSheet').classList.contains('on')); });
    $('#chapClose').addEventListener('click', () => chap(false));
    $('#chapters').addEventListener('click', e => { if (e.target.closest('button')) chap(false); });
    this.closeChapters = () => chap(false);
    const loop = () => { if (currentScreen() === 'cours') { this.tickUI(); this.fitTitle(); Labels.frame($('#caption').hidden ? $('#s-cours .dock') : $('#caption')); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
};
/* pour les tests automatisés du lecteur */
if (typeof window !== 'undefined' && window.__expose) window.__lecteur = { Player, Live, Engine, SIM, View, Voice };
