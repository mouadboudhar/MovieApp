import * as SQLite from 'expo-sqlite';
import { Collection, CollectionItem, Movie, Rating } from '../types';
import { getToken } from './AuthService';
import { API_BASE_URL } from '../config';

const DATABASE_NAME = 'movieapp.db';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Get database instance (singleton pattern)
 */
const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  
  // Ensure tables are created
  if (!isInitialized) {
    await initializeTables(db);
    isInitialized = true;
  }
  
  return db;
};

/**
 * Initialize tables
 */
const initializeTables = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
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
      tmdb_id INTEGER PRIMARY KEY,
      user_id INTEGER,
      rating INTEGER NOT NULL,
      review TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
};

/**
 * Simple hash function for passwords (not cryptographically secure, but works offline)
 * In production, use bcrypt or similar on a server
 */
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + password.length.toString(16);
};

/**
 * Initialize database and create tables if they don't exist
 */
export const initDB = async (): Promise<void> => {
  try {
    const database = await getDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// ==================== USER AUTHENTICATION ====================

export interface DBUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

/**
 * Register a new user
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; userId?: number; error?: string }> => {
  const database = await getDatabase();

  // Check if email already exists
  const existing = await database.getFirstAsync<DBUser>(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()]
  );

  if (existing) {
    return { success: false, error: 'Email already registered' };
  }

  const passwordHash = hashPassword(password);
  const createdAt = new Date().toISOString();

  try {
    const result = await database.runAsync(
      'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, createdAt]
    );

    return { success: true, userId: result.lastInsertRowId };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: 'Failed to register user' };
  }
};

/**
 * Login user with email and password
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: DBUser; error?: string }> => {
  const database = await getDatabase();

  const user = await database.getFirstAsync<DBUser>(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()]
  );

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  const passwordHash = hashPassword(password);

  if (user.password_hash !== passwordHash) {
    return { success: false, error: 'Invalid email or password' };
  }

  return { success: true, user };
