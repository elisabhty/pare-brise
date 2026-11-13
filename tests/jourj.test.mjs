// Onglets de l'app et onglet « Réserver » (le vrai examen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lire, PRIX, OPERATEURS, ANTS, cpOk, lienLaPoste, heureOk, dateOk, heureFr, joursAvant, dernierJourPourReserver, etape, niveau, badge, SEUIL } from '../src/app/jourj-core.js';
import { fromIso, iso } from '../src/app/dates.js';

const html = fs.readFileSync('src/index.html', 'utf8'), nav = fs.readFileSync('src/app/nav.js', 'utf8');
const src = ['screens', 'exos', 'jourj', 'planning', 'main', 'scenes'].map(f => fs.readFileSync(`src/app/${f}.js`, 'utf8')).join('\n');
const VEN = fromIso('2026-11-13');
const tabs = [...html.match(/<nav class="tabbar"[\s\S]*?<\/nav>/)[0].matchAll(/data-go="(\w+)"[\s\S]*?<span[^>]*>([^<]+)<\/span>/g)].map(m => [m[1], m[2]]);

test('cinq onglets, chacun avec sa page : Salle, Cours, S’entraîner, Planning, Réserver', () => {
  assert.deepEqual(tabs, [['salle', 'Salle'], ['parcours', 'Cours'], ['entrainer', 'S’entraîner'], ['planning', 'Planning'], ['jourj', 'Réserver']]);
  tabs.forEach(([id]) => { assert.ok(html.includes(`id="s-${id}"`), `écran ${id}`); assert.ok(src.includes(`register('${id}'`), `écran ${id} enregistré`); });
});
test('l’onglet Exercices a disparu : questions et conduite 3D sont les deux volets de S’entraîner', () => {
  assert.ok(!html.includes('id="s-exos"') && !html.includes('id="s-examen"'));
  assert.ok(!src.includes("register('exos'") && !src.includes("register('examen'"));
  const ent = html.match(/id="s-entrainer"[\s\S]*?<\/section>/)[0];
  assert.deepEqual([...ent.matchAll(/data-volet="(\w+)"/g)].map(m => m[1]), ['questions', 'conduite']);
  // rien n'est perdu : examen blanc, examen rapide, à revoir, séries d'un côté ; pratiques, défis et outils de l'autre
  ['data-exo="x-exam-blanc"', 'id="hubExam"', 'id="hubReview"', 'id="hubSeries"'].forEach(k => assert.ok(ent.split('id="entC"')[0].includes(k), k));
  ['id="xHubStats"', 'id="xFeat"', 'id="xHubList"', 'data-go="parebrise"', 'data-go="decodeur"'].forEach(k => assert.ok(ent.split('id="entC"')[1].includes(k), k));
});
test('les anciens chemins mènent au bon volet (retour d’une série, d’un exercice, vieux liens)', () => {
  assert.ok(nav.includes("examen: ['entrainer', 'questions']") && nav.includes("exos: ['entrainer', 'conduite']"));
  assert.ok(src.includes("tab: 'entrainer'") && !/tab: '(exos|examen)'/.test(src));
  // tout bouton de navigation de la page pointe vers un écran qui existe
  const connus = new Set([...src.matchAll(/register\('(\w+)'/g)].map(m => m[1]).concat(['examen', 'exos']));
  [...html.matchAll(/data-go="(\w+)"/g)].forEach(m => assert.ok(connus.has(m[1]), `data-go="${m[1]}"`));
});

test('les cinq centres agréés, La Poste en premier, et le prix réglementé', () => {
  assert.equal(PRIX, 30);
  assert.deepEqual(OPERATEURS.map(o => o.id), ['laposte', 'sgs', 'pearson', 'veritas', 'dekra']);
  OPERATEURS.forEach(o => assert.ok(/^https:\/\/[a-z0-9.-]+\.(fr|com)\//.test(o.url), o.url));
  assert.equal(OPERATEURS[0].url, 'https://www.lecode.laposte.fr/');
  assert.equal(ANTS, 'https://permisdeconduire.ants.gouv.fr/');
});
test('le lien La Poste s’ouvre sur la commune quand le code postal est complet', () => {
  assert.equal(lienLaPoste('75011'), 'https://www.lecode.laposte.fr/passermonexamenducodeaveclaposte/common/recherche-session?city=75011');
  assert.equal(lienLaPoste(' 20000 '), 'https://www.lecode.laposte.fr/passermonexamenducodeaveclaposte/common/recherche-session?city=20000');
  ['', '7501', '750111', 'abcde', '00100', '99000', null, undefined].forEach(cp => { assert.equal(cpOk(cp), false, String(cp)); assert.equal(lienLaPoste(cp), 'https://www.lecode.laposte.fr/'); });
  ['01000', '13001', '69003', '97400', '98000'].forEach(cp => assert.ok(cpOk(cp), cp));
});
test('rien d’autre qu’un code postal ne part dans le lien', () => {
  ['75011&x=1', '75011 Paris', '<script>', '75011#'].forEach(v => assert.ok(!lienLaPoste(v).includes('city='), v));
});
test('le numéro NEPH n’est jamais demandé ni gardé', () => {
  const jj = fs.readFileSync('src/app/jourj.js', 'utf8');
  assert.deepEqual(Object.keys(lire(null)).sort(), ['cp', 'neph', 'nephLe', 'resa', 'resultat', 'sac']);
  assert.ok(['non', 'attente', 'oui'].includes(lire(null).neph));
  assert.ok(!/<input[^>]*neph/i.test(jj), 'aucun champ pour saisir le NEPH');
});

test('dates et heures de la session', () => {
  assert.ok(dateOk('2026-11-25') && !dateOk('2026-02-30') && !dateOk('25/11/2026') && !dateOk(''));
  assert.ok(heureOk('09:00') && heureOk('23:59') && !heureOk('24:00') && !heureOk('9:00') && !heureOk(''));
  assert.equal(heureFr('14:30'), '14 h 30'); assert.equal(heureFr('09:00'), '9 h'); assert.equal(heureFr(''), '');
  const e = lire({ resa: { d: '2026-11-25', h: '14:30', op: 'laposte' } });
  assert.equal(joursAvant(e, VEN), 12);
  assert.equal(joursAvant(lire(null), VEN), null);
  // on s'inscrit au plus tard la veille de l'épreuve (arrêté du 16 avril 2026, en vigueur le 1er juillet 2026)
  assert.equal(iso(dernierJourPourReserver('2026-11-25')), '2026-11-24');
  assert.equal(iso(dernierJourPourReserver('2026-12-01')), '2026-11-30');
});
test('l’étape suit l’élève : NEPH, niveau, réservation, attente, jour J, résultat', () => {
  const resa = d => ({ d, h: '09:00', lieu: '', op: 'laposte' });
  assert.equal(etape(lire(null), VEN, false), 'neph');
  assert.equal(etape(lire({ neph: 'attente' }), VEN, true), 'neph');
  assert.equal(etape(lire({ neph: 'oui' }), VEN, false), 'niveau');
  assert.equal(etape(lire({ neph: 'oui' }), VEN, true), 'reserver');
  assert.equal(etape(lire({ neph: 'oui', resa: resa('2026-11-25') }), VEN, false), 'attente');
  assert.equal(etape(lire({ neph: 'oui', resa: resa('2026-11-13') }), VEN, false), 'jourj');
  assert.equal(etape(lire({ neph: 'oui', resa: resa('2026-11-10') }), VEN, false), 'resultat');
  assert.equal(etape(lire({ neph: 'oui', resa: resa('2026-11-10'), resultat: 'ok' }), VEN, false), 'reussi');
  assert.equal(etape(lire({ neph: 'oui', resa: resa('2026-11-10'), resultat: 'ko' }), VEN, false), 'rate');
});
test('« prêt » = les deux derniers examens à 35 sur 40 ou plus', () => {
  assert.equal(SEUIL, 0.875);
  const n = ex => niveau({ examens: ex, coursVus: 35, coursTotal: 35 });
  assert.equal(n([]).pret, false);
  assert.equal(n([{ score: 90, total: 100 }]).pret, false);
  assert.equal(n([{ score: 35, total: 40 }, { score: 87.5, total: 100 }]).pret, true);
  assert.equal(n([{ score: 39, total: 40 }, { score: 34, total: 40 }]).pret, false);
  assert.equal(n([{ score: 20, total: 40 }, { score: 36, total: 40 }, { score: 18, total: 20 }]).pret, true);   // seuls les deux derniers comptent
  assert.match(niveau({ examens: [], coursVus: 30, coursTotal: 35 }).conseil, /Il te reste 5 cours/);
  [n([]), n([{ score: 1, total: 40 }]), n([{ score: 36, total: 40 }]), n([{ score: 36, total: 40 }, { score: 36, total: 40 }])].forEach(x => assert.ok(x.conseil.length > 20 && x.conseil.length < 110, x.conseil));
});
test('l’onglet compte les jours (« J-12 », « Jour J »), et reprend son nom sans session à venir', () => {
  const r = d => lire({ resa: { d, h: '', op: 'laposte' } });
  assert.equal(badge(r('2026-11-25'), VEN), 'J-12');
  assert.equal(badge(r('2026-11-14'), VEN), 'J-1');
  assert.equal(badge(r('2026-11-13'), VEN), 'Jour J');
  assert.equal(badge(r('2026-11-10'), VEN), '');
  assert.equal(badge(lire(null), VEN), '');
  assert.equal(badge(lire({ resa: { d: '2026-11-25' }, resultat: 'ok' }), VEN), '');
});
test('chaque examen blanc garde sa note, pour dire « prêt » le moment venu', () => {
  assert.ok(src.includes("if (id === 'x-exam-blanc') store.set('blancs'"));
});
test('les textes de l’app ne promettent rien pour plus tard dans l’onglet Réserver', () => {
  const jj = fs.readFileSync('src/app/jourj.js', 'utf8') + fs.readFileSync('src/app/jourj-core.js', 'utf8');
  assert.ok(!/bient[oô]t|prochainement/i.test(jj));
});
