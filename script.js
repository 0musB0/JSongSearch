/**
 * 일본곡 노래방 검색기 - Editorial & Tactile Frontend Application (v2.0)
 * Designed by Principal UI/UX Designer & UX Scenario Writer
 * Features:
 * - convertPitch("3옥 도#" -> "C#5") & Unified Pitch + Key Stepper Capsule ([ − 3옥 도# + ])
 * - Korean Initial Consonant (초성: ㅂㅌㅇ -> 베텔기우스, ㅊㅂㅇ -> 천본앵) search
 * - 1-Step Inline Vocal Range Key Calculator & Inline Favorites Share Bar
 * - Karaoke Room Machine Mode (전체 / TJ / 금영)
 * - 1-Click Artist/Composer Filter
 * - Cross-platform iOS/Android/PC clipboard fallback & tactile visual feedback
 */

const NOTE_MAP = { '도': 'C', '레': 'D', '미': 'E', '파': 'F', '솔': 'G', '라': 'A', '시': 'B' };
const NOTE_MAP_REV = { 'C': '도', 'D': '레', 'E': '미', 'F': '파', 'G': '솔', 'A': '라', 'B': '시' };
const NOTE_ORDER = ['도', '레', '미', '파', '솔', '라', '시'];
const SEMITONE_OFFSET = { '도': 0, '레': 2, '미': 4, '파': 5, '솔': 7, '라': 9, '시': 11 };
const SEMITONE_TO_KOR = [
  '도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시'
];

const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

let allSongs = [];
let activeFilter = 'all';
let machineMode = 'all'; // 'all' | 'tj' | 'ky'
let toastTimer = null;
let favoriteIds = new Set();
let recentCopied = [];
let myComfortPitch = '';
const cardKeyOffsets = new Map(); // songId -> semitone shift (-7 .. +7)

/**
 * Cross-platform clipboard copy with iOS WebView / KakaoTalk fallback
 */
async function copyTextSafe(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      navigator.vibrate?.(12);
      return true;
    }
  } catch {
    // Fallback below for iOS In-App WebViews
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) navigator.vibrate?.(12);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Load persisted user state from localStorage
 */
function loadUserPreferences() {
  try {
    const savedFavs = JSON.parse(localStorage.getItem('jsong_favorites') || '[]');
    favoriteIds = new Set(savedFavs.map(Number));
  } catch {
    favoriteIds = new Set();
  }

  try {
    recentCopied = JSON.parse(localStorage.getItem('jsong_recent_copied') || '[]');
  } catch {
    recentCopied = [];
  }

  try {
    myComfortPitch = localStorage.getItem('jsong_my_pitch') || '';
    const savedTheme = localStorage.getItem('jsong_theme') || 'soft-light';
    applyTheme(savedTheme);
  } catch {}
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = theme === 'soft-dark' ? '☀️' : '🌙';
  }
  const metaTheme = document.getElementById('metaThemeColor');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'soft-dark' ? '#17161e' : '#fdf9f5');
  }
  try {
    localStorage.setItem('jsong_theme', theme);
  } catch {}
}

/**
 * Extract Korean Chosung (초성) from string for fast consonant search
 */
function extractChosung(str) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00;
    if (code > -1 && code < 11172) {
      result += CHOSUNG_LIST[Math.floor(code / 588)];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

/**
 * Convert Korean pitch ("3옥 파#") to Scientific Pitch ("F#5")
 */
export function convertPitch(koreanPitch) {
  if (!koreanPitch || koreanPitch === 'X' || koreanPitch === '-') return '-';
  const match = koreanPitch.match(/([0-9]+)옥\s*([가-힣])(#?)/u);
  if (match && match.length >= 3) {
    const octave = parseInt(match[1], 10) + 2;
    const noteKor = match[2];
    const sharp = match[3] || '';
    if (NOTE_MAP[noteKor]) {
      return `${NOTE_MAP[noteKor]}${sharp}${octave}`;
    }
  }
  return koreanPitch;
}

/**
 * Parse pitch into exact semitone MIDI-like value & sorting score
 */
function parsePitchRank(koreanPitch) {
  if (!koreanPitch || koreanPitch === 'X' || koreanPitch === '-') {
    return { valid: false, octave: 99, noteIdx: 99, sharp: 0, score: 9999, semitones: 999 };
  }
  const match = koreanPitch.match(/([0-9]+)옥\s*([가-힣])(#?)/u);
  if (!match) {
    return { valid: false, octave: 99, noteIdx: 99, sharp: 0, score: 9999, semitones: 999 };
  }
  const octave = parseInt(match[1], 10);
  const noteKor = match[2];
  const noteIdx = NOTE_ORDER.indexOf(noteKor);
  const sharp = match[3] === '#' ? 1 : 0;
  const semitones = (octave + 2) * 12 + (SEMITONE_OFFSET[noteKor] ?? 0) + sharp;
  const score = octave * 100 + (noteIdx >= 0 ? noteIdx * 10 : 90) + sharp;
  return { valid: true, octave, noteIdx, sharp, score, semitones };
}

/**
 * Shift a Korean pitch by N semitones (-7 to +7) and return new Korean pitch
 */
function shiftKoreanPitch(koreanPitch, semitoneDelta = 0) {
  if (!semitoneDelta) return koreanPitch;
  const rank = parsePitchRank(koreanPitch);
  if (!rank.valid) return koreanPitch;
  const targetSemitones = rank.semitones + semitoneDelta;
  const sciOctave = Math.floor(targetSemitones / 12);
  const korOctave = sciOctave - 2;
  const noteIndex = ((targetSemitones % 12) + 12) % 12;
  return `${korOctave}옥 ${SEMITONE_TO_KOR[noteIndex]}`;
}

/**
 * Compute concise recommended karaoke key adjustment relative to user's comfort pitch
 */
function getKeyRecommendation(songPitch) {
  if (!myComfortPitch) return null;
  const userRank = parsePitchRank(myComfortPitch);
  const songRank = parsePitchRank(songPitch);
  if (!userRank.valid || !songRank.valid) return null;

  const diff = userRank.semitones - songRank.semitones;
  if (diff >= 0 && diff <= 2) {
    return { text: '원키 적당', isDown: false };
  }
  if (diff > 2) {
    return { text: '원키 편함', isDown: false };
  }
  return { text: `${diff}키 추천`, isDown: true };
}

/**
 * Format song title into clean Korean title + parenthesized-free Japanese subtitle
 * Reserves 2-line cadence with .empty-sub so all cards in a row share an identical baseline
 */
function formatSongTitle(title) {
  const raw = String(title || '').replace(/\\\*/g, '*');
  const idx = raw.indexOf('(');
  if (idx > 0 && raw.endsWith(')')) {
    const main = escapeHtml(raw.slice(0, idx).trim());
    const subInner = escapeHtml(raw.slice(idx + 1, -1).trim());
    return `<span class="main-title">${main}</span><span class="sub-title">${subInner}</span>`;
  }
  return `<span class="main-title">${escapeHtml(raw)}</span><span class="sub-title empty-sub" aria-hidden="true">&nbsp;</span>`;
}

function cleanArtistText(str) {
  return String(str || '').replace(/\\\*/g, '*').trim();
}

function formatArtistDisplay(str) {
  const cleaned = cleanArtistText(str);
  // Strip verbose parenthesized kanji/romanization on card face if primary name precedes it
  const stripped = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
  return stripped || cleaned;
}

function normalizeArtistName(name) {
  return cleanArtistText(name)
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function parseKaraokeNumber(rawNum) {
  if (!rawNum || rawNum === 'XXX' || rawNum === '-') {
    return { cleanNum: '', displayNum: '미수록', suffixTag: null, disabled: 'disabled' };
  }
  const str = String(rawNum).trim();
  const clean = str.replace(/[ⓗⓢ]/g, '').trim();
  let suffixTag = null;
  if (str.includes('ⓗ')) suffixTag = 'HD';
  else if (str.includes('ⓢ')) suffixTag = 'MR';

  return { cleanNum: clean, displayNum: clean, suffixTag, disabled: '' };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeSearchQuery(rawSearch) {
  const trimmed = (rawSearch || '').trim();
  let dbSearch = trimmed.replace(/옥타브/g, '옥');
  const tempPitch = dbSearch.replace(/\s+/g, '');

  const engPitchMatch = tempPitch.match(/^([a-gA-G])(#?)([0-9])$/);
  if (engPitchMatch) {
    const noteKor = NOTE_MAP_REV[engPitchMatch[1].toUpperCase()];
    const sharp = engPitchMatch[2] || '';
    const korOctave = parseInt(engPitchMatch[3], 10) - 2;
    if (noteKor && korOctave >= 0) {
      dbSearch = `${korOctave}옥 ${noteKor}${sharp}`;
    }
  }

  const isPitchSearch = dbSearch.includes('옥');
  const searchNoSpace = dbSearch.replace(/\s+/g, '').toLowerCase();

  return { trimmed, dbSearch, isPitchSearch, searchNoSpace };
}

function syncPitchSelects() {
  const myPitchSelect = document.getElementById('myPitchSelect');
  const inlinePitchSelect = document.getElementById('inlinePitchSelect');
  if (myPitchSelect && myPitchSelect.value !== myComfortPitch) {
    myPitchSelect.value = myComfortPitch;
  }
  if (inlinePitchSelect && inlinePitchSelect.value !== myComfortPitch) {
    inlinePitchSelect.value = myComfortPitch;
  }
}

function updateContextualInlineBars() {
  const inlineRangeBar = document.getElementById('inlineRangeBar');
  const inlineFavBar = document.getElementById('inlineFavBar');
  const inlineFavLabel = document.getElementById('inlineFavLabel');

  syncPitchSelects();

  if (inlineRangeBar) {
    const showRangeBar = activeFilter === 'my-range';
    inlineRangeBar.classList.toggle('hidden', !showRangeBar);
  }

  if (inlineFavBar) {
    const showFavBar = activeFilter === 'favorites' && favoriteIds.size > 0;
    inlineFavBar.classList.toggle('hidden', !showFavBar);
    if (inlineFavLabel) {
      inlineFavLabel.textContent = `내가 찜한 애창곡 ${favoriteIds.size}곡`;
    }
  }
}

function getFilteredAndSortedSongs() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const pitchNotice = document.getElementById('pitchSortNotice');
  const myRangeBadge = document.getElementById('myRangeActiveBadge');

  const { trimmed, isPitchSearch, searchNoSpace } = normalizeSearchQuery(searchInput?.value || '');

  if (myRangeBadge) {
    myRangeBadge.classList.toggle('hidden', !myComfortPitch);
    if (myComfortPitch) {
      myRangeBadge.textContent = `🎯 내 최고음: ${myComfortPitch}`;
    }
  }

  updateContextualInlineBars();

  // 1. Apply machine mode + quick filter chip
  let list = allSongs.filter(song => {
    if (machineMode === 'tj') {
      if (!song.tj_num || song.tj_num === 'XXX' || song.tj_num === '-') return false;
    } else if (machineMode === 'ky') {
      if (!song.ky_num || song.ky_num === 'XXX' || song.ky_num === '-') return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'favorites') {
      return favoriteIds.has(Number(song.id));
    }
    if (activeFilter === 'my-range') {
      if (!myComfortPitch) return true;
      const u = parsePitchRank(myComfortPitch);
      const s = parsePitchRank(song.pitch);
      return u.valid && s.valid && s.semitones <= u.semitones;
    }
    if (activeFilter === 'pitch-2down') {
      const r = parsePitchRank(song.pitch);
      return r.valid && r.octave <= 2;
    }
    if (activeFilter === 'pitch-3mid') {
      const r = parsePitchRank(song.pitch);
      return r.valid && r.score >= 300 && r.score <= 320; // 3옥 도 ~ 3옥 미
    }
    if (activeFilter === 'pitch-3high') {
      const r = parsePitchRank(song.pitch);
      return r.valid && r.score >= 330; // 3옥 파 이상
    }
    if (activeFilter.startsWith('artist:')) {
      const pattern = activeFilter.slice('artist:'.length);
      const keywords = pattern.split('|').map(k => k.replace(/\s+/g, '').toLowerCase());
      const artistNoSpace = (song.artist || '').replace(/\s+/g, '').toLowerCase();
      const composerNoSpace = (song.composer || '').replace(/\s+/g, '').toLowerCase();
      return keywords.some(k => artistNoSpace.includes(k) || composerNoSpace.includes(k));
    }
    return true;
  });

  // 2. Apply search query (including Korean Initial Consonant 초성 search)
  if (trimmed !== '') {
    const rawNoSpace = trimmed.replace(/\s+/g, '').toLowerCase();
    list = list.filter(song => {
      const titleNs = (song.title || '').replace(/\s+/g, '').toLowerCase();
      const titleChosung = extractChosung(titleNs);
      const pitchNs = (song.pitch || '').replace(/\s+/g, '').toLowerCase();
      const engPitchNs = convertPitch(song.pitch).replace(/\s+/g, '').toLowerCase();
      const artistNs = (song.artist || '').replace(/\s+/g, '').toLowerCase();
      const artistChosung = extractChosung(artistNs);
      const composerNs = (song.composer || '').replace(/\s+/g, '').toLowerCase();
      const composerChosung = extractChosung(composerNs);
      const tjNs = (song.tj_num || '').replace(/\s+/g, '').toLowerCase();
      const kyNs = (song.ky_num || '').replace(/\s+/g, '').toLowerCase();

      if (isPitchSearch && /[가-힣]/.test(searchNoSpace)) {
        const wantsSharp = searchNoSpace.endsWith('#');
        if (!wantsSharp && pitchNs.startsWith(searchNoSpace) && pitchNs !== searchNoSpace && pitchNs.includes('#')) {
          return false;
        }
      }

      return (
        titleNs.includes(searchNoSpace) ||
        titleNs.includes(rawNoSpace) ||
        titleChosung.includes(rawNoSpace) ||
        pitchNs.includes(searchNoSpace) ||
        engPitchNs.includes(rawNoSpace) ||
        artistNs.includes(searchNoSpace) ||
        artistChosung.includes(rawNoSpace) ||
        composerNs.includes(searchNoSpace) ||
        composerChosung.includes(rawNoSpace) ||
        tjNs.includes(rawNoSpace) ||
        kyNs.includes(rawNoSpace)
      );
    });
  }

  // 3. Sort
  const sortMode = isPitchSearch ? 'pitch-search-auto' : (sortSelect?.value || 'korean-asc');
  if (pitchNotice) {
    pitchNotice.classList.toggle('hidden', !isPitchSearch);
  }

  list.sort((a, b) => {
    if (sortMode === 'pitch-search-auto' || sortMode === 'pitch-asc') {
      const ra = parsePitchRank(a.pitch);
      const rb = parsePitchRank(b.pitch);
      if (ra.valid !== rb.valid) return ra.valid ? -1 : 1;
      if (ra.semitones !== rb.semitones) return ra.semitones - rb.semitones;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    if (sortMode === 'pitch-desc') {
      const ra = parsePitchRank(a.pitch);
      const rb = parsePitchRank(b.pitch);
      if (ra.valid !== rb.valid) return ra.valid ? -1 : 1;
      if (ra.semitones !== rb.semitones) return rb.semitones - ra.semitones;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    if (sortMode === 'tj-asc') {
      const na = parseInt(String(a.tj_num).replace(/\D/g, ''), 10) || 999999;
      const nb = parseInt(String(b.tj_num).replace(/\D/g, ''), 10) || 999999;
      if (na !== nb) return na - nb;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    if (sortMode === 'ky-asc') {
      const na = parseInt(String(a.ky_num).replace(/\D/g, ''), 10) || 999999;
      const nb = parseInt(String(b.ky_num).replace(/\D/g, ''), 10) || 999999;
      if (na !== nb) return na - nb;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    return (a.title || '').localeCompare(b.title || '', 'ko');
  });

  return list;
}

function buildPitchMarkup(song) {
  const offset = cardKeyOffsets.get(Number(song.id)) || 0;
  const basePitch = song.pitch && song.pitch !== 'X' ? song.pitch : '-';
  const effectivePitch = offset !== 0 && basePitch !== '-' ? shiftKoreanPitch(basePitch, offset) : basePitch;
  const converted = convertPitch(effectivePitch);
  const keyAdvice = getKeyRecommendation(effectivePitch);
  const offsetLabel = offset === 0 ? '' : (offset > 0 ? `+${offset}키` : `${offset}키`);

  return {
    effectivePitch,
    converted,
    keyAdvice,
    offset,
    offsetLabel
  };
}

function formatArtistLine(song) {
  const rawArtist = cleanArtistText(song.artist);
  const rawComposer = cleanArtistText(song.composer);
  const dispArtist = formatArtistDisplay(rawArtist);
  const dispComposer = formatArtistDisplay(rawComposer);

  const hasArtist = dispArtist && dispArtist !== '-';
  const normA = normalizeArtistName(rawArtist);
  const normC = normalizeArtistName(rawComposer);
  const isDuplicate = !dispComposer || dispComposer === '-' || normA === normC || (normA && normC && (normA.includes(normC) || normC.includes(normA)));
  const hasComposer = !isDuplicate;

  if (hasArtist && hasComposer) {
    return `
      <button type="button" class="artist-chip-link artist-main" data-quick-search="${escapeHtml(dispArtist)}" title="가수: ${escapeHtml(rawArtist)} (클릭시 모아보기)">${escapeHtml(dispArtist)}</button>
      <span class="artist-divider">·</span>
      <button type="button" class="artist-chip-link composer" data-quick-search="${escapeHtml(dispComposer)}" title="작곡: ${escapeHtml(rawComposer)} (클릭시 모아보기)">${escapeHtml(dispComposer)}</button>
    `;
  }
  if (hasArtist) {
    return `<button type="button" class="artist-chip-link artist-main is-solo" data-quick-search="${escapeHtml(dispArtist)}" title="가수: ${escapeHtml(rawArtist)} (클릭시 모아보기)">${escapeHtml(dispArtist)}</button>`;
  }
  if (hasComposer) {
    return `<button type="button" class="artist-chip-link composer is-solo" data-quick-search="${escapeHtml(dispComposer)}" title="작곡: ${escapeHtml(rawComposer)} (클릭시 모아보기)">${escapeHtml(dispComposer)}</button>`;
  }
  return `<span class="artist-plain">-</span>`;
}

function renderSongs() {
  const cardList = document.getElementById('cardList');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');
  const resultCount = document.getElementById('resultCount');
  const clearBtn = document.getElementById('clearBtn');
  const searchInput = document.getElementById('searchInput');

  if (clearBtn && searchInput) {
    clearBtn.classList.toggle('hidden', !searchInput.value);
  }

  const filtered = getFilteredAndSortedSongs();
  if (resultCount) {
    resultCount.textContent = filtered.length.toLocaleString();
  }

  if (!cardList) return;

  if (filtered.length === 0) {
    cardList.innerHTML = '';
    emptyState?.classList.remove('hidden');
    if (activeFilter === 'favorites' && favoriteIds.size === 0) {
      if (emptyTitle) emptyTitle.textContent = '아직 찜한 애창곡이 없어요';
      if (emptyDesc) emptyDesc.textContent = '노래 카드 우측 상단의 ♡ 하트를 눌러 나만의 애창곡 리스트를 만들어 보세요!';
    } else {
      if (emptyTitle) emptyTitle.textContent = '조건에 맞는 곡을 찾지 못했어요';
      if (emptyDesc) emptyDesc.textContent = '초성(예: ㅂㅌㅇ), 최고음(예: 3옥 도#, C#5), 또는 필터를 초기화해 보세요.';
    }
    return;
  }

  emptyState?.classList.add('hidden');

  const html = filtered
    .map(song => {
      const { effectivePitch, converted, keyAdvice, offset, offsetLabel } = buildPitchMarkup(song);
      const pitchRank = parsePitchRank(effectivePitch);
      const isHighPitch = pitchRank.valid && pitchRank.score >= 330; // >= 3옥 파
      const isFav = favoriteIds.has(Number(song.id));

      const tjInfo = parseKaraokeNumber(song.tj_num);
      const kyInfo = parseKaraokeNumber(song.ky_num);

      return `
        <article class="song-card ${isHighPitch ? 'high-pitch' : ''}" data-song-id="${song.id}">
          <!-- Row 1: 2-Line Reserved Title Group (Left) + Unified Pitch Stepper & Heart (Right) -->
          <div class="card-top">
            <div class="card-title-group">
              <h3 class="card-title">${formatSongTitle(song.title)}</h3>
            </div>
            <div class="card-top-right">
              <span data-advice-box="${song.id}">
                ${keyAdvice ? `<span class="key-advice-pill ${keyAdvice.isDown ? 'key-down' : ''}">${escapeHtml(keyAdvice.text)}</span>` : ''}
              </span>
              ${effectivePitch !== '-' ? `
              <div class="pitch-stepper-capsule ${offset !== 0 ? 'key-shifted' : ''}" data-pitch-capsule="${song.id}" title="최고음: ${escapeHtml(effectivePitch)} (${escapeHtml(converted)}) · 중앙 클릭시 원키 초기화">
                <button type="button" class="key-step-btn" data-key-step="-1" data-song-id="${song.id}" title="반음 내리기 (♭)" aria-label="반음 내리기">−</button>
                <button type="button" class="pitch-readout-btn" data-key-reset="${song.id}" title="클릭시 원키로 초기화 (${escapeHtml(converted)})">
                  ${offsetLabel ? `<span class="pitch-shift-tag">${escapeHtml(offsetLabel)}</span>` : ''}
                  <strong class="pitch-kor">${escapeHtml(effectivePitch)}</strong>
                </button>
                <button type="button" class="key-step-btn" data-key-step="1" data-song-id="${song.id}" title="반음 올리기 (♯)" aria-label="반음 올리기">+</button>
              </div>
              ` : `<span class="pitch-empty-pill">음역 미상</span>`}
              <button type="button" class="btn-fav-card ${isFav ? 'active' : ''}" data-fav-id="${song.id}" aria-label="애창곡 찜하기" title="내 애창곡 찜하기">
                ${isFav ? '♥' : '♡'}
              </button>
            </div>
          </div>

          <!-- Row 2: Full-Width Artist · Composer (Priority Preserved) -->
          <div class="card-meta-row">
            <div class="card-artist-line">
              ${formatArtistLine(song)}
            </div>
          </div>

          <!-- Row 3: 2-Column Tactile Karaoke Number Buttons with Crisp HD/MR Micro-Pills -->
          <div class="card-numbers">
            <button type="button" class="num-badge tj-num ${tjInfo.disabled}" data-copy="${escapeHtml(tjInfo.cleanNum)}" data-brand="TJ" data-title="${escapeHtml(song.title)}" ${tjInfo.disabled}>
              <span class="brand-tag">TJ</span>
              <span class="num-val">
                <span>${escapeHtml(tjInfo.displayNum)}</span>
                ${tjInfo.suffixTag ? `<span class="num-suffix-pill" title="TJ ${tjInfo.suffixTag} 음원">${tjInfo.suffixTag}</span>` : ''}
              </span>
              <span class="copy-icon" aria-hidden="true">${tjInfo.disabled ? '' : '⧉'}</span>
            </button>
            <button type="button" class="num-badge ky-num ${kyInfo.disabled}" data-copy="${escapeHtml(kyInfo.cleanNum)}" data-brand="KY" data-title="${escapeHtml(song.title)}" ${kyInfo.disabled}>
              <span class="brand-tag">KY</span>
              <span class="num-val">
                <span>${escapeHtml(kyInfo.displayNum)}</span>
                ${kyInfo.suffixTag ? `<span class="num-suffix-pill" title="KY ${kyInfo.suffixTag} 음원">${kyInfo.suffixTag}</span>` : ''}
              </span>
              <span class="copy-icon" aria-hidden="true">${kyInfo.disabled ? '' : '⧉'}</span>
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  cardList.innerHTML = html;
}

/**
 * Update a single song card's unified pitch stepper capsule in-place (60fps, no scroll jump)
 */
function updateCardKeyShiftInPlace(songId, deltaOrReset) {
  const id = Number(songId);
  const song = allSongs.find(s => Number(s.id) === id);
  if (!song) return;

  const current = cardKeyOffsets.get(id) || 0;
  const next = deltaOrReset === 'reset' ? 0 : Math.max(-7, Math.min(7, current + Number(deltaOrReset)));
  if (next === 0) {
    cardKeyOffsets.delete(id);
  } else {
    cardKeyOffsets.set(id, next);
  }

  const cardEl = document.querySelector(`.song-card[data-song-id="${id}"]`);
  if (!cardEl) return;

  const { effectivePitch, converted, keyAdvice, offset, offsetLabel } = buildPitchMarkup(song);
  const pitchRank = parsePitchRank(effectivePitch);
  cardEl.classList.toggle('high-pitch', pitchRank.valid && pitchRank.score >= 330);

  const capsule = cardEl.querySelector(`[data-pitch-capsule="${id}"]`);
  if (capsule) {
    capsule.classList.toggle('key-shifted', offset !== 0);
    capsule.setAttribute('title', `최고음: ${effectivePitch} (${converted}) · 중앙 클릭시 원키 초기화`);
    const readoutBtn = capsule.querySelector(`[data-key-reset="${id}"]`);
    if (readoutBtn) {
      readoutBtn.setAttribute('title', `클릭시 원키로 초기화 (${converted})`);
      readoutBtn.innerHTML = `
        ${offsetLabel ? `<span class="pitch-shift-tag">${escapeHtml(offsetLabel)}</span>` : ''}
        <strong class="pitch-kor">${escapeHtml(effectivePitch)}</strong>
      `;
    }
  }

  const adviceBox = cardEl.querySelector(`[data-advice-box="${id}"]`);
  if (adviceBox) {
    adviceBox.innerHTML = keyAdvice
      ? `<span class="key-advice-pill ${keyAdvice.isDown ? 'key-down' : ''}">${escapeHtml(keyAdvice.text)}</span>`
      : '';
  }
}

/**
 * Render Favorites List & Counters in Header, Inline Bar, and Sidebar
 */
function renderFavoritesUI() {
  const headerFavCount = document.getElementById('headerFavCount');
  const sidebarFavCount = document.getElementById('sidebarFavCount');
  const favListContainer = document.getElementById('favListContainer');
  const favActionsBar = document.getElementById('favActionsBar');

  const count = favoriteIds.size;
  if (headerFavCount) headerFavCount.textContent = String(count);
  if (sidebarFavCount) sidebarFavCount.textContent = `${count}곡`;

  updateContextualInlineBars();

  if (!favListContainer) return;

  const favSongs = allSongs.filter(s => favoriteIds.has(Number(s.id)));
  if (favSongs.length === 0) {
    favListContainer.innerHTML = '<p class="empty-mini-text">아직 찜한 곡이 없어요. 카드 우측 상단의 ♡를 눌러보세요!</p>';
    favActionsBar?.classList.add('hidden');
    return;
  }

  favActionsBar?.classList.remove('hidden');
  favListContainer.innerHTML = favSongs
    .map(s => {
      const shortTitle = s.title.split('(')[0].trim();
      const tj = s.tj_num && s.tj_num !== 'XXX' ? s.tj_num : null;
      const ky = s.ky_num && s.ky_num !== 'XXX' ? s.ky_num : null;
      return `
        <div class="fav-item">
          <span class="fav-item-title" title="${escapeHtml(s.title)}">${escapeHtml(shortTitle)}</span>
          <div class="fav-item-nums">
            ${tj ? `<span class="fav-mini-num tj" data-copy="${escapeHtml(tj)}" data-brand="TJ" data-title="${escapeHtml(shortTitle)}">TJ ${escapeHtml(tj)}</span>` : ''}
            ${ky ? `<span class="fav-mini-num ky" data-copy="${escapeHtml(ky)}" data-brand="KY" data-title="${escapeHtml(shortTitle)}">KY ${escapeHtml(ky)}</span>` : ''}
          </div>
          <button type="button" class="fav-remove-btn" data-remove-fav="${s.id}" title="찜 해제">✕</button>
        </div>
      `;
    })
    .join('');
}

function toggleFavorite(songId) {
  const id = Number(songId);
  if (favoriteIds.has(id)) {
    favoriteIds.delete(id);
    showToast('애창곡 찜 목록에서 제외했어요.');
  } else {
    favoriteIds.add(id);
    showToast('♥ 내 애창곡 찜 목록에 담았어요!');
  }
  try {
    localStorage.setItem('jsong_favorites', JSON.stringify([...favoriteIds]));
  } catch {}
  renderFavoritesUI();
  renderSongs();
}

async function copyAllFavoritesToClipboard() {
  const favSongs = allSongs.filter(s => favoriteIds.has(Number(s.id)));
  if (favSongs.length === 0) {
    showToast('아직 찜한 곡이 없어요!');
    return;
  }
  const textLines = [
    '🎤 [내 일본곡 노래방 애창곡 리스트]',
    ...favSongs.map(s => {
      const tj = s.tj_num && s.tj_num !== 'XXX' ? `TJ ${s.tj_num}` : '';
      const ky = s.ky_num && s.ky_num !== 'XXX' ? `KY ${s.ky_num}` : '';
      const nums = [tj, ky].filter(Boolean).join(' / ');
      return `• ${s.title.split('(')[0].trim()} (${s.pitch}) - ${nums}`;
    }),
    '👉 검색기: https://jsongsearch.vercel.app'
  ];
  await copyTextSafe(textLines.join('\n'));
  showToast('📋 찜한 애창곡 리스트가 복사되었어요! 카톡에 붙여넣기 해보세요.');
}

function clearAllFavorites() {
  favoriteIds.clear();
  try {
    localStorage.setItem('jsong_favorites', '[]');
  } catch {}
  renderFavoritesUI();
  renderSongs();
  showToast('찜 목록을 모두 비웠어요.');
}

/**
 * Render Recently Copied Karaoke Numbers
 */
function renderRecentCopiedUI() {
  const container = document.getElementById('recentCopiedList');
  if (!container) return;
  if (recentCopied.length === 0) {
    container.innerHTML = '<p class="empty-mini-text">아직 복사한 노래방 번호가 없어요.</p>';
    return;
  }
  container.innerHTML = recentCopied
    .map(item => `
      <button type="button" class="recent-chip" data-copy="${escapeHtml(item.num)}" data-brand="${escapeHtml(item.brand)}" data-title="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.brand)}</span>
        <strong>${escapeHtml(item.num)}</strong>
        <span>${escapeHtml(item.title.split('(')[0].trim())}</span>
      </button>
    `)
    .join('');
}

function recordCopiedNumber(brand, num, title) {
  recentCopied = [
    { brand, num, title },
    ...recentCopied.filter(x => !(x.brand === brand && x.num === num))
  ].slice(0, 8);
  try {
    localStorage.setItem('jsong_recent_copied', JSON.stringify(recentCopied));
  } catch {}
  renderRecentCopiedUI();
}

/**
 * Random Song Picker
 */
function pickRandomSong(mode = 'all', openInMain = false) {
  let pool = allSongs;
  if (mode === 'easy') {
    pool = allSongs.filter(s => {
      const r = parsePitchRank(s.pitch);
      return r.valid && r.octave <= 2;
    });
  } else if (mode === 'mid') {
    pool = allSongs.filter(s => {
      const r = parsePitchRank(s.pitch);
      return r.valid && r.score >= 300 && r.score <= 320;
    });
  } else if (mode === 'fav') {
    pool = allSongs.filter(s => favoriteIds.has(Number(s.id)));
  } else if (openInMain) {
    const currentFiltered = getFilteredAndSortedSongs();
    if (currentFiltered.length > 0) pool = currentFiltered;
  }

  if (pool.length === 0) {
    showToast('해당 조건에 맞는 곡이 없어요!');
    return;
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  const box = document.getElementById('randomResultBox');
  if (box) {
    box.classList.remove('hidden');
    const tj = picked.tj_num && picked.tj_num !== 'XXX' ? `TJ ${picked.tj_num}` : 'TJ 미수록';
    const ky = picked.ky_num && picked.ky_num !== 'XXX' ? `KY ${picked.ky_num}` : 'KY 미수록';
    box.innerHTML = `
      <div class="random-result-title">🎉 ${escapeHtml(picked.title)}</div>
      <div class="random-result-meta">${escapeHtml(picked.artist)} · 최고음 ${escapeHtml(picked.pitch)} (${escapeHtml(convertPitch(picked.pitch))})</div>
      <div class="random-result-meta"><strong>${escapeHtml(tj)}</strong> / <strong>${escapeHtml(ky)}</strong></div>
    `;
  }

  if (openInMain) {
    const cardEl = document.querySelector(`.song-card[data-song-id="${picked.id}"]`);
    document.querySelectorAll('.song-card.highlight-picked').forEach(el => el.classList.remove('highlight-picked'));
    if (cardEl) {
      cardEl.classList.add('highlight-picked');
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(`🎲 추천 선곡: ${picked.title.split('(')[0].trim()} (TJ ${picked.tj_num})`);
  }
}

export function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!sidebar || !overlay) return;

  if (open) {
    document.body.classList.add('sidebar-open');
    overlay.classList.remove('hidden');
    overlay.style.display = 'block';
    setTimeout(() => {
      overlay.classList.add('active');
      sidebar.classList.add('active');
      sidebar.setAttribute('aria-hidden', 'false');
    }, 10);
  } else {
    document.body.classList.remove('sidebar-open');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    sidebar.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }, 260);
  }
}

export function toggleVoteForm() {
  const form = document.getElementById('voteForm');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

export function sendToTJ() {
  const titleEl = document.getElementById('v_title');
  const singerEl = document.getElementById('v_singer');
  const t = encodeURIComponent((titleEl?.value || '').trim());
  const s = encodeURIComponent((singerEl?.value || '').trim());
  if (!t && !s) {
    showToast('신청할 노래 제목이나 가수를 입력해주세요!');
    return;
  }
  window.open(
    `https://www.tjmedia.com/song/accompaniment_apply?pageNo=1&dt_code=30&singer=${s}&title=${t}`,
    '_blank',
    'noopener,noreferrer'
  );
}

window.toggleSidebar = toggleSidebar;
window.toggleVoteForm = toggleVoteForm;
window.sendToTJ = sendToTJ;

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 220);
  }, 2200);
}

function handleComfortPitchChange(newPitch) {
  myComfortPitch = newPitch || '';
  try {
    localStorage.setItem('jsong_my_pitch', myComfortPitch);
  } catch {}
  syncPitchSelects();
  renderSongs();
  if (myComfortPitch) {
    showToast(`🎯 내 최고음(${myComfortPitch}) 기준으로 맞춤 키가 표시됩니다!`);
  }
}

async function initApp() {
  loadUserPreferences();

  const skeleton = document.getElementById('loadingSkeleton');
  const badgeSongCount = document.getElementById('badgeSongCount');
  const badgeLastSync = document.getElementById('badgeLastSync');
  const sidebarLastSync = document.getElementById('sidebarLastSync');
  const sidebarTotalSongs = document.getElementById('sidebarTotalSongs');

  syncPitchSelects();

  try {
    let res = await fetch('./data/songs.json');
    if (!res.ok) {
      res = await fetch('/api/songs');
    }
    allSongs = await res.json();
  } catch (err) {
    console.error('Failed to load songs:', err);
    allSongs = [];
  } finally {
    skeleton?.classList.add('hidden');
  }

  if (badgeSongCount) badgeSongCount.textContent = `총 ${allSongs.length.toLocaleString()}곡`;
  if (sidebarTotalSongs) sidebarTotalSongs.textContent = `${allSongs.length.toLocaleString()}곡`;

  try {
    const metaRes = await fetch('./data/sync-meta.json');
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.lastSyncedAt) {
        const dt = new Date(meta.lastSyncedAt);
        const formatted = dt.toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        if (badgeLastSync) badgeLastSync.textContent = `동기화: ${formatted}`;
        if (sidebarLastSync) sidebarLastSync.textContent = formatted;
      }
    }
  } catch {
    if (sidebarLastSync) sidebarLastSync.textContent = '확인 불가';
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('search');
  const searchInput = document.getElementById('searchInput');
  if (initialQuery && searchInput) {
    searchInput.value = initialQuery;
  }

  renderFavoritesUI();
  renderRecentCopiedUI();
  renderSongs();
  bindEvents();
}

function bindEvents() {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  const sortSelect = document.getElementById('sortSelect');
  const filterChips = document.getElementById('filterChips');
  const filterChipsScroll = document.getElementById('filterChipsScroll');
  const chipScrollLeft = document.getElementById('chipScrollLeft');
  const chipScrollRight = document.getElementById('chipScrollRight');
  const machineModeGroup = document.getElementById('machineModeGroup');
  const brandBtn = document.getElementById('brandBtn');
  const emptyResetBtn = document.getElementById('emptyResetBtn');
  const menuBtn = document.getElementById('menuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const overlay = document.getElementById('overlay');
  const tjGoBtn = document.getElementById('tjGoBtn');
  const voteToggleBtn = document.getElementById('voteToggleBtn');
  const cardList = document.getElementById('cardList');
  const producerTags = document.getElementById('producerTags');
  const triggerSyncBtn = document.getElementById('triggerSyncBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const headerFavBtn = document.getElementById('headerFavBtn');
  const myPitchSelect = document.getElementById('myPitchSelect');
  const inlinePitchSelect = document.getElementById('inlinePitchSelect');
  const myRangeActiveBadge = document.getElementById('myRangeActiveBadge');
  const filterMyRangeBtn = document.getElementById('filterMyRangeBtn');
  const copyAllFavsBtn = document.getElementById('copyAllFavsBtn');
  const clearAllFavsBtn = document.getElementById('clearAllFavsBtn');
  const inlineCopyFavsBtn = document.getElementById('inlineCopyFavsBtn');
  const inlineClearFavsBtn = document.getElementById('inlineClearFavsBtn');
  const favListContainer = document.getElementById('favListContainer');
  const recentCopiedList = document.getElementById('recentCopiedList');
  const quickRandomBtn = document.getElementById('quickRandomBtn');
  const shareSiteBtn = document.getElementById('shareSiteBtn');
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  // Dismiss mobile/iOS virtual keyboard on Search Enter
  searchForm?.addEventListener('submit', e => {
    e.preventDefault();
    searchInput?.blur();
    renderSongs();
  });

  searchInput?.addEventListener('input', () => renderSongs());

  clearBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      renderSongs();
    }
  });

  sortSelect?.addEventListener('change', () => renderSongs());

  // Desktop horizontal scroll via mouse wheel & arrow buttons on filter chips
  const updateChipArrows = () => {
    if (!filterChipsScroll || !chipScrollLeft || !chipScrollRight) return;
    const maxScroll = filterChipsScroll.scrollWidth - filterChipsScroll.clientWidth;
    chipScrollLeft.classList.toggle('hidden', filterChipsScroll.scrollLeft <= 8);
    chipScrollRight.classList.toggle('hidden', filterChipsScroll.scrollLeft >= maxScroll - 8);
  };

  filterChipsScroll?.addEventListener('scroll', updateChipArrows, { passive: true });
  window.addEventListener('resize', updateChipArrows, { passive: true });
  setTimeout(updateChipArrows, 100);

  filterChipsScroll?.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      filterChipsScroll.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  chipScrollLeft?.addEventListener('click', () => {
    filterChipsScroll?.scrollBy({ left: -240, behavior: 'smooth' });
  });

  chipScrollRight?.addEventListener('click', () => {
    filterChipsScroll?.scrollBy({ left: 240, behavior: 'smooth' });
  });

  filterChips?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || 'all';
    renderSongs();
    if (activeFilter === 'my-range' && !myComfortPitch) {
      document.getElementById('inlinePitchSelect')?.focus();
      showToast('👇 바로 아래에서 내 편한 최고음을 선택해 보세요!');
    }
  });

  // Karaoke Machine Mode Toggle (전체 / TJ / 금영)
  machineModeGroup?.addEventListener('click', e => {
    const btn = e.target.closest('.machine-btn');
    if (!btn) return;
    machineMode = btn.dataset.machine || 'all';
    machineModeGroup.querySelectorAll('.machine-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.body.setAttribute('data-machine-mode', machineMode);
    renderSongs();
    if (machineMode === 'tj') showToast('🎤 TJ 노래방 수록곡 모드로 전환되었어요.');
    if (machineMode === 'ky') showToast('🎶 금영(KY) 노래방 수록곡 모드로 전환되었어요.');
  });

  headerFavBtn?.addEventListener('click', () => {
    activeFilter = activeFilter === 'favorites' ? 'all' : 'favorites';
    filterChips?.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === activeFilter);
    });
    renderSongs();
  });

  themeToggleBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'soft-light';
    applyTheme(current === 'soft-dark' ? 'soft-light' : 'soft-dark');
  });

  myRangeActiveBadge?.addEventListener('click', () => {
    activeFilter = 'my-range';
    filterChips?.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === 'my-range');
    });
    renderSongs();
  });

  myPitchSelect?.addEventListener('change', () => {
    handleComfortPitchChange(myPitchSelect.value);
  });

  inlinePitchSelect?.addEventListener('change', () => {
    handleComfortPitchChange(inlinePitchSelect.value);
  });

  filterMyRangeBtn?.addEventListener('click', () => {
    if (!myComfortPitch) {
      showToast('위 드롭다운에서 내 최고음을 먼저 선택해주세요!');
      return;
    }
    activeFilter = 'my-range';
    filterChips?.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === 'my-range');
    });
    renderSongs();
    toggleSidebar(false);
  });

  const resetAll = () => {
    if (searchInput) searchInput.value = '';
    activeFilter = 'all';
    machineMode = 'all';
    cardKeyOffsets.clear();
    document.body.removeAttribute('data-machine-mode');
    machineModeGroup?.querySelectorAll('.machine-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.machine === 'all');
    });
    filterChips?.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === 'all');
    });
    if (sortSelect) sortSelect.value = 'korean-asc';
    renderSongs();
  };

  brandBtn?.addEventListener('click', resetAll);
  emptyResetBtn?.addEventListener('click', resetAll);

  menuBtn?.addEventListener('click', () => toggleSidebar(true));
  sidebarCloseBtn?.addEventListener('click', () => toggleSidebar(false));
  overlay?.addEventListener('click', () => toggleSidebar(false));
  voteToggleBtn?.addEventListener('click', () => toggleVoteForm());
  tjGoBtn?.addEventListener('click', () => sendToTJ());

  quickRandomBtn?.addEventListener('click', () => pickRandomSong('all', true));

  document.querySelectorAll('.random-pick-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      pickRandomSong(btn.dataset.mode || 'all', false);
    });
  });

  producerTags?.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const query = btn.dataset.producer || '';
    if (searchInput) {
      searchInput.value = query;
      activeFilter = 'all';
      filterChips?.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === 'all');
      });
      renderSongs();
      toggleSidebar(false);
    }
  });

  // Card Interactions: Favorites, Unified Key Stepper, Quick Artist Filter, and Number Copy
  cardList?.addEventListener('click', async e => {
    const favBtn = e.target.closest('.btn-fav-card');
    if (favBtn) {
      toggleFavorite(favBtn.dataset.favId);
      return;
    }

    const keyStepBtn = e.target.closest('[data-key-step]');
    if (keyStepBtn) {
      updateCardKeyShiftInPlace(keyStepBtn.dataset.songId, Number(keyStepBtn.dataset.keyStep));
      return;
    }

    const keyResetBtn = e.target.closest('[data-key-reset]');
    if (keyResetBtn) {
      updateCardKeyShiftInPlace(keyResetBtn.dataset.keyReset, 'reset');
      return;
    }

    const quickSearchBtn = e.target.closest('[data-quick-search]');
    if (quickSearchBtn) {
      const q = (quickSearchBtn.dataset.quickSearch || '').trim();
      if (q && q !== '-' && searchInput) {
        searchInput.value = q;
        activeFilter = 'all';
        filterChips?.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.dataset.filter === 'all');
        });
        renderSongs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`🔎 '${q}' 관련 곡을 모아봅니다.`);
      }
      return;
    }

    const badge = e.target.closest('.num-badge');
    if (!badge || badge.classList.contains('disabled')) return;
    const rawNum = badge.dataset.copy || '';
    const brand = badge.dataset.brand || 'TJ';
    const title = badge.dataset.title || '';
    const cleanNum = rawNum.replace(/[ⓗⓢ]/g, '').trim();
    if (!cleanNum || cleanNum === 'XXX') return;

    const ok = await copyTextSafe(cleanNum);
    recordCopiedNumber(brand, cleanNum, title);

    // Visual feedback on the clicked button itself
    const iconEl = badge.querySelector('.copy-icon');
    badge.classList.add('copied');
    if (iconEl) iconEl.textContent = '✓ 복사됨';
    setTimeout(() => {
      badge.classList.remove('copied');
      if (iconEl) iconEl.textContent = '⧉';
    }, 1200);

    showToast(ok ? `${brand} 노래방 번호 [${cleanNum}] 복사 완료!` : `번호: ${cleanNum}`);
  });

  favListContainer?.addEventListener('click', async e => {
    const rmBtn = e.target.closest('[data-remove-fav]');
    if (rmBtn) {
      toggleFavorite(rmBtn.dataset.removeFav);
      return;
    }
    const copyEl = e.target.closest('[data-copy]');
    if (copyEl) {
      const cleanNum = (copyEl.dataset.copy || '').replace(/[ⓗⓢ]/g, '').trim();
      await copyTextSafe(cleanNum);
      showToast(`${copyEl.dataset.brand || ''} [${cleanNum}] 복사 완료!`);
    }
  });

  recentCopiedList?.addEventListener('click', async e => {
    const chip = e.target.closest('[data-copy]');
    if (!chip) return;
    const cleanNum = (chip.dataset.copy || '').replace(/[ⓗⓢ]/g, '').trim();
    await copyTextSafe(cleanNum);
    showToast(`${chip.dataset.brand || ''} [${cleanNum}] 다시 복사 완료!`);
  });

  copyAllFavsBtn?.addEventListener('click', copyAllFavoritesToClipboard);
  inlineCopyFavsBtn?.addEventListener('click', copyAllFavoritesToClipboard);

  clearAllFavsBtn?.addEventListener('click', clearAllFavorites);
  inlineClearFavsBtn?.addEventListener('click', clearAllFavorites);

  shareSiteBtn?.addEventListener('click', async () => {
    const shareData = {
      title: '일본곡 노래방 검색기 · TJ/금영 번호 & 최고음',
      text: 'J-POP · 애니송 · 보컬로이드 400+곡의 TJ/금영 번호와 최고음, 내 음역대 맞춤 키 계산기!',
      url: 'https://jsongsearch.vercel.app/'
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyTextSafe(shareData.url);
        showToast('🔗 사이트 주소가 복사되었어요! 카톡이나 인스타에 붙여넣어 보세요.');
      }
    } catch {}
  });

  triggerSyncBtn?.addEventListener('click', async () => {
    const feedback = document.getElementById('syncFeedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      feedback.textContent = '최신 동기화 상태를 확인하고 있습니다...';
    }
    try {
      const res = await fetch('/api/songs?meta=true');
      const meta = await res.json();
      const when = meta.lastSyncedAt ? new Date(meta.lastSyncedAt).toLocaleDateString('ko-KR') : '기록 없음';
      if (feedback) feedback.textContent = `마지막 갱신 ${when} · 총 ${allSongs.length}곡`;
    } catch {
      if (feedback) feedback.textContent = `총 ${allSongs.length}곡`;
    }
  });

  // Floating Scroll-to-Top Button
  window.addEventListener('scroll', () => {
    if (!scrollTopBtn) return;
    scrollTopBtn.classList.toggle('hidden', window.scrollY < 380);
  }, { passive: true });

  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Global Keyboard Shortcuts (PC UX: '/' or Ctrl+K to search, Escape to close menu)
  window.addEventListener('keydown', e => {
    const sidebar = document.getElementById('sidebar');
    if (e.key === 'Escape') {
      if (sidebar?.classList.contains('active')) {
        toggleSidebar(false);
        return;
      }
      if (document.activeElement === searchInput && searchInput?.value) {
        searchInput.value = '';
        renderSongs();
      }
      return;
    }

    const isInputFocused = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
    if ((e.key === '/' && !isInputFocused) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
