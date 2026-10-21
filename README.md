# Quiz Backend (Node.js + Express + MongoDB)

REST API for the Online Quiz System: accounts, questions, categories/difficulty, server-side scoring, leaderboard, history and file management.

## Requirements
Node.js 18+ and MongoDB (local or MongoDB Atlas).

## Setup
```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env, then edit values
npm run seed             # sample questions (deletes existing questions!)
npm run dev              # or: npm start
```
Runs at `http://localhost:5000`.

## Environment variables
| Name | Description |
|---|---|
| PORT | Server port (default 5000) |
| MONGO_URI | MongoDB connection string |
| ADMIN_KEY | Secret for admin endpoints (header `x-admin-key`) |
| JWT_SECRET | Long random string used to sign login tokens |
| CORS_ORIGIN | Frontend URL, e.g. `https://my-quiz.netlify.app` (`*` = any) |

## API
**Public**
| Method | Path | Description |
|---|---|---|
| GET | `/api/categories` | Categories with counts + difficulty list |
| GET | `/api/questions?category=&difficulty=&limit=` | Random questions (answers hidden, includes `timeLimit`) |
| POST | `/api/submit` | Submit answers, returns score + review (`selected: null` = unanswered) |
| GET | `/api/leaderboard?category=&limit=` | Top results (score desc, time asc) |

**Accounts (JWT, header `Authorization: Bearer <token>`)**
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/me/history` | Your past attempts + stats (attempts, best, average) |

Logged-in users who submit a quiz have the result linked to their account; guests can still play by entering a name.

**Admin (header `x-admin-key`)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/questions` | All questions including correct answers |
| POST | `/api/questions` | Add question |
| PUT | `/api/questions/:id` | Edit question |
| DELETE | `/api/questions/:id` | Delete question |
| POST | `/api/questions/import` | Bulk import from JSON file (field `file`) |
| POST | `/api/files` | Upload image (field `file`; png/jpg/gif/webp, max 2 MB) |
| GET | `/api/files` | List uploaded files |
| DELETE | `/api/files/:id` | Delete file, detaches it from questions |

Question shape:
```json
{ "text": "2+2?", "options": ["3","4","5"], "correctIndex": 1,
  "category": "Math", "difficulty": "easy", "points": 1, "timeLimit": 30, "image": "/uploads/abc.png" }
```

## Timer
Each question has `timeLimit` (seconds, default 30, 5–300). The frontend counts down and moves on when time runs out; unanswered questions score 0.

## Project Structure
```
quiz-backend/
├── server.js              # Entry: Express, MongoDB connection, error handler
├── auth.js                # Register/login (JWT), history, auth middleware
├── routes.js              # Questions, categories, submit/scoring, leaderboard
├── files.js               # Image upload/list/delete, JSON question import
├── models.js              # Mongoose models: Question, User, Result, File
├── seed.js                # Sample questions
├── sample-questions.json  # Example for bulk import
├── package.json
├── .env.example           # Copy to .env
├── .gitignore
├── README.md
└── uploads/               # Auto-created; uploaded images
```

## Deployment (MongoDB Atlas + Render)
1. **Database:** create a free cluster on MongoDB Atlas, add a database user, and under *Network Access* allow `0.0.0.0/0`. Copy the connection string (`mongodb+srv://...`).
2. **Push** `quiz-backend/` to a GitHub repository (`.gitignore` already excludes `.env` and `node_modules`).
3. **Render:** New → Web Service → select the repo. Build command `npm install`, start command `npm start`.
4. **Environment variables** on Render: `MONGO_URI`, `ADMIN_KEY`, `JWT_SECRET` (long random string), `CORS_ORIGIN` (your frontend URL).
5. Seed the data once from your computer: set `MONGO_URI` to the Atlas string in your local `.env` and run `npm run seed`. Or log in to the admin page and import `sample-questions.json`.
6. Test: open `https://<your-service>.onrender.com/` and check `{"status":"Quiz API running"}`.

Notes: Render free instances sleep when idle (first request is slow), and their disk is **not persistent**, so uploaded images disappear on redeploy. Use a paid persistent disk or an external store (Cloudinary, S3) for production images.
