// La 3D sans coupure ni saccade : ce qui, dans le code, provoquerait une recompilation des shaders ou une coupure sèche.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sim = fs.readFileSync('src/engine/sim.js', 'utf8'), eng = fs.readFileSync('src/engine/engine.js', 'utf8'), player = fs.readFileSync('src/app/player.js', 'utf8');
const meteo = sim.slice(sim.indexOf('function applyWeather'), sim.indexOf('function envFor'));
const load = sim.slice(sim.indexOf('  function load(spec'), sim.indexOf('/* ---------- marquage axial'));

test('changer de météo ou de décor ne recompile aucun shader', () => {
  // allumer ou éteindre les ombres du soleil change les shaders de tous les matériaux : on règle leur intensité
  assert.ok(!/castShadow\s*=/.test(meteo), 'castShadow ne doit pas changer avec la météo');
  assert.match(meteo, /sun\.shadow\.intensity = /);
  // un seul objet brouillard, réglé à chaque fois
  assert.ok(!/s\.fog = new THREE\.Fog\(fogC/.test(meteo.replace('if (!s.fog) s.fog = new THREE.Fog(fogC', '')), 'brouillard recréé à chaque étape');
  // la route garde une texture : rien à recompiler quand elle change
  assert.match(load, /if \(!hadMap\) roadMat\.needsUpdate = true/);
  assert.ok(!/roadMat\.needsUpdate = true;\s*$/m.test(load.replace('if (!hadMap) roadMat.needsUpdate = true;', '')));
});

test('les reflets de chaque météo se préparent dans les menus, jamais pendant une scène', () => {
  assert.match(sim, /if \(K\.busy && K\.busy\(\)\) \{ setTimeout\(step, 1500\); return; \}/);
  assert.match(eng, /busy: \(\) => worldName !== 'salle'/);
  assert.ok(!/requestIdleCallback[^\n]*timeout/.test(sim), 'un calcul forcé par délai tomberait en pleine scène');
});

test('pluie et neige sont compilées d’avance', () => {
  assert.match(sim, /rain\.userData\.warm = true/); assert.match(sim, /snow\.userData\.warm = true/);
  assert.match(eng, /o\.userData && o\.userData\.warm && !o\.visible/);
});

test('d’une scène de cours à l’autre, un fondu enchaîné dans la carte graphique', () => {
  assert.match(player, /this\.entered >= 0 && currentScreen\(\) === 'cours' && Engine\.xfade && !this\.imgKey\) Engine\.xfade\(\)/);
  assert.match(eng, /renderer\.copyFramebufferToTexture\(x\.tex\)/);
  assert.match(eng, /x\.tex\.format = THREE\.RGBFormat; x\.tex\.internalFormat = 'RGB8'/);   // tampon de l'écran sans alpha
  assert.ok(!/getContext\('2d'\)\.drawImage\(canvas/.test(eng), 'pas de copie vers un canvas 2D : relecture lente sur iPhone');
  assert.match(eng, /xfDraw\(now\);/);
});

test('les cours hors route montrent des images, pas la route ; la 3D ne se dessine pas dessous', () => {
  const img = fs.readFileSync('src/app/images.js', 'utf8'), scr = fs.readFileSync('src/app/screens.js', 'utf8');
  for (const id of ['alcool', 'fatigue-distractions', 'drogues-medicaments', 'permis-points', 'premiers-secours', 'papiers-assurance'])
    assert.ok(img.includes(`'${id}'`) || img.includes(` ${id}:`), `${id} a ses images`);
  assert.match(img, /AVEC_IMAGE = new Set\(\['titre', 'chiffres', 'liste', 'fin'\]\)/);   // jamais à la place d'une mise en situation
  assert.match(player, /if \(this\.imgKey === key && Engine\.hidden\) Engine\.hidden\(true\)/);
  assert.match(player, /const pre = new Image\(\); pre\.src = imgSrc\(nk\)/);      // la suivante est préchargée
  assert.match(scr, /Player\.clearImg\(\)/);
});
