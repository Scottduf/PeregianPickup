const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
let db;

function getDatabase() {
  if (!db) {
    // For Vercel, we'll use a temporary database that gets recreated on each cold start
    // In production, you'd want to use a persistent database like PostgreSQL
    db = new sqlite3.Database(':memory:');
    
    // Create table
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Add some sample data for demo
      db.run("INSERT INTO scores (player_name, score) VALUES (?, ?)", ["Demo Player", 1000]);
      db.run("INSERT INTO scores (player_name, score) VALUES (?, ?)", ["Test User", 850]);
    });
  }
  return db;
}

// CORS headers for all responses
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCORSHeaders(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const database = getDatabase();
  
  if (req.method === 'GET') {
    // Get top 10 scores
    database.all(
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
  } else if (req.method === 'POST') {
    // Submit new score
    const { player_name, score } = req.body;
    
    // Validate input
    if (!player_name || typeof score !== 'number') {
      res.status(400).json({ error: 'Invalid input. Player name and score are required.' });
      return;
    }
    
    // Sanitize player name
    const sanitizedName = player_name.substring(0, 20).replace(/[<>]/g, '');
    
    database.run(
      "INSERT INTO scores (player_name, score) VALUES (?, ?)",
      [sanitizedName, score],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to save score' });
          return;
        }
        
        res.json({
          id: this.lastID,
          player_name: sanitizedName,
          score: score,
          message: 'Score saved successfully!'
        });
      }
    );
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
