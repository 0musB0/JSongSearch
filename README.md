# 🎤 일본곡 노래방 검색기 (JSongSearch)

> **Live Production**: [https://jsongsearch.vercel.app](https://jsongsearch.vercel.app)  
> **GitHub Repository**: [https://github.com/0musB0/JSongSearch](https://github.com/0musB0/JSongSearch)  
> **Target Audience**: TJ / 금영(KY) 노래방에서 일본곡(J-POP, 보컬로이드, 애니송 등)을 부르는 한국인 사용자 및 서브컬처 팬

---

## 🤖 AI Context & Agent Quick-Start

이 섹션은 후속 LLM / 자율 코딩 에이전트가 레포지토리를 즉시 파악하고 수정할 수 있도록 제공되는 **Machine-Readable 시스템 가이드**입니다.

### 1. Key Tech Stack & Design Philosophy
- **Frontend Architecture**: No-Build Vanilla Web (HTML5, Modern Responsive CSS3, Modular ES6+ JavaScript).
- **Styling**: `style.css` 기반 커스텀 디자인 시스템 (Pink/Sakura 모던 글래스모피즘, 라이트/다크 테마 토글, 모바일 터치 최적화).
- **Backend / Edge**: Vercel Serverless Function (`api/lyrics.js` Node.js ES Module).
- **Database**: Static Local JSON Database (`data/songs.json`, ~430+곡 정밀 검증 데이터).
- **Zero-Token External APIs**:
  - LRCLIB API (`https://lrclib.net/api/search`) - 일본어 원문 가사 수집.
  - Google Translate GTX API (`https://translate.googleapis.com/translate_a/single`) - 번역 및 로마자 표기 추출.
  - Apple iTunes Search API (`https://itunes.apple.com/search`) - 일본 공식 명칭 폴백 및 30초 음원 미리듣기(Preview Audio).

### 2. Core Modules & Directory Layout
```text
karaoke-search/
├── api/
│   └── lyrics.js          # 가사 수집 + 한글 발음(어절/Bunsetsu 그룹핑) + 한국어 번역 Serverless API
├── data/
│   └── songs.json         # 430+ 곡의 TJ/KY 번호, 일본어/한국어 제목, 최고음, 가수/작곡가 메타데이터
├── scripts/               # 곡 데이터 동기화, 음역대 검증 및 정제용 배치 스크립트 모음
├── index.html             # 메인 SPA 뷰, 검색바, 필터 태그, 곡 카드 그리드, 가사 모달, 바텀시트
├── script.js              # 클라이언트 상태관리, 초성/한영일 검색 엔진, 오디오 재생, 가사 모달
├── style.css              # 전체 UI 디자인 시스템, 반응형 레이아웃, 다크모드, 애니메이션
├── vercel.json            # Vercel Serverless 라우팅 및 캐싱 헤더 설정
└── AGENTS.md              # 코드 작성 원칙(Taste-skill, Ponytail, Karpathy 원칙)
```

---

## 🌟 Core Features & Implementation Details

### 1. 초성 및 다국어 실시간 검색 (`script.js`)
- **한글 초성 검색**: `베텔` 검색 시 `ㅂㅌ`, `ㅂㅌㄱㅇㅅ` 분해 매칭 지원 (`CHOSEONG_LIST` 테이블 기반).
- **다국어 매핑**: 한국어 음차 제목(예: `베텔기우스`), 일본어 원제(`ベテルギウス`), 로마자(`Betelgeuse`), 가수명(`유우리`, `優里`) 교차 검색.
- **TJ / KY 번호 직접 검색**: 5자리/6자리 노래방 기기 번호 직접 매칭.
- **최고음 검색**: `3옥 도#`, `2옥 시` 등 음역대 키워드 검색.

### 2. 노래 흐름 기반 가사/발음/번역 뷰어 (`api/lyrics.js`)
- **실제 노래 호흡(Bunsetsu 어절) 그룹핑**:
  - 로마자 1:1 기계적 매핑의 어색함(`소라 니 아루 나니카 오...`)을 개선.
  - 일본어 격조사(`wa`, `ga`, `o`, `ni`, `no`, `to`, `de`, `mo`, `e`, `ka`, `kara`, `made` 등)와 보조동사/어미(`tetara`, `tara`, `te`, `ta`, `kureta` 등)를 앞 단어에 결합.
  - **받침 보존 알고리즘**: 단어 끝 `ん(ㄴ 받침)` 뒤에 모음 조사가 올 때(`jibun` + `o`), 연음 오류(`지부노` ❌) 없이 정확한 발음(`지분오` ⭕) 산출.
  - 예시: `空にある何かを見つめてたら` ➔ **`소라니 아루 나니카오 미츠메테타라`**.
- **Edge Caching**: Vercel CDN `s-maxage=86400, stale-while-revalidate=604800` 적용으로 빠른 응답 및 무부하 보장.

### 3. 최고음 & 조옮김(Key Transpose) 가이드
- 각 곡마다 훈련된 최고음(`highest_pitch`, 예: `3옥 레#`, `2옥 라`) 태그 제공.
- 각 곡 카드 우측 상단의 `[ - ] [ 3옥 도# ] [ + ]` 버튼을 누르면 실시간으로 키를 올리거나 낮춰 노래방 리모컨 조작 가이드 제공.

### 4. 음원 30초 미리듣기 (Preview Player)
- 카드 내 가수/작곡가 영역 우측의 재생 아이콘(▶) 클릭 시 iTunes 프리뷰 음원 재생.
- 다른 곡 재생 시 이전 오디오 자동 페이드/정지 및 활성 트랙 인디케이터 표시.

---

## 📡 API Reference: `/api/lyrics`

### `GET /api/lyrics`
곡의 원문 가사, 어절별 한글 발음, 한국어 번역 가사를 한 번에 조회합니다.

#### Request Parameters
| Name | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | 곡 제목 (한국어 또는 일본어 원제) | `베텔기우스(ベテルギウス)` |
| `artist` | `string` | No | 가수명 (한국어/일본어) | `유우리(優里)` |
| `composer` | `string` | No | 작곡가명 | `-` |
| `v` | `string` | No | 캐시 버스팅 버전 식별자 | `2` |

#### Response Schema (JSON)
```json
{
  "found": true,
  "trackName": "ベテルギウス",
  "artistName": "優里",
  "hasJapanese": true,
  "lines": [
    {
      "empty": false,
      "orig": "空にある何かを見つめてたら",
      "pron": "소라니 아루 나니카오 미츠메테타라",
      "ko": "하늘에 있는 뭔가를 쳐다보면"
    },
    {
      "empty": false,
      "orig": "それは星だって君がおしえてくれた",
      "pron": "소레와 호시 닷테 키미가 오시에테쿠레타",
      "ko": "그것은 별이라도 네가 말했어."
    }
  ]
}
```

---

## 🛠️ Local Development & Deployment

### 1. Requirements
- Node.js 18+ (ES Modules 지원 필수)
- Vercel CLI (`npm i -g vercel`)

### 2. Local Run
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (API 라우트 포함)
npx vercel dev
```

### 3. Production Deployment
```bash
# Git 커밋 및 푸시
git add .
git commit -m "feat: your commit message"
git push origin main

# Vercel 프로덕션 즉각 배포
npx vercel deploy --prod --yes
```

---

## 📋 Rules for Future AI Contributors
1. **No Framework Bloat**: React, Vue, Next.js 등 무거운 프레임워크로 무단 전환하지 말고 순수 바닐라 웹 표준(Vanilla JS / CSS)을 유지하세요.
2. **Data Integrity**: `data/songs.json`의 필드 스키마(`title`, `sub_title`, `artist`, `composer`, `tj_number`, `ky_number`, `highest_pitch`, `level` 등)를 훼손하지 마세요.
3. **Bunsetsu Preservation**: 가사 발음 엔진(`api/lyrics.js`) 수정 시 `wordRomajiToHangul`의 받침 분리와 `BUNSETSU_PARTICLES`의 연결 규칙을 깨뜨리지 않도록 사전에 Node.js 단위 테스트를 실행하세요.
