/* Moteur de séries : entraînement (correction immédiate) ou examen (chrono 20 s, correction à la fin).
   Types de questions : qcm (une ou plusieurs bonnes réponses, avec ou sans panneaux) et association. */
import { $, $$, esc, shuffle, haptic } from './util.js';
import { R } from './world.js';
import { sign, meta } from './signs.js';
import { QUESTIONS, SERIES, course, courseNumber, questionTheme, THEMES } from './content.js';
import { answer as leitner, saveSeries, saveExam, vues } from './progress.js';
import { diagHTML } from './diagnostic.js';
import { lexify } from './lexique.js';
import { bindPieges } from './piege.js';
import { Voice } from './voice.js';
import { Sound } from './sound.js';
import { show, syncRegion } from './nav.js';
import { plot, react, line } from './mascot.js';

let onDone = () => {};
export const setSerieDone = f => { onDone = f; };
const PAIR_COLORS = ['#1F5BFF', '#FF7A1A', '#D7263D', '#12A150', '#8B5CF6'];

/* Examen : questions tirées dans toute la banque, en alternant les thèmes ; dans chaque thème, les moins vues d'abord */
export function drawExam(n = 20) {
  const byTheme = {}, vu = vues();
  shuffle([...QUESTIONS.values()]).sort((a, b) => vu(a.id) - vu(b.id)).forEach(q => { const t = questionTheme(q) || 'autre'; (byTheme[t] = byTheme[t] || []).push(q.id); });
  const lists = Object.values(byTheme), out = [];
  while (out.length < n && lists.some(l => l.length)) lists.forEach(l => { if (l.length && out.length < n) out.push(l.shift()); });
  return shuffle(out);
}

export const Serie = {
  cfg: null, i: 0, answers: [], sel: [], timer: null, deadline: 0, lastTick: 0, locked: false, pairs: null, pick: null,
  async start(cfg) {
    // cfg : { titre, ids, mode: 'entrainement' | 'examen', serieId?, examen?, retour?, retourArg? }
    this.cfg = Object.assign({ mode: 'entrainement' }, cfg);
    this.cfg.ids = this.cfg.ids.filter(id => QUESTIONS.has(id));
    if (!this.cfg.ids.length) return;
    this.i = 0; this.answers = [];
    Voice.unlock();
    await show('serie', { force: true });
    $('#sRes').hidden = true; $('#sRun').hidden = false; $('#v-serie').hidden = false;
    $('#s-serie').classList.remove('res');
    $('#sDots').innerHTML = this.cfg.ids.map(() => '<i></i>').join('');
    $('#sDots').style.gridTemplateColumns = `repeat(${this.cfg.ids.length},1fr)`;
    $('#sTimer').hidden = this.cfg.mode !== 'examen';
    this.showQ();
  },
  get q() { return QUESTIONS.get(this.cfg.ids[this.i]); },
  showQ() {
    const q = this.q, n = this.cfg.ids.length;
    this.sel = []; this.locked = false; this.pairs = {}; this.pick = null; this.tShow = performance.now();
    $('#sEyebrow').textContent = `${this.cfg.mode === 'examen' ? 'Examen' : 'Entraînement'} · ${this.cfg.titre}`;
    $('#sTitle').innerHTML = `<span class="ex-q num">Question ${this.i + 1}</span><span class="ex-of num">/ ${n}</span>`;
    $$('#sDots i').forEach((d, k) => { d.className = k < this.i ? 'past' : k === this.i ? 'cur' : ''; });
    // en entraînement, les mots du lexique sont soulignés : un toucher les explique (pas à l'examen, comme le jour J)
    if (this.cfg.mode === 'examen') $('#sText').textContent = q.q; else $('#sText').innerHTML = lexify(q.q, esc);
    $('#sFb').hidden = true; $('#sFb').innerHTML = '';
    const ok = $('#sOk'); ok.textContent = 'Valider'; ok.disabled = true; ok.onclick = () => this.validate();
    if (q.type === 'association') this.renderAssoc(q); else this.renderQcm(q);
    $('#v-serie').hidden = q.type === 'association';
    $('#s-serie').classList.toggle('flat', q.type === 'association');
    requestAnimationFrame(syncRegion);
    R.exam(q.panneaux || []);
    Voice.stop(); Voice.say(q.q);
    $('#s-serie').scrollTop = 0;
    clearInterval(this.timer);
    if (this.cfg.mode === 'examen') { this.deadline = performance.now() + 20000; this.lastTick = 99; this.timer = setInterval(() => this.tick(), 100); this.tick(); }
  },
  renderQcm(q) {
    $('#sHint').textContent = q.bonnes.length > 1 ? 'Plusieurs réponses : coche-les toutes' : 'Une seule réponse';
    $('#sOpts').className = 'ex-opts';
    $('#sOpts').innerHTML = q.choix.map((o, k) => `<button class="ex-opt" data-k="${k}" aria-pressed="false"><i>${'ABCD'[k]}</i><span>${esc(o)}</span></button>`).join('');
    $$('#sOpts .ex-opt').forEach(b => b.addEventListener('click', () => this.toggle(+b.dataset.k)));
  },
  renderAssoc(q) {
    $('#sHint').textContent = 'Touche un panneau, puis son sens';
    this.order = shuffle(q.paires.map((p, k) => k));
    $('#sOpts').className = 'assoc';
    $('#sOpts').innerHTML = `<div class="acol">${q.paires.map((p, k) => `<button class="aitem sign" data-l="${k}">${sign(p[0])}<code>${esc(meta(p[0]).code)}</code></button>`).join('')}</div>
      <div class="acol">${this.order.map(k => `<button class="aitem txt" data-r="${k}"><span>${esc(q.paires[k][1])}</span></button>`).join('')}</div>`;
    $$('#sOpts [data-l]').forEach(b => b.addEventListener('click', () => this.assocTap('l', +b.dataset.l)));
    $$('#sOpts [data-r]').forEach(b => b.addEventListener('click', () => this.assocTap('r', +b.dataset.r)));
  },
  assocTap(side, k) {
    if (this.locked) return;
    haptic(); Sound.ui('tap');
    if (side === 'l') {
      if (this.pairs[k] !== undefined) { delete this.pairs[k]; this.pick = null; }
      else this.pick = this.pick === k ? null : k;
    } else {
      const owner = Object.keys(this.pairs).find(l => this.pairs[l] === k);
      if (owner !== undefined) delete this.pairs[owner];
      else if (this.pick !== null) { this.pairs[this.pick] = k; this.pick = null; Sound.ui('pair'); }
    }
    this.paintAssoc();
  },
  paintAssoc() {
    const q = this.q;
    $$('#sOpts [data-l]').forEach(b => { const l = +b.dataset.l, r = this.pairs[l]; b.classList.toggle('picked', this.pick === l); b.style.setProperty('--pc', r !== undefined ? PAIR_COLORS[l % PAIR_COLORS.length] : 'transparent'); b.classList.toggle('paired', r !== undefined); });
    $$('#sOpts [data-r]').forEach(b => { const r = +b.dataset.r; const l = Object.keys(this.pairs).find(x => this.pairs[x] === r); b.style.setProperty('--pc', l !== undefined ? PAIR_COLORS[l % PAIR_COLORS.length] : 'transparent'); b.classList.toggle('paired', l !== undefined); });
    $('#sOk').disabled = Object.keys(this.pairs).length !== q.paires.length;
  },
  tick() {
    const ms = Math.max(0, this.deadline - performance.now()), s = Math.ceil(ms / 1000);
    $('#sSec').textContent = s;
    $('#sRing').style.strokeDashoffset = (150.8 * (1 - ms / 20000)).toFixed(1);
    $('#sTimer').classList.toggle('hurry', ms < 5000);
    if (ms < 5000 && s !== this.lastTick && s > 0) { this.lastTick = s; Sound.ui('tick'); }
    if (ms <= 0) this.validate();
  },
  toggle(k) {
    if (this.locked || performance.now() - this.tShow < 380) return;   // un double appui sur « Valider » ne coche rien ici
    haptic(); Sound.ui('tap');
    const multi = this.q.bonnes.length > 1;
    this.sel = multi ? (this.sel.includes(k) ? this.sel.filter(x => x !== k) : [...this.sel, k]) : [k];
    $$('#sOpts .ex-opt').forEach((b, j) => b.setAttribute('aria-pressed', String(this.sel.includes(j))));
    $('#sOk').disabled = this.sel.length === 0;
  },
  isRight(q, given) {
    if (q.type === 'association') return q.paires.every((p, k) => given[k] === k);
    return JSON.stringify([...q.bonnes].sort()) === JSON.stringify([...given].sort());
  },
  validate() {
    if (this.locked) return;
    clearInterval(this.timer); Voice.stop();
    const q = this.q;
    const given = q.type === 'association' ? Object.assign({}, this.pairs) : [...this.sel].sort();
    const ok = this.isRight(q, given);
    this.answers.push({ id: q.id, given, ok });
    leitner(q.id, ok);
    if (this.cfg.mode === 'examen') return this.advance();
    // Entraînement : correction tout de suite
    this.locked = true;
    haptic(ok ? 'ok' : 'ko'); Sound.ui(ok ? 'ok' : 'ko');
    if (q.type === 'association') {
      $$('#sOpts [data-l]').forEach(b => { const l = +b.dataset.l; b.classList.add(given[l] === l ? 'good' : 'bad'); });
    } else {
      $$('#sOpts .ex-opt').forEach((b, j) => { if (q.bonnes.includes(j)) b.classList.add('good'); else if (given.includes(j)) b.classList.add('bad'); });
    }
    const right = q.type === 'association' ? q.paires.map(p => `${meta(p[0]).code} → ${p[1]}`).join(' · ') : '';
    $('#sFb').hidden = false;
    const cq = !ok && q.cours && course(q.cours);
    $('#sFb').innerHTML = `<div class="fbrow">${plot({ size: 62, pose: ok ? 'pouce' : 'decu' })}<div><b style="color:${ok ? 'var(--vert)' : 'var(--rouge-t)'}">${line(ok)}</b> ${esc(q.explication || '')}${!ok && right ? `<br><span class="small">${esc(right)}</span>` : ''}${cq && cq.piege ? `<p class="fb-piege"><b>Le piège :</b> ${esc(cq.piege[0])}</p>` : ''}${cq ? `<button class="fb-cours" data-go="fiche" data-arg="${esc(cq.id)}">Revoir le cours ${courseNumber(cq)} · ${esc(cq.titre)}</button>` : ''}</div></div>`;
    react($('#sFb'), ok);
    Voice.say(ok ? 'Bonne réponse.' : (q.explication || 'Raté.'));
    const btn = $('#sOk'); btn.disabled = false; btn.textContent = this.i < this.cfg.ids.length - 1 ? 'Question suivante' : 'Voir mon score'; btn.onclick = () => this.advance();
    $('#sFb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  advance() {
    this.i++;
    if (this.i < this.cfg.ids.length) { Sound.ui('whoosh'); this.showQ(); } else this.results();
  },
  results() {
    clearInterval(this.timer);
    $('#sRun').hidden = true; $('#sTimer').hidden = true; $('#v-serie').hidden = true; $('#s-serie').classList.add('res'); $('#s-serie').classList.remove('flat');
    R.clearExam();
    const n = this.answers.filter(a => a.ok).length, total = this.answers.length, exam = this.cfg.mode === 'examen';
    const pass = n / total >= 35 / 40;
    if (this.cfg.serieId) saveSeries(this.cfg.serieId, n, total);
    if (this.cfg.examen) saveExam(n, total);
    haptic(pass ? 'ok' : 'ko'); Sound.ui(pass ? 'ok' : 'ko');
    Voice.say(`${n} sur ${total}.`);
    $('#sEyebrow').textContent = `Résultat · ${this.cfg.titre}`;
    $('#sTitle').textContent = pass ? (exam ? 'Reçu' : 'Maîtrisé') : 'Encore un tour';
    const wrong = this.answers.filter(a => !a.ok).map(a => a.id);
    const r = $('#sRes'); r.hidden = false;
    r.innerHTML = `<div class="plot-hero"><div class="score"><b class="num">${n}</b><span class="num">/ ${total}</span></div>${plot({ size: 92, pose: pass ? (exam ? 'trophee' : 'joie') : 'decu', bubble: pass ? (exam ? 'Niveau jour J !' : 'Série en poche !') : 'On s’y remet ensemble ?' })}</div>
      <span class="vpill ${pass ? 'ok' : 'ko'}">${exam ? (pass ? 'Niveau jour J atteint' : 'Pas encore le niveau jour J') : (pass ? 'Série réussie' : `${total - n} erreur${total - n > 1 ? 's' : ''} à revoir`)}</span>
      <p class="small">${exam ? `Le jour J, il faut 87,5 % de bonnes réponses (35/40). Ici : ${Math.round(n / total * 100)} %.` : 'Tes erreurs rejoignent la pile « À revoir » : elles reviendront jusqu’à ce que tu les maîtrises.'}</p>
      ${diagHTML(this.answers.map(a => ({ ok: a.ok, cours: (QUESTIONS.get(a.id) || {}).cours })))}
      <ul class="corr">${this.answers.map((a, k) => { const q = QUESTIONS.get(a.id); const mini = q.type === 'association' ? q.paires.map(p => sign(p[0])).join('') : (q.panneaux || []).map(id => sign(id)).join(''); const ans = q.type === 'association' ? '' : `<div class="ans">Ta réponse : ${a.given.length ? a.given.map(j => 'ABCD'[j]).join(' + ') : 'aucune'} · Bonne réponse : ${q.bonnes.map(j => 'ABCD'[j]).join(' + ')}</div>`; return `<li class="glass ${a.ok ? 'ok' : 'ko'}"><div class="mini ${(q.paires || q.panneaux || []).length > 1 ? 'pair' : ''}">${mini || '<i class="memo-dot"></i>'}</div><div><b>${k + 1}. ${esc(q.q)}</b>${ans}<p>${esc(q.explication || '')}</p></div></li>`; }).join('')}</ul>
      ${wrong.length ? `<button class="btn" id="sRetry">Refaire mes ${wrong.length} erreur${wrong.length > 1 ? 's' : ''}</button>` : ''}
      <button class="btn ${wrong.length ? 'ghost sm' : ''}" id="sAgain">Recommencer</button>
      <button class="btn ghost sm" id="sBack">Terminer</button>`;
    if (wrong.length) $('#sRetry').addEventListener('click', () => this.start(Object.assign({}, this.cfg, { ids: wrong, titre: 'Mes erreurs', serieId: null, examen: false, mode: 'entrainement' })));
    $('#sAgain').addEventListener('click', () => this.start(Object.assign({}, this.cfg, { ids: this.cfg.examen ? drawExam(this.cfg.ids.length) : shuffle(this.cfg.ids) })));
    $('#sBack').addEventListener('click', () => onDone(this.cfg));
    $('#s-serie').scrollTop = 0;
    bindPieges(r);
    react(r, pass);
  },
  stop() { clearInterval(this.timer); Voice.stop(); }
};
