const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'movieapp.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tmdb_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT,
    title TEXT,
    poster_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, tmdb_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migration: Add title and poster_path to ratings if missing
try {
  const tableInfo = db.prepare("PRAGMA table_info(ratings)").all();
  const columns = tableInfo.map(col => col.name);
  
  if (!columns.includes('title')) {
    db.exec('ALTER TABLE ratings ADD COLUMN title TEXT');
    console.log('Added title column to ratings table');
  }
  if (!columns.includes('poster_path')) {
    db.exec('ALTER TABLE ratings ADD COLUMN poster_path TEXT');
    console.log('Added poster_path column to ratings table');
  }
} catch (err) {
  console.log('Migration check:', err.message);
}

console.log('Database initialized at:', dbPath);

module.exports = db;
