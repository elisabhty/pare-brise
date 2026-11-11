/* Pare-brise : conduite réflexe en 3D, mesure de la distance de reconnaissance. */
import { $, $$, store, haptic } from './util.js';
import { has3D, Engine, R } from './world.js';
import { sign, meta, FAM, REFLEX_POOL, triUp, ring, disc, square, losange, endDisc, bars } from './signs.js';
import { Voice } from './voice.js';
import { Sound } from './sound.js';
import { currentScreen } from './nav.js';
import { plot, react } from './mascot.js';

const FAMS = ['danger', 'interdiction', 'obligation', 'indication', 'priorite', 'fin'];
const icon = f => `<svg viewBox="0 0 100 100">${({ danger: triUp(), interdiction: ring(), obligation: disc(), indication: square(), priorite: losange(), fin: endDisc() + bars() })[f]}</svg>`;

export const Reflex = {
  N: 12, running: false, cur: null, k: 0, score: 0, combo: 0, good: 0, times: [], dists: [], prev: null, kmh: 70, spawnAt: 0,
  init(onEnd) {
    this.onEnd = onEnd || (() => {});
    $('#pbBtns').innerHTML = FAMS.map(f => `<button class="fam-btn" data-f="${f}">${icon(f)}${FAM[f].n}</button>`).join('');
    $$('#pbBtns .fam-btn').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); this.pick(b.dataset.f, b); }));
    this.intro(); this.paintBest();
    if (has3D) { Engine.on('pass', h => this.passed(h)); Engine.onFrame(() => this.frame()); }
    else { R.onPass(h => this.passed(h)); const f = () => { this.frame(); requestAnimationFrame(f); }; requestAnimationFrame(f); }
  },
  intro() {
    const o = $('#pbOver'); o.hidden = false;
    o.innerHTML = `${plot({ size: 84, mood: 'loop', bubble: 'On roule ?' })}<h3 class="d">Prêt à rouler ?</h3><p>Les panneaux arrivent sur le bas-côté. Tape leur famille le plus tôt possible : plus tu les reconnais de loin, plus tu marques.</p><button class="btn" id="pbGo">Démarrer</button>`;
    $('#pbGo').addEventListener('click', () => this.start());
  },
  paintBest() { const b = store.get('reflexBest', null); $('#pbBest').innerHTML = b ? `<span>Record <b class="num">${b.score}</b></span><span>Série <b class="num">${b.good}/${this.N}</b></span><span>Reconnu à <b class="num">${b.dist} m</b></span>` : `<span>Pas encore de record</span><span>Objectif : reconnaître à plus de 40 m</span>`; },
  start() {
    Voice.unlock(); Sound.ui('tap');
    $('#pbOver').hidden = true;
    Object.assign(this, { k: 0, score: 0, combo: 0, good: 0, times: [], dists: [], cur: null, running: true, prev: null, kmh: 70, spawnAt: performance.now() + 1400 });
    R.clearMoving(); R.setHood(true); R.pose('reflex', 900); R.setSpeed(this.kmh, 8);
    this.hud();
  },
  spawn() {
    let id; do { id = REFLEX_POOL[Math.floor(Math.random() * REFLEX_POOL.length)]; } while (id === this.prev);
    this.prev = id;
    this.cur = { id, h: R.spawn(id, { z: -82 }), born: performance.now(), done: false };
  },
  frame() {
    if (currentScreen() !== 'parebrise') return;
    $('#pbKmh').textContent = R.kmh;
    if (!this.running) return;
    if (!this.cur && performance.now() > this.spawnAt) { if (this.k >= this.N) return this.end(); this.spawn(); this.hud(); }
  },
  passed(h) {
    if (!this.running || !this.cur || h !== this.cur.h) return;
    if (!this.cur.done) { this.combo = 0; const m = meta(this.cur.id); this.toast(`<b>Trop tard</b> · ${m.n} : ${FAM[m.reflex].n.toLowerCase()}`, 'ko'); haptic('ko'); Sound.ui('ko'); }
    else Sound.ui('pass');
    this.cur = null; this.k++; this.spawnAt = performance.now() + 450; this.hud();
  },
  pick(f, btn) {
    Sound.init();
    if (!this.running || !this.cur || this.cur.done) return;
    const m = meta(this.cur.id), ok = f === m.reflex || f === m.also;
    const ms = Math.round(performance.now() - this.cur.born), dist = Math.round(this.cur.h.dist);
    this.cur.done = true; this.cur.h.flash(ok ? 0x34c77b : 0xff5a6e);
    btn.classList.add(ok ? 'ok' : 'ko'); setTimeout(() => btn.classList.remove('ok', 'ko'), 380);
    if (ok) {
      this.good++; this.combo++; this.times.push(ms); this.dists.push(dist);
      this.score += 100 + dist * 4 + (this.combo > 1 ? this.combo * 15 : 0);
      this.kmh = Math.min(130, this.kmh + 6); R.setSpeed(this.kmh, 6);
      this.toast(`<b>${FAM[f].n}</b> · ${m.n} · reconnu à ${dist} m`, 'ok'); haptic('ok'); Sound.ui('ok');
    } else {
      this.combo = 0; this.kmh = Math.max(60, this.kmh - 10); R.setSpeed(this.kmh, 10);
      this.toast(`<b>Raté</b> · ${m.n} : ${FAM[m.reflex].n.toLowerCase()} (${FAM[m.reflex].rule})`, 'ko'); haptic('ko'); Sound.ui('ko');
    }
    this.hud();
  },
  toast(html, kind) { const t = $('#pbToast'); t.innerHTML = html; t.className = 'toast glass show ' + kind; clearTimeout(this._t); this._t = setTimeout(() => { t.className = 'toast glass'; }, 1600); },
  hud() { $('#pbScore').textContent = this.score + ' PT' + (this.combo > 1 ? ` · ×${this.combo}` : ''); $('#pbCount').textContent = Math.min(this.k + (this.cur ? 1 : 0), this.N) + '/' + this.N; },
  end() {
    this.running = false; R.setSpeed(0, 7);
    const avg = this.times.length ? Math.round(this.times.reduce((a, b) => a + b, 0) / this.times.length) : 0;
    const dist = this.dists.length ? Math.round(this.dists.reduce((a, b) => a + b, 0) / this.dists.length) : 0;
    const prev = store.get('reflexBest', null);
    if (!prev || this.score > prev.score) store.set('reflexBest', { score: this.score, good: this.good, ms: avg, dist });
    const o = $('#pbOver'); o.hidden = false;
    o.innerHTML = `${plot({ size: 84, bubble: dist >= 40 ? 'Quel coup d’œil !' : 'On y retourne ?' })}<h3 class="d">${this.good}/${this.N} panneaux</h3><div class="row"><div><b class="num">${dist || '–'} m</b><span>reconnu à</span></div><div><b class="num">${avg ? avg + ' ms' : '–'}</b><span>réflexe moyen</span></div><div><b class="num">${this.score}</b><span>score</span></div></div><p>${dist >= 40 ? 'Tu lis la route de loin. C’est exactement le réflexe du jour J.' : 'Vise la forme d’abord : elle se voit avant le dessin.'}</p><button class="btn" id="pbGo">Rejouer</button>`;
    $('#pbGo').addEventListener('click', () => this.start());
    this.paintBest(); this.onEnd(); Sound.ui('ok'); react(o, dist >= 40);
  },
  stop() { this.running = false; this.cur = null; R.clearMoving(); R.setHood(false); this.intro(); }
};
