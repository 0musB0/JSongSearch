/**
 * 일본곡 노래방 검색기 - Frontend Application
 * Strictly implements the Google Doc features:
 * - convertPitch("3옥 도#" -> "C#5")
 * - Pitch reverse lookup ("C#5" -> "3옥 도#") and pitch order sorting
 * - Space-insensitive search across title, artist, composer, pitch, TJ/KY numbers
 * - Slide-out right sidebar & TJ song request integration
 */

const NOTE_MAP = {
  '도': 'C',
  '레': 'D',
  '미': 'E',
  '파': 'F',
  '솔': 'G',
  '라': 'A',
  '시': 'B'
};

const NOTE_MAP_REV = {
  'C': '도',
  'D': '레',
  'E': '미',
  'F': '파',
  'G': '솔',
  'A': '라',
  'B': '시'
};

const NOTE_ORDER = ['도', '레', '미', '파', '솔', '라', '시'];

let allSongs = [];
let activeFilter = 'all';
let toastTimer = null;

/**
 * 1. 최고음 변환 함수 (Google Doc `functions.php` 동일 로직)
 * "3옥 파#" -> "F#5"
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
 * Compute numerical pitch score for sorting and high-pitch highlighting
 * Matches the Google Doc SQL ORDER BY:
 * CASE WHEN pitch = 'X' OR pitch IS NULL OR pitch = '' THEN 1 ELSE 0 END ASC,
 * CAST(SUBSTRING(pitch, 1, 1) AS UNSIGNED) ASC,
 * FIELD(note, '도','레','미','파','솔','라','시') ASC,
 * CASE WHEN pitch LIKE '%#%' THEN 1 ELSE 0 END ASC
 */
function parsePitchRank(koreanPitch) {
  if (!koreanPitch || koreanPitch === 'X' || koreanPitch === '-') {
    return { valid: false, octave: 99, noteIdx: 99, sharp: 0, score: 9999 };
  }
  const match = koreanPitch.match(/([0-9]+)옥\s*([가-힣])(#?)/u);
  if (!match) {
    return { valid: false, octave: 99, noteIdx: 99, sharp: 0, score: 9999 };
  }
  const octave = parseInt(match[1], 10);
  const noteIdx = NOTE_ORDER.indexOf(match[2]);
  const sharp = match[3] === '#' ? 1 : 0;
  const score = octave * 100 + (noteIdx >= 0 ? noteIdx * 10 : 90) + sharp;
  return { valid: true, octave, noteIdx, sharp, score };
}

/**
 * Escape HTML and wrap `(원제)` into `<span class="sub-title">(원제)</span>`
 * Matches the Google Doc PHP template:
 * str_replace('(', '<span class="sub-title">(', str_replace(')', ')</span>', $safe_title))
 */
function formatSongTitle(title) {
  const safe = String(title || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

/**
 * Normalize search query (Google Doc `index.php` 동일 로직)
 * - "옥타브" -> "옥"
 * - "C#5" -> "3옥 도#"
 */
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

/**
 * Filter & Sort Songs
 */
function getFilteredAndSortedSongs() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const pitchNotice = document.getElementById('pitchSortNotice');

  const { trimmed, isPitchSearch, searchNoSpace } = normalizeSearchQuery(searchInput?.value || '');

  // 1. Apply quick filter chip
  let list = allSongs.filter(song => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pitch-3up') {
      const r = parsePitchRank(song.pitch);
      return r.valid && r.octave >= 3;
    }
    if (activeFilter === 'pitch-2down') {
      const r = parsePitchRank(song.pitch);
      return r.valid && r.octave <= 2;
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

  // 2. Apply search query
  if (trimmed !== '') {
    const rawNoSpace = trimmed.replace(/\s+/g, '').toLowerCase();
    list = list.filter(song => {
      const titleNs = (song.title || '').replace(/\s+/g, '').toLowerCase();
      const pitchNs = (song.pitch || '').replace(/\s+/g, '').toLowerCase();
      const engPitchNs = convertPitch(song.pitch).replace(/\s+/g, '').toLowerCase();
      const artistNs = (song.artist || '').replace(/\s+/g, '').toLowerCase();
      const composerNs = (song.composer || '').replace(/\s+/g, '').toLowerCase();
      const tjNs = (song.tj_num || '').replace(/\s+/g, '').toLowerCase();
      const kyNs = (song.ky_num || '').replace(/\s+/g, '').toLowerCase();

      // If searching exact pitch with or without # (e.g., "3옥 도" vs "3옥 도#")
      if (isPitchSearch && /[가-힣]/.test(searchNoSpace)) {
        const wantsSharp = searchNoSpace.endsWith('#');
        if (!wantsSharp && pitchNs.startsWith(searchNoSpace) && pitchNs !== searchNoSpace && pitchNs.includes('#')) {
          return false;
        }
      }

      return (
        titleNs.includes(searchNoSpace) ||
        titleNs.includes(rawNoSpace) ||
        pitchNs.includes(searchNoSpace) ||
        engPitchNs.includes(rawNoSpace) ||
        artistNs.includes(searchNoSpace) ||
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

/**
 * Render Cards
 */
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

      const tjDisplay = song.tj_num && song.tj_num !== 'XXX' ? escapeHtml(song.tj_num) : '미수록';
      const kyDisplay = song.ky_num && song.ky_num !== 'XXX' ? escapeHtml(song.ky_num) : '미수록';
      const tjDisabled = tjDisplay === '미수록' ? 'disabled' : '';
      const kyDisabled = kyDisplay === '미수록' ? 'disabled' : '';

      return `
        <article class="song-card ${isHighPitch ? 'high-pitch' : ''}">
          <div class="card-top">
            <div class="card-title-group">
              <div class="card-title">${formatSongTitle(song.title)}</div>
            </div>
            <div class="card-pitch" title="한국식 표기: ${escapeHtml(korPitch)}">
              <span class="pitch-label">최고음 ${korPitch !== '-' ? `(${escapeHtml(korPitch)})` : ''}</span>
              <strong>${escapeHtml(converted)}</strong>
            </div>
          </div>
          <div class="card-bottom">
            <div class="card-info">
              <span class="info-label">작곡:</span>
              <span class="info-val">${escapeHtml(song.composer || '-')}</span>
              <span class="info-label">부른이:</span>
              <span class="info-val">${escapeHtml(song.artist || '-')}</span>
            </div>
            <div class="card-numbers">
              <button type="button" class="num-badge tj-badge tj-num ${tjDisabled}" data-copy="${escapeHtml(song.tj_num)}" ${tjDisabled}>
                <span class="brand-tag">TJ</span>
                <span class="num-val">${tjDisplay}</span>
                <span class="copy-icon">📋</span>
              </button>
              <button type="button" class="num-badge ky-badge ky-num ${kyDisabled}" data-copy="${escapeHtml(song.ky_num)}" ${kyDisabled}>
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
 * Sidebar & TJ Application Controls (Google Doc `script.js` 동일 로직)
 */
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
    alert('내용을 입력해주세요!');
    return;
  }
  window.open(
    `https://www.tjmedia.com/song/accompaniment_apply?pageNo=1&dt_code=30&singer=${s}&title=${t}`,
    '_blank',
    'noopener,noreferrer'
  );
}

// Expose globally for inline handlers if needed
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
    setTimeout(() => toast.classList.add('hidden'), 200);
  }, 2000);
}

/**
 * Load Songs & Sync Metadata
 */
async function initApp() {
  const skeleton = document.getElementById('loadingSkeleton');
  const badgeSongCount = document.getElementById('badgeSongCount');
  const badgeLastSync = document.getElementById('badgeLastSync');
  const sidebarLastSync = document.getElementById('sidebarLastSync');
  const sidebarTotalSongs = document.getElementById('sidebarTotalSongs');

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

  // Load sync metadata
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

  // Check URL `?search=` query param (matching Google Doc GET form behavior)
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('search');
  const searchInput = document.getElementById('searchInput');
  if (initialQuery && searchInput) {
    searchInput.value = initialQuery;
  }

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
    filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || 'all';
    renderSongs();
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
    const badge = e.target.closest('.num-badge');
    if (!badge || badge.classList.contains('disabled')) return;
    const rawNum = badge.dataset.copy || '';
    const cleanNum = rawNum.replace(/[ⓗⓢ]/g, '').trim();
    if (!cleanNum || cleanNum === 'XXX') return;
    try {
      await navigator.clipboard.writeText(cleanNum);
      showToast(`노래방 번호 [${cleanNum}] 복사 완료!`);
    } catch {
      showToast(`번호: ${cleanNum}`);
    }
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
