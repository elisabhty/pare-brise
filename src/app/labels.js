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
  frame(limitEl) {
    if (!this.items.length || !has3D) return;
    const a = Engine.anchors(), app = $('#app').getBoundingClientRect();
    const lim = limitEl ? limitEl.getBoundingClientRect().top - 24 : Infinity;
    this.items.forEach((l, k) => {
      const p = a[k]; if (!p) { l.style.display = 'none'; return; } l.style.display = '';
      const half = (l.offsetWidth || 120) / 2 + 8, x = Math.max(half, Math.min(app.width - half, p.x - app.left));   // jamais coupée par le bord de l'écran
      l.style.left = x + 'px'; l.style.top = (p.y - app.top) + 'px'; l.style.visibility = p.y < lim && p.vis !== false ? 'visible' : 'hidden';
    });
  }
};
