// Démarrage d'une séance : jamais de voix derrière un écran vide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nav = fs.readFileSync('src/app/nav.js', 'utf8'), player = fs.readFileSync('src/app/player.js', 'utf8'), screens = fs.readFileSync('src/app/screens.js', 'utf8');

test('le rideau se lève dès que le nouvel écran est dessiné (des images, pas un minuteur)', () => {
  assert.ok(/await frames\(2\); cur\.classList\.remove\('on'\)/.test(nav));
  assert.ok(!/await wait\(80\); cur\.classList\.remove/.test(nav));
});
test('la voix d’une séance attend que l’image soit à l’écran', () => {
  assert.ok(/start\(at, k\) \{ const gate = settled\(\)/.test(player));
  assert.ok(screens.includes('Player.start(o.at, o.k)'));
  // une seule construction de la première scène (load « quiet », puis start)
  assert.ok(screens.includes('!!o.play); if (o.play) Player.start('));
});
test('chaque lancement de séance montre le titre du cours sur le rideau', () => {
  const launches = screens.match(/show\('cours', \{[^}]*play: true[^}]*\}/g) || [];
  assert.ok(launches.length >= 4);
  launches.filter(l => !l.includes('noCurtain')).forEach(l => assert.ok(l.includes('slate:'), l));
});
