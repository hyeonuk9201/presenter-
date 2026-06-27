# TC-Presenter CurrentState

본 문서는 현재 구현 상태를 기록한다.
최종 목표 구조는 Architecture.md 및 Decisions.md를 따른다.

최종 업데이트: 2026-06-21 (Implementation Phase Step1~5 + Recording Policy 확정 + Phase B(TODO-001) 완료 + 실사용 버그 수정 + Typography 1~4순위 완료 + Preview Mode Routing/Output 전체화면 제거, Freeze)

---

# 구현 단계 개요

Architecture v1.0(Frozen) 승인 이후 진행한 Implementation Phase의 누적 결과다.
Step1~5는 "기존 reduce() 무수정, 기능/UX 변경 금지" 제약 아래 진행했다.
Phase B는 reduce()에 신규 action 1개(`SET_APP_MODE`) 추가가 불가피했다 — TODO-001 해결을 위한 의도된 예외이며, 사전 합의를 거쳤다.
Typography 1~4순위는 Element Migration(Phase C, 보류 결정)과 무관하게, Page 도메인에 Style 필드를 추가하는 방식으로 reduce() 완전 무수정을 유지하며 진행했다.
Preview Mode Routing/Output 전체화면 제거는 State/Reducer/Persistence/History/Command를 전부 무수정으로 유지한 순수 UI/UX 레벨 수정이다.

| Step | 내용 | 상태 |
| --- | --- | --- |
| Step1 | CommandBus 얇은 Wrapper (Editor → CommandBus → AppStore) | 완료 |
| Step2 | Mutation 기반 Subscriber (storeChanged와 병행) | 완료 |
| Step3 | PersistenceSubscriber (D-015, 저장을 부수효과로 분리) | 완료 |
| Step4 | History Hook + HistoryManager (D-018, 단일 슬롯) | 완료 |
| Step5 | Undo/Redo UI 연결 (키보드/버튼) | 완료 |
| Phase B | Live Mode DOM 의존성 제거 (TODO-001) | 완료 |
| Phase C | Element Migration | **보류** (당분간 진행 안 함, 아래 섹션 참조) |
| Typography 1 | 폰트 색상 (`color`) | 완료 |
| Typography 2 | 줄 간격 (`lineHeight`, 배수 방식) | 완료 |
| Typography 3 | 폰트 굵기 (`fontWeight`, 시스템 폰트만) | 완료 |
| Typography 4 | 텍스트 외곽선/그림자 | 완료 |
| UI/UX-1 | Preview Panel을 appMode 기반으로 분기 (edit→selected, live→live) | 완료 |
| UI/UX-2 | output.html 전체화면 버튼 제거 | 완료 |

여기서부터 **구현 동결(Freeze)**. 토큰/세션 한도로 인한 중단이며, 설계 위반이나 막힌 지점은 없음.

---

# MVP 상태 (Walking Skeleton 기준 변화 없음)

완료(기존과 동일):

* Create (Page 생성)
* Read (CueList / Preview)
* Update (Page 수정)
* Delete (Page 삭제)
* Broadcast (output.html 송출)
* Persistence (localStorage 저장/복원)
* **Undo/Redo (Step5 신규)**
* **Typography: 폰트 색상 / 줄 간격 / 폰트 굵기 / 외곽선·그림자 (신규)**

Domain 모델 자체는 Page 구조 기준으로는 Step1~5/Phase B 동안 변경되지 않았다. Page는 여전히 `text/fontSize/horizontalAlign/verticalAlign`을 직접 보유하며(Element 모델 미도입), `PresenterState`는 여전히 `Session`으로 명칭 통합되지 않았다(D-014 미착수). 단, `PresenterState`에는 Phase B에서 `appMode` 필드가 추가되었다(런타임 전용, 비영속 — 아래 Phase B 섹션 참조). Page 구조에는 Typography 단계에서 `color`/`lineHeight`/`fontWeight`/`textStroke`/`textShadow` 5개 필드가 추가되었다(아래 섹션 6 참조) — 모두 플랫 구조 유지, Element 모델 도입과는 무관.

---

# 1. 변경 파일 목록 (Step5)

## 신규 생성
없음. Step5는 기존 `HistoryManager.js`/`CommandBus.js`를 그대로 사용하는 연결 작업이었다.

## 수정

| 파일 | 변경 내용 |
| --- | --- |
| `index.html` | (1) `history/HistoryManager.js`에서 `undo`/`redo`/`canUndo`/`canRedo` import 추가. (2) 헤더에 `#history-controls`(Undo/Redo 버튼 2개) 마크업 추가 — 기존 `#mode-toggle`/`#output-btn`은 무수정. (3) `.history-btn` CSS 추가. (4) 버튼 클릭 핸들러(`undo(execute)` / `redo(execute)`), `Ctrl+Z`/`Ctrl+Shift+Z`(Mac: Cmd) 키보드 단축키, `subscribe()` 기반 버튼 활성/비활성 갱신(`refreshHistoryButtons`) 추가. |

`history/HistoryManager.js`, `command/CommandBus.js`, `store/AppStore.js`, `ui/CueList.js` 등 Step1~4에서 만든 파일은 Step5에서 **단 1바이트도 수정하지 않았다** — Step4에서 이미 `undo(commandBusExecute)`/`redo(commandBusExecute)` 시그니처와 `HistoryHook`이 완성되어 있었으므로, Step5는 순수하게 "연결"만 하는 작업이었다.

## 무수정 (확인됨, 영향 없음)
Step1~4 시점의 무수정 목록 전체 + `history/HistoryManager.js`, `command/CommandBus.js` (이번 단계에서도 무수정 유지).

---

# 2. Step5에서 추가된 동작

**Undo/Redo 버튼** (`#undo-btn` / `#redo-btn`, 헤더 영역)
- `canUndo()`/`canRedo()`가 `false`면 `disabled` 처리.
- 클릭 시 `undo(execute)` / `redo(execute)` 호출 — `CommandBus.execute`를 그대로 주입(AppStore.dispatch 직접 주입 금지 원칙 준수).

**키보드 단축키**
- `Ctrl+Z` (또는 `Cmd+Z`): undo
- `Ctrl+Shift+Z` (또는 `Cmd+Shift+Z`): redo
- `e.preventDefault()`로 브라우저 기본 동작(예: 텍스트 입력창 내 자체 undo) 충돌 방지. 단, `lyrics-input` textarea에 포커스가 있는 상태에서도 전역 키 리스너가 동작 — 이는 의도된 범위로, textarea 자체 undo와의 충돌 가능성은 다음 섹션 TODO에 기록.

**버튼 상태 갱신**
- 별도의 수동 갱신 호출 없이, 기존 `subscribe()`(storeChanged) 콜백 1개에 `refreshHistoryButtons()`를 추가해 모든 dispatch 이후 자동 갱신되도록 구성. undo/redo가 유발하는 dispatch도 동일 경로로 처리됨.

---

# 3. 검증 내역

Node 스크립트(임시, 삭제됨)로 다음을 확인:
- ADD_PAGE → SELECT_PAGE → undo 2회 → redo 2회 순서로 상태가 정확히 원복/재현됨
- 빈 스택에서 undo/redo 호출 시 안전하게 무동작 (에러 없음)
- undo 실행 중 발생하는 역방향 Command(REMOVE_PAGE 등)가 History에 재기록되지 않음 (재귀 방지 `isApplyingHistory` 플래그 정상 동작 확인)

**실제 브라우저(index.html) 클릭 테스트는 이번 세션에서도 수행하지 않았다.** Step1~4 인계사항에 이미 명시된 대로, 다음 세션 시작 시 가장 먼저 수동 확인 필요.

---

# 4. 남은 TODO와 비범위 항목

## 의도적으로 미루거나 범위에서 제외한 것 (Step1~4에서 이어짐, 변화 없음)
- **CommandRegistry** — 여전히 불필요, 재검토 보류
- **Composite Command / transactionId 묶음** — 여전히 범위 밖
- **범용 Lifecycle Hook Registry** — 여전히 단일 슬롯(HistoryManager 전용) 유지
- **PersistenceState의 saveStatus 활용** — UI 표시 없음, 변화 없음
- **Live Mode DOM 의존성 제거** (Phase B) — **완료** (아래 섹션 5 참조)
- **Element Migration** (Phase C) — **보류**. Element Migration 대신 Typography 기능을 우선 구현하기로 결정(아래 섹션 6 참조). 별도 프로젝트로 취급하는 기조는 유지.
- **텍스트 외곽선/그림자** (Typography 4순위) — **완료** (섹션 6 참조)

## Step5에서 새로 발생한 결정 대기 항목 → 결정 완료

- **SELECT_PAGE/GO_LIVE를 History 기록 대상에서 뺐다.** `history/HistoryManager.js`의 `computeInverse()`에서 `SELECT_PAGE`/`CLEAR_SELECTION`/`GO_LIVE`/`CLEAR_LIVE` 4개 case를 `return null`로 변경 (Ignore 정책). 기존 inverse 계산 로직은 주석으로 보존해 두었다 — 정책을 다시 뒤집어야 할 경우 주석 해제만으로 복원 가능.
  - 검증: Page 추가 2회 → 선택/송출 변경 4회 → 삭제 1회 시나리오에서, History 스택에는 ADD_PAGE 2개 + REMOVE_PAGE 1개만 기록됨(선택/송출 변경은 전혀 기록 안 됨). REMOVE_PAGE Undo가 선택 변경에 막히지 않고 곧바로 정확한 위치로 복원됨을 확인. Undo 진행 중 `selectedPageId`/`livePageId`가 의도치 않게 건드려지지 않음도 확인.
  - 변경 파일: `history/HistoryManager.js` 단일 파일. `reduce()`, `CommandBus.js`, `CueList.js`, `AppStore.js` 등은 무수정.

- **lyrics-input textarea 포커스 중 Ctrl+Z 동작.** 여전히 보류 — preventDefault()로 전역 History Undo가 단독으로 동작하며, 브라우저 기본 텍스트 undo는 발동 기회가 없음(경쟁이 아니라 단독 승리). 텍스트 단위 Local Undo가 필요해지면 Composite Command/별도 스택 설계가 필요한 영역이라 별도 승인 후 진행 예정.

## Known Technical Debt
없음 — CueList의 DOM class(`#app.mode-live`) 의존은 Phase B에서 해소됨 (아래 섹션 참조).

---

# 5. Phase B (TODO-001): Live Mode DOM 의존성 제거

## 범위 판단
Architecture.md TODO-001은 "DOM 기반 Mode 판정 → Session 기반(D-014)으로 이전 검토"라고 적혀 있었으나, D-014(Session 전역 구조 도입)는 Editor Architecture v2.0/Phase 2 단계의 큰 그림이고 현재 MVP는 아직 착수 전이다. Undo/Redo를 막 안정화한 시점에서 Session 아키텍처 전체를 끌어오는 건 리스크 대비 얻는 게 적다고 판단해, "Mode 판정을 DOM이 아니라 state 기반으로"만 해결하는 최소 범위로 좁혀 진행했다 (D-014 전체 도입은 지금 하지 않음 — 사전 합의 완료).

## 변경 파일 목록

| 파일 | 변경 내용 |
| --- | --- |
| `domain/PresenterState.js` | `appMode: 'edit'\|'live'` 필드를 `createPresenterState()`에 추가, `setAppMode(state, mode)` 함수 신규 추가. 기존 `selectPage`/`goLive`/`clearLive`/`clearSelection`은 무수정. |
| `store/AppStore.js` | `reduce()`에 `SET_APP_MODE` case 1개 추가(기존 9개 + Step4의 `INSERT_PAGE_AT` 1개에 이어 총 11개). `deriveMutations()`에 `appModeChanged` 감지 및 `'SET_APP_MODE'` Mutation 추가. |
| `history/HistoryManager.js` | `computeInverse()`의 Ignore case(`SELECT_PAGE`/`CLEAR_SELECTION`/`GO_LIVE`/`CLEAR_LIVE`)에 `SET_APP_MODE`를 합류시킴 — 동일한 결정 배경(일시적 모드 전환, 데이터 변경 없음). |
| `index.html` | 모드 버튼(`.mode-btn`) 클릭 핸들러가 더 이상 `app.className`을 직접 조작하지 않음 — `execute({ type: 'SET_APP_MODE', payload: { mode } })`로 교체. `app.className` 및 `.mode-btn.active` 토글은 `subscribe()` 콜백(`syncAppModeUI`)에서 `state.presenterState.appMode`를 읽어 반영하는 구조로 변경. 초기 렌더 시점 동기화를 위해 `syncAppModeUI(getState())` 1회 명시적 호출 추가(subscribe는 dispatch 이후에만 발동하므로). CSS 셀렉터(`#app.mode-edit`/`#app.mode-live`) 자체는 무수정. |
| `ui/CueList.js` | `document.getElementById('app')?.classList.contains('mode-live')` → `getState().presenterState.appMode === 'live'`로 교체. `getState`는 이미 import되어 있어 추가 import 불필요. |

`command/CommandBus.js`, `domain/Presentation.js`, `persistence/PersistenceSubscriber.js`, `output/*`, `view/*` 등은 **무수정**.

## PersistenceSubscriber 무수정의 의미
`appMode`는 런타임 전용(비영속) 상태이므로, `PersistenceSubscriber.interestedMutations`(`SET_PAGES`/`SET_TITLE`/`SET_SELECTION`/`SET_LIVE_PAGE`)에 `SET_APP_MODE`를 추가하지 않았다 — 이 파일을 건드리지 않은 것 자체가 "저장 대상에서 제외"라는 결정의 구현이다. Page 추가 후 모드 전환을 실행한 뒤 저장된 localStorage JSON을 직접 확인해, `appMode` 키가 없고 `title`/`pages`만 존재함을 검증했다(아래 검증 내역 참조).

## 검증 내역
Node 스크립트(임시, 삭제됨)로 다음을 확인:
- `SET_APP_MODE` 실행 시 `presenterState.appMode`가 정확히 갱신됨
- `SET_APP_MODE`가 History 스택에 전혀 기록되지 않음(`undoCount: 0` 유지) — Ignore 정책 정상 동작
- Page 추가 + 모드 전환 후 저장된 localStorage JSON의 키가 `['title', 'pages']`뿐이며 `appMode`가 포함되지 않음 — 비영속 확인

**실제 브라우저 클릭 테스트는 Phase B에서도 수행하지 않았다.** 특히 이번 변경은 `app.className`을 직접 조작하던 코드를 `subscribe()` 콜백 기반으로 바꾼 것이라, CSS 클래스가 실제로 제때 토글되는지(초기 렌더 포함) 브라우저에서 한 번도 눈으로 확인되지 않은 상태다.

---

# 5-1. 버그 수정: 새로고침 후 첫 Page 작성 시 Undo 버튼 비활성 고정

## 증상 (실사용 보고)
새로고침(`Ctrl+Shift+R`) 후 첫 Page를 작성하면 ↶(Undo) 버튼이 비활성 상태로 남아 있었다. 실제로는 Undo 가능한 상태(`canUndo() === true`)인데 UI가 따라가지 못했다.

## 원인
`CommandBus.execute()`의 내부 호출 순서가 다음과 같다:

```
execute(command)
 ├─ dispatch(action)         // state 변경 + storeChanged 이벤트 발생
 └─ historyHook.afterExecute()  // 이 시점에야 History 스택에 push됨
```

기존 Step5 구현은 Undo/Redo 버튼 갱신(`refreshHistoryButtons()`)을 `subscribe()`(`storeChanged`) 콜백에만 걸어두었다. 그런데 `storeChanged`는 `historyHook.afterExecute()`보다 **먼저** 발생하므로, 버튼 갱신 시점에는 아직 History 스택에 아무것도 안 쌓인 상태(`canUndo() === false`)를 보고 있었다 — 한 틱 늦은 값을 읽는 구조적 타이밍 버그였다.

## 수정
`index.html`에서 `setHistoryHook(HistoryHook)`로 원본을 그대로 등록하던 것을, **원본 `afterExecute`를 호출한 뒤 `refreshHistoryButtons()`를 추가로 호출하는 합성(thin wrapper) Hook**으로 교체했다:

```javascript
setHistoryHook({
  afterExecute(action, prevState) {
    HistoryHook.afterExecute(action, prevState)
    refreshHistoryButtons()
  },
})
```

이렇게 하면 "History 스택이 실제로 갱신된 직후" 시점에 항상 버튼이 갱신된다. `CueList.js` 등 다른 파일도 `execute()`를 호출하므로, `index.html` 안에서 개별 호출부를 감싸는 방식으로는 모든 경로를 커버할 수 없었다 — Hook 자체를 감싸는 방식만이 호출 경로 전체(CommandBus를 거치는 모든 곳)를 커버한다. `setHistoryHook`은 여전히 단일 슬롯(D-018) 원칙을 지킨다 — 슬롯에 들어가는 Hook이 1개(합성된 것)라는 사실은 변하지 않는다.

버튼 클릭/키보드 핸들러에도 기존처럼 `refreshHistoryButtons()`를 남겨뒀다(중복 호출이지만 단순 재계산이라 부작용 없음 — 안전망 역할).

## 검증
Node 스크립트로 수정 전/후 동작을 비교 재현:
- **수정 전 방식 재현**: 첫 `ADD_PAGE` 직후 `subscribe` 기반 갱신값(`undoBtn.disabled: true`)과 실제 `canUndo()`(`true`)가 불일치 — 보고된 버그 정확히 재현됨.
- **수정 후**: 동일 시나리오에서 항상 일치 확인. `isApplyingHistory` 재귀 방지 플래그는 합성 Hook이 호출 순서에 끼어들어도 영향받지 않음을 확인(플래그는 `undo()`/`redo()`의 `commandBusExecute` 호출 구간에만 `true`이며, 합성 Hook의 갱신 로직은 플래그 값을 참조하지 않으므로 타이밍 차이가 결과에 영향 없음).

## 변경 파일
`index.html` 단일 파일. `history/HistoryManager.js`(원본 `HistoryHook`/`afterExecute`)는 이번 수정에서 무수정 — 문제는 "Hook을 어떻게 등록하는가"였을 뿐, Hook 자체의 로직은 처음부터 정확했다.

---

# 6. Typography (텍스트 편집 기능) 1~4순위

## 결정 배경
Phase C(Element Migration)는 **보류**한다. 대신 Architecture v1.0 원칙(reduce() 무수정)을 유지하면서 Typography 기능을 우선 구현하기로 했다. 우선순위 분석(GPT 설계 없이 자체 분석, 5순위까지 검토 후 4순위까지만 채택 — 부분 서식은 Element Migration과 같은 범주의 변경이라 제외) 결과:

1. 폰트 색상 — **완료**
2. 줄 간격 — **완료**
3. 폰트 굵기 — **완료**
4. 텍스트 외곽선/그림자 — **완료**
~~5. 부분 서식~~ — 제외 (Content 구조 자체를 바꿔야 해서 Element Migration과 같은 범주, 보류 결정과 일관되게 제외)

## 공통 구조적 결론 (중요)
1~3순위 모두 **정확히 같은 3파일 패턴**으로 끝났다:

```
domain/Page.js   → 필드 + 기본값 추가
view/PageView.js → applyTextStyle()에 CSS 속성 1줄 추가
index.html       → 컨트롤 UI + import/save/load 3곳에 필드 연동
```

`history/HistoryManager.js`, `store/AppStore.js`, `command/CommandBus.js`, `ui/CueList.js`, `persistence/PersistenceSubscriber.js`는 **네 기능 모두에서 단 1바이트도 수정하지 않았다.** 이는 우연이 아니라 구조적 이유다 — `UPDATE_PAGE`/`ADD_PAGE`의 inverse 계산(`computeInverse()`)과 저장 로직(`save()`)이 전체 Page 객체를 통째로 비교/복원/직렬화하기 때문에, Page에 어떤 필드를 추가하든 Undo와 Persistence가 자동으로 따라온다. **4순위(외곽선/그림자)까지 동일 패턴으로 무수정 확인 완료 — Typography 전체에서 예외 없이 성립.**

## 1. 폰트 색상 (`color`)
- 필드: `color` (Hex 문자열, 기본값 `'#ffffff'` — 어두운 배경 가정)
- UI: `<input type="color" id="text-color">`
- 검증: 기본값, `importLyrics` 전달, `ADD_PAGE`+Undo, `UPDATE_PAGE`(색상만 변경)+Undo, localStorage 저장 전부 확인

## 2. 줄 간격 (`lineHeight`)
- 필드: `lineHeight` (배수/multiplier, 기본값 `1.3`, range `1.0~2.0` step `0.1`)
- **설계 결정**: 절대 px가 아니라 배수로 저장 — 폰트 크기가 바뀌어도 행간 비율이 유지되고, 향후 Style Preset 도입 시 `fontSize`와 한 세트로 묶기 쉬움
- UI: `<input type="range" id="line-height">` (font-size 슬라이더와 동일 패턴)
- 검증: 1과 동일한 항목 전부 확인

## 3. 폰트 굵기 (`fontWeight`)
- 필드: `fontWeight` (`'normal' | 'bold'`, 기본값 `'normal'`)
- **범위 결정**: Page별 필드로 구현(전역/Template 레벨이 아님) — 지금까지 `fontSize`/`color`/`lineHeight` 전부 Page별로 갔으므로 일관성 유지. 폰트 패밀리(웹폰트 포함)는 이번 범위에서 제외 — 웹폰트 로딩은 작업량이 커서 별도 작업으로 분리 (3순위 분석 시 "굵기만, 시스템 폰트로 안전하게"로 범위 축소 합의)
- UI: `<select id="font-weight">` (정렬 select와 동일 패턴)
- 검증: 1·2와 동일한 항목 전부 확인

## 4. 텍스트 외곽선/그림자 (`textStroke`, `textShadow`)
- 필드: `textStroke`(외곽선 두께 px, `0~4` 정수, 기본값 `0` = 없음), `textShadow`(boolean, 기본값 `false`)
- **범위 단순화 결정**: 외곽선 색상은 검정 고정, 그림자도 세부 오프셋/불투명도 조정 없이 on/off만 — 컨트롤을 슬라이더 1개 + 체크박스 1개로 최소화. 영상/사진 배경(Media System, 아직 미도입) 도입 시에도 안전한지 사전 검토함: 흰 텍스트+검정 외곽선/그림자는 방송 자막·캡션의 표준 조합이라 배경색이 매 순간 바뀌어도 대비가 거의 항상 유지됨. "검정 텍스트를 검정 배경에 두는" 예외 상황은 색상 선택의 책임 영역이지 외곽선 기능의 책임 영역이 아니라고 판단.
- **구현 방식**: `-webkit-text-stroke`(WebKit 외 호환성 문제) 대신 CSS 표준 속성인 `text-shadow`를 8방향 오프셋으로 합성해 외곽선을 흉내냄 — iPad/Safari 환경(정현욱의 주 사용 환경)에서 vendor prefix 분기 없이 동일 코드로 안정적으로 동작. `PageView.js`에 `buildTextShadow(page)` 내부 함수로 구현, 외곽선 레이어(8개, `textStroke > 0`일 때)와 그림자 레이어(1개, `textShadow === true`일 때)를 쉼표로 합성해 단일 `text-shadow` 값 생성.
- UI: 외곽선 두께는 `<input type="range" id="text-stroke" min="0" max="4">`(font-size/line-height 슬라이더와 동일 패턴), 그림자는 `<input type="checkbox" id="text-shadow">`
- 검증: 기본값, `importLyrics` 전달, `ADD_PAGE`+`UPDATE_PAGE`(둘 다 변경)+Undo, localStorage 저장 확인. `buildTextShadow()` 합성 로직은 별도로 4가지 케이스(둘 다 없음/외곽선만/그림자만/둘 다)를 직접 호출해 CSS 값이 올바르게 합성되는지 확인.

## 의도적으로 안 한 것 (4순위)
- 외곽선 색상 커스터마이징 — 검정 고정 결정의 근거는 위 참조. 필요해지면 `Page.js`에 `textStrokeColor` 필드만 추가하면 되는 구조라 확장 비용은 낮음.
- 그림자 세부 조정(오프셋/블러/불투명도) — on/off만 지원. 마찬가지로 필요해지면 `textShadowOffset` 등 필드 추가로 확장 가능.

## 의도적으로 제외한 것
- **부분 서식(Bold/Italic 등 텍스트 일부만 강조)**: `text` 필드를 평문에서 Rich Text 구조로 바꿔야 해서 Element Migration과 같은 범주의 변경. 지금 Phase C를 보류한 것과 같은 이유로 같이 보류.
- **폰트 패밀리(웹폰트)**: 3순위에서 "굵기만" 범위로 축소하며 명시적으로 제외. 추가 시 `index.html`에 `@font-face`/`<link>` 로딩 및 FOUT(폰트 로딩 지연) 처리가 필요해 별도 작업 단위로 분리 권장.

---

# 7. UI/UX 레벨 수정: Preview Mode Routing + Output 전체화면 제거

이 작업은 **State 구조, Reducer, Persistence, History, Command 전부 무수정**이 명시적 제약 조건이었고, 끝까지 그대로 지켜졌다. 이미 Phase B에서 추가된 `presenterState.appMode`를 그대로 읽기만 했다.

## 7-1. Preview Panel을 appMode 기반으로 분기

### 변경 전 상태 (중요한 사전 확인)
패치 전 `ui/PreviewPanel.js`는 `livePageId`만 보고 있었다 — `selectedPageId`는 전혀 참조하지 않았다. 즉 가운데 프리뷰 패널이 그동안 "지금 송출 중인 화면"만 보여주고 있었던 것이고, 이는 `output/BroadcastOutput.js`(→ output.html)가 보는 데이터와 동일했다(단, 두 구독은 완전히 독립적인 별도 `subscribe()` 호출이라 서로 영향을 주지 않는 구조였음 — 이 사실이 이번 변경의 안전성 근거가 됐다).

### 변경 내용
`ui/PreviewPanel.js`의 `render()` 내부에 분기 1줄 추가:
```javascript
const { appMode, selectedPageId, livePageId } = state.presenterState
const targetPageId = appMode === 'live' ? livePageId : selectedPageId
```
이후 로직(Page 조회, `createPageView` 호출, 대기화면 처리)은 무수정 — `livePageId` 대신 `targetPageId`로 변수명만 바뀌었을 뿐 구조는 동일하다. `getLivePage` import는 더 이상 쓰지 않아 제거했다(`store/AppStore.js`의 `getLivePage` export 자체는 레거시 호환 원칙에 따라 무수정 유지 — 단순히 이 파일에서 안 쓰게 된 것뿐).

### Output 창 영향 없음의 근거
`output/BroadcastOutput.js`는 `PreviewPanel.js`와 별개로 자신만의 `subscribe()`를 가지고 있고, 항상 `state.presenterState.livePageId`만 본다(코드상 `appMode`를 참조하는 줄이 전혀 없음). `PreviewPanel.js`를 바꿔도 이 구독에는 어떤 영향도 없다 — 두 파일은 서로의 존재를 모른다(원래 설계상 의도된 분리). state 레벨 시뮬레이션으로도 확인: Edit/Live 모드를 오가며 `livePageId`가 한 번도 변하지 않음을 검증.

### 검증 내역
Node 스크립트로 `render()`의 분기 로직과 동일한 함수를 복제해 확인:
- Edit 모드 → `selectedPageId` 반환
- Live 모드 → `livePageId` 반환
- 모드를 오가는 동안 `livePageId`(output.html이 보는 값) 자체는 전혀 변하지 않음

**브라우저 실제 렌더링(DOM)은 미확인** — Node 환경에 DOM이 없어 분기 로직만 검증했다. 실제로 프리뷰가 시각적으로 전환되는지는 브라우저에서 확인 필요(아래 섹션 8 주의사항 참조).

## 7-2. output.html 전체화면 UI 제거

### 변경 내용
`output.html`에서 다음을 전부 제거:
- `#fullscreen-btn` 마크업
- 관련 CSS (`#fullscreen-btn`, `#fullscreen-btn:hover`)
- 클릭 핸들러 (`requestFullscreen`/`exitFullscreen` 토글)
- `fullscreenchange` 이벤트 리스너
- `F`/`F11` 키보드 단축키 (`keydown` 리스너 전체 — 이 리스너의 유일한 용도가 전체화면 토글이었으므로 리스너 자체를 제거)

콘텐츠 수신(`channel.onmessage`)과 렌더링(`showPage`/`showStandby`) 로직은 한 글자도 건드리지 않았다.

### 검증 내역
- `grep`으로 `fullscreen`/`Fullscreen` 전체 잔여 참조 없음 확인
- `<script>` 블록을 추출해 Node `--check`로 문법 오류 없음 확인

## 변경 파일
`ui/PreviewPanel.js`, `output.html` — 2개 파일만. **`index.html`은 이번 두 작업에서 전혀 손대지 않았다** (사전 예상은 "index.html + output.html 정도"였으나, 실제로는 `index.html`을 건드릴 필요 자체가 없었다 — `createPreviewPanel()` 호출부는 그대로이고 내부 로직만 바뀌었기 때문).

`store/AppStore.js`, `domain/Page.js`, `domain/PresenterState.js`, `history/HistoryManager.js`, `command/CommandBus.js`, `ui/CueList.js`, `view/PageView.js`, `persistence/PersistenceSubscriber.js` — 전부 무수정.

---

# 8. 다음 단계 진입 시 주의사항

1. **실제 브라우저 클릭 테스트는 일부 수행됨 (실사용 보고 기반).** Undo 버튼 비활성 고정 버그가 실사용 중 발견되어 수정됐다(섹션 5-1). 나머지 항목은 여전히 미확인: Live Mode 전환 시 CSS class 토글(Phase B에서 `subscribe()` 기반으로 바뀐 부분), output.html 송출, CueList Live Mode 중 클릭 시 GO_LIVE 동반 실행, Typography 1~4순위 전체(색상 picker/줄간격 슬라이더/굵기 select/외곽선 슬라이더·그림자 체크박스가 실제로 미리보기·송출 화면에 반영되는지, 외곽선 8방향 합성이 시각적으로 깨지지 않는지, 슬라이더 실시간 표시값이 끊김 없이 갱신되는지), **그리고 Preview Mode Routing(Edit↔Live 모드 전환 시 프리뷰가 selectedPage↔livePage로 실제로 전환되는지, 전환 순간 깜빡임 없는지, Live Mode 중 CueList 클릭 시 프리뷰가 즉시 갱신되는지)과 Output 전체화면 버튼 제거(실제로 화면에서 안 보이는지, 화면 크기가 깨지지 않는지, 기존에 `F` 키를 다른 용도로 쓰고 있지 않았는지)** — 검증은 전부 Node 스크립트로만 이루어졌고 브라우저 시각 확인은 없었다.

2. **SELECT_PAGE/GO_LIVE/SET_APP_MODE의 History 기록 여부는 결정 완료.** 모두 Ignore. 재검토 필요해지면 `computeInverse()` 해당 분기만 `null` 반환 제거 — 다른 파일에 영향 없음.

3. **Phase C(Element Migration) 진입 전 동일 주의사항 유지, 추가 갱신.** `deriveMutations()`(AppStore.js)와 `computeInverse()`(HistoryManager.js) 둘 다 `state.presentation.pages`라는 MVP 구조를 직접 참조하는 건 Step1~4 때와 동일하지만, Phase B에서 `deriveMutations()`에 `appModeChanged` 분기가, `computeInverse()`에 `SET_APP_MODE` case가 추가되어 두 함수의 형태가 한 번 더 바뀌었다. Element 모델 도입 시 이 두 함수는 반드시 같은 세션에서 함께 갱신해야 하며, 부분 전환 시 Mutation 타입과 Undo 계산이 서로 다른 스키마를 가리키게 되어 즉시 깨진다. **Phase B가 추가한 `appMode` 관련 분기는 Element 구조와 무관하므로 Element Migration 시 그대로 둬도 된다** — `presentation.pages` 관련 분기만 갱신 대상이다.

4. **Phase B는 `PresenterState`에 필드를 추가했다는 점에서 Step1~5와 성격이 다르다.** Step1~5는 "기존 reduce() 무수정"을 지켰지만 Phase B는 `SET_APP_MODE` 1개 case 추가가 불가피했다(사전 합의됨). Phase C에서 "reduce() 무수정" 원칙을 다시 적용할지, 혹은 Phase B처럼 합의된 예외를 허용할지는 Phase C 착수 전 별도로 확인 필요 — Element Migration은 구조적으로 reduce() 전체 재작성이 불가피할 가능성이 높다.

5. **Typography 1~4순위와 Preview Mode Routing/Output 전체화면 제거까지 모두 완료됐다.** 다음 갈래는 다음 중 하나: (a) 보류 중인 Phase C(Element Migration) 착수 — 이 경우 reduce() 무수정 원칙을 계속 지킬지 결정부터 필요(주의사항 4번 참조), (b) Typography 4순위의 "의도적으로 안 한 것" 확장(외곽선 색상 커스터마이징, 그림자 세부조정) — `Page.js` 필드 추가 + `buildTextShadow()` 로직 확장만 필요, (c) 누적된 미확인 브라우저 테스트 전체를 실제로 수행 — 지금까지 거의 모든 기능이 Node 스크립트 검증에만 의존했다.

6. **GPT QC와 공유할 핵심 한 줄 요약**: "Step5(Undo/Redo UI 연결) → Recording Policy 확정(SELECT_PAGE/GO_LIVE/CLEAR_SELECTION/CLEAR_LIVE Ignore) → Phase B(TODO-001, DOM→state 모드 판정) → 실사용 버그 수정(Undo 버튼 비활성 고정) → Typography 1~4순위(색상/줄간격/굵기/외곽선·그림자) → Preview Mode Routing(Edit→selectedPage, Live→livePage) + Output 전체화면 버튼 제거 순서로 진행했다. Phase C(Element Migration)는 보류하고 Typography를 우선했다 — Typography는 Page에 Style 필드(`color`/`lineHeight`/`fontWeight`/`textStroke`/`textShadow`)만 추가하는 방식이라, `UPDATE_PAGE`의 범용 inverse 계산과 저장 로직이 전체 Page 객체를 통째로 다루는 구조 덕에 history/HistoryManager.js·store/AppStore.js·command/CommandBus.js·ui/CueList.js를 네 기능 모두에서 단 1바이트도 안 건드렸다 — reduce() 완전 무수정 유지, 예외 없이 4개 기능 전체에서 확인됨. 4순위는 -webkit-text-stroke 대신 text-shadow 8방향 합성으로 외곽선을 구현했고(iPad/Safari 호환성), 외곽선 색상은 검정 고정(방송 자막 표준 조합, 영상 배경 도입 시에도 안전하다고 사전 검토)으로 범위를 단순화했다. 가장 최근 작업(Preview Mode Routing)은 State/Reducer/Persistence/History/Command를 전부 무수정으로 유지한 순수 UI 레벨 수정으로, `ui/PreviewPanel.js`에 appMode 분기 1줄 추가 + `output.html` 전체화면 코드 제거, 단 2개 파일로 끝났다 — 사전 예상(index.html+output.html)과 달리 index.html은 전혀 안 건드렸다. output.html(BroadcastOutput.js 경로)은 PreviewPanel.js와 완전히 독립된 별도 구독이라 이번 변경의 영향을 받지 않음을 코드 분석과 state 시뮬레이션으로 확인. 부분 서식과 폰트 패밀리(웹폰트)는 Element Migration과 같은 범주의 변경이라 의도적으로 제외했다. Phase B는 PresenterState에 `appMode` 필드와 `SET_APP_MODE` action을 추가한 게 유일한 reduce() 변경이며 사전 합의를 거친 예외다. 브라우저 테스트는 Undo 버그 1건만 실사용 중 발견/수정됐고, 나머지(Typography 전체, Preview Mode Routing, Output 전체화면 제거 포함)는 전부 Node 스크립트 검증에만 의존했다 — 다음 세션에서 실제 화면 확인이 최우선 과제. 다음 갈래는 Phase C 착수, Typography 4순위 확장, 또는 누적 브라우저 테스트 수행 중 결정 필요."
