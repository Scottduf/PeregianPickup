const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Alternative dev port
    'https://scottduf.github.io'  // GitHub Pages
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'leaderboard.db');
const db = new sqlite3.Database(dbPath);

// Create leaderboard table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API Routes

// Get top 10 scores
app.get('/api/scores', (req, res) => {
  db.all(
    "SELECT player_name, score, timestamp FROM scores ORDER BY score DESC LIMIT 10",
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

// Submit a new score
app.post('/api/scores', (req, res) => {
  const { player_name, score } = req.body;
  
  // Validate input
  if (!player_name || typeof score !== 'number') {
    res.status(400).json({ error: 'Invalid input. Player name and score are required.' });
    return;
  }
  
  // Sanitize player name (max 20 characters, no HTML)
  const sanitizedName = player_name.substring(0, 20).replace(/[<>]/g, '');
  
  db.run(
    "INSERT INTO scores (player_name, score) VALUES (?, ?)",
    [sanitizedName, score],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to save score' });
        return;
      }
      
      // Return the new score with its ID
      res.json({
        id: this.lastID,
        player_name: sanitizedName,
        score: score,
        message: 'Score saved successfully!'
      });
    }
  );
});

// Get player's personal best
app.get('/api/scores/player/:name', (req, res) => {
  const playerName = req.params.name;
  
  db.get(
    "SELECT MAX(score) as best_score, COUNT(*) as games_played FROM scores WHERE player_name = ?",
    [playerName],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json({
        player_name: playerName,
        best_score: row.best_score || 0,
        games_played: row.games_played
      });
    }
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Peregian Pickup Backend Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 API endpoints:`);
  console.log(`   GET  /api/scores - Get top 10 scores`);
  console.log(`   POST /api/scores - Submit new score`);
  console.log(`   GET  /api/scores/player/:name - Get player stats`);
  console.log(`   GET  /api/health - Health check`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📚 Database connection closed.');
    }
    process.exit(0);
  });
});
