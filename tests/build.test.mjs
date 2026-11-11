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
test('la mascotte et la police sont intégrées', () => { assert.ok(html.includes('--plot-sprite:url(data:image/webp')); assert.ok(html.includes("font-family:'Archivo'")); });
test('le fichier est autonome (aucune ressource externe)', () => { assert.ok(!/src="https?:\/\//.test(html)); assert.ok(!/href="https?:\/\/(?!github)/.test(html)); });
