import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SONGS_FILE = path.join(rootDir, 'data', 'songs.json');
const META_FILE = path.join(rootDir, 'data', 'sync-meta.json');

// Namuwiki Japanese Karaoke Song List Pages (General J-POP, Artists, Anime, Subculture)
const NAMUWIKI_JAPANESE_URLS = [
  'https://namu.wiki/w/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/YOASOBI/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%9A%94%EB%84%A4%EC%A6%88%20%EC%BC%84%EC%8B%9C/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/Official%E9%AB%AD%E7%94%B7dism/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/Mrs.%20GREEN%20APPLE/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%95%84%EC%9D%B4%EB%AC%AD/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%9C%A0%EC%9A%B0%EB%A6%AC(%EA%B0%80%EC%88%98)/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/Vaundy/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%95%A0%EB%8B%88%EB%A9%94%EC%9D%B4%EC%85%98%20%EC%9D%8C%EC%95%85/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%9A%B0%ED%83%80%EC%9D%B4%ED%85%8C%20%EC%98%A4%EB%A6%AC%EC%A7%80%EB%84%90%20%EA%B3%A1/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D',
  'https://namu.wiki/w/%EC%9D%8C%EC%84%B1%20%ED%95%A9%EC%84%B1%20%EC%97%94%EC%A7%84%20%EC%98%A4%EB%A6%AC%EC%A7%80%EB%84%90%20%EA%B3%A1/%EB%85%B8%EB%9E%98%EB%B0%A9%20%EC%88%98%EB%A1%9D%20%EB%AA%A9%EB%A1%9D'
];

const LOCAL_FALLBACK_MD = 'C:\\Users\\LG\\.gemini\\antigravity\\brain\\7db566f1-df77-497b-8fee-239f8203917b\\scratch\\namuwiki_vocaloid_karaoke.md';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const isCommit = args.includes('--commit');

/**
 * 1. Fetch Namuwiki Japanese Karaoke markdown via FireCrawl or Fallbacks
 */
async function fetchNamuwikiMarkdown() {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (firecrawlKey) {
    console.log('[FireCrawl] Scraping Namuwiki Japanese karaoke pages with FireCrawl API...');
    const chunks = [];
    for (const url of NAMUWIKI_JAPANESE_URLS) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlKey}`
          },
          body: JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true
          })
        });

        if (response.ok) {
          const json = await response.json();
          const md = json?.data?.markdown || json?.markdown;
          if (md && md.length > 300) {
            chunks.push(md);
          }
        }
      } catch (err) {
        console.warn(`[FireCrawl] Request failed for ${url}:`, err.message);
      }
    }
    if (chunks.length > 0) {
      return chunks.join('\n\n');
    }
  } else {
    console.log('[FireCrawl] No FIRECRAWL_API_KEY detected in env. Using local/direct fallback.');
  }

  if (existsSync(LOCAL_FALLBACK_MD)) {
    return readFileSync(LOCAL_FALLBACK_MD, 'utf8');
  }

  return '';
}

function cleanCell(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\\?\[?\d+\\?\]?\]\([^)]+\)/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/<(?!\s*br\s*\/?)[^>]+>/gi, '')
    .trim();
}

/**
 * 2. Headroom Compression & Local Row Parsing:
 * Extracts table rows and diffs against existing songs to minimize LLM token usage
 */
function extractRawRows(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || line.includes('---') || line.includes('반주곡 기호 설명')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 4) {
      const headerCheck = cells.join(' ');
      if (headerCheck.includes('곡 제목') || headerCheck.includes('TJ미디어') || headerCheck.includes('금영엔터테인먼트')) {
        continue;
      }

      const tjNum = cleanCell(cells[0]);
      const kyNum = cleanCell(cells[1]);
      const rawTitle = cells[2];
      const rawArtist = cleanCell(cells[3]);
      const rawComposer = cells[4] ? cleanCell(cells[4]) : rawArtist;

      // Check that TJ or KY looks like a song number or XXX
      const isValidNum = /^(\d{4,6}[ⓗⓢ]?|XXX|-)$/.test(tjNum) || /^(\d{4,6}[ⓗⓢ]?|XXX|-)$/.test(kyNum);
      if (isValidNum && cleanCell(rawTitle)) {
        rows.push({
          tj_num: tjNum || 'XXX',
          ky_num: kyNum || 'XXX',
          raw_title: rawTitle,
          artist: rawArtist || '-',
          composer: rawComposer || '-'
        });
      }
    }
  }

  return rows;
}

/**
 * 3. Gemini 3.8 Flash Processing:
 * Uses @google/genai interactions.create with model gemini-3.8-flash to normalize song data
 * Strictly outputs the 7-field DB schema: id, title, artist, composer, pitch, tj_num, ky_num
 */
async function normalizeWithGeminiFlash(newRows, startingId) {
  if (newRows.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not set. Using rule-based fallback normalization.');
    return fallbackNormalize(newRows, startingId);
  }

  const client = new GoogleGenAI({});
  console.log(`[Gemini 3.8 Flash] Sending ${newRows.length} compressed Japanese song rows to gemini-3.8-flash...`);

  const prompt = `You are a Japanese Karaoke song database normalizer.
Given the following raw Namuwiki table rows:
${JSON.stringify(newRows, null, 2)}

Normalize every row into a JSON array of song objects matching this EXACT 7-field schema (do NOT add any extra fields):
[
  {
    "id": <number starting from ${startingId}>,
    "title": "<Korean title with Japanese original in parentheses if available, e.g. '아이돌 (アイドル)' or 'Lemon'>",
    "artist": "<singer/band name, e.g. 'YOASOBI', '요네즈 켄시'>",
    "composer": "<composer name, e.g. 'Ayase', '요네즈 켄시'>",
    "pitch": "<highest pitch in Korean octave notation like '3옥 도#', '3옥 파#', '2옥 시', or 'X'>",
    "tj_num": "<TJ karaoke number keeping ⓗ/ⓢ if present, or 'XXX'>",
    "ky_num": "<KY karaoke number, or 'XXX'>"
  }
]

CRITICAL: Return ONLY a valid JSON array. No markdown codeblocks, no extra fields.`;

  try {
    const interaction = await client.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt
    });

    const output = interaction.output_text?.trim() || '';
    const cleanJson = output.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    return parsed.map((item, idx) => ({
      id: startingId + idx,
      title: String(item.title || '').trim(),
      artist: String(item.artist || '-').trim(),
      composer: String(item.composer || '-').trim(),
      pitch: String(item.pitch || 'X').trim(),
      tj_num: String(item.tj_num || 'XXX').trim(),
      ky_num: String(item.ky_num || 'XXX').trim()
    }));
  } catch (err) {
    console.error('[Gemini 3.8 Flash] Error during interaction:', err.message);
    return fallbackNormalize(newRows, startingId);
  }
}

function fallbackNormalize(rows, startingId) {
  let id = startingId;
  return rows.map(r => {
    const rawTitle = r.raw_title || '';
    let titleKo = cleanCell(rawTitle);
    let titleJa = '';

    if (rawTitle.includes('<br>')) {
      const parts = rawTitle.split('<br>');
      titleKo = cleanCell(parts[0]);
      titleJa = cleanCell(parts.slice(1).join(' ')).replace(/^\(|\)$/g, '').trim();
    }

    const fullTitle = titleJa ? `${titleKo} (${titleJa})` : titleKo;

    return {
      id: id++,
      title: fullTitle,
      artist: r.artist || '-',
      composer: r.composer || '-',
      pitch: 'X',
      tj_num: r.tj_num || 'XXX',
      ky_num: r.ky_num || 'XXX'
    };
  });
}

export async function runSync() {
  console.log('====================================================');
  console.log('🎤 Starting Namuwiki Japanese Karaoke Daily Sync');
  console.log(`📅 Execution time: ${new Date().toISOString()}`);
  console.log('====================================================');

  let existingSongs = [];
  if (existsSync(SONGS_FILE)) {
    try {
      const content = await fs.readFile(SONGS_FILE, 'utf8');
      existingSongs = JSON.parse(content);
      console.log(`[Existing DB] Loaded ${existingSongs.length} Japanese songs from data/songs.json`);
    } catch (err) {
      console.warn('[Existing DB] Error reading data/songs.json:', err.message);
    }
  }

  const existingSet = new Set();
  for (const s of existingSongs) {
    if (s.tj_num && s.tj_num !== 'XXX') existingSet.add(`tj:${s.tj_num.replace(/[ⓗⓢ]/g, '').trim()}`);
    if (s.ky_num && s.ky_num !== 'XXX') existingSet.add(`ky:${s.ky_num.trim()}`);
    if (s.title) {
      const mainTitle = s.title.split('(')[0].replace(/\s+/g, '').toLowerCase();
      existingSet.add(`title:${mainTitle}`);
    }
  }

  const markdown = await fetchNamuwikiMarkdown();
  const rawRows = extractRawRows(markdown);
  console.log(`[Crawl] Parsed ${rawRows.length} candidate song rows from Namuwiki.`);

  const newRows = [];
  for (const row of rawRows) {
    const cleanTj = row.tj_num.replace(/[ⓗⓢ]/g, '').trim();
    const cleanKy = row.ky_num.trim();
    const cleanTitle = cleanCell(row.raw_title.split('<br>')[0]).replace(/\s+/g, '').toLowerCase();

    const isExisting =
      (cleanTj !== 'XXX' && existingSet.has(`tj:${cleanTj}`)) ||
      (cleanKy !== 'XXX' && existingSet.has(`ky:${cleanKy}`)) ||
      existingSet.has(`title:${cleanTitle}`);

    if (!isExisting || isForce) {
      newRows.push(row);
    }
  }

  console.log(`[Headroom Diff] Detected ${newRows.length} newly added song(s).`);

  let newlyAddedSongs = [];
  if (newRows.length > 0) {
    const nextId = existingSongs.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
    newlyAddedSongs = await normalizeWithGeminiFlash(newRows, nextId);

    if (!isDryRun && newlyAddedSongs.length > 0) {
      existingSongs.push(...newlyAddedSongs);
      await fs.writeFile(SONGS_FILE, JSON.stringify(existingSongs, null, 2), 'utf8');
      console.log(`[DB Update] Appended ${newlyAddedSongs.length} new songs. Total now: ${existingSongs.length}`);
    }
  } else {
    console.log('[Headroom Diff] All songs are up to date! Zero LLM tokens wasted.');
  }

  const meta = {
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    totalSongs: existingSongs.length,
    newlyAddedCount: newlyAddedSongs.length,
    newlyAddedSongs: newlyAddedSongs.slice(0, 10),
    sources: NAMUWIKI_JAPANESE_URLS,
    schedule: '매일 10:00 KST (CRON_TZ=Asia/Seoul 0 10 * * *)',
    engine: 'gemini-3.8-flash + FireCrawl'
  };

  if (!isDryRun) {
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  }

  return meta;
}

if (process.argv[1] && process.argv[1].endsWith('sync-namuwiki.mjs')) {
  runSync().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
}
