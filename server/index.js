const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run(name, email.toLowerCase(), passwordHash);

    // Generate token
    const token = jwt.sign(
      { userId: result.lastInsertRowid, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Get user data
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== COLLECTIONS ROUTES ====================

// Get user's collections
app.get('/api/collections', authenticateToken, (req, res) => {
  try {
    const collections = db.prepare(
      'SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.userId);

    res.json({ collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

// Create collection
app.post('/api/collections', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const result = db.prepare(
      'INSERT INTO collections (user_id, name) VALUES (?, ?)'
    ).run(req.user.userId, name);

    const collection = db.prepare('SELECT * FROM collections WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ success: true, collection });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// Delete collection
app.delete('/api/collections/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const collection = db.prepare(
      'SELECT * FROM collections WHERE id = ? AND user_id = ?'
    ).get(id, req.user.userId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.prepare('DELETE FROM collections WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Get collection items
app.get('/api/collections/:id/items', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const collection = db.prepare(
      'SELECT * FROM collections WHERE id = ? AND user_id = ?'
    ).get(id, req.user.userId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const items = db.prepare(
      'SELECT * FROM collection_items WHERE collection_id = ?'
    ).all(id);

    res.json({ items });
  } catch (error) {
    console.error('Get collection items error:', error);
    res.status(500).json({ error: 'Failed to get collection items' });
  }
});

// Add movie to collection
app.post('/api/collections/:id/items', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { tmdb_id, title, poster_path } = req.body;

    // Verify ownership
    const collection = db.prepare(
      'SELECT * FROM collections WHERE id = ? AND user_id = ?'
    ).get(id, req.user.userId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if already exists
    const existing = db.prepare(
      'SELECT * FROM collection_items WHERE collection_id = ? AND tmdb_id = ?'
    ).get(id, tmdb_id);

    if (existing) {
      return res.status(400).json({ error: 'Movie already in collection' });
    }

    const result = db.prepare(
      'INSERT INTO collection_items (collection_id, tmdb_id, title, poster_path) VALUES (?, ?, ?, ?)'
    ).run(id, tmdb_id, title, poster_path);

    res.status(201).json({ success: true, itemId: result.lastInsertRowid });
  } catch (error) {
    console.error('Add to collection error:', error);
    res.status(500).json({ error: 'Failed to add movie to collection' });
  }
});

// Remove movie from collection
app.delete('/api/collections/:collectionId/items/:itemId', authenticateToken, (req, res) => {
  try {
    const { collectionId, itemId } = req.params;

    // Verify ownership
    const collection = db.prepare(
      'SELECT * FROM collections WHERE id = ? AND user_id = ?'
    ).get(collectionId, req.user.userId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.prepare('DELETE FROM collection_items WHERE id = ? AND collection_id = ?')
      .run(itemId, collectionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove from collection error:', error);
    res.status(500).json({ error: 'Failed to remove movie from collection' });
  }
});

// ==================== RATINGS ROUTES ====================

// Get user's ratings
app.get('/api/ratings', authenticateToken, (req, res) => {
  try {
    const ratings = db.prepare(
      'SELECT * FROM ratings WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.userId);

    res.json({ ratings });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Save/update rating
app.post('/api/ratings', authenticateToken, (req, res) => {
  try {
    const { tmdb_id, rating, review, title, poster_path } = req.body;

    if (!tmdb_id || rating === undefined) {
      return res.status(400).json({ error: 'Movie ID and rating are required' });
    }

    // Check if rating exists
    const existing = db.prepare(
      'SELECT * FROM ratings WHERE user_id = ? AND tmdb_id = ?'
    ).get(req.user.userId, tmdb_id);

    if (existing) {
      // Update existing rating
      db.prepare(`
        UPDATE ratings 
        SET rating = ?, review = ?, title = COALESCE(?, title), poster_path = COALESCE(?, poster_path)
        WHERE user_id = ? AND tmdb_id = ?
      `).run(rating, review || null, title, poster_path, req.user.userId, tmdb_id);
    } else {
      // Insert new rating
      db.prepare(`
        INSERT INTO ratings (user_id, tmdb_id, rating, review, title, poster_path)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(req.user.userId, tmdb_id, rating, review || null, title || null, poster_path || null);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Save rating error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Get rating for a specific movie
app.get('/api/ratings/:tmdbId', authenticateToken, (req, res) => {
  try {
    const { tmdbId } = req.params;

    const rating = db.prepare(
      'SELECT * FROM ratings WHERE user_id = ? AND tmdb_id = ?'
    ).get(req.user.userId, tmdbId);

    res.json({ rating: rating || null });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ error: 'Failed to get rating' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`For mobile devices on same network, use your computer's IP address`);
});
