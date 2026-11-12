// Pare-Brise : valide le contenu (content/) puis assemble docs/index.html (un seul fichier, hors ligne).
// docs/ sert à la fois à GitHub Pages (branche main, dossier /docs) et à Capacitor (webDir).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './scripts/validate.mjs';

const { errors, stats, data } = validate('.');
if (errors.length) { console.error(`\n✗ ${errors.length} problème(s) dans le contenu :\n  - ` + errors.join('\n  - ') + '\n'); process.exit(1); }
console.log(`✓ Contenu valide : ${stats.themes} thèmes, ${stats.cours} cours, ${stats.scenes} scènes, ${stats.questions} questions, ${stats.series} séries, ${stats.exercices} exercices`);

/* ---------- 3. Assemblage ---------- */
const content = JSON.stringify(data).replace(/</g, '\\u003c');
const r = await build({ entryPoints: ['src/app/main.js'], bundle: true, minify: !process.env.NOMIN, format: 'iife', target: ['es2019', 'safari15'], write: false, logLevel: 'warning' });
/* L'app démarre APRÈS la première image : la page s'affiche tout de suite (écran de chargement), puis le moteur 3D se construit.
   Sans ce report, le navigateur ne dessine rien tant que les quatre mondes 3D ne sont pas prêts : une page vide pendant plusieurs secondes. */
const app = 'window.__pbBoot=function(){' + r.outputFiles[0].text.replace(/<\/script/g, '<\\/script') + '};'
  + '(function(){var go=function(){var f=window.__pbBoot;window.__pbBoot=null;if(f)f()};'
  + 'if(window.requestAnimationFrame)requestAnimationFrame(function(){setTimeout(go,30)});else setTimeout(go,0)})();';
const woff = fs.readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2').toString('base64');
const font = `@font-face{font-family:'Inter Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${woff}) format('woff2')}`;
const asset = f => fs.readFileSync(path.join('src/assets', f)).toString('base64');
const css = `:root{--plot-sprite:url(data:image/webp;base64,${asset('plot-sprite.webp')});--plot-scene:url(data:image/webp;base64,${asset('plot-scene.webp')})}\n` + fs.readFileSync('src/styles.css', 'utf8');
const html = fs.readFileSync('src/index.html', 'utf8')
  .replace('/*@FONTS@*/', () => font).replace('/*@CSS@*/', () => css)
  .replace('/*@CONTENT@*/', () => content).replace('/*@APP@*/', () => app);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html', html);
fs.writeFileSync('docs/.nojekyll', '');
console.log(`✓ docs/index.html : ${Math.round(html.length / 1024)} Ko`);
