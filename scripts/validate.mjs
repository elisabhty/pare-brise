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
  const ACTEURS = ['voiture', 'trottinette', 'velo', 'pieton', 'enfant', 'bus', 'camion', 'tracteur', 'tram', 'train', 'moto', 'biche', 'ambulance', 'triangle', 'portiere', 'feu', 'ballon'];
  const MARQUES = ['tout-droit', 'gauche', 'droite', 'tout-droit-gauche', 'tout-droit-droite', 'rabat-droite', 'rabat-gauche', 'bus', 'handicape', 'velo', 'zebras'];
  const CAMS = ['vue', 'cockpit', 'poursuite', 'drone', 'haut', 'cote', 'bilan', 'arriere', 'plan', 'proche', 'garee', 'derriere'];
  // aides visuelles du simulateur (engine/sim.js, AIDES) et illustrations d'écran (app/illu.js, ILLU)
  const AIDES = ['zone', 'bandes', 'faisceau', 'radar', 'champ', 'fleche', 'cible', 'repere', 'mesure', 'radarfixe', 'borne', 'pn', 'plots', 'manche', 'eau', 'victime', 'table', 'sos', 'issue', 'balises', 'affichette'];
  const ILLUS = ['critair', 'pictos', 'points', 'ethylotest', 'voyants', 'documents', 'telephone', 'siege', 'sieges', 'constat', 'frise', 'compteur', 'pneu', 'niveaux', 'icones', 'bareme'];
  const checkStage = (stg, sc, w) => {
    const n = (stg.acteurs || []).length, k = (sc.dire || '').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.length || 1, items = (sc.items || []).length;
    (stg.aides || []).forEach((a, j) => {
      const v = `${w} aide ${j}`;
      if (!AIDES.includes(a.type)) warn(`${v} : type inconnu « ${a.type} » (${AIDES.join(', ')})`);
      if (a.acteur !== undefined && !(a.acteur >= 0 && a.acteur < n)) warn(`${v} : acteur ${a.acteur} inexistant`);
      if (a.vers !== undefined && !(a.vers >= 0 && a.vers < n)) warn(`${v} : acteur ${a.vers} inexistant`);
      if (a.p !== undefined && !(a.p >= 0 && a.p < k)) warn(`${v} : phrase ${a.p} hors du texte (0 à ${k - 1})`);
      if (a.item !== undefined && !(a.item >= 0 && a.item < items)) warn(`${v} : élément ${a.item} hors de la liste`);
      if (a.type === 'fleche' && !(Array.isArray(a.points) && a.points.length >= 2)) warn(`${v} : une flèche a besoin d'au moins deux points`);
      if (a.texte && a.type !== 'affichette' && !(Array.isArray(a.texte) && a.texte.length === 2)) warn(`${v} : texte = [titre, sous-titre]`);
    });
    (stg.script || []).forEach(st => { if (['montrer', 'cacher'].includes(st[1]) && !(st[2] >= 0 && st[2] < n)) warn(`${w} : « ${st[1]} » sur un acteur inexistant`); if (st[1] === 'aide' && !(st[2] >= 0 && st[2] < (stg.aides || []).length)) warn(`${w} : « aide » ${st[2]} inexistante`); });
    if (stg.ego && Object.keys(stg.ego).some(x => !['disqueA', 'coffre', 'pneu'].includes(x))) warn(`${w} : ego accepte disqueA, coffre, pneu`);
  };
  const APRES = ['aucune', 'attendre', 'ralentir', 'distance', 'arret', 'freinage', 'voie', 'inserer', 'garer', 'depasser', 'feux'];
  const checkMarks = (s, w) => (s.marquages || []).forEach(m => { if (!MARQUES.includes(m[2])) warn(`${w} : marquage inconnu « ${m[2]} » (${MARQUES.join(', ')})`); });
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
      const stg = s.type === 'situation' ? s : s.decor;
      if (s.decor && !['titre', 'liste', 'chiffres', 'fin'].includes(s.type)) warn(`${w} : « decor » réservé aux titres, listes, chiffres et fins`);
      if (stg && stg.camera && !CAMS.includes(stg.camera)) warn(`${w} : caméra inconnue « ${stg.camera} » (${CAMS.join(', ')})`);
      if (stg && stg.meteo && !['jour', 'sec', 'nuit', 'pluie', 'brouillard', 'neige', 'couchant'].includes(stg.meteo)) warn(`${w} : météo inconnue « ${stg.meteo} »`);
      if (stg && stg !== s) { checkMarks(stg, w); (stg.signaux || []).forEach(x => checkSigns([x[0]], w)); (stg.acteurs || []).forEach(a => { if (!ACTEURS.includes(a.type)) warn(`${w} décor : acteur inconnu « ${a.type} »`); }); (stg.etiquettes || []).forEach(e => { if (!(e[0] >= 0 && e[0] < (stg.acteurs || []).length)) warn(`${w} décor : étiquette sur un acteur inexistant`); }); }
      if (s.sync) { const n = (s.items || s.panneaux || []).length, k = (s.dire || '').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.length || 1; if (s.sync.length !== n || s.sync.some(v => !(v >= 0 && v < k))) warn(`${w} : « sync » doit donner, pour chaque élément, une phrase entre 0 et ${k - 1}`); }
      if (stg && stg.script) stg.script.forEach(st => { const t = st[0]; if (typeof t === 'string' && !/^p\d+(\+[\d.]+)?$/.test(t)) warn(`${w} : temps de scénario « ${t} » (secondes ou « p2 », « p2+1.5 »)`); });
      if (stg) checkStage(stg, s, w);
      if (s.illu) { if (!ILLUS.includes(s.illu.type)) warn(`${w} : illustration inconnue « ${s.illu.type} » (${ILLUS.join(', ')})`); if (s.illu.suit && !s.sync) warn(`${w} : illustration « suit » sans liste synchronisée`); if (s.illu.etapes && s.illu.etapes.some(v => !(v >= 0))) warn(`${w} : étapes d'illustration invalides`); }
      if (s.type === 'situation') { checkMarks(s, w); (s.signaux || []).forEach(x => checkSigns([x[0]], w)); (s.acteurs || []).forEach(a => { if (!ACTEURS.includes(a.type)) warn(`${w} : acteur inconnu « ${a.type} »`); }); (s.etiquettes || []).forEach(e => { if (!(e[0] >= 0 && e[0] < (s.acteurs || []).length)) warn(`${w} : étiquette sur un acteur inexistant`); }); }
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
  const MECAS = { examen: ['situations'], freinage: ['evenements', 'kmh'], vitesse: ['zones'], distance: ['profil', 'kmh'], feu: ['distances', 'kmh'], priorite: ['scenarios'], depassement: ['scenarios'], danger: ['scenes'], eclairage: ['situations'], reflexe: [], decodeur: [] };
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
    if (x.meca === 'eclairage') (x.situations || []).forEach((s, i) => (s.bons || []).concat(s.permis || []).forEach(b => { if (!FEUX.includes(b)) warn(`${w} situation ${i} : feu inconnu « ${b} »`); }));
    if (x.meca === 'examen') (x.situations || []).forEach((s, i) => {
      const v = `${w} situation ${i}`;
      if (!s.q || !s.explication) warn(`${v} : question ou explication manquante`);
      if (!Array.isArray(s.choix) || s.choix.length < 2 || s.choix.length > 4) warn(`${v} : 2 à 4 réponses attendues`);
      if (!Array.isArray(s.bonnes) || !s.bonnes.length || s.bonnes.some(k => !(k >= 0 && k < (s.choix || []).length))) warn(`${v} : « bonnes » invalide`);
      checkMarks(s, v);
      [s.camera, s.puis].forEach(cm => { if (cm && !CAMS.includes(cm)) warn(`${v} : caméra inconnue « ${cm} » (${CAMS.join(', ')})`); });
      if (s.apres && !APRES.includes(s.apres.action)) warn(`${v} : démonstration inconnue « ${s.apres.action} » (${APRES.join(', ')})`);
      (s.signaux || []).forEach(p => checkSigns([p[0]], v));
      (s.acteurs || []).forEach(a => { if (!ACTEURS.includes(a.type)) warn(`${v} : acteur inconnu « ${a.type} »`); });
      // video : la scène se joue puis se fige · image : image figée, sans vidéo · qcm : question de cours, sans décor
      if (s.mode !== undefined && !['video', 'image', 'qcm'].includes(s.mode)) warn(`${v} : mode inconnu « ${s.mode} » (video, image, qcm)`);
      if (s.mode !== 'qcm' && !s.env) warn(`${v} : une situation en 3D a besoin d'un décor (env)`);
      if (s.mode === 'qcm' && (s.acteurs || s.signaux || s.apres && s.apres.action !== 'aucune')) warn(`${v} : une question de cours (qcm) n'a ni décor ni démonstration`);
      if (s.panneauxChoix) { checkSigns(s.panneauxChoix, v); if (s.panneauxChoix.length !== (s.choix || []).length) warn(`${v} : autant de panneaux que de réponses`); }
    });
  }
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === '_file' ? undefined : v)));
  return { errors, types: TYPES, data: strip({ themes, cours, questions, series, exercices }),
    stats: { themes: themes.length, cours: cours.length, scenes: cours.reduce((a, c) => a + c.scenes.length, 0), questions: questions.length, series: series.length, exercices: exercices.length } };
}
