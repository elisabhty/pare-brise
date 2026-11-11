/* Cœur du planning et de la série, sans DOM (testé à part).
   Une activité : { id, min } — « c:cours », « s:série », « x:exercice 3D », « b:n » (examen blanc n°n).
   Un plan : { jours: [0..6] (0 = lundi), minutes, examen: 'AAAA-MM-JJ' | null, cree, sessions: [{ d, items: [id] }] }. */
import { iso, fromIso, addD, wd } from './dates.js';

/* ---------- Série (jours d'activité d'affilée) ---------- */
/* La série reste vivante jusqu'à la fin de la journée : si rien n'est fait aujourd'hui, on compte à partir d'hier. */
export function streakOf(days, t) {
  const set = days instanceof Set ? days : new Set(days);
  let d = set.has(iso(t)) ? t : addD(t, -1), n = 0;
  while (set.has(iso(d))) { n++; d = addD(d, -1); }
  return n;
}
export function bestStreak(days) {
  const list = [...new Set(days)].sort(); let best = 0, run = 0, prev = null;
  list.forEach(s => { const d = fromIso(s); run = prev && iso(addD(prev, 1)) === s ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}

/* ---------- Ordre du parcours ---------- */
/* Pour chaque cours : le cours, sa série de questions, puis ses exercices 3D. Les examens blancs arrivent à 60 % et 85 % du
   programme, puis deux à la fin, juste avant le jour J. */
export function buildOrder(courses, { seriesOf, exosOf, minCours, minSerie, minExo, blancMin = 25 }) {
  const out = [], n = courses.length;
  const marks = { [Math.ceil(n * 0.6)]: 1, [Math.ceil(n * 0.85)]: 2 };
  courses.forEach((c, i) => {
    out.push({ id: 'c:' + c.id, min: minCours(c) });
    seriesOf(c).forEach(s => out.push({ id: 's:' + s.id, min: minSerie(s) }));
    exosOf(c).forEach(e => out.push({ id: 'x:' + e.id, min: minExo(e) }));
    if (marks[i + 1]) out.push({ id: 'b:' + marks[i + 1], min: blancMin });
  });
  out.push({ id: 'b:3', min: blancMin }, { id: 'b:4', min: blancMin });
  return out;
}

/* ---------- Répartition dans les jours choisis ---------- */
/* Une séance se remplit jusqu'à la durée voulue (10 % de marge) ; une activité plus longue que la séance a la sienne. */
export function pack(items, { start, jours, minutes, deja = 0, premier = null }) {
  const out = []; let d = start, i = 0, guard = 0;
  if (!jours || !jours.length) return out;
  while (i < items.length && guard++ < 3000) {
    if (jours.includes(wd(d))) {
      const s = premier && iso(d) === premier.d ? premier : { d: iso(d), items: [] };
      let used = s === premier ? deja : 0;
      while (i < items.length && (!s.items.length || used + items[i].min <= minutes * 1.1)) { s.items.push(items[i].id); used += items[i].min; i++; }
      if (s.items.length && s !== premier) out.push(s);
    }
    d = addD(d, 1);
  }
  return out;
}

/* ---------- Créer ou replacer le planning ---------- */
/* Les séances passées gardent ce qui y a été fait ; tout ce qui reste est réparti à partir d'aujourd'hui (si c'est un jour choisi,
   la séance du jour se complète jusqu'à sa durée), dans l'ordre du parcours. */
export function replan(plan, order, isDone, t) {
  const tIso = iso(t), minOf = new Map(order.map(o => [o.id, o.min]));
  const keep = (plan.sessions || []).filter(s => s.d <= tIso).map(s => ({ d: s.d, items: s.items.filter(isDone) })).filter(s => s.items.length);
  const placed = new Set(keep.flatMap(s => s.items));
  const pool = order.filter(o => !placed.has(o.id) && !isDone(o.id));
  let todayS = keep.find(s => s.d === tIso) || null;
  const deja = todayS ? todayS.items.reduce((a, id) => a + (minOf.get(id) || 0), 0) : 0;
  if (!todayS && plan.jours.includes(wd(t))) todayS = { d: tIso, items: [] };
  const rest = pack(pool, { start: t, jours: plan.jours, minutes: plan.minutes, deja, premier: todayS });
  const all = keep.filter(s => s !== todayS).concat(todayS && todayS.items.length ? [todayS] : [], rest);
  all.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return Object.assign({}, plan, { sessions: all });
}

/* activités prévues avant aujourd'hui et pas encore faites */
export const lateItems = (plan, isDone, t) => (plan.sessions || []).filter(s => s.d < iso(t)).flatMap(s => s.items.filter(id => !isDone(id)));
export const sessionOf = (plan, d) => (plan.sessions || []).find(s => s.d === (typeof d === 'string' ? d : iso(d))) || null;
export const lastDay = plan => { const s = (plan.sessions || []).slice(-1)[0]; return s ? fromIso(s.d) : null; };

/* aperçu d'un rythme : nombre de séances et date de fin, sans rien enregistrer */
export function preview(order, isDone, { jours, minutes }, t) {
  const todo = order.filter(o => !isDone(o.id));
  const s = pack(todo, { start: t, jours, minutes });
  return { seances: s.length, fin: s.length ? fromIso(s[s.length - 1].d) : null, activites: todo.length, minutes: todo.reduce((a, o) => a + o.min, 0) };
}
