// User accounts (JWT) + personal history
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Result } = require('./models');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET not set, using insecure dev secret');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const sign = u => jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email });

async function getUser(req) {
  const h = req.header('authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return await User.findById(jwt.verify(h.slice(7), SECRET).id); } catch { return null; }
}
const optionalAuth = async (req, res, next) => { req.user = await getUser(req); next(); };
const requireAuth = async (req, res, next) => {
  req.user = await getUser(req);
  req.user ? next() : res.status(401).json({ error: 'Login required' });
};

router.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Valid name and email required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

router.post('/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user: pub(user) });
}));

router.get('/auth/me', requireAuth, (req, res) => res.json(pub(req.user)));

router.get('/me/history', requireAuth, wrap(async (req, res) => {
  const results = await Result.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const attempts = results.length;
  res.json({
    stats: {
      attempts,
      best: attempts ? Math.max(...results.map(r => r.percentage)) : 0,
      average: attempts ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / attempts) : 0,
    },
    results,
  });
}));

module.exports = { router, optionalAuth, requireAuth };