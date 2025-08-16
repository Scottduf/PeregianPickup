# Peregian Pickup Backend

This is the backend server for the Peregian Pickup game that handles the persistent leaderboard.

## Features

- SQLite database for storing player scores
- RESTful API for score management
- CORS enabled for frontend integration
- Input validation and sanitization
- Personal best tracking

## API Endpoints

### GET /api/scores
Returns the top 10 highest scores.

**Response:**
```json
[
  {
    "player_name": "PlayerName",
    "score": 1500,
    "timestamp": "2025-08-16T12:00:00.000Z"
  }
]
```

### POST /api/scores
Submit a new score.

**Request Body:**
```json
{
  "player_name": "PlayerName",
  "score": 1500
}
```

**Response:**
```json
{
  "id": 123,
  "player_name": "PlayerName",
  "score": 1500,
  "message": "Score saved successfully!"
}
```

### GET /api/scores/player/:name
Get player statistics.

**Response:**
```json
{
  "player_name": "PlayerName",
  "best_score": 1500,
  "games_played": 5
}
```

### GET /api/health
Health check endpoint.

## Installation

```bash
cd backend
npm install
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on port 3001 by default.

## Database

Uses SQLite database stored in `leaderboard.db`. The database will be created automatically on first run.

## Deployment

This backend can be deployed to:
- Heroku
- Railway
- Render
- Vercel (with serverless functions)
- Any VPS with Node.js support
