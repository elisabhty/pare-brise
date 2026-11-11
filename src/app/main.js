/* Point d'entrée : moteur 3D, contenu, écrans. */
import { $ } from './util.js';
import { has3D, Engine } from './world.js';
import { Sound } from './sound.js';
import { setupScreens } from './screens.js';
import { show } from './nav.js';
import { COURSES } from './content.js';
import { signsOfCourse } from './content.js';

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
if (has3D) Engine.preload(COURSES.flatMap(c => signsOfCourse(c)).slice(0, 24));
const start = location.hash.slice(1);
show(['salle', 'parcours', 'examen', 'parebrise', 'decodeur'].includes(start) ? start : 'salle');
