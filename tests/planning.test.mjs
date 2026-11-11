import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../scripts/validate.mjs';
import { streakOf, bestStreak, buildOrder, pack, replan, lateItems, preview } from '../src/app/planning-core.js';
import { iso, fromIso, wd } from '../src/app/dates.js';

const { data } = validate('.');
const courses = data.cours.slice().sort((a, b) => (a.ordre || 99) - (b.ordre || 99));
const order = buildOrder(courses, {
  seriesOf: () => [],
  exosOf: c => data.exercices.filter(e => e.id === 'p-' + c.id),
  minCours: () => 3, minSerie: () => 4, minExo: () => 5
});
const MER = fromIso('2026-11-11');   // un mercredi

test('la série compte les jours d’affilée, et survit jusqu’au soir', () => {
  assert.equal(streakOf(['2026-11-09', '2026-11-10', '2026-11-11'], MER), 3);
  assert.equal(streakOf(['2026-11-09', '2026-11-10'], MER), 2);          // rien aujourd'hui : la série d'hier tient encore
  assert.equal(streakOf(['2026-11-08', '2026-11-09'], MER), 0);          // un jour sauté : remise à zéro
  assert.equal(bestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-10']), 3);
});

test('le parcours enchaîne chaque leçon et sa pratique, avec 4 examens blancs', () => {
  const ids = order.map(o => o.id);
  courses.forEach(c => { const i = ids.indexOf('c:' + c.id); assert.ok(i >= 0, c.id); assert.equal(ids[i + 1], 'x:p-' + c.id, `pratique de ${c.id} juste après la leçon`); });
  assert.equal(new Set(ids).size, ids.length, 'activité en double');
  assert.deepEqual(ids.filter(id => id.startsWith('b:')), ['b:1', 'b:2', 'b:3', 'b:4']);
});

test('les séances tombent sur les jours choisis et respectent la durée', () => {
  const s = pack(order, { start: MER, jours: [0, 2, 4], minutes: 20 });
  assert.equal(s.flatMap(x => x.items).length, order.length);
  s.forEach(x => {
    assert.ok([0, 2, 4].includes(wd(fromIso(x.d))), x.d);
    const m = x.items.reduce((a, id) => a + order.find(o => o.id === id).min, 0);
    assert.ok(x.items.length === 1 || m <= 22, `séance de ${m} min le ${x.d}`);
  });
  assert.equal(s[0].d, '2026-11-11');
});

test('replacer garde ce qui est fait et répartit le retard à partir d’aujourd’hui', () => {
  const done = new Set();
  let plan = replan({ jours: [0, 1, 2, 3, 4], minutes: 20, sessions: [] }, order, id => done.has(id), MER);
  plan.sessions[0].items.slice(0, 2).forEach(id => done.add(id));
  const sam = fromIso('2026-11-14');
  const late = lateItems(plan, id => done.has(id), sam);
  assert.ok(late.length > 0);
  const p2 = replan(plan, order, id => done.has(id), sam);
  assert.deepEqual(lateItems(p2, id => done.has(id), sam), []);
  assert.deepEqual(p2.sessions[0], { d: '2026-11-11', items: [...done] });
  assert.equal(p2.sessions[1].d, '2026-11-16', 'le samedi n’est pas un jour choisi : reprise lundi');
  assert.equal(p2.sessions.flatMap(s => s.items).length, order.length);
});

test('l’aperçu donne le nombre de séances et la date de fin', () => {
  const pv = preview(order, () => false, { jours: [0, 2, 4], minutes: 30 }, MER);
  assert.ok(pv.seances > 5 && pv.fin > MER);
  assert.equal(pv.activites, order.length);
  assert.equal(iso(MER), '2026-11-11');
});
