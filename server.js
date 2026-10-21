require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Quiz API running' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', require('./auth').router);
app.use('/api', require('./routes'));
app.use('/api', require('./files'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || (['ValidationError', 'MulterError'].includes(err.name) ? 400 : 500)).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizdb')
  .then(() => app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`)))
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });