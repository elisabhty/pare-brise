/* Série : un jour compte dès qu'on termine un cours, une série, un exercice 3D, un examen ou qu'on répond à une question. */
import { store } from './util.js';
import { iso, today, addD, wd, JL } from './dates.js';
import { streakOf, bestStreak } from './planning-core.js';

export const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.2c.4 2.6-.6 4.3-2 5.9-1.5 1.7-3.3 3.5-3.3 6.6A4.8 4.8 0 0 0 12 19.6a4.8 4.8 0 0 0 4.8-4.9c0-1.6-.6-2.8-1.4-3.9.1 1.3-.3 2.4-1.3 2.9.3-2.9-.4-5.9-1.5-11.5Z"/><path fill="#fff" fill-opacity=".55" d="M12 20.5c-1.9 0-3.3-1.4-3.3-3.2 0-1.9 1.4-2.9 2.6-4.3.3 1.3 1 2 1.9 2.4.2-.7.2-1.3.1-2 1.3 1 2 2.3 2 3.9 0 1.8-1.4 3.2-3.3 3.2Z"/></svg>';

const days = () => store.get('jours', []);
export function markActive() {
  const list = days(), t = iso(today());
  if (list.includes(t)) return;
  list.push(t); store.set('jours', list.slice(-500));
  try { document.dispatchEvent(new CustomEvent('pb:actif')); } catch (e) {}
}
export const streak = () => streakOf(days(), today());
export const best = () => Math.max(bestStreak(days()), streak());
export const activeToday = () => days().includes(iso(today()));
export const activeCount = () => days().length;
/* le dernier jour actif avant aujourd'hui (AAAA-MM-JJ), ou null */
export const lastActive = () => { const t = iso(today()), l = days().filter(d => d < t).sort(); return l.length ? l[l.length - 1] : null; };

/* La semaine en cours, du lundi au dimanche : une flamme par jour actif, le jour même entouré, les jours prévus au planning marqués. */
export function weekHTML(planned = new Set()) {
  const t = today(), set = new Set(days()), mon = addD(t, -wd(t)), n = streak(), on = activeToday(), rec = best();
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = addD(mon, i), k = iso(d), cls = [set.has(k) ? 'on' : '', k === iso(t) ? 'auj' : '', d > t ? 'next' : '', planned.has(k) ? 'plan' : ''].filter(Boolean).join(' ');
    return `<li class="${cls}"><span>${JL[i]}</span><i>${set.has(k) ? FLAME : d > t && planned.has(k) ? '<b></b>' : ''}</i></li>`;
  }).join('');
  const titre = n ? `${n} jour${n > 1 ? 's' : ''} d’affilée` : 'Lance ta série';
  const sous = on ? (rec > n ? `Record : ${rec} jours. Reviens demain pour continuer.` : 'Bravo, c’est ton record. Reviens demain pour continuer.')
    : n ? 'Fais une activité aujourd’hui pour garder ta série.' : 'Un cours, une série ou un exercice par jour suffit.';
  return `<div class="stk${n ? ' hot' : ''}${on ? ' done' : ''}"><div class="stk-top"><span class="stk-fl">${FLAME}<b class="num">${n}</b></span><div><b>${titre}</b><small>${sous}</small></div></div><ol class="stk-week" aria-label="Ta semaine">${cells}</ol></div>`;
}
