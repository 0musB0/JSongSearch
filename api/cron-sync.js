import { runSync } from '../scripts/sync-namuwiki.mjs';

export default async function handler(req, res) {
  // Allow GET and POST for cron triggers and dashboard triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Optional: Verify Vercel Cron authorization header if CRON_SECRET is configured
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  console.log('[Cron Sync] Triggering daily Namuwiki sync at 10:00 KST...');

  try {
    const meta = await runSync();
    return res.status(200).json({
      success: true,
      message: 'Daily Namuwiki sync executed successfully',
      data: meta
    });
  } catch (error) {
    console.error('[Cron Sync] Execution error:', error);
    return res.status(500).json({
      success: false,
      error: 'Daily Namuwiki sync failed',
      message: error.message
    });
  }
}
