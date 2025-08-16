// Environment configuration for API endpoints
const config = {
  development: {
    apiUrl: 'http://localhost:3001/api'
  },
  production: {
    // This will be updated after Vercel deployment
    apiUrl: 'https://peregian-pickup.vercel.app/api' // Vercel deployment
  }
};

// Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const environment = isDevelopment ? 'development' : 'production';

export default config[environment];
