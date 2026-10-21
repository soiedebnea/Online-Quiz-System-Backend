require('dotenv').config();
const mongoose = require('mongoose');
const { Question } = require('./models');

// [text, options, correctIndex, category, difficulty, points]
const rows = [
  ['Which language runs in the browser?', ['Python', 'JavaScript', 'C++', 'Go'], 1, 'Web', 'easy', 1],
  ['What does HTML stand for?', ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Mode Language'], 0, 'Web', 'easy', 1],
  ['Which HTTP method is used to create a resource?', ['GET', 'DELETE', 'POST', 'HEAD'], 2, 'Web', 'medium', 1],
  ['What does CSS control?', ['Database', 'Presentation/styling', 'Server routing', 'Encryption'], 1, 'Web', 'easy', 1],
  ['Which status code means "Not Found"?', ['200', '301', '404', '500'], 2, 'Web', 'medium', 1],
  ['MongoDB stores data as?', ['Tables', 'Documents (BSON)', 'Graphs', 'Key-only pairs'], 1, 'Database', 'easy', 1],
  ['Which symbol begins a MongoDB operator like $match?', ['#', '@', '$', '%'], 2, 'Database', 'medium', 1],
  ['Which MongoDB feature speeds up queries on a field?', ['Index', 'Cursor', 'Shard key only', 'Journal'], 0, 'Database', 'hard', 2],
  ['Which is a JavaScript runtime for servers?', ['Node.js', 'Django', 'Laravel', 'Flask'], 0, 'Backend', 'easy', 1],
  ['Express is a framework for?', ['Node.js', 'Java', 'PHP', 'Ruby'], 0, 'Backend', 'easy', 1],
  ['What does JWT stand for?', ['Java Web Tool', 'JSON Web Token', 'JavaScript Web Type', 'Joint Web Transfer'], 1, 'Backend', 'medium', 1],
  ['What is the time complexity of binary search?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'Algorithms', 'hard', 2],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizdb');
  await Question.deleteMany({});
  await Question.insertMany(rows.map(([text, options, correctIndex, category, difficulty, points]) =>
    ({ text, options, correctIndex, category, difficulty, points, timeLimit: difficulty === 'hard' ? 45 : 30 })));
  console.log(`Seeded ${rows.length} questions`);
  process.exit(0);
})();