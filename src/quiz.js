// Beginner-friendly structures with clear silhouettes in the current model.
const QUIZ_MUSCLES = [
  'deltoid-lateral', 'pectoralis-major', 'latissimus-dorsi', 'biceps-long',
  'triceps-long', 'rectus-abdominis', 'external-oblique', 'gluteus-maximus',
  'gluteus-medius', 'rectus-femoris', 'vastus-medialis', 'sartorius',
  'gastrocnemius-medial', 'tibialis-anterior', 'sternocleidomastoid',
  'brachioradialis', 'soleus', 'teres-major',
];
function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createQuizRounds(records, random = Math.random) {
  const unique = new Map();
  for (const rec of records) if (QUIZ_MUSCLES.includes(rec.id) && (!rec.side || rec.side === 'right')) unique.set(rec.id, rec);
  const pool = [...unique.values()];
  return shuffled(pool, random).slice(0, 5).map((answer) => ({
    answer,
    choices: shuffled([answer, ...shuffled(pool.filter((rec) => rec.id !== answer.id), random).slice(0, 3)], random),
  }));
}
