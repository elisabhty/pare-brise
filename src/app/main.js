/* Point d'entrée : moteur 3D, contenu, écrans. */
import { $ } from './util.js';
import { has3D, Engine } from './world.js';
import { Sound } from './sound.js';
import { setupScreens, drawPoster } from './screens.js';
import { setupExos } from './exos.js';
import { setupProfil, needsOnboarding } from './profil.js';
import { show, frames } from './nav.js';
import { COURSES } from './content.js';
import { signsOfCourse } from './content.js';
import { prewarm } from './scenes.js';
import { nextCourse } from './progress.js';

function paintSound() {
  $('#soundBtn').innerHTML = Sound.on
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18 V6 l10-2 v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18 V6 l10-2 v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3 L21 21"/></svg>';
  $('#soundBtn').setAttribute('aria-label', Sound.on ? 'Couper le son' : 'Activer le son');
}

try { const P = window.Capacitor && window.Capacitor.Plugins; if (P && P.StatusBar) P.StatusBar.setStyle({ style: 'LIGHT' }); } catch (e) {}
paintSound();
$('#soundBtn').addEventListener('click', () => { Sound.init(); Sound.setOn(!Sound.on); paintSound(); });
setupScreens();
setupExos();
setupProfil({ done: () => show('salle'), enter: () => drawPoster() });
if (has3D) Engine.preload(COURSES.flatMap(c => signsOfCourse(c)).slice(0, 24));
const start = location.hash.slice(1);
show(needsOnboarding() ? 'bienvenue' : ['salle', 'planning', 'parcours', 'entrainer', 'jourj', 'examen', 'exos', 'decodeur'].includes(start) ? start : 'salle');
// l'écran de chargement s'efface quand le premier écran est dessiné (la 3D comprise)
frames(2).then(() => { const sp = $('#splash'); if (!sp) return; sp.classList.add('out'); setTimeout(() => sp.remove(), 700); });
// pendant qu'on lit l'accueil, la 3D du prochain cours se prépare (compilation des shaders) : la séance démarrera sans attente
if (has3D) setTimeout(() => prewarm(nextCourse()), 1800);
