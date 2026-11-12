/* Bibliothèque de panneaux : SVG dessinés à la main, nomenclature officielle.
   Un identifiant peut porter un paramètre : "B14:90" (limitation à 90), "EB10:LYON".
   Module pur (aucun accès au DOM) : il sert aussi à valider le contenu au build. */

export const K = { r: '#D3112E', b: '#0F5BB5', y: '#FFC629', k: '#151515', w: '#FFFFFF', g: '#9B9B9B' };
const octPts = r => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; });
const pts = a => a.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ');

export const triUp = (fill = K.w, b = K.r) => `<polygon points="50,8 94,86 6,86" fill="#fff" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><polygon points="50,8 94,86 6,86" fill="${b}" stroke="${b}" stroke-width="6" stroke-linejoin="round"/><polygon points="50,26 79,77 21,77" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>`;
export const triDown = (fill = K.w, b = K.r) => `<polygon points="6,14 94,14 50,92" fill="#fff" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><polygon points="6,14 94,14 50,92" fill="${b}" stroke="${b}" stroke-width="6" stroke-linejoin="round"/><polygon points="21,23 79,23 50,74" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>`;
export const ring = (fill = K.w, b = K.r) => `<circle cx="50" cy="50" r="48" fill="#fff"/><circle cx="50" cy="50" r="45.5" fill="${b}"/><circle cx="50" cy="50" r="36" fill="${fill}"/>`;
export const disc = (c = K.b) => `<circle cx="50" cy="50" r="48" fill="#fff"/><circle cx="50" cy="50" r="45.5" fill="${c}"/>`;
export const endDisc = () => `<circle cx="50" cy="50" r="47" fill="#fff" stroke="${K.k}" stroke-width="1.8"/>`;
export const square = (c = K.b) => `<rect x="4" y="4" width="92" height="92" rx="11" fill="#fff"/><rect x="7.5" y="7.5" width="85" height="85" rx="8" fill="${c}"/>`;
export const rectRed = () => `<rect x="4" y="22" width="92" height="56" rx="7" fill="#fff" stroke="${K.k}" stroke-width="1"/><rect x="8" y="26" width="84" height="48" rx="4" fill="none" stroke="${K.r}" stroke-width="5"/>`;
export const octo = () => `<polygon points="${pts(octPts(48))}" fill="#fff"/><polygon points="${pts(octPts(44.5))}" fill="${K.r}"/>`;
export const losange = (c = K.y) => `<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="${K.k}" stroke-width="1.2" stroke-linejoin="round"/><polygon points="50,15 85,50 50,85 15,50" fill="${c}"/>`;
export const bars = (c = K.k, n = 5, half = 38, gap = 3.6, w = 1.7) => { let o = ''; for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2) * gap, cx = 50 + s / Math.SQRT2, cy = 50 + s / Math.SQRT2, d = half / Math.SQRT2; o += `<line x1="${(cx - d).toFixed(1)}" y1="${(cy + d).toFixed(1)}" x2="${(cx + d).toFixed(1)}" y2="${(cy - d).toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; } return o; };
export const txt = (t, size, fill, y, family = 'Arial, Helvetica, sans-serif', max = 0) => {
  // un nom trop long pour le panneau est resserré pour tenir dans le cadre (largeur estimée de l'Arial gras : 0,68 × la taille)
  const fit = max && String(t).length * size * 0.68 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text x="50" y="${y}" text-anchor="middle" font-family="${family}" font-weight="700" font-size="${size}" fill="${fill}"${fit}>${t}</text>`;
};
const bang = (c = K.k) => `<rect x="45.5" y="38" width="9" height="25" rx="3" fill="${c}"/><circle cx="50" cy="70.5" r="4.8" fill="${c}"/>`;
const bike = (c = '#fff') => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="31" cy="60" r="11"/><circle cx="69" cy="60" r="11"/><path d="M31 60 L42 44 L61 44 L69 60 M42 44 L51 60 L61 44 M31 60 L51 60 M37 38 L46 38 M42 44 L41 38 M61 44 L59 36 L66 36"/></g>`;
const worker = () => `<circle cx="45" cy="45" r="4.4" fill="${K.k}"/><g stroke="${K.k}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M45 51 L41 64 L35 75 M41 64 L48 75 M44 55 L54 60"/><path d="M50 52 L60 70" stroke-width="3"/></g><path d="M57 70 L66 73 L61 77 Z" fill="${K.k}"/><polygon points="62,77 71,69 78,77" fill="${K.k}"/>`;
const speed = (v, fill) => txt(v, String(v).length > 2 ? 29 : 38, fill, String(v).length > 2 ? 60.5 : 63.5, undefined, 62);
const roundabout = () => {
  const cx = 50, cy = 60, r = 10.5; let o = '';
  for (let k = 0; k < 3; k++) {
    const a0 = (k * 120 + 25) * Math.PI / 180, a1 = a0 + 78 * Math.PI / 180;
    const P = a => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    const tx = -Math.sin(a1), ty = -Math.cos(a1), nx = Math.cos(a1), ny = -Math.sin(a1);
    o += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 0 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${K.k}" stroke-width="3.6"/>`;
    o += `<polygon points="${(x1 + tx * 5).toFixed(1)},${(y1 + ty * 5).toFixed(1)} ${(x1 + nx * 4).toFixed(1)},${(y1 + ny * 4).toFixed(1)} ${(x1 - nx * 4).toFixed(1)},${(y1 - ny * 4).toFixed(1)}" fill="${K.k}"/>`;
  }
  return o;
};

const walker = (c, tx, ty, k = 1) => `<g transform="translate(${tx} ${ty}) scale(${k})"><circle cx="1" cy="-17" r="4.6" fill="${c}"/><path d="M0 -11 L-2.5 2 L-8 15 M-2.5 2 L5 15 M-1 -8 L7 -2 M-1 -8 L-8 -3" fill="none" stroke="${c}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const carFront = (cx, c) => `<g transform="translate(${cx} 51)"><path d="M-8 -5 L-6 -13 Q-5.5 -15 -3.5 -15 L3.5 -15 Q5.5 -15 6 -13 L8 -5 Z" fill="${c}"/><rect x="-12" y="-6" width="24" height="13" rx="4" fill="${c}"/><rect x="-12" y="6" width="6" height="7" rx="1.5" fill="${c}"/><rect x="6" y="6" width="6" height="7" rx="1.5" fill="${c}"/><circle cx="-7" cy="0" r="2.2" fill="#fff"/><circle cx="7" cy="0" r="2.2" fill="#fff"/></g>`;
const zone = (fill = K.k, ringC = K.r, strike = false) => `<rect x="6" y="10" width="88" height="80" rx="7" fill="#fff" stroke="${K.k}" stroke-width="1.6"/>` + `<text x="50" y="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="15" fill="${fill}">ZONE</text><circle cx="50" cy="60" r="23" fill="#fff" stroke="${ringC}" stroke-width="5.5"/><text x="50" y="69" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="25" fill="${fill}">30</text>` + (strike ? `<g stroke="${K.k}" stroke-width="1.7">${[-6, -2, 2, 6].map(d => `<line x1="${18 + d}" y1="${84 + d}" x2="${82 + d}" y2="${20 + d}"/>`).join('')}</g>` : '');
const motorway = () => `<path d="M30 86 L44 44 L56 44 L70 86 Z" fill="#fff"/><path d="M50 50v6M50 62v8M50 76v9" stroke="${K.b}" stroke-width="3"/><rect x="18" y="26" width="64" height="9" rx="1" fill="#fff"/><rect x="23" y="35" width="6" height="12" fill="#fff"/><rect x="71" y="35" width="6" height="12" fill="#fff"/>`;

const DRAW = {
  A14: () => triUp() + bang(),
  A13a: () => triUp() + walker(K.k, 42, 66, 0.95) + walker(K.k, 60, 70, 0.72) + `<rect x="56" y="56" width="6" height="7" rx="1.5" fill="${K.k}"/>`,
  A13b: () => triUp() + walker(K.k, 50, 64, 0.95) + `<g fill="${K.k}"><rect x="27" y="77" width="9" height="3"/><rect x="40" y="77" width="9" height="3"/><rect x="53" y="77" width="9" height="3"/><rect x="66" y="77" width="8" height="3"/></g>`,
  A15b: () => triUp() + `<path d="M31 76 L35 63 L33 56 Q35 51 42 51 L56 52 L62 45 L60 38 L65 37 L69 41 L68 46 L72 47 L70 51 L65 51 L61 60 L66 76 L62 76 L57 63 L45 63 L40 76 L36 76 L38 64 Z" fill="${K.k}"/><path d="M64 37 L61 30 M61 33 L57 30 M67 37 L70 30 M69 33 L73 31" stroke="${K.k}" stroke-width="2" stroke-linecap="round"/>`,
  A17: () => triUp() + `<rect x="42" y="36" width="16" height="42" rx="5" fill="${K.k}"/><circle cx="50" cy="45" r="4.6" fill="${K.r}"/><circle cx="50" cy="57" r="4.6" fill="${K.y}"/><circle cx="50" cy="69" r="4.6" fill="#1FB25A"/>`,
  A21: () => triUp() + `<g transform="translate(50 64) scale(0.5) translate(-50 -52)">${bike(K.k)}<circle cx="44" cy="27" r="6" fill="${K.k}"/></g>`,
  A4: () => triUp() + `<g fill="${K.k}"><rect x="38" y="40" width="24" height="15" rx="4"/><rect x="36" y="53" width="6" height="6" rx="1.5"/><rect x="58" y="53" width="6" height="6" rx="1.5"/></g><path d="M39 78 Q35 72 40 67 T39 60 M61 78 Q65 72 60 67 T61 60" fill="none" stroke="${K.k}" stroke-width="2.6" stroke-linecap="round"/>`,
  A7: () => triUp() + `<g fill="${K.k}"><rect x="30" y="52" width="40" height="6" rx="1"/><rect x="30" y="64" width="40" height="6" rx="1"/><rect x="33" y="46" width="5" height="32" rx="1"/><rect x="62" y="46" width="5" height="32" rx="1"/></g>`,
  B3: () => ring() + carFront(37, K.r) + carFront(63, K.k),
  A24: () => triUp() + `<line x1="33" y1="79" x2="33" y2="40" stroke="${K.k}" stroke-width="3.6" stroke-linecap="round"/><g transform="translate(34 41)"><path d="M0 0 L34 5 L34 13 L0 13 Z" fill="${K.r}"/><path d="M8 1.2 L15 2.2 L15 13 L8 13 Z M22 3.2 L28 4.1 L28 13 L22 13 Z" fill="#fff"/><path d="M0 0 L34 5 L34 13 L0 13 Z" fill="none" stroke="${K.k}" stroke-width="1.6" stroke-linejoin="round"/></g>`,
  A16: () => triUp() + `<polygon points="23,79 78,79 23,50" fill="${K.k}"/>` + txt('10%', 14, K.k, 64, undefined, 0).replace('x="50"', 'x="62"'),
  B26: () => disc() + `<circle cx="50" cy="50" r="23" fill="none" stroke="#fff" stroke-width="9"/><circle cx="50" cy="50" r="7" fill="#fff"/><g stroke="${K.b}" stroke-width="3">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="${50 + 18.5 * Math.cos(a * Math.PI / 180)}" y1="${50 + 18.5 * Math.sin(a * Math.PI / 180)}" x2="${50 + 27.5 * Math.cos((a + 22) * Math.PI / 180)}" y2="${50 + 27.5 * Math.sin((a + 22) * Math.PI / 180)}"/>`).join('')}</g>`,
  B30: () => zone(),
  B51: () => zone(K.g, K.g, true),
  C107: () => square() + motorway(),
  C108: () => square() + motorway() + `<line x1="16" y1="84" x2="84" y2="16" stroke="${K.r}" stroke-width="7" stroke-linecap="round"/>`,

  A1a: () => triUp() + `<path d="M41 78 L41 62 Q41 48 57 46" fill="none" stroke="${K.k}" stroke-width="7" stroke-linecap="round"/>`,
  A3: () => triUp() + `<g fill="none" stroke="${K.k}" stroke-width="4.5" stroke-linecap="round"><path d="M37 77 L37 67 Q37 61 44 57 L44 40"/><path d="M63 77 L63 67 Q63 61 56 57 L56 40"/></g>`,
  A3b: () => triUp() + `<g fill="none" stroke="${K.k}" stroke-width="4.5" stroke-linecap="round"><path d="M38 77 L38 67 Q38 61 47 56 L47 40"/><path d="M62 77 L62 40"/></g>`,
  A2b: () => triUp() + `<path d="M23 74 L35 74 Q50 50 65 74 L77 74 L77 78 L23 78 Z" fill="${K.k}"/>`,
  AK14: () => triUp(K.y) + bang(),
  AK5: () => triUp(K.y) + worker(),
  AB1: () => triUp() + `<g stroke="${K.k}" stroke-width="6.5" stroke-linecap="butt"><line x1="39" y1="46" x2="61" y2="72"/><line x1="61" y1="46" x2="39" y2="72"/></g>`,
  AB2: () => triUp() + `<rect x="45.5" y="37" width="9" height="38" fill="${K.k}"/><rect x="35" y="54" width="30" height="4" fill="${K.k}"/>`,
  AB25: () => triUp() + roundabout(),
  B0: () => ring(),
  B1: () => `<circle cx="50" cy="50" r="48" fill="#fff"/><circle cx="50" cy="50" r="45.5" fill="${K.r}"/><rect x="19" y="41" width="62" height="18" rx="2" fill="#fff"/>`,
  B14: (v = '50') => ring() + speed(v, K.k),
  B2a: () => ring() + `<path d="M58 76 L58 55 Q58 44 47 44 L41 44" fill="none" stroke="${K.k}" stroke-width="7"/><polygon points="42,35 29,44 42,53" fill="${K.k}"/><line x1="27" y1="27" x2="73" y2="73" stroke="${K.r}" stroke-width="7"/>`,
  B6a1: () => ring(K.b) + `<line x1="25" y1="25" x2="75" y2="75" stroke="${K.r}" stroke-width="8"/>`,
  B6d: () => ring(K.b) + `<line x1="25" y1="25" x2="75" y2="75" stroke="${K.r}" stroke-width="8"/><line x1="75" y1="25" x2="25" y2="75" stroke="${K.r}" stroke-width="8"/>`,
  B211: () => disc() + `<path d="M42 77 L42 55 Q42 44 53 44 L58 44" fill="none" stroke="#fff" stroke-width="8"/><polygon points="57,32 72,44 57,56" fill="#fff"/>`,
  B21a1: () => disc() + `<line x1="32" y1="32" x2="60" y2="60" stroke="#fff" stroke-width="8" stroke-linecap="round"/><polygon points="72,72 49,70 70,49" fill="#fff"/>`,
  B22a: () => disc() + bike(),
  B40: () => disc() + bike() + `<line x1="24" y1="76" x2="76" y2="24" stroke="${K.r}" stroke-width="7" stroke-linecap="round"/>`,
  B33: (v = '50') => endDisc() + speed(v, K.g) + bars(),
  B31: () => endDisc() + bars(),
  C12: () => square() + `<rect x="44" y="40" width="12" height="40" fill="#fff"/><polygon points="31,44 50,19 69,44" fill="#fff"/>`,
  C20a: () => square() + `<polygon points="50,16 86,80 14,80" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><g fill="${K.k}"><rect x="27" y="75" width="8" height="3"/><rect x="40" y="75" width="8" height="3"/><rect x="53" y="75" width="8" height="3"/><rect x="66" y="75" width="7" height="3"/></g><g stroke="${K.k}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M50 47 L46 61 L40 72 M46 61 L54 71 M49 51 L42 57 M49 51 L57 56"/></g><circle cx="52" cy="40" r="4.6" fill="${K.k}"/>`,
  C1a: () => square() + txt('P', 64, '#fff', 73),
  EB10: (n = 'VILLE') => rectRed() + txt(n, n.length > 7 ? 15 : 17, K.k, 56, undefined, 72),
  EB20: (n = 'VILLE') => rectRed() + txt(n, n.length > 7 ? 15 : 17, K.k, 56, undefined, 72) + `<line x1="14" y1="72" x2="86" y2="28" stroke="${K.r}" stroke-width="6"/>`,
  AB3a: () => triDown(),
  AB4: () => octo() + txt('STOP', 26, '#fff', 59.5),
  AB6: () => losange(),
  AB7: () => losange() + bars(K.k, 5, 24, 3.6, 1.7),
  X_FORME: () => `<circle cx="50" cy="50" r="44" fill="none" stroke="#C9D0DD" stroke-width="5" stroke-dasharray="9 7"/>`,
  X_COULEUR: () => ring('#141C2E')
};

const META = {
  A13a: ['Endroit fréquenté par les enfants', 'danger'], A13b: ['Passage pour piétons', 'danger'], A15b: ['Passage d’animaux sauvages', 'danger'], A17: ['Feux tricolores', 'danger'], A21: ['Débouché de cyclistes', 'danger'], A4: ['Chaussée glissante', 'danger'], A7: ['Passage à niveau avec barrières', 'danger'],
  B3: ['Interdiction de dépasser', 'interdiction'], A24: ['Vent latéral', 'danger'], A16: ['Descente dangereuse', 'danger'], B26: ['Équipements spéciaux obligatoires (chaînes)', 'obligation'], B30: ['Zone 30', 'interdiction'], B51: ['Fin de zone 30', 'fin'], C107: ['Autoroute', 'indication'], C108: ['Fin d’autoroute', 'indication'],
  A14: ['Autres dangers', 'danger'], A1a: ['Virage à droite', 'danger'], A3: ['Chaussée rétrécie', 'danger'], A3b: ['Chaussée rétrécie par la gauche', 'danger'], A2b: ['Dos-d’âne', 'danger'],
  AK14: ['Danger temporaire', 'temporaire', 'danger'], AK5: ['Travaux', 'temporaire', 'danger'],
  AB1: ['Priorité à droite', 'danger'], AB2: ['Priorité ponctuelle', 'priorite'], AB25: ['Carrefour giratoire', 'danger'],
  B0: ['Circulation interdite', 'interdiction'], B1: ['Sens interdit', 'interdiction'], B14: [v => `Limitation à ${v || 50}`, 'interdiction'],
  B2a: ['Interdit de tourner à gauche', 'interdiction'], B6a1: ['Stationnement interdit', 'interdiction'], B6d: ['Arrêt et stationnement interdits', 'interdiction'],
  B211: ['Tourner à droite', 'obligation', null, 'B21-1'], B21a1: ['Contourner par la droite', 'obligation'], B22a: ['Piste cyclable obligatoire', 'obligation'],
  B40: ['Fin de piste cyclable', 'fin'], B33: [v => `Fin de limitation à ${v || 50}`, 'fin'], B31: ['Fin des interdictions', 'fin'],
  C12: ['Sens unique', 'indication'], C20a: ['Passage piétons', 'indication'], C1a: ['Parking', 'indication'],
  EB10: ['Entrée d’agglomération', 'localisation'], EB20: ['Sortie d’agglomération', 'localisation'],
  AB3a: ['Cédez le passage', 'priorite'], AB4: ['Stop', 'priorite'], AB6: ['Route prioritaire', 'priorite'], AB7: ['Fin de route prioritaire', 'fin', null, null, 'priorite'],
  X_FORME: ['Forme', 'fin', null, '01'], X_COULEUR: ['Couleur', 'interdiction', null, '02']
};

export const FAM = {
  danger: { n: 'Danger', c: '#FF3048', t: 'var(--rouge-t)', rule: 'triangle, bord rouge' },
  interdiction: { n: 'Interdiction', c: '#FF3048', t: 'var(--rouge-t)', rule: 'rond, bord rouge' },
  obligation: { n: 'Obligation', c: '#3D8BFF', t: 'var(--bleu-t)', rule: 'rond bleu' },
  indication: { n: 'Indication', c: '#3D8BFF', t: 'var(--bleu-t)', rule: 'carré bleu' },
  priorite: { n: 'Priorité', c: '#FFC629', t: '#A35A00', rule: 'forme unique' },
  fin: { n: 'Fin', c: '#DDE3EE', t: '#4A5878', rule: 'panneau barré' },
  temporaire: { n: 'Temporaire', c: '#FFC629', t: '#A35A00', rule: 'fond jaune' },
  localisation: { n: 'Localisation', c: '#FF3048', t: 'var(--rouge-t)', rule: 'rectangle blanc bordé de rouge' }
};

export const parse = id => { const i = String(id).indexOf(':'); return i < 0 ? [id, undefined] : [id.slice(0, i), id.slice(i + 1)]; };
export const isSign = id => !!DRAW[parse(id)[0]];
export function meta(id) {
  const [b, a] = parse(id); const m = META[b] || [b, 'danger'];
  return { id, base: b, code: m[3] || b, n: typeof m[0] === 'function' ? m[0](a) : m[0], f: m[1], reflex: m[2] || m[1], also: m[4] || null };
}
export const inner = id => { const [b, a] = parse(id); return DRAW[b] ? DRAW[b](a) : ''; };
export const sign = (id, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ${attrs} role="img" aria-label="${meta(id).n}">${inner(id)}</svg>`;
export const REFLEX_POOL = ['A14', 'A1a', 'A3', 'A2b', 'AK14', 'AK5', 'B0', 'B1', 'B14:50', 'B14:90', 'B2a', 'B6a1', 'B6d', 'B211', 'B21a1', 'B22a', 'C12', 'C20a', 'C1a', 'AB3a', 'AB4', 'AB6', 'B33', 'B31', 'B40', 'AB7'];

/* Panneaux composés du décodeur : GEN:forme:couleur */
export function genericInner(shape, style) {
  const M = { tri: [32, 72], cercle: [46, 66], carre: [52, 68], octo: [46, 66], triBas: [30, 56], losange: [34, 62] }[shape];
  const mark = c => txt('?', M[0], c, M[1]);
  const ville = txt('VILLE', 17, K.k, 56);
  const T = {
    tri: { rouge: triUp() + mark(K.k), jaune: triUp(K.y) + mark(K.k), bleu: triUp(K.b, K.b) + mark('#fff'), barre: triUp() + bars(K.k, 5, 30) },
    cercle: { rouge: ring() + mark(K.k), bleu: disc() + mark('#fff'), jaune: disc(K.y) + mark(K.k), barre: endDisc() + bars() },
    carre: { rouge: rectRed() + ville, bleu: square() + mark('#fff'), jaune: square(K.y) + mark(K.k), barre: rectRed() + ville + `<line x1="14" y1="72" x2="86" y2="28" stroke="${K.r}" stroke-width="6"/>` },
    octo: { rouge: octo() + txt('STOP', 26, '#fff', 59.5), bleu: `<polygon points="${pts(octPts(48))}" fill="#fff"/><polygon points="${pts(octPts(44.5))}" fill="${K.b}"/>` + mark('#fff'), jaune: `<polygon points="${pts(octPts(48))}" fill="#fff"/><polygon points="${pts(octPts(44.5))}" fill="${K.y}"/>` + mark(K.k), barre: `<polygon points="${pts(octPts(47))}" fill="#fff" stroke="${K.k}" stroke-width="1.8"/>` + bars() },
    triBas: { rouge: triDown(), bleu: triDown(K.b, K.b), jaune: triDown(K.y), barre: triDown() + bars(K.k, 5, 26) },
    losange: { rouge: `<polygon points="50,3 97,50 50,97 3,50" fill="#fff" stroke="${K.r}" stroke-width="8" stroke-linejoin="round"/>` + mark(K.k), bleu: losange(K.b) + mark('#fff'), jaune: losange(), barre: losange() + bars(K.k, 5, 24) }
  };
  return T[shape][style];
}
/* Fabrique utilisée par le moteur 3D pour créer les textures */
export function factory(id) {
  if (id.startsWith('GEN:')) { const [, sh, st] = id.split(':'); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">${genericInner(sh, st)}</svg>`; }
  return sign(id, 'width="512" height="512"');
}
