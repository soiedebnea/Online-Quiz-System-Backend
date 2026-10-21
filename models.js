const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  text: { type: String, required: true, trim: true },
  options: { type: [String], validate: v => v.length >= 2 && v.length <= 6 },
  correctIndex: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'General', trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  points: { type: Number, default: 1, min: 1 },
  timeLimit: { type: Number, default: 30, min: 5, max: 300 }, // seconds per question
  image: { type: String, default: '' },
}, { timestamps: true });
questionSchema.pre('validate', function (next) {
  if (this.options && this.correctIndex >= this.options.length) this.invalidate('correctIndex', 'correctIndex is out of range');
  next();
});

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

const resultSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  category: { type: String, default: 'Mixed' },
  difficulty: { type: String, default: 'Mixed' },
  score: Number, maxScore: Number, correct: Number, total: Number, percentage: Number,
  timeTaken: { type: Number, default: 0 }, // seconds
}, { timestamps: true });
resultSchema.index({ score: -1, timeTaken: 1 });
resultSchema.index({ user: 1, createdAt: -1 });

const fileSchema = new Schema({
  originalName: String, filename: String, mimetype: String, size: Number, url: String,
}, { timestamps: true });

module.exports = {
  Question: mongoose.model('Question', questionSchema),
  User: mongoose.model('User', userSchema),
  Result: mongoose.model('Result', resultSchema),
  FileDoc: mongoose.model('File', fileSchema),
};