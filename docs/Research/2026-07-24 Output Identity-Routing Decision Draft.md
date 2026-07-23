# [Draft] 모니터별 개별 소스 라우팅(main/bus) — 출력 identity/라우팅 모델 Decision 초안

> **Status: Research — 미채택 (사람 승인 대기).** 채택 전까지 어떤 구현도
> 착수하지 않는다(D-029 규칙 — Decision 확정이 구현에 선행).
>
> 배경: `Research/Observations.md` 2026-07-14 #5 — "음향에서 IEM 주듯이
> 송출소스도 main과 bus로 자유롭게 routing해서 송출할 수 있길 바람"
> (사용자 원 요구, ProPresenter만 제공으로 인지, Emergency Overlay가
> output에만 송출되는 것을 보고 실현 가능 판단). TODO.md P3 항목
> "모니터별 개별 소스 라우팅 (main/bus)"의 Dependency("출력
> identity/채널 구조 설계 + 새 Decision 선행") 이행.
> 재검토 트리거 소화: D-031 Non-goal "출력 대상 선택"이 명시한
> "출력 식별 구조(identity/registry)라는 선행 구조"가 바로 이 문서다.
> 작성: 2026-07-24, deep-reasoner 설계 분석(코드 전수 확인) 기반.

---

# D-0XXX (번호 미부여 — 채택 시 `.itda/decisions.md`에 4자리로 부여)

## 출력은 "논리 feed"로 식별한다 — URL 파라미터로 부여, 단일 채널 + feed 필드로 전달, 정의는 AppSettingsStore·송출 상태는 PresenterState 맵 (안)

### 용어 정의

- **feed** — 논리 송출 소스(음향 콘솔의 main/bus에 해당). `'main'`은
  예약 feed로 항상 존재한다. 사용자가 bus feed를 추가 정의한다.
- **출력 창** — feed를 구독하는 물리 창(output.html 인스턴스). 같은
  feed를 여러 창이 동시에 구독할 수 있다(분배기 대체 — BroadcastChannel
  1:N이 공짜로 제공). **이 설계에는 "물리 창"의 identity가 없다** —
  식별 단위는 feed뿐이다(아래 이유 참조).

### 결정 (안)

1. **identity 부여 — URL 쿼리 파라미터.** 출력 창은
   `output.html?feed=<feedId>`로 열리며, 자신의 feed를
   `URLSearchParams`로 읽는다. **파라미터가 없으면 `'main'`** — 기존
   `output.html` 무설정 워크플로가 코드 그대로 main feed가 된다(하위
   호환의 축). 새로고침해도 URL이 남아 identity가 유실되지 않는다.

2. **전달 — 채널은 지금처럼 1개, 메시지에 feed 필드.** 채널 이름
   `'tc-presenter-output'`은 유지한다. `SHOW_PAGE`/`CLEAR`에
   `feed: string` 필드를 추가하고, 수신 측(output.html)은
   `data.feed === myFeed`일 때만 처리한다.
   `SHOW_OVERLAY`/`CLEAR_OVERLAY`(D-031)는 **feed 필드를 싣지 않는다**
   — 필드 부재가 "모든 feed에 적용"의 의미다(긴급 안내는 전 출력이
   기본값이 맞고, 후일 대상 선택이 필요해지면 필드를 추가하는 확장
   여지만 남긴다 — Non-goal 4 참조).

3. **REQUEST_SYNC 확장 — `{ type: 'REQUEST_SYNC', feed }`.**
   BroadcastOutput은 해당 feed의 현재 상태만 `sendState(feed, {force})`
   로 재전송하고, overlay는 항상 함께 재전송한다(D-031 결정 3 유지).
   feed 필드가 없는 구형 요청은 `'main'`으로 간주한다.

4. **registry의 이원화 — 정의는 영속, 송출 상태는 런타임.**
   - **feed 정의**(어떤 bus가 존재하는가: `outputFeeds: [{ id, name }]`)
     는 `store/AppSettingsStore.js`에 둔다. 행사장 셋업(모니터 구성)은
     행사(Presentation)가 아니라 장비에 종속되고 행사 간 재사용되므로
     스타일 프리셋(D-025)과 같은 부류다. write-through·Undo 없음·
     CommandBus 밖(D-027 경계)이며, D-030 내보내기 봉투에 자동
     동승한다(AppSettingsStore가 이미 export 대상).
   - **송출 상태**(어느 Page가 어느 feed에 live인가)는
     `domain/PresenterState.js`에 둔다. D-004("행사 진행 중에만 의미
     있다, 저장하지 않는다") 우산에 그대로 들어간다.
   - **물리 창의 존재 여부(liveness)는 어디에도 두지 않는다.** 현
     구조의 "발신자는 수신자를 추적하지 않는다 + 늦게 연 창은
     REQUEST_SYNC로 스스로 따라잡는다"는 성질을 feed 단위로 그대로
     보존한다 — 연결 상태 부기가 없으므로 부기가 깨져서 생기는 송출
     사고도 없다(D-009).

5. **라우팅 상태 — `livePageId` 단일 값을 feed 맵으로 전환.**
   ```
   livePageId: string | null
     → livePageIds: { [feedId]: string }   // 키 부재 = 그 feed는 STANDBY
   ```
   `domain/PresenterState.js` 헤더의 `Future: 멀티스크린 지원 시
   livePageIds: { [screenId]: string }` 주석이 예고해 둔 바로 그
   전환이다(원래 의도의 이행 — D-032가 `// Future: backgroundMediaId`
   자리를 이행한 것과 같은 성격).
   - `goLive(state, pageId, feedId = 'main')`,
     `clearLive(state, feedId = 'main')` — **feedId 기본값으로 기존
     호출부·액션 페이로드가 무수정으로 유효**하다.
   - `GO_LIVE`/`CLEAR_LIVE` 액션에 `feedId` 옵션 필드(기본 `'main'`).
     새 액션 타입을 만들지 않는다.
   - `REMOVE_PAGE`는 해당 Page를 **모든 feed에서** 해제한다(현재
     `wasLive` 단일 검사 → 맵 전체 스캔).
   - `getLivePage(feedId = 'main')` — 기존 호출부(CueList Live 표시 등)
     는 무수정으로 main 기준 동작을 유지한다.

6. **Mutation/History — 기존 경로 유지, 세분화하지 않는다.**
   - `deriveMutations()`의 `SET_LIVE_PAGE`는 `livePageIds` **맵 참조
     비교** 하나로 유지한다(feed별 Mutation 타입을 만들지 않는다).
     "어느 feed가 바뀌었나"는 구독자가 알 필요 없다 — BroadcastOutput의
     feed별 dedupe(아래 7)가 바뀐 feed만 실제 전송으로 걸러낸다.
   - `GO_LIVE`/`CLEAR_LIVE`는 feedId가 붙어도 **History Ignore
     유지**(HistoryManager 기존 Ignore 블록 그대로 — 송출 변경은
     일시적 운영 상태라는 Recording Policy가 feed 수와 무관하게
     성립한다).

7. **BroadcastOutput 일반화 — dedupe를 feed별 맵으로.**
   `lastSentPage: Page | null` →
   `lastSentPages: Map<feedId, Page | null>`. `SET_PAGES`/
   `SET_LIVE_PAGE` 통지 시 **정의된 feed 전체를 순회**하며
   `sendState(feedId)`를 호출하고, feed별 참조 비교가 변경 없는 feed의
   전송을 생략한다 — "같은 Page가 Live인 채 내용만 바뀌면 참조가
   바뀐다"는 기존 dedupe 원리(9-7)가 feed별로 그대로 성립한다.
   `lastSentOverlay`는 단일 유지(overlay는 전 feed 공통 — 결정 2).

8. **단계적 도입 — 구조 먼저, UI 나중.**
   - **Phase 1 (구조)**: 결정 1~7의 상태/메시지/수신 필터만 구현.
     feed 정의가 main뿐이면 **관찰 가능한 동작이 현재와 완전히
     동일**해야 한다(기존 `node --test` 전량 통과 + 무파라미터
     output.html E2E가 현재와 동일 — 이것이 Phase 1의 Completion
     Criteria다). 새 UI 없음.
   - **Phase 2 (운용 UI)**: feed 정의 관리 UI(AppSettingsStore),
     bus로 보내는 Live 조작 제스처, feed별 출력 창 열기 버튼
     (`window.open('./output.html?feed=bus1', 'tc-presenter-output-bus1',
     ...)` — 창 이름을 feed별로 분리해 feed당 중복 창 방지, 9-53의
     placeOnSecondaryScreen 재사용). 제스처 형태는 남은 쟁점 1(사람
     결정)이다.
   - Phase 1과 2는 별도 커밋/검증 단위이며, Phase 1만 들어간 상태로
     실행돼도 사용자 가치가 깎이지 않는다(현행 동일).

### 핵심 불변식 (main 무손상의 근거)

> 무파라미터 `output.html`은 `'main'` feed이고, feedId 없는
> `GO_LIVE`는 `'main'`에 송출하며, feed 필드는 항상 실려 나간다.
> 따라서 **"bus를 하나도 정의하지 않은 사용자의 워크플로는 코드
> 경로까지 현재와 동일하다"** — 하위 호환이 조건 분기가 아니라 기본값
> 하나(`feedId = 'main'`)로 구조적으로 성립한다. Live 송출 안정성
> (D-009)에 대한 이번 재설계의 안전선이 이것이다.

### 이유

- **feed = 논리 소스, 물리 창 아님.** BroadcastChannel은 본질이 1:N
  방송이라, 같은 `?feed=`로 창을 몇 개 열든 전부 그 feed를 받는다.
  "출력 identity"를 물리 창 단위로 잡으면 창 등록/해제/생존 추적이
  필요해지지만, feed 단위로 잡으면 **그 registry 문제 전체가 소멸**
  한다 — 발신자는 지금처럼 수신자를 모른 채 방송만 하면 된다. 이는
  음향 콘솔 은유와도 정확히 일치한다(콘솔은 bus에 보낼 뿐, bus 뒤에
  IEM이 몇 개 물렸는지 모른다).
- **URL 파라미터 부여가 가장 단순하고 견고하다.** 창을 여는 주체
  (index.html 버튼)가 "무엇을 여는지" 이미 알고 있으므로 여는 시점에
  identity가 확정되고, URL에 남아 새로고침에도 유지되며, 수동으로
  주소를 쳐서 여는 비상 경로도 공짜로 생긴다.
- **단일 채널 + feed 필드(채널 분리 대신).** REQUEST_SYNC·overlay처럼
  feed 횡단적인 메시지가 이미 있고 앞으로도 생긴다 — 채널을 feed별로
  쪼개면 이런 메시지를 N개 채널에 중복 송신해야 하고, 채널 이름
  상수가 동적 집합이 된다. 메시지 필터 한 줄이 훨씬 싸다. 페이로드가
  전 창에 도달하는 오버헤드는 무시 가능(Page는 소형 JSON, media는
  id만 — Step6 구조 유지).
- **정의/상태 분리가 D-004·D-025를 동시에 만족한다.** feed 구성은
  행사 간 재사용돼야 하므로(행사장 모니터 구성) 영속이 필요하다 —
  PresenterState에 두면 D-004에 의해 재시작마다 증발해 요구와
  충돌한다. 반대로 "지금 무엇이 live인가"를 영속하면 D-004 정면
  위반이다. 두 저장소로 나누면 양쪽 결정을 모두 무수정으로 지킨다.
- **맵 전환(대칭 모델)이 특수화 부채보다 낫다.** main을 기존 필드로
  남기고 bus만 맵으로 추가하면(대안 R-B) 기존 소비자는 무수정이지만,
  "이 Page가 어딘가에 live인가"류의 모든 횡단 로직이 영원히 두 구조를
  검사해야 한다. 맵 + 기본 파라미터 방식은 호출부 무수정이라는 이득을
  거의 그대로 얻으면서 상태 모델은 하나로 유지한다. PresenterState
  헤더의 Future 주석이 이 방향을 애초에 예고했다.
- **RenderModel은 여전히 도입하지 않는다(재검토 의무 이행).**
  OutputArchitecture.md는 "다수 Output 동시 지원"을 RenderModel 재검토
  조건으로 명시한다 — 재검토 결과: 모든 feed가 **같은 Page 모델**을
  통째로 송출하고 출력별 변환(스타일 오버라이드, 전용 콘텐츠)이
  Non-goal이므로, Renderer와 Output 사이에 변환 계층을 둘 이유가 아직
  없다. Stage Monitor 전용 콘텐츠(Non-goal 3)가 착수되는 시점이 진짜
  트리거다.

### 대안 비교 (기각 근거)

**Q1. 출력 identity — 창이 자신이 누구인지 아는 방법**

| 안 | 내용 | 판정 |
|---|---|---|
| I-A. URL 쿼리 파라미터 | `output.html?feed=bus1`, 무파라미터=main | **채택**(부여 방식) — 여는 주체가 이미 알고, 새로고침 내성, 수동 비상 경로 공짜 |
| I-B. 채널 N개 분리 | `tc-presenter-output-bus1` 등 feed별 채널 | 기각 — REQUEST_SYNC/overlay 등 횡단 메시지를 N채널에 중복 송신, 채널 상수가 동적 집합화, 디버깅 표면 N배. 얻는 것은 필터 한 줄 생략뿐 |
| I-C. 단일 채널 + 메시지 target 필드 + 수신 필터 | 발신 시 feed 명시, 수신 측 필터 | **채택**(전달 방식) — I-A와 결합. 부여(I-A)와 전달(I-C)은 서로 다른 층위라 상호 배타가 아니다 |
| I-D. 핸드셰이크 동적 부여 | 창이 익명 접속 → presenter가 id 할당 | 기각 — 발신자가 수신자를 추적하게 돼 현 구조의 안정성 자산(부기 없음) 포기, 새로고침 시 identity 유실(sessionStorage 보조 필요), 복잡도 대비 이득 없음. 유용한 절반(REQUEST_SYNC에 feed 실어 보내기)만 결정 3으로 흡수 |

**Q2. 출력 registry — 존재를 어떻게 알고 어디에 저장하는가**

| 안 | 내용 | 판정 |
|---|---|---|
| R-A. 정의=AppSettingsStore(영속) / 송출 상태=PresenterState(런타임) | 이원화 | **채택** — D-004와 D-025를 동시에 무수정으로 만족(위 이유 참조) |
| R-B. 전부 PresenterState | 구성도 런타임 | 기각 — D-004에 의해 재시작마다 feed 구성 증발. 행사장 셋업 재사용 요구(Observations 원문 "자유롭게 routing")와 충돌 |
| R-C. 전부 AppSettingsStore | 송출 상태까지 영속 | 기각 — livePageIds 영속은 D-004("송출 페이지를 복원할 필요가 없다") 정면 위반. 재시작 시 이전 행사 화면이 튀어나오는 사고 경로 |
| R-D. 물리 창 registry(핑/생존 추적 포함) | 창 단위 등록·해제 | 기각 — feed 모델이 성립하는 순간 불필요해지는 문제를 푸는 안. 연결 부기는 깨질 수 있는 상태를 하나 더 만들 뿐(D-009 역행). 연결 표시 UX가 필요해지면 별도 후속(Non-goal 5) |

**Q3. 라우팅 상태 모델 — livePageId를 어떻게 확장하는가**

| 안 | 내용 | 판정 |
|---|---|---|
| S-A. `livePageIds` 맵(main 포함 대칭) + 액션 feedId 기본값 | 단일 구조 | **채택** — PresenterState Future 주석의 이행. 기본 파라미터로 호출부 무수정, 횡단 로직 단일화 |
| S-B. `livePageId` 유지 + bus만 별도 맵 | 비대칭 이중 구조 | 기각 — main 경로 무접촉이라는 단기 안전은 있으나, REMOVE_PAGE 해제·"어디에 live인가" 검사 등 모든 횡단 로직이 영구 이중화. 작은 코드베이스 + 회귀 테스트 130+건 보유 상황에서 갚을 이유가 없는 부채 |
| S-C. feed→source 간접층(라우팅 테이블 + source별 live) | 콘솔 은유 완전 재현 | 기각 — "여러 출력이 같은 소스를 본다"는 요구는 BroadcastChannel 1:N에서 **같은 feed를 여러 창이 구독**하는 것으로 이미 공짜로 성립한다. 간접층이 실제로 필요한 순간은 "열린 창을 런타임에 다른 feed로 스위칭"하는 요구가 올 때다 — 그때 재검토(그 경우에도 URL만 바꿔 다시 여는 우회가 있다) |

### Non-goal (이번 범위에서 뺀다)

1. **OBS/NDI/캡처 출력** — OutputArchitecture.md Future 자리 유지.
   feed 모델은 BroadcastChannel 너머의 Output 구현이 생겨도 그대로
   재사용 가능하지만, 구현은 완전 별개 설계다.
2. **출력별 스타일 오버라이드/독립 해상도 렌더** — 모든 feed는 같은
   Page를 같은 PageView로 렌더한다. 이 항목이 착수되는 순간이
   RenderModel 재검토의 진짜 트리거다(위 이유 마지막 항).
3. **Stage/Confidence Monitor 전용 콘텐츠**(발표자 노트, 다음 가사,
   시계) — feed 개념이 "자리"는 만들지만, 콘텐츠 타입 확장은 Page
   모델/Renderer에 걸치는 별도 Decision이다.
4. **Emergency Overlay의 feed별 대상 선택**(Observations 2026-07-08
   요구사항 7) — 이번 설계로 선행 구조(identity)는 마련되지만, MVP는
   D-031대로 "모든 출력에 송출"을 유지한다. 대상 선택은 메시지에 feed
   필드를 추가하는 것으로 열려 있다 — 실사용 요구가 오면 소규모 후속.
5. **물리 창 연결 상태 표시 UX**(어느 feed에 창이 붙어 있는지 배지
   등) — liveness 추적을 하지 않기로 한 결정 4의 귀결. 필요 시
   핸드셰이크의 응답 절반만 붙이는 별도 후속.
6. **output.html 간 미디어 캐시/축출** — D-0001 Non-goal 그대로(별도
   realm, 창이 늘어도 각자 자기 IndexedDB에서 resolve하는 Step6 구조
   불변).
7. **Window Management API와의 feed-모니터 자동 매핑**(feed 정의에
   모니터를 기억시키는 것) — 9-53의 "비-primary에 배치"를 넘어서는
   영속 매핑은 화면 토폴로지 변화(케이블 재연결) 시 오배치 위험이
   있어 별도 검토.

### 알려진 한계 (정직 기록)

- **feed 필드 없는 구형 창.** 배포 중 이미 열려 있던 구버전
  output.html은 feed 필터가 없어 모든 SHOW_PAGE를 렌더한다. 단일
  origin 정적 배포라 새로고침으로 해소되는 일시 상태이며, 방어 코드를
  추가하지 않는다.
- **feed 삭제 시 열린 창.** 정의에서 bus를 삭제해도 그 feed로 열린
  창은 남는다 — BroadcastOutput이 그 feed로 더 이상 송신하지 않으므로
  마지막 화면이 잔존한다. Phase 2에서 feed 삭제 시 해당 feed로 CLEAR
  1회 송신으로 해소한다(정의 삭제는 AppSettingsStore 경로지만, CLEAR
  송신은 상태 변경이 아니라 방송이므로 CommandBus 경유 의무가 없다 —
  구현 시 BroadcastOutput에 명시적 API로 둔다).
- **맵 전환의 회귀 표면.** S-A는 기본 파라미터로 호출부를 보호하지만
  `livePageId`를 직접 읽는 소비자(BroadcastOutput, AppStore 파생
  함수, REMOVE_PAGE reducer, index.html 임베디드 UI 일부)는 실수정
  대상이다. Phase 1 Completion Criteria(기존 테스트 전량 통과 + 무설정
  E2E 현행 동일)가 이 표면의 가드다.

### 검증 계획 (구현 시 Completion Criteria 씨앗)

회귀(`node --test`):
1. `goLive(state, p, 'bus1')` 후 main은 불변, `getLivePage()`(무인자)
   결과 불변.
2. feedId 생략 GO_LIVE = main 송출(기존 테스트가 무수정으로 이를
   보증해야 함 — 기존 테스트 수정이 필요해지면 하위 호환 실패 신호).
3. REMOVE_PAGE가 모든 feed에서 해당 Page 해제 + SET_LIVE_PAGE
   Mutation 1회 도출.
4. GO_LIVE(feedId 포함)/CLEAR_LIVE History Ignore 유지(Ctrl+Z 무영향).
5. AppSettingsStore outputFeeds sanitize(손상 항목 제외, main 예약
   보장).

E2E(Playwright, e2e-verify 템플릿):
1. **무파라미터 output.html이 현재와 동일 동작**(STANDBY→송출→CLEAR→
   REQUEST_SYNC 늦은 창) — Phase 1 최우선 가드.
2. `?feed=bus1` 창은 main 송출에 STANDBY 유지, bus1 송출 시 그 창만
   갱신.
3. 같은 feed로 연 두 창이 동일 화면 수신(1:N).
4. bus1 창 늦게 열기 → REQUEST_SYNC(feed)로 bus1 상태만 수신.
5. Overlay는 main/bus 창 모두 표시 + CLEAR가 overlay 안 지움(D-031
   회귀).

### 기존 Decision/원칙과의 충돌 검토

- **D-004**(PresenterState 비저장) — livePageIds는 런타임 유지, feed
  정의는 애초에 PresenterState 밖(AppSettingsStore)이라 충돌 없음.
  오히려 정의/상태 이원화의 근거로 사용.
- **D-009**(안정적 송출 우선) — 핵심 불변식(무설정 main 무손상) +
  Phase 1/2 분리가 이 결정의 이행 방식. 충돌 없음.
- **D-017**(Mutation 타겟 통지) — SET_LIVE_PAGE 단일 유지(맵 참조
  비교), 새 Mutation 타입 불요. 충돌 없음.
- **D-019/D-020**(직렬 큐/부트스트랩) — BroadcastOutput은 구독자라 큐
  밖, output.html renderQueue는 feed 필터 이후 동일. 무관.
- **D-025/D-027**(별도 저장소 경계) — feed 정의는 write-through·Undo
  없음·CommandBus 밖. 경계 준수. **주의**: feed 정의에 Undo를 붙이라는
  요구가 오면 D-027류 에스컬레이션 대상.
- **D-031**(Emergency Overlay) — 직교 메시지·REQUEST_SYNC 재전송·전
  출력 송출 모두 유지. Non-goal "출력 대상 선택"의 재검토 트리거
  ("다중 출력 구조 착수")를 이 문서가 소화하되, 선행 구조 마련까지만
  하고 대상 선택 자체는 Non-goal 4로 재보류. 충돌 없음.
- **D-0001**(캐시 sweep) — 메인 탭 한정 설계였고 output 창 수와 무관.
  창이 늘어도 각 창의 독립 캐시라는 전제 불변. 충돌 없음.
- **OutputArchitecture.md** — "출력 장치별 독립 존재"를 feed로
  구체화. RenderModel 재검토 조건("다수 Output 동시 지원")을
  재검토했고 **도입하지 않음**을 위 이유에 기록(조건 트리거에 대한
  명시적 응답). "Output 추가 시 AppStore/Domain/Renderer 무수정"
  원칙은 livePageIds 전환이 Domain 수정을 포함하므로 문면과 어긋나
  보이나, 그 원칙은 "Output **구현체** 추가"(OBS 등)에 대한 것이고
  이번 건은 "송출 대상이 상태 모델의 차원이 되는" Domain 요구 자체의
  변화다 — 채택 시 OutputArchitecture.md에 feed 절 보강 필요.
- **PresenterState.js Future 주석** — livePageIds 맵 전환은 예고된
  방향의 이행(충돌이 아니라 부합).
- 결론: **기존 D-NNN/D-0NNN과 충돌 없음.** 단 상태 모델·메시지
  스키마·저장소 항목 신설을 포함하므로 D-029 규칙상 구현 전 사람
  승인(Decision 확정)이 필수인 정상 신규 Decision 경로다.

### 결과 (예상 영향 — 채택 시)

- Phase 1: `domain/PresenterState.js`(+test — livePageIds 맵·기본
  파라미터), `store/AppStore.js`(+test — reducer GO_LIVE/CLEAR_LIVE/
  REMOVE_PAGE·deriveMutations·getLivePage), `output/BroadcastOutput.js`
  (feed 순회 + feed별 dedupe + REQUEST_SYNC feed), `output.html`
  (URLSearchParams + 수신 필터 + REQUEST_SYNC에 feed),
  `store/AppSettingsStore.js`(+test — outputFeeds),
  `history/HistoryManager.js`(변경 없음 예상 — Ignore 유지 확인만).
- Phase 2: `index.html`(feed 관리/조작/창 열기 UI), `docs/
  ManualTestChecklist.md`. 문서: `docs/OutputArchitecture.md` feed 절
  보강, TODO 항목 갱신.
- 스키마 영향: Presentation 스키마 무변경(라우팅은 Presentation에
  없다). AppSettings 스키마에 outputFeeds 추가(버전 분기 없이 sanitize
  폴백으로 흡수 가능 — 구현 시 확정).

### 남은 쟁점 (사람이 정해야 할 것)

1. **bus 송출 제스처** — Live 조작 UI를 어떻게 할 것인가: Live 버튼에
   feed 선택 부착 / Page 컨텍스트 메뉴 "bus1로 송출" / "bus follow
   main" 토글(평소 main 미러, 필요 시 분리) 등. 운용 속도에 직결되는
   UX 판단이라 Research가 결론 내리지 않는다(Phase 2 착수 시 확정).
2. **feed 슬롯 방식** — 자유 정의(이름·개수 무제한) vs 고정 슬롯
   (bus1~bus4, 콘솔 은유에 충실·UI 단순). 초안은 자유 정의 쪽으로
   기울지만 사용자 확정 사항.
3. **Phase 1 착수 시점** — P3 트리거(사용자 지정) 관례 유지. 이 문서
   채택과 구현 착수는 분리 가능(D-0001 전례).
4. **Overlay feed별 라우팅을 Phase 2에 포함할지** — Non-goal 4로
   보류했으나 Observations 요구사항 7의 원 수요가 있으므로 사용자
   판단으로 승격 가능.
5. **상태 모델 최종 승인** — S-A(맵 전환)를 권고하나, main 경로
   실수정(알려진 한계 3)의 회귀 위험을 감수할지는 승인 사항. 보수
   선택지 S-B의 기각 근거에 동의하는지 확인 필요.

채택 절차: 사용자 승인 → `.itda/decisions.md`에 D-0NNN 등재(ITDA
전주기) → TODO 항목 Dependency 충족 처리 → Phase 1 구현.
