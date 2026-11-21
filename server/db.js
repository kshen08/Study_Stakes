import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STARTING_COINS, DAILY_ALLOWANCE } from '../shared/economy.js';
import { ITEMS, DEFAULT_EQUIPPED, SKIN_TONES } from '../shared/items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'study.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  coins INTEGER NOT NULL,
  skin_tone TEXT NOT NULL,
  last_allowance_date TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  empty_pages INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',   -- queued | processing | ready | error
  chunks_done INTEGER NOT NULL DEFAULT 0,
  chunks_total INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chunk_id INTEGER REFERENCES chunks(id) ON DELETE SET NULL,
  type TEXT NOT NULL,           -- mc | tf | short | numeric
  difficulty TEXT NOT NULL,      -- easy | medium | hard
  prompt TEXT NOT NULL,
  choices TEXT,                  -- JSON array for mc
  answer TEXT NOT NULL,
  tolerance REAL,
  explanation TEXT NOT NULL,
  page INTEGER,
  box INTEGER NOT NULL DEFAULT 0,        -- Leitner box 0..4 (0 = needs review)
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_wrong INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  stake INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | correct | wrong | forfeited
  user_answer TEXT,
  feedback TEXT,
  payout INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  answered_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  item_id TEXT PRIMARY KEY,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipped (
  slot TEXT PRIMARY KEY,
  item_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_doc ON questions(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id);
`);

// First-run setup
if (!db.prepare('SELECT 1 FROM profile WHERE id = 1').get()) {
  db.prepare('INSERT INTO profile (id, coins, skin_tone) VALUES (1, 0, ?)').run(SKIN_TONES[1]);
  addCoins(STARTING_COINS, 'Starting balance');
  for (const item of ITEMS.filter((i) => i.price === 0)) {
    db.prepare('INSERT OR IGNORE INTO inventory (item_id) VALUES (?)').run(item.id);
  }
  for (const [slot, itemId] of Object.entries(DEFAULT_EQUIPPED)) {
    db.prepare('INSERT OR REPLACE INTO equipped (slot, item_id) VALUES (?, ?)').run(slot, itemId);
  }
}

// Anything left mid-generation when the server stopped gets re-queued on boot.
db.prepare("UPDATE documents SET status = 'queued' WHERE status = 'processing'").run();

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function getCoins() {
  return db.prepare('SELECT coins FROM profile WHERE id = 1').get().coins;
}

/** Adjust balance and log it. Throws if it would go negative. Call inside tx() when combined with other writes. */
export function addCoins(delta, reason) {
  const coins = getCoins();
  const next = coins + delta;
  if (next < 0) throw Object.assign(new Error('Not enough coins'), { status: 400 });
  db.prepare('UPDATE profile SET coins = ? WHERE id = 1').run(next);
  db.prepare('INSERT INTO transactions (delta, reason, balance_after) VALUES (?, ?, ?)').run(delta, reason, next);
  return next;
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Grants the daily allowance once per calendar day. Returns the amount granted (0 if already claimed). */
export function claimDailyAllowance() {
  const today = localDate();
  const { last_allowance_date } = db.prepare('SELECT last_allowance_date FROM profile WHERE id = 1').get();
  if (last_allowance_date === today) return 0;
  tx(() => {
    db.prepare('UPDATE profile SET last_allowance_date = ? WHERE id = 1').run(today);
    addCoins(DAILY_ALLOWANCE, 'Daily allowance');
  });
  return DAILY_ALLOWANCE;
}
