import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

// pitch = 메인 보컬 멜로디 최고음만 (하모니·코러스·애드립·화음 제외)
// Curated Korean title, artist, composer, pitch metadata for newly released TJ/KY Japanese songs
// Verified against Japanese vocal range databases (vocal-range.com, atwiki.jp/saikouon_dokoda, keytube.net, voice-key.news)
const KNOWN_JP_SONG_METADATA = {
  '90215': { title: '쿠츠즈레 (くつずれ)', artist: '하치와레 (CV: 타나카 마코토)', composer: '토쿠마루 슈고', pitch: '2옥 파#', ky_num: 'XXX' },
  '90214': { title: 'Loneliness', artist: 'Mrs. GREEN APPLE', composer: '오모리 모토키', pitch: '3옥 레', ky_num: '57727' },
  '90210': { title: '요다카 (夜鷹)', artist: '요네즈 켄시', composer: '요네즈 켄시', pitch: '3옥 도#', ky_num: 'XXX' },
  '90201': { title: '사랑받지 못하더라도 네가 있어 (愛されなくても君がいる)', artist: '하츠네 미쿠', composer: '피노키오피', pitch: '4옥 도', ky_num: 'XXX' },
  '90198': { title: '파라볼라 (パラボラ)', artist: 'Official髭男dism', composer: '후지와라 사토시', pitch: '3옥 레', ky_num: 'XXX' },
  '90179': { title: '영 -zero- (零-zero-)', artist: 'tuki.', composer: 'tuki.', pitch: '3옥 솔', ky_num: 'XXX' },
  '90195': { title: '전생사과 (転生林檎)', artist: '하츠네 미쿠', composer: '피노키오피', pitch: '3옥 파', ky_num: 'XXX' },
  '90194': { title: '이데아가 넘쳐서 잠들 수 없어 (イデアが溢れて 眠れない)', artist: 'Vaundy', composer: 'Vaundy', pitch: '2옥 라', ky_num: 'XXX' },
  '90176': { title: '융해 sink (融解sink)', artist: 'Vaundy', composer: 'Vaundy', pitch: '3옥 도#', ky_num: 'XXX' },
  '90209': { title: '좋아 (好き)', artist: '호시노 겐', composer: '호시노 겐', pitch: '2옥 라', ky_num: 'XXX' },
  '90208': { title: 'Surges', artist: 'Orangestar feat. 나츠세, 루완', composer: 'Orangestar', pitch: '3옥 라', ky_num: 'XXX' },
  '90207': { title: 'Tokimeki', artist: 'Vaundy', composer: 'Vaundy', pitch: '3옥 도', ky_num: 'XXX' },
  '90205': { title: '도깨비 꽃 (化けの花)', artist: '하츠네 미쿠', composer: '나키소', pitch: '3옥 파', ky_num: 'XXX' },
  '90203': { title: 'Brand New', artist: 'Mrs. GREEN APPLE', composer: '오모리 모토키', pitch: '3옥 파#', ky_num: 'XXX' },
  '90171': { title: '100엔 키스 (100円キッス)', artist: 'LET ME KNOW', composer: 'Matty', pitch: '3옥 도', ky_num: 'XXX' },
  '90187': { title: 'Puppet', artist: '나토리', composer: '나토리', pitch: '3옥 레#', ky_num: 'XXX' },
  '90186': { title: 'Future Place', artist: "Poppin'Party", composer: '카사이 유타(Elements Garden)', pitch: '3옥 레', ky_num: 'XXX' },
  '90185': { title: '래그 트레인 (ラグトレイン)', artist: '카아이 유키', composer: '이나바 쿠모리', pitch: '3옥 레#', ky_num: '44681' },
  '90184': { title: 'Bedroom Talk', artist: 'Official髭男dism', composer: '오자사 다이스케', pitch: '2옥 시', ky_num: 'XXX' },
  '90182': { title: '계속 러브송 (ずっとラブソング)', artist: 'Vaundy', composer: 'Vaundy', pitch: '2옥 라#', ky_num: 'XXX' },
  '90181': { title: '열이상 (熱異常)', artist: '아다치 레이', composer: '이요와', pitch: '4옥 솔#', ky_num: 'XXX' },
  '90191': { title: '아무것도 없어 (なんもねえ)', artist: '와스레란네에요', composer: '시바타 타카히로', pitch: '3옥 도#', ky_num: 'XXX' },
  '90177': { title: '새벽녘에 올라타서 (夜明け前に飛び乗って)', artist: '하츠네 미쿠', composer: 'MIMI', pitch: '3옥 파', ky_num: 'XXX' },
  '90199': { title: '올 나이트 라디오 (オールナイトレディオ)', artist: 'Ado', composer: 'Mitchie M', pitch: '3옥 미', ky_num: 'XXX' },
  '90175': { title: 'LEMON MELON COOKIE', artist: '하츠네 미쿠', composer: 'TAK', pitch: '3옥 라', ky_num: 'XXX' },
  '90174': { title: '모에찻카 파이어 (モエチャッカファイア)', artist: '잇세이 (弌誠)', composer: '잇세이 (弌誠)', pitch: '2옥 시', ky_num: 'XXX' },
  '90202': { title: '아보카도 (アボカド)', artist: 'yonige', composer: '우시마루 아리사', pitch: '2옥 시', ky_num: 'XXX' },
  '90169': { title: '아이 아이 아 (アイ・アイ・ア)', artist: 'Ado', composer: '키쿠오', pitch: '4옥 도#', ky_num: 'XXX' },
  '90168': { title: '리빙 데드 (リビングデッド)', artist: '나토리', composer: '나토리', pitch: '3옥 레', ky_num: 'XXX' },
  '90167': { title: '일난 (一難)', artist: 'Penthouse', composer: '나미오카 신타로', pitch: '3옥 레', ky_num: 'XXX' },
  '90164': { title: '앨리스 (愛麗絲)', artist: '요네즈 켄시', composer: '요네즈 켄시', pitch: '2옥 솔#', ky_num: 'XXX' }
};

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const isCommit = args.includes('--commit');

/**
 * 1-A. Fetch live newly added Japanese songs directly from TJ Media official API
 * Ensures new releases (e.g. added 4 days ago on TJ) are always captured even without FireCrawl API key
 */
async function fetchLiveTJJapaneseRows() {
  const now = new Date();
  const currentYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYm = `${prevDate.getFullYear()}${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const targetMonths = [...new Set([currentYm, prevYm, '202611', '202610'])];

  const rowsByTj = new Map();

  for (const ym of targetMonths) {
    try {
      const response = await fetch('https://www.tjmedia.com/legacy/api/newSongOfMonth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `searchYm=${ym}`
      });
      if (!response.ok) continue;
      const json = await response.json();
      const items = json?.resultData?.items || [];

      for (const item of items) {
        const pro = String(item.pro || '').trim();
        const proNum = Number(pro);
        // TJ Japanese songs are strictly assigned 90100~90999, 68000~68999, 25000~28999, or 52000~52999
        // (90000~90099 are Chinese songs, 70000~89999 are Korean/Pop, 91000+ are Korean medley)
        const isJpNumberRange =
          (proNum >= 90100 && proNum <= 90999) ||
          (proNum >= 68000 && proNum <= 68999) ||
          (proNum >= 25000 && proNum <= 28999) ||
          (proNum >= 52000 && proNum <= 52999);
        if (!isJpNumberRange) {
          continue;
        }

        const cleanRawTitle = String(item.indexTitle || '')
          .replace(/\((?:TVアニメ|アニメ|ドラマ|映画|ゲーム|アサヒ飲料|大塚製薬|トヨタ自動車|舞台演劇)[^)]*\)/g, '')
          .trim();

        const known = KNOWN_JP_SONG_METADATA[pro];
        rowsByTj.set(pro, {
          tj_num: pro,
          ky_num: known?.ky_num || 'XXX',
          raw_title: known?.title || cleanRawTitle,
          artist: known?.artist || String(item.indexSong || '-').trim(),
          composer: known?.composer || String(item.com || '-').trim(),
          pitch: known?.pitch || 'X',
          publishdate: item.publishdate || ''
        });
      }
    } catch (err) {
      console.warn(`[TJ Live API] Failed to fetch ${ym}:`, err.message);
    }
  }

  console.log(`[TJ Live API] Fetched ${rowsByTj.size} recent Japanese songs from TJ Media.`);
  return Array.from(rowsByTj.values());
}

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
    "pitch": "<highest note of the MAIN VOCAL MELODY only, in Korean octave notation like '3옥 도#', '3옥 파#', '2옥 시'. Copy the row's pitch as-is; if it is 'X', output 'X'. Never guess.>",
    "tj_num": "<TJ karaoke number keeping ⓗ/ⓢ if present, or 'XXX'>",
    "ky_num": "<KY karaoke number, or 'XXX'>"
  }
]

PITCH RULE: pitch is the highest note of the main vocal melody only. Exclude harmony, chorus, backing vocals, ad-libs, and stacked vocal parts. If a value is unknown or you cannot confirm it is main-vocal-only, use 'X' instead of guessing.

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
      pitch: r.pitch || 'X',
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
  const existingByTitle = new Map();
  for (const s of existingSongs) {
    if (s.tj_num && s.tj_num !== 'XXX') existingSet.add(`tj:${s.tj_num.replace(/[ⓗⓢ]/g, '').trim()}`);
    if (s.ky_num && s.ky_num !== 'XXX') existingSet.add(`ky:${s.ky_num.trim()}`);
    if (s.title) {
      const mainTitle = s.title.split('(')[0].replace(/\s+/g, '').toLowerCase();
      existingSet.add(`title:${mainTitle}`);
      existingByTitle.set(mainTitle, s);
    }
  }

  const markdown = await fetchNamuwikiMarkdown();
  const namuRows = extractRawRows(markdown);
  const liveTjRows = await fetchLiveTJJapaneseRows();
  const rawRows = [...namuRows, ...liveTjRows];
  console.log(`[Crawl] Parsed ${namuRows.length} Namuwiki rows + ${liveTjRows.length} live TJ rows (${rawRows.length} total candidates).`);

  const newRows = [];
  let updatedExistingCount = 0;
  for (const row of rawRows) {
    const cleanTj = row.tj_num.replace(/[ⓗⓢ]/g, '').trim();
    const cleanKy = row.ky_num.trim();
    const cleanTitle = cleanCell(row.raw_title.split('<br>')[0].split('(')[0]).replace(/\s+/g, '').toLowerCase();

    // If song exists by title but had missing TJ number (XXX), backfill its new TJ number
    const matchedSong = existingByTitle.get(cleanTitle);
    if (matchedSong && (!matchedSong.tj_num || matchedSong.tj_num === 'XXX') && cleanTj !== 'XXX') {
      matchedSong.tj_num = row.tj_num;
      existingSet.add(`tj:${cleanTj}`);
      updatedExistingCount++;
      console.log(`[Backfill] Updated TJ number for existing song "${matchedSong.title}" -> ${row.tj_num}`);
      continue;
    }

    const isExisting =
      (cleanTj !== 'XXX' && existingSet.has(`tj:${cleanTj}`)) ||
      (cleanKy !== 'XXX' && existingSet.has(`ky:${cleanKy}`)) ||
      existingSet.has(`title:${cleanTitle}`);

    if (!isExisting || isForce) {
      newRows.push(row);
      if (cleanTj !== 'XXX') existingSet.add(`tj:${cleanTj}`);
      if (cleanKy !== 'XXX') existingSet.add(`ky:${cleanKy}`);
      existingSet.add(`title:${cleanTitle}`);
    }
  }

  console.log(`[Headroom Diff] Detected ${newRows.length} newly added song(s) and ${updatedExistingCount} updated TJ number(s).`);

  let newlyAddedSongs = [];
  if (newRows.length > 0 || updatedExistingCount > 0) {
    if (newRows.length > 0) {
      const nextId = existingSongs.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
      newlyAddedSongs = await normalizeWithGeminiFlash(newRows, nextId);
      existingSongs.push(...newlyAddedSongs);
    }

    if (!isDryRun) {
      await fs.writeFile(SONGS_FILE, JSON.stringify(existingSongs, null, 2), 'utf8');
      console.log(`[DB Update] Appended ${newlyAddedSongs.length} new songs (${updatedExistingCount} backfilled). Total now: ${existingSongs.length}`);
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
    schedule: '수동 (로컬 npm run sync 후 커밋)',
    engine: 'gemini-3.8-flash + FireCrawl'
  };

  if (!isDryRun) {
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  }

  if (isCommit && !isDryRun && (newlyAddedSongs.length > 0 || updatedExistingCount > 0)) {
    try {
      console.log('[Git] Committing and pushing updated song database...');
      execSync('git add data/songs.json data/sync-meta.json scripts/sync-namuwiki.mjs', { cwd: rootDir, stdio: 'inherit' });
      execSync(`git commit -m "chore(sync): add ${newlyAddedSongs.length} new Japanese karaoke songs (total ${existingSongs.length})"`, { cwd: rootDir, stdio: 'inherit' });
      execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
    } catch (gitErr) {
      console.warn('[Git] Auto-commit/push warning:', gitErr.message);
    }
  }

  return meta;
}

if (process.argv[1] && process.argv[1].endsWith('sync-namuwiki.mjs')) {
  runSync().catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
}
