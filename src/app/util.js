export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* typographie française : espace insécable avant ? ! : ; et après « (le « ? » ne part plus seul à la ligne) ;
   un nombre reste collé à ses milliers et à son unité (« 2 000 », « 50 m » ne se coupent plus en fin de ligne) ;
   le terme officiel entre guillemets (« à froid », « Se déporter », « Mes points permis ») s'affiche en gras, d'un seul tenant */
export const fr = t => esc(t).replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0')
  .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0')
  .replace(/(\d) (?=(?:m|km|mm|cm|s|h|min|€|ans?|mois|jours?|mètres?|kilomètres?|millimètres?|centimètres?|secondes?|minutes?|heures?|points?|euros?|grammes?|litres?|g|mg)(?![\wà-ÿ]))/g, '$1\u00a0')
  .replace(/«\u00a0([^«»<]{1,40}?)\u00a0»/g, (m, t) => `«\u00a0<b class="terme">${t.length <= 24 ? t.replace(/ /g, '\u00a0') : t}</b>\u00a0»`);

/* Stockage local. En natif, à remplacer par @capacitor/preferences (même interface get/set). */
export const store = (() => {
  let d = {};
  try { d = JSON.parse(localStorage.getItem('parebrise.v3') || '{}') || {}; } catch (e) { d = {}; }
  const save = () => { try { localStorage.setItem('parebrise.v3', JSON.stringify(d)); } catch (e) {} };
  return { get: (k, def) => (k in d ? d[k] : def), set: (k, v) => { d[k] = v; save(); } };
})();

export function haptic(kind) {
  try {
    const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (!H) return;
    if (kind === 'ok') H.notification({ type: 'SUCCESS' });
    else if (kind === 'ko') H.notification({ type: 'ERROR' });
    else H.impact({ style: kind === 'heavy' ? 'HEAVY' : 'LIGHT' });
  } catch (e) {}
}
