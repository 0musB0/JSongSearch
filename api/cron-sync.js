import crypto from 'node:crypto';

function isAuthorized(authHeader, secret) {
  if (!secret || typeof authHeader !== 'string') return false;
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const actual = Buffer.from(authHeader, 'utf8');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAuthorized(req.headers['authorization'], process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  // Vercel serverless filesystem is read-only (EROFS); sync must be run locally via `npm run sync`.
  return res.status(501).json({
    success: false,
    error: 'Serverless sync is disabled',
    message: 'Run `npm run sync` locally and commit data/songs.json instead.'
  });
}
