// File management: image upload/list/delete + bulk question import (admin only)
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { FileDoc, Question } = require('./models');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const adminOnly = (req, res, next) =>
  req.header('x-admin-key') === process.env.ADMIN_KEY ? next() : res.status(401).json({ error: 'Admin key required' });
const bad = msg => Object.assign(new Error(msg), { status: 400 });

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES.includes(file.mimetype) ? cb(null, true) : cb(bad('Only PNG, JPG, GIF or WEBP images allowed')),
});
const uploadJson = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

// Upload image
router.post('/files', adminOnly, uploadImage.single('file'), wrap(async (req, res) => {
  if (!req.file) throw bad('No file uploaded (field name: "file")');
  const doc = await FileDoc.create({
    originalName: req.file.originalname, filename: req.file.filename,
    mimetype: req.file.mimetype, size: req.file.size, url: `/uploads/${req.file.filename}`,
  });
  res.status(201).json(doc);
}));

// List files
router.get('/files', adminOnly, wrap(async (req, res) => {
  res.json(await FileDoc.find().sort({ createdAt: -1 }));
}));

// Delete file (disk + DB) and detach it from questions
router.delete('/files/:id', adminOnly, wrap(async (req, res) => {
  const doc = await FileDoc.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'File not found' });
  await fs.promises.unlink(path.join(UPLOAD_DIR, doc.filename)).catch(() => {});
  const r = await Question.updateMany({ image: doc.url }, { $set: { image: '' } });
  res.json({ ok: true, detachedFromQuestions: r.modifiedCount });
}));

// Bulk import questions from a JSON file: [{text, options[], correctIndex, category?, points?, image?}]
router.post('/questions/import', adminOnly, uploadJson.single('file'), wrap(async (req, res) => {
  if (!req.file) throw bad('No file uploaded (field name: "file")');
  let data;
  try { data = JSON.parse(req.file.buffer.toString('utf8')); } catch { throw bad('Invalid JSON file'); }
  if (!Array.isArray(data) || !data.length) throw bad('JSON must be a non-empty array of questions');
  const inserted = await Question.insertMany(data);
  res.status(201).json({ imported: inserted.length });
}));

module.exports = router;