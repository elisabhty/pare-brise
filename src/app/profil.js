/* Profil : prénom (pour saluer), pseudo (ton nom dans la salle de code) et personnage (ton avatar).
   Premier lancement : une courte arrivée (bienvenue → prénom → pseudo → personnage → rythme → prêt). Ensuite, le profil se
   modifie d'un appui sur l'avatar de l'accueil. */
import { $, $$, esc, store, haptic } from './util.js';
import { register, show } from './nav.js';
import { Sound } from './sound.js';
import { plot } from './mascot.js';
import { streak, best, activeCount, FLAME } from './streak.js';
import { draftFrom, rythmeHTML, bindRythme, draftOut, createPlan, todayInfo, stats } from './planning.js';
import { relJour, fromIso } from './dates.js';

export const getProfil = () => store.get('profil', null);
const saveProfil = p => { store.set('profil', p); try { document.dispatchEvent(new CustomEvent('pb:profil')); } catch (e) {} };
export const salut = (h = new Date().getHours()) => (h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir');

/* ---------- pseudo ---------- */
export const pseudoForme = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^a-z0-9_.]/g, '').slice(0, 15);
export const pseudoOk = s => /^[a-z0-9][a-z0-9_.]{2,14}$/.test(s);
export function pseudoIdees(prenom) {
  const b = (pseudoForme(prenom).replace(/[._]/g, '') || 'eleve').slice(0, 8), n = 10 + Math.floor(Math.random() * 89);
  return [`${b}_2027`, `${b}.auvolant`, `${b}_${n}`, `${b}.code`].filter(pseudoOk).slice(0, 3);
}

/* ---------- personnages ---------- */
export const PERSOS = [
  { id: 'lea', nom: 'cheveux longs bruns', skin: '#F3CFB3', hair: '#4A2B1D', style: 'long', top: '#3D7BFF', bg: ['#E6F0FF', '#B8D3FF'], acc: ['boucles'] },
  { id: 'sami', nom: 'cheveux bouclés, sweat orange', skin: '#A8714F', hair: '#1F1612', style: 'boucles', top: '#FF8A2A', bg: ['#FFF1E2', '#FFD1A3'], acc: ['sweat'] },
  { id: 'ines', nom: 'chignon', skin: '#E2AE8C', hair: '#2E1D16', style: 'chignon', top: '#FF5C8A', bg: ['#FFE9F1', '#FFC4D7'], acc: [] },
  { id: 'tom', nom: 'cheveux blonds, lunettes', skin: '#F7D8C3', hair: '#E0B25A', style: 'court', top: '#2FB574', bg: ['#E3F8EE', '#B3E9CC'], acc: ['lunettes'] },
  { id: 'maya', nom: 'couettes afro', skin: '#7B4A33', hair: '#1C1310', style: 'couettes', top: '#FFC93C', bg: ['#FFF8DD', '#FFE59A'], acc: [] },
  { id: 'hugo', nom: 'casquette rouge', skin: '#EDC3A4', hair: '#6B4630', style: 'casquette', top: '#1F3A8A', bg: ['#E7EDFF', '#C1CEF6'], acc: [], cap: '#E8443A' },
  { id: 'nora', nom: 'carré roux, taches de rousseur', skin: '#F8DCC8', hair: '#C4552F', style: 'carre', top: '#8B5CF6', bg: ['#F2EBFF', '#D7C6FF'], acc: ['taches'] },
  { id: 'malik', nom: 'cheveux courts, barbe', skin: '#B77A56', hair: '#241813', style: 'ras', top: '#14A3A3', bg: ['#E0F7F6', '#A9E4E1'], acc: ['barbe'] }
];
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};
let uid = 0;
export function persoSvg(id) {
  const p = PERSOS.find(x => x.id === id) || PERSOS[0], u = 'pp' + (++uid), s = p.skin, sd = shade(s, -0.16), h = p.hair, hl = shade(h, 0.3), acc = p.acc;
  const back = {
    long: `<path d="M33 52c-4 22-3 46 4 62h46c7-16 8-40 4-62z" fill="${h}"/>`,
    carre: `<path d="M33 50c-3 14-2 27 3 35h48c5-8 6-21 3-35z" fill="${h}"/>`,
    chignon: `<circle cx="60" cy="22" r="12.5" fill="${h}"/><path d="M50 26q10-5 20 0" stroke="${hl}" stroke-width="2" fill="none" opacity=".45"/>`,
    couettes: `<circle cx="31" cy="36" r="14" fill="${h}"/><circle cx="89" cy="36" r="14" fill="${h}"/><circle cx="27" cy="32" r="4" fill="${hl}" opacity=".25"/><circle cx="85" cy="32" r="4" fill="${hl}" opacity=".25"/>`
  }[p.style] || '';
  let curls = '';
  if (p.style === 'boucles') {
    for (let k = 0; k <= 12; k++) { const a = Math.PI * (1.02 + k / 12 * 0.96); curls += `<circle cx="${(60 + 25 * Math.cos(a)).toFixed(1)}" cy="${(52 + 25 * Math.sin(a)).toFixed(1)}" r="7.4" fill="${h}"/>`; }
    [[48, 30], [60, 27], [72, 30], [54, 35], [66, 35]].forEach(([x, y]) => { curls += `<circle cx="${x}" cy="${y}" r="7" fill="${h}"/>`; });
    curls += `<circle cx="52" cy="28" r="2.4" fill="${hl}" opacity=".35"/><circle cx="68" cy="30" r="2" fill="${hl}" opacity=".3"/>`;
  }
  const cap = p.cap || '#E8443A';
  const front = {
    long: `<path d="M35 54c-2-20 9-30 25-30s28 9 26 30c-5-9-13-15-24-15-11 0-20 6-27 15z" fill="${h}"/><path d="M58 26c-4 6-9 10-16 12" stroke="${hl}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".45"/>`,
    carre: `<path d="M34 56c-3-22 9-32 26-32s29 10 26 32c-2-7-6-12-12-15l-6 6-8-6-8 6-6-5c-6 3-10 8-12 14z" fill="${h}"/><path d="M48 29q8-3 16 0" stroke="${hl}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>`,
    chignon: `<path d="M36 51c-1-17 10-26 24-26s25 9 24 26c-5-8-14-12-24-12s-19 4-24 12z" fill="${h}"/>`,
    court: `<path d="M36 51c-2-18 10-27 24-27 15 0 26 9 24 27-4-7-8-10-13-11l-2 4-4-6c-8 0-18 3-29 13z" fill="${h}"/><path d="M52 28q8-3 16 1" stroke="${hl}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".5"/>`,
    couettes: `<path d="M36 51c-1-17 10-26 24-26s25 9 24 26c-5-8-14-12-24-12s-19 4-24 12z" fill="${h}"/><path d="M60 26v12" stroke="${shade(h, 0.15)}" stroke-width="1.6"/>`,
    boucles: curls,
    ras: `<path d="M37 48c0-15 10-23 23-23s23 8 23 23c-6-5-14-7-23-7s-17 2-23 7z" fill="${h}"/>`,
    casquette: `<path d="M36 49c-1 6 0 10 2 13M84 49c1 6 0 10-2 13" stroke="${h}" stroke-width="4" stroke-linecap="round"/><path d="M35 48c0-15 11-24 25-24s25 9 25 24z" fill="${cap}"/><path d="M35 48c0-15 11-24 25-24" stroke="${shade(cap, 0.3)}" stroke-width="2" fill="none" opacity=".6"/><path d="M58 48c12-3 26-2 36 3-2 3-7 5-12 4-8-2-16-4-24-3z" fill="${shade(cap, -0.22)}"/><circle cx="60" cy="24.5" r="2.3" fill="${shade(cap, -0.3)}"/>`
  }[p.style] || '';
  const sweat = acc.includes('sweat') ? `<path d="M40 92c4 9 11 13 20 13s16-4 20-13" fill="none" stroke="${shade(p.top, -0.18)}" stroke-width="5" stroke-linecap="round"/><path d="M54 100v10M66 100v10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>` : '';
  const barbe = acc.includes('barbe') ? `<path d="M37 58c0 17 9 29 23 29s23-12 23-29c-3 9-7 13-11 14-3-3-8-4-12-4s-9 1-12 4c-4-1-8-5-11-14z" fill="${h}"/>` : '';
  const taches = acc.includes('taches') ? [[44, 63], [47.5, 65.5], [42, 66.5], [76, 63], [72.5, 65.5], [78, 66.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".95" fill="${shade(s, -0.4)}" opacity=".7"/>`).join('') : '';
  const lunettes = acc.includes('lunettes') ? `<g fill="rgba(255,255,255,.2)" stroke="#1E2433" stroke-width="2.1"><circle cx="51" cy="58" r="7"/><circle cx="69" cy="58" r="7"/></g><path d="M58 58h4M44 57l-7-2M76 57l7-2" stroke="#1E2433" stroke-width="2" stroke-linecap="round"/>` : '';
  const boucles = acc.includes('boucles') ? `<circle cx="36.5" cy="67" r="2.4" fill="#F5B83D"/><circle cx="83.5" cy="67" r="2.4" fill="#F5B83D"/>` : '';
  const brow = shade(h, h === '#E0B25A' ? -0.35 : -0.05);
  return `<svg viewBox="0 0 120 120" class="perso" role="img" aria-label="Personnage : ${esc(p.nom)}"><defs>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
    <radialGradient id="${u}h" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>
    <linearGradient id="${u}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(p.top, 0.12)}"/><stop offset="1" stop-color="${shade(p.top, -0.12)}"/></linearGradient>
    <clipPath id="${u}c"><circle cx="60" cy="60" r="60"/></clipPath></defs>
    <g clip-path="url(#${u}c)"><rect width="120" height="120" fill="url(#${u}b)"/>
    <circle cx="96" cy="22" r="26" fill="#fff" opacity=".25"/>
    ${back}
    <path d="M12 124c2-21 21-33 48-33s46 12 48 33z" fill="url(#${u}t)"/>
    <rect x="51" y="70" width="18" height="24" rx="8" fill="${sd}"/>
    <path d="M48 91q12 15 24 0z" fill="${sd}"/>${sweat}
    <ellipse cx="36.5" cy="58" rx="4.6" ry="6.2" fill="${s}"/><ellipse cx="83.5" cy="58" rx="4.6" ry="6.2" fill="${s}"/>
    <ellipse cx="60" cy="55" rx="24" ry="26.5" fill="${s}"/><ellipse cx="60" cy="55" rx="24" ry="26.5" fill="url(#${u}h)"/>
    ${barbe}${taches}
    <circle cx="45" cy="66" r="4.4" fill="#FF7A6B" opacity=".2"/><circle cx="75" cy="66" r="4.4" fill="#FF7A6B" opacity=".2"/>
    <ellipse cx="51" cy="58" rx="3.1" ry="3.8" fill="#1E2433"/><ellipse cx="69" cy="58" rx="3.1" ry="3.8" fill="#1E2433"/>
    <circle cx="52.2" cy="56.6" r="1.15" fill="#fff"/><circle cx="70.2" cy="56.6" r="1.15" fill="#fff"/>
    <path d="M46.5 50.6q4.5-2.8 9-.7M64.5 49.9q4.5-2.1 9 .7" stroke="${brow}" stroke-width="2.3" stroke-linecap="round" fill="none"/>
    <path d="M60 60q-2.6 4.8.8 5.8" stroke="${sd}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M53 68.6q7 8.6 14 0z" fill="#7A2E2A"/><path d="M55.6 70.4q4.4 2.6 8.8 0z" fill="#fff" opacity=".92"/>
    ${front}${lunettes}${boucles}</g></svg>`;
}
export const avatarHTML = (id, cls = '') => `<span class="av ${cls}">${persoSvg(id)}</span>`;

/* ---------- arrivée (premier lancement) ---------- */
const STEPS = ['bienvenue', 'prenom', 'pseudo', 'perso', 'rythme', 'pret'];
let step = 0, draft = null, rDraft = null, onDone = () => {};
function footer(label, fn, { off = false, second = null } = {}) {
  const f = $('#obFoot');
  f.innerHTML = `<button class="btn" id="obGo"${off ? ' disabled' : ''}>${esc(label)}</button>${second ? `<button class="ob-skip" id="obSkip">${esc(second[0])}</button>` : ''}`;
  $('#obGo').addEventListener('click', () => { haptic(); Sound.ui('tap'); fn(); });
  if (second) $('#obSkip').addEventListener('click', () => { haptic(); second[1](); });
}
const goto = k => { step = k; paint(); };
function dots() { return `<div class="ob-dots" aria-hidden="true">${STEPS.slice(1, 5).map((_, k) => `<i class="${k < step ? 'on' : ''}${k === step - 1 ? ' cur' : ''}"></i>`).join('')}</div>`; }
function paint() {
  const c = $('#obCard'), k = STEPS[step];
  c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
  c.dataset.step = k;
  if (k === 'bienvenue') {
    c.innerHTML = `<div class="ob-hero">${plot({ size: 112, bubble: 'Salut !' })}</div><h1 class="ob-t">Bienvenue dans ta <em>salle de code</em></h1><p class="ob-p">Je suis Plot, ton moniteur. Faisons connaissance : trois questions, et ton planning est prêt.</p>`;
    footer('C’est parti', () => goto(1));
  } else if (k === 'prenom') {
    c.innerHTML = `${dots()}<h1 class="ob-t">Comment tu t’appelles&nbsp;?</h1><p class="ob-p">Je l’utiliserai pour te saluer.</p>
      <label class="ob-field"><span>Ton prénom</span><input id="obPrenom" type="text" maxlength="24" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" placeholder="Ex. Léa" value="${esc(draft.prenom || '')}"></label>
      <div class="ob-hi" id="obHi"${draft.prenom ? '' : ' hidden'}>${plot({ size: 56, mood: 'cheer' })}<div><b id="obHiT">Enchanté, ${esc(draft.prenom || '')}&nbsp;!</b><span>J’ai hâte de te voir au volant.</span></div></div>`;
    const inp = $('#obPrenom');
    const upd = () => { draft.prenom = inp.value.trim().replace(/\s+/g, ' '); $('#obGo').disabled = !draft.prenom; const hi = $('#obHi'); if (draft.prenom) { if (hi.hidden) { hi.hidden = false; hi.classList.remove('pop'); void hi.offsetWidth; hi.classList.add('pop'); } $('#obHiT').innerHTML = `Enchanté, ${esc(draft.prenom)}&nbsp;!`; } else hi.hidden = true; };
    footer('Continuer', () => { if (!draft.prenom) return; if (!draft.pseudo) draft.pseudo = pseudoIdees(draft.prenom)[0]; goto(2); }, { off: !draft.prenom });
    inp.addEventListener('input', upd); inp.addEventListener('keydown', e => { if (e.key === 'Enter' && draft.prenom) { e.preventDefault(); $('#obGo').click(); } });
    setTimeout(() => inp.focus({ preventScroll: true }), 350);
  } else if (k === 'pseudo') {
    c.innerHTML = `${dots()}<h1 class="ob-t">Choisis ton <em>pseudo</em></h1><p class="ob-p">C’est ton nom dans la salle de code, à côté de ton personnage.</p>
      <label class="ob-field ob-at"><span>Ton pseudo</span><span class="ob-at-box"><b aria-hidden="true">@</b><input id="obPseudo" type="text" maxlength="15" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="lea_2027" value="${esc(draft.pseudo || '')}"></span></label>
      <p class="ob-ps" id="obPs" aria-live="polite"></p>
      <div class="ob-idees"><span>Idées</span>${pseudoIdees(draft.prenom).map(x => `<button type="button" class="chipb" data-ps="${esc(x)}">@${esc(x)}</button>`).join('')}</div>`;
    const inp = $('#obPseudo');
    const upd = () => { const v = pseudoForme(inp.value); if (inp.value !== v) inp.value = v; draft.pseudo = v; const ok = pseudoOk(v); $('#obPs').textContent = !v ? '' : ok ? `@${v} est à toi.` : '3 à 15 caractères : lettres, chiffres, point ou tiret bas.'; $('#obPs').className = 'ob-ps ' + (ok ? 'ok' : v ? 'ko' : ''); $('#obGo').disabled = !ok; };
    footer('C’est mon pseudo', () => { if (pseudoOk(draft.pseudo)) goto(3); }, { off: !pseudoOk(draft.pseudo || '') });
    inp.addEventListener('input', upd); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#obGo').click(); } });
    $$('[data-ps]', c).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); inp.value = b.dataset.ps; upd(); }));
    upd();
  } else if (k === 'perso') {
    c.innerHTML = `${dots()}<h1 class="ob-t">Choisis ton <em>personnage</em></h1><p class="ob-p">C’est toi, dans la salle et sur ton profil.</p>
      <div class="ob-me" id="obMe">${avatarHTML(draft.perso, 'xl')}<div><b>${esc(draft.prenom)}</b><span>@${esc(draft.pseudo)}</span></div></div>
      ${persoGrid(draft.perso)}`;
    bindGrid(c, id => { draft.perso = id; const m = $('#obMe .av'); m.outerHTML = avatarHTML(id, 'xl pop'); });
    footer('Continuer', () => goto(4));
  } else if (k === 'rythme') {
    c.innerHTML = `${dots()}<h1 class="ob-t">Ton <em>rythme</em></h1><p class="ob-p">Je répartis les leçons, leurs pratiques en 3D et les examens blancs sur tes jours, jusqu’au jour J.</p>${rythmeHTML(rDraft)}`;
    bindRythme(c, rDraft, () => { $('#obGo').disabled = !rDraft.jours.length; });
    footer('Créer mon planning', () => { if (!rDraft.jours.length) return; createPlan(draftOut(rDraft)); finish(); }, { second: ['Plus tard', finish] });
  } else if (k === 'pret') {
    const i = todayInfo(), nx = i && (i.s ? i.s : i.next), nd = nx ? fromIso(nx.d) : null;
    c.innerHTML = `<div class="ob-hero">${avatarHTML(draft.perso, 'xxl pop')}</div><h1 class="ob-t">Ta place t’attend, <em>${esc(draft.prenom)}</em></h1>
      <p class="ob-p">${nd ? `Première séance ${relJour(nd).toLowerCase()} : ${nx.items.length} activité${nx.items.length > 1 ? 's' : ''}. Ton planning est dans l’onglet Planning.` : 'Tu pourras créer ton planning quand tu veux, dans l’onglet Planning.'}</p>`;
    footer('Entrer dans la salle', () => { onDone(); });
    Sound.ui('ok'); haptic('ok');
  }
}
function finish() {
  saveProfil({ prenom: draft.prenom, pseudo: draft.pseudo, perso: draft.perso, cree: Date.now() });
  goto(5);
}
export const persoGrid = sel => `<div class="pg-grid" role="radiogroup" aria-label="Personnages">${PERSOS.map((p, k) => `<button type="button" role="radio" class="pg-it" data-perso="${p.id}" aria-checked="${p.id === sel}" style="--i:${k}">${persoSvg(p.id)}</button>`).join('')}</div>`;
export function bindGrid(root, onPick) {
  $$('[data-perso]', root).forEach(b => b.addEventListener('click', () => { haptic(); Sound.ui('tick'); $$('[data-perso]', root).forEach(x => x.setAttribute('aria-checked', x === b)); onPick(b.dataset.perso); }));
}

/* ---------- feuille « Mon profil » ---------- */
export function openProfil(openSheet, after) {
  const p = Object.assign({}, getProfil() || { prenom: '', pseudo: '', perso: PERSOS[0].id });
  const n = streak(), rec = best(), st = stats();
  openSheet(`<div class="pf-head" id="pfHead">${avatarHTML(p.perso, 'xl')}<div><b id="pfName">${esc(p.prenom)}</b><span id="pfPs">@${esc(p.pseudo)}</span></div></div>
    <div class="pf-stats"><div><b class="num pf-n">${FLAME}${n}</b><small>série</small></div><div><b class="num">${rec}</b><small>record</small></div><div><b class="num">${activeCount()}</b><small>jours actifs</small></div><div><b class="num">${st.done}</b><small>activités</small></div></div>
    <h3 class="pf-h">Personnage</h3>${persoGrid(p.perso)}
    <h3 class="pf-h">Identité</h3>
    <label class="ob-field"><span>Prénom</span><input id="pfPrenom" type="text" maxlength="24" autocomplete="given-name" autocapitalize="words" value="${esc(p.prenom)}"></label>
    <label class="ob-field ob-at"><span>Pseudo</span><span class="ob-at-box"><b aria-hidden="true">@</b><input id="pfPseudo" type="text" maxlength="15" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(p.pseudo)}"></span></label>
    <p class="ob-ps" id="pfPs2" aria-live="polite"></p>
    <div class="bs-btns"><button class="btn" id="pfSave">Enregistrer</button><button class="btn ghost" data-close>Fermer</button></div>`, (sh, close) => {
    const pr = $('#pfPrenom', sh), ps = $('#pfPseudo', sh), save = $('#pfSave', sh);
    const upd = () => {
      p.prenom = pr.value.trim().replace(/\s+/g, ' '); const v = pseudoForme(ps.value); if (ps.value !== v) ps.value = v; p.pseudo = v;
      const ok = !!p.prenom && pseudoOk(v); save.disabled = !ok;
      $('#pfName', sh).textContent = p.prenom || '—'; $('#pfPs', sh).textContent = '@' + v;
      $('#pfPs2', sh).textContent = v && !pseudoOk(v) ? '3 à 15 caractères : lettres, chiffres, point ou tiret bas.' : ''; $('#pfPs2', sh).className = 'ob-ps ' + (v && !pseudoOk(v) ? 'ko' : '');
    };
    pr.addEventListener('input', upd); ps.addEventListener('input', upd);
    bindGrid(sh, id => { p.perso = id; $('#pfHead .av', sh).outerHTML = avatarHTML(id, 'xl pop'); });
    save.addEventListener('click', () => { haptic('ok'); Sound.ui('ok'); saveProfil(Object.assign({}, getProfil(), p)); close(); after && after(); });
  });
}

export function setupProfil({ done, enter }) {
  onDone = done;
  register('bienvenue', { world: 'salle', amb: 'salle', noTab: true, region: () => $('#v-bienv'),
    enter() { if (enter) enter(); draft = Object.assign({ prenom: '', pseudo: '', perso: PERSOS[0].id }, getProfil() || {}); rDraft = draftFrom(null); step = 0; paint(); } });
}
export const needsOnboarding = () => { const p = getProfil(); return !p || !p.prenom; };
