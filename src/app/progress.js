/* Progression : cours vus, scores des séries, et révision espacée (boîtes de Leitner) par question. */
import { store } from './util.js';
import { COURSES, QUESTIONS } from './content.js';

const get = () => store.get('progress', { cours: {}, series: {}, q: {}, examens: [] });
const put = p => store.set('progress', p);

export const courseState = id => get().cours[id] || { done: false, scene: 0 };
export function saveCourse(id, patch) { const p = get(); p.cours[id] = Object.assign(courseState(id), patch); put(p); }
export const seriesBest = id => (get().series[id] || {}).best;
export function saveSeries(id, score, total) { const p = get(); const s = p.series[id] || {}; if (s.best === undefined || score / total > s.best / s.total) { s.best = score; s.total = total; } s.last = Date.now(); p.series[id] = s; put(p); }
export const seriesTotal = id => (get().series[id] || {}).total;

/* Leitner : bonne réponse → boîte suivante ; erreur → retour en boîte 0 (à revoir). */
const DELAYS = [0, 1, 3, 7, 16].map(d => d * 86400000);
export function answer(qid, ok) {
  const p = get(); const q = p.q[qid] || { box: 0, seen: 0, ok: 0 };
  q.seen++; if (ok) { q.ok++; q.box = Math.min(4, q.box + 1); } else q.box = 0;
  q.due = Date.now() + DELAYS[q.box]; p.q[qid] = q; put(p);
}
export function toReview() {
  const p = get(), now = Date.now();
  return Object.entries(p.q).filter(([id, q]) => QUESTIONS.has(id) && q.seen && (q.box === 0 || q.due <= now)).sort((a, b) => a[1].box - b[1].box).map(([id]) => id);
}
export const mastered = () => Object.values(get().q).filter(q => q.box >= 2).length;
export function saveExam(score, total) { const p = get(); p.examens.push({ t: Date.now(), score, total }); p.examens = p.examens.slice(-20); put(p); }
export const exams = () => get().examens;

export const nextCourse = () => COURSES.find(c => !courseState(c.id).done) || COURSES[0];
export const doneCount = () => COURSES.filter(c => courseState(c.id).done).length;
export function readiness() {
  const p = get();
  const coursePart = COURSES.length ? doneCount() / COURSES.length : 0;
  const qPart = QUESTIONS.size ? Object.values(p.q).reduce((a, q) => a + Math.min(q.box, 3) / 3, 0) / QUESTIONS.size : 0;
  const last = p.examens.slice(-3); const examPart = last.length ? last.reduce((a, e) => a + e.score / e.total, 0) / last.length : 0;
  return Math.round(Math.min(1, coursePart * 0.35 + qPart * 0.35 + examPart * 0.3) * 100);
}
