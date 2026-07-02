# TC-Presenter CurrentState

본 문서는 현재 구현 상태를 기록한다.
최종 목표 구조는 Architecture.md 및 Decisions.md를 따른다.

최종 업데이트: 2026-06-27 (Step6: Media 기능 진행 순서 1~6 전체 완료. 실사용 버그 2건 수정(9-2, 9-3) + initUI 구조 개선(GPT 리뷰 반영, D-020). 편집/송출/이미지/영상 실사용 검증 완료 — Output STANDBY 문제(9-4)는 재현 안 됨. 다음 세션 TODO: 영상 자동재생(9-5). D-019, D-020 참조)

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
| Step6 | Media(이미지/영상) 기능 — MediaStore/MediaRuntimeCache, CommandBus 직렬 큐+async, History async, Page/PageView/output.html/업로드UI, bootstrapMediaCache (D-019, D-020) | **완료, 실사용 검증됨** (편집/송출/이미지/영상 정상. 영상 자동재생은 후속 — 섹션 9-5) |

~~여기서부터 **구현 동결(Freeze)**. 토큰/세션 한도로 인한 중단이며, 설계 위반이나 막힌 지점은 없음.~~ → **2026-06-27 Freeze 해제, Step6 착수.**

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

---

# 9. Media(이미지/영상) 기능 착수 (Step6) — Freeze 해제

## 배경 / 스코프 확정

다음 작업으로 "Page에 텍스트가 아닌 이미지/영상도 추가 가능하게" 만들기로 합의했다(2026-06-27). 핵심 제약은 착수 전 GPT와 맞춘 합의 그대로다:

- Media(이미지/영상 파일)는 IndexedDB에 저장한다. Page(영속 객체)에는 `mediaId`(참조)만 들어간다 — blob URL처럼 휘발성 있는 값은 절대 Page에 영속화하지 않는다.
- View(`PageView.js`)는 순수 동기 함수로 유지한다. IO를 하지 않는다.
- mediaId → blob URL 변환은 Command 단계에서 미리 끝내고, 런타임 캐시(메모리, 비영속)에 채워둔다. View는 그 캐시만 동기로 조회한다.
- `reduce()` / `HistoryManager.js` / `CommandBus.js`는 가능한 한 무수정 유지 원칙을 이어가되, 이번 단계는 Command 실행 모델 자체에 손을 대는 게 불가피했다(아래 참조, D-019로 결정 기록).
- GC(미사용 Media 자동 정리, referenceCount 추적)는 이번 단계에서 명시적으로 제외한다. 이유: 목표가 "mediaId → IndexedDB → output까지 깨지지 않는지" 검증이며, GC까지 들어가면 reference tracking / Page 삭제 lifecycle / persistence cleanup timing까지 동시에 검증해야 해서 디버깅 축이 불필요하게 늘어난다. Phase 2(Element/AssetRegistry 도입, `AssetArchitecture.md`/`FutureDomain.md` 참조) 이후로 미룬다.
- 용어는 `Vocabulary.md`의 기존 "Media" 정의를 따른다. `Asset`/`AssetRegistry`라는 이름은 쓰지 않는다 — 그건 Element 도입을 전제로 한 Phase 2 개념이고, 지금은 Page가 mediaId를 직접 참조하는 MVP 스코프이기 때문이다.

## 진행 순서 (확정, 추천 그대로)

1. ✅ `MediaStore.js` (IndexedDB wrapper) — 완료
2. ✅ Command 단계 resolve 캐시 (`MediaRuntimeCache.js`) + `CommandBus.js` 연동 — 완료
3. ⬜ `Page.js`에 `mediaId` 필드 추가, `isValidPage`에 `'image'`/`'video'` 허용
4. ⬜ `PageView.js`의 `media` 파라미터 실사용 (`<img>`/`<video>`)
5. ⬜ `output.html`이 메인 탭과 독립적으로 자기 RuntimeCache를 유지하며 mediaId → Blob → URL 직접 resolve
6. ⬜ 업로드 UI (파일 선택 → `MediaStore.put()` → `ADD_PAGE`)

이번 세션에서 1, 2를 완료했다. 3~6은 다음 단계.

## 코드 사전 조사에서 확인된 사실 (중요)

`Page.js`/`PageView.js`/`PreviewPanel.js`/`output.html`에 이미 이전 세션(GPT와 설계)에서 남긴 `// Future: mediaId` / `createPageView(page, media = null)` 같은 선행 주석·파라미터가 존재했다. 즉 "View가 media 파라미터를 받는다"는 합의는 이번이 처음이 아니라 사전에 이미 코드 레벨로 박혀 있었다 — 이번 세션은 그 자리를 실제로 채우는 단계의 시작이다.

`output.html`은 `BroadcastChannel`로 통신하는 **별도 탭/창**(독립 JS realm)이다. 메인 탭에서 만든 blob URL(`URL.createObjectURL`)은 다른 탭에서 쓸 수 없다 — 따라서 output.html은 메인 탭과 완전히 독립적으로 자기 자신의 IndexedDB 조회 + 자기 자신의 blob URL 캐시를 가져야 한다. mediaId만 BroadcastChannel로 보내면 양쪽이 각자 resolve하는 구조가 맞다(위 진행 순서 5번).

## 1번: `media/MediaStore.js` (신규)

IndexedDB wrapper. GC 제외, 단순 key-value 저장만 지원:

```
put(mediaId, file) → mediaId   // ID 발급은 utils/id.js의 generateId() 재사용
get(mediaId)        → { blob, mimeType, fileName, size, createdAt } | null
remove(mediaId)                // 제공은 하나, 호출 시점/정책은 범위 밖. 현재 어떤 코드도 자동 호출 안 함
listIds()                      // 디버깅/조회용
```

Page/Presentation/AppStore를 모르는 독립 모듈 — `AssetArchitecture.md`의 "하위 모듈은 상위 Domain을 모른다" 원칙을 mediaId 스코프에서도 유지.

## 2번: `media/MediaRuntimeCache.js` (신규) + `CommandBus.js` 연동

`mediaId → blob URL` 런타임 전용 캐시(메모리, 비영속). 쓰기는 오직 `CommandBus.js`의 Command Handler 경로(`preloadMedia()`)에서만 일어난다 — View/Store/History는 쓰기 권한이 없다. 조회(`peek()`)는 항상 동기이며 캐시 미스 시 IndexedDB를 다시 읽지 않는다(View가 비동기가 되는 것을 막기 위함).

`CommandBus.js`에 `MEDIA_COMMANDS = new Set(['ADD_PAGE', 'UPDATE_PAGE', 'INSERT_PAGE_AT'])` whitelist를 추가했다. `INSERT_PAGE_AT`을 포함한 이유: `REMOVE_PAGE`의 undo가 `INSERT_PAGE_AT`을 주입하므로(`HistoryManager.js`의 `computeInverse` 참조), 이걸 빼면 이미지/영상 Page를 삭제 후 Undo로 복원할 때 캐시가 비어 있을 수 있다.

### 구조적 변경 (D-019로 별도 기록 — 단순 구현이 아니라 Architecture Decision)

media가 있는 Command는 `dispatch()` 전에 IndexedDB 조회(`await`)를 거쳐야 하므로, `CommandBus.execute()`가 **async 함수**가 됐다. 이로 인해 두 가지 잠재 결함이 드러났고(둘 다 fake-indexeddb 테스트로 실제 재현 후 수정):

1. **순서 역전**: fire-and-forget으로 `execute()`를 연속 호출하면, media 있는 Command(지연)가 media 없는 Command(즉시 완료)에게 새치기당해 호출 순서 ≠ dispatch 순서가 될 수 있었다. → `execute()` 내부에 단일 Promise 직렬 실행 큐를 추가해 호출 순서를 강제 보장하도록 수정. 외부 호출 계약(`execute(command)`를 그냥 호출하고 끝내는 패턴)은 무수정.
2. **History 재귀 기록 방지 무력화**: `HistoryManager.undo()`가 sync 함수일 때는 `commandBusExecute(...)`가 반환한 Promise를 기다리지 않고 `isApplyingHistory`를 즉시 풀어버려, media Command의 실제 dispatch 시점엔 이미 플래그가 꺼져 있을 수 있었다(지금까지는 `computeInverse`에 `INSERT_PAGE_AT` 케이스가 없어서 결과적으로 안전했을 뿐인 잠재 결함 — 테스트에서 그 케이스를 일부러 추가해 재현 확인). → `undo()`/`redo()`를 async로 전환하고 `await commandBusExecute(...)` 후에 플래그를 해제하도록 수정.

상세 결정 배경/대안 검토는 `Decisions.md` D-019 참조.

## 검증 내역

fake-indexeddb 기반 Node 스크립트로 검증(브라우저 시각 확인 아님 — 섹션 8-1과 동일한 한계):

- `MediaStore.js` 단독: put/get 라운드트립, 없는 키 조회(null), 재저장 덮어쓰기, image/video mimeType, remove, 잘못된 입력 방어 — 18개 케이스
- `CommandBus.js` + `HistoryManager.js` 통합: 텍스트 전용 회귀 없음, media Command 캐시 선행 채움, **연속 fire-and-forget 호출 5개까지 순서 보장**, REMOVE_PAGE→Undo(INSERT_PAGE_AT)로 media Page 복원 시 캐시 유지, 캐시 히트 시 IndexedDB 재조회 안 함, History가 캐시를 건드리지 않음, 존재하지 않는 mediaId라도 dispatch가 막히지 않음, **`computeInverse`에 `INSERT_PAGE_AT`을 일부러 기록 대상으로 패치해도 재귀 기록 안 됨**(우연한 안전이 아니라 실제 보장임을 직접 검증) — 21개 케이스

검증용 임시 파일/패키지(`fake-indexeddb` 등)는 모두 삭제했다. 실제 소스에는 테스트 코드가 남아있지 않다.

## 변경 파일 목록

### 신규 생성
`media/MediaStore.js`, `media/MediaRuntimeCache.js`

### 수정
`command/CommandBus.js`(execute 직렬 큐 + preloadMedia, MEDIA_COMMANDS whitelist), `history/HistoryManager.js`(undo/redo async 전환)

### 무수정 (확인됨, 1~2번 시점 기준)
`store/AppStore.js`, `domain/Page.js`, `domain/Presentation.js`, `domain/PresenterState.js`, `persistence/PersistenceSubscriber.js`, `view/PageView.js`, `ui/CueList.js`, `output/BroadcastOutput.js`(전송 로직 자체는 무수정, 주석만 정리), `index.html`(1~2번 시점)

`PersistenceSubscriber.js`가 무수정으로 끝난다는 사전 예측이 코드 분석으로 확인됐다 — `save()`가 `presentation.pages`를 통째로 `JSON.stringify`하므로 Page에 `mediaId` 필드가 추가되면(다음 단계 3번) 자동으로 저장 대상에 포함된다.

## 9-1. 진행 순서 3~6번 완료

`domain/Page.js`(`createImagePage`/`createVideoPage` 추가, `{ id, type, mediaId }` 최소 구조 — fit/loop/autoplay는 후속 단계, `isValidPage`에 image/video + mediaId 필수 검증 추가), `view/PageView.js`(media 파라미터 실사용 — `<img>`/`<video>` 레이어, 캐시 미스 시 "미디어를 찾을 수 없음" placeholder), `output.html`(독립 IndexedDB/RuntimeCache로 자체 resolve, resolve 끝날 때까지 현재 화면 유지 후 한 번에 교체 — 로딩 UI 없음, `SHOW_PAGE`/`CLEAR` 모두 직렬 큐로 순서 보장), `index.html`("미디어 추가" 버튼 + 파일 input, MIME 타입으로 image/video 자동 분기), `ui/CueList.js`(fingerprint에 `type`/`mediaId` 추가 — text만 보던 기존 fingerprint가 미디어 교체를 감지 못하던 문제 수정, 삭제 확인 다이얼로그를 기존 `getPreviewText()` 헬퍼로 통일 — image/video Page가 항상 "(빈 페이지)"로 잘못 표시되던 문제 수정).

## 9-2. 버그 수정: Preview/Output 둘 다 "미디어를 찾을 수 없음" 표시 (실사용 중 발견)

**증상**: 미디어 추가 후 CueList에는 뜨지만, 클릭해도 메인 탭 Preview Panel과 Output 창 둘 다 placeholder("미디어를 찾을 수 없음")만 보임.

**원인**: `ui/PreviewPanel.js`의 `render()`가 `const media = null`을 그대로 하드코딩하고 있었다 — 9번 섹션 작업 당시 `view/PageView.js`의 `media` 파라미터를 실사용하도록 고쳤지만(3~4번), 이 파일을 실제로 호출하는 `PreviewPanel.js` 쪽 연결을 빠뜨렸다(작업자 실수, "무수정"으로 잘못 기록했던 위 9번 변경 파일 목록 396번째 줄 참조 — 정정 완료). Output 창이 "둘 다" 안 보였던 이유는 단순하다: Output은 Preview에서 보이는 것과 별개의 독립 resolve 경로지만, mediaId 자체가 잘못된 게 아니라 메인 탭 Preview가 캐시를 못 읽는 거였으므로 Output 쪽 자체 resolve(`output.html`)는 정상이었을 가능성이 높다 — 다만 사용자가 "둘 다 안 보임"으로 보고한 시점에 Output을 따로 디버깅하지 않았으므로, 다음 확인 시 Output이 실제로 정상 동작했는지 별도로 검증 필요(아래 "남은 확인 필요" 참조).

**수정**: `ui/PreviewPanel.js`에 `import { peek as peekMediaCache } from '../media/MediaRuntimeCache.js'` 추가, `const media = peekMediaCache(page.mediaId)`로 교체.

**검증**: jsdom + fake-indexeddb로 "수정 전 코드 재현 → 실패 확인 → 수정 후 → 통과 확인" 양방향 모두 실행해 원인-수정 인과관계를 직접 증명했다(수정 전: 3개 케이스 전부 실패 재현, 수정 후: 3개 전부 통과). 검증용 파일은 삭제했다.

**같은 종류의 누락이 더 있는지 전체 검색**: `createPageView(`를 호출하는 모든 곳을 grep으로 재확인했다. `ui/PreviewPanel.js`(수정 완료), `output.html`(처음부터 정상 연결), `test.html`(media 인자 없이 호출하지만 index.html/output.html과 무관한 별도 독립 테스트 페이지 — Walking Skeleton 시절 코드로 보이며 실제 사용 흐름에 영향 없음, 그대로 둠) 외 다른 호출부는 없다.

### 9-2 검증 결과 (브라우저 실사용으로 확인됨, 9-3에서 진행)

이 절의 수정(PreviewPanel.js media 연결)은 실제로 맞는 수정이었다 — 9-3에서 브라우저 디버그 로그로 직접 확인됐다: 새로 추가한 image Page는 Preview/Live 양쪽에서 정상 표시된다. 다만 9-2 수정만으로는 충분하지 않았다 — 이전 세션에 만든(부트스트랩으로 복원된) Page는 여전히 실패했고, 그 원인과 수정은 9-3에 기록한다. Output 창의 "스탠바이만 뜨는" 문제도 별도로 발견됐으나 이는 9-2/9-3의 media 캐시 문제와는 무관한 제3의 버그로 보이며(새로고침 전후로 거동이 다름), 아직 원인 미확정 — 다음 세션 최우선 과제(9-4 참조).

## 9-3. 버그 수정: 새로고침 전(부트스트랩) 복원된 Page는 캐시가 영구히 비어있음 (실사용 중 발견)

**증상**: 새로 추가한 image Page는 Preview/Live 모두 정상 표시. 그러나 **이전 세션부터 CueList에 있던(즉 localStorage에서 복원된) image Page**를 클릭하면 Preview에서 계속 "미디어를 찾을 수 없음"이 뜸.

**진단 과정**: 9-2 수정 직후에도 동일 증상이 재발했다는 보고를 받고, 처음에는 "또 새로고침 캐시 휘발 문제"라고 추측했으나 사용자가 정확히 지적한 대로 추측 단계에서 멈추지 않고 검증을 거쳤다. fake-indexeddb/jsdom 시뮬레이션으로 "방금 추가 직후" 케이스를 먼저 재현했으나 **재현되지 않았다**(로그상 항상 정상 순서로 동작) — 시뮬레이션 환경의 한계로 판단해 실제 브라우저에 임시 `console.log('[DEBUG-N] ...')` 13곳(`index.html`, `ui/CueList.js`, `ui/PreviewPanel.js`, `output/BroadcastOutput.js`, `command/CommandBus.js`)을 심어 실제 콘솔 로그로 확정했다.

**원인**: `store/AppStore.js`의 `state.presentation` 초기값은 모듈 로드 시점에 `loadPresentation()`(localStorage)으로 직접 채워진다(`store/AppStore.js` 61~71번 줄). 이 경로는 `CommandBus.execute()`를 전혀 거치지 않으므로, 거기 담긴 image/video Page의 `mediaId`는 `preloadMedia()`가 단 한 번도 호출되지 않은 채로 남는다. 이후 그 Page를 클릭(`SELECT_PAGE`)해도 `SELECT_PAGE`는 `MEDIA_COMMANDS` whitelist에 없는 Command라 캐시를 채우지 않으므로, `MediaRuntimeCache.peek()`이 영구히 `null`을 반환한다. 실제 콘솔 로그(`mediaId=1782740919736-nitch → NULL`, 다른 정상 mediaId들보다 한참 이른 타임스탬프)로 "예전 세션에 만든 mediaId만 실패"함을 직접 확인했다.

**수정**: `command/CommandBus.js`에 `bootstrapMediaCache(pages)` 신규 export. 내부적으로 기존 `preloadMedia()`를 재사용해 인자로 받은 Page 배열 전체의 media를 일괄 캐시에 채운다(dispatch/History 기록 없음 — 순수 부수효과). `index.html`이 앱 부팅 시 **다른 모든 이벤트 핸들러 등록보다 먼저**, fire-and-forget으로 `bootstrapMediaCache(getState().presentation.pages)`를 호출한다.

**시행착오**: 처음엔 `await bootstrapMediaCache(...)`를 초기화 블록 안에 그대로 두어, 그 아래 위치한 모든 버튼(가사 추가/미디어 추가/저장 등) 이벤트 리스너 등록이 이 `await` 때문에 전부 지연되는 문제가 있었다. 이를 fire-and-forget(await 없이 호출)으로 바꿔 피했으나, "PresenterState가 항상 null로 시작한다는 사실에 기댄 레이스 의존 설계"라는 지적(GPT 리뷰)을 받아, 최종적으로 "이벤트 핸들러 등록"과 "UI 생성"을 `initUI()`라는 명시적 async 함수로 분리했다 — 모든 핸들러 등록은 동기로 즉시 끝나고, `initUI()` 안에서만 `await bootstrapMediaCache(...)` 완료 후 `createCueList`/`createPreviewPanel`/`createBroadcastOutput`이 이어진다. `initUI()` 호출 자체는 스크립트 맨 끝(모든 핸들러 등록 완료 후)에서 이루어진다.

**검증**: jsdom + fake-indexeddb로 "새로고침 전 image Page 2개 + 텍스트 1개 추가 → 새 세션(모듈 전체 재로드)으로 복원 → `bootstrapMediaCache()` 호출 → 캐시 채워짐 → 클릭 시 정상 렌더링" 흐름을 11개 케이스로 검증, 전부 통과. 임시 디버그 로그 13곳은 원인 확정 후 전부 제거했다(`grep -rn "\[DEBUG-"`로 잔존 여부 재확인 완료).

**상세 결정 배경**: `Decisions.md` D-020 참조.

### 9-4. 별도 버그로 보고됐던 것: Output 창이 "새로고침 전엔 STANDBY만, 새로고침 후엔 정상" — 최종 검증에서 재현 안 됨

9-3 디버깅 도중 한 차례 보고됐던 별개의 증상. 메인 탭에서 텍스트/이미지 추가 → CueList 클릭 → Live 전환까지 다 정상 진행한 직후 Output 송출을 누르면 STANDBY만 뜨고, 그 상태에서 새로고침 후 다시 송출하면 정상 작동한다고 보고됐었다.

**이번 세션 최종 검증(9-3 수정 + initUI 구조 개선 이후)에서는 편집/송출/이미지/영상 전부 정상 동작을 확인받았다** — 이 문제가 재현되지 않았다. 정확한 인과관계는 확인되지 않았지만, 정황상 9-3에서 고친 것(부트스트랩 시 media 캐시 미채움)과 관련된 간접 증상이었을 가능성이 있다 — 다만 이건 추측이며 직접 검증되지 않았으므로 사실로 단정하지 않는다.

**다음 세션에서 재발 시 확인할 것**: 재현 조건을 다시 정확히 좁히고(어떤 순서/타이밍에서 발생했는지), `output.html` 자신의 콘솔(메인 탭과 별개)에 로그를 심어 원인을 추적한다. 지금까지의 디버그 로그는 전부 메인 탭 콘솔 기준이었다.

## 9-5. 영상(video) Page 자동재생 (완료, 2026-07-02)

기존 `view/PageView.js`의 `createVideoLayer`는 `controls`만 켜고 `autoplay`/`loop`/`muted`는 넣지 않아, Live 송출 시 영상이 자동재생되지 않고 클릭으로 직접 재생해야 하는 불편함이 있었다.

**결정 및 구현**:
- `autoplay` + `muted` 추가 — 브라우저 autoplay 정책상 muted 없이는 차단되며, 사용자가 원하는 default로 확인됨(음소거 아이콘 등 추가 UI는 이번 범위 밖).
- `loop` 추가 — 영상 종료 시 반복 재생.
- currentTime 리셋 관련 별도 코드는 추가하지 않음 — Page 재클릭 시 `createPageView()`가 매번 새 `<video>` 엘리먼트를 생성하는 기존 구조상 자연히 처음부터(`currentTime=0`) 재생되므로 추가 구현 불필요.
- Page별로 켜고 끄는 옵션이 아니라 `view/PageView.js`에 고정 기본값으로 구현(`domain/Page.js`의 `createVideoPage` 주석 참조) — Page 단위 설정이 필요해지면 그때 필드로 승격.

**수정 파일**: `view/PageView.js`(`createVideoLayer`), `domain/Page.js`(stale "Future" 주석 정리).

**실사용 검증 완료(2026-07-02, iPad)**: 자동재생/무음/반복 정상 동작 확인.

## 9-6. 버그 수정: Live 먼저 켠 뒤 Output을 나중에 열면 STANDBY에 멈춤 (2026-07-02, 실사용 발견)

### 증상
더블모니터 실사용 테스트 중 발견. Live 모드에서 이미 어떤 Page가 표시 중인 상태로, Output 창(두 번째 모니터)을 나중에 열면 STANDBY 화면에서 멈추고, CueList에서 아무 Page나 재클릭해야 정상 표시됨.

과거 9-4로 보고됐다가 "재현 안 됨"으로 종결된 것과 동일 원인으로 추정 — 그때는 "새로고침하면 된다"고 정리됐는데, 진짜 트리거는 새로고침이 아니라 "Live 상태에서 Page 재클릭"이었을 가능성이 높다.

### 원인
`output/BroadcastOutput.js`는 Store의 `livePageId` 변경 시점에만 `SHOW_PAGE`를 BroadcastChannel로 전송한다. BroadcastChannel은 발신 시점에 존재하는 리스너에게만 전달되므로, Output 창이 그 시점에 아직 안 열려있었으면 메시지를 영영 못 받는다 — Output 쪽엔 "지금 상태가 뭔지" 능동적으로 물어보는 절차가 없었다.

### 수정
- `output.html`: 로드 시 `REQUEST_SYNC` 메시지를 채널에 전송
- `output/BroadcastOutput.js`: `REQUEST_SYNC` 수신 시 `livePageId` 변경 여부와 무관하게 현재 상태를 강제 재전송(`sendState({ force: true })`)하도록 리팩터링. 기존 "변경 시에만 전송" 로직은 유지(dedupe).

### 변경 파일
`output.html`, `output/BroadcastOutput.js`

### 검증
코드 리뷰로 로직 확인함. **실사용 테스트 필요**: Live 먼저 켜고 → Output 창 나중에 열기 → 즉시 정상 표시되는지 확인.

## 문서 정리 (부수 작업)

`docs/presenter/` 폴더 전체 삭제. 압축 파일에 예전 Obsidian 볼트가 그대로 섞여 들어와 있었다 — 20개 md 파일은 `docs/` 루트와 줄바꿈 문자(CRLF/LF)만 다르고 내용은 100% 동일한 중복이었고, `CurrentState.md` 1개만 내용이 달랐는데 2026-06-14 시점의 stale 버전(Freeze 이전)이라 폐기했다. `docs/`에는 이제 21개 문서만 남는다.

## 다음 단계 진입 시 주의사항

1. **`Page.js`에 `mediaId`를 추가할 때 `isValidPage()`도 같이 갱신해야 한다.** 현재 `isValidPage()`는 `['text']`만 허용한다(주석으로 `// 미래: 'image', 'video' 추가`가 이미 박혀 있음). 다만 `Presentation.js`의 `addPage()`/`insertPageAt()`은 `isValidPage()`를 호출하지 않는 구조라(검증 없이 그대로 추가), 이 부분이 막혀 있어서 이번 세션 진행이 막혔던 건 아니다 — 다음 단계에서 `isValidPage()`를 검증 게이트로 실제로 쓰는 곳이 생기면 그때 동기화 필요.
2. **`preloadMedia()`가 `payload.page.mediaId`만 본다.** `Page.js`에 `mediaId` 필드를 추가할 때 이름을 다르게 짓지 않도록 주의 — `CommandBus.js`와 이름이 일치해야 한다.
3. **output.html 쪽 RuntimeCache는 메인 탭의 `MediaRuntimeCache.js`를 그대로 가져다 써도 된다(모듈 자체는 탭마다 독립 인스턴스가 되므로 공유 코드 재사용에 문제없음).** 다만 output.html이 mediaId를 받는 시점(`BroadcastChannel`의 `SHOW_PAGE` 수신)에 캐시 미스가 나면 어떻게 할지(빈 화면 vs 로딩 표시)는 다음 단계에서 결정 필요 — 아직 정해지지 않음.
4. **업로드 UI(6번)에서 `MediaStore.put()` 호출 시 `mediaId`를 먼저 `generateId()`로 발급한 뒤 넘겨야 한다.** `put(mediaId, file)`는 ID를 발급하지 않고 호출부가 넘긴 값을 그대로 키로 쓴다(설계 의도).
5. **GC는 여전히 범위 밖.** Page를 삭제하거나 이미지를 교체해도 IndexedDB의 Media 레코드는 그대로 남는다 — 의도된 동작이며, Phase 2 이전에는 정리 로직을 추가하지 않는다.

## 디버그 로그 처리 완료 메모

9-3 디버깅을 위해 `index.html`, `ui/CueList.js`, `ui/PreviewPanel.js`, `output/BroadcastOutput.js`, `command/CommandBus.js`에 임시로 삽입했던 `console.log('[DEBUG-N] ...')` 13곳은 원인 확정 후(부트스트랩 미커버 — D-020) 전부 제거했다. `grep -rn "\[DEBUG-" --include="*.js" --include="*.html" .`로 잔존 여부 재확인 완료(매치 없음).
