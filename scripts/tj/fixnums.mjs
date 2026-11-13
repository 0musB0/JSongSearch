import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
import { execSync } from 'node:child_process';
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const rowsOf = h => [...h.matchAll(/<ul class="grid-container list[^"]*">([\s\S]*?)(?=<li>\s*<ul class="grid-container list|<\/ul>\s*<\/div>)/g)].map(m => {
  const num = strip((/class="num2">([\s\S]*?)<\/span><\/p>/.exec(m[1]) || [])[1] || '');
  const part = k => { const r = new RegExp('<li class="grid-item ' + k + '[^"]*">([\\s\\S]*?)(?=<li class="grid-item title|$)').exec(m[1]); return r ? strip(r[1]) : ''; };
  return { num, title: part('title3').replace(/^60이상 반주기 전용곡\s*/, ''), singer: part('title4') };
});
const q = async (type, t) => rowsOf(await (await fetch(`https://www.tjmedia.com/song/accompaniment_search?pageNo=1&pageRowCnt=100&strSotrGubun=ASC&strSortType=&nationType=&natType=&strCond=0&strType=${type}&searchTxt=${encodeURIComponent(t)}&strText=${encodeURIComponent(t)}`)).text());
const norm = s => s.toLowerCase().replace(/\(.*?\)|（.*?）/g, '').replace(/[\s・･.!?！？~〜～\-'’☆★♡♪,、。​]/g, '');
const jpOf = t => { const m = [...t.matchAll(/\(([^)]*)\)/g)].map(x => x[1]).filter(x => /[ぁ-んァ-ヶ一-龠A-Za-z]/.test(x)); return m.length ? m[m.length - 1] : t.replace(/\(.*$/, ''); };
const sim = (a, b) => { if (!a || !b) return 0; if (a.includes(b) || b.includes(a)) return 1; const s = new Set(a); let c = 0; for (const ch of b) if (s.has(ch)) c++; return c / Math.max(a.length, b.length); };
const verify = JSON.parse(fs.readFileSync(path.join(HERE, 'verify.json'), 'utf8'));
const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/songs.json'), 'utf8'));
const byId = Object.fromEntries(songs.map(s => [s.id, s]));
const out = { ok: 0, fixed: [], ambiguous: [], notfound: [] };
for (const v of verify) {
  if (v.status !== 'found') continue;
  const s = byId[v.id];
  const tjTitle = norm(v.tj.split(' / ')[0].replace(/^60이상 반주기 전용곡\s*/, ''));
  const mine = [norm(jpOf(s.title)), norm(s.title.replace(/\(.*$/, ''))];
  if (mine.some(m => sim(m, tjTitle) >= 0.7)) { out.ok++; continue; }
  // 잘못된 번호: TJ에서 제목으로 재검색
  const jp = jpOf(s.title).replace(/[\s]+/g, ' ');
  let rows = await q(1, jp);
  const art = [...s.artist.matchAll(/[A-Za-z0-9가-힣ぁ-んァ-ヶ一-龠]+/g)].map(x => norm(x[0])).filter(x => x.length > 1);
  const cand = rows.filter(r => sim(norm(r.title), norm(jp)) >= 0.85 && art.some(a => norm(r.singer).includes(a) || a.includes(norm(r.singer))));
  const uniq = [...new Map(cand.map(r => [r.num, r])).values()];
  if (uniq.length === 1) out.fixed.push({ id: s.id, title: s.title, artist: s.artist, old: s.tj_num, new: uniq[0].num, tj: `${uniq[0].title} / ${uniq[0].singer}` });
  else if (uniq.length > 1) out.ambiguous.push({ id: s.id, title: s.title, artist: s.artist, old: s.tj_num, cands: uniq.map(r => `${r.num} ${r.title} / ${r.singer}`) });
  else out.notfound.push({ id: s.id, title: s.title, artist: s.artist, old: s.tj_num, sample: rows.slice(0, 3).map(r => `${r.num} ${r.title} / ${r.singer}`) });
  await new Promise(r => setTimeout(r, 200));
}
fs.writeFileSync(path.join(HERE, 'fixnums.json'), JSON.stringify(out, null, 1));
console.log({ ok: out.ok, fixed: out.fixed.length, ambiguous: out.ambiguous.length, notfound: out.notfound.length });
