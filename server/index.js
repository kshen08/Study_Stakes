import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, tx, addCoins, getCoins, claimDailyAllowance, UPLOAD_DIR } from './db.js';
import { runQueue, grade } from './generate.js';
import { ollamaStatus } from './llm.js';
import { TIERS, winAmount, DAILY_ALLOWANCE } from '../shared/economy.js';
import { ITEMS, ITEMS_BY_ID, SLOTS, SKIN_TONES } from '../shared/items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5174);
const app = express();
app.use(express.json());

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });

// ---------- Profile ----------

function profilePayload(extra = {}) {
  const p = db.prepare('SELECT coins, skin_tone FROM profile WHERE id = 1').get();
  const equipped = Object.fromEntries(db.prepare('SELECT slot, item_id FROM equipped').all().map((r) => [r.slot, r.item_id]));
  const inventory = db.prepare('SELECT item_id FROM inventory').all().map((r) => r.item_id);
  return { coins: p.coins, skinTone: p.skin_tone, equipped, inventory, ...extra };
}

app.get('/api/profile', (req, res) => {
  const allowanceGranted = claimDailyAllowance();
  res.json(profilePayload({ allowanceGranted, dailyAllowance: DAILY_ALLOWANCE }));
});

app.post('/api/profile/skin', (req, res) => {
  const { skinTone } = req.body;
  if (!SKIN_TONES.includes(skinTone)) throw httpError(400, 'Invalid skin tone');
  db.prepare('UPDATE profile SET skin_tone = ? WHERE id = 1').run(skinTone);
  res.json(profilePayload());
});

app.get('/api/status', wrap(async (req, res) => {
  res.json({ ollama: await ollamaStatus() });
}));

// ---------- Courses & documents ----------

app.get('/api/courses', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM documents d WHERE d.course_id = c.id) AS doc_count,
      (SELECT COUNT(*) FROM questions q WHERE q.course_id = c.id) AS question_count
    FROM courses c ORDER BY c.created_at DESC, c.id DESC`).all();
  res.json(rows);
});

app.post('/api/courses', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Course name is required');
  const { lastInsertRowid } = db.prepare('INSERT INTO courses (name) VALUES (?)').run(name.slice(0, 100));
  res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(lastInsertRowid));
});

app.patch('/api/courses/:id', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Course name is required');
  db.prepare('UPDATE courses SET name = ? WHERE id = ?').run(name.slice(0, 100), req.params.id);
  res.json({ ok: true });
});

function removeFiles(docs) {
  for (const d of docs) fs.rm(d.stored_path, { force: true }, () => {});
}

app.delete('/api/courses/:id', (req, res) => {
  const docs = db.prepare('SELECT stored_path FROM documents WHERE course_id = ?').all(req.params.id);
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  removeFiles(docs);
  res.json({ ok: true });
});

app.get('/api/courses/:id/documents', (req, res) => {
  const rows = db.prepare(`
    SELECT d.id, d.course_id, d.filename, d.pages, d.empty_pages, d.status, d.chunks_done, d.chunks_total, d.error, d.created_at,
      (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) AS question_count
    FROM documents d WHERE d.course_id = ? ORDER BY d.id DESC`).all(req.params.id);
  res.json(rows);
});

const ALLOWED_EXT = new Set(['.pdf', '.txt', '.md']);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_EXT.has(path.extname(file.originalname).toLowerCase())),
});

app.post('/api/courses/:id/documents', upload.array('files', 20), (req, res) => {
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!course) {
    removeFiles((req.files || []).map((f) => ({ stored_path: f.path })));
    throw httpError(404, 'Course not found');
  }
  if (!req.files?.length) throw httpError(400, 'Upload PDF, .txt or .md files');
  const ins = db.prepare('INSERT INTO documents (course_id, filename, stored_path) VALUES (?, ?, ?)');
  // multer decodes original names as latin1; restore UTF-8.
  for (const f of req.files) ins.run(course.id, Buffer.from(f.originalname, 'latin1').toString('utf8'), f.path);
  runQueue();
  res.json({ ok: true, count: req.files.length });
});

app.delete('/api/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT stored_path FROM documents WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  if (doc) removeFiles([doc]);
  res.json({ ok: true });
});

// Generate another round of questions from the same document (avoids duplicating existing ones).
app.post('/api/documents/:id/more', (req, res) => {
  const r = db.prepare("UPDATE documents SET status = 'queued', chunks_done = 0, error = NULL WHERE id = ? AND status IN ('ready', 'error')").run(req.params.id);
  if (!r.changes) throw httpError(409, 'Document is already being processed');
  runQueue();
  res.json({ ok: true });
});

app.get('/api/documents/:id/questions', (req, res) => {
  res.json(db.prepare('SELECT id, type, difficulty, prompt, choices, answer, explanation, page, box, times_seen, times_wrong FROM questions WHERE document_id = ? ORDER BY page, id').all(req.params.id)
    .map((q) => ({ ...q, choices: q.choices ? JSON.parse(q.choices) : null })));
});

app.delete('/api/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Study ----------

function poolFilter({ courseId, documentId, difficulty, reviewOnly }) {
  const where = ['q.course_id = ?'];
  const params = [Number(courseId)];
  if (documentId) { where.push('q.document_id = ?'); params.push(Number(documentId)); }
  if (difficulty) { where.push('q.difficulty = ?'); params.push(difficulty); }
  if (reviewOnly) where.push('q.times_wrong > 0 AND q.box = 0');
  return { sql: where.join(' AND '), params };
}

app.get('/api/study/pool', (req, res) => {
  const { sql, params } = poolFilter(req.query);
  const rows = db.prepare(`SELECT difficulty, COUNT(*) AS total, SUM(times_wrong > 0 AND box = 0) AS review FROM questions q WHERE ${sql} GROUP BY difficulty`).all(...params);
  const out = { easy: { total: 0, review: 0 }, medium: { total: 0, review: 0 }, hard: { total: 0, review: 0 } };
  for (const r of rows) out[r.difficulty] = { total: r.total, review: r.review || 0 };
  res.json(out);
});

const BOX_WEIGHTS = [6, 3, 1.5, 0.75, 0.4];
const UNSEEN_WEIGHT = 3;

function pickQuestion(candidates) {
  const recent = new Set(db.prepare('SELECT question_id FROM attempts ORDER BY id DESC LIMIT 10').all().map((r) => r.question_id));
  let pool = candidates.filter((c) => !recent.has(c.id));
  if (!pool.length) pool = candidates;
  const weights = pool.map((q) => (q.times_seen === 0 ? UNSEEN_WEIGHT : BOX_WEIGHTS[q.box] ?? 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool.at(-1);
}

function publicQuestion(q) {
  const doc = db.prepare('SELECT filename FROM documents WHERE id = ?').get(q.document_id);
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    choices: q.choices ? JSON.parse(q.choices) : null,
    source: doc?.filename,
    page: q.page,
    isReview: q.times_wrong > 0 && q.box === 0,
  };
}

app.post('/api/study/draw', (req, res) => {
  const { courseId, documentId, difficulty, reviewOnly } = req.body;
  const tier = TIERS[difficulty];
  if (!tier) throw httpError(400, 'Pick a difficulty');
  const result = tx(() => {
    // Any question left unanswered is forfeited (its stake is already gone).
    db.prepare("UPDATE attempts SET status = 'forfeited', answered_at = datetime('now') WHERE status = 'pending'").run();
    if (getCoins() < tier.stake) throw httpError(402, `You need ${tier.stake} coins to play a ${tier.label} question.`);
    const { sql, params } = poolFilter({ courseId, documentId, difficulty, reviewOnly });
    const candidates = db.prepare(`SELECT * FROM questions q WHERE ${sql}`).all(...params);
    if (!candidates.length) throw httpError(404, reviewOnly ? 'Nothing to review at this difficulty. Nice!' : 'No questions at this difficulty yet.');
    const q = pickQuestion(candidates);
    const coins = addCoins(-tier.stake, `Stake: ${tier.label} question`);
    const { lastInsertRowid } = db.prepare('INSERT INTO attempts (question_id, stake) VALUES (?, ?)').run(q.id, tier.stake);
    db.prepare("UPDATE questions SET times_seen = times_seen + 1, last_seen_at = datetime('now') WHERE id = ?").run(q.id);
    return { attemptId: Number(lastInsertRowid), coins, stake: tier.stake, win: winAmount(difficulty, q.type), question: publicQuestion(q) };
  });
  res.json(result);
});

const grading = new Set();

app.post('/api/study/answer', wrap(async (req, res) => {
  const attemptId = Number(req.body.attemptId);
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
  if (!attempt) throw httpError(404, 'Attempt not found');
  if (attempt.status !== 'pending') throw httpError(409, 'This question was already answered or forfeited.');
  if (grading.has(attemptId)) throw httpError(409, 'Already grading this answer');
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(attempt.question_id);
  if (!q) throw httpError(404, 'Question no longer exists');

  grading.add(attemptId);
  let verdict;
  try {
    verdict = await grade(q, req.body.answer);
  } catch (e) {
    throw httpError(503, `Grading failed (${e.message}). Your stake is still held; try submitting again.`);
  } finally {
    grading.delete(attemptId);
  }

  const win = winAmount(q.difficulty, q.type);
  const out = tx(() => {
    // Re-check: the attempt may have been forfeited while the model was grading.
    const still = db.prepare('SELECT status FROM attempts WHERE id = ?').get(attemptId);
    if (still.status !== 'pending') throw httpError(409, 'This question was forfeited because you drew a new one.');
    const payout = verdict.correct ? attempt.stake + win : 0;
    db.prepare("UPDATE attempts SET status = ?, user_answer = ?, feedback = ?, payout = ?, answered_at = datetime('now') WHERE id = ?")
      .run(verdict.correct ? 'correct' : 'wrong', String(req.body.answer ?? '').slice(0, 4000), verdict.feedback, payout, attemptId);
    if (verdict.correct) {
      db.prepare('UPDATE questions SET box = MIN(box + 1, 4) WHERE id = ?').run(q.id);
    } else {
      db.prepare('UPDATE questions SET box = 0, times_wrong = times_wrong + 1 WHERE id = ?').run(q.id);
    }
    const coins = payout ? addCoins(payout, `Won: ${TIERS[q.difficulty].label} question`) : getCoins();
    return { coins, net: verdict.correct ? win : -attempt.stake };
  });

  const doc = db.prepare('SELECT filename FROM documents WHERE id = ?').get(q.document_id);
  res.json({
    correct: verdict.correct,
    feedback: verdict.feedback,
    correctAnswer: q.answer,
    tolerance: q.tolerance,
    explanation: q.explanation,
    source: doc?.filename,
    page: q.page,
    ...out,
  });
}));

// ---------- Shop & avatar ----------

app.post('/api/shop/buy', (req, res) => {
  const item = ITEMS_BY_ID[req.body.itemId];
  if (!item) throw httpError(404, 'No such item');
  tx(() => {
    if (db.prepare('SELECT 1 FROM inventory WHERE item_id = ?').get(item.id)) throw httpError(409, 'You already own this');
    addCoins(-item.price, `Bought ${item.name}`);
    db.prepare('INSERT INTO inventory (item_id) VALUES (?)').run(item.id);
    db.prepare('INSERT OR REPLACE INTO equipped (slot, item_id) VALUES (?, ?)').run(item.slot, item.id);
  });
  res.json(profilePayload());
});

app.post('/api/avatar/equip', (req, res) => {
  const { slot, itemId } = req.body;
  if (!SLOTS.includes(slot)) throw httpError(400, 'Invalid slot');
  if (itemId == null) {
    if (slot === 'background' || slot === 'shirt') throw httpError(400, 'That slot cannot be empty');
    db.prepare('DELETE FROM equipped WHERE slot = ?').run(slot);
  } else {
    const item = ITEMS_BY_ID[itemId];
    if (!item || item.slot !== slot) throw httpError(400, 'Item does not fit that slot');
    if (!db.prepare('SELECT 1 FROM inventory WHERE item_id = ?').get(itemId)) throw httpError(403, "You don't own that item");
    db.prepare('INSERT OR REPLACE INTO equipped (slot, item_id) VALUES (?, ?)').run(slot, itemId);
  }
  res.json(profilePayload());
});

// ---------- Stats ----------

app.get('/api/stats', (req, res) => {
  const answered = "a.status IN ('correct', 'wrong', 'forfeited')";
  const agg = (groupExpr, join = '') => db.prepare(`
    SELECT ${groupExpr} AS key, COUNT(*) AS answered, SUM(a.status = 'correct') AS correct,
      SUM(CASE WHEN a.status = 'correct' THEN a.payout - a.stake ELSE -a.stake END) AS net
    FROM attempts a JOIN questions q ON q.id = a.question_id ${join}
    WHERE ${answered} GROUP BY key ORDER BY answered DESC`).all();

  const totals = db.prepare(`SELECT COUNT(*) AS answered, SUM(a.status = 'correct') AS correct,
      SUM(a.status = 'forfeited') AS forfeited FROM attempts a WHERE ${answered}`).get();
  const daily = db.prepare(`SELECT date(a.created_at, 'localtime') AS day, COUNT(*) AS answered, SUM(a.status = 'correct') AS correct
      FROM attempts a WHERE ${answered} GROUP BY day ORDER BY day DESC LIMIT 30`).all().reverse();
  const history = db.prepare('SELECT id, delta, reason, balance_after, created_at FROM transactions ORDER BY id DESC LIMIT 400').all().reverse();
  const mostMissed = db.prepare(`SELECT q.id, q.prompt, q.difficulty, q.times_wrong, q.times_seen, d.filename, q.page
      FROM questions q JOIN documents d ON d.id = q.document_id WHERE q.times_wrong > 0 ORDER BY q.times_wrong DESC, q.times_seen ASC LIMIT 8`).all();

  res.json({
    totals: { answered: totals.answered || 0, correct: totals.correct || 0, forfeited: totals.forfeited || 0, coins: getCoins() },
    byDifficulty: agg('q.difficulty'),
    byType: agg('q.type'),
    byCourse: agg('c.name', 'JOIN courses c ON c.id = q.course_id'),
    byDocument: agg('d.filename', 'JOIN documents d ON d.id = q.document_id'),
    daily,
    history,
    mostMissed,
  });
});

// ---------- Static client (production) & errors ----------

const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Something went wrong' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Study Helper API on http://127.0.0.1:${PORT}`);
  runQueue();
});
