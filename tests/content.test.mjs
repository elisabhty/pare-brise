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

test('la leçon est une leçon : aucune question dans les cours, elles sont toutes dans la pratique', () => {
  for (const c of data.cours) assert.ok(!c.scenes.some(s => s.type === 'touche' || s.type === 'quiz'), `${c.id} contient encore une question`);
  for (const c of data.cours) assert.ok(data.exercices.some(e => e.id === 'p-' + c.id && e.meca === 'examen' && e.cours === c.id), `${c.id} sans pratique`);
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

test('les 35 cours sont là, numérotés de 1 à 35, chacun avec sa pratique', () => {
  const ordres = data.cours.map(c => c.ordre).sort((a, b) => a - b);
  assert.deepEqual(ordres, Array.from({ length: 35 }, (_, i) => i + 1));
  for (const c of data.cours) assert.ok(data.exercices.some(e => e.id === 'p-' + c.id), `${c.id} sans pratique`);
});

test('pas de phrase gabarit répétée dans les cours', () => {
  const GABARITS = ['Observe les situations qui vont suivre', 'Tu viens de voir les situations essentielles', 'Prends un instant pour revoir les repères', 'les exercices sont accessibles séparément', 'Dans cette leçon, tu vas découvrir', 'La caméra'];
  for (const c of data.cours) for (const s of c.scenes) for (const g of GABARITS) assert.ok(!s.dire.includes(g), `${c.id} : « ${g} »`);
  const fins = data.cours.map(c => c.scenes[c.scenes.length - 1].dire);
  assert.equal(new Set(fins).size, fins.length, 'chaque fin de cours a son propre texte');
});

test('un marquage au sol inconnu est signalé', async () => {
  const { validate } = await import('../scripts/validate.mjs');
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-'));
  fs.cpSync('content', path.join(dir, 'content'), { recursive: true }); fs.cpSync('src', path.join(dir, 'src'), { recursive: true });
  const f = path.join(dir, 'content/cours/31-placement-chaussee.json'), c = JSON.parse(fs.readFileSync(f, 'utf8'));
  c.scenes.find(s => s.marquages).marquages[0][2] = 'zigzag'; fs.writeFileSync(f, JSON.stringify(c));
  assert.ok(validate(dir).errors.some(e => e.includes('marquage inconnu « zigzag »')));
});

// L'image parle de la même chose que la voix
test('chaque liste et chaque série de chiffres apparaît au rythme de la voix (sync)', () => {
  for (const c of data.cours) c.scenes.forEach((s, i) => {
    if (s.type !== 'liste' && s.type !== 'chiffres') return;
    assert.ok(Array.isArray(s.sync) && s.sync.length === s.items.length, `${c.id} scène ${i} : sync manquant`);
    if (s.type === 'liste') s.sync.forEach((v, n) => assert.ok(n === 0 || v >= s.sync[n - 1], `${c.id} scène ${i} : la liste doit apparaître dans l’ordre`));
  });
});

test('hors cours 1 (script des panneaux), titres, listes, chiffres et fins ont un décor qui parle du sujet', () => {
  for (const c of data.cours) {
    if (c.ordre === 1) continue;
    c.scenes.forEach((s, i) => { if (['titre', 'liste', 'chiffres', 'fin'].includes(s.type)) assert.ok(s.decor && s.decor.env, `${c.id} scène ${i} (${s.type}) sans décor`); });
  }
});

test('un décor sous une carte de texte utilise un plan qui garde le sujet visible', () => {
  for (const c of data.cours) c.scenes.forEach((s, i) => { if (s.decor) assert.ok(['plan', 'proche', 'garee', 'poursuite', 'derriere'].includes(s.decor.camera), `${c.id} scène ${i} : caméra « ${s.decor.camera} »`); });
});
