---
name: "gemini-delegate"
description: "모든 세션(데스크톱 앱, 프로젝트 스레드·클라우드 세션 포함)에서 작업을 시작할 때 가장 먼저 확인(WebSearch·WebFetch·서브에이전트 전에). 검색·조사·수치 확인, 요약·번역, 분석·비교, 긴 PDF·영상·YouTube, 초안, 이미지 생성, Gmail·Drive 요약처럼 Gemini가 대신할 수 있는 일은 Antigravity CLI(agy)로 위임한다. 모델(Gemini·Claude·GPT)은 묻지 않고 토큰이 가장 덜 드는 쪽으로 직접 고르고, 고른 모델과 이유를 항상 한 줄로 보여주며 사용 전후 한도를 보고한다. 위임하지 못하면 이유를 한 줄로 알린다."
---

# Gemini 위임 (Claude 토큰 절약용)

목적: Claude가 직접 하면 토큰이 많이 드는 작업을 Gemini(사용자의 Google 계정, Pro 요금제, 별도 비용)에 맡기고, Claude는 짧은 지시를 보내고 짧은 결과만 읽는다. 스크린샷과 get_page_text는 토큰을 많이 쓰므로 위임 중에는 쓰지 않는다.

Claude 자체 서브에이전트(Agent 도구)는 이 용도로 쓰지 않는다. 새 에이전트는 맥락을 처음부터 다시 파악하느라 같은 Claude 사용량을 쓰므로 토큰이 줄지 않는다.

## 자동 판단 — 작업을 시작하기 전에
1. 아래 **대체 가능 작업표**에 해당하는가? 또는 검색·페이지 열람이 3번 이상 필요해 보이는가? 아니면 Claude가 직접 한다.
2. Desktop Commander가 있으면 **1순위 agy CLI**. 이름은 환경마다 다르다: 데스크톱 앱은 `mcp__remote-devices__Desktop_Commander__*`, 클라우드 세션(프로젝트 스레드, claude.ai/code)은 `mcp__Remote_Desktop_Commander__*`. ToolSearch로 둘 다 찾아본다. 클라우드 쪽이면 먼저 `mcp__Remote_Desktop_Commander__list_devices`로 Online 기기가 있는지 본다.
   Desktop Commander가 없거나 기기가 Offline이면 내장 브라우저 도구(ToolSearch로 `mcp__remote-devices__Claude_Browser__` 확인)로 **2순위 브라우저 경로**. 둘 다 없으면 위임을 포기하고 직접 한다. 사용자를 기다리게 하지 않는다.
   **건너뛸 때도 반드시 한 줄로 알린다**: "PC가 꺼져 있어서(또는 연결 도구가 없어서) Gemini 대신 직접 할게요." 조용히 건너뛰지 않는다.
3. 결과가 짧게 정리되거나 파일로 남길 수 있는가? 원문 전체를 Claude가 읽어야 하는 일(코드 리뷰, 정확한 인용)은 직접 한다.
4. 산출물이 파일로 남고 작업 단위로 나눌 수 있는 큰 일이면 아래 **팀 모드**(Argon 팀장 + Flash 서브에이전트)를 쓴다.
통과하면 경로를 따른다.

## 모델은 묻지 않고 고르고, 고른 모델은 항상 보여준다 (사용자 지시 2026-11-02)
- 목적은 토큰 절약이다. 모델(agy의 Gemini·Claude·GPT, Claude 서브에이전트)은 사용자에게 묻지 않고 Claude가 아래 표로 고른다.
- 이 스킬을 쓸 때마다, 위임 **전에** 한 줄로 고른 모델과 이유를 보여준다: "이 부분은 agy gemini-3.8-flash-low에 맡길게요(수치 1개 조회라 가장 싼 모델)." 위임하지 않기로 했으면 그 이유를 한 줄로: "질문이 작아 agy 대기보다 직접 답하는 게 싸서 직접 할게요."
- 결과를 보고할 때는 아래 **실행 명령**의 사용량 줄(모델, 토큰, 바뀐 한도)을 함께 보여준다.

## 1순위: Antigravity CLI (agy) — 사용자 PC
Gemini CLI는 2026-06-18부터 개인 계정 로그인이 막혀 Antigravity CLI(`agy`)로 대체됨. 사용자 Windows PC에 설치·로그인 완료(Pro 계정, 2026-10-24, CLI 1.5.2 확인 2026-11-07). 웹 검색·한국어 출력 정상.

- 도구(데스크톱 앱): `mcp__remote-devices__Desktop_Commander__start_process` (PowerShell 기본). 로드: ToolSearch `select:mcp__remote-devices__Desktop_Commander__start_process,mcp__remote-devices__Desktop_Commander__read_process_output`.
- 도구(클라우드 세션): `mcp__Remote_Desktop_Commander__start_process`, `mcp__Remote_Desktop_Commander__read_process_output`. 로드: ToolSearch `select:mcp__Remote_Desktop_Commander__list_devices,mcp__Remote_Desktop_Commander__start_process,mcp__Remote_Desktop_Commander__read_process_output`. Online 기기가 2대 이상이면 `deviceId`를 넘긴다. 원격 실행은 3초만 기다리고 PID를 돌려주므로, 결과는 `read_process_output(pid)`를 완료될 때까지 반복해 받는다.
- 경로: `$env:LOCALAPPDATA\agy\bin\agy.exe` (PATH 갱신이 안 보일 수 있어 전체 경로).
- .ps1 스크립트 파일 + `-ExecutionPolicy Bypass`는 보안 분류기에 막힘. 항상 아래 명령을 **인라인으로** 실행. cmd에서 따옴표+한글은 깨지므로 PowerShell. npm/npx류 .ps1은 실행 정책으로 막혀 있으니 그런 건 shell "cmd". PowerShell 5.1은 네이티브 인자로 넘기는 JSON의 큰따옴표를 지우므로, JSON 설정은 임시 파일로 써서 경로로 넘긴다.
- 기기 응답 대기는 60초가 한계. timeout_ms 55000으로 실행하고, 끝나지 않으면 read_process_output(pid)로 이어 받는다.
- 속도: 2026-11-07까지 호출마다 약 65초가 더 걸렸는데, 원인은 agy MCP 설정(`C:\Users\User\.gemini\config\mcp_config.json`)의 `gemini-exchange`(제미니 거래소 MCP, 로그인 필요라 헤드리스에서 연결 불가) 연결 대기였다. 이 항목을 제거해 flash-low 한 번이 74초 → 12초로 줄었다(백업 `mcp_config.json.bak-20261107`). `agy mcp disable`은 비대화 실행에 반영되지 않았다. 다시 느려지면 `$env:USERPROFILE\.gemini\antigravity-cli\log`의 최신 로그에서 `still connecting`을 찾는다.
- 사실 하나짜리 작은 질문은 Claude가 확실히 아는 내용이면 직접 답하는 게 더 싸고 빠르다(그때도 한 줄로 알린다).
- PC의 프로세스를 강제로 끄는 명령(Stop-Process)은 자동 모드 보안 검사에 막힌다. 멈춘 agy는 그냥 두고 새로 실행한다.
- `--dangerously-skip-permissions`는 쓰지 않는다.

### 모델 선택 (명령을 보고 Claude가 판단, 사용자에게 묻지 않음)
CLI에서 쓸 수 있는 모델(`agy models`, CLI 1.5.2, 2026-11-07): `gemini-3.8-flash-low|medium|high`, `gemini-4-argon-low|medium|high`, `claude-sonnet-5-5-low|medium|high`, `claude-opus-5-5-low|medium|high`, `gpt-oss-120b-medium`. GPT 6는 앱 화면에는 보이지만 CLI 목록에는 없다. CLI에 뜨면 표에 추가한다.
실측(2026-10-24, 같은 환율 검색): Flash Low = 주간 0.010%·6.9초, Argon Medium = Argon 주간 0.196%·22초, 답은 동일. → **Flash가 약 20배 싸고 3배 빠르다. 기본은 Flash.** 모델은 `--model <id>`로 지정(생략하면 Argon Medium이 기본이라 비싸다, 반드시 지정).

| 작업 유형 | 모델 id | 이유 |
|---|---|---|
| 사실 1~3개, 수치·날짜 조회, 번역, 짧은 요약, 단순 정리 | `gemini-3.8-flash-low` | 가장 싸고 빠름 (기본값) |
| 여러 출처 교차확인, 사이트에 올릴 수치, 긴 문서·YouTube 요약, 표·JSON 추출 | `gemini-3.8-flash-medium` | 정확도 보강, 여전히 저렴 |
| 비교·분석·원인 추론, 여러 단계 조사, 품질 있는 초안(블로그·카드뉴스 문구) | `gemini-4-argon-medium` | 추론 필요. Argon 별도 한도 사용 |
| 파일로 남는 큰 결과물(여러 파일 분석·정리, 섹션별 문서, 여러 파일 코드 초안) | **팀 모드**: 팀장 `gemini-4-argon-medium` + 내장 `flash` 서브에이전트 | 아래 팀 모드 절차 |
| 중요한 결정용 심층 분석, 어려운 문제, Flash·Argon Medium이 실패한 일 | `gemini-4-argon-high` | 비싼 만큼 드물게 |
| 코드 초안·두 번째 의견(코드 리뷰 참고용), Claude 스타일 문장 | `claude-sonnet-5-5-medium` | Antigravity의 별도 "Claude and GPT" 한도 사용 → 이 대화의 Claude 토큰 절약 |
| 아주 어려운 설계·수학의 두 번째 의견 | `claude-opus-5-5-medium` | 같은 별도 한도, 드물게 |

Claude 묶음 모델(agy의 Sonnet·Opus)은 이 대화의 Claude 토큰을 쓰지 않는다. 결과가 텍스트(초안·의견·검토)로 돌아오는 일이면 Claude 서브에이전트(Agent)보다 agy의 Sonnet·Opus를 먼저 쓴다. 클라우드 저장소 파일을 직접 고쳐야 하는 일은 agy가 PC에서 돌아 닿지 않으므로 여기서 한다.

선택 규칙:
- 애매하면 한 단계 아래로 시작하고, 답이 "확인불가"·모순·부실하면 한 단계 올려 1회만 재시도 (flash-low → flash-medium → argon-medium → argon-high).
- 한도 보호: 실행 전 조회한 한도에서 고른 모델 묶음의 5시간 한도 < 15% 또는 주간 < 20%면 다른 묶음으로 바꾼다(Argon↔Flash). 팀 모드는 두 묶음을 다 쓰므로 둘 다 여유가 있을 때만. 전부 부족하면 위임하지 말고 사용자에게 알린다.
- 한도 묶음: "Gemini Models"(Flash·Pro 공유), "Gemini 4 Argon"(Pro 요금제는 별도 주간), "Claude and GPT models"(Opus·Sonnet·GPT-OSS). 각 묶음에 주간 + 5시간 한도, 토큰 비용에 비례 차감.
- 사용 가능 모델은 바뀔 수 있다. id 오류가 나면 `& $agy models`로 목록을 다시 확인하고 이 표 갱신을 제안한다.

### 실행 명령 (사용 전후 한도 비교 포함)
`<MODEL>`과 `<PROMPT>`만 바꿔 그대로 실행. 프롬프트 앞에는 항상 형식을 붙인다: `[형식: N줄 이내, 서론 없이, 출처 URL 포함]`. 프롬프트 안의 큰따옴표는 작은따옴표로 바꾼다.
```powershell
[Console]::OutputEncoding=[Text.Encoding]::UTF8; $agy="$env:LOCALAPPDATA\agy\bin\agy.exe"; function Q { $j=& $agy -p "/usage" --output-format json | ConvertFrom-Json; foreach($g in $j.command.data.groups){foreach($b in $g.buckets){[pscustomobject]@{K="$($g.name) / $($b.name)";L=[double]$b.remaining_fraction}}} }; $b4=Q; $r=& $agy -p "<PROMPT>" --model <MODEL> --output-format json | ConvertFrom-Json; $af=Q; $r.response.Trim(); "--- 사용량 (<MODEL>) ---"; "토큰: 입력 {0:N0} / 출력 {1:N0} / 생각 {2:N0} · {3:N1}초" -f $r.usage.input_tokens,$r.usage.output_tokens,$r.usage.thinking_tokens,$r.duration_seconds; foreach($a in $af){$p=($b4|?{$_.K -eq $a.K}).L; if($null -eq $p){$p=1}; if($p -ne $a.L){"{0}: {1:P3} -> {2:P3} (사용 {3:P3})" -f $a.K,$p,$a.L,($p-$a.L)}}
```
- JSON 출력 필드: `response`, `status`, `conversation_id`, `denied_actions`, `num_turns`, `duration_seconds`, `usage`. `denied_actions`가 비어 있지 않으면 권한 때문에 막힌 작업이 있다는 뜻이다.
- 한도만 볼 때: `& $agy -p "/usage" --output-format json` (사용량 0, 즉시). `/credits`는 G1 크레딧 잔액.
- 사용자에게 보고할 때 결과 아래에 **사용 모델, 토큰, 바뀐 한도 줄(전 → 후, 사용 %)**을 항상 함께 보여준다. 바뀐 줄이 없으면 "한도 변화 없음(0.001% 미만)"이라고 적는다.
- 출처 URL은 vertexaisearch 리다이렉트로 나올 수 있다. 사이트·결정용 수치는 원 출처를 WebFetch로 스팟체크.
- 조건: PC 켜짐 + Claude 데스크톱 앱 실행(데스크톱 경로) 또는 Desktop Commander 실행(클라우드 경로, list_devices에서 Online).

## 팀 모드 — Argon 팀장 + Flash 서브에이전트 (결과물 생산용, 사용자 지시 2026-11-07)
결과물(여러 파일, 긴 문서·코드, 대량 정리)을 agy에 맡길 때 쓴다. 구조:
Claude(설계·지시문·최종 검수) → agy Argon 팀장(분배·파일 읽어 검수·재지시) → agy 내장 `flash` 서브에이전트(실제 작업) → Argon이 STATUS: DONE 보고 → Claude가 다시 검수.

언제 쓰나 / 안 쓰나:
- 쓴다: 산출물이 파일로 남고 작업 단위로 나눌 수 있는 일(파일 여러 개 분석·정리, 문서 섹션별 초안, 코드 여러 파일 초안).
- 안 쓴다: 질문 하나·수치 조회(Flash 단독이 20배 쌈), 판단·설계가 핵심인 일(Claude 직접), 저장소 커밋·배포.
- 비용 실측(2026-11-07, 파일 2개 분석): Argon 팀장 + Flash 2개 한 번에 Gemini 주간 약 1%, Argon 주간 약 1%. 작은 일에 쓰면 낭비다.

지시문 규칙 (Claude가 쓰는 부분, 짧게):
- 맥락은 내용을 붙이지 말고 **PC 경로**로 준다: 참고 파일, 예시, 완성 기준 파일(있으면 `완성기준.md`).
- 팀장 프롬프트 틀(아래 명령에 그대로 들어 있음): 직접 작성 금지 → flash에게 작업 단위로 분배 → 결과가 오면 원본·산출물을 직접 읽어 검수 → 부족하면 재지시(최대 2회) → 끝나기 전엔 응답 종료 금지 → 10줄 보고 + 마지막 줄 `STATUS: DONE|WAITING|FAILED`.

알려진 동작 (agy 1.5.2 실측):
- 아래 프롬프트("끝나기 전엔 응답 종료 금지")로는 보통 한 번에 끝난다(실측: 파일 2개 리뷰, Flash 3회, 130초, STATUS: DONE). 지시가 약하면 팀장이 서브에이전트를 띄운 직후 응답을 끝내고 서브에이전트도 같이 멈추므로, 안전장치로 `conversation_id`를 받아 `--conversation`으로 이어받으며 `STATUS: DONE`이 나올 때까지 최대 3번 더 부른다(이어받으면 서브에이전트가 재개됨).
- 파일 읽기는 허용, 파일 쓰기는 `--mode accept-edits`로 허용. **셸 명령(python 실행·테스트)은 헤드리스에서 자동 거부**된다(`--settings`의 `command(python *)` 허용 규칙도 안 통함, `--mode auto`는 이 PC에 샌드박스가 없어 불가). `--dangerously-skip-permissions`는 쓰지 않는다. → **테스트 실행은 Claude가 Desktop Commander로 PC에서 직접** 한다.
- 서브에이전트 종류는 내장 `flash`(Gemini 3.8 Flash)와 `pro`(Gemini 4 Argon). 팀장은 `--model gemini-4-argon-medium`.

실행 명령 (`<TASK>`와 작업 폴더만 바꿈, 인라인 PowerShell):
```powershell
[Console]::OutputEncoding=[Text.Encoding]::UTF8; $agy="$env:LOCALAPPDATA\agy\bin\agy.exe"; Set-Location "<작업 폴더>"; function Q { $j=& $agy -p "/usage" --output-format json | ConvertFrom-Json; foreach($g in $j.command.data.groups){foreach($b in $g.buckets){[pscustomobject]@{K="$($g.name) / $($b.name)";L=[double]$b.remaining_fraction}}} }; $b4=Q; $t0=Get-Date; $p="[팀 모드] 너는 팀장이다. 작업: <TASK> 규칙: 1) 직접 작성하지 말고 flash 서브에이전트에게 작업 단위로 나눠 맡긴다. 2) 결과가 오면 원본과 산출물 파일을 직접 읽어 검수한다(누락·오류·형식). 부족하면 해당 서브에이전트에게 재지시(최대 2회). 3) 모든 결과를 받고 검수를 마치기 전에는 응답을 끝내지 않는다. 4) 보고 10줄 이내: 산출물 경로 / 서브에이전트 사용 횟수 / 검수에서 고친 점 / 남은 문제. 마지막 줄은 STATUS: DONE 또는 STATUS: WAITING 또는 STATUS: FAILED 이유."; $r=& $agy -p $p --model gemini-4-argon-medium --mode accept-edits --output-format json | ConvertFrom-Json; $cid=$r.conversation_id; $n=1; while($r.response -notmatch 'STATUS: (DONE|FAILED)' -and $n -lt 4){ $n++; $r=& $agy -p "서브에이전트 결과를 확인하고 검수를 이어가라. 끝나기 전엔 응답을 끝내지 마라. 같은 보고 형식, 마지막 줄 STATUS." --conversation $cid --model gemini-4-argon-medium --mode accept-edits --output-format json | ConvertFrom-Json }; $af=Q; $r.response.Trim(); "--- 호출 {0}회 / {1:N0}초 / conv {2} ---" -f $n,((Get-Date)-$t0).TotalSeconds,$cid; foreach($a in $af){$q=($b4|?{$_.K -eq $a.K}).L; if($null -eq $q){$q=1}; if($q -ne $a.L){"{0}: {1:P3} -> {2:P3}" -f $a.K,$q,$a.L}}
```
- 원격(클라우드 세션)에서는 3초마다 PID가 돌아오므로 `read_process_output`을 끝날 때까지 반복한다. 보통 2~5분.
- PowerShell 5.1의 `Get-Content`는 UTF-8 산출물을 깨뜨려 보여준다. 산출물 확인은 `Get-Content <파일> -Encoding UTF8`로 한다.
- 4번 불러도 `STATUS: DONE`이 없으면 결과를 신뢰하지 말고 Claude가 직접 마무리한다.

Claude 최종 검수 (생략 금지):
1. 팀장 보고 10줄만 읽는다(산출물 전체를 다시 읽지 않음).
2. 산출물 파일을 열어 구조·형식을 확인하고, 핵심 부분 1~2곳만 원본과 대조한다.
3. 코드면 Desktop Commander로 PC에서 직접 실행·테스트한다(agy는 셸 실행 불가).
4. 고칠 게 작으면 Claude가 직접 고치고, 크면 같은 `conversation_id`로 팀장에게 재지시한다.
5. 사용자에게 "agy 팀 모드(Argon+Flash) 결과, Claude 검수 완료"라고 밝히고 한도 변화를 함께 보고한다.

## 대체 가능 작업표
| 작업 | Gemini 기능 | 경로 | 결과 받는 법 |
|---|---|---|---|
| 웹 검색·사실 확인·수치 1~3개 | 실시간 검색 | agy flash-low / 빠른 | 답변 텍스트 |
| 여러 출처 교차확인, 사이트에 올라갈 수치 | 검색 + 교차확인 | agy flash-medium / 깊은 | 텍스트 또는 R_ |
| 긴 조사 보고서·시장·경쟁 분석 | Deep Research / 추론 | agy argon-medium / 깊은 | 파일·Drive 문서(요약만 읽기) |
| 파일 여러 개 분석·정리, 섹션별 문서, 여러 파일 코드 초안 | 팀 모드(Argon+Flash) | agy 팀 모드 | PC 파일 + 10줄 보고 |
| 긴 PDF·문서(수십 쪽 이상) 요약·추출 | 긴 문맥 파일 분석 | agy flash-medium(PC 파일 경로) / 깊은 | 텍스트 또는 R_ |
| YouTube 영상 요약·타임스탬프 질의 | YouTube 분석 | agy flash-medium / 빠른 (URL 포함) | 답변 텍스트 |
| 업로드 영상·이미지 내용 분석 | 멀티모달 분석 | 깊은 (Drive 파일) | R_ 문서 |
| 이미지 생성·편집(썸네일, 카드뉴스 배경 등) | 이미지 생성 | 깊은 ("Drive delegate 폴더에 저장") | Drive 이미지 파일 |
| Gmail 메일 묶음 요약, Drive·Docs·Keep 내용 찾기·요약 | Workspace 연동 | 빠른(짧으면) / 깊은 | 답변 또는 R_ |
| 긴 초안(블로그·카드뉴스 문구·보고서) | 문서 작성 | agy argon-medium 또는 팀 모드 / 깊은 | 파일, Claude는 검토만 |

agy로 아직 시험 안 한 것(긴 PDF, YouTube, 이미지 생성)은 처음 쓸 때 작은 작업으로 시험하고 이 표를 갱신한다.

위임하지 않는 것: 저장소 커밋·배포, Claude 연결 도구(Vercel 등)가 필요한 작업, 최종 판단·검증, 되돌릴 수 없는 작업(배포·삭제·전송·결제). Claude도 파이썬 샌드박스가 있으므로 단순 계산은 위임해도 이득이 없다.

참고(미검증, Gemini 자기 설명): 영상 생성(Veo), 음악 생성(Lyria), Spark Auto Browse(웹 작업 대행). 필요할 때 작은 작업으로 먼저 시험하고 이 표에 추가한다.

이 계정에서 확인된 Spark 연결 앱(2026-10-12): Gmail, Google Docs, Google Drive, Google Keep, YouTube Music, Gemini Notebook, 주소록. "Spark용 커스텀 앱"(맞춤 앱 링크 추가)로 외부 도구 연결도 가능.

## 2순위: 브라우저 경로
브라우저 도구는 `mcp__remote-devices__Claude_Browser__*`(내장 브라우저, Google 로그인 유지됨). 로그인 화면이 나오면 멈추고 사용자에게 직접 로그인을 요청한다. 비밀번호는 절대 입력하지 않는다. 이미지 생성·Deep Research·Workspace 연동처럼 agy로 안 되는 일도 이 경로를 쓴다.

| 경로 | 언제 | 소요 |
|---|---|---|
| **빠른 경로**(Gemini 채팅) | 짧은 답이 바로 나오는 일 | 약 10~20초 |
| **깊은 경로**(Spark + Drive) | 여러 단계, 파일 입출력, 교차확인이 필요한 일 | 3~5분 |
| colab-drive-bridge | 네트워크가 필요한 코드 실행 | 러너 가동 시 |

빠른 경로 답은 출처 1곳짜리라 틀릴 수 있다(실측: 브렌트유 10/9 마감을 104.72로 답했으나 Spark 2곳 교차값은 104.47). 사이트·결정에 쓰는 수치는 깊은 경로로 한다.

### 완료 신호 대기 (브라우저 경로 공통)
Gemini가 답을 만드는 동안에는 화면에 aria-label "대답 생성 중지" 버튼이 있다. 이 버튼이 사라지는 순간이 **완료 신호**다. 아래 읽기 전용 JS를 한 번 실행해 완료될 때까지 브라우저 안에서 기다린다(한 번에 최대 55초).

```js
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const t0=Date.now(); const busy=()=>[...document.querySelectorAll('button')].some(b=>(b.getAttribute('aria-label')||'').includes('생성 중지')); await sleep(2500); while(busy() && Date.now()-t0<55000) await sleep(800); const t=document.querySelector('main').innerText; const i=t.lastIndexOf('Gemini의 응답'); ({done:!busy(), sec:((Date.now()-t0)/1000).toFixed(1), answer: i<0?'PENDING':t.slice(i+10).split('Gemini는 AI이며')[0].trim().slice(0,800)})
```
- `done:true` → 완료. 빠른 경로는 `answer`가 결과다(긴 답이 필요하면 slice 상한을 늘린다).
- `done:false` → 아직 진행 중. 같은 JS를 다시 실행한다(Spark는 보통 4~6회, Deep Research는 더 길다).
- 답 안의 출처 URL은 링크 칩이라 텍스트에 안 나올 수 있다. URL이 꼭 필요하면 질문에 "URL을 텍스트로 적어"를 넣는다.

### 빠른 경로 — Gemini 채팅
`browser_batch` 한 번:
1. `navigate` https://gemini.google.com/app → wait 3 (탭 제목이 "Gemini Spark"면 key `ctrl+shift+s`로 채팅 모드로 돌아온다)
2. `left_click` (400, 860) 입력창
3. `type` — 질문 앞에 항상 형식을 붙인다: `[형식: 답만 N줄 이내, 서론·부연 없이] 질문 ... 출처 URL을 텍스트로 포함`
4. `key` Return
5. `javascript_tool` — 위 **완료 신호 대기** JS
- 주제가 바뀌면 `/app`으로 새 대화를 연다(대화가 길어지면 느려짐).

### 깊은 경로 — Spark + Drive 파일
폴더: Drive `Gemini_Bridge/delegate` (id `1_bQIaYDlq6Rt98h4zpdE_irXhPtZVyC_`). 번호는 폴더의 마지막 T_ 번호 + 1.

1. **지시 파일** `mcp__Google_Drive__create_file` (parentId 위 폴더, title `T_NNN`, contentMimeType text/plain → Google 문서로 변환됨). 내용:
   - 목표 1줄, 사용할 Gemini 기능(예: Deep Research, 이미지 생성), 방법(출처 조건, 교차확인 기준), 입력 파일 위치(있으면)
   - 출력: "같은 폴더에 R_NNN Google 문서로, 아래 형식만" + 정확한 형식(짧게, 필드 기반). 긴 산출물(보고서·이미지)은 별도 파일로 두고 R_에는 파일명과 5줄 요약만.
   - **첫 줄 규칙**: "R_NNN의 첫 줄에는 성공하면 `STATUS: DONE`, 실패하면 `STATUS: FAILED <이유 한 줄>`을 쓴다."
   - 제약: 지정한 것 외의 파일 생성·수정 금지, 수치 지어내지 않기, 못 찾으면 "확인불가"로 적기
2. **실행** — `browser_batch` 한 번, 스크린샷·페이지 읽기 없이:
   `navigate https://gemini.google.com/app` → wait 3 → key `ctrl+shift+s` → wait 3 → left_click (390,210) → type "Google Drive의 Gemini_Bridge/delegate 폴더에 있는 T_NNN 문서를 열어서 그 안의 지시대로 수행하고, 결과를 같은 폴더에 R_NNN 문서로 저장해줘." → key `Return`
3. **완료 대기** — 같은 탭에서 위 **완료 신호 대기** JS를 `done:true`가 될 때까지 반복한다. 기다리는 동안 할 다른 일이 있으면 먼저 하고 돌아와도 된다.
   - 5회(약 5분) 넘게 `done:false`면 `read_page`(filter interactive, max_chars 1500) 하나만 본다. 승인·확인 버튼이 보이면 사용자에게 알린다.
   - 브라우저가 끊기면 Drive `search_files`(title contains 'R_NNN', excludeContentSnippets true)로 대체 확인한다.
4. **결과 읽기** — `read_file_content`로 R_NNN만 읽는다. 첫 줄이 `STATUS: FAILED`면 이유를 보고 지시를 고쳐 T_ 다음 번호로 재시도하거나 사용자에게 알린다. `STATUS` 줄이 없으면 결과를 신뢰하지 말고 확인한다.

## 검증
Gemini 결과는 사실로 단정하지 않는다. 사용자에게 "Gemini 조사 결과(모델명)"라고 밝히고, 사이트·결정에 쓰이는 수치는 출처 URL 1개를 WebFetch로 스팟체크한다. Gemini가 쓴 초안·보고서는 Claude가 핵심만 검토하고 사용자에게 "Gemini 초안"이라고 밝힌다. 팀 모드 결과는 위 **Claude 최종 검수** 5단계를 따른다.

## 코드 실행이 필요할 때 (colab-drive-bridge)
네트워크가 필요한 파이썬 실행(예: Firecrawl 수집)은 사용자의 Colab 러너(v2.2)가 `Gemini_Bridge/task.py`를 실행하고 `result.json`을 쓴다.
- 먼저 `Gemini_Bridge/heartbeat.txt`의 modifiedTime이 3분 이내인지 확인. 오래됐으면 러너가 꺼진 것이므로 사용자에게 Colab 러너 셀 실행을 요청하거나 Spark 위임으로 대체한다.
- 키는 `os.environ["이름"]`으로만 읽고, 허용 목록 `secrets_allow.txt`(진짜 .txt여야 함)에 이름이 있어야 한다. 비밀값을 출력하거나 코드에 넣지 않는다.

## 기록
지시·결과 파일은 감사 기록으로 남겨둔다(삭제하지 않음). 폴더가 커지면 사용자에게 정리 여부를 묻는다. 새로 시험해 확인된 Gemini 기능이나 모델별 한도 실측치는 이 스킬에 추가하도록 사용자에게 업데이트를 제안한다.