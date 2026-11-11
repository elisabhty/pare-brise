/* Le parcours dessiné comme une route sinueuse : une étape par cours, un panneau de direction par thème.
   rows : [{ type: 'theme', num, title, sub, empty }, { type: 'course', id, num, title, sub, status, tag }] */
import { esc } from './util.js';
import { plot } from './mascot.js';

const ROW = { course: 124, theme: 100 };
const coneIcon = '<svg viewBox="0 0 24 24"><path d="M10 3 h4 l5 16 H5 Z" fill="#FF7A1A"/><path d="M8.6 8 h6.8 l1 3.2 H7.6 Z M7 13.5 h10 l.9 2.8 H6.1 Z" fill="#fff"/><rect x="3" y="19" width="18" height="2.4" rx="1" fill="#E5640F"/></svg>';

export function roadmap(el, rows, opts = {}) {
  el.classList.add('roadmap');
  el._rows = rows; el._opts = opts;
  draw(el);
  if (!el._ro && 'ResizeObserver' in window) { el._ro = new ResizeObserver(() => { if (el._w !== el.clientWidth) draw(el); }); el._ro.observe(el); }
}

function draw(el) {
  const rows = el._rows, opts = el._opts, w = el.clientWidth || 358;
  el._w = w;
  if (!rows.length) { el.innerHTML = ''; return; }
  const xL = Math.round(w * 0.25), xR = Math.round(w * 0.75);
  let y = 78; const pts = [];
  rows.forEach((r, i) => { const side = i % 2 === 0 ? 'L' : 'R'; pts.push({ x: side === 'L' ? xL : xR, y, side, r }); y += ROW[r.type]; });
  const H = y - ROW[rows[rows.length - 1].type] + 70;
  const seg = (a, b) => { const d = (b.y - a.y) * 0.55; return ` C ${a.x} ${a.y + d} ${b.x} ${b.y - d} ${b.x} ${b.y}`; };
  const start = { x: w / 2, y: 0 }, end = { x: w / 2, y: H };
  let path = `M ${start.x} ${start.y}` + seg(start, pts[0]);
  for (let i = 1; i < pts.length; i++) path += seg(pts[i - 1], pts[i]);
  path += seg(pts[pts.length - 1], end);
  const cur = pts.findIndex(p => p.r.status === 'now');
  let done = '';
  if (cur > 0 || (cur === 0)) { done = `M ${start.x} ${start.y}` + seg(start, pts[0]); for (let i = 1; i <= cur; i++) done += seg(pts[i - 1], pts[i]); }
  // lignes de niveau, comme une carte topographique
  let topo = '';
  for (let k = 0; k < Math.ceil(H / 90); k++) { const yy = k * 90 + 30; topo += `<path d="M -20 ${yy} C ${w * 0.3} ${yy - 40} ${w * 0.6} ${yy + 50} ${w + 20} ${yy - 10}" />`; }
  const svg = `<svg class="rm-svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" aria-hidden="true">
    <defs><linearGradient id="rmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B63FF"/><stop offset="1" stop-color="#4A39C9"/></linearGradient>
    <filter id="rmglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <g class="topo">${topo}</g>
    <path d="${path}" fill="none" stroke="rgba(123,99,255,.22)" stroke-width="50" stroke-linecap="round"/>
    <path d="${path}" fill="none" stroke="url(#rmg)" stroke-width="34" stroke-linecap="round"/>
    <path d="${path}" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2.4" stroke-dasharray="9 11" stroke-linecap="round"/>
    ${done ? `<path d="${done}" fill="none" stroke="#FFC629" stroke-width="5" filter="url(#rmglow)" opacity=".8"/><path d="${done}" fill="none" stroke="#FFE08A" stroke-width="2.6" stroke-linecap="round"/>` : ''}
  </svg>`;
  const items = pts.map((p, i) => {
    const r = p.r, cardSide = p.side === 'L' ? 'right' : 'left';
    const cardPos = p.side === 'L' ? `left:${p.x + 34}px;right:12px` : `left:12px;right:${w - p.x + 34}px`;
    if (r.type === 'theme') {
      return `<span class="rm-sign ${r.empty ? 'works' : ''}" style="left:${p.x}px;top:${p.y}px">${r.empty ? coneIcon : esc(r.num)}</span>
        <div class="rm-panel ${r.empty ? 'works' : 'dir'} ${cardSide}" style="top:${p.y}px;${cardPos}"><b>${esc(r.num)} · ${esc(r.title)}</b><span>${esc(r.sub)}</span></div>`;
    }
    const mark = r.status === 'done' ? '✓' : esc(r.num);
    const me = r.status === 'now' && opts.mascot !== false
      ? `<div class="rm-me ${p.side}" style="top:${p.y}px;${p.side === 'L' ? `right:${w - p.x + 26}px` : `left:${p.x + 26}px`}">${plot({ size: 64, bubble: opts.here || 'Tu es ici' })}</div>` : '';
    return `<button class="rm-stop st-${r.status}" style="left:${p.x}px;top:${p.y}px" data-go="fiche" data-arg="${esc(r.id)}" aria-label="${esc(r.title)}">${mark}</button>${me}
      <button class="rm-card ${cardSide} st-${r.status}" style="top:${p.y}px;${cardPos}" data-go="fiche" data-arg="${esc(r.id)}"><span class="rm-dot"></span><span class="rm-txt"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span><span class="rm-tag">${esc(r.tag || '')}</span></button>`;
  }).join('');
  el.style.height = H + 'px';
  el.innerHTML = svg + items;
}
