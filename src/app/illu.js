/* Illustrations d'un écran de cours : ce que la 3D ne sait pas montrer (une vignette Crit'Air, un pictogramme
   sur une boîte de médicaments, les voyants du tableau de bord, les papiers, le permis à points, un constat…).
   Une illustration se pose dans la bande libre de l'écran, sous la carte de texte, et se construit avec la voix :
   - « suit » : ses éléments s'allument avec les éléments de la liste (data-e = numéro de l'élément) ;
   - « etapes » : sinon, à des moments de la narration (numéro de phrase + fraction, comme « sync ») ;
   - « p » : la phrase à laquelle elle apparaît (0 par défaut).
   Chaque type a son dessin (SVG). « pas » décrit un état qui change (points perdus, amende) à chaque étape. */
import { $, esc } from './util.js';

const C = { bleu: '#0A84FF', rouge: '#FF3B30', orange: '#FF9F0A', vert: '#30D158', jaune: '#FFD60A', gris: '#8E8E93', encre: '#1C1C1E', label2: '#6B7280', fond: '#F2F4F7' };
const T = (x, y, s, size = 12, w = 600, fill = C.encre, anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(String(s))}</text>`;
const E = (e, inner, extra = '') => `<g class="ie" data-e="${e}" ${extra}>${inner}</g>`;
const svg = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true" font-family="-apple-system, 'SF Pro Text', Inter, system-ui, sans-serif">${inner}</svg>`;

/* ---------- petits dessins réutilisés ---------- */
const carFront = (cx, cy, k = 1, fill = C.encre) => `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-14 -2 L-11 -11 Q-10 -14 -6 -14 L6 -14 Q10 -14 11 -11 L14 -2 Z" fill="${fill}"/><rect x="-18" y="-3" width="36" height="13" rx="4" fill="${fill}"/><rect x="-16" y="9" width="7" height="6" rx="2" fill="${fill}"/><rect x="9" y="9" width="7" height="6" rx="2" fill="${fill}"/><circle cx="-11" cy="3.5" r="2.6" fill="#fff"/><circle cx="11" cy="3.5" r="2.6" fill="#fff"/></g>`;
const permisCard = (x, y, w = 120) => { const h = w * 0.63; return `<g transform="translate(${x} ${y})"><defs><linearGradient id="pk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBD3DF"/><stop offset="1" stop-color="#F3A9BE"/></linearGradient></defs><rect width="${w}" height="${h}" rx="9" fill="url(#pk)" stroke="#E58AA6"/><rect x="8" y="8" width="${w * 0.24}" height="${h * 0.5}" rx="4" fill="#fff" opacity=".85"/><circle cx="${8 + w * 0.12}" cy="${8 + h * 0.18}" r="${w * 0.05}" fill="#E58AA6"/><path d="M${8 + w * 0.04} ${8 + h * 0.48} q${w * 0.08} -${h * 0.2} ${w * 0.16} 0" fill="#E58AA6"/>${T(w * 0.64, 18, 'PERMIS DE', 7.5, 800, '#8C2A4A')}${T(w * 0.64, 27, 'CONDUIRE', 7.5, 800, '#8C2A4A')}<rect x="${w * 0.42}" y="${h * 0.52}" width="${w * 0.44}" height="5" rx="2.5" fill="#fff" opacity=".7"/><rect x="${w * 0.42}" y="${h * 0.64}" width="${w * 0.32}" height="5" rx="2.5" fill="#fff" opacity=".7"/><rect x="8" y="${h - 20}" width="22" height="13" rx="3" fill="#0F5BB5"/>${T(19, h - 10, 'F', 9, 800, '#FFD60A')}<rect x="${w - 30}" y="${h - 22}" width="22" height="15" rx="4" fill="#fff"/>${T(w - 19, h - 10.5, 'B', 11, 800, '#8C2A4A')}</g>`; };
const cgCard = (x, y, w = 120, barre = false) => { const h = w * 0.7; return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="7" fill="#E9F1E4" stroke="#B9CDAF"/>${T(w / 2, 14, 'CERTIFICAT', 7.2, 800, '#3F5A33')}${T(w / 2, 23, "D'IMMATRICULATION", 7.2, 800, '#3F5A33')}<rect x="${w / 2 - 34}" y="30" width="68" height="18" rx="3" fill="#fff" stroke="#1C1C1E" stroke-width="1.2"/><rect x="${w / 2 - 34}" y="30" width="8" height="18" rx="2" fill="#0F5BB5"/>${T(w / 2 + 4, 43.5, 'AB-123-CD', 10, 800)}${[56, 63, 70].map(yy => `<rect x="10" y="${yy}" width="${w - 20}" height="3.4" rx="1.7" fill="#B9CDAF"/>`).join('')}${barre ? `<g class="barre"><line x1="6" y1="${h - 6}" x2="${w - 6}" y2="6" stroke="${C.rouge}" stroke-width="3" stroke-linecap="round"/>${T(w / 2, h / 2 + 3, 'Vendu le 12/11', 9, 800, C.rouge, 'middle', `transform="rotate(-28 ${w / 2} ${h / 2})"`)}<path d="M${w - 40} ${h - 9} q6 -8 10 -2 t10 -2 t8 0" stroke="${C.encre}" stroke-width="1.4" fill="none"/></g>` : ''}</g>`; };
const docCard = (x, y, w, titre, sous, icone, couleur = C.vert) => { const h = w * 0.7; return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="7" fill="#fff" stroke="#D9DEE6"/><circle cx="${w / 2}" cy="${h * 0.36}" r="${h * 0.2}" fill="${couleur}" opacity=".14"/>${T(w / 2, h * 0.36 + 6, icone, h * 0.24, 700, couleur)}${T(w / 2, h * 0.72, titre, 8.2, 800)}${sous ? T(w / 2, h * 0.86, sous, 7, 600, C.label2) : ''}</g>`; };
const shield = (cx, cy, k = 1, c = C.vert) => `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M0 -16 L13 -11 L13 0 Q13 11 0 17 Q-13 11 -13 0 L-13 -11 Z" fill="${c}"/><path d="M-6 0 L-1.5 5 L7 -5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
/* symboles du tableau de bord (normes ISO simplifiées) */
const SYM = {
  frein: c => `<circle r="9" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M-13 -7 A15 15 0 0 0 -13 7 M13 -7 A15 15 0 0 1 13 7" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><rect x="-1.3" y="-6" width="2.6" height="7.5" rx="1.2" fill="${c}"/><circle cy="4.6" r="1.6" fill="${c}"/>`,
  abs: c => `<circle r="10" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M-14 -7 A15 15 0 0 0 -14 7 M14 -7 A15 15 0 0 1 14 7" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>${T(0, 3.4, 'ABS', 7.6, 800, c)}`,
  moteur: c => `<path d="M-12 -4 h4 v-4 h9 v3 h4 l3 3 h3 v-3 h2 v12 h-2 v-3 h-3 l-3 5 h-13 v-4 h-4 Z" fill="${c}"/>`,
  croisement: c => `<path d="M-2 -8 Q8 -8 8 0 Q8 8 -2 8 Z" fill="${c}" transform="translate(4 0)"/><g stroke="${c}" stroke-width="2.2" stroke-linecap="round"><line x1="-12" y1="-6" x2="-3" y2="-3"/><line x1="-12" y1="0" x2="-3" y2="3"/><line x1="-12" y1="6" x2="-3" y2="9"/></g>`,
  route: c => `<path d="M-2 -8 Q8 -8 8 0 Q8 8 -2 8 Z" fill="${c}" transform="translate(4 0)"/><g stroke="${c}" stroke-width="2.2" stroke-linecap="round"><line x1="-12" y1="-6" x2="-3" y2="-6"/><line x1="-12" y1="0" x2="-3" y2="0"/><line x1="-12" y1="6" x2="-3" y2="6"/></g>`,
  huile: c => `<path d="M-13 2 h17 l9 -6 l3 1 l-8 8 h-21 Z" fill="${c}"/><path d="M-9 2 v-5 h7 v5" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M13 5 q2 3 0 5 q-2 -2 0 -5" fill="${c}"/>`,
  temperature: c => `<rect x="-1.6" y="-12" width="3.2" height="14" rx="1.6" fill="${c}"/><circle cy="5" r="4" fill="${c}"/><path d="M-12 10 q3 -3 6 0 t6 0 t6 0 t6 0" stroke="${c}" stroke-width="2" fill="none"/><g stroke="${c}" stroke-width="1.8"><line x1="2" y1="-9" x2="6" y2="-9"/><line x1="2" y1="-5" x2="6" y2="-5"/></g>`,
  laveglace: c => `<path d="M-13 6 Q0 -8 13 6 Z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><g stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="1.5 2.5"><line x1="0" y1="2" x2="-6" y2="-10"/><line x1="0" y1="2" x2="0" y2="-12"/><line x1="0" y1="2" x2="6" y2="-10"/></g>`,
  manuel: c => `<path d="M-12 -9 q6 -3 12 0 v18 q-6 -3 -12 0 Z M12 -9 q-6 -3 -12 0 v18 q6 -3 12 0 Z" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="-6" cy="-1" r="1.5" fill="${c}"/>`
};
const sym = (k, x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${SYM[k](c)}</g>`;
const tile = (x, y, w, h, i, t, s, barre, e) => E(e, `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.fond}"/><text x="${x + w / 2}" y="${y + h * 0.46}" font-size="${Math.min(w, h) * 0.34}" text-anchor="middle" dominant-baseline="middle">${i}</text>${barre ? `<line x1="${x + w * 0.24}" y1="${y + h * 0.66}" x2="${x + w * 0.76}" y2="${y + h * 0.18}" stroke="${C.rouge}" stroke-width="4" stroke-linecap="round"/>` : ''}${T(x + w / 2, y + h * 0.8, t, 10.5, 700)}${s ? T(x + w / 2, y + h * 0.93, s, 8.5, 500, C.label2) : ''}`);

/* ---------- les types ---------- */
const ILLU = {
  /* vignettes Crit'Air : 0 électrique, puis 1 à 5 ; en ZFE, les plus polluantes peuvent être exclues */
  critair: {
    html(sp) {
      const cols = [['#2E9E44', '#fff'], ['#7A3E9D', '#fff'], ['#F2C300', '#1C1C1E'], ['#EF8A00', '#fff'], ['#8B1D3B', '#fff'], ['#7A7F86', '#fff']];
      const groupe = () => 0;                 // « six vignettes » : on les voit toutes dès la première phrase
      const v = cols.map(([bg, fg], n) => { const x = 30 + n * 56; return E(groupe(n), `<circle cx="${x}" cy="50" r="24" fill="${bg}"/><circle cx="${x}" cy="50" r="19.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>${T(x, 59, n, 25, 800, fg)}${T(x, 30.5, "CRIT'Air", 5.6, 800, fg)}${sp.zfe ? `<g class="barre" data-x="${n >= 3 ? 1 : 0}">${n >= 3 ? `<line x1="${x - 20}" y1="70" x2="${x + 20}" y2="30" stroke="${C.rouge}" stroke-width="4" stroke-linecap="round"/>` : ''}</g>` : ''}`); }).join('');
      const bas = sp.zfe ? E(2, `${T(198, 98, 'Exclues dans certaines ZFE, selon la ville', 10, 700, C.rouge)}`) : E(2, `<path d="M86 92 H318" stroke="url(#ca)" stroke-width="5" stroke-linecap="round"/><defs><linearGradient id="ca"><stop offset="0" stop-color="#7A3E9D"/><stop offset=".5" stop-color="#EF8A00"/><stop offset="1" stop-color="#7A7F86"/></linearGradient></defs>${T(86, 108, 'moins polluant', 9.5, 600, C.label2, 'start')}${T(318, 108, 'plus polluant', 9.5, 600, C.label2, 'end')}`) + E(0, T(30, 92, 'électrique', 9.5, 700, '#2E9E44'));
      return svg(340, 116, v + bas);
    },
    step(root, n, sp) { if (sp.zfe) root.querySelectorAll('.barre').forEach(b => b.classList.toggle('on', n >= 2)); }
  },
  /* pictogrammes des médicaments : voiture dans un triangle jaune, orange, rouge */
  pictos: {
    html(sp) {
      const tri = (cx, fill, n, l1) => E(n, `<path d="M${cx} 12 L${cx + 38} 80 Q${cx + 40} 86 ${cx + 33} 86 L${cx - 33} 86 Q${cx - 40} 86 ${cx - 38} 80 Z" fill="${fill}" stroke="#1C1C1E" stroke-width="3.2" stroke-linejoin="round"/>${carFront(cx, 64, 1.05)}${T(cx, 104, `Niveau ${n + 1}`, 11, 800)}${T(cx, 118, l1, 9.5, 600, C.label2)}`);
      if (sp.boite) return svg(340, 124, E(0, `<g transform="translate(70 10)"><path d="M0 18 L40 0 L200 0 L160 18 Z" fill="#DCE6F2"/><rect y="18" width="160" height="92" rx="4" fill="#fff" stroke="#C9D3DF"/><path d="M160 18 L200 0 V92 L160 110 Z" fill="#E8EEF6" stroke="#C9D3DF"/>${T(80, 42, 'COMPRIMÉS', 10, 800, '#3B5B85')}${T(80, 56, '20 mg', 9, 600, C.label2)}<g transform="translate(80 78) scale(.42) translate(-${150} -50)"><path d="M150 12 L188 80 Q190 86 183 86 L117 86 Q110 86 112 80 Z" fill="${C.orange}" stroke="#1C1C1E" stroke-width="5" stroke-linejoin="round"/>${carFront(150, 64, 1.05)}</g></g>`));
      return svg(340, 124, tri(56, '#FFD60A', 0, 'sois prudent') + tri(170, '#FF9F0A', 1, 'très prudent') + tri(284, '#FF3B30', 2, 'ne conduis pas'));
    }
  },
  /* le permis à points : un capital (pastilles), des points qui partent ou qui reviennent, une amende */
  points: {
    html(sp) { return svg(340, 120, `${sp.icone ? `<rect x="10" y="22" width="92" height="76" rx="16" fill="${C.fond}"/><text x="56" y="62" font-size="40" text-anchor="middle" dominant-baseline="middle">${sp.icone}</text>` : permisCard(8, 22, 100)}<g class="jauge"></g><g class="pts-txt"></g><g class="amende"></g>`); },
    step(root, n, sp) {
      const st = Object.assign({ points: sp.max || 12, perdus: 0, gagnes: 0 }, sp.debut || {}); (sp.pas || []).slice(0, Math.max(0, n + 1)).forEach(p => Object.assign(st, p));
      const max = sp.max || 12, per = 6, r = 9.5;
      let g = '';
      for (let i = 0; i < max; i++) { const x = 140 + (i % per) * 30, y = 38 + Math.floor(i / per) * 28, on = i < st.points, lost = !on && i < st.points + (st.perdus || 0), won = on && i >= st.points - (st.gagnes || 0);
        g += `<circle cx="${x}" cy="${y}" r="${r}" class="pt${on ? ' on' : ''}${lost ? ' lost' : ''}${won ? ' won' : ''}" fill="${on ? (won ? C.vert : C.bleu) : lost ? C.rouge : '#E5E8EE'}"/>`; }
      root.querySelector('.jauge').innerHTML = g;
      root.querySelector('.pts-txt').innerHTML = T(215, 106, st.texte || `${st.points} point${st.points > 1 ? 's' : ''}`, 13, 800, st.perdus ? C.rouge : st.gagnes ? '#1E8E3E' : C.encre);
      root.querySelector('.amende').innerHTML = st.amende ? `<g class="pop"><rect x="${sp.icone ? 18 : 22}" y="2" width="78" height="26" rx="13" fill="${C.rouge}"/>${T(sp.icone ? 57 : 61, 20, st.amende, 13, 800, '#fff')}</g>` : '';
    }
  },
  /* éthylotest : le taux dans le sang et sa mesure dans l'air expiré (et le verre qui suffit à le dépasser) */
  ethylotest: {
    html(sp) {
      const drop = E(0, `<path d="M62 14 Q86 46 86 64 A24 24 0 0 1 38 64 Q38 46 62 14 Z" fill="#E5484D"/>${T(62, 70, sp.sang, 15, 800, '#fff')}${T(62, 104, 'g/L de sang', 10, 700, C.label2)}`);
      const dev = E(1, `<rect x="182" y="10" width="82" height="92" rx="16" fill="#2B3445"/><rect x="192" y="22" width="62" height="30" rx="6" fill="#9FE3B0"/>${T(223, 43, sp.air, 15, 800, '#103B1E')}<rect x="214" y="62" width="18" height="30" rx="6" fill="#4A5568"/>${T(223, 116, 'mg/L d’air expiré', 10, 700, C.label2)}`);
      const eq = E(1, T(124, 64, '=', 26, 700, C.gris));
      const verre = sp.verre ? E(2, `<path d="M292 22 h30 l-4 30 q-11 10 -22 0 Z" fill="#fff" stroke="#9AA3AF" stroke-width="2"/><path d="M295 36 h24 l-2 16 q-10 8 -20 0 Z" fill="#C2185B" opacity=".85"/><line x1="307" y1="58" x2="307" y2="78" stroke="#9AA3AF" stroke-width="2.4"/><line x1="296" y1="80" x2="318" y2="80" stroke="#9AA3AF" stroke-width="2.4" stroke-linecap="round"/>${T(307, 98, '1 verre', 10.5, 800)}${T(307, 111, 'peut suffire', 9, 600, C.label2)}`) : '';
      return svg(340, 122, drop + eq + dev + verre);
    }
  },
  /* tableau de bord : rouge, orange, vert et bleu (ou le manuel du véhicule) */
  voyants: {
    html(sp) {
      const lamp = (x, k, c, e, lab) => E(e, `<circle cx="${x}" cy="48" r="27" class="halo" fill="${c}" opacity=".16"/>${sym(k, x, 48, c, 1.25)}${T(x, 96, lab, 10.5, 700, '#E5E7EB')}`);
      const items = sp.manuel ? [['frein', C.rouge, 0, 'Rouge : stop'], ['moteur', C.orange, 1, 'Orange : vérifier'], ['manuel', '#E5E7EB', 2, 'Le manuel']] : [['frein', C.rouge, 0, 'Rouge'], ['abs', C.orange, 1, 'Orange'], ['croisement', C.vert, 2, 'Vert'], ['route', '#3B82F6', 2, 'Bleu']];
      const step = 300 / items.length;
      return svg(340, 112, `<rect x="4" y="4" width="332" height="104" rx="20" fill="#11161F"/>` + items.map(([k, c, e, l], i) => lamp(20 + step / 2 + i * step, k, c, e, l)).join(''));
    }
  },
  /* les papiers : permis, certificat d'immatriculation, assurance, contrôle technique, certificat de situation, cession */
  documents: {
    html(sp) {
      const D = {
        permis: (x, w) => permisCard(x, 14, w),
        cg: (x, w) => cgCard(x, 10, w, sp.barre === 'cg'),
        assurance: (x, w) => `<g transform="translate(${x} 10)"><rect width="${w}" height="${w * 0.7}" rx="7" fill="#fff" stroke="#D9DEE6"/>${shield(w / 2, w * 0.27, 1.05)}${T(w / 2, w * 0.53, sp.rc ? 'Responsabilité civile' : 'Véhicule assuré', 8.2, 800)}${T(w / 2, w * 0.64, sp.rc ? 'le minimum obligatoire' : 'fichier des véhicules assurés', 6.8, 600, C.label2)}</g>`,
        ct: (x, w) => docCard(x, 10, w, 'Contrôle technique', sp.ct || 'de moins de 6 mois', '✓', C.vert),
        csa: (x, w) => docCard(x, 10, w, 'Situation administrative', 'de moins de 15 jours', '✓', '#0F5BB5'),
        cession: (x, w) => `<g transform="translate(${x} 8)"><rect width="${w}" height="${w * 0.74}" rx="9" fill="#1C2433"/><rect x="5" y="5" width="${w - 10}" height="${w * 0.74 - 10}" rx="5" fill="#fff"/>${T(w / 2, 22, 'Déclaration', 8.6, 800)}${T(w / 2, 32, 'de cession', 8.6, 800)}<circle cx="${w / 2}" cy="${w * 0.42}" r="11" fill="${C.vert}"/><path d="M${w / 2 - 5} ${w * 0.42} l3.5 4 l7 -8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>${T(w / 2, w * 0.66, 'en ligne · 15 jours', 7, 700, C.label2)}</g>`
      };
      const list = sp.liste || ['permis', 'cg', 'assurance'], w = list.length > 2 ? 100 : 128, gap = (340 - list.length * w) / (list.length + 1);
      return svg(340, 108, list.map((k, i) => E(sp.e ? sp.e[i] : i, D[k](gap + i * (w + gap), w))).join(''));
    },
    step(root, n, sp) { const b = root.querySelector('.barre'); if (b) b.classList.toggle('on', n >= (sp.barreA ?? 0)); }
  },
  /* le téléphone : le numéro dont parle la voix s'affiche ; ou les bulles du message d'alerte */
  telephone: {
    html(sp) {
      const phone = `<rect x="16" y="6" width="92" height="166" rx="18" fill="#1C2433"/><rect x="22" y="14" width="80" height="150" rx="12" fill="#fff"/><rect x="50" y="18" width="24" height="5" rx="2.5" fill="#1C2433"/>`;
      if (sp.bulles) {
        const b = sp.bulles.map(([t, s], i) => E(i, `<rect x="126" y="${8 + i * 41}" width="200" height="34" rx="12" fill="${i % 2 ? '#E9F1FF' : C.fond}"/>${T(140, 22 + i * 41, t, 11, 800, C.bleu, 'start')}${T(140, 35 + i * 41, s, 9.5, 600, C.label2, 'start')}`)).join('');
        return svg(340, 178, phone + `<circle cx="62" cy="80" r="22" fill="${C.vert}"/><path d="M53 74 q2 -6 6 -3 l3 4 q1 2 -1 4 q2 5 7 7 q2 -2 4 -1 l4 3 q3 4 -3 6 q-12 0 -20 -20 Z" fill="#fff"/>${T(62, 122, 'En ligne', 10, 700, C.label2)}${T(62, 138, 'avec les secours', 10, 700, C.label2)}` + b);
      }
      const nums = sp.numeros || [];
      return svg(340, 178, phone + `<g class="big"></g>` + nums.map(([n, l], i) => E(i, `<rect x="126" y="${6 + i * 34}" width="200" height="28" rx="14" fill="${C.fond}" class="chip"/>${T(146, 25 + i * 34, n, 13, 800, C.rouge, 'start')}${T(186, 24.5 + i * 34, l, 10, 600, C.label2, 'start')}`)).join(''));
    },
    step(root, n, sp) { if (sp.bulles) return; const b = root.querySelector('.big'), it = (sp.numeros || [])[n >= 99 ? (sp.numeros || []).length - 1 : n]; if (b && n < 0) b.innerHTML = ''; if (b && it) b.innerHTML = `<g class="pop">${T(62, 86, it[0], 34, 800, C.rouge)}${T(62, 110, it[1].split(',')[0], 10, 700, C.label2)}<circle cx="62" cy="140" r="13" fill="${C.vert}"/><path d="M56 136 q1 -4 4 -2 l2 3 q0 1 -1 2 q1 3 4 4 q1 -1 2 -1 l3 2 q2 3 -2 4 q-8 0 -12 -12 Z" fill="#fff"/></g>`; }
  },
  /* s'installer : siège, dossier, appui-tête, rétroviseurs, ceinture */
  siege: {
    html() {
      const mk = (n, x, y) => E(n, `<circle cx="${x}" cy="${y}" r="10" fill="${C.bleu}"/>${T(x, y + 4, n + 1, 11, 800, '#fff')}`);
      return svg(340, 150, `<g stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 132 H300" stroke="#D9DEE6" stroke-width="3"/>
        <path d="M70 110 L150 110 Q158 110 156 100 L152 92" fill="#3B4A63"/><rect x="66" y="96" width="92" height="18" rx="9" fill="#4B5B78"/>
        <path d="M84 98 L64 34 Q62 26 70 25 L80 25 Q86 26 88 32 L104 98 Z" fill="#4B5B78"/><rect x="62" y="6" width="30" height="20" rx="8" fill="#5D6E8E"/>
        <circle cx="94" cy="40" r="11" fill="#E6B796"/><path d="M90 52 L102 92 L150 92 L176 122 L198 122" stroke="#3D7BFF" stroke-width="11" fill="none"/><path d="M98 58 L132 78 L168 66" stroke="#3D7BFF" stroke-width="8" fill="none"/>
        <path d="M168 66 L178 50" stroke="#2B3445" stroke-width="5"/><ellipse cx="182" cy="44" rx="6" ry="20" transform="rotate(-25 182 44)" fill="none" stroke="#2B3445" stroke-width="5"/>
        <path d="M206 126 L214 106" stroke="#2B3445" stroke-width="4"/><rect x="206" y="124" width="16" height="6" rx="2" fill="#2B3445"/>
        <path d="M92 52 L120 98" stroke="${C.orange}" stroke-width="4" class="belt"/>
        <rect x="236" y="14" width="44" height="22" rx="8" fill="#AFC3DD" stroke="#2B3445" stroke-width="2"/></g>
        ${mk(0, 112, 128)}${mk(1, 60, 62)}${mk(2, 104, 12)}${mk(3, 258, 52)}${mk(4, 136, 92)}`);
    }
  },
  /* enfants : coque dos à la route, siège, rehausseur ; airbag passager désactivé */
  sieges: {
    html() {
      const cosy = `<g transform="translate(58 58)"><path d="M-34 10 Q-32 34 0 34 Q30 34 34 6 L18 6 Q14 20 0 20 Q-14 20 -18 4 Z" fill="#5B6B88"/><path d="M-30 4 Q-28 -30 6 -30" stroke="#3B4A63" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-2" r="9" fill="#F1C7A4"/><path d="M34 28 l12 0" stroke="${C.bleu}" stroke-width="3" marker-end="url(#ar)"/></g>`;
      const seat = `<g transform="translate(170 58)"><rect x="-20" y="-34" width="40" height="62" rx="12" fill="#5B6B88"/><rect x="-26" y="10" width="52" height="24" rx="8" fill="#4B5B78"/><circle cy="-14" r="9" fill="#F1C7A4"/><path d="M-10 -2 L0 14 L10 -2" stroke="${C.orange}" stroke-width="3" fill="none"/></g>`;
      const boost = `<g transform="translate(276 66)"><rect x="-30" y="2" width="60" height="22" rx="8" fill="#5B6B88"/><rect x="-20" y="-38" width="40" height="40" rx="10" fill="#C9D3DF"/><circle cy="-22" r="8" fill="#F1C7A4"/><path d="M-12 -12 L12 4" stroke="${C.orange}" stroke-width="3"/></g>`;
      const off = E(2, `<rect x="104" y="112" width="132" height="30" rx="15" fill="#FFF4E5"/><circle cx="124" cy="127" r="9" fill="${C.orange}"/>${T(124, 131, '!', 12, 800, '#fff')}${T(184, 131, 'Airbag passager OFF', 10.5, 800, '#B45309')}`);
      return svg(340, 146, `<defs><marker id="ar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${C.bleu}"/></marker></defs>` + E(1, cosy + T(58, 106, 'Bébé : dos à la route', 9.5, 700)) + E(0, seat + T(170, 106, 'Siège enfant', 9.5, 700) + boost + T(276, 106, 'Rehausseur', 9.5, 700)) + off);
    }
  },
  /* constat amiable : chacun sa colonne, le croquis, les deux signatures, l'envoi à l'assureur */
  constat: {
    html() {
      return svg(340, 140, `<rect x="40" y="4" width="260" height="132" rx="10" fill="#fff" stroke="#D9DEE6"/>${T(170, 20, 'CONSTAT AMIABLE', 10, 800, C.encre)}`
        + E(0, `<rect x="50" y="28" width="74" height="70" rx="6" fill="#E3EEFF"/>${T(87, 42, 'A', 12, 800, C.bleu)}<rect x="216" y="28" width="74" height="70" rx="6" fill="#FFF6CC"/>${T(253, 42, 'B', 12, 800, '#A16207')}`)
        + E(1, `${[52, 64, 76].map(y => `<rect x="58" y="${y - 6}" width="8" height="8" rx="2" fill="none" stroke="${C.bleu}" stroke-width="1.4"/><path d="M59 ${y - 2} l2.5 3 l4 -6" stroke="${C.bleu}" stroke-width="1.6" fill="none"/><rect x="${224}" y="${y - 6}" width="8" height="8" rx="2" fill="none" stroke="#A16207" stroke-width="1.4"/>`).join('')}<rect x="132" y="28" width="76" height="70" rx="6" fill="${C.fond}"/><rect x="144" y="56" width="22" height="12" rx="3" fill="${C.bleu}"/><rect x="176" y="46" width="12" height="22" rx="3" fill="#E0B100"/><path d="M168 62 L174 56" stroke="${C.rouge}" stroke-width="2"/>${T(170, 92, 'croquis', 8.5, 700, C.label2)}`)
        + E(2, `<path d="M58 118 q8 -10 14 -2 t14 -2 t12 2" stroke="${C.bleu}" stroke-width="1.8" fill="none"/><path d="M224 118 q8 -10 14 -2 t14 -2 t12 2" stroke="#A16207" stroke-width="1.8" fill="none"/>${T(87, 130, 'signature A', 7.5, 700, C.label2)}${T(253, 130, 'signature B', 7.5, 700, C.label2)}`)
        + E(3, `<g transform="translate(150 104)"><rect width="40" height="26" rx="4" fill="${C.bleu}"/><path d="M0 2 L20 15 L40 2" stroke="#fff" stroke-width="2" fill="none"/></g>${T(170, 140, '', 1)}`));
    }
  },
  /* une frise : contrôle technique, points qui reviennent… (une ligne par parcours) */
  frise: {
    html(sp) {
      const L = sp.lignes || [], H = 22 + L.length * 52;
      return svg(340, H, L.map((ln, j) => { const y = 34 + j * 52, n = ln.noeuds.length, x0 = ln.titre ? 96 : 22, step = (318 - x0) / Math.max(1, n - 1);
        return `${ln.titre ? E(ln.e ?? j, T(10, y + 4, ln.titre, 10, 800, ln.couleur || C.encre, 'start')) : ''}<line x1="${x0}" y1="${y}" x2="${x0 + step * (n - 1)}" y2="${y}" stroke="#D9DEE6" stroke-width="4" stroke-linecap="round"/>`
          + ln.noeuds.map(([t, s, e], i) => { const x = x0 + i * step; return E(e ?? ln.e ?? i, `<circle cx="${x}" cy="${y}" r="11" fill="${ln.couleur || C.bleu}"/>${T(x, y + 4, t, t.length > 3 ? 7.5 : 9.5, 800, '#fff')}${s ? T(x, y + 27, s, 9, 700, C.label2) : ''}`); }).join('');
      }).join(''));
    }
  },
  /* excès de vitesse : l'écart au-dessus de la limite, et les points retirés */
  compteur: {
    html(sp) {
      const seg = sp.segments || [['< 20', '−1', '#FFD60A'], ['20–29', '−2', '#FFB020'], ['30–39', '−3', '#FF8A00'], ['40–49', '−4', '#FF5A1F'], ['≥ 50', '−6', '#E5141F']];
      const cx = 170, cy = 120, R = 96, a0 = Math.PI, da = Math.PI / seg.length;
      const arc = (i) => { const s = a0 + i * da + 0.02, e = a0 + (i + 1) * da - 0.02, p = (a, r) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`; return `M${p(s, R)} A${R} ${R} 0 0 1 ${p(e, R)} L${p(e, R - 26)} A${R - 26} ${R - 26} 0 0 0 ${p(s, R - 26)} Z`; };
      return svg(340, 132, seg.map(([l, p, c], i) => { const am = a0 + (i + 0.5) * da; return E(sp.e ? sp.e[i] : i, `<path d="${arc(i)}" fill="${c}"/>${T(cx + (R + 14) * Math.cos(am), cy + (R + 14) * Math.sin(am) + 4, l, 9, 700, C.label2)}${T(cx + (R - 13) * Math.cos(am), cy + (R - 13) * Math.sin(am) + 4, p, 10, 800, '#fff')}`); }).join('') + T(cx, cy - 18, 'km/h de trop', 11, 700, C.label2) + `<circle cx="${cx}" cy="${cy}" r="7" fill="${C.encre}"/>`);
    }
  },
  /* le pneu : profondeur des sculptures, coupure, sous-gonflage, pression */
  pneu: {
    html(sp) {
      const V = {
        usure: `<rect x="-46" y="-30" width="92" height="44" rx="6" fill="#2B2F36"/>${[-30, -10, 10, 30].map(x => `<rect x="${x - 4}" y="-30" width="8" height="26" fill="#fff"/><rect x="${x - 4}" y="-12" width="8" height="8" fill="#5A606B"/>`).join('')}<path d="M54 -30 V-4" stroke="${C.rouge}" stroke-width="2"/><path d="M50 -30 h8 M50 -4 h8" stroke="${C.rouge}" stroke-width="2"/>${T(56, 10, sp.mm || '1,6 mm', 10, 800, C.rouge)}`,
        coupure: `<circle r="30" fill="#2B2F36"/><circle r="15" fill="#C9D0DA"/><path d="M-8 -26 l5 6 l-4 5 l6 6" stroke="${C.rouge}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        gonflage: `<path d="M-40 18 Q-44 -26 -22 -28 L-12 -28 Q8 -26 4 18 Z" fill="#2B2F36"/><path d="M10 18 Q4 -14 24 -16 L34 -16 Q54 -14 48 18 Q30 24 10 18 Z" fill="#2B2F36"/><line x1="-48" y1="19" x2="56" y2="19" stroke="#9AA3AF" stroke-width="2"/>${T(-18, 34, 'bon', 9, 700, C.vert)}${T(29, 34, 'sous-gonflé', 9, 700, C.rouge)}`,
        pression: `<circle r="30" fill="#fff" stroke="#2B3445" stroke-width="4"/><path d="M-20 14 A24 24 0 1 1 20 14" stroke="#D9DEE6" stroke-width="5" fill="none"/><path d="M8 -20 A24 24 0 0 1 22 8" stroke="${C.vert}" stroke-width="5" fill="none"/><line x1="0" y1="0" x2="15" y2="-14" stroke="${C.rouge}" stroke-width="3" stroke-linecap="round"/><circle r="4" fill="#2B3445"/>${T(0, 22, 'bar', 8, 700, C.label2)}`
      };
      const L = { usure: sp.usure || 'Témoins d’usure', coupure: 'Coupures', gonflage: 'Sous-gonflage', pression: sp.pression || 'Pression à froid' };
      const vues = sp.vues || ['usure', 'pression'], w = 340 / vues.length;
      return svg(340, 120, vues.map((k, i) => E(sp.e ? sp.e[i] : i, `<g transform="translate(${w * i + w / 2} 50)">${V[k]}</g>${T(w * i + w / 2, 108, L[k], 10, 700)}`)).join(''));
    }
  },
  /* niveaux sous le capot (symboles du tableau de bord), puis ampoules et balais */
  niveaux: {
    html(sp) {
      const items = sp.items || [['temperature', 'Refroidissement', 0], ['laveglace', 'Lave-glace', 0], ['frein', 'Liquide de frein', 0], ['huile', 'Huile', 0]];
      const w = 340 / items.length;
      return svg(340, 100, items.map(([k, l, e], i) => E(e ?? i, `<rect x="${w * i + 8}" y="6" width="${w - 16}" height="88" rx="16" fill="${C.fond}"/>${sym(k, w * i + w / 2, 40, '#2B3445', 1.45)}${T(w * i + w / 2, 80, l, l.length > 14 ? 8.5 : 10, 700)}`)).join(''));
    }
  },
  /* tuiles d'icônes (émoji), barrées si c'est interdit */
  icones: {
    html(sp) {
      const it = sp.items || [], n = it.length, cols = Math.min(n, sp.cols || 4), rows = Math.ceil(n / cols), w = 340 / cols, h = 96;
      return svg(340, rows * h + 4, it.map((x, i) => tile((i % cols) * w + 5, Math.floor(i / cols) * h + 4, w - 10, h - 8, x.i, x.t, x.s, x.barre, x.e ?? i)).join(''));
    }
  },
  /* un barème : une ligne par cas, son badge (points, montant) */
  bareme: {
    html(sp) {
      const it = sp.items || [], h = 30;
      return svg(340, it.length * h + 8, it.map((x, i) => E(x.e ?? i, `<rect x="4" y="${4 + i * h}" width="332" height="${h - 5}" rx="12.5" fill="${C.fond}"/><text x="22" y="${21 + i * h}" font-size="15" text-anchor="middle">${x.i || ''}</text>${T(40, 21 + i * h, x.t, 11, 700, C.encre, 'start')}<rect x="${284}" y="${7 + i * h}" width="46" height="19" rx="9.5" fill="${x.c || C.rouge}"/>${T(307, 20.5 + i * h, x.b, 11, 800, '#fff')}`)).join(''));
    }
  }
};

/* ---------- l'élément à l'écran ---------- */
export const Illu = {
  sp: null, el: null, root: null, shownK: false,
  mount(sc) {
    this.el = this.el || $('#illu'); if (!this.el) return;
    const sp = sc && sc.illu; this.sp = sp || null; this.sc = sc;
    if (!sp || !ILLU[sp.type]) { this.clear(); return; }
    this.el.innerHTML = `<div class="illu-card">${ILLU[sp.type].html(sp)}</div>`;
    this.root = this.el.firstElementChild; this.shownK = false; this.cur = -2;
    this.el.hidden = true; this.el.classList.remove('on');
    this.apply(sp.suit || sp.etapes ? [] : null, -1);
  },
  clear() { this.el = this.el || $('#illu'); if (!this.el) return; this.el.innerHTML = ''; this.el.hidden = true; this.el.classList.remove('on'); this.sp = null; this.root = null; },
  /* l'illustration se pose entre la carte et les sous-titres, jamais sur la carte : sur un petit écran elle rétrécit,
     et s'il n'y a vraiment pas la place (longue liste), elle s'efface plutôt que de cacher le texte */
  place(top, bottom) {
    if (!this.el) this.el = $('#illu'); if (!this.el) return;
    const room = bottom - top;
    this.el.style.top = top + 'px'; this.el.style.height = Math.max(0, room) + 'px';
    const ih = Math.max(64, Math.min(150, room >= 220 ? room * 0.5 : room - 10));
    this.el.style.setProperty('--ih', ih + 'px');
    this.el.classList.toggle('tight', room < 74); this.el.classList.toggle('small', ih < 116);
  },
  /* hauteur de l'illustration posée (0 si elle n'est pas à l'écran) : le décor 3D se cadre au-dessus */
  height() { if (!this.el || this.el.hidden || !this.root || this.el.classList.contains('tight')) return 0; return this.root.getBoundingClientRect().height; },
  onShow: null,
  show(on) {
    if (!this.el || !this.sp) return;
    if (on && this.el.hidden) { this.el.hidden = false; requestAnimationFrame(() => { this.el.classList.add('on'); if (this.onShow) this.onShow(); }); }
    else if (!on && !this.el.hidden) { this.el.classList.remove('on'); this.el.hidden = true; if (this.onShow) this.onShow(); }
  },
  /* éléments allumés : shown[e] (ou tous si null), l'élément en cours ressort */
  apply(shown, cur) {
    if (!this.root) return; const sp = this.sp, all = !shown;
    this.root.querySelectorAll('.ie').forEach(g => { const e = +g.dataset.e; const on = all || !!shown[e]; g.classList.toggle('on', on); g.classList.toggle('cur', cur >= 0 && e === cur); });
    const T2 = ILLU[sp.type];
    const n = all ? (sp.pas ? sp.pas.length - 1 : 99) : Math.max(-1, shown.lastIndexOf(true));
    if (T2.step && n !== this.cur) { this.cur = n; T2.step(this.root, n, sp); }
  },
  beat(sc, k, ctx, dur, revealAt) {
    const sp = this.sp; if (!sp || this.sc !== sc) return;
    this.show(k >= (sp.p ?? 0));
    if (k >= 999) { this.apply(null, -1); return; }
    if (sp.etapes) revealAt({ sync: sp.etapes }, k, ctx, dur, (sh, cur) => this.apply(sh, cur), 'illu');
  },
  items(shown, cur) { if (this.sp && this.sp.suit) this.apply(shown, cur); }
};
export const ILLU_TYPES = Object.keys(ILLU);
