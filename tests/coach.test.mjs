// Plot, le moniteur : ce qu'il conseille, quand il se tait, ce qu'il fête.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { conseil, conseilEcran, JALONS, atteints, aFeter } from '../src/app/coach-core.js';

const BASE = { prenom: 'Elisa', heure: 10, jour: 0, serie: 0, record: 0, actifAuj: false, absence: null, coursVus: 0, coursTotal: 35,
  prochain: { num: 1, titre: 'Reconnaître les panneaux', min: 6, enCours: false, chapitre: 1, nCh: 5 },
  revoir: 0, pratique: null, plan: null, pret: false, reussis: 0, dernierBlanc: null, blancs: 0, blancReussi: false,
  jj: { etape: 'neph', j: null, neph: 'non', attente: null, resa: false, resultat: null } };
const S = (o = {}) => Object.assign({}, BASE, o, { jj: Object.assign({}, BASE.jj, o.jj || {}), prochain: Object.assign({}, BASE.prochain, o.prochain || {}) });
const PLAN = (o = {}) => Object.assign({ reste: 2, late: 0, seanceFaite: false, libre: false, fin: '2026-12-21', examen: null }, o);

test('premier lancement : Plot se présente et annonce le cours 1, sans bouton en double', () => {
  const c = conseil(S());
  assert.equal(c.id, 'cours'); assert.equal(c.action, null);
  assert.match(c.texte, /Je suis Plot/); assert.match(c.texte, /Elisa/); assert.match(c.texte, /cours 1 : 6 minutes/);
  assert.match(conseil(S({ heure: 21 })).texte, /^Bonsoir, Elisa/);
  assert.match(conseil(S({ prochain: { enCours: true, chapitre: 3 } })).texte, /chapitre 3 sur 5/);
});

test('l’examen passe avant tout : jour J, résultat attendu, réussi, raté, derniers jours', () => {
  assert.equal(conseil(S({ jj: { etape: 'jourj' }, revoir: 20, serie: 5, heure: 22 })).id, 'jourj');
  assert.match(conseil(S({ jj: { etape: 'jourj' } })).texte, /15 minutes avant/);
  assert.deepEqual(conseil(S({ jj: { etape: 'resultat' } })).action, { label: 'Noter mon résultat', go: 'jourj' });
  assert.equal(conseil(S({ jj: { etape: 'reussi' } })).id, 'reussi');
  assert.equal(conseil(S({ jj: { etape: 'rate' }, revoir: 6 })).action.revoir, true);
  assert.equal(conseil(S({ jj: { etape: 'rate' } })).action.exo, 'x-exam-blanc');
  assert.match(conseil(S({ jj: { etape: 'attente', j: 1 } })).texte, /demain/);
  assert.match(conseil(S({ jj: { etape: 'attente', j: 3 } })).texte, /Plus que 3 jours/);
  assert.notEqual(conseil(S({ jj: { etape: 'attente', j: 12 } })).id, 'j-moins');   // à 12 jours, rien d'urgent
});

test('retour après une absence, série en danger le soir, retard du planning', () => {
  assert.equal(conseil(S({ absence: 4, coursVus: 3, revoir: 5 })).id, 'retour');
  assert.equal(conseil(S({ absence: 2, coursVus: 3 })).id !== 'retour', true);
  assert.equal(conseil(S({ absence: 5, actifAuj: true })).id !== 'retour', true);
  const soir = conseil(S({ serie: 4, heure: 19, coursVus: 3, absence: 1 }));
  assert.equal(soir.id, 'serie'); assert.equal(soir.humeur, 'oops'); assert.match(soir.texte, /série de 4 jours s’arrête à minuit/);
  assert.notEqual(conseil(S({ serie: 4, heure: 11, coursVus: 3, absence: 1 })).id, 'serie');   // le matin, pas d'alarme
  assert.notEqual(conseil(S({ serie: 1, heure: 21, coursVus: 3, absence: 1 })).id, 'serie');   // une série d'un jour, pas d'alarme
  const r = conseil(S({ plan: PLAN({ late: 3 }), coursVus: 4 }));
  assert.equal(r.id, 'retard'); assert.match(r.texte, /^3 activités en retard/);
  assert.match(conseil(S({ plan: PLAN({ late: 1 }) })).texte, /^1 activité en retard/);
  const ry = conseil(S({ plan: PLAN({ fin: '2026-12-21', examen: '2026-12-15' }) }));
  assert.equal(ry.id, 'rythme'); assert.match(ry.texte, /tu finis le 21 décembre, après ton examen du 15 décembre\./);
  assert.match(conseil(S({ plan: PLAN({ fin: '2027-03-01', examen: '2027-02-27' }) })).texte, /le 1er mars, après ton examen du 27 février\./); assert.equal(ry.action.adapter, true);
});

test('journée faite, erreurs à revoir, prêt à réserver, NEPH à demander', () => {
  const f = conseil(S({ actifAuj: true, serie: 3, coursVus: 2 }));
  assert.equal(f.id, 'fait'); assert.equal(f.humeur, 'cheer'); assert.match(f.texte, /3 jours d’affilée/);
  assert.equal(conseil(S({ actifAuj: true, coursVus: 2, plan: PLAN() })).id === 'fait', false);   // séance du jour pas finie
  assert.equal(conseil(S({ actifAuj: true, coursVus: 2, plan: PLAN({ reste: 0, seanceFaite: true }) })).id, 'fait');
  assert.equal(conseil(S({ revoir: 9, coursVus: 4 })).id, 'revoir');
  assert.equal(conseil(S({ pret: true, coursVus: 35, jj: { neph: 'oui', etape: 'reserver' } })).id, 'reserver');
  assert.equal(conseil(S({ coursVus: 3 })).id, 'neph');
  assert.notEqual(conseil(S({ coursVus: 2 })).id, 'neph');   // trop tôt pour en parler
  assert.match(conseil(S({ coursVus: 3 })).texte, /2 à 6 semaines/);
  assert.equal(conseil(S({ coursVus: 5, jj: { neph: 'attente', attente: 'tard' } })).id, 'neph-tard');
});

test('tous les cours vus : examen blanc, puis ce qu’il manque', () => {
  const tous = { coursVus: 35, jj: { neph: 'oui' } };
  assert.equal(conseil(S(tous)).action.exo, 'x-exam-blanc');
  assert.match(conseil(S({ ...tous, blancs: 1, dernierBlanc: 31 })).texte, /31 sur 40\. Il en manquait 4/);
  assert.match(conseil(S({ ...tous, blancs: 1, dernierBlanc: 36 })).texte, /36 sur 40\. Ça passerait de justesse : vise 37/);
  assert.match(conseil(S({ ...tous, blancs: 2, dernierBlanc: 38, reussis: 1 })).texte, /Encore 2 de suite à 37 ou plus/);
  assert.match(conseil(S({ ...tous, blancs: 3, dernierBlanc: 39, reussis: 2 })).texte, /Encore un à 37 ou plus/);
});

test('pratique oubliée, planning proposé', () => {
  assert.deepEqual(conseil(S({ coursVus: 1, pratique: { id: 'p-c01', num: 1 } })).action, { label: 'Lancer la pratique', exo: 'p-c01' });
  assert.equal(conseil(S({ coursVus: 2, jj: { neph: 'oui' } })).id, 'planning');
  assert.notEqual(conseil(S({ coursVus: 2, plan: PLAN(), jj: { neph: 'oui' } })).id, 'planning');
});

test('sur les onglets, Plot se tait quand il n’a rien d’utile à ajouter', () => {
  assert.equal(conseilEcran('planning', S()), null);                                   // pas de planning : la page explique déjà
  assert.equal(conseilEcran('planning', S({ plan: PLAN() })), null);
  assert.equal(conseilEcran('planning', S({ plan: PLAN({ late: 2 }) })).id, 'retard');
  assert.equal(conseilEcran('planning', S({ plan: PLAN({ examen: '2026-12-01' }) })).id, 'rythme');
  assert.equal(conseilEcran('questions', S()).id, 'cours');
  assert.deepEqual(conseilEcran('questions', S({ prochain: { id: 'panneaux' } })).action, { label: 'Voir le cours 1', go: 'fiche', arg: 'panneaux' });
  assert.equal(conseilEcran('questions', S({ coursVus: 3, revoir: 4 })).id, 'revoir');
  assert.equal(conseilEcran('questions', S({ coursVus: 3, pret: true })).action.go, 'jourj');
  assert.match(conseilEcran('questions', S({ coursVus: 3, dernierBlanc: 33 })).texte, /33 sur 40/);
  assert.equal(conseilEcran('conduite', S()), null);
  assert.equal(conseilEcran('conduite', S({ pratique: { id: 'p-c02', num: 2 } })).action.exo, 'p-c02');
  assert.equal(conseilEcran('jourj', S()), null);
});

test('chaque phrase de Plot est courte, et n’annonce rien pour plus tard', () => {
  const etats = [S(), S({ heure: 22 }), S({ prochain: { enCours: true } }), S({ coursVus: 3 }), S({ coursVus: 2, jj: { neph: 'oui' } }),
    S({ revoir: 9, coursVus: 4 }), S({ absence: 6, revoir: 2 }), S({ absence: 6 }), S({ serie: 12, heure: 23, revoir: 3 }),
    S({ plan: PLAN({ late: 12 }) }), S({ plan: PLAN({ examen: '2026-12-01' }) }), S({ actifAuj: true, serie: 9, revoir: 5 }),
    S({ coursVus: 35, jj: { neph: 'oui' } }), S({ coursVus: 35, blancs: 2, dernierBlanc: 20, revoir: 4, jj: { neph: 'oui' } }),
    S({ jj: { etape: 'jourj' } }), S({ jj: { etape: 'resultat' } }), S({ jj: { etape: 'reussi' } }), S({ jj: { etape: 'rate' } }),
    S({ jj: { etape: 'attente', j: 1 } }), S({ jj: { etape: 'attente', j: 2 } }), S({ coursVus: 1, pratique: { id: 'p', num: 1 } })];
  const textes = [];
  etats.forEach(s => { for (let j = 0; j < 3; j++) { const c = conseil({ ...s, jour: j }); textes.push(c.texte); if (c.action) assert.ok(c.action.label.length <= 28, c.action.label); } });
  ['planning', 'questions', 'conduite'].forEach(e => etats.forEach(s => { const c = conseilEcran(e, s); if (c) textes.push(c.texte); }));
  JALONS.forEach(j => textes.push(j.titre, j.texte('Elisa'), j.texte('')));
  textes.forEach(t => {
    assert.ok(t.length >= 12 && t.length <= 160, `${t.length} : ${t}`);
    assert.ok(!/\.\.|  | ,|\s$/.test(t), `ponctuation : ${t}`);
    assert.ok(!/bient[oô]t|prochainement/i.test(t) && !/\b(undefined|null|NaN)\b/.test(t), t);
  });
  const src = fs.readFileSync('src/app/coach-core.js', 'utf8') + fs.readFileSync('src/app/coach.js', 'utf8');
  assert.ok(!/bient[oô]t|prochainement/i.test(src));
});

test('Plot ne répète que des règles déjà affichées ailleurs dans l’app', () => {
  const src = fs.readFileSync('src/app/coach-core.js', 'utf8');
  const permis = ['15 minutes avant', '2 à 6 semaines', '24 à 72 heures', '35 sur 40', '37 sur 40', '40 situations'];
  const vus = new Set([...src.matchAll(/\d+ (sur 40|minutes avant|à \d+ semaines|à \d+ heures|situations)/g)].map(m => m[0]));
  vus.forEach(x => assert.ok(permis.includes(x), x));
  ['15 minutes avant', '2 à 6 semaines', '24 à 72 heures', '35 sur 40'].forEach(x => assert.ok(vus.has(x), x));
  // les mêmes repères que l'onglet Réserver
  const jj = fs.readFileSync('src/app/jourj.js', 'utf8') + fs.readFileSync('src/app/jourj-core.js', 'utf8');
  assert.ok(/15 minutes avant/.test(jj) && /24 à 72 heures/.test(jj) && /NEPH_SEMAINES = \[2, 6\]/.test(jj) && /37 sur 40/.test(jj));
});

test('les étapes à fêter : atteintes une fois, fêtées une fois, la plus importante d’abord', () => {
  assert.deepEqual(atteints(S()), []);
  assert.deepEqual(atteints(S({ coursVus: 1 })), ['cours-1']);
  assert.deepEqual(atteints(S({ coursVus: 12, serie: 8 })), ['cours-10', 'cours-5', 'cours-1', 'serie-7', 'serie-3']);
  assert.deepEqual(atteints(S({ record: 15, serie: 0 })), ['serie-14', 'serie-7', 'serie-3']);   // le record compte, même série cassée
  assert.ok(atteints(S({ coursVus: 35 })).includes('cours-tous'));
  assert.deepEqual(atteints(S({ jj: { resultat: 'ok', resa: true, neph: 'oui' }, pret: true, blancReussi: true })).slice(0, 5), ['code', 'resa', 'pret', 'neph', 'blanc']);
  assert.equal(aFeter(S({ coursVus: 6 }), []).id, 'cours-5');
  assert.equal(aFeter(S({ coursVus: 6 }), ['cours-5']).id, 'cours-1');
  assert.equal(aFeter(S({ coursVus: 6 }), ['cours-5', 'cours-1']), null);
  assert.equal(aFeter(S({ coursVus: 6, jj: { neph: 'oui' } }), ['cours-5', 'cours-1']).id, 'neph');
  assert.deepEqual(JALONS.find(j => j.id === 'pret').action, { label: 'Réserver mon examen', go: 'jourj' });
  assert.equal(new Set(JALONS.map(j => j.id)).size, JALONS.length);
});

test('Plot est présent à l’accueil et sur les onglets, et l’app ne fête pas deux fois ce qui était déjà acquis', () => {
  const html = fs.readFileSync('src/index.html', 'utf8'), coach = fs.readFileSync('src/app/coach.js', 'utf8'), scr = fs.readFileSync('src/app/screens.js', 'utf8');
  ['id="homeCoach"', 'id="plCoach"', 'id="entCoach"'].forEach(k => assert.ok(html.includes(k), k));
  assert.ok(scr.includes('renderCoachAccueil(') && scr.includes("renderCoachEcran(volet, '#entCoach'") && scr.includes('setupCoach('));
  assert.ok(coach.includes("if (store.get('plotFetes', null) === null) store.set('plotFetes', atteints(etat()));"));
  assert.ok(/jamais par-dessus une autre feuille/.test(coach));
});
