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
