/* Voix : plugin natif (@capacitor-community/text-to-speech) > Web Speech > sous-titres minutés.
   Pour une voix studio : remplacer say() par la lecture d'un MP3 par phrase (même promesse). */
import { store, wait } from './util.js';

export const Voice = {
  on: store.get('voice', true), rate: 1, v: null,
  init() {
    const ss = window.speechSynthesis; if (!ss) return;
    const pick = () => { const vs = ss.getVoices().filter(v => /^fr/i.test(v.lang)); this.v = vs.find(v => /fr[-_]FR/i.test(v.lang) && /(Amélie|Audrey|Aurélie|Thomas|Google|Premium|Enhanced|Natural)/i.test(v.name)) || vs.find(v => /fr[-_]FR/i.test(v.lang)) || vs[0] || null; };
    pick(); try { ss.addEventListener('voiceschanged', pick); } catch (e) { ss.onvoiceschanged = pick; }
  },
  native() { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.TextToSpeech ? C.Plugins.TextToSpeech : null; },
  unlock() { try { if (this.native() || !window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) {} },
  stop() { try { const n = this.native(); if (n) n.stop(); } catch (e) {} try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} },
  setOn(v) { this.on = v; store.set('voice', v); if (!v) this.stop(); else this.unlock(); },
  say(text) {
    return new Promise(res => {
      if (!this.on) return res('off');
      const n = this.native();
      if (n) { n.speak({ text, lang: 'fr-FR', rate: this.rate, pitch: 1, volume: 1, category: 'playback' }).then(() => res('end'), () => res('err')); return; }
      const ss = window.speechSynthesis; if (!ss || typeof SpeechSynthesisUtterance === 'undefined') return res('none');
      try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = this.rate; if (this.v) u.voice = this.v; u.onend = () => res('end'); u.onerror = () => res('err'); ss.speak(u); } catch (e) { res('err'); }
    });
  }
};
Voice.init();
export const words = t => t.trim().split(/\s+/).length;
export const estimate = t => (words(t) * 0.36 + 0.4) / Voice.rate * 1000;
export const splitSentences = t => (t.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [t]).map(s => s.trim()).filter(Boolean);
/* Lit une phrase ; si la voix ne joue pas, attend la durée estimée (les sous-titres font le travail). */
export async function sayTimed(text, isLive = () => true) {
  const est = estimate(text), ts = performance.now();
  await Promise.race([Voice.say(text), wait(est * 2 + 1500)]);
  const el = performance.now() - ts;
  if (isLive() && el < est * 0.45) await wait(est - el);
}
