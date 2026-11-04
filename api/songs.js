import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export default async function handler(req, res) {
  try {
    const songsPath = path.join(rootDir, 'data', 'songs.json');
    const metaPath = path.join(rootDir, 'data', 'sync-meta.json');

    const [songsData, metaData] = await Promise.all([
      readFile(songsPath, 'utf8').catch(() => '[]'),
      readFile(metaPath, 'utf8').catch(() => '{}')
    ]);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.query?.meta === 'true') {
      return res.status(200).send(metaData);
    }

    return res.status(200).send(songsData);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to load songs data',
      message: error.message
    });
  }
}
