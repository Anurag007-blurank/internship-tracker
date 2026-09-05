// db.js
// Sets up a local SQLite database file (no separate DB server needed).
// Beginner note: SQLite stores the whole database in one file on disk.

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Create tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('internship', 'hackathon')),
    source_url TEXT,
    registration_open_date TEXT,   -- ISO date: when registration opens
    deadline TEXT,                 -- ISO date: last date to apply
    remind_before_hours INTEGER DEFAULT 24,
    status TEXT DEFAULT 'pending', -- pending | notified_open | notified_deadline | done
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    type TEXT NOT NULL,          -- 'registration_open' | 'deadline_approaching'
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    channel TEXT DEFAULT 'email',
    FOREIGN KEY (target_id) REFERENCES targets(id)
  );
`);

module.exports = db;
