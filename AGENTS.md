# Karaoke Search Workspace Engineering Guidelines (`AGENTS.md`)

This workspace integrates strict engineering discipline, combining Superpowers development practices with 4 core custom skills.

## Custom Workspace Skills

1. **`taste-skill`**: Anti-slop UI design framework. Enforces editorial typography, intentional whitespace, high-contrast surfaces, and clean tactile interactions without generic AI gradient tropes.
2. **`ponytail`**: Senior engineer YAGNI decision ladder. Enforces browser/platform primitives first, avoiding unnecessary dependencies, wrappers, or bloatware packages.
3. **`headroom`**: Context and token compression. Pre-filters crawls, strips boilerplate, and structures payloads efficiently for LLM consumption.
4. **`andrej-karpathy`**: 4 core coding principles: Think Before Coding, Simplicity First, Surgical Changes, and Goal-Driven Execution.

## Engineering Discipline & Superpowers
- **Test-Driven Development (TDD)** & **Systematic Debugging**: Verify assumptions and write robust checks.
- **Verification Before Completion**: Never claim completion without executing test scripts and validating output.


## 구조 지도
한 줄 개요: 일본곡 노래방(TJ/금영) 번호·최고음 검색 및 실시간 가사·독음 제공 웹 서비스
스택: JavaScript(ES Module), HTML5/CSS3, Node.js, Vercel Serverless/Cron, @google/genai
실행/검증: npm start (로컬 개발 서버), npm run sync (신곡 동기화), npm run parse (데이터 파싱)

파일 지도:
경로                      역할 (한 줄)
index.html                 검색 UI, 모달, 헤더/필터 마크업 구조
script.js                  초성 검색, 음역 키 계산, 가사 모달 등 프론트엔드 인터랙션
style.css                  반응형 레이아웃, 테마, 카드 및 모달 스타일
api/songs.js               곡 목록 및 동기화 메타 반환 서버리스 함수
api/lyrics.js              LRCLIB 가사 조회 및 한국어 독음·해석 변환 API
api/cron-sync.js           일일 신곡 동기화 트리거 서버리스 함수
scripts/dev-server.mjs     로컬 개발용 HTTP 서버 (정적 파일 + API 모킹)
scripts/sync-namuwiki.mjs  TJ Media 및 나무위키 신곡 동기화 스크립트
scripts/parse-namuwiki.mjs 나무위키 마크다운 파싱 및 음역 매핑 유틸리티
logo.png, og-banner.png, .agents/skills/  생성물·자산

데이터 흐름:
- 정적 로드: 브라우저가 정적 자산 로드 후 /api/songs에서 data/songs.json을 가져와 인메모리 검색/필터링
- 가사 조회: 사용자 요청 시 /api/lyrics 호출 -> LRCLIB 및 번역/독음 엔진 처리 후 모달 출력
- 데이터 동기화: Vercel Cron(/api/cron-sync) 또는 수동(sync) -> TJ API/나무위키 크롤링 -> data/songs.json 갱신

자주 고치는 곳:
- UI 마크업 및 디자인 수정: index.html, style.css
- 검색 필터링/키 계산/클라이언트 동작 수정: script.js
- 가사 연동/독음 변환 알고리즘 수정: api/lyrics.js
- 신곡 수집 및 동기화 규칙 변경: scripts/sync-namuwiki.mjs, scripts/parse-namuwiki.mjs

건드리지 말 것:
- 큰 파일/데이터: logo.png(414KB), og-banner.png(504KB), data/songs.json(94KB) - head로 일부만 볼 것(통째로 읽지 말 것), data/sync-meta.json
- 환경변수 위치: GEMINI_API_KEY, FIRECRAWL_API_KEY, CRON_SECRET (Vercel 환경변수 또는 실행 환경에만 설정)
