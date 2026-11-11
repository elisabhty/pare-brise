import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate } from '../scripts/validate.mjs';
import { isSign } from '../src/app/signs.js';

const { errors, data } = validate('.');
const exos = data.exercices;

test('le contenu des exercices est valide', () => { assert.deepEqual(errors, []); });
test('chaque thème officiel a au moins un cours', () => {
  data.themes.forEach(t => assert.ok(data.cours.some(c => c.theme === t.id), `aucun cours pour ${t.id}`));
});
test('chaque mécanique d’exercice est jouée par le code', () => {
  const src = fs.readFileSync('src/app/exos.js', 'utf8');
  new Set(exos.map(e => e.meca)).forEach(m => { if (m === 'reflexe' || m === 'decodeur') return; assert.ok(src.includes(`MECA.${m} =`), `mécanique absente : ${m}`); });
});
test('les scénarios de décision ont une bonne réponse cohérente avec leur mécanique', () => {
  exos.filter(e => e.meca === 'priorite').forEach(e => e.scenarios.forEach(s => assert.ok(['passer', 'ceder'].includes(s.bonne))));
  exos.filter(e => e.meca === 'depassement').forEach(e => e.scenarios.forEach(s => assert.ok(['doubler', 'rester'].includes(s.bonne))));
});
test('les nouveaux panneaux sont dessinés', () => {
  ['A13a', 'A13b', 'A15b', 'A17', 'A21', 'A4', 'A7', 'B3', 'B30', 'B51', 'C107', 'C108'].forEach(id => assert.ok(isSign(id), id));
});
test('les cours utilisent les scènes « liste » et « situation » du simulateur', () => {
  const types = new Set(data.cours.flatMap(c => c.scenes.map(s => s.type)));
  assert.ok(types.has('liste') && types.has('situation'));
});
test('chaque cours a une série d’exercices', () => {
  data.cours.forEach(c => assert.ok((c.series || []).length, c.id));
});
test('chaque défi 3D propose 10 situations, chaque pratique entre 5 et 12', () => {
  exos.filter(e => e.meca !== 'reflexe' && e.meca !== 'decodeur').forEach(e => {
    const n = (e.evenements || e.distances || e.zones || e.profil || e.scenarios || e.scenes || e.situations || []).length;
    if (e.meca === 'examen') assert.ok(n >= 5 && n <= 12, `${e.id} : ${n}`); else assert.equal(n, 10, e.id);
  });
});
test('aucun exercice seul : chacun est rattaché à une leçon', () => {
  exos.forEach(e => assert.ok(data.cours.some(c => c.id === e.cours), `${e.id} sans leçon`));
});
test('les situations d’examen ont des réponses A à D cohérentes et assez de matière pour un examen blanc', () => {
  const sit = exos.filter(e => e.meca === 'examen').flatMap(e => e.situations);
  assert.ok(sit.length >= 40, `seulement ${sit.length} situations`);
  sit.forEach(s => { assert.ok(s.choix.length >= 2 && s.choix.length <= 4, s.q); assert.ok(s.bonnes.length >= 1 && s.bonnes.every(k => k < s.choix.length), s.q); assert.ok(s.explication.length > 20, s.q); });
});
