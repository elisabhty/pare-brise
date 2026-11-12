// Vérifie l'app construite (lancer « npm run build » avant).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.existsSync('docs/index.html') ? fs.readFileSync('docs/index.html', 'utf8') : '';

test('docs/index.html existe', () => assert.ok(html.length > 100000));
test('aucun marqueur de build oublié', () => { for (const m of ['/*@FONTS@*/', '/*@CSS@*/', '/*@CONTENT@*/', '/*@APP@*/']) assert.ok(!html.includes(m), m); });
test('le contenu JSON est intégré et lisible', () => {
  const m = html.match(/<script type="application\/json" id="content">([\s\S]*?)<\/script>/);
  assert.ok(m); const data = JSON.parse(m[1]); assert.ok(data.cours.length > 0 && data.questions.length > 0);
});
test('la mascotte et la police sont intégrées', () => { assert.ok(html.includes('--plot-sprite:url(data:image/webp')); assert.ok(html.includes("font-family:'Inter Variable'")); });
test('le fichier est autonome (aucune ressource externe)', () => { assert.ok(!/src="https?:\/\//.test(html)); assert.ok(!/href="https?:\/\/(?!github)/.test(html)); });
test('rien de vide au démarrage : écran de chargement dans la page, moteur lancé après la première image', () => {
  const body = html.slice(html.indexOf('<body>'));
  assert.ok(body.indexOf('id="splash"') > 0 && body.indexOf('id="splash"') < body.indexOf('<script'), 'le chargement est dans le HTML, avant les scripts');
  assert.ok(html.includes('window.__pbBoot=function(){') && html.includes('requestAnimationFrame(function(){setTimeout(go'), 'le moteur démarre après la première image');
});
