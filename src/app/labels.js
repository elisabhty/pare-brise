/* Étiquettes « réalité augmentée » accrochées aux objets 3D (panneaux, repères au sol). */
import { $, $$, esc } from './util.js';
import { has3D, Engine } from './world.js';
import { meta } from './signs.js';

export const Labels = {
  el: null, items: [], owner: null,
  set(ids, custom, owner = 'cours') {
    this.el = this.el || $('#labels');
    this.owner = owner;
    this.el.innerHTML = ids.map((id, k) => { const c = custom ? custom[k] : null; const m = c ? null : meta(id); return `<div class="lab"><code>${esc(c ? c[0] : m.code)}</code><span>${esc(c ? c[1] : m.n)}</span></div>`; }).join('');
    this.items = $$('.lab', this.el);
    // dans le simulateur, l'étiquette se pose au-dessus de l'usager (sur un panneau de leçon, dessous)
    this.up = has3D && Engine.current === 'sim';
    this.items.forEach(l => l.classList.toggle('up', this.up));
    setTimeout(() => this.items.forEach(l => l.classList.add('on')), 700);
  },
  clear() { if (this.el) this.el.innerHTML = ''; this.items = []; },
  /* l'étiquette dont parle la voix ressort, les autres s'estompent (k = -1 : toutes égales) */
  focus(k) { this.items.forEach((l, n) => { l.classList.toggle('hot', n === k); l.classList.toggle('dim', k >= 0 && n !== k); }); },
  frame(limitEl) {
    if (!this.items.length || !has3D) return;
    const a = Engine.anchors(), app = $('#app').getBoundingClientRect();
    const lim = limitEl ? limitEl.getBoundingClientRect().top - 24 : Infinity;
    // jamais par-dessus le titre de la scène ni la barre du haut : l'étiquette disparaît plutôt
    const top = [...document.querySelectorAll('#lower3 > *, #s-exo .xtitle, #s-cours .topbar, #s-cours #ovt:not(:empty)')].reduce((m, e) => { const r = e.getBoundingClientRect(); return r.height && r.top < app.height / 2 ? Math.max(m, r.bottom) : m; }, 0);
    // ni sur l'illustration posée sous la carte (elle dit déjà la même chose)
    const il = $('#illu'), ir = il && !il.hidden && il.offsetParent !== null && $('#s-cours').classList.contains('active') ? il.getBoundingClientRect() : null;
    // deux étiquettes voisines ne se recouvrent jamais : celle de droite passe sur un second rang (au-dessus, si elles sont posées au-dessus)
    const placed = [];
    this.items.map((l, k) => ({ l, p: a[k] })).sort((u, v) => (u.p ? u.p.x : 0) - (v.p ? v.p.x : 0)).forEach(({ l, p }) => {
      if (!p) { l.style.display = 'none'; return; } l.style.display = '';
      const w = l.offsetWidth || 120, h = l.offsetHeight || 34, half = w / 2 + 8;
      const x = Math.max(half, Math.min(app.width - half, p.x - app.left));   // jamais coupée par le bord de l'écran
      let y = p.y - app.top, shift = 0;
      const box = () => { const t = this.up ? y + shift - h - 10 : y + shift; return { l: x - w / 2, r: x + w / 2, t, b: t + h }; };
      for (let n = 0; n < 3; n++) { const b = box(), hit = placed.find(q => q.l < b.r + 6 && q.r > b.l - 6 && q.t < b.b + 4 && q.b > b.t - 4); if (!hit) break; shift += this.up ? -(hit.b - hit.t + 6) : hit.b - b.t + 6; }
      const b = box(), surIllu = ir && b.b + app.top > ir.top - 4 && b.t + app.top < ir.bottom + 4 && b.r + app.left > ir.left && b.l + app.left < ir.right;
      const vis = p.y < lim && b.b + app.top < lim + 24 && b.t + app.top > top + 4 && p.vis !== false && !surIllu;
      l.style.left = x + 'px'; l.style.top = (y + shift) + 'px'; l.style.visibility = vis ? 'visible' : 'hidden';
      if (vis) placed.push(b);
    });
  }
};
