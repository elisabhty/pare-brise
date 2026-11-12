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
  assert.ok(!JSON.stringify(C.intemperies.scenes[6].decor.signaux || []).includes('B26'), 'pas le panneau « chaînes » B26 pour la loi montagne, mais son panneau B58');
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

// Deuxième passage : la voix avait été corrigée, la carte, l'image, la fiche et la pratique doivent suivre.
const pratique = id => data.exercices.find(e => e.id === 'p-' + id).situations;
const phrases = t => (t || '').match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
test('deuxième passage : chaque sous-titre se lit au rythme de la voix', () => {
  for (const c of data.cours) if (c.ordre > 1) c.scenes.forEach((s, i) => phrases(s.dire).forEach(p =>
    assert.ok(p.trim().split(/\s+/).length <= 25, `${c.id} écran ${i} : « ${p.trim().slice(0, 60)}… »`)));
});
test('deuxième passage : les mots retirés de la voix ne restent pas dans les réponses', () => {
  const textes = id => pratique(id).map(s => [s.q, s.contexte, ...(s.choix || [])].join(' ')).join(' ');
  assert.ok(!/abords|allure/.test(textes('anticiper-dangers')));
  assert.ok(!/déporter/.test(textes('changer-direction-voie')));
  assert.ok(!/à froid/.test(textes('controles-vehicule') + textes('entretien')));
  assert.ok(!/\banneau\b/.test(textes('carrefours-feux')), 'on dit « rond-point », comme au cours 3');
  assert.ok(!/Télépoints/.test(JSON.stringify(C['permis-points'])) && /Mes points permis/.test(dire('permis-points', 4)));
});
test('deuxième passage : une règle dite d’une seule façon', () => {
  // corridor de sécurité : on ralentit toujours, et on change de voie si on peut
  pratique('autoroute').filter(s => /bande d’arrêt d’urgence, avec une lumière/.test(s.q)).forEach(s => assert.match(s.explication, /^Ralentis toujours/));
  // cours 30 : les étapes dans l'ordre où la voix les annonce
  const ey = C['changer-direction-voie'].scenes.map(s => s.eyebrow || '');
  assert.ok(ey.findIndex(e => e.startsWith('Étape 2')) < ey.findIndex(e => e.startsWith('Étape 3')));
  // montagne : même type, celui qui descend recule ; voiture contre camion, la voiture
  assert.match(dire('montagne-tunnels-pn', 4), /c’est la voiture qui recule, même si elle monte/);
  // probatoire : 110 sur autoroute, aussi dans la pratique du cours 10
  assert.ok(pratique('autoroute').filter(s => /130 au maximum/.test(s.explication || '')).every(s => /110 pendant ton permis probatoire/.test(s.explication)));
});
test('deuxième passage : les images suivent la voix', () => {
  const ill = (id, i) => (C[id].scenes[i].illu || {});
  assert.deepEqual(ill('infractions', 3).segments.map(s => s[0])[0], '< 5', 'le compteur commence à « moins de 5 », sans point');
  assert.equal(ill('usagers-vulnerables', 2).debut.points, 6, 'un permis probatoire part de 6 points');
  const types = id => C[id].scenes.flatMap(s => ((s.decor || s).acteurs || []).map(a => a.type)).concat(pratique(id).flatMap(s => (s.acteurs || []).map(a => a.type)));
  assert.ok(!types('vehicules-prioritaires').includes('ambulance'), 'une ambulance privée n’est pas prioritaire : les images montrent les pompiers');
  assert.ok(fs.readFileSync('src/engine/sim.js', 'utf8').includes('pompiers(o'));
});
test('deuxième passage : les panneaux décrits par la voix sont dessinés et montrés', async () => {
  const { isSign } = await import('../src/app/signs.js');
  ['A8', 'B52', 'B54', 'B56', 'B58', 'B59', 'C24a'].forEach(id => assert.ok(isSign(id), id));
  const montres = id => JSON.stringify(C[id].scenes.map(s => [s.panneaux, (s.decor || s).signaux, s.illu]));
  assert.match(montres('montagne-tunnels-pn'), /"A8"/, 'passage à niveau sans barrières');
  assert.match(montres('usagers-vulnerables'), /"B52".*"B54"/, 'zone de rencontre et aire piétonne');
  assert.match(montres('vehicules-propres'), /"B56"/, 'entrée de ZFE');
  assert.match(montres('cyclistes-edpm'), /"C24a"/, 'double sens cyclable');
  assert.match(montres('intemperies'), /"B58"/, 'entrée de zone loi montagne');
});
