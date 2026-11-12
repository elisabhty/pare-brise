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
test('la narration du cours 1 : celle d’Elisa, corrigée à sa demande, au même endroit', () => {
  // la voix du cours 1 ne se corrige que dans gen/reformulation/01-panneaux.json (relue par Elisa), jamais en douce ailleurs
  const src = fs.readFileSync('gen/retours.py', 'utf8');
  assert.ok(!/^t\('panneaux', \d+, [^\n]*dire=/m.test(src), 'retours.py ne touche pas à la voix du cours 1');
  assert.match(dire('panneaux', 0), /^Bienvenue dans ton premier cours de Code de la route ! Aujourd’hui, tu vas apprendre/);
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
  // les mots de l'examen restent, mais toujours expliqués (décision d'Elisa) : « se déporter », « à froid »
  assert.ok(!/déporter/.test(textes('changer-direction-voie')) || /« Se déporter », c’est décaler/.test(tout('changer-direction-voie')));
  assert.ok([textes('controles-vehicule'), textes('entretien')].every(t => !/à froid/.test(t) || /« à froid » : pneus froids/.test(t)));
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

// Reformulation (gen/reformulation/) : des cours immersifs, sans les mots que les élèves ne comprenaient pas.
const RETIRES = /\banneau|\babords\b|\ballure\b|\bl[eè]v\w* le pied|\bseuil|échéance|anomalie|indemnis|procès-verbal|\bbridée?\b|véhicules? d’intervention|sauf signalisation contraire|par défaut|immobilis|\bmanifest|gabarit|vulnérable|créneau|porte de sortie|\bpriment\b|en vigueur|applicable|généralement|notamment/i;
test('reformulation : les mots retirés ne reviennent ni dans les cours ni dans la pratique', () => {
  for (const c of data.cours) if (c.ordre > 1) {
    const t = tout(c.id) + JSON.stringify(c.memo || []) + JSON.stringify(c.scenes.map(s => [s.puce, s.stats]));
    assert.ok(!RETIRES.test(t), `${c.id} : « ${(t.match(RETIRES) || [])[0]} »`);
  }
  for (const e of data.exercices.filter(e => e.id.startsWith('p-'))) for (const s of e.situations) {
    const t = [s.q, s.contexte, ...(s.choix || []), s.explication].join(' ');
    assert.ok(!RETIRES.test(t), `${e.id} « ${s.q} » : « ${(t.match(RETIRES) || [])[0]} »`);
  }
});
test('reformulation : chaque question garde son explication', () => {
  const [a, b] = pratique('fatigue-distractions').filter(s => s.q === 'Que fais-tu ?');
  assert.match(a.explication, /^T’arrêter/); assert.match(b.explication, /^Tu restes concentré/);
  const corridor = pratique('autoroute').filter(s => /^Un véhicule est arrêté sur la bande d’arrêt d’urgence/.test(s.q));
  assert.equal(corridor.length, 2); corridor.forEach(s => assert.match(s.explication, /^Ralentis toujours/));
  // une règle exacte : 3 ans si l'une des infractions (pas seulement la dernière) est un délit ou une 4e ou 5e classe
  assert.match(dire('permis-points', 4), /l’une de tes infractions/);
});

// Décisions d'Elisa (novembre 2026) sur les questions restées ouvertes après la reformulation.
test('décisions d’Elisa : sortie de ville, agent, pompiers, plafond, mots de l’examen', async () => {
  const { sign } = await import('../src/app/signs.js');
  // la sortie de ville a un bord noir (pas de bord rouge) et le nom barré de rouge ; l'entrée a un bord rouge
  assert.ok(!/<rect[^>]*stroke="#D3112E"/.test(sign('EB20:BEAULIEU')) && /stroke="#D3112E"/.test(sign('EB20:BEAULIEU')));
  assert.ok(/<rect[^>]*stroke="#D3112E"/.test(sign('EB10:BEAULIEU')));
  const c1 = C.panneaux;
  assert.ok(c1.scenes.some(s => (s.panneaux || []).includes('EB20:BEAULIEU') && /bordé de noir/.test(s.dire)), 'cours 1 : un écran pour l’entrée et la sortie de ville');
  assert.ok(!/sans bord rouge/.test(JSON.stringify(c1)), 'cours 1 : plus de règle « barré sans bord rouge = fin »');
  assert.ok(c1.scenes.some(s => (s.panneaux || []).includes('B1') && /sens interdit/i.test(s.dire)), 'le sens interdit dont parle la voix est montré');
  assert.match(dire('vitesses', 2), /À la sortie, le panneau a un bord noir/);
  // l'agent : bras levé, tout le monde s'arrête ; déjà engagé, on dégage le carrefour
  assert.match(dire('carrefours-feux', 1), /Bras levé : tous les usagers s’arrêtent[^.]*\. Tu es déjà engagé dans le carrefour \? Dégage-le prudemment/);
  // pompiers derrière soi au feu rouge : se décaler, sans franchir le feu ni traverser le carrefour
  assert.ok(!/avancer un peu/i.test(tout('vehicules-prioritaires')) && /sans franchir le feu/.test(dire('vehicules-prioritaires', 2)));
  const pq = pratique('vehicules-prioritaires').find(s => /^Au feu rouge, une voiture de pompiers/.test(s.q));
  assert.equal(pq.choix[pq.bonnes[0]], 'te décaler, ou bouger un peu sans franchir le feu');
  // probatoire : on garde le plafond déjà atteint
  assert.match(dire('permis-points', 2), /tu gardes le plafond déjà atteint/);
  assert.ok(!/ton maximum/.test(tout('permis-points')) && !/ton maximum/.test(JSON.stringify(pratique('permis-points'))));
  // les mots de l'examen, expliqués
  assert.match(dire('controles-vehicule', 1), /« à froid » : pneus froids/);
  assert.match(dire('entretien', 1), /« à froid » : pneus froids/);
  assert.match(dire('changer-direction-voie', 4), /« Se déporter », c’est décaler ta voiture sur le côté/);
});
test('le terme officiel entre guillemets s’affiche en gras, les nombres restent avec leur unité', async () => {
  const { fr } = await import('../src/app/util.js');
  assert.equal(fr('Vérifie la pression « à froid » : avant de rouler.'), 'Vérifie la pression «\u00a0<b class="terme">à\u00a0froid</b>\u00a0»\u00a0: avant de rouler.');
  assert.equal(fr('Visibilité de moins de 50 m'), 'Visibilité de moins de 50\u00a0m');
  assert.equal(fr('vers 2 000 tours'), 'vers 2\u00a0000 tours');
});
