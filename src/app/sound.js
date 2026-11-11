/* Son génératif (Web Audio) : ambiances et effets, aucun fichier. */
import { store } from './util.js';

export const Sound = {
  ctx: null, master: null, on: store.get('sound', true), amb: null, ambKind: null, duckG: null, wantAmb: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.9 : 0; this.master.connect(this.ctx.destination);
      this.duckG = this.ctx.createGain(); this.duckG.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      this.brown = b;
      const wb = this.ctx.createBuffer(1, len, this.ctx.sampleRate), wd = wb.getChannelData(0); for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
      this.white = wb;
      if (this.wantAmb) { const k = this.wantAmb; this.ambKind = null; this.ambience(k); }
    } catch (e) { this.ctx = null; }
  },
  setOn(v) { this.on = v; store.set('sound', v); if (this.master) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05); },
  tone(f, dur, type = 'sine', g = 0.08, slide = 0, delay = 0) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay;
    const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, f0, f1, g = 0.08, q = 1.2) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.white;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = c.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + dur * 0.3); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(a).connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  ui(k) {
    if (!this.ctx) return;
    switch (k) {
      case 'tap': this.tone(1400, 0.045, 'sine', 0.04); break;
      case 'ok': this.tone(660, 0.16, 'triangle', 0.08); this.tone(990, 0.3, 'triangle', 0.07, 0, 0.09); break;
      case 'ko': this.tone(196, 0.28, 'sawtooth', 0.035, 0.7); break;
      case 'rise': this.tone(240, 0.55, 'sine', 0.045, 2.3); this.noise(0.5, 400, 2400, 0.02, 2); break;
      case 'neon': this.noise(1.2, 300, 5000, 0.025, 6); this.tone(110, 1.1, 'sine', 0.03, 1.5); break;
      case 'sit': this.tone(70, 0.35, 'sine', 0.16, 0.6); this.noise(0.25, 200, 120, 0.05, 1); break;
      case 'whoosh': this.noise(0.7, 2500, 300, 0.06, 1.5); break;
      case 'tick': this.tone(1700, 0.03, 'square', 0.018); break;
      case 'pass': this.noise(0.45, 1800, 400, 0.05, 2); break;
      case 'pair': this.tone(880, 0.1, 'triangle', 0.05); break;
    }
  },
  ambience(kind) {
    this.wantAmb = kind;
    if (!this.ctx || this.ambKind === kind) return;
    const c = this.ctx;
    if (this.amb) { const old = this.amb; old.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); setTimeout(() => old.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 1500); this.amb = null; }
    this.ambKind = kind;
    if (!kind) return;
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(this.duckG);
    const nodes = [];
    const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'salle' ? 260 : 500;
    src.connect(lp).connect(g); src.start(); nodes.push(src);
    let osc, olp = null;
    if (kind === 'route') {
      osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 32;
      olp = c.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 180;
      const og = c.createGain(); og.gain.value = 0.05; osc.connect(olp).connect(og).connect(g); osc.start(); nodes.push(osc);
    } else {
      osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55; const og = c.createGain(); og.gain.value = 0.012; osc.connect(og).connect(g); osc.start(); nodes.push(osc);
    }
    g.gain.setTargetAtTime(kind === 'salle' ? 0.16 : 0.0001, c.currentTime, 0.8);
    this.amb = { g, lp, osc, olp, nodes, kind };
  },
  speed(kmh) {
    const a = this.amb; if (!a || a.kind !== 'route' || !this.ctx) return;
    const c = this.ctx, k = Math.min(1, kmh / 130);
    a.g.gain.setTargetAtTime(kmh < 1 ? 0.0001 : 0.07 + k * 0.2, c.currentTime, 0.25);
    a.lp.frequency.setTargetAtTime(300 + k * 1400, c.currentTime, 0.25);
    a.osc.frequency.setTargetAtTime(28 + k * 70, c.currentTime, 0.2);
    a.olp.frequency.setTargetAtTime(140 + k * 500, c.currentTime, 0.2);
  },
  duck(v) { if (this.duckG && this.ctx) this.duckG.gain.setTargetAtTime(v ? 0.45 : 1, this.ctx.currentTime, 0.15); }
};
document.addEventListener('pointerdown', () => Sound.init(), { capture: true });
