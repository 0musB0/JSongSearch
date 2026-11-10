/**
 * /api/preview?title=&artist=&composer= -> { found, previewUrl, trackName, artistName }
 * Official 30s audio preview via iTunes Search (no key). Not full-track playback.
 */
import { parseSearchQueries } from './lyrics.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  const { title = '', artist = '', composer = '' } = req.query || {};
  if (!title) return res.status(400).json({ found: false, error: 'Missing title parameter' });
  try {
    for (const q of parseSearchQueries(title, artist, composer).slice(0, 4)) {
      const r = await fetch(`https://itunes.apple.com/search?country=jp&media=music&entity=song&limit=1&term=${encodeURIComponent(q)}`);
      if (!r.ok) continue;
      const t = (await r.json())?.results?.[0];
      if (t?.previewUrl) {
        return res.status(200).json({ found: true, previewUrl: t.previewUrl, trackName: t.trackName, artistName: t.artistName });
      }
    }
    return res.status(200).json({ found: false });
  } catch (err) {
    return res.status(500).json({ found: false, error: String(err?.message || err) });
  }
}
