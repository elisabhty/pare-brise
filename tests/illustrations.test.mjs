// Les illustrations des cours : chaque aide et chaque illustration utilisées existent, et se dessinent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../scripts/validate.mjs';

const { data } = validate('.');
const sim = readFileSync('src/engine/sim.js', 'utf8');
const bloc = sim.slice(sim.indexOf('const AIDES = {'), sim.indexOf('/* notre voiture : disque'));
const AIDES = [...bloc.matchAll(/^ {4}(\w+)\(a(?:, acts)?\) \{/gm)].map(m => m[1]);

test('le simulateur sait dessiner chaque aide utilisée par les cours', () => {
  assert.ok(AIDES.length >= 20, `aides trouvées : ${AIDES.join(', ')}`);
  for (const c of data.cours) c.scenes.forEach((s, i) => {
    const stg = s.type === 'situation' ? s : s.decor;
    for (const a of (stg && stg.aides) || []) assert.ok(AIDES.includes(a.type), `${c.id} scène ${i} : aide « ${a.type} » inconnue`);
  });
});

test('chaque illustration utilisée existe et se dessine en SVG', async () => {
  globalThis.document = { querySelector: () => null };
  const { ILLU_TYPES } = await import('../src/app/illu.js');
  const src = readFileSync('src/app/illu.js', 'utf8');
  let n = 0;
  for (const c of data.cours) c.scenes.forEach((s, i) => {
    if (!s.illu) return; n++;
    assert.ok(ILLU_TYPES.includes(s.illu.type), `${c.id} scène ${i} : illustration « ${s.illu.type} » inconnue`);
  });
  assert.ok(n >= 40, `${n} illustrations seulement`);
  assert.match(src, /export const ILLU_TYPES/);
});

test('une illustration qui suit la liste a autant d’étapes visibles que la liste en annonce', () => {
  for (const c of data.cours) c.scenes.forEach((s, i) => {
    if (!s.illu || !s.illu.suit) return;
    assert.ok(Array.isArray(s.sync) && s.sync.length === (s.items || []).length, `${c.id} scène ${i} : « suit » sans liste synchronisée`);
    if (s.illu.pas) assert.ok(s.illu.pas.length <= s.items.length, `${c.id} scène ${i} : plus d’états que d’éléments`);
  });
});

test('les aides qui apparaissent avec un élément de liste visent un élément qui existe', () => {
  for (const c of data.cours) c.scenes.forEach((s, i) => {
    for (const a of (s.decor && s.decor.aides) || []) {
      if (a.item !== undefined) assert.ok(a.item < (s.items || []).length, `${c.id} scène ${i} : aide sur l’élément ${a.item}`);
      if (a.animItem !== undefined) assert.ok(a.animItem < (s.items || []).length, `${c.id} scène ${i} : animation sur l’élément ${a.animItem}`);
    }
  });
});
