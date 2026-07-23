# TC-Presenter 프로젝트

## 세션 시작 순서 (필수)
1. docs/TODO.md — 우선순위 로드맵 확인. P0/P1부터, ⚠ 항목은 착수 금지(아래 에스컬레이션 참조).
2. docs/CurrentState.md — **동결 아카이브(2026-07-23, ITDA 전환)**. 최신 세션 상태는 자동 로드되는 `.itda/cache.md`(하단 "프로젝트 기억" 절)가 담당한다. 동결 이전 맥락이 필요하면 맨 아래(번호 큰 세션)부터 읽는다 — 기존 "다음 단계 진입 시 주의사항" 절들은 여전히 유효.
3. 착수 전 docs/Decisions.md에서 관련 D-NNN을 검색한다(D-029 강제 규칙 — 동결 아카이브지만 기재된 결정은 계속 유효). 전환(2026-07-23) 이후 신규 결정은 `.itda/decisions.md`(D-NNNN)에 있다 — 양쪽 다 검색한다. 관련 결정이 있으면 그 경계 안에서만 작업하고, 충돌하면 구현하지 말고 에스컬레이션한다.
4. 건드리는 레이어의 docs/*Architecture.md를 읽는다. 주의: Architecture 문서 상당수는 Phase 2 목표 구조(Element 모델, Session 등)를 서술한다 — 현재 코드와 다르면 docs/CurrentState.md가 최종 근거다(DocumentationHierarchy.md Tier 1 주의).

## 세션 마감 순서 (필수)
코드 커밋에 아래 문서 갱신이 동반되지 않으면 그 작업은 **미완료**다. (근거: 커밋 6cf1730과 TD-5 두 번 모두 코드만 남고 기록이 누락돼 다음 세션이 완료된 일을 다시 파악하는 비용을 치렀다 — CurrentState.md 9-46/9-48 참조)
1. `node --test` 전체 통과 확인(fail 0). UI 변경이 있었으면 Playwright E2E까지(아래 검증 절).
2. docs/TODO.md — 완료 항목 체크·한 줄 압축, 헤더 "최종 업데이트" 갱신.
3. ~~docs/CurrentState.md — 세션 번호(9-NN) 절 append.~~ → **ITDA로 전환(2026-07-23)**: 세션 기록은 SessionEnd 훅이 transcript를 자동 수집하고, 남길 결정이 있는 세션은 ITDA 전주기(추출→사람 승인→`.itda/` 유입)로 기록한다. CurrentState.md에는 더 이상 append하지 않는다.
4. UI 변경이 있었으면 docs/ManualTestChecklist.md에 결과 한 줄 기록.
5. 코드와 위 문서 갱신을 같은 커밋(최소한 같은 푸시)에 포함한다.

## 개발 환경 (함정 주의)
- WSL에는 node가 없다. node v24는 Windows 쪽에 있다.
- 테스트는 반드시 `node --test`를 프로젝트 루트에서 직접 실행한다. `npm test`는 UNC 경로(\\wsl.localhost\...)에서 C:\Windows로 폴백해 엉뚱한 파일을 스캔하므로 사용 금지.
- Playwright Chromium은 Windows 쪽에 설치돼 있다. E2E는 임시 스크립트 방식으로 실행한다: 프로젝트 루트에 `_e2e_tmp.mjs` 작성 → `node _e2e_tmp.mjs` 실행 → 통과 확인 후 스크립트 삭제.
- 경로: Windows 쪽 도구/셸에서 프로젝트는 UNC 경로(`\\wsl.localhost\Ubuntu\home\hyeonuk\projects\presenter-`)로 접근한다. `/home/...` POSIX 경로는 Windows 셸에서 열리지 않는다. WSL 쪽 심링크 파일은 UNC로 읽으면 ELOOP로 실패한다 — `wsl.exe -e bash -c "cat <POSIX 경로>"`로 읽는다.

## Git (함정 주의)
- git 명령은 전부 `wsl.exe` 경유로 실행한다. Windows git은 dubious ownership으로 실패하고 상태를 오표시한다.
  예: `wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git status"`
- 커밋 직전 `git config user.email`이 `hyeonuk92@gmail.com`인지 확인한다. 다르면(특히 과거 오타 `hyoenuk92@`가 되살아나는 사례 있음) `git config user.email 'hyeonuk92@gmail.com'`으로 교정한 뒤 커밋한다.
- identity: hyeonuk9201 <hyeonuk92@gmail.com>
- 커밋 형식: `feat|fix|docs|refactor|test|chore: 간결한 설명` — prefix 생략 금지, 메시지 선행 공백 금지, 본문에 변경 이유를 한국어로 적는다.
- 서로 다른 작업(코드/문서/스킬)을 한 커밋에 섞지 않는다 — 6cf1730이 반례.

## 스택
- 단일 HTML(index.html/output.html) + ES Modules, 빌드 없음
- 저장소: Presentation/Song/AppSettings는 localStorage(persistence/StorageAdapter.js 경유), Media는 IndexedDB(media/MediaStore.js)
- 상태: store/AppStore.js — Presentation/PresenterState 소유

## 아키텍처 원칙
- Presentation/PresenterState 상태 변경만 CommandBus.execute() 경유. 직접 dispatch() 호출 금지.
- SongStore/AppSettingsStore/MediaStore는 CommandBus/HistoryManager를 거치지 않는다(D-027). 이 저장소들에 Undo를 붙이라는 요구가 나오면 구현하지 말고 에스컬레이션한다(D-027 충돌).
- 도메인 파일(domain/*)은 DOM/Store/렌더링을 알지 못한다.
- 새 설계 결정은 사람 승인을 거쳐 `.itda/decisions.md`에 D-NNNN으로 기록한다(ITDA 전환 2026-07-23 — docs/Decisions.md는 동결 아카이브, 기재된 D-NNN 결정은 계속 유효).

## 코드 구조 (큰 그림)
두 개의 브라우저 창이 `BroadcastChannel('tc-presenter-output')`으로 연결된 구조다.
- **index.html = 편집/조작 창(Presenter).** 여기서만 상태를 바꾼다. 임베디드 스크립트가 모든 모듈을 조립한다(진입점).
- **output.html = 송출 창(Projector).** 상태를 소유하지 않는다. 채널로 받은 Live Page만 `view/PageView.js`로 렌더한다. 뒤늦게 열려도 `REQUEST_SYNC`를 보내 현재 Live를 되받는다(BroadcastOutput.js 헤더 참조).

편집 창 내부 데이터 흐름(단방향):
```
UI(index.html, ui/CueList.js, ui/PreviewPanel.js)
  → command/CommandBus.execute({type,payload})   ← 유일한 쓰기 진입점
      → (media Command면 dispatch 전 MediaRuntimeCache preload)
      → store/AppStore.dispatch()                 ← reducer, SSOT
      → registerSubscriber() 대상들에게 Mutation 통지
           ├ PersistenceSubscriber → StorageAdapter(localStorage 저장)
           ├ BroadcastOutput → 채널로 Live Page 전송 → output.html
           └ UI 구독자 재렌더
      → CommandBus의 HistoryHook.afterExecute → HistoryManager(undo/redo)
```

레이어 경계(안쪽일수록 아무것도 모른다):
- `domain/*` — 순수 데이터/함수. DOM·Store·렌더링 모름. (Presentation=Page 순서, PresenterState=선택/Live/모드, Page/Section/Song/StylePreset)
- `store/AppStore.js` — 상태 SSOT. `dispatch()`로만 변경, Mutation은 reduce 전후 state 비교로 도출(reducer 무수정).
- `command/`, `history/`, `persistence/` — 각각 쓰기 진입점 / Undo / 저장. AppStore는 이들의 존재를 모른다(Subscriber로 스스로 등록).
- `store/SongStore.js`·`AppSettingsStore.js`·`media/MediaStore.js` — **별도 저장소(D-027).** CommandBus/History/AppStore 흐름 밖. localStorage/IndexedDB에 직접 저장하고 Undo 대상 아님.
- `ui/*`, `view/*`, `output/*` — 렌더링/입출력.

주의: `docs/*Architecture.md`와 `Vocabulary.md`는 다수가 Phase 2 목표(Element 모델, elementMap SSOT)를 서술한다. 현재 코드는 Page가 text/style를 직접 보유하는 이전 단계다 — 코드와 다르면 CurrentState.md(동결 시점까지) + `.itda/timeline.md`(전환 이후)가 최종 근거(D-029, DocumentationHierarchy.md).

## 검증 (D-028)
- domain/store/persistence/command/history 변경 시: 같은 폴더에 *.test.js를 추가/갱신하고 `node --test` 전체 통과(fail 0)를 확인한다. 테스트 개수는 세션마다 늘어나므로 특정 숫자를 기준으로 삼지 않는다. 테스트 없는 기능/버그 수정은 미완료다.
- ui/*.js, index.html/output.html embedded script 변경 시: Playwright 임시 E2E 스크립트로 검증 → 스크립트 삭제 → docs/ManualTestChecklist.md에 결과 한 줄 기록.

## 문서 갱신 형식
- docs/TODO.md: 새 항목은 7필드(Priority/Status/Reason/Impact/Dependency/Risk/Completion Criteria). 완료 항목은 한 줄로 압축하고 CurrentState.md 세션 번호를 연결한다.
- docs/CurrentState.md: append-only. 세션 번호(9-NN)로 절을 추가하고 배경/구현/변경 파일/검증/다음 단계 진입 시 주의사항 구조를 따른다.

## 금지 패턴 (대안 포함)
- alert()/confirm() → 2단계 인라인 확인 버튼(is-confirming 패턴, 기존 Song/Page 삭제 참조)
- prompt() → showTextPrompt() 인앱 모달(index.html에 이미 존재)
- localStorage 직접 접근 → persistence/StorageAdapter.js 경유
- dispatch() 직접 호출 → CommandBus.execute() 경유

## 에스컬레이션 (구현하지 말고 제안만)
- 새 Decision이 필요해 보이는 설계 판단
- 기존 D-NNN과 충돌하는 요구(TODO.md의 ⚠ 항목: 스타일 프리셋 다중 적용=D-024, Song Undo=D-027)
- 문서 구조 변경(파일 분리/통합/Tier 변경)
단, 완료 처리에 필요한 루틴 기록(TODO 체크, ManualTestChecklist 갱신)은 계속한다. (세션 기록은 ITDA 캡처가 자동 수행 — 2026-07-23 전환.)

## Skills
- domain/, store/, persistence/, command/, history/ 아래 파일을 수정하거나 새 모듈 파일을 만들기 전: .claude/skills/architecture-review 적용.
- 기존 코드 수정: .claude/skills/fnr-patch — 파일 전체 재작성 금지, Edit 도구로 해당 부분만 최소 패치.
- ui/*.js, index.html/output.html 변경을 커밋하기 전: .claude/skills/e2e-verify — 동작 검증된 Playwright 템플릿을 그대로 사용한다.
- 작업 완료 후 커밋 직전: .claude/skills/session-closeout — 위 "세션 마감 순서"의 실행 절차(명령 포함).

## 프로젝트 기억 (`.itda/`) — ITDA 전환 (2026-07-23)

이 저장소의 기록 체계는 수동(CurrentState.md 세션 절 + Decisions.md
ADR)에서 **ITDA로 즉시 전환**됐다(테스트 성격 — 사용자 확정). 도구는
ITDA 레포(`~/projects/ITDA`)에 중앙 설치돼 있고, 여기엔 데이터만 있다.

- **신규 기록의 정본은 `.itda/`** — 세션 종료 시 transcript가 ITDA 레포
  `c1/data/raw/presenter-/`로 자동 수집되고(SessionEnd 훅), 남길 결정이
  있는 세션은 ITDA 전주기(추출→사람 승인→유입)로 `.itda/`에 기록한다.
- **기존 문서는 동결 아카이브** — `docs/CurrentState.md`·`docs/Decisions.md`
  (D-NNN, 3자리)는 더 이상 append하지 않지만 기재된 결정·주의사항은 계속
  유효하다. `.itda/`의 `D-NNNN`(4자리)과 별개 번호 체계.
- 자동 로드는 아래 컨텍스트 캐시뿐 — 인덱스에만 있는 결정의 상세는
  `.itda/decisions.md`에서 그 D-번호를 찾아 읽는다.
- **롤백 조건**: 기록 공백·품질 저하가 확인되면 마감 순서 3(CurrentState
  append)을 되살리는 것으로 되돌린다.

@.itda/cache.md
