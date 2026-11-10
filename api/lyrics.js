/**
 * Vercel Serverless API: /api/lyrics
 * Zero-Token Real-Time Japanese Karaoke Lyrics + Korean Pronunciation (발음) + Korean Meaning (해석) Engine
 * Sources:
 * - LRCLIB (https://lrclib.net/api/search) + iTunes JP Title Resolver fallback
 * - Google Translate GTX Transliteration & Translation (0 API keys, 0 LLM tokens)
 * - Deterministic Hepburn Romaji -> Korean Hangul Karaoke Pronunciation Converter
 */

const KO_TO_JP_TITLE_MAP = {
  '블랙★록 슈터': 'ブラック★ロックシューター',
  '뫼비우스': 'メビウス',
  '초콜릿 멜랑콜리': 'チョコレートメランコリー',
  '사쿠라': 'SAKURA いきものがかり',
  '나의 마음을 전하는 방법': '帰りたくなったよ いきものがかり',
  '마지막 방위군': 'BUMP OF CHICKEN',
  '블루 베리 나이트': 'ブルーベリー・ナイツ',
  '비밀의 정원': '秘密の花園',
  '사계': '四季 GReeeeN',
  '오리온': 'ORION 中島美嘉',
  '오토바이': 'スパイダー スピッツ',
  '하츠네 미쿠의 소실': '初音ミクの消失',
  '천본앵': '千本桜'
};

const KO_TO_JP_ARTIST_MAP = {
  '요네즈 켄시': '米津玄師',
  '아이묭': 'あいみょん',
  '유우리': '優里',
  '요루시카': 'ヨルシカ',
  '하츠네 미쿠': '初音ミク',
  '카가미네 린': '鏡音リン',
  '카가미네 렌': '鏡音レン',
  '메구리네 루카': '巡音ルカ',
  '카사네 테토': '重音テト',
  '계속 한밤중이면 좋을 텐데.': 'ずっと真夜中でいいのに。',
  '계속 한밤중이면 좋을 텐데': 'ずっと真夜中でいいのに。',
  '이키모노가카리': 'いきものがかり',
  '우타다 히카루': '宇多田ヒカル',
  '아라시': '嵐',
  '나토리': 'なとり',
  '스피츠': 'スピッツ',
  '피노키오피': 'ピノキオピー',
  '마라시': 'まらしぃ',
  '원 오크 록': 'ONE OK ROCK',
  '히게단': 'Official髭男dism',
  '세카이노 오와리': 'SEKAI NO OWARI',
  '백 넘버': 'back number'
};

const ROMAJI_MAP = {
  sha: '샤', shi: '시', shu: '슈', she: '셰', sho: '쇼',
  cha: '차', chi: '치', chu: '츄', che: '체', cho: '쵸',
  tsu: '츠', tsa: '차', tsi: '치', tse: '체', tso: '초',
  kya: '캬', kyu: '큐', kye: '케', kyo: '쿄',
  gya: '갸', gyu: '규', gye: '게', gyo: '교',
  nya: '냐', nyu: '뉴', nye: '네', nyo: '뇨',
  hya: '햐', hyu: '휴', hye: '혜', hyo: '효',
  bya: '뱌', byu: '뷰', bye: '베', byo: '뵤',
  pya: '퍄', pyu: '퓨', pye: '폐', pyo: '표',
  mya: '먀', myu: '뮤', mye: '메', myo: '묘',
  rya: '랴', ryu: '류', rye: '례', ryo: '료',
  jya: '자', jyu: '쥬', jyo: '죠',
  dya: '쟈', dyu: '쥬', dyo: '죠',
  ka: '카', ki: '키', ku: '쿠', ke: '케', ko: '코',
  ga: '가', gi: '기', gu: '구', ge: '게', go: '고',
  sa: '사', si: '시', su: '스', se: '세', so: '소',
  za: '자', zi: '지', zu: '즈', ze: '제', zo: '조',
  ja: '자', ji: '지', ju: '쥬', je: '제', jo: '죠',
  ta: '타', ti: '티', tu: '투', te: '테', to: '토',
  da: '다', di: '디', du: '두', de: '데', do: '도',
  na: '나', ni: '니', nu: '누', ne: '네', no: '노',
  ha: '하', hi: '히', hu: '후', he: '헤', ho: '호',
  fa: '파', fi: '피', fu: '후', fe: '페', fo: '포',
  ba: '바', bi: '비', bu: '부', be: '베', bo: '보',
  pa: '파', pi: '피', pu: '푸', pe: '페', po: '포',
  ma: '마', mi: '미', mu: '무', me: '메', mo: '모',
  ya: '야', yi: '이', yu: '유', ye: '예', yo: '요',
  ra: '라', ri: '리', ru: '루', re: '레', ro: '로',
  wa: '와', wi: '위', wu: '우', we: '웨', wo: '오',
  va: '바', vi: '비', vu: '부', ve: '베', vo: '보',
  a: '아', i: '이', u: '우', e: '에', o: '오'
};

function addBatchim(hangulChar, batchimIndex) {
  const code = hangulChar.charCodeAt(0) - 0xac00;
  if (code < 0 || code >= 11172) return hangulChar;
  if (code % 28 !== 0) return hangulChar;
  return String.fromCharCode(0xac00 + code + batchimIndex);
}

// Particles that attach to the preceding noun/phrase in natural Japanese singing (Bunsetsu)
const BUNSETSU_PARTICLES = new Set([
  'wa', 'ga', 'o', 'wo', 'ni', 'no', 'to', 'de', 'mo', 'e', 'ya',
  'ka', 'ne', 'yo', 'na', 'ze', 'zo', 'sa',
  'kara', 'made', 'dake', 'shika', 'nara', 'hodo', 'nado', 'kurai', 'gurai',
  'kedo', 'keredo', 'node', 'noni', 'demo', 'toka', 'tari', 'dari',
  'niwa', 'dewa', 'towa', 'nowa', 'kana', 'kamo', 'dayo', 'dane', 'nano'
]);

// Particles that can chain onto another particle (e.g. ni + wa -> niwa, no + ka -> noka, ka + o -> kao)
const CHAINABLE_PARTICLES = new Set([
  'wa', 'ga', 'o', 'wo', 'mo', 'ka', 'ne', 'yo', 'na', 'ze', 'zo', 'sa', 'no', 'ni', 'to', 'te', 'de'
]);

// Verbal/adjectival suffixes & auxiliary verbs that attach to a preceding verb/adj stem when singing
const BUNSETSU_VERB_SUFFIXES = new Set([
  'te', 'de', 'ta', 'da', 'tara', 'dara', 'teru', 'deru', 'teiru', 'deiru',
  'teita', 'deita', 'tetara', 'detara', 'teku', 'deku', 'teiku', 'deiku',
  'tekita', 'dekita', 'chau', 'chatta', 'jau', 'jatta', 'shimau', 'shimatta',
  'tai', 'takatta', 'takunai', 'nai', 'nakatta', 'naide', 'nakute', 'naku',
  'masu', 'mashita', 'masen', 'mashou', 'mashō', 'desu', 'deshita', 'deshou', 'deshō',
  'reru', 'rareru', 'seru', 'saseru', 'konda', 'komu', 'dasu', 'dashita',
  'sugiru', 'sugita', 'hoshii', 'mitai', 'rashii', 'kureta', 'kureru', 'ageta', 'ageru'
]);

function wordRomajiToHangul(wordRomaji) {
  if (!wordRomaji) return '';
  const s = String(wordRomaji)
    .toLowerCase()
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/ē/g, 'ei')
    .replace(/ō/g, 'ou')
    .replace(/tch/g, 'cch')
    .replace(/-/g, '');

  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (!/[a-z']/.test(ch)) {
      if (ch !== "'") out.push(ch);
      i++;
      continue;
    }
    if (ch === "'") {
      i++;
      continue;
    }

    // Sokuon (double consonant like kk, tt, pp, ss, cch) -> add ㅅ batchim to previous syllable
    if (i + 1 < s.length && s[i] === s[i + 1] && !'aeiouyn'.includes(s[i])) {
      if (out.length > 0 && /[가-힣]/.test(out[out.length - 1])) {
        out[out.length - 1] = addBatchim(out[out.length - 1], 19); // ㅅ batchim
      }
      i++;
      continue;
    }

    // Syllabic n / m before non-vowel -> add ㄴ (or ㅁ before p/b/m) batchim
    if ((ch === 'n' || ch === 'm') && (i + 1 >= s.length || !'aeiouy'.includes(s[i + 1]))) {
      const nextCh = s[i + 1] || '';
      const batchimIdx = (ch === 'm' || (nextCh.length > 0 && 'pbm'.includes(nextCh))) ? 16 : 4; // 16 = ㅁ, 4 = ㄴ
      if (out.length > 0 && /[가-힣]/.test(out[out.length - 1])) {
        out[out.length - 1] = addBatchim(out[out.length - 1], batchimIdx);
      } else {
        out.push('응');
      }
      i++;
      continue;
    }

    const tri = s.slice(i, i + 3);
    if (ROMAJI_MAP[tri]) {
      out.push(ROMAJI_MAP[tri]);
      i += 3;
      continue;
    }
    const bi = s.slice(i, i + 2);
    if (ROMAJI_MAP[bi]) {
      out.push(ROMAJI_MAP[bi]);
      i += 2;
      continue;
    }
    const uni = s.slice(i, i + 1);
    if (ROMAJI_MAP[uni]) {
      out.push(ROMAJI_MAP[uni]);
      i += 1;
      continue;
    }
    out.push(ch);
    i++;
  }
  return out.join('');
}

/**
 * Convert Hepburn Romaji line into natural Korean Hangul Karaoke Pronunciation
 * grouped by natural singing phrasing (Bunsetsu: e.g. "소라니 아루 나니카오 미츠메테타라")
 */
export function romajiToHangul(romaji) {
  if (!romaji) return '';
  const rawTokens = String(romaji).trim().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return '';

  const groupedHangul = [];
  let prevEndedWithParticle = false;
  let prevCleanTok = '';

  for (let i = 0; i < rawTokens.length; i++) {
    const rawTok = rawTokens[i];
    const cleanTok = rawTok.toLowerCase().replace(/[^a-zōūēāī']/g, '');
    const hangulTok = wordRomajiToHangul(rawTok);

    if (groupedHangul.length === 0) {
      groupedHangul.push(hangulTok);
      prevEndedWithParticle = BUNSETSU_PARTICLES.has(cleanTok);
      prevCleanTok = cleanTok;
      continue;
    }

    const isParticle = BUNSETSU_PARTICLES.has(cleanTok);
    const isChainable = CHAINABLE_PARTICLES.has(cleanTok);
    const isVerbSuffix = BUNSETSU_VERB_SUFFIXES.has(cleanTok);
    // Pronouns like nani + ka -> nanika (나니카)
    const isIndefinitePronoun = (prevCleanTok === 'nani' || prevCleanTok === 'dare' || prevCleanTok === 'doko' || prevCleanTok === 'itsu') &&
                                (cleanTok === 'ka' || cleanTok === 'mo' || cleanTok === 'demo');

    if (
      isIndefinitePronoun ||
      (isParticle && (!prevEndedWithParticle || isChainable)) ||
      (isVerbSuffix && !prevEndedWithParticle)
    ) {
      groupedHangul[groupedHangul.length - 1] += hangulTok;
      prevEndedWithParticle = isIndefinitePronoun ? false : isParticle;
    } else {
      groupedHangul.push(hangulTok);
      prevEndedWithParticle = isParticle;
    }
    prevCleanTok = cleanTok;
  }

  return groupedHangul.join(' ').replace(/\s+/g, ' ').trim();
}

// Titles/artists a lrclib hit must match. Hangul-only names can't be compared with lrclib metadata, so they are dropped.
function parseMatchers(rawTitle = '', rawArtist = '') {
  const t = String(rawTitle || '').replace(/\\\*/g, '*').trim();
  const i = t.indexOf('(');
  const hasSub = i > 0 && t.endsWith(')');
  const main = hasSub ? t.slice(0, i).trim() : t;
  const sub = hasSub ? t.slice(i + 1, -1).trim() : (KO_TO_JP_TITLE_MAP[main] || '');
  const a = String(rawArtist || '').replace(/\\\*/g, '*');
  const ko = a.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
  const artists = [a.match(/\(([^)]+)\)/)?.[1], KO_TO_JP_ARTIST_MAP[ko], ko]
    .filter(x => x && !/[가-힣]/.test(x));
  return { titles: [main, sub, t].filter(Boolean), artists };
}

export function parseSearchQueries(rawTitle = '', rawArtist = '', rawComposer = '') {
  const titleStr = String(rawTitle || '').replace(/\\\*/g, '*').trim();
  const artistStr = String(rawArtist || '').replace(/\\\*/g, '*').trim();
  const composerStr = String(rawComposer || '').replace(/\\\*/g, '*').trim();

  let mainTitle = titleStr;
  let subTitle = '';
  const parenIdx = titleStr.indexOf('(');
  if (parenIdx > 0 && titleStr.endsWith(')')) {
    mainTitle = titleStr.slice(0, parenIdx).trim();
    subTitle = titleStr.slice(parenIdx + 1, -1).trim();
  }

  if (!subTitle && KO_TO_JP_TITLE_MAP[mainTitle]) {
    subTitle = KO_TO_JP_TITLE_MAP[mainTitle];
  }

  // Extract Japanese artist name if inside parentheses e.g. 요네즈 켄시(米津玄師)
  let jpArtist = '';
  const artistParen = artistStr.match(/\(([^)]+)\)/);
  if (artistParen) {
    jpArtist = artistParen[1].trim();
  }
  const cleanKoArtist = artistStr.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
  if (!jpArtist && KO_TO_JP_ARTIST_MAP[cleanKoArtist]) {
    jpArtist = KO_TO_JP_ARTIST_MAP[cleanKoArtist];
  }
  const cleanComposer = composerStr.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
  const jpComposer = KO_TO_JP_ARTIST_MAP[cleanComposer] || cleanComposer;

  const queries = [];
  if (subTitle && jpArtist) queries.push(`${subTitle} ${jpArtist}`);
  if (subTitle && jpComposer && jpComposer !== '-') queries.push(`${subTitle} ${jpComposer}`);
  if (subTitle) queries.push(subTitle);
  if (mainTitle && jpArtist) queries.push(`${mainTitle} ${jpArtist}`);
  if (mainTitle && cleanKoArtist && cleanKoArtist !== '-') queries.push(`${mainTitle} ${cleanKoArtist}`);
  if (mainTitle) queries.push(mainTitle);

  return [...new Set(queries.filter(Boolean))];
}

// Title key for exact comparison: drop "(...)" / " - ..." suffixes and non-letters.
const titleKey = t => String(t || '').replace(/\s*[(（].*$/, '').replace(/\s+-\s.*$/, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

async function fetchLrcLib(query, { titles = [], artists = [] } = {}) {
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JSongSearch-Karaoke/2.0 (https://jsongsearch.vercel.app)' }
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    // Prefer item that has plainLyrics
    // Require exact title match: lrclib search is fuzzy and returns other songs by the same artist.
    const tk = titles.map(titleKey).filter(Boolean);
    const ak = artists.map(titleKey).filter(Boolean);
    const match = list.find(item => {
      if (!item.plainLyrics || item.plainLyrics.trim().length <= 20) return false;
      const a = titleKey(item.artistName);
      return (!tk.length || tk.includes(titleKey(item.trackName))) &&
        (!ak.length || ak.some(k => a.includes(k) || k.includes(a)));
    });
    return match || null;
  } catch {
    return null;
  }
}

async function translateAndTransliterateBatch(linesBatch) {
  if (linesBatch.length === 0) return { koLines: [], pronLines: [] };
  const joined = linesBatch.join('\n‖\n');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ko&dt=t&dt=rm&q=${encodeURIComponent(joined)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('GTX request failed');
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];

  let fullKo = '';
  let fullRomaji = '';
  for (const seg of segments) {
    if (typeof seg?.[0] === 'string') {
      fullKo += seg[0];
    }
    if (seg?.[0] === null && seg?.[1] === null && typeof seg?.[3] === 'string') {
      fullRomaji += seg[3];
    }
  }

  const koLines = fullKo.split(/\s*‖\s*/).map(s => s.replace(/\n/g, ' ').trim());
  const romajiLines = fullRomaji.split(/\s*‖\s*/).map(s => s.replace(/\n/g, ' ').trim());
  const pronLines = romajiLines.map(r => romajiToHangul(r));

  return { koLines, pronLines };
}

export async function getEnrichedLyrics({ title, artist, composer }) {
  const queries = parseSearchQueries(title, artist, composer);
  let hit = null;

  const wanted = parseMatchers(title, artist);
  for (const q of queries) {
    hit = await fetchLrcLib(q, wanted);
    if (hit) break;
  }

  // Fallback: iTunes Japan Search to resolve Korean/Romanized title into official Japanese title
  if (!hit && queries.length > 0) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?country=jp&media=music&limit=2&term=${encodeURIComponent(queries[0])}`
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        const track = itunesData?.results?.[0];
        if (track?.trackName) {
          hit = await fetchLrcLib(`${track.trackName} ${track.artistName || ''}`, { titles: [track.trackName], artists: wanted.artists }) || await fetchLrcLib(track.trackName, { titles: [track.trackName], artists: wanted.artists });
        }
      }
    } catch {}
  }

  if (!hit || !hit.plainLyrics) {
    return {
      found: false,
      title,
      artist,
      lines: []
    };
  }

  const rawLines = hit.plainLyrics
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim());

  // Extract non-empty lines for batch transliteration & translation (up to 90 lines)
  const nonEmptyIndices = [];
  const nonEmptyTexts = [];
  rawLines.forEach((line, idx) => {
    if (line && nonEmptyTexts.length < 90) {
      nonEmptyIndices.push(idx);
      nonEmptyTexts.push(line);
    }
  });

  const hasJapanese = nonEmptyTexts.some(l => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(l));
  const koMap = new Map();
  const pronMap = new Map();

  if (hasJapanese && nonEmptyTexts.length > 0) {
    const CHUNK_SIZE = 28;
    const chunks = [];
    for (let i = 0; i < nonEmptyTexts.length; i += CHUNK_SIZE) {
      chunks.push({
        startIdx: i,
        lines: nonEmptyTexts.slice(i, i + CHUNK_SIZE)
      });
    }

    await Promise.all(
      chunks.map(async chunk => {
        try {
          const { koLines, pronLines } = await translateAndTransliterateBatch(chunk.lines);
          chunk.lines.forEach((_, offset) => {
            const rawIdx = nonEmptyIndices[chunk.startIdx + offset];
            if (koLines[offset]) koMap.set(rawIdx, koLines[offset]);
            if (pronLines[offset]) pronMap.set(rawIdx, pronLines[offset]);
          });
        } catch {}
      })
    );
  }

  const structuredLines = rawLines.map((orig, idx) => {
    if (!orig) return { empty: true };
    return {
      empty: false,
      orig,
      pron: pronMap.get(idx) || '',
      ko: koMap.get(idx) || ''
    };
  });

  return {
    found: true,
    trackName: hit.trackName || title,
    artistName: hit.artistName || artist,
    hasJapanese,
    lines: structuredLines
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  const { title = '', artist = '', composer = '' } = req.query || {};
  if (!title) {
    return res.status(400).json({ found: false, error: 'Missing title parameter' });
  }

  try {
    const result = await getEnrichedLyrics({ title, artist, composer });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ found: false, error: String(err?.message || err) });
  }
}
