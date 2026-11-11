// Vérifie la bibliothèque de panneaux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, meta, isSign, factory, REFLEX_POOL, FAM, genericInner } from '../src/app/signs.js';

test('chaque panneau du jeu réflexe se dessine et a une famille', () => {
  for (const id of REFLEX_POOL) {
    const svg = sign(id);
    assert.ok(svg.startsWith('<svg') && svg.length > 200, id);
    assert.ok(!svg.includes('undefined'), id);
    assert.ok(FAM[meta(id).reflex], `${id} : famille réflexe inconnue`);
  }
});

test('les panneaux paramétrés affichent leur valeur', () => {
  assert.ok(sign('B14:90').includes('>90<'));
  assert.ok(sign('B14:130').includes('>130<'));
  assert.equal(meta('B14:110').n, 'Limitation à 110');
  assert.ok(sign('EB10:LYON').includes('>LYON<'));
});

test('un identifiant inconnu est refusé', () => {
  assert.equal(isSign('B99'), false);
  assert.equal(isSign('AB4'), true);
});

test('la fabrique 3D produit des SVG de 512 px', () => {
  assert.ok(factory('AB6').includes('width="512"'));
  assert.ok(factory('GEN:octo:rouge').includes('STOP'));
});

test('le décodeur couvre toutes les combinaisons forme × couleur', () => {
  for (const s of ['tri', 'cercle', 'carre', 'octo', 'triBas', 'losange'])
    for (const c of ['rouge', 'bleu', 'jaune', 'barre']) assert.ok(genericInner(s, c).length > 50, `${s}-${c}`);
});
