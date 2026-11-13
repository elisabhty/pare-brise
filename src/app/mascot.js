/* Plot, le moniteur de l'app : un sprite animé (9 images) piloté en CSS.
   Au repos il cligne des yeux ; .cheer joue le clin d'œil + pouce levé ; .oops le fait vaciller. */
import { esc } from './util.js';
import { plotImg, imgSrc } from './images.js';

const LINES = {
  ok: ['Bien joué !', 'Exact !', 'Tu gères.', 'Parfait.', 'Pile ça.'],
  ko: ['Pas grave, on la revoit.', 'Presque !', 'Piège classique.', 'On la retravaille.']
};
export const line = ok => { const l = LINES[ok ? 'ok' : 'ko']; return l[Math.floor(Math.random() * l.length)]; };

/* pose : une expression dessinée (coucou, joie, pouce, decu, pensif, inquiet, dort, trophee) ; tant que son image
   n'existe pas, c'est le sprite animé qui s'affiche */
export const plot = ({ size = 72, mood = '', bubble = '', side = '', pose = '' } = {}) => {
  const k = pose && plotImg(pose);
  const corps = k ? `<img class="plot-img" src="${imgSrc(k)}" alt="Plot, ton moniteur" decoding="async" draggable="false">` : `<div class="plot ${mood}" role="img" aria-label="Plot, ton moniteur"></div>`;
  return `<div class="plot-wrap ${side}" style="--ph:${size}px">${bubble ? `<div class="bubble">${esc(bubble)}</div>` : ''}${corps}</div>`;
};

export function react(scope, ok) {
  const p = scope && scope.querySelector('.plot, .plot-img'); if (!p) return;
  p.classList.remove('cheer', 'oops'); void p.offsetWidth;
  p.classList.add(ok ? 'cheer' : 'oops');
  p.addEventListener('animationend', () => p.classList.remove('cheer', 'oops'), { once: true });
}
