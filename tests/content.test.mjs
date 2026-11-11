// Vérifie que tout le contenu est cohérent (cours, scènes, questions, séries, panneaux).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../scripts/validate.mjs';

const { errors, data, types } = validate('.');

test('le contenu passe la validation', () => {
  assert.deepEqual(errors, []);
});

test('les 10 thèmes officiels sont présents', () => {
  assert.equal(data.themes.length, 10);
});

test('chaque cours a au moins une série d’exercices', () => {
  for (const c of data.cours) assert.ok((c.series || []).length > 0, `${c.id} sans série`);
});

test('chaque série contient au moins 3 questions', () => {
  for (const s of data.series) assert.ok(s.questions.length >= 3, `${s.id} : ${s.questions.length} question(s)`);
});

test('chaque question appartient à une série', () => {
  const inSeries = new Set(data.series.flatMap(s => s.questions));
  for (const q of data.questions) assert.ok(inSeries.has(q.id), `${q.id} n’est dans aucune série`);
});

test('chaque cours contient au moins une question en pleine vidéo', () => {
  for (const c of data.cours) assert.ok(c.scenes.some(s => s.type === 'touche' || s.type === 'quiz'), `${c.id} sans question`);
});

test('chaque cours se termine par une scène de fin', () => {
  for (const c of data.cours) assert.equal(c.scenes[c.scenes.length - 1].type, 'fin', c.id);
});

test('les ordres de cours sont uniques', () => {
  const o = data.cours.map(c => c.ordre);
  assert.equal(new Set(o).size, o.length);
});

test('les types de scènes sont déclarés dans scenes.js', () => {
  for (const t of ['titre', 'defile', 'famille', 'panneaux', 'chiffres', 'reperes', 'touche', 'quiz', 'fin']) assert.ok(types.includes(t), t);
});
