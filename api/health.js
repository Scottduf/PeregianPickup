module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      message: 'Peregian Pickup API is running on Vercel!'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
