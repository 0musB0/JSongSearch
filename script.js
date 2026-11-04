/**
 * 일본곡 노래방 검색기 - Soft & Cozy Frontend Application
 * Features:
 * - convertPitch("3옥 도#" -> "C#5") & semitone calculator
 * - Korean Initial Consonant (초성: ㅂㅌㅇ -> 베텔기우스, ㅊㅂㅇ -> 천본앵) search
 * - My Vocal Range Key Calculator (원키 가능 / -2키 추천 등 자동 계산)
 * - Favorites / Karaoke Bookmark List (찜 목록 + 카톡 일괄 복사)
 * - Random Song Roulette & Recently Copied Numbers History
 * - Soft Light / Cozy Dark Theme Switcher
 */

const NOTE_MAP = { '도': 'C', '레': 'D', '미': 'E', '파': 'F', '솔': 'G', '라': 'A', '시': 'B' };
const NOTE_MAP_REV = { 'C': '도', 'D': '레', 'E': '미', 'F': '파', 'G': '솔', 'A': '라', 'B': '시' };
const NOTE_ORDER = ['도', '레', '미', '파', '솔', '라', '시'];
const SEMITONE_OFFSET = { '도': 0, '레': 2, '미': 4, '파': 5, '솔': 7, '라': 9, '시': 11 };

const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

let allSongs = [];
let activeFilter = 'all';
let toastTimer = null;
let favoriteIds = new Set();
let recentCopied = [];
let myComfortPitch = '';

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
  const score = octave * 100 + (noteIdx >= 0 ? noteIdx * 10 : 90) + sharp;
  const semitones = (octave + 2) * 12 + (SEMITONE_OFFSET[noteKor] ?? 0) + sharp;
  return { valid: true, octave, noteIdx, sharp, score, semitones };
}

/**
 * Compute recommended karaoke key adjustment relative to user's comfort pitch
 */
function getKeyRecommendation(songPitch) {
  if (!myComfortPitch) return null;
  const userRank = parsePitchRank(myComfortPitch);
  const songRank = parsePitchRank(songPitch);
  if (!userRank.valid || !songRank.valid) return null;

  const diff = userRank.semitones - songRank.semitones;
  if (diff >= 0 && diff <= 2) {
    return { text: '원키 딱 맞음 ✨', isDown: false };
  }
  if (diff > 2) {
    return { text: `원키 여유 (+${Math.min(diff, 6)}키 가능)`, isDown: false };
  }
  // Song is higher than user's comfort pitch
  const downKey = Math.max(diff, -8);
  return { text: `${downKey}키 추천`, isDown: true };
}

function formatSongTitle(title) {
  const safe = escapeHtml(title);
  const idx = safe.indexOf('(');
  if (idx > 0 && safe.endsWith(')')) {
    const main = safe.slice(0, idx).trim();
    const sub = safe.slice(idx);
    return `${main}<span class="sub-title">${sub}</span>`;
  }
  return safe;
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

function getFilteredAndSortedSongs() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const pitchNotice = document.getElementById('pitchSortNotice');
  const myRangeBadge = document.getElementById('myRangeActiveBadge');

  const { trimmed, isPitchSearch, searchNoSpace } = normalizeSearchQuery(searchInput?.value || '');

  if (myRangeBadge) {
    myRangeBadge.classList.toggle('hidden', !myComfortPitch);
    if (myComfortPitch) {
      myRangeBadge.textContent = `🎯 내 최고음(${myComfortPitch}) 맞춤 키 표시 중`;
    }
  }

  // 1. Apply quick filter chip
  let list = allSongs.filter(song => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'favorites') {
      return favoriteIds.has(Number(song.id));
    }
    if (activeFilter === 'my-range') {
      if (!myComfortPitch) return true;
      const u = parsePitchRank(myComfortPitch);
      const s = parsePitchRank(song.pitch);
      return u.valid && s.valid && s.semitones <= u.semitones + 1 && s.semitones >= u.semitones - 5;
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
    if (activeFilter === 'has-tj') {
      return song.tj_num && song.tj_num !== 'XXX' && song.tj_num !== '-';
    }
    if (activeFilter === 'has-ky') {
      return song.ky_num && song.ky_num !== 'XXX' && song.ky_num !== '-';
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
      if (ra.score !== rb.score) return ra.score - rb.score;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    if (sortMode === 'pitch-desc') {
      const ra = parsePitchRank(a.pitch);
      const rb = parsePitchRank(b.pitch);
      if (ra.valid !== rb.valid) return ra.valid ? -1 : 1;
      if (ra.score !== rb.score) return rb.score - ra.score;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    if (sortMode === 'tj-asc') {
      const na = parseInt(String(a.tj_num).replace(/\D/g, ''), 10) || 999999;
      const nb = parseInt(String(b.tj_num).replace(/\D/g, ''), 10) || 999999;
      if (na !== nb) return na - nb;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    }
    return (a.title || '').localeCompare(b.title || '', 'ko');
  });

  return list;
}

function renderSongs() {
  const cardList = document.getElementById('cardList');
  const emptyState = document.getElementById('emptyState');
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
    return;
  }

  emptyState?.classList.add('hidden');

  const html = filtered
    .map(song => {
      const converted = convertPitch(song.pitch);
      const korPitch = song.pitch && song.pitch !== 'X' ? song.pitch : '-';
      const pitchRank = parsePitchRank(song.pitch);
      const isHighPitch = pitchRank.valid && pitchRank.score >= 330; // >= 3옥 파
      const isFav = favoriteIds.has(Number(song.id));
      const keyAdvice = getKeyRecommendation(song.pitch);

      const tjDisplay = song.tj_num && song.tj_num !== 'XXX' ? escapeHtml(song.tj_num) : '미수록';
      const kyDisplay = song.ky_num && song.ky_num !== 'XXX' ? escapeHtml(song.ky_num) : '미수록';
      const tjDisabled = tjDisplay === '미수록' ? 'disabled' : '';
      const kyDisabled = kyDisplay === '미수록' ? 'disabled' : '';

      return `
        <article class="song-card ${isHighPitch ? 'high-pitch' : ''}" data-song-id="${song.id}">
          <div class="card-top">
            <div class="card-title-group">
              <div class="card-title">${formatSongTitle(song.title)}</div>
            </div>
            <div class="card-top-right">
              <div class="card-pitch" title="최고음: ${escapeHtml(korPitch)} (${escapeHtml(converted)})">
                <span class="pitch-label">${korPitch !== '-' ? escapeHtml(korPitch) : '최고음'}</span>
                <strong>${escapeHtml(converted)}</strong>
                ${keyAdvice ? `<span class="key-advice-pill ${keyAdvice.isDown ? 'key-down' : ''}">${escapeHtml(keyAdvice.text)}</span>` : ''}
              </div>
              <button type="button" class="btn-fav-card ${isFav ? 'active' : ''}" data-fav-id="${song.id}" aria-label="애창곡 찜하기" title="내 애창곡 찜 목록에 추가/제거">
                ${isFav ? '♥' : '♡'}
              </button>
            </div>
          </div>
          <div class="card-bottom">
            <div class="card-info">
              <span class="info-label">부른이</span>
              <span class="info-val">${escapeHtml(song.artist || '-')}</span>
              <span class="info-label">작곡가</span>
              <span class="info-val">${escapeHtml(song.composer || '-')}</span>
            </div>
            <div class="card-numbers">
              <button type="button" class="num-badge tj-badge tj-num ${tjDisabled}" data-copy="${escapeHtml(song.tj_num)}" data-brand="TJ" data-title="${escapeHtml(song.title)}" ${tjDisabled}>
                <span class="brand-tag">TJ</span>
                <span class="num-val">${tjDisplay}</span>
                <span class="copy-icon">📋</span>
              </button>
              <button type="button" class="num-badge ky-badge ky-num ${kyDisabled}" data-copy="${escapeHtml(song.ky_num)}" data-brand="KY" data-title="${escapeHtml(song.title)}" ${kyDisabled}>
                <span class="brand-tag">KY</span>
                <span class="num-val">${kyDisplay}</span>
                <span class="copy-icon">📋</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  cardList.innerHTML = html;
}

/**
 * Render Favorites List & Counters in Header and Sidebar
 */
function renderFavoritesUI() {
  const headerFavCount = document.getElementById('headerFavCount');
  const sidebarFavCount = document.getElementById('sidebarFavCount');
  const favListContainer = document.getElementById('favListContainer');
  const favActionsBar = document.getElementById('favActionsBar');

  const count = favoriteIds.size;
  if (headerFavCount) headerFavCount.textContent = String(count);
  if (sidebarFavCount) sidebarFavCount.textContent = `${count}곡`;

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
    overlay.classList.remove('hidden');
    overlay.style.display = 'block';
    setTimeout(() => {
      overlay.classList.add('active');
      sidebar.classList.add('active');
      sidebar.setAttribute('aria-hidden', 'false');
    }, 10);
  } else {
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

async function initApp() {
  loadUserPreferences();

  const skeleton = document.getElementById('loadingSkeleton');
  const badgeSongCount = document.getElementById('badgeSongCount');
  const badgeLastSync = document.getElementById('badgeLastSync');
  const sidebarLastSync = document.getElementById('sidebarLastSync');
  const sidebarTotalSongs = document.getElementById('sidebarTotalSongs');
  const myPitchSelect = document.getElementById('myPitchSelect');

  if (myPitchSelect && myComfortPitch) {
    myPitchSelect.value = myComfortPitch;
  }

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

  if (badgeSongCount) badgeSongCount.textContent = `총 ${allSongs.length.toLocaleString()}곡 수록`;
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
    if (sidebarLastSync) sidebarLastSync.textContent = '매일 10:00 KST';
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
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  const sortSelect = document.getElementById('sortSelect');
  const filterChips = document.getElementById('filterChips');
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
  const filterMyRangeBtn = document.getElementById('filterMyRangeBtn');
  const copyAllFavsBtn = document.getElementById('copyAllFavsBtn');
  const clearAllFavsBtn = document.getElementById('clearAllFavsBtn');
  const favListContainer = document.getElementById('favListContainer');
  const recentCopiedList = document.getElementById('recentCopiedList');
  const quickRandomBtn = document.getElementById('quickRandomBtn');
  const shareSiteBtn = document.getElementById('shareSiteBtn');

  searchInput?.addEventListener('input', () => renderSongs());

  clearBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      renderSongs();
    }
  });

  sortSelect?.addEventListener('change', () => renderSongs());

  filterChips?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.filter === 'my-range' && !myComfortPitch) {
      toggleSidebar(true);
      showToast('먼저 메뉴에서 내 최고음을 선택해주세요!');
      return;
    }
    filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || 'all';
    renderSongs();
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

  myPitchSelect?.addEventListener('change', () => {
    myComfortPitch = myPitchSelect.value || '';
    try {
      localStorage.setItem('jsong_my_pitch', myComfortPitch);
    } catch {}
    renderSongs();
    if (myComfortPitch) {
      showToast(`내 최고음(${myComfortPitch}) 기준으로 추천 키(Key)가 표시됩니다!`);
    }
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

  cardList?.addEventListener('click', async e => {
    const favBtn = e.target.closest('.btn-fav-card');
    if (favBtn) {
      toggleFavorite(favBtn.dataset.favId);
      return;
    }

    const badge = e.target.closest('.num-badge');
    if (!badge || badge.classList.contains('disabled')) return;
    const rawNum = badge.dataset.copy || '';
    const brand = badge.dataset.brand || 'TJ';
    const title = badge.dataset.title || '';
    const cleanNum = rawNum.replace(/[ⓗⓢ]/g, '').trim();
    if (!cleanNum || cleanNum === 'XXX') return;
    try {
      await navigator.clipboard.writeText(cleanNum);
      recordCopiedNumber(brand, cleanNum, title);
      showToast(`${brand} 노래방 번호 [${cleanNum}] 복사 완료!`);
    } catch {
      showToast(`번호: ${cleanNum}`);
    }
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
      await navigator.clipboard.writeText(cleanNum);
      showToast(`${copyEl.dataset.brand || ''} [${cleanNum}] 복사 완료!`);
    }
  });

  recentCopiedList?.addEventListener('click', async e => {
    const chip = e.target.closest('[data-copy]');
    if (!chip) return;
    const cleanNum = (chip.dataset.copy || '').replace(/[ⓗⓢ]/g, '').trim();
    await navigator.clipboard.writeText(cleanNum);
    showToast(`${chip.dataset.brand || ''} [${cleanNum}] 다시 복사 완료!`);
  });

  copyAllFavsBtn?.addEventListener('click', async () => {
    const favSongs = allSongs.filter(s => favoriteIds.has(Number(s.id)));
    if (favSongs.length === 0) return;
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
    try {
      await navigator.clipboard.writeText(textLines.join('\n'));
      showToast('📋 찜한 애창곡 리스트가 복사되었어요! 카톡에 붙여넣기 해보세요.');
    } catch {}
  });

  clearAllFavsBtn?.addEventListener('click', () => {
    favoriteIds.clear();
    try {
      localStorage.setItem('jsong_favorites', '[]');
    } catch {}
    renderFavoritesUI();
    renderSongs();
    showToast('찜 목록을 모두 비웠어요.');
  });

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
        await navigator.clipboard.writeText(shareData.url);
        showToast('🔗 사이트 주소가 복사되었어요! 카톡이나 인스타에 붙여넣어 보세요.');
      }
    } catch {}
  });

  triggerSyncBtn?.addEventListener('click', async () => {
    const feedback = document.getElementById('syncFeedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      feedback.textContent = '나무위키 신곡 목록을 확인하고 있습니다 (Gemini 3.8 Flash)...';
    }
    try {
      const res = await fetch('/api/cron-sync');
      const data = await res.json();
      if (data.success) {
        if (feedback) {
          feedback.textContent = `동기화 완료! (총 ${data.data?.totalSongs || allSongs.length}곡, 신규 추가: ${data.data?.newlyAddedCount || 0}곡)`;
        }
      } else {
        if (feedback) feedback.textContent = `동기화 완료 (현재 최신 상태: ${allSongs.length}곡)`;
      }
    } catch {
      if (feedback) feedback.textContent = `로컬 최신 데이터 유지 중 (총 ${allSongs.length}곡)`;
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
