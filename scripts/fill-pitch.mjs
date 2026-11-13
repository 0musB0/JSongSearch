// pitch 가 "X" 인 곡의 최고음을 vocal-range.com 에서 찾아 data/songs.json 에 채운다.
// 실행: FIRECRAWL_API_KEY=... node scripts/fill-pitch.mjs [--max-credits=300] [--dry]
// 곡당 검색 1회(약 2 크레딧). 결과는 docs/pitch-fill-cache.json 에 저장되어 중단 후 이어 실행된다.
// 출처에서 값이 확인된 곡만 채우고, 못 찾으면 X 유지. 보고서는 docs/pitch-fill-report.md.
import fs from 'node:fs';
import { parseRange, peakOf, jpTitle } from './audit-pitch.mjs';

const CREDITS_PER_SONG = 2;
const CACHE = 'docs/pitch-fill-cache.json';
const REPORT = 'docs/pitch-fill-report.md';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(query, key) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, limit: 3 })
    });
    if (res.status === 429 && attempt < 6) { await sleep(2000 * 2 ** attempt); continue; } // 지수 백오프
    if (!res.ok) throw new Error(`firecrawl ${res.status}`);
    return (await res.json()).data?.web || [];
  }
}

export async function fillPitch({ key, maxCredits = 300, dry = false } = {}) {
  const songs = JSON.parse(fs.readFileSync('data/songs.json', 'utf8'));
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const targets = songs.filter(s => s.pitch === 'X');
  const todo = targets.filter(s => !cache[s.id] || cache[s.id].status === 'error');
  const budget = Math.min(todo.length, Math.floor(maxCredits / CREDITS_PER_SONG));
  console.log(`대상 ${targets.length}곡, 조회 필요 ${todo.length}곡, 예상 ${todo.length * CREDITS_PER_SONG} 크레딧 (상한 ${maxCredits} → 최대 ${budget}곡)`);
  if (dry) return;
  if (budget && !key) throw new Error('FIRECRAWL_API_KEY 필요');

  for (const s of todo.slice(0, budget)) {
    const jp = jpTitle(s);
    try {
      const hits = await search(`site:vocal-range.com 「${jp}」 ${s.artist} 音域 地声最高音`, key);
      const hit = hits.find(h => h.url.includes('vocal-range.com') && (h.title || '').includes(jp));
      const r = hit ? parseRange(hit.description || '') : {};
      const peak = peakOf(r);
      cache[s.id] = { title: s.title, peak, url: hit?.url || null, status: peak ? 'found' : 'not-found' };
    } catch (e) {
      cache[s.id] = { title: s.title, status: 'error', error: e.message };
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
    await sleep(400);
  }

  let filled = 0;
  for (const s of songs) if (s.pitch === 'X' && cache[s.id]?.status === 'found') { s.pitch = cache[s.id].peak; filled++; }
  fs.writeFileSync('data/songs.json', JSON.stringify(songs, null, 2));

  const rows = Object.entries(cache).filter(([, v]) => v.status === 'found');
  const left = songs.filter(s => s.pitch === 'X').length;
  fs.writeFileSync(REPORT, [
    '# 최고음 X 곡 채우기 보고서', '',
    `- 채움 누계(캐시 found): ${rows.length}곡`, `- 여전히 X: ${left}곡 (출처에서 못 찾음·불확실·상한 초과)`,
    `- 규칙: 메인 보컬 멜로디 최고음만, 진성·가성 중 높은 쪽, vocal-range.com 확인값만`, '',
    '## 근거 출처', '', '| id | 곡 | 최고음 | 출처 |', '|---|---|---|---|',
    ...rows.map(([id, v]) => `| ${id} | ${v.title} | ${v.peak} | ${v.url} |`), ''
  ].join('\n'));
  console.log({ filled, left });
}

if (process.argv[1]?.endsWith('fill-pitch.mjs')) {
  const arg = n => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
  fillPitch({ key: process.env.FIRECRAWL_API_KEY, maxCredits: Number(arg('max-credits')) || 300, dry: process.argv.includes('--dry') })
    .catch(e => { console.error(e.message); process.exit(1); });
}
