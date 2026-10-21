const router = require('express').Router();
const { Question, Result } = require('./models');
const { optionalAuth } = require('./auth');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const adminOnly = (req, res, next) =>
  req.header('x-admin-key') === process.env.ADMIN_KEY ? next() : res.status(401).json({ error: 'Admin key required' });
const filterOf = q => {
  const f = {};
  if (q.category && q.category !== 'all') f.category = q.category;
  if (q.difficulty && q.difficulty !== 'all') f.difficulty = q.difficulty;
  return f;
};

// Categories with question counts
router.get('/categories', wrap(async (req, res) => {
  const rows = await Question.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ categories: rows.map(r => ({ category: r._id, count: r.count })), difficulties: ['easy', 'medium', 'hard'] });
}));

// Random questions, answers hidden. Filters: ?category=&difficulty=&limit=
router.get('/questions', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  res.json(await Question.aggregate([
    { $match: filterOf(req.query) }, { $sample: { size: limit } },
    { $project: { text: 1, options: 1, category: 1, difficulty: 1, points: 1, timeLimit: 1, image: 1 } },
  ]));
}));

// ---- Admin question management ----
router.get('/admin/questions', adminOnly, wrap(async (req, res) => {
  res.json(await Question.find().sort({ createdAt: -1 }));
}));
router.post('/questions', adminOnly, wrap(async (req, res) => res.status(201).json(await Question.create(req.body))));
router.put('/questions/:id', adminOnly, wrap(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  q.set(req.body); await q.save();
  res.json(q);
}));
router.delete('/questions/:id', adminOnly, wrap(async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---- Submit answers: server-side scoring (logged-in users are linked to their account) ----
router.post('/submit', optionalAuth, wrap(async (req, res) => {
  const { answers, timeTaken, category, difficulty } = req.body;
  const name = req.user ? req.user.name : (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'No answers submitted' });

  const ids = [...new Set(answers.map(a => a.questionId))];
  const map = new Map((await Question.find({ _id: { $in: ids } })).map(q => [String(q._id), q]));

  let score = 0, maxScore = 0, correct = 0;
  const review = ids.map(id => {
    const q = map.get(id);
    if (!q) return null;
    const a = answers.find(x => x.questionId === id);
    const selected = Number.isInteger(a.selected) ? a.selected : null; // null = unanswered / timed out
    const isCorrect = selected === q.correctIndex;
    maxScore += q.points;
    if (isCorrect) { score += q.points; correct++; }
    return { questionId: id, text: q.text, options: q.options, selected, correctIndex: q.correctIndex, isCorrect };
  }).filter(Boolean);

  const result = await Result.create({
    user: req.user?._id || null, name,
    category: category && category !== 'all' ? category : 'Mixed',
    difficulty: difficulty && difficulty !== 'all' ? difficulty : 'Mixed',
    score, maxScore, correct, total: review.length,
    percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
    timeTaken: Math.max(0, Number(timeTaken) || 0),
  });
  res.status(201).json({ result, review });
}));

// Leaderboard (optional ?category=): score desc, faster time breaks ties
router.get('/leaderboard', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const f = req.query.category && req.query.category !== 'all' ? { category: req.query.category } : {};
  res.json(await Result.find(f).sort({ score: -1, timeTaken: 1, createdAt: 1 }).limit(limit));
}));

module.exports = router;