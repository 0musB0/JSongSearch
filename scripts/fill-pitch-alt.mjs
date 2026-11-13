// vocal-range.com 에서 못 찾은 pitch X 곡을 다른 신뢰 음역 자료(atwiki 音域データ, music-key.com, karaoto.net, stepupkaraoke 등)로 채운다.
// 실행: FIRECRAWL_API_KEY=... node scripts/fill-pitch-alt.mjs [--max-credits=300] [--dry]  → 이어서 node scripts/fill-pitch.mjs 로 반영·보고서 갱신.
// 채택 규칙: 서로 다른 사이트 2곳 이상이 같은 값(사람이 정리한 출처 1곳 이상 포함), 사람이 정리한 출처가 더 높은 값을 주면 X 유지.
// 곡당 검색 1회(2크레딧) + 아티스트 표 페이지 scrape(1크레딧/페이지). 검색·scrape 결과는 docs/pitch-alt-cache.json 에 저장되어 재실행 시 크레딧을 쓰지 않는다.
import fs from 'node:fs';
import { toKo, jpTitle } from './audit-pitch.mjs';
import { fc } from './fill-pitch.mjs';

const ALT = 'docs/pitch-alt-cache.json', FILL = 'docs/pitch-fill-cache.json';
const TRUST = ['atwiki.jp/saikouon_dokoda', 'vocal-range.com', 'music-key.com', 'karaoto.net', 'utakey.jp', 'keytube.net', 'onrange-insights.com', 'stepupkaraoke.com', 'kkti.app', 'aruku002.hatenablog.com', 'utadoku.com', 'hisatono.com'];
const TABLE = /saikouon_dokoda|music-key\.com|karaoto\.net/; // 아티스트별 표가 있는 페이지는 scrape 한다
const ALGO = ['utakey.jp', 'keytube.net']; // 자동 분석 사이트: 단독·ALGO끼리 합의로는 채택하지 않는다
const NOTE = '((?:mid[12]|hi)[A-G]#?(?:\\([A-G]#?\\d\\))?)', NOTE_RE = /^(?:mid[12]|hi)[A-G]#?$/;
const SEP = '\\s*[,|]?\\s*', ANY = '(?:low\\d?|mid[12]|hi)[A-G]#?';
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nk = x => x.toLowerCase().replace(/[\s・･'’]/g, '');
const ORDER = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'];
const rank = ko => { const m = /^(\d)옥 (.+)$/.exec(ko); return m[1] * 12 + ORDER.indexOf(m[2]); };
const host = u => new URL(u).hostname.replace('w.atwiki.jp', 'atwiki').replace('www.', '');
const artistJp = s => /\(([^)]*[ぁ-んァ-ヶ一-龠A-Za-z][^)]*)\)/.exec(s.artist)?.[1] || s.artist;

// 한 곡에 대해 (출처 URL, 최고음 한글표기) 후보를 모은다.
export function candidates(song, hits, scrapes) {
  const jp = jpTitle(song), key = jp.split(' ')[0], c = [];
  const push = (url, n) => { const k = n && n !== '-' && toKo(n); if (k) c.push({ url, ko: k }); };
  for (const h of hits) {
    if (!TRUST.some(d => h.url.includes(d))) continue;
    const txt = ((h.title || '') + ' ' + (h.d || '')).replace(/＃/g, '#').replace(/\s+/g, ' ');
    if (!txt.includes(key)) continue;
    const i = txt.indexOf(key);
    for (const m of txt.slice(i, i + 300).matchAll(new RegExp('(?:地声最高音|最高音|地高)\\s*[】\\]:：,，は]?\\s*' + NOTE, 'g'))) push(h.url, m[1]);
    for (const m of txt.matchAll(new RegExp(esc(key) + SEP + ANY + SEP + NOTE + '(?:' + SEP + '(?:-|' + ANY + ')' + SEP + '(-|(?:mid[12]|hi)[A-G]#?))?', 'g'))) { push(h.url, m[1]); push(h.url, m[2]); }
  }
  for (const [url, md] of Object.entries(scrapes)) {
    if (!TRUST.some(d => url.includes(d))) continue;
    for (const line of md.split('\n')) { // | 제목 | 地低 | 地高 | 裏高 | ...
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map(x => x.replace(/＃/g, '#').trim());
      if (nk(cells[0] || '') !== nk(key)) continue;
      for (const n of cells.slice(1, 4)) if (NOTE_RE.test(n)) push(url, n);
    }
    if (url.includes('karaoto.net')) { // "제목 ... 地声：a～b. 裏声：c～d"
      const flat = md.replace(/＃/g, '#').replace(/\s+/g, ' '), j = flat.indexOf(key);
      if (j >= 0) for (const m of flat.slice(j, j + 90).matchAll(new RegExp('(?:地声|裏声)：[^～]{0,12}～' + NOTE, 'g'))) push(url, m[1]);
    }
  }
  return c;
}

// 사이트별 최댓값(진성·가성 중 높은 쪽)을 모아 다수결. 확정 못 하면 null.
export function decide(cands) {
  const per = {};
  for (const x of cands) { const h = host(x.url); if (!per[h] || rank(x.ko) > rank(per[h].ko)) per[h] = x; }
  const votes = {};
  for (const [h, x] of Object.entries(per)) (votes[x.ko] ||= []).push({ h, url: x.url });
  const best = Object.entries(votes).sort((a, b) => b[1].length - a[1].length || rank(b[0]) - rank(a[0]))[0];
  if (!best || best[1].length < 2 || best[1].every(y => ALGO.includes(y.h))) return null;
  if (Object.entries(per).some(([h, x]) => !ALGO.includes(h) && rank(x.ko) > rank(best[0]))) return null;
  return { ko: best[0], urls: best[1].map(y => y.url) };
}

async function main() {
  const dry = process.argv.includes('--dry'), maxCredits = Number(process.argv.find(a => a.startsWith('--max-credits='))?.split('=')[1]) || 300;
  const key = process.env.FIRECRAWL_API_KEY;
  const songs = JSON.parse(fs.readFileSync('data/songs.json', 'utf8')).filter(s => s.pitch === 'X');
  const alt = fs.existsSync(ALT) ? JSON.parse(fs.readFileSync(ALT, 'utf8')) : { probe: {}, scrapes: {} };
  const todo = songs.filter(s => !alt.probe[s.id]);
  console.log(`대상 ${songs.length}곡, 새로 검색 ${todo.length}곡 (약 ${todo.length * 2} 크레딧 + 표 페이지 scrape), 상한 ${maxCredits}`);
  if (dry) return;
  let spent = 0;
  const save = () => fs.writeFileSync(ALT, JSON.stringify(alt));
  if (todo.length && !key) throw new Error('FIRECRAWL_API_KEY 필요');
  for (const s of todo) {
    if (spent + 2 > maxCredits) break;
    const web = (await fc('search', { query: `『${jpTitle(s)}』 ${artistJp(s)} 最高音 音域 カラオケ`, limit: 5 }, key))?.web || [];
    alt.probe[s.id] = { hits: web.map(h => ({ url: h.url, title: h.title, d: h.description })) };
    spent += 2; save();
  }
  const urls = new Set(Object.values(alt.probe).flatMap(p => p.hits.map(h => h.url)).filter(u => TABLE.test(u)));
  for (const url of urls) {
    if (alt.scrapes[url] !== undefined || spent + 1 > maxCredits) continue;
    alt.scrapes[url] = (await fc('scrape', { url, formats: ['markdown'], onlyMainContent: true }, key))?.markdown || '';
    spent += 1; save();
  }
  const fill = fs.existsSync(FILL) ? JSON.parse(fs.readFileSync(FILL, 'utf8')) : {};
  let n = 0;
  for (const s of songs) {
    const d = alt.probe[s.id] && decide(candidates(s, alt.probe[s.id].hits, alt.scrapes));
    if (d) { fill[s.id] = { title: s.title, peak: d.ko, url: d.urls[0], sources: d.urls, status: 'found' }; n++; }
  }
  fs.writeFileSync(FILL, JSON.stringify(fill, null, 2));
  console.log(`다른 출처로 확정 ${n}곡, 사용 크레딧 ${spent}. 이어서 node scripts/fill-pitch.mjs 로 반영하세요.`);
}

if (process.argv[1]?.endsWith('fill-pitch-alt.mjs')) main().catch(e => { console.error(e.message); process.exit(1); });
