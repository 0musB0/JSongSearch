import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let cachedSongs = null;
let cachedMeta = null;

export default async function handler(req, res) {
  const isMeta = req.query?.meta === 'true';

  try {
    let payload;
    if (isMeta) {
      if (cachedMeta === null) {
        const metaPath = path.join(rootDir, 'data', 'sync-meta.json');
        cachedMeta = await readFile(metaPath, 'utf8');
      }
      payload = cachedMeta;
    } else {
      if (cachedSongs === null) {
        const songsPath = path.join(rootDir, 'data', 'songs.json');
        cachedSongs = await readFile(songsPath, 'utf8');
      }
      payload = cachedSongs;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(payload);
  } catch (error) {
    console.error('[API /api/songs] Failed to load data:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Failed to load songs data' });
  }
}
