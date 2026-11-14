/* Une minute pour respirer, avec Plot : inspirer 4 secondes, souffler 6 secondes, six fois.
   Pour le stress d'avant l'examen (ou d'avant un examen blanc). Pas de son obligatoire : le cercle guide. */
import { $, haptic } from './util.js';
import { openSheet } from './planning.js';
import { plot } from './mascot.js';

const IN = 4000, OUT = 6000, TOURS = 6;
export function respirer() {
  let t0 = 0, raf = 0, fin = false;
  const close = openSheet(`<div class="rs">
    <div class="bs-head"><h2>Une minute pour respirer</h2><p>Suis le cercle : il grandit, tu inspires ; il rétrécit, tu souffles.</p></div>
    <div class="rs-zone"><i class="rs-o" id="rsO"></i><div class="rs-p">${plot({ size: 64, pose: 'pensif' })}</div></div>
    <b class="rs-t" id="rsT" aria-live="polite">Prêt ?</b><span class="rs-n num" id="rsN"></span>
    <div class="bs-btns"><button class="btn" id="rsGo">Commencer</button><button class="btn ghost" data-close>Plus tard</button></div>
  </div>`, (sh, cl) => {
    const go = $('#rsGo', sh), o = $('#rsO', sh), tx = $('#rsT', sh), n = $('#rsN', sh);
    const ov = $('#sheetOv'); const stop = () => { fin = true; cancelAnimationFrame(raf); };
    ov.addEventListener('click', e => { if (e.target === ov) stop(); });
    sh.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', stop));
    let phase = '';
    const tick = now => {
      if (fin || !o.isConnected) return;
      const t = now - t0, cyc = IN + OUT, k = Math.floor(t / cyc), u = t - k * cyc;
      if (k >= TOURS) { tx.textContent = 'Bravo. Tu es prêt.'; n.textContent = ''; o.style.transform = 'scale(.62)'; go.hidden = false; go.textContent = 'Encore une minute'; haptic('ok'); return; }
      const inspire = u < IN, p = inspire ? u / IN : 1 - (u - IN) / OUT, ease = .5 - Math.cos(Math.PI * p) / 2;
      o.style.transform = `scale(${(0.62 + 0.38 * ease).toFixed(3)})`;
      const ph = inspire ? 'Inspire' : 'Souffle';
      if (ph !== phase) { phase = ph; tx.textContent = ph; haptic(); }
      n.textContent = `${k + 1} / ${TOURS}`;
      raf = requestAnimationFrame(tick);
    };
    go.addEventListener('click', () => { go.hidden = true; fin = false; phase = ''; t0 = performance.now(); raf = requestAnimationFrame(tick); });
    void cl;
  });
  return close;
}
