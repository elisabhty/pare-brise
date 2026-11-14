// Bien lire les questions : lexique, pièges de formulation, lecture facile ; et les outils de l'après-échec.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEXIQUE, LIRE, lexify, motDe } from '../src/app/lexique.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const coursIds = new Set(fs.readdirSync('content/cours').map(f => JSON.parse(fs.readFileSync(`content/cours/${f}`, 'utf8')).id));

test('le lexique : des mots du code, en phrases courtes, chacun relié à un cours qui existe', () => {
  assert.ok(LEXIQUE.length >= 25);
  assert.equal(new Set(LEXIQUE.map(l => l.mot)).size, LEXIQUE.length);
  LEXIQUE.forEach(l => {
    assert.ok(l.def.length >= 25 && l.def.length <= 170, `${l.mot} : ${l.def.length}`);
    assert.ok(/[.!]$/.test(l.def) && !/  |\.\./.test(l.def), l.mot);
    assert.ok(l.formes.length, l.mot);
    assert.ok(l.cours === null || coursIds.has(l.cours), `${l.mot} → ${l.cours}`);
  });
  // les mêmes chiffres que les cours
  assert.match(motDe('zone de rencontre').def, /20 km\/h/);
  assert.match(motDe('distance de sécurité').def, /2 secondes/);
  assert.match(motDe('probatoire').def, /6 points.*3 ans.*2 ans/);
});

test('dans une question, un mot du lexique est souligné une seule fois, et le texte reste intact', () => {
  const t = 'En agglomération, sur une chaussée séparée, puis une autre chaussée : je <peux>';
  const h = lexify(t, esc);
  assert.equal((h.match(/class="lx"/g) || []).length, 2);
  assert.match(h, /data-lx="Agglomération">agglomération<\/button>/);
  assert.match(h, /data-lx="Chaussée">chaussée<\/button> séparée/);
  assert.ok(h.includes('&lt;peux&gt;'));
  assert.equal(h.replace(/<button[^>]*>|<\/button>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), t);
  assert.equal(lexify('Rien à souligner ici', esc), 'Rien à souligner ici');
  assert.match(lexify('Un sas vélo', esc), /data-lx="Sas vélo"/);              // la forme la plus longue gagne
  assert.match(lexify('Les chaussées séparées', esc), /data-lx="Chaussées séparées"/);
});

test('lire une question : six règles de lecture, sans règle de conduite nouvelle', () => {
  assert.equal(LIRE.length, 6);
  LIRE.forEach(([t, s]) => assert.ok(t.length < 50 && s.length < 160 && /[.!]$/.test(s), t));
  assert.match(LIRE[0][1], /coche-les toutes/);
  assert.match(LIRE[1][0], /je peux.*je dois/i);
});

test('les pages et les gestes existent : pièges, lexique, lecture facile, respirer, plan après un échec', () => {
  const html = fs.readFileSync('src/index.html', 'utf8'), scr = fs.readFileSync('src/app/screens.js', 'utf8');
  ['id="s-pieges"', 'id="s-lexique"', 'id="lxFiltre"', 'data-multi', 'id="hubThemes"', 'data-go="pieges"', 'data-go="lexique"'].forEach(k => assert.ok(html.includes(k), k));
  assert.equal((html.match(/data-lf role="switch"/g) || []).length, 2);         // dans S'entraîner, et « Aa » pendant une série
  assert.ok(scr.includes("register('pieges'") && scr.includes("register('lexique'"));
  const css = fs.readFileSync('src/styles.css', 'utf8');
  assert.match(css, /html\.lf \.ex-text\{font-size:22px/);
  const rs = fs.readFileSync('src/app/respire.js', 'utf8');
  assert.match(rs, /const IN = 4000, OUT = 6000, TOURS = 6;/);
  const jj = fs.readFileSync('src/app/jourj.js', 'utf8');
  assert.ok(jj.includes("rattrapage: e => rattrapageHTML(e)") && jj.includes('data-fautes') && jj.includes('data-respire'));
  assert.match(jj, /Près d’un examen du code sur deux est raté/);
  // en examen, pas de lexique : comme le jour J
  assert.match(fs.readFileSync('src/app/serie.js', 'utf8'), /if \(this\.cfg\.mode === 'examen'\) \$\('#sText'\)\.textContent = q\.q; else \$\('#sText'\)\.innerHTML = lexify\(q\.q, esc\);/);
});
