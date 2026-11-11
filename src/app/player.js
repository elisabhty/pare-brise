/* Lecteur de cours générique : lit n'importe quel cours JSON, scène par scène. */
import { $, $$, esc, wait, fmt, haptic } from './util.js';
import { has3D, Engine, R } from './world.js';
import { sign, FAM } from './signs.js';
import { course, courseNumber, COURSES, EXOS } from './content.js';
import { saveCourse } from './progress.js';
import { Voice, splitSentences, estimate, sayTimed } from './voice.js';
import { Sound } from './sound.js';
import { Labels } from './labels.js';
import { TYPES, ov, isQuestion } from './scenes.js';
import { show, currentScreen } from './nav.js';
import { plot, react, line } from './mascot.js';

let onSerie = () => {}, onHome = () => {};
export const setPlayerLinks = (serieFn, homeFn) => { onSerie = serieFn; onHome = homeFn; };

const est = sc => sc.sents.reduce((a, s) => a + estimate(s) + 180, 0) + (isQuestion(sc) ? 0 : 450);

export const Player = {
  c: null, scenes: [], i: 0, tok: 0, sceneTok: 0, playing: false, t0: 0, started: false, answered: -1,
  load(id, startAt = 0) {
    const c = course(id); if (!c) return;
    this.tok++; this.sceneTok++; Voice.stop();
    this.c = c; this.scenes = c.scenes.map(s => Object.assign({}, s, { sents: splitSentences(s.dire || '') }));
    this.i = Math.max(0, Math.min(this.scenes.length - 1, startAt)); this.started = false; this.answered = -1;
    $('#cTitle').textContent = `Cours ${courseNumber(c)} · ${c.titre}`;
    $('#endcard').hidden = true;
    this.renderChapters();
    this.enterScene(this.i); this.setPlaying(false);
  },
  total() { return this.scenes.reduce((a, s) => a + est(s), 0); },
  cum() { let t = 0; for (let k = 0; k < this.i; k++) t += est(this.scenes[k]); return t; },
  renderChapters() {
    const ch = this.c.chapitres || ['Cours'];
    $('#chapters').innerHTML = ch.map((n, k) => { const d = this.scenes.filter(s => (s.ch || 0) === k).reduce((a, s) => a + est(s), 0); return `<li><button data-ch="${k}"><span class="cn">${k + 1}</span><b>${esc(n)}</b><small class="num">${fmt(d)}</small></button></li>`; }).join('');
    $$('#chapters button').forEach(b => b.addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.go(this.scenes.findIndex(s => (s.ch || 0) === +b.dataset.ch), true); }));
    const total = this.total(); let acc = 0, html = '<div class="fill" id="trackFill"></div>';
    this.scenes.forEach((s, k) => { if (k > 0 && (s.ch || 0) !== (this.scenes[k - 1].ch || 0)) html += `<i class="tick" style="left:${(acc / total * 100).toFixed(2)}%"></i>`; acc += est(s); });
    $('#track').innerHTML = html;
  },
  enterScene(i) {
    const sc = this.scenes[i];
    const tok = ++this.sceneTok;
    ov.clear(); Labels.clear();
    const chs = this.c.chapitres || ['Cours'];
    $('#cChap').textContent = `Chapitre ${(sc.ch || 0) + 1} / ${chs.length}`;
    $$('#chapters li').forEach((li, k) => { li.classList.toggle('cur', k === (sc.ch || 0)); if (k < (sc.ch || 0)) li.classList.add('seen'); });
    this.caption(sc, -1);
    $('#quiz').hidden = true;
    this.answered = -1;
    const ctx = { live: () => tok === this.sceneTok && currentScreen() === 'cours' };
    const T = TYPES[sc.type];
    if (T) T.enter(sc, ctx);
    if (isQuestion(sc)) this.showQuiz(sc);
    saveCourse(this.c.id, { scene: i });
  },
  /* sous-titres façon vidéo : une seule phrase à la fois, posée sur l'image */
  caption(sc, k) { const el = $('#caption'), s = sc.sents[Math.max(0, Math.min(k, sc.sents.length - 1))] || ''; el.innerHTML = s ? `<span>${esc(s)}</span>` : ''; el.classList.toggle('wait', k < 0); el.hidden = !s || !this.started; },
  setPlaying(p) {
    this.playing = p;
    $('#cPlay').innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2"/><rect x="14" y="4" width="5" height="16" rx="1.2"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4 L20 12 L7 20 Z"/></svg>';
    $('#cPlay').setAttribute('aria-label', p ? 'Pause' : 'Lecture');
    $('#playOver').hidden = p || isQuestion(this.scenes[this.i]);
    $('#playOverTxt').textContent = this.started ? 'Reprendre' : 'Lancer la séance';
  },
  play() { this.started = true; $('#endcard').hidden = true; this.setPlaying(true); const tok = ++this.tok; this.enterScene(this.i); this.t0 = performance.now(); this.run(tok); },
  pause() { this.tok++; Voice.stop(); Sound.duck(false); this.setPlaying(false); },
  go(i, autoplay = this.playing) {
    this.tok++; Voice.stop();
    this.i = Math.max(0, Math.min(this.scenes.length - 1, i));
    $('#endcard').hidden = true;
    if (autoplay) this.play(); else { this.enterScene(this.i); this.setPlaying(false); }
  },
  async run(tok) {
    const sc = this.scenes[this.i], start = performance.now();
    const live = () => tok === this.tok;
    for (let k = 0; k < sc.sents.length; k++) {
      if (!live()) return;
      this.caption(sc, k);
      Sound.duck(true); await sayTimed(sc.sents[k], live); Sound.duck(false);
      if (!live()) return;
      await wait(180);
    }
    if (!live()) return;
    this.caption(sc, sc.sents.length);
    if (isQuestion(sc)) return;
    const rest = (sc.min || 4.5) * 1000 - (performance.now() - start);
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
    this.tok++; this.setPlaying(false); $('#playOver').hidden = true;
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
      ${pr ? `<div class="end-pr"><span class="eyebrow">Deuxième partie</span><b>Passe à la pratique</b><p>${pr.situations.length} situations sur la route, en 3D, pour appliquer tout ce que tu viens de voir.</p><button class="btn" id="endSerie">Lancer la pratique</button></div>` : ''}
      ${nxt ? `<button class="btn ghost sm" id="endNext">Cours suivant →</button>` : ''}
      <button class="btn ghost sm" id="endHome">Retour au parcours</button>`;
    if (pr) $('#endSerie').addEventListener('click', () => onSerie(pr.id));
    if (nxt) $('#endNext').addEventListener('click', () => { Voice.unlock(); this.load(nxt.id); this.play(); });
    $('#endHome').addEventListener('click', () => onHome());
    e.scrollTop = 0; $('#caption').hidden = true;
    setTimeout(() => react(e, true), 500);
    Sound.ui('ok');
  },
  tickUI() {
    if (!this.c) return;
    const total = this.total(); let cur = this.cum();
    if (this.playing) cur += Math.min(est(this.scenes[this.i]), performance.now() - this.t0);
    if (!$('#endcard').hidden) cur = total;
    $('#trackFill').style.width = (cur / total * 100).toFixed(2) + '%';
    $('#tCur').textContent = fmt(cur); $('#tTot').textContent = fmt(total);
  },
  bindUI() {
    $('#track').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(), target = (e.clientX - r.left) / r.width * this.total(); let a = 0, idx = 0; for (let k = 0; k < this.scenes.length; k++) { idx = k; if (a + est(this.scenes[k]) > target) break; a += est(this.scenes[k]); } Voice.unlock(); this.go(idx, true); });
    $('#cPlay').addEventListener('click', () => { Sound.ui('tap'); if (this.playing) this.pause(); else { Voice.unlock(); if (isQuestion(this.scenes[this.i]) && this.answered === this.i) this.i = Math.min(this.i + 1, this.scenes.length - 1); this.play(); } });
    $('#playOver').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.play(); });
    $('#cPrev').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); this.go(this.i - 1); });
    $('#cNext').addEventListener('click', () => { Voice.unlock(); Sound.ui('tap'); if (this.i >= this.scenes.length - 1) this.finish(); else this.go(this.i + 1); });
    const rates = [1, 1.25, 1.5, 0.85];
    $('#cRate').addEventListener('click', () => { Voice.rate = rates[(rates.indexOf(Voice.rate) + 1) % rates.length]; $('#cRate').textContent = String(Voice.rate).replace('.', ',') + '×'; });
    const paintVoice = () => { $('#cVoice').innerHTML = Voice.on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z"/><path d="M16.5 8.5 a5 5 0 0 1 0 7 M19 6 a8.5 8.5 0 0 1 0 12"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z"/><path d="M17 9 l5 6 M22 9 l-5 6"/></svg>'; $('#cVoice').setAttribute('aria-label', Voice.on ? 'Couper la voix' : 'Activer la voix'); };
    paintVoice();
    $('#cVoice').addEventListener('click', () => { Voice.setOn(!Voice.on); paintVoice(); if (this.playing) this.play(); });
    $('#v-cours').addEventListener('click', e => {
      const sc = this.scenes[this.i];
      if (!sc || sc.type !== 'touche' || this.answered === this.i || e.target.closest('button')) return;
      if (has3D) { const k = Engine.pick(e.clientX, e.clientY); if (k !== null && k >= 0) this.answer(k); }
      else { const s = e.target.closest('[data-k]'); if (s) this.answer(+s.dataset.k); }
    });
    // chapitres : une feuille qui monte du bas
    const chap = on => { const sh = $('#chapSheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.toggle('on', on)); $('#cChapBtn').setAttribute('aria-expanded', on); if (!on) setTimeout(() => { if (!sh.classList.contains('on')) sh.hidden = true; }, 320); };
    $('#cChapBtn').addEventListener('click', () => { haptic(); Sound.ui('tap'); chap(!$('#chapSheet').classList.contains('on')); });
    $('#chapClose').addEventListener('click', () => chap(false));
    $('#chapters').addEventListener('click', e => { if (e.target.closest('button')) chap(false); });
    this.closeChapters = () => chap(false);
    const loop = () => { if (currentScreen() === 'cours') { this.tickUI(); Labels.frame($('#caption').hidden ? $('#s-cours .dock') : $('#caption')); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
};
