# 인계 문서 (멀티카 에이전트용)

이 파일만 읽고 이어서 작업한다. 레포: 0musB0/JSongSearch, 작업 브랜치: `claude/project-thread-qcqima` (원격에서 `git fetch && git checkout claude/project-thread-qcqima && git pull`). 먼저 `AGENTS.md`(구조 지도)를 읽는다. 큰 파일(`data/songs.json`)은 통째로 읽지 말고 head나 node로 조회한다.

## 공통 규칙
- 최고음(`pitch`)은 **메인 보컬 멜로디의 최고음만**(진성·가성 중 높은 음). 하모니·코러스·애드립·화음 제외. 불확실하면 `X`. **출처 없이 기존 값을 바꾸지 않는다.**
- 곡 번호(`tj_num`)는 **TJ 공식 사이트에서 확인되는 번호만** 쓴다. 추측 금지.
- 데이터 형식: `{id, title, artist, composer, pitch, tj_num, ky_num}`. `title`은 `한국어 제목 (일본어 원제)` (영어 제목은 그대로), 모르는 `ky_num`은 `XXX`, 빈 `composer`는 `-`. `songs.json`은 `JSON.stringify(data, null, 2)` 그대로 저장(끝 개행 없음). `tj_num`에 붙은 `ⓗ`/`ⓢ` 표시는 유지.
- 검증 후에만 커밋: ① JSON 파싱 ② `id` 중복 없음 ③ `tj_num` 중복 없음 ④ `node scripts/dev-server.mjs` 후 `/api/songs` 200 ⑤ 새 곡은 `pitch: "X"`. 커밋은 확인 없이 가능, **push는 이 브랜치로만**, 머지는 사용자가 한다.
- 유료 호출(Firecrawl 등)은 시작 전에 예상 비용을 한 줄로 알린다. TJ 사이트 조회는 무료다.

## TJ 사이트 조회 방법 (무료, 키 불필요)
`https://www.tjmedia.com/song/accompaniment_search?pageNo=1&pageRowCnt=100&strSotrGubun=ASC&strSortType=&nationType=&natType=&strCond=0&strType=<T>&searchTxt=<검색어>&strText=<검색어>`
`strType`: 1=곡제목, 2=가수명, 16=곡번호. 결과 행은 `<ul class="grid-container list ...">`, 번호는 `class="num2"`(검색어는 `<span class='highlight'>`로 감싸짐), 제목 `title3`, 가수 `title4`, 작곡가 `title6`. TJ의 가수 표기는 `X-JAPAN`, 제목 표기는 `フライディ・チャイナタウン`처럼 TJ 기준이다. 제목 뒤 `(작품명 OP)`는 작품 태그이므로 DB 제목에서는 뗀다. 파싱 예시는 `scripts/tj/verify.mjs`.

## 작업 1. 최고음 대조 (사용자가 실행)
- `FIRECRAWL_API_KEY=... node scripts/audit-pitch.mjs` → `docs/pitch-audit.json`. 곡당 약 2크레딧, 435곡 약 870크레딧. 중단 후 재실행하면 이어진다.
- 결과의 `status`: `match` / `diff`(사이트 값과 다름) / `no-source`(사이트에 없음, 보컬로이드 다수) / `error`.
- `diff` 곡만 사용자에게 목록으로 보고하고, 근거 URL과 함께 승인받은 뒤 `pitch`를 바꾼다. 하모니 의심 후보는 `docs/pitch-review.md`.

## 작업 2. 곡 번호 불일치 보고·수정
기존 435곡의 `tj_num`을 TJ 사이트와 대조한 결과(`scripts/tj/verify.json`), **약 113곡(26%)이 실제 TJ 번호와 다르다**(예: 紅蓮華는 DB 28340, TJ 공식 68047). 일부는 28500, 27100 같은 둥근 숫자로 지어낸 값으로 보인다.
- `scripts/tj/fixnums.json`: `fixed` 60곡(제목·가수가 TJ와 일치하는 정정 번호), `ambiguous` 2곡(Flavor Of Life는 26555/26417 중 선택 필요), `notfound` 51곡(TJ에서 같은 곡을 못 찾음).
- `scripts/tj/apply.mjs`의 `manual`에 사람이 확인한 정정 10건(id 44, 126, 212, 247, 319, 383, 233, 393, 171, 400)이 이미 들어 있다. 확인 근거는 TJ 제목·가수 일치.
- 실행: `node scripts/tj/apply.mjs` → 69곡 번호 정정 + 작업 3의 신곡 추가가 한 번에 된다. 실행 전 `data/songs.json` 백업, 실행 후 검증 절차(공통 규칙)를 돌린다. 마지막 시험 실행에서 정정 1건(id 359, 번호 6879)과 신곡 5건(6428, 6895, 6804, 6439, 6802)이 "TJ에서 확인 안 됨"으로 건너뛰어졌다. 원인은 번호 검색 결과 15행 제한이었고 `pageRowCnt=100`으로 고쳤으니 다시 돌려 본다. 그래도 안 되면 건너뛴 채 보고한다.
- `notfound` 약 40곡은 **자동으로 바꾸지 않는다.** 잘못된 번호를 그대로 둘지 `XXX`로 바꿀지는 사용자 결정을 받는다. 번호 중복이 시험 실행에서 2건 남았으니 원인을 확인한다.

## 작업 3. 곡 추가 (사용자 요청 원문: "애니메이션 노래랑 옛날 일본 노래들도 추가해줘. XJAPAN, 플라이데이 차이나타운, 프린세스 프린세스 이런 사람들도 없어")
- `scripts/tj/newsongs.json`에 TJ 번호를 확인한 곡 약 98곡이 들어 있다. X JAPAN, 야스하(플라이데이 차이나타운), 프린세스 프린세스, 안전지대, ZARD, WANDS, 코메코메 클럽, 오자키 유타카, THE BLUE HEARTS, 마츠다 세이코, 나카모리 아키나, 나카지마 미유키, 애니송(LiSA, fripSide, 가게야마 히로노부, 미즈키 나나, 와다 코지, 결속밴드, supercell, EGOIST, ClariS, UVERworld, 포르노그라피티).
- 한국어 제목과 가수 한글 표기는 **Claude가 직접 옮긴 음역**이다. 틀릴 수 있으니 사용자에게 검수를 요청한다. TJ 번호와 일본어 원제는 TJ 기준이다.
- 더 추가할 때: `strType=2`로 가수를 검색해 TJ가 가진 곡을 확인한 뒤 같은 형식으로 `newsongs.json`에 넣는다. TJ에 없는 곡은 추가하지 않는다. 새 곡의 `pitch`는 `X`.
- 중복 확인: `tj_num` 일치 또는 제목+가수 일치. 새 곡 id는 기존 최대 id + 1부터.

## 끝나면
새 PR을 올리고(제목 예: "곡 번호 정정 및 옛날·애니송 추가") 변경 요약(정정 건수, 추가 아티스트·곡 수, 건너뛴 곡)을 사용자에게 보고한다. PR 본문은 한 줄씩 사실만 적는다.

## 이미 끝난 것 (다시 하지 말 것)
- 크론 제거, 동기화는 로컬 `npm run sync` 후 커밋 (PR #3). 최고음 기준 문서화, 스킬·개인 지침 저장 (PR #2, #4). 개인 지침은 `docs/PERSONAL_GUIDELINES.md`.
