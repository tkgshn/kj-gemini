/**
 * Document AI Health Check API
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'ok',
    environment: 'vercel',
    timestamp: new Date().toISOString()
  });
}