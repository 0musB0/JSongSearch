// vocal-range.com 음역 글과 data/songs.json의 pitch를 대조해 docs/pitch-audit.json에 기록한다.
// data/songs.json은 수정하지 않는다. 실행: FIRECRAWL_API_KEY=... node scripts/audit-pitch.mjs [시작id] [끝id]
// 비용: 곡당 검색 1회(약 2 크레딧). 435곡 전체 약 870 크레딧. 중단 후 다시 실행하면 이어서 진행.
import fs from 'node:fs';

const NOTE_KO = { C: '도', D: '레', E: '미', F: '파', G: '솔', A: '라', B: '시' };

// "hiB(B4)", "mid2G#(G#4)", "hiF" -> "2옥 시", "2옥 솔#", "3옥 파". 괄호 안 과학적 표기가 있으면 그것을 우선.
export function toKo(token) {
  const m = /^(low\d?|mid[12]|hi|hihi|hiA?)?([A-G])([#＃♭b]?)(?:\(([A-G])([#＃]?)(\d)\))?$/.exec(token.replace(/＃/g, '#'));
  if (!m) return null;
  const [, reg = '', letter, acc, , , oct] = m;
  let octave = oct ? Number(oct) : null;
  if (octave === null) {
    // 괄호 없는 표기의 근사: mid1 = A#2~B3, mid2 = C4~G#4, hi = A4~
    if (reg.startsWith('mid1')) octave = letter === 'B' || (letter === 'A' && acc === '#') ? 2 : 3;
    else if (reg.startsWith('mid2')) octave = 4;
    else if (reg.startsWith('hi')) octave = ['A', 'B'].includes(letter) ? 4 : 5;
    else return null;
  }
  if (acc === 'b' || acc === '♭') return null; // 플랫 표기는 자동 변환하지 않고 수동 검토로 남긴다
  return `${octave - 2}옥 ${NOTE_KO[letter]}${acc}`;
}

const ORDER = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'];
const rank = ko => { const m = /^(\d)옥 (.+)$/.exec(ko || ''); return m ? m[1] * 12 + ORDER.indexOf(m[2]) : -1; };
// 최고음 기준: 메인 멜로디의 진성·가성 중 높은 쪽 (사용자 결정 2026-11-13)
export const peakOf = ({ chest, falsetto }) => (rank(falsetto) > rank(chest) ? falsetto : chest) || null;

export function parseRange(text) {
  const t = text.replace(/＃/g, '#');
  const grab = label => {
    const m = new RegExp(`${label}\\s*[】\\]:：]?\\s*((?:low\\d?|mid[12]|hihi|hi)[A-G]#?(?:\\([A-G]#?\\d\\))?)`).exec(t);
    return m ? toKo(m[1]) : null;
  };
  return { chest: grab('地声最高音'), falsetto: grab('裏声最高音') };
}

export function jpTitle(song) {
  const m = /\(([^)]*[ぁ-んァ-ヶ一-龠][^)]*)\)/.exec(song.title);
  return (m ? m[1] : song.title).trim();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CREDITS_PER_SONG = 2;

async function search(query, key) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, limit: 3 }),
      signal: AbortSignal.timeout(20000)
    });
    if (res.status === 429 && attempt < 6) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw new Error(`firecrawl ${res.status}`);
    return (await res.json()).data?.web || [];
  }
}

async function main() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY 필요');
  const maxCredits = Number(process.argv.find(a => a.startsWith('--max-credits='))?.split('=')[1]) || 300;
  const posArgs = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number);
  const [from = 0, to = Infinity] = posArgs;
  const songs = JSON.parse(fs.readFileSync('data/songs.json', 'utf8')).filter(s => s.id >= from && s.id <= to);
  const outPath = 'docs/pitch-audit.json';
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  let spent = 0;
  for (const s of songs) {
    if (out[s.id]) continue;
    if (spent + CREDITS_PER_SONG > maxCredits) {
      console.log(`크레딧 상한(${maxCredits}) 도달로 중단 (사용 ${spent} 크레딧)`);
      break;
    }
    const jp = jpTitle(s);
    try {
      const hits = await search(`site:vocal-range.com 「${jp}」 ${s.artist} 音域 地声最高音`, key);
      spent += CREDITS_PER_SONG;
      const hit = hits.find(h => h.url?.includes('vocal-range.com') && (h.title || '').includes(jp));
      const r = hit ? parseRange(hit.description || '') : { chest: null, falsetto: null };
      const peak = peakOf(r);
      out[s.id] = { title: s.title, stored: s.pitch, ...r, peak, url: hit?.url || null,
        status: !peak ? 'no-source' : peak === s.pitch ? 'match' : 'diff' };
    } catch (e) {
      out[s.id] = { title: s.title, stored: s.pitch, status: 'error', error: e.message };
    }
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    await sleep(400);
  }
  const c = {};
  for (const v of Object.values(out)) c[v.status] = (c[v.status] || 0) + 1;
  console.log(c);
}

if (process.argv[1]?.endsWith('audit-pitch.mjs')) main().catch(e => { console.error(e.message); process.exit(1); });
