export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
