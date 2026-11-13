import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
async function byNum(n) {
  const u = `https://www.tjmedia.com/song/accompaniment_search?pageNo=1&pageRowCnt=100&strSotrGubun=ASC&strSortType=&nationType=&natType=&strType=16&strCond=0&searchTxt=${n}&strText=${n}`;
  const h = await (await fetch(u)).text();
  return [...h.matchAll(/<ul class="grid-container list[^"]*">([\s\S]*?)(?=<li>\s*<ul class="grid-container list|<\/ul>\s*<\/div>)/g)].map(m => {
    const num = strip((/class="num2">([\s\S]*?)<\/span><\/p>/.exec(m[1]) || [])[1] || '');
    const part = k => { const r = new RegExp('<li class="grid-item ' + k + '[^"]*">([\\s\\S]*?)(?=<li class="grid-item title|$)').exec(m[1]); return r ? strip(r[1]) : ''; };
    return { num, title: part('title3'), singer: part('title4') };
  });
}
const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/songs.json'), 'utf8'));
const res = [];
for (const s of songs) {
  const n = String(s.tj_num).replace(/\D/g, '');
  if (!n) { res.push({ id: s.id, status: 'no-number', title: s.title }); continue; }
  const rows = (await byNum(n)).filter(r => r.num === n);
  const r = rows[0];
  res.push({ id: s.id, title: s.title, artist: s.artist, tj_num: s.tj_num, tj: r ? `${r.title} / ${r.singer}` : null, status: r ? 'found' : 'not-found' });
  await new Promise(r => setTimeout(r, 150));
}
fs.writeFileSync(path.join(HERE, 'verify.json'), JSON.stringify(res, null, 2));
const c = {}; for (const r of res) c[r.status] = (c[r.status] || 0) + 1; console.log(c);
