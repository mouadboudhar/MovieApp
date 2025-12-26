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
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<DBUser | null> => {
  const database = await getDatabase();

  const user = await database.getFirstAsync<DBUser>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  return user || null;
};

// ==================== COLLECTIONS ====================

/**
 * Create a new collection
 */
export const createCollection = async (name: string): Promise<number> => {
  try {
    const database = await getDatabase();
    const createdAt = new Date().toISOString();

    const result = await database.runAsync(
      'INSERT INTO collections (name, created_at) VALUES (?, ?)',
      [name, createdAt]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error('createCollection error:', error);
    throw error;
  }
};

/**
 * Get all collections
 */
export const getCollections = async (): Promise<Collection[]> => {
  try {
    const database = await getDatabase();

    const collections = await database.getAllAsync<Collection>(
      'SELECT * FROM collections ORDER BY created_at DESC'
    );

    return collections || [];
  } catch (error) {
    console.error('getCollections error:', error);
    return [];
  }
};

/**
 * Add a movie to a collection
 */
export const addMovieToCollection = async (
  collectionId: number,
  movieObj: Movie
): Promise<number> => {
  try {
    const database = await getDatabase();
    const tmdbId = movieObj.tmdb_id ?? movieObj.id;

    // Check if movie already exists in collection
    const existing = await database.getFirstAsync<CollectionItem>(
      'SELECT * FROM collection_items WHERE collection_id = ? AND tmdb_id = ?',
      [collectionId, tmdbId]
    );

    if (existing) {
      console.log('Movie already exists in collection');
      return existing.id;
    }

    const result = await database.runAsync(
      'INSERT INTO collection_items (collection_id, tmdb_id, title, poster_path) VALUES (?, ?, ?, ?)',
      [collectionId, tmdbId, movieObj.title, movieObj.poster_path]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error('addMovieToCollection error:', error);
    throw error;
  }
};

/**
 * Get all items in a collection
 */
export const getCollectionItems = async (
  collectionId: number
): Promise<CollectionItem[]> => {
  try {
    const database = await getDatabase();

    const items = await database.getAllAsync<CollectionItem>(
      'SELECT * FROM collection_items WHERE collection_id = ?',
      [collectionId]
    );

    return items || [];
  } catch (error) {
    console.error('getCollectionItems error:', error);
    return [];
  }
};

/**
 * Save or update a movie rating (to both local DB and server)
 */
export const saveRating = async (
  tmdbId: number,
  rating: number,
  review: string | null = null,
  title?: string,
  posterPath?: string
): Promise<void> => {
  try {
    const database = await getDatabase();

    // Save locally
    await database.runAsync(
      `INSERT INTO ratings (tmdb_id, rating, review) VALUES (?, ?, ?)
       ON CONFLICT(tmdb_id) DO UPDATE SET rating = excluded.rating, review = excluded.review`,
      [tmdbId, rating, review]
    );

    // Also save to server if logged in
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tmdb_id: tmdbId,
            rating,
            review,
            title,
            poster_path: posterPath,
          }),
        });
      }
    } catch (error) {
      console.error('Error syncing rating to server:', error);
      // Don't throw - local save succeeded
    }

    console.log(`Rating saved: Movie ${tmdbId} - ${rating} stars`);
  } catch (error) {
    console.error('saveRating error:', error);
    throw error;
  }
};

/**
 * Get rating for a specific movie
 */
export const getRating = async (tmdbId: number): Promise<Rating | null> => {
  try {
    const database = await getDatabase();

    const rating = await database.getFirstAsync<Rating>(
      'SELECT * FROM ratings WHERE tmdb_id = ?',
      [tmdbId]
    );

    return rating ?? null;
  } catch (error) {
    console.error('getRating error:', error);
    return null;
  }
};

/**
 * Get the tmdb_id of the most recent movie rated >= 4 stars
 */
export const getLastHighRatedMovie = async (): Promise<number | null> => {
  try {
    const database = await getDatabase();

    const result = await database.getFirstAsync<{ tmdb_id: number }>(
      'SELECT tmdb_id FROM ratings WHERE rating >= 4 ORDER BY rowid DESC LIMIT 1'
    );

    return result?.tmdb_id ?? null;
  } catch (error) {
    console.error('getLastHighRatedMovie error:', error);
    return null;
  }
};

/**
 * Delete a collection and all its items
 */
export const deleteCollection = async (collectionId: number): Promise<void> => {
  try {
    const database = await getDatabase();

    await database.runAsync('DELETE FROM collection_items WHERE collection_id = ?', [
      collectionId,
    ]);
    await database.runAsync('DELETE FROM collections WHERE id = ?', [collectionId]);
  } catch (error) {
    console.error('deleteCollection error:', error);
    throw error;
  }
};

/**
 * Remove a movie from a collection
 */
export const removeMovieFromCollection = async (
  collectionId: number,
  tmdbId: number
): Promise<void> => {
  try {
    const database = await getDatabase();

    await database.runAsync(
      'DELETE FROM collection_items WHERE collection_id = ? AND tmdb_id = ?',
      [collectionId, tmdbId]
    );
  } catch (error) {
    console.error('removeMovieFromCollection error:', error);
    throw error;
  }
};

export default {
  initDB,
  createCollection,
  getCollections,
  addMovieToCollection,
  getCollectionItems,
  saveRating,
  getRating,
  getLastHighRatedMovie,
  deleteCollection,
  removeMovieFromCollection,
};
