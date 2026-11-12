import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate } from '../scripts/validate.mjs';

// Ce que les élèves testeurs ont relevé (gen/retours-eleves/) ne doit pas revenir.
const { data } = validate('.');
const C = Object.fromEntries(data.cours.map(c => [c.id, c]));
const dire = (id, i) => C[id].scenes[i].dire;
const tout = id => C[id].scenes.map(s => [s.dire, JSON.stringify(s.items || []), s.titre, s.eyebrow].join(' ')).join(' ');
const banque = Object.fromEntries(fs.readdirSync('content/questions').flatMap(f => JSON.parse(fs.readFileSync(`content/questions/${f}`, 'utf8'))).map(q => [q.id, q]));

test('les chiffres ne changent plus d’un cours à l’autre', () => {
  assert.ok(!/80 ailleurs/.test(tout('permis-points')), 'jeune conducteur : 80 sur les routes à double sens, pas « ailleurs »');
  assert.match(dire('fatigue-distractions', 1), /15 mètres à 50, 27 à 90 et 39 à 130/);          // la règle du cours 4
  assert.deepEqual(banque['fd18-5'].choix, ['9 m', '27 m', '50 m']);
  assert.match(dire('intemperies', 1), /distance d’arrêt/);                                        // × 1,5 sur l'arrêt, comme au cours 4
  assert.ok(!/Usure maximale/.test(JSON.stringify(C.entretien.memo)));
});
test('ceinture : qui paie quoi', () => {
  assert.match(dire('securite-passagers', 1), /paie lui-même/);
  assert.match(dire('securite-passagers', 1), /sans perte de points/);
});
test('le barème des excès de vitesse est celui en vigueur', () => {
  const t = dire('infractions', 3);
  assert.match(t, /moins de 5 kilomètres heure de trop, une amende, mais aucun point/);
  assert.match(t, /À partir de 40 de trop/);
  assert.match(t, /délit/);
});
test('une seule méthode pour tourner ou changer de voie : rétros, clignotant, angle mort', () => {
  const ordre = t => { const r = t.search(/rétro/i), c = t.search(/clignotant/i), a = t.search(/angle mort/i); return r >= 0 && r < c && c < a; };
  [['changer-direction-voie', 7], ['changer-direction-voie', 0], ['poste-conduite', 2], ['depassement', 1], ['placement-chaussee', 6], ['autoroute', 1]]
    .forEach(([id, i]) => assert.ok(ordre(dire(id, i)), `${id} écran ${i}`));
});
test('l’image montre ce dont parle la voix', () => {
  const acteurs = s => (s.decor || s).acteurs || [];
  assert.ok(acteurs(C['montagne-tunnels-pn'].scenes[0]).some(a => a.type === 'train'), 'un train au passage à niveau');
  assert.ok(!(C.intemperies.scenes[6].decor.signaux || []).length, 'pas le panneau « chaînes » pour la loi montagne');
  const ex = Object.fromEntries(data.exercices.map(e => [e.id, e]));
  assert.ok(ex['p-cyclistes-edpm'].situations.some(s => /trottinette/i.test(s.contexte || '') && s.acteurs.some(a => a.type === 'trottinette')));
  assert.ok(ex['p-poids-lourds-2rm'].situations.some(s => s.qid === 'pl213-4' && s.acteurs.some(a => a.type === 'moto')));
});
test('la pratique dit quand plusieurs réponses sont justes (sauf à l’examen blanc)', () => {
  const src = fs.readFileSync('src/app/exos.js', 'utf8');
  assert.match(src, /!blanc && sc\.bonnes\.length > 1 \? '<span class="xq-multi">Plusieurs réponses possibles/);
});
test('les explications de la banque disent la réponse et la raison, sans recopier la question', () => {
  Object.values(banque).filter(q => q.type === 'qcm').forEach(q => assert.ok(q.explication.length >= 40, `${q.id} : explication trop courte`));
  // la pratique ne complète plus une explication courte en recopiant la question (« Je roule à 80 km/h. Je dois ralentir… »)
  assert.ok(!fs.readFileSync('gen/pratique.py', 'utf8').includes("qq.rstrip(':… ')"));
});
test('la narration du cours 1 reste celle d’origine', () => {
  const src = fs.readFileSync('gen/retours.py', 'utf8');
  assert.ok(!/^t\('panneaux', \d+, [^\n]*dire=/m.test(src), 'retours.py ne touche pas à la voix du cours 1');
});
