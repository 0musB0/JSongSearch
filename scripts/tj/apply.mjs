import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const rowsOf = h => [...h.matchAll(/<ul class="grid-container list[^"]*">([\s\S]*?)(?=<li>\s*<ul class="grid-container list|<\/ul>\s*<\/div>)/g)].map(m => {
  const num = strip((/class="num2">([\s\S]*?)<\/span><\/p>/.exec(m[1]) || [])[1] || '');
  const part = k => { const r = new RegExp('<li class="grid-item ' + k + '[^"]*">([\\s\\S]*?)(?=<li class="grid-item title|$)').exec(m[1]); return r ? strip(r[1]) : ''; };
  return { num, title: part('title3'), singer: part('title4'), composer: part('title6') };
});
const byNum = async n => (rowsOf(await (await fetch(`https://www.tjmedia.com/song/accompaniment_search?pageNo=1&pageRowCnt=100&strSotrGubun=ASC&strSortType=&nationType=&natType=&strType=16&strCond=0&searchTxt=${n}&strText=${n}`)).text())).find(r => r.num === String(n));
const stripTag = t => t.replace(/^60이상 반주기 전용곡\s*/, '').replace(/\((?=[^)]*(?:OP|ED|OST|CM|主題歌|挿入歌|映画|アニメ|ドラマ|Movie|ver))[^)]*\)\s*$/g, '').replace(/\(.*?(?:OP|ED|OST|CM)\s*\d*\)\s*$/g, '').trim();

const songsPath = path.join(ROOT, 'data/songs.json');
const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
const byId = Object.fromEntries(songs.map(s => [s.id, s]));
const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixnums.json'), 'utf8'));
const manual = { 44: 25569, 126: 27374, 212: 29809, 247: 25407, 319: 25589, 383: 26784, 233: 28285, 393: 68217, 171: 26506, 400: 68759 };
const fixes = [...fx.fixed.map(f => [f.id, Number(f.new)]), ...Object.entries(manual).map(([k, v]) => [Number(k), v])];
const log = { fixed: [], added: [], skipped: [] };
for (const [id, num] of fixes) {
  const r = await byNum(num); const s = byId[id];
  if (!r) { log.skipped.push(`fix ${id}: TJ ${num} 재확인 실패`); continue; }
  const suf = (/(ⓗ|ⓢ)/.exec(s.tj_num) || [''])[0];
  log.fixed.push({ id, title: s.title, old: s.tj_num, new: String(num) + suf, tj: `${r.title} / ${r.singer}` });
  s.tj_num = String(num) + suf;
}
const have = new Set(songs.map(s => String(s.tj_num).replace(/\D/g, '')));
const nk = t => t.toLowerCase().replace(/[\s・･.!?！？~〜～\-'’☆★]/g, '');
let nextId = songs.reduce((m, s) => Math.max(m, s.id), 0) + 1;
for (const [artist, list] of JSON.parse(fs.readFileSync(path.join(HERE, 'newsongs.json'), 'utf8'))) {
  for (const [num, ko] of list) {
    const r = await byNum(num);
    if (!r) { log.skipped.push(`add ${num}: TJ에서 확인 안 됨`); continue; }
    if (have.has(String(num))) { log.skipped.push(`add ${num} ${r.title}: 이미 DB에 같은 번호`); continue; }
    const jp = stripTag(r.title);
    if (songs.some(s => nk(s.title).includes(nk(jp)) && s.artist.includes(artist.split(' (')[0].slice(0, 3)))) { log.skipped.push(`add ${num} ${jp}: 제목·가수 중복`); continue; }
    if (!ko && /[^\x00-\x7F]/.test(jp)) { log.skipped.push(`add ${num} ${jp}: 한국어 제목 필요`); continue; }
    songs.push({ id: nextId++, title: ko ? `${ko} (${jp})` : jp, artist, composer: r.composer || '-', pitch: 'X', tj_num: String(num), ky_num: 'XXX' });
    have.add(String(num)); log.added.push(`${num} ${ko ? ko + ' ' : ''}(${jp}) / ${artist}`);
  }
}
fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
fs.writeFileSync(path.join(HERE, 'apply-log.json'), JSON.stringify(log, null, 1));
console.log({ fixed: log.fixed.length, added: log.added.length, skipped: log.skipped.length, total: songs.length });
console.log(log.skipped.join('\n'));
