/* Plot, le moniteur de l'app : un sprite animé (9 images) piloté en CSS.
   Au repos il cligne des yeux ; .cheer joue le clin d'œil + pouce levé ; .oops le fait vaciller. */
import { esc } from './util.js';

const LINES = {
  ok: ['Bien joué !', 'Exact !', 'Tu gères.', 'Parfait.', 'Pile ça.'],
  ko: ['Pas grave, on la revoit.', 'Presque !', 'Piège classique.', 'On la retravaille.']
};
export const line = ok => { const l = LINES[ok ? 'ok' : 'ko']; return l[Math.floor(Math.random() * l.length)]; };

export const plot = ({ size = 72, mood = '', bubble = '', side = '' } = {}) =>
  `<div class="plot-wrap ${side}" style="--ph:${size}px">${bubble ? `<div class="bubble">${esc(bubble)}</div>` : ''}<div class="plot ${mood}" role="img" aria-label="Plot, ton moniteur"></div></div>`;

export function react(scope, ok) {
  const p = scope && scope.querySelector('.plot'); if (!p) return;
  p.classList.remove('cheer', 'oops'); void p.offsetWidth;
  p.classList.add(ok ? 'cheer' : 'oops');
  p.addEventListener('animationend', () => p.classList.remove('cheer', 'oops'), { once: true });
}
