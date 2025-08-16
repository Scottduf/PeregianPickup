# Deploying Peregian Pickup Backend

## Quick Deployment Options

### Option 1: Railway (Recommended - Free)

1. Go to [Railway.app](https://railway.app) and sign up
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account and select the `PeregianPickup` repository
4. In Railway dashboard:
   - Click "Add Service" → "GitHub Repo"
   - Select your repository
   - Set the **Root Directory** to `backend`
   - Railway will auto-detect it's a Node.js app
5. Add environment variables (if needed):
   - `PORT` → `3001` (optional, Railway sets this automatically)
6. Deploy!

Your backend URL will be something like: `https://your-app-name.up.railway.app`

### Option 2: Render (Free)

1. Go to [Render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect GitHub and select your repository
4. Configure:
   - **Name**: `peregian-pickup-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Deploy!

### Option 3: Heroku (Paid)

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create peregian-pickup-backend`
4. Set buildpack: `heroku buildpacks:set heroku/nodejs`
5. Push: `git subtree push --prefix backend heroku main`

## After Deployment

1. Copy your backend URL (e.g., `https://your-app.railway.app`)
2. Update `src/config.js` in your frontend:
   ```javascript
   production: {
     apiUrl: 'https://your-app.railway.app/api'  // Your actual URL
   }
   ```
3. Rebuild and redeploy your frontend
4. Test the game - scores should now persist across devices!

## Testing Your Deployed Backend

Visit these URLs to test:
- `https://your-app.railway.app/api/health` - Should return `{"status":"OK"}`
- `https://your-app.railway.app/api/scores` - Should return empty array `[]`

## Database

The SQLite database will be created automatically on first run. Note that on some platforms like Heroku, the filesystem is ephemeral, so consider upgrading to PostgreSQL for production use.

## Environment Variables

For production, you might want to set:
- `NODE_ENV=production`
- `PORT` (usually set automatically by the platform)
- Database connection string (if using PostgreSQL instead of SQLite)
