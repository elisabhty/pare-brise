// Validation du contenu (content/) : utilisée par le build et par les tests.
import fs from 'node:fs';
import path from 'node:path';
import { isSign, FAM } from '../src/app/signs.js';

export function validate(root = '.') {
  const P = (...a) => path.join(root, ...a);
  const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  const dir = d => fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().map(f => path.join(d, f));
  const errors = [], warn = m => errors.push(m);
  const themes = read(P('content/themes.json'));
  const cours = dir(P('content/cours')).map(f => Object.assign(read(f), { _file: path.relative(root, f) }));
  const questions = dir(P('content/questions')).flatMap(f => read(f).map(q => Object.assign(q, { _file: path.relative(root, f) })));
  const series = read(P('content/series.json'));
  const exercices = fs.existsSync(P('content/exercices.json')) ? read(P('content/exercices.json')) : [];
  const TYPES = [...fs.readFileSync(P('src/app/scenes.js'), 'utf8').matchAll(/^  (\w+): \{$/gm)].map(m => m[1]);
  const SHAPES = ['tri', 'triBas', 'cercle', 'carre', 'octo', 'losange'];
  const uniq = (list, what) => { const seen = new Set(); list.forEach(x => { if (seen.has(x.id)) warn(`${what} en double : ${x.id}`); seen.add(x.id); }); return seen; };
  const themeIds = uniq(themes, 'Thème'), coursIds = uniq(cours, 'Cours'), qIds = uniq(questions, 'Question'), sIds = uniq(series, 'Série');
  const checkSigns = (list, where) => (list || []).forEach(id => { if (!isSign(id)) warn(`${where} : panneau inconnu « ${id} »`); });

  for (const c of cours) {
    const at = `${c._file}`;
    if (!themeIds.has(c.theme)) warn(`${at} : thème inconnu « ${c.theme} »`);
    if (!c.titre) warn(`${at} : titre manquant`);
    if (!Array.isArray(c.scenes) || !c.scenes.length) { warn(`${at} : aucune scène`); continue; }
    const nch = (c.chapitres || []).length || 1;
    checkSigns(c.affiche, at + ' (affiche)');
    (c.memo || []).forEach(m => m.panneau && checkSigns([m.panneau], at + ' (mémo)'));
    (c.series || []).forEach(id => { if (!sIds.has(id)) warn(`${at} : série inconnue « ${id} »`); });
    c.scenes.forEach((s, i) => {
      const w = `${at} scène ${i} (${s.type})`;
      if (!TYPES.includes(s.type)) warn(`${w} : type inconnu. Types disponibles : ${TYPES.join(', ')}`);
      if (!s.dire || typeof s.dire !== 'string') warn(`${w} : texte « dire » manquant`);
      if ((s.ch || 0) >= nch) warn(`${w} : chapitre ${s.ch} hors limites (${nch} chapitres)`);
      checkSigns(s.panneaux, w);
      if (s.type === 'famille') { if (!FAM[s.famille]) warn(`${w} : famille inconnue « ${s.famille} »`); if (s.forme && !SHAPES.includes(s.forme)) warn(`${w} : forme inconnue « ${s.forme} »`); }
      if (s.type === 'touche') { if (!s.panneaux || !(s.bonne >= 0 && s.bonne < s.panneaux.length)) warn(`${w} : « bonne » doit désigner un des panneaux`); }
      if (s.type === 'quiz') { if (!Array.isArray(s.choix) || s.choix.length < 2 || !(s.bonne >= 0 && s.bonne < s.choix.length)) warn(`${w} : « choix » et « bonne » invalides`); }
      if ((s.type === 'touche' || s.type === 'quiz')) { if (!s.question) warn(`${w} : « question » manquante`); if (s.revoir !== undefined && !(s.revoir >= 0 && s.revoir < c.scenes.length)) warn(`${w} : « revoir » pointe hors du cours`); }
      if (s.type === 'reperes' && !(Array.isArray(s.reperes) && s.reperes.every(r => typeof r[0] === 'number' && typeof r[1] === 'string'))) warn(`${w} : « reperes » attend [[mètres, "étiquette"], …]`);
      if (s.etiquettes && s.panneaux && s.etiquettes.length !== s.panneaux.length) warn(`${w} : autant d'étiquettes que de panneaux attendues`);
      if (s.type === 'liste' && !(Array.isArray(s.items) && s.items.length)) warn(`${w} : « items » attendus`);
      if (s.type === 'situation') { (s.signaux || []).forEach(x => checkSigns([x[0]], w)); (s.acteurs || []).forEach(a => { if (!['voiture', 'velo', 'pieton', 'enfant', 'bus', 'camion', 'tracteur', 'biche', 'ambulance', 'triangle', 'portiere', 'feu', 'ballon'].includes(a.type)) warn(`${w} : acteur inconnu « ${a.type} »`); }); (s.etiquettes || []).forEach(e => { if (!(e[0] >= 0 && e[0] < (s.acteurs || []).length)) warn(`${w} : étiquette sur un acteur inexistant`); }); }
    });
  }
  for (const q of questions) {
    const w = `${q._file} ${q.id}`;
    if (!coursIds.has(q.cours)) warn(`${w} : cours inconnu « ${q.cours} »`);
    if (!q.q) warn(`${w} : énoncé « q » manquant`);
    if (q.type === 'qcm') {
      if (!Array.isArray(q.choix) || q.choix.length < 2) warn(`${w} : au moins 2 choix`);
      if (!Array.isArray(q.bonnes) || !q.bonnes.length || q.bonnes.some(b => !(b >= 0 && b < (q.choix || []).length))) warn(`${w} : « bonnes » invalides`);
      checkSigns(q.panneaux, w);
    } else if (q.type === 'association') {
      if (!Array.isArray(q.paires) || q.paires.length < 2) warn(`${w} : au moins 2 paires`);
      checkSigns((q.paires || []).map(p => p[0]), w);
    } else warn(`${w} : type de question inconnu « ${q.type} » (qcm, association)`);
  }
  for (const s of series) {
    if (!coursIds.has(s.cours)) warn(`Série ${s.id} : cours inconnu « ${s.cours} »`);
    (s.questions || []).forEach(id => { if (!qIds.has(id)) warn(`Série ${s.id} : question inconnue « ${id} »`); });
  }
  const MECAS = { freinage: ['evenements', 'kmh'], vitesse: ['zones'], distance: ['profil', 'kmh'], feu: ['distances', 'kmh'], priorite: ['scenarios'], depassement: ['scenarios'], danger: ['scenes'], eclairage: ['situations'], reflexe: [], decodeur: [] };
  const HZ = ['pieton', 'enfant', 'ballon', 'portiere', 'sortie', 'biche', 'bouchon', 'faux-pieton', 'freine-devant', 'bus'];
  const PERC = ['ballon', 'portiere', 'bus', 'telephone', 'velo', 'recul', 'camion', 'enfants', 'pietonNuit', 'veloNuit', 'biche', 'passant', 'garee', 'face', 'tracteur', 'panne', 'joggeur'];
  const FEUX = ['position', 'croisement', 'route', 'brouillardAv', 'brouillardAr', 'detresse'];
  uniq(exercices, 'Exercice');
  for (const x of exercices) {
    const w = `exercices.json ${x.id}`;
    if (!MECAS[x.meca]) { warn(`${w} : mécanique inconnue « ${x.meca} » (${Object.keys(MECAS).join(', ')})`); continue; }
    if (!x.titre) warn(`${w} : titre manquant`);
    MECAS[x.meca].forEach(k => { if (x[k] === undefined) warn(`${w} : champ « ${k} » manquant`); });
    if (x.cours && !coursIds.has(x.cours)) warn(`${w} : cours inconnu « ${x.cours} »`);
    (x.panneaux || []).forEach(p => checkSigns([p[0]], w));
    (x.evenements || []).forEach(e => { if (!HZ.includes(e)) warn(`${w} : événement inconnu « ${e} »`); });
    (x.zones || []).forEach(z => { if (!(z.d > 0 && z.lim > 0)) warn(`${w} : zone invalide`); if (z.panneau) checkSigns([z.panneau], w); (z.extra || []).forEach(e => checkSigns([e[0]], w)); });
    (x.scenarios || []).forEach((s, i) => { if (!['passer', 'ceder', 'doubler', 'rester'].includes(s.bonne)) warn(`${w} scénario ${i} : « bonne » invalide`); if (!s.explication) warn(`${w} scénario ${i} : explication manquante`); (s.panneaux || []).forEach(p => checkSigns([p[0]], w)); });
    (x.scenes || []).forEach((s, i) => (s.elements || []).forEach(e => { if (!PERC.includes(e[0])) warn(`${w} scène ${i} : élément inconnu « ${e[0]} »`); }));
    (x.situations || []).forEach((s, i) => (s.bons || []).concat(s.permis || []).forEach(b => { if (!FEUX.includes(b)) warn(`${w} situation ${i} : feu inconnu « ${b} »`); }));
  }
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === '_file' ? undefined : v)));
  return { errors, types: TYPES, data: strip({ themes, cours, questions, series, exercices }),
    stats: { themes: themes.length, cours: cours.length, scenes: cours.reduce((a, c) => a + c.scenes.length, 0), questions: questions.length, series: series.length, exercices: exercices.length } };
}
