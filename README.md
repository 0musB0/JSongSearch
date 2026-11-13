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
- **Backend / Edge**: Vercel Serverless Function (`api/songs.js`; `api/cron-sync.js`는 수동 호출용, 크론 스케줄 없음).
- **Database**: Static Local JSON Database (`data/songs.json`, ~430+곡 정밀 검증 데이터).

### 2. Core Modules & Directory Layout
```text
karaoke-search/
├── api/                   # songs.js, cron-sync.js (서버리스 함수, DB 갱신은 로컬 `npm run sync` 후 커밋)
├── data/
│   └── songs.json         # 430+ 곡의 TJ/KY 번호(`tj_num`/`ky_num`), 제목, 최고음(`pitch`), 가수/작곡가 메타데이터
├── scripts/               # 곡 데이터 동기화, 음역대 검증 및 정제용 배치 스크립트 모음
├── index.html             # 메인 SPA 뷰, 검색바, 필터 태그, 곡 카드 그리드
├── script.js              # 클라이언트 상태관리, 초성/한영일 검색 엔진
├── style.css              # 전체 UI 디자인 시스템, 반응형 레이아웃, 다크모드, 애니메이션
├── vercel.json            # Vercel Serverless 라우팅 및 캐싱 헤더 설정
├── AGENTS.md              # 구조 지도·코드 작성 원칙(Taste-skill, Ponytail, Karpathy 원칙)
├── CLAUDE.md              # AGENTS.md 참조 + 개인 지침 연결
├── docs/PERSONAL_GUIDELINES.md  # 소유자 개인 지침 사본
└── .claude/skills/        # 디자인 스킬, model-router, gemini-delegate
```

---

## 🌟 Core Features & Implementation Details

### 1. 초성 및 다국어 실시간 검색 (`script.js`)
- **한글 초성 검색**: `베텔` 검색 시 `ㅂㅌ`, `ㅂㅌㄱㅇㅅ` 분해 매칭 지원 (`CHOSEONG_LIST` 테이블 기반).
- **다국어 매핑**: 한국어 음차 제목(예: `베텔기우스`), 일본어 원제(`ベテルギウス`), 로마자(`Betelgeuse`), 가수명(`유우리`, `優里`) 교차 검색.
- **TJ / KY 번호 직접 검색**: 5자리/6자리 노래방 기기 번호 직접 매칭.
- **최고음 검색**: `3옥 도#`, `2옥 시` 등 음역대 키워드 검색.

### 2. 최고음 & 조옮김(Key Transpose) 가이드
- 각 곡마다 훈련된 최고음(`pitch`, 예: `3옥 레#`, `2옥 라`) 태그 제공.
- 각 곡 카드 우측 상단의 `[ - ] [ 3옥 도# ] [ + ]` 버튼을 누르면 실시간으로 키를 올리거나 낮춰 노래방 리모컨 조작 가이드 제공.

---

## 🛠️ Local Development & Deployment

### 1. Requirements
- Node.js 20+ (ES Modules 지원 필수)
- Vercel CLI (`npm i -g vercel`)

### 2. Local Run
```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (API 라우트 포함)
npm start        # scripts/dev-server.mjs (정적 파일 + API 모킹)
# 또는 npx vercel dev
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
2. **Data Integrity**: `data/songs.json`의 필드 스키마(`id`, `title`, `artist`, `composer`, `pitch`, `tj_num`, `ky_num`)를 훼손하지 마세요.

> 가사·음원 재생은 저작권 사유로 제공하지 않습니다 (MUS2-18 결정).
