// Environment configuration for API endpoints
const config = {
  development: {
    apiUrl: 'http://localhost:3001/api'
  },
  production: {
    // Update this URL when you deploy the backend
    apiUrl: 'https://your-backend-url.herokuapp.com/api' // Example: Heroku deployment
  }
};

// Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const environment = isDevelopment ? 'development' : 'production';

export default config[environment];
