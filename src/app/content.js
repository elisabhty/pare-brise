/* Tout le contenu (thèmes, cours, questions, séries) arrive en JSON.
   Aujourd'hui il est intégré au build ; demain il peut venir d'une API (Supabase…) avec le même format. */

let raw = { themes: [], cours: [], questions: [], series: [], exercices: [] };
try { raw = JSON.parse(document.getElementById('content').textContent); } catch (e) { console.error('Contenu illisible', e); }

export const THEMES = raw.themes;
export const EXOS = raw.exercices || [];
export const COURSES = raw.cours.slice().sort((a, b) => (a.ordre || 99) - (b.ordre || 99));
export const QUESTIONS = new Map(raw.questions.map(q => [q.id, q]));
export const SERIES = new Map(raw.series.map(s => [s.id, s]));
const byId = new Map(COURSES.map(c => [c.id, c]));

export const course = id => byId.get(id);
export const theme = id => THEMES.find(t => t.id === id) || { id, nom: id };
export const coursesOf = themeId => COURSES.filter(c => c.theme === themeId);
export const courseNumber = c => COURSES.indexOf(c) + 1;
export const questionTheme = q => (byId.get(q.cours) || {}).theme;
export const seriesOfCourse = c => (c.series || []).map(id => SERIES.get(id)).filter(Boolean);
export const allQuestionIds = () => [...QUESTIONS.keys()];
export const signsOfCourse = c => {
  if (c.affiche && c.affiche.length) return c.affiche;
  const ids = []; (c.scenes || []).forEach(s => (s.panneaux || []).forEach(p => { if (!ids.includes(p) && !p.startsWith('X_')) ids.push(p); }));
  return ids.slice(0, 6);
};
