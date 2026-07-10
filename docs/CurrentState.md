# TC-Presenter CurrentState

본 문서는 현재 구현 상태를 기록한다.
최종 목표 구조는 Architecture.md 및 Decisions.md를 따른다.

최종 업데이트: 2026-07-03 (9-5~9-12 전체 완료 및 실사용 검증: 영상 자동재생, Live/Output 동기화 버그 2건, 영상 위 텍스트 오버레이, iOS 렌더링 이슈 대응, 저장/불러오기 안정성 개선, Transition/AutoAdvance 뼈대. 랩탑(Chrome/Edge) 기준 전체 정상 확인됨 — iPad 전용 렌더링 문제는 실제 운영 환경(데스크탑/랩탑 HDMI·RGB 직결)과 무관하다는 판단으로 우선순위 낮춤/추적 종결. 다음 작업 목록은 TODO.md 참조(2026-07-03부터 여기 요약 대신 TODO.md가 단일 출처). D-019, D-020 참조)

---

# 진행 중인 설계 변경 (2026-07-04, 아직 미구현)

Section 소속 모델을 전면 재검토하는 논의가 진행되어 방향이 확정되었다 —
**아직 코드에는 반영되지 않았다.** 아래 "9. Section 도메인 모델
구현"(9-13~9-15)이 기록한 기존 구현(순서 기반 Range 모델, D-Editor-1)은
이 절 시점까지는 정확한 사실이지만, 최신 설계 방향은 아니다.

- **확정된 결정**: `FutureEditor.md`의 `D-Editor-4`(Page 중심 소속 모델
  — `Page.sectionId`, Section은 순수 grouping metadata, Supersedes
  D-Editor-1/D-Editor-3) 참조. 이 문서에 세부 규칙과 이유가 있다.
- **아직 Research 단계인 아이디어** (구현 범위 아님, 위 결정과 혼동 금지):
  `Research/2026-07-04 Workflow Separation.md` 참조 — Flow View/Content
  Browser 이중 뷰 구조, Library/Asset 재사용 등 장기 방향성.
- **남은 실제 작업**: `TODO.md`의 Section Migration 항목 참조 — 이 절이
  실제 코드로 반영되면 새 세션 번호(예: 9-16)로 여기 다시 기록한다.

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

## 9-7. 영상 위 텍스트 오버레이 (완료, 2026-07-02)

### 요청 배경
워십 영상 재생 중 가사/자막을 함께 띄우고 싶다는 실사용 요청. 코러스 가사 자막 같은 용도.

### 발견: 이미 절반은 되어 있었음
`index.html`의 에디터 UI(lyrics-input textarea + 스타일 사이드바)는 애초에 Page 타입을 구분하지 않고 동작하고 있었다 — video Page를 선택해도 텍스트/스타일 입력창이 그대로 뜨고, 저장(`UPDATE_PAGE`)도 `{ ...page, text, fontSize, color, ... }` 형태로 기존 Page에 필드를 그대로 얹는 구조라 video Page에 text가 저장되는 것 자체는 막혀있지 않았다. **막혀있던 건 `view/PageView.js`가 video 타입일 때 텍스트 레이어를 그리지 않던 것 하나뿐.**

### 구현
- `view/PageView.js`: `page.type === 'video'`이고 `page.text`가 있으면 `createVideoLayer()` 다음에 기존 `createTextLayer()`를 그대로 재사용해 덧붙인다. `createTextPage`와 완전히 동일한 필드명(text/fontSize/color/lineHeight/fontWeight/textStroke/textShadow/horizontalAlign/verticalAlign)을 그대로 재사용하므로 별도 스타일 시스템이 필요 없었다.
- `domain/Page.js`: `createVideoPage()`는 그대로 두되(생성 시점엔 text 없음, 나중에 `UPDATE_PAGE`로 얹힘), 이 흐름을 주석으로 명시.
- `view/slide.css`: `.text-layer`에 `pointer-events: none` 추가 — 텍스트가 하단/상단에만 있어도 레이어 자체는 화면 전체(inset:0)를 덮어서, 영상 위에 얹혔을 때 video의 native controls 클릭을 가로채는 문제를 리뷰 중 발견해 같이 수정했다. 순수 텍스트 Page는 클릭 가능한 요소가 없어 영향 없음.

### 범위 밖으로 남긴 것
- image Page에는 아직 적용 안 함(요청이 video 한정이었음) — 필요해지면 `createPageView()`의 image 분기에 동일한 3줄만 추가하면 됨.
- CueList 미리보기 라벨(`ui/CueList.js`의 `getPreviewText`)은 video Page를 여전히 `(video)`로만 표시 — 오버레이 텍스트 유무는 안 드러남. 사소한 UX 개선 항목으로 필요시 별도 처리.

### 변경 파일
`view/PageView.js`, `domain/Page.js`, `view/slide.css`

### 검증
코드 리뷰로 로직 확인함. **실사용 테스트 필요**: 영상 Page 선택 → 가사 입력 → 저장 → 영상 위에 텍스트가 겹쳐 보이는지, video controls 클릭이 여전히 되는지 확인.

## 9-8. 버그 수정: Live 중인 Page를 편집해도 Output에 반영 안 됨 (2026-07-02, 9-7 직후 실사용 발견)

### 증상
영상 Page가 이미 Live인 상태에서 텍스트 오버레이(9-7)를 추가하고 저장해도 Output(및 재확인 필요하지만 보고 당시엔 Preview도 포함)에 반영되지 않음.

### 원인
9-6에서 만든 `sendState()`의 dedupe가 `livePageId` **값**만 비교했다 — 같은 Page가 계속 Live인 채로 내용만 바뀌는 경우(9-7 텍스트 오버레이가 정확히 이 케이스) `livePageId`는 그대로라 "안 바뀜"으로 판단해 전송 자체를 생략했다. Page 전환(다른 Page로 GO_LIVE)만 감지하고, "같은 Page의 내용 변경"은 놓치는 구조였다.

### 수정
dedupe 기준을 `livePageId` 값 비교에서 **Page 객체 참조 비교**로 변경. `dispatch()`의 `UPDATE_PAGE`는 `domain/Presentation.js`의 `replacePage()`를 거치며 매번 새 Page 객체를 만들기 때문에, "마지막으로 보낸 Page 객체 참조"와 다르면 무조건 재전송한다 — Page 전환과 내용 변경 둘 다 이 하나의 비교로 잡힌다.

### 변경 파일
`output/BroadcastOutput.js`

### 검증
코드 리뷰로 로직 확인함. **실사용 테스트 필요**: 영상 Page를 Live로 띄운 상태에서 텍스트 오버레이 추가 → 저장 → Output에 즉시 반영되는지, Preview도 정상인지 확인.

## 9-9. 버그 수정: iPad에서 영상 위 텍스트가 안 보임 — playsinline 누락 (2026-07-02, 9-8 직후 실사용 발견)

### 증상
9-8 수정 후에도 영상 위 텍스트 오버레이(9-7)가 Preview에서도 안 보임 — Output만의 문제가 아니었음.

### 원인
iOS Safari는 `<video>`에 `playsinline` 속성이 없으면 OS 레벨의 별도 비디오 오버레이 평면으로 렌더링한다. 이 평면은 페이지의 일반 DOM stacking(z-index, DOM 순서)을 완전히 무시하고 항상 최상단에 그려진다 — `.text-layer`가 코드상 `.media-layer` 뒤(위)에 정확히 붙어있어도, iOS에서는 video가 그 위를 덮어버린다. 데스크톱 브라우저에서는 재현되지 않는 iOS 전용 렌더링 특성이라 코드 리뷰만으로는 못 잡았다.

### 수정
`view/PageView.js`의 `createVideoLayer()`에 `video.playsInline = true` 추가.

### 변경 파일
`view/PageView.js`

### 검증
**실사용 테스트 필요**(iPad): 영상 Page에 텍스트 오버레이 추가 → 영상 위에 텍스트가 실제로 보이는지 확인. 이번엔 iOS 전용 렌더링 이슈라 코드 리뷰만으론 확신할 수 없음 — 반드시 iPad에서 직접 확인 필요.

## 9-10. 버그 수정: playsinline 추가 후에도 iPad에서 텍스트가 여전히 안 보임 — GPU 컴포지팅 레이어 문제 (2026-07-02, 9-9 직후 실사용 발견)

### 증상
9-9(playsinline)까지 적용/재확인했는데도 영상 위 텍스트가 iPad에서 계속 안 보임. Pull 최신 반영 확인, 서버 재시작, 가사 저장 정상 동작(입력값 유지)까지 확인됐는데도 재현 — 순수 CSS stacking 문제로 좁혀짐.

### 원인 (추정)
iOS Safari에서 `<video>`는 하드웨어 디코딩 전용 GPU 합성 레이어에서 그려진다. 이 레이어는 일반 DOM 요소들의 합성 단계와 분리되어 있어, `.text-layer`가 DOM상 `.media-layer` 뒤에 있고 z-index도 명시해도 video 위로 올라오지 않을 수 있다 — video 자체가 자기 레이어에서 항상 나중에(위에) 합성되기 때문. `playsinline`은 iOS가 video를 OS 레벨 전체화면 오버레이로 띄우는 것만 막을 뿐, 이 GPU 합성 순서 문제는 별개다.

### 수정
`.text-layer`에 `transform: translateZ(0)` 추가 — 이 요소를 강제로 별도 GPU 합성 레이어로 승격시켜, video와 같은 합성 단계에 들어가게 한다. 이러면 z-index(`.text-layer: 2`, `.media-layer: 1`, 명시적으로 추가)가 정상적으로 작동한다. iOS Safari에서 "video가 z-index 무시하고 항상 위에 뜬다"는 문제의 흔한 우회법이다.

### 변경 파일
`view/slide.css`

### 검증
**실사용 테스트 필요**(iPad, 최우선). 이번에도 재현되면 GPU 레이어 가설 자체가 틀렸다는 뜻이므로, 다음엔 `controls`를 임시로 꺼서 native controls bar 자체가 원인인지 격리 테스트 필요.

**우선순위 조정(2026-07-03)**: 윈도우 랩탑(Chrome/Edge)에서는 텍스트 오버레이/video controls/Live-Output 동기화 전부 정상 확인됨(9-7~9-8 검증 완료) — 코드 로직 자체는 맞다는 뜻이다. iPad에서는 9-10까지 적용해도 여전히 텍스트가 안 보이는 상태로 남아있으나, **실제 운영 환경은 데스크탑/랩탑/맥북 → HDMI/RGB 직결이라 iPad가 송출 기기로 쓰일 일이 없다.** iPad는 모바일 작업 중 코드 확인용(Working Copy + a-Shell)으로만 쓰인다. 따라서 iPad 전용 렌더링 문제는 더 이상 추적하지 않는다 — 재발/재조사 요청 없으면 이 상태로 종결.

## 9-11. 저장/불러오기 안정성 개선 (2026-07-03, 아키텍처 리뷰 후 결정)

### 배경
"영상 자동재생/텍스트 오버레이"보다 우선순위를 높여 진행. 실사용 워크플로우가 "편집 → 저장 → 다음 주 재오픈"인데, 아키텍처 리뷰 중 저장/불러오기 경로에 실제 위험 3가지가 확인됨.

### 발견 및 수정

**① 저장 실패가 완전히 조용함.** `PersistenceSubscriber.save()`는 실패 시 `saveStatus:'failed'`를 기록하지만, 이 상태를 구독하는 UI가 어디에도 없었다(`onPersistenceStateChange` 등록 지점만 있고 실제 구독자 없음). 저장이 실패해도 사용자는 전혀 알 수 없었다 — 다음 주 재오픈 시 데이터가 없는 최악의 시나리오로 이어질 수 있었다.
→ `index.html` 헤더에 `#save-status` 표시 추가. `saving`/`saved`는 조용히, `failed`만 눈에 띄게(빨간 배경, 사라지지 않음). `console.error`도 추가(이전엔 콘솔에도 안 남았음).

**② `isValidPage()`가 정의만 되고 어디서도 호출되지 않음.** `loadPresentation()`이 localStorage의 raw JSON을 검증 없이 그대로 state에 반영 — `pages`가 배열이 아니거나 개별 Page가 손상되어 있으면 이후 렌더링 어딘가에서 예고 없이 죽을 수 있었다.
→ `domain/Presentation.js`에 `sanitizePresentation()` 추가. 정책: "부분 손상은 복구, 전체 손상만 폐기" — `pages` 자체가 배열이 아니면 전체를 폐기(새 프로젝트로 폴백), 개별 Page가 손상되어 있으면 그 Page만 제외하고 나머지는 살린다.

**③ 스키마 버전이 없음.** 저장 형식이 `{ title, pages }`뿐이라 "이 데이터가 어느 시절 구조인지" 구분할 방법이 없었다. Page 필드가 계속 늘어날 예정(transition/autoAdvance 등, 5순위)이라 지금(필드가 적을 때) 버전을 넣는 게 가장 싸다.
→ `persistence/Schema.js` 신설. `CURRENT_SCHEMA_VERSION = 1`, `withSchemaVersion()`(저장 시 버전 부착), `migrateSnapshot()`(로드 시 버전 확인 — 지금은 v1→v1 통과뿐이지만 향후 v1→v2 마이그레이션을 끼워 넣을 자리를 미리 마련). `version` 필드가 없는 기존 실사용 데이터는 v1으로 간주해 그대로 호환.

### 흐름 정리
```
localStorage.getItem
  → JSON.parse
  → migrateSnapshot()   (버전 확인/변환, 미래 버전이면 null)
  → sanitizePresentation() (손상된 Page 제외, 전체 손상이면 null)
  → null이면 AppStore가 새 프로젝트로 폴백
```

### 변경 파일
`persistence/Schema.js`(신규), `domain/Presentation.js`, `store/AppStore.js`, `persistence/PersistenceSubscriber.js`, `index.html`

### 검증
5가지 시나리오(정상/pages 비배열/부분 손상 Page 혼입/버전 필드 없는 구 데이터/미래 버전)를 Node로 직접 실행해 확인함 — 전부 의도대로 동작(정상 통과, null 폴백, 손상 Page만 제외 등). `index.html` 임베디드 모듈 스크립트 구문 검사도 통과. **브라우저 실사용 테스트 필요**: 저장 상태 표시가 실제로 뜨는지(정상 흐름에선 "저장됨"이 조용히 스쳐가는 정도), 기존 저장된 프로젝트(버전 필드 없는 구 데이터)가 문제없이 열리는지 확인.

**실사용 검증 완료(2026-07-03)**: 저장 시 `version:1`이 localStorage에 정상 기록되는 것을 개발자도구로 직접 확인함.

## 9-12. Transition / AutoAdvance 필드 뼈대 추가 (2026-07-03, 아키텍처 리뷰 5순위)

### 배경
아키텍처 리뷰에서 "Page 속성 구조가 향후 확장에 자연스러운가"를 점검한 결과, `transition`/`autoAdvance`는 콘텐츠가 아니라 "Page를 어떻게 넘기는가"에 대한 속성이라 Element 모델 없이도 지금 플랫 구조에 안전하게 얹을 수 있다는 결론(리뷰 대화 참조). 실제 동작(fade 애니메이션, 자동 전환 타이머)은 구현하지 않고 필드만 미리 넣어둔다 — "값은 있지만 아무도 안 읽는다"는 게 이번 범위의 핵심이다.

### 구현
`domain/Page.js`에 `createBehaviorDefaults({ transition, autoAdvance })` 헬퍼 추가. `createTextPage`/`createImagePage`/`createVideoPage` 세 곳 모두 파라미터로 `transition`/`autoAdvance`를 받아 이 헬퍼를 스프레드한다.

```js
transition:   { type: 'none', duration: 300 }   // 'none' | 'fade' | 'cut'
autoAdvance:  { enabled: false, duration: 5000 } // ms
```

### 왜 이것만으로 충분한가
- **Undo/Redo**: `HistoryManager`의 `UPDATE_PAGE` inverse가 Page 객체 전체를 스냅샷 diff하는 방식이라(9-7 검토 때 확인됨), 새 필드가 늘어나도 코드 수정 없이 자동으로 Undo/Redo 대상이 된다.
- **Persistence**: Page를 통째로 저장하는 구조라(9-11에서 확인) 새 필드도 자동으로 저장/복원된다. `isValidPage()`도 이 필드들의 존재를 강제하지 않으므로, 이 변경 이전에 저장된 구 데이터(필드 없음)도 그대로 유효하다 — `undefined`로 남을 뿐, 렌더러가 아직 이 필드를 안 읽으니 문제없다.

이렇게 Undo/Redo·Persistence 둘 다 손 안 대고 필드만 추가로 끝난 것 자체가, 아키텍처 리뷰에서 "지금 구조가 이 정도 확장엔 이미 준비되어 있다"고 판단했던 근거가 실제로 맞았다는 걸 보여준다.

### 범위 밖으로 남긴 것
- `view/PageView.js`가 `transition`을 읽어 실제로 fade/cut을 구현하는 것 — 후속 단계.
- Page 전환을 구독해 `autoAdvance.enabled`일 때 타이머로 다음 Page로 넘기는 로직 — 후속 단계.
- 에디터 UI에서 이 필드들을 편집하는 화면 — 후속 단계. (지금은 `createXPage()` 호출 시 파라미터로만 넣을 수 있고, 저장된 Page를 나중에 UPDATE_PAGE로 수정하는 경로는 아직 없음 — 9-7의 text 필드처럼 에디터 UI가 타입 무관하게 이 필드를 편집하게 만들려면 별도 작업 필요.)

### 변경 파일
`domain/Page.js`

### 검증
Node로 세 타입 모두 필드가 올바른 기본값/커스텀값으로 생성되는지, `isValidPage()`가 여전히 통과하는지 확인함. 실제 브라우저 동작 변화는 없음(값만 추가되고 아무것도 소비 안 하므로 회귀 리스크 낮음) — 별도 브라우저 테스트 불필요.

## 9-13. Section 도메인 모델 구현 (2026-07-03, FutureEditor.md D-Editor-1~3)

### 배경
FutureEditor.md 검토 중 남겨둔 3가지 열린 질문(소속 표현 방식/영속 여부/경계 무결성)을 D-Editor-1~3으로 확정한 뒤 착수. 이번 세션은 **도메인 모델 + Store + Persistence까지만** — CueList 등 실제 화면 UI는 범위 밖(TODO.md의 Feature TODO로 별도 등록).

### 구현

**`domain/Section.js`(신규)**: `createSection({ title, note, collapsed, color, startPageId })`, `isValidSection()`. Page.js와 동일한 스타일 — 순수 데이터 구조만.

**`domain/Presentation.js`**:
- `createPresentation()`에 `sections: []` 추가
- `sanitizePresentation()`: `sections` 배열 검증 추가 — `isValidSection()` 통과 + `startPageId`가 (검증된) `pages` 안에 실제로 존재해야 유효. 참조 끊긴 Section은 제외.
- `addSection`/`removeSection`/`replaceSection`: Page 쪽 CRUD와 동일한 패턴.
- `removePage()`에 `reconcileSectionsAfterPageRemoval()` 연결 — D-Editor-3 구현. Section의 `startPageId`가 삭제되면 삭제 전 순서 기준으로 다음 남은 Page로 재조정, 남은 Page가 없으면 Section 자체 제거. **참조 동일성 보존**: 삭제되는 Page가 어떤 Section의 시작점도 아니면 `sections` 배열은 원래 참조 그대로 반환 — 안 그러면 `.map()`이 매번 새 배열을 만들어 무관한 Page 삭제에도 `SET_SECTIONS`가 잘못 발동한다(테스트 중 발견해서 수정).
- `getSectionRanges(presentation)`: Section을 `pages` 배열 순서로 정렬하고 각 Section이 담당하는 Page 구간을 계산하는 순수 함수. "끝 지점"은 저장하지 않고 항상 계산 — 다음 Section 시작 직전까지, 마지막은 배열 끝까지.

**`store/AppStore.js`**:
- `ADD_SECTION`/`REMOVE_SECTION`/`UPDATE_SECTION` 리듀서 케이스 추가
- `deriveMutations()`에 `sectionsChanged` 감지 추가 → `SET_SECTIONS` mutation
- `getSectionRanges()` 편의 export 추가 (`getSelectedPage`/`getLivePage`와 같은 패턴)

**`persistence/PersistenceSubscriber.js`**: `interestedMutations`에 `SET_SECTIONS` 추가(D-Editor-2), 저장 스냅샷에 `sections` 필드 포함. 스키마 버전은 안 올림(9-11 결정대로 — 비breaking 필드 추가).

### 알려진 한계 (TODO.md 미등록, 여기 기록)
`REMOVE_PAGE`의 Undo(`INSERT_PAGE_AT`)는 Page 위치만 복원하고, 그 삭제가 유발한 Section 재조정/제거까지는 되돌리지 않는다. Page 하나 삭제로 Section 경계까지 매번 히스토리에 남기는 비용이 이 rare-case보다 크다고 판단해 지금은 받아들임 — `domain/Presentation.js`의 `reconcileSectionsAfterPageRemoval()` 주석에도 명시.

### 변경 파일
`domain/Section.js`(신규), `domain/Presentation.js`, `store/AppStore.js`, `persistence/PersistenceSubscriber.js`

### 검증
Node로 전체 파이프라인 실통합 테스트 완료:
- 정상 구간 계산, Section 시작점 Page 삭제 시 재조정, Section이 통째로 사라지는 경우, `sanitizePresentation`의 참조 끊긴 Section 제거 — 전부 의도대로 동작
- 실제 `dispatch()`를 통한 `ADD_SECTION`/`UPDATE_SECTION`/`REMOVE_SECTION`/`REMOVE_PAGE` 전체 시나리오에서 mutation이 정확히(무관한 경우 `SET_SECTIONS` 안 뜨고, 관련 있는 경우만 뜨는 것까지) 발동하는지 확인
- localStorage 폴리필로 저장→`migrateSnapshot`→`sanitizePresentation` 전체 라운드트립에서 `sections`가 정확히 왕복되는지 확인

**브라우저 실사용 테스트는 이번 범위에서 의미 없음** — 화면에 아무것도 안 보인다(UI 없음). CueList Outline UI가 붙는 다음 단계에서 브라우저 테스트 필요.

## 9-14. Section Tree UI 구현 (2026-07-03, GPT 설계 원칙 반영)

### 배경
9-13에서 만든 Section 도메인 모델 위에 실제 CueList 화면을 붙였다. GPT가 작성한 "Section UI Design Principle" 문서를 검토 후 그대로 채택 — 핵심 원칙: "CueList는 Page List가 아니라 Section Tree를 지향한다. Section Header가 최상위 계층이고 Page는 항상 그 아래 속한 항목으로 표시된다. UI는 표시와 액션 전달만 담당하고, 데이터 변경은 Store/Domain을 통해서만 이루어진다." 기존 아키텍처 원칙(View는 순수 표시, dispatch는 Store를 통해서만)과 그대로 일치해 수정 없이 채택.

### 구현

**`ui/CueList.js`**:
- `render()`가 `getSectionRanges()`(9-13에서 만든 AppStore 편의 함수)를 사용해 Section이 있으면 Section Tree로, 없으면(대부분의 기존 프로젝트, `sections:[]`) 기존과 동일하게 flat하게 그린다 — 하위 호환.
- 첫 Section 시작 이전의 "미분류" Page는 헤더 없이 그냥 나열.
- Page 번호는 Section별로 리셋하지 않고 전체 순서 기준 전역 번호 유지 — Page가 여전히 송출 가능한 최소 단위라는 원칙(FutureEditor.md) 반영.
- Section Header 클릭 → `execute({ type: 'UPDATE_SECTION', ... })`으로 `collapsed` 토글. UI가 직접 상태를 뒤집어 그리지 않고 Store를 거친다.
- fingerprint 재렌더링 판단 로직에 `sections`(title/collapsed/color/startPageId) 포함 — 이전엔 `pages`만 봤어서 Section 변경만으로는 다시 안 그려졌을 것.

**`ui/cuelist.css`**: `.cue-section`/`.cue-section-header`/`.cue-section-pages` 등 추가. 기존 다크 테마 톤 유지, Page보다 한 단계 들여쓰기로 계층 표현.

**`index.html`**: CueList 패널 헤더에 "+ 섹션" 버튼 추가(최소 구현) — 선택된 Page를 시작점으로 `prompt()`로 제목만 받아 `ADD_SECTION` 실행. 이미 다른 Section의 시작점인 Page를 다시 선택하면 안내 후 중단.

### 범위 밖으로 남긴 것
- Section 삭제 UI — 도메인 함수(`removeSection`)는 있지만 화면에 버튼 없음.
- Section 색상/메모 편집 UI — `prompt()`로 제목만 받음.
- Page를 드래그해서 다른 Section으로 옮기는 조작 — 9-13에서 이미 "위치가 곧 소속"이라 도메인 로직은 준비돼 있지만(움직이면 자동 반영), 드래그 자체를 트리거하는 UI(드래그 핸들, 순서 변경 UI)가 이 프로젝트에 아직 없음(`movePage`를 호출하는 UI 자체가 없음 — Section 이전 문제가 아니라 기존부터 없던 기능).

### 변경 파일
`ui/CueList.js`, `ui/cuelist.css`, `index.html`

### 검증
`node --check`으로 `CueList.js`와 `index.html` 임베디드 모듈 스크립트 구문 검사 통과. **브라우저 실사용 테스트 필요**: Page 선택 → "+ 섹션" → 제목 입력 → Section Header가 CueList에 나타나는지, 클릭으로 접기/펼치기 되는지, 새로고침 후에도 collapsed 상태가 유지되는지(D-Editor-2), Section이 없는 기존 프로젝트가 여전히 flat하게 잘 보이는지(하위 호환).

## 9-15. Section Tree UI 테스트 피드백 대응 (2026-07-04)

### 배경
9-14에서 구현한 Section Tree UI에 대해 QA 피드백 3건 접수:
1. Section Header에 제목 외 숫자가 붙어 나오는 것이 의도한 동작인지 문의
2. 접기 기능으로 보이는 역삼각형 화살표가 작동하지 않는다는 보고
3. Section에 포함된 Page와 포함 안 된(미분류) Page의 정렬 순위(번호)가 같아 구분이 안 된다는 보고

### 조사
2번(화살표 미작동)은 Node + jsdom으로 실제 클릭 이벤트를 재현하는 자동화 테스트를 작성해 검증했다 — `dispatch`/`execute`/DOM 재생성까지 전체 파이프라인을 실행한 결과, `collapsed` 상태 변경과 `is-collapsed` 클래스 적용, `cue-section-pages`의 숨김까지 로직 자체는 정상 동작했다(회귀 없음 확인, 아래 검증 참조). 원인은 버그가 아니라 신호 부족으로 판단: 클릭할 때마다 `containerEl.innerHTML = ''`로 하위 트리 전체를 재생성하는 구조라 `transform: rotate(-90deg)` transition이 "이전 상태 → 다음 상태"로 애니메이션되지 않고 최종 상태로 곧바로 나타난다. 작은 회색 유니코드 화살표가 순간적으로 살짝 회전만 하다 보니 클릭 반응이 없는 것처럼 보였을 가능성이 높다.

### 조치
**`ui/CueList.js`**:
- Section 토글 아이콘을 회전(rotate) 대신 글리프 자체 교체(▼ 펼침 / ▶ 접힘)로 변경 — 상태 변화가 명확하게 드러난다.
- Section Header의 카운트 숫자에 괄호를 추가(`(3)`)하고 `title` 속성으로 툴팁("이 섹션에 포함된 Page 수")을 붙였다 — 1번 피드백은 의도된 기능(Section 내 Page 개수 표시)이었으나 표기가 불명확했다.
- 첫 Section 시작 이전(미분류) Page 블록에 "미분류" 라벨을 추가했다 — 접히지 않는 non-collapsible 라벨로, Section Header와 톤은 맞추되 hover 등 클릭 가능성을 암시하는 스타일은 넣지 않았다.

**`ui/cuelist.css`**: `.cue-section-toggle`의 `transform: rotate(-90deg)` 규칙 제거(글리프 교체 방식으로 대체되어 불필요), `.cue-unsectioned-label` 스타일 추가.

### 범위 밖으로 남긴 것
- Page 번호 자체를 Section별로 구분 표기하는 것(예: 미분류 Page는 다른 스타일의 번호)은 하지 않았다 — Page가 여전히 송출 가능한 최소 단위로서 전역 순번을 유지해야 한다는 기존 원칙(9-14, FutureEditor.md)과 배치되므로, 라벨 추가로 해결했다.

### 변경 파일
`ui/CueList.js`, `ui/cuelist.css`

### 검증
Node + jsdom으로 실제 DOM 클릭 이벤트를 시뮬레이션하는 통합 테스트 작성 및 통과:
- Section Header 클릭 시 `state.presentation.sections[0].collapsed` 토글, `is-collapsed` 클래스 적용, 재클릭 시 정상 복귀 확인(회귀 없음)
- 미분류 Page가 있는 케이스에서 `.cue-unsectioned-label` 렌더링 확인
- 펼침/접힘 상태에 따라 토글 글리프가 `▼`/`▶`로 정확히 바뀌는지 확인
- Section 카운트가 `(N)` 형식과 title 속성으로 표시되는지 확인
- `node --check`으로 `CueList.js` 구문 검사 통과

**브라우저 실사용 재확인 권장**: 이번 수정은 자동화 테스트로 로직/DOM 결과를 검증했지만, 실제 브라우저에서 화살표 클릭 반응이 이제 명확하게 체감되는지, 그리고 이전 세션(9-14)처럼 브라우저 캐시로 인해 이전 JS/CSS가 남아있지 않은지(하드 리프레시 필요) 확인이 필요하다.

## 9-16. 미디어 Page 라벨 + CueList 표시 개선 (2026-07-05, 실사용 불편 신고)

### 배경
CueList가 image/video Page를 `(video)`/`(image)`로만 표시해서, 어떤 미디어인지 확인하려면 매번 클릭해봐야 하는 불편함이 있었다. TODO.md의 "Cue Label" 항목과 겹치는 문제 — 원래는 텍스트 오버레이(9-7) 유무만 보여주는 걸로 계획했으나, 논의 중 "업로드 시 원본 파일명을 기본 표시 이름으로 쓰고 수정도 가능하게" 하는 방향으로 확장됐다.

### 발견
`media/MediaStore.js`는 업로드 시 이미 `fileName`을 IndexedDB에 저장하고 있었다(Step6부터). 다만 이건 Blob 레코드에 묶인 원본 파일명이라 불변으로 두는 게 맞고, **사용자가 자유롭게 수정 가능한 표시 이름**은 별개 개념이라 판단 — Page 레벨의 새 필드(`label`)로 구현했다(MediaStore의 `fileName`은 안 건드림).

### 구현
- `domain/Page.js`: `createImagePage`/`createVideoPage`에 `label = ''` 필드 추가.
- `index.html`: 미디어 업로드 시 `label: file.name`으로 기본값 채움. 에디터 사이드바 최상단에 "라벨" 입력 필드 추가(모든 Page 타입에 보이지만 미디어 Page에만 의미 있음, 안내 문구로 명시) — 기존 텍스트/스타일 필드와 동일하게 `UPDATE_PAGE`로 저장.
- `ui/CueList.js`: `getPreviewText()`가 이제 `page.label`을 보여주고(없으면 기존처럼 `(video)`/`(image)`), 텍스트 오버레이가 있으면 그 뒤에 첫 줄을 붙여서 함께 표시(`"worship-intro.mp4 — 주께 감사해"` 형식) — Cue Label TODO 항목도 같이 해결됨. fingerprint에 `label` 추가해 라벨 수정 시 재렌더링되게 함.

### 변경 파일
`domain/Page.js`, `index.html`, `ui/CueList.js`

### 검증
Node로 `createImagePage`/`createVideoPage`의 `label` 필드 생성 확인, `getPreviewText()` 로직을 라벨 있음/없음/텍스트 오버레이 동반 3가지 케이스로 검증. `node --check`으로 세 파일 및 `index.html` 임베디드 모듈 스크립트 구문 검사 통과. **브라우저 실사용 테스트 필요**: 미디어 업로드 시 CueList에 파일명이 바로 뜨는지, 라벨 입력창에서 수정 후 저장하면 CueList에 반영되는지, 텍스트 오버레이 있는 영상은 "파일명 — 가사" 형식으로 보이는지.

### 수정 (2026-07-05, 표시 순서)
브라우저 테스트 전 피드백으로 순서 반전 — "가사 — 파일명"으로 확정(원래 계획은 "파일명 — 가사"였음). 운영자가 CueList에서 실제로 찾는 건 가사 쪽이라 먼저 나와야 스캔이 빠르다는 이유.

### 브라우저 테스트 결과 (2026-07-05)
전반적으로 이상 없음(업로드 시 파일명 즉시 표시, 라벨 입력창 수정→저장→반영 모두 정상). 다만 "가사첫줄 — 파일명" 조합 표시는 CueList 항목 폭이 좁아 텍스트가 잘리는 경우, 평상시 화면에서는 파일명 부분까지 잘려서 실제로 순서가 맞게 붙었는지 육안으로 확인하기 어려웠다 — Page 삭제 버튼을 눌렀을 때 뜨는 확인 문구(전체 텍스트를 그대로 보여줌)를 통해서만 우회적으로 확인 가능했다.

**의도적으로 안 고침**: 이걸 정면으로 고치려면(예: 항목에 hover 시 풀네임 툴팁, 또는 항목 높이/폭 자체를 늘리는 CueList 레이아웃 변경) 영향 범위가 이번 세션 스코프보다 커진다고 판단 — 당장 고치지 않고 알려진 제약으로 남겨둔다. TODO.md에 후속 항목으로 기록.

## 9-17. 이미지 위 텍스트 오버레이 (2026-07-05, TODO.md Image Overlay 항목)

### 배경
9-7에서 영상(video) Page에만 넣었던 텍스트 오버레이를 이미지(image) Page에도 적용. TODO.md에 계획되어 있던 항목.

### 구현
`view/PageView.js`의 `createPageView()` image 분기에 video 분기와 동일한 3줄(`if (page.text) { slide.appendChild(createTextLayer(page)) }`)을 추가. 에디터 UI(가사 입력창)는 9-7 때부터 이미 Page 타입과 무관하게 동작하고 있었으므로 추가 UI 작업 불필요 — video 때와 마찬가지로 렌더러(View)에서만 막혀 있었다.

`.text-layer`의 기존 CSS(z-index, pointer-events:none, GPU 레이어 승격)는 이미지에도 그대로 적용된다 — 이미지는 video처럼 iOS 하드웨어 디코딩 레이어를 안 쓰므로 9-10에서 우회했던 문제 자체가 애초에 발생하지 않는다(참고용, 별도 대응 불필요).

### 변경 파일
`view/PageView.js`

### 검증
`node --check` 통과. 로직이 9-7과 완전히 동일한 패턴 재사용이라 별도 Node 시나리오 테스트는 생략.

### 브라우저 테스트 결과 (2026-07-05)
이미지 Page에 가사 입력 → 저장 → 이미지 위에 텍스트 오버레이 정상 표시 확인. 이상 없음.

## 9-18. Library 메뉴 뼈대 + StorageAdapter 추출 (2026-07-05, TODO.md Architecture 항목 2건)

### Library 메뉴 뼈대
헤더에 "라이브러리" 버튼 → 모달 오픈. Songs/Backgrounds/Videos 세 카테고리, 각각 "준비 중" placeholder만 표시. Store/Domain 연결 없음 — 요청대로 메뉴 껍데기만. `index.html`에 `#library-modal` 추가, 열기/닫기(바깥 클릭 포함)만 연결.

### StorageAdapter 추출
`persistence/StorageAdapter.js` 신설. `localStorage.setItem`/`getItem` 직접 호출이 `PersistenceSubscriber.js`(쓰기)와 `AppStore.js`(읽기) 두 곳에 흩어져 있던 걸 `save(key, value)`/`load(key)` 두 함수로 모았다. 두 호출부 다 이 함수를 거치도록 교체.

**의도적으로 안 고친 것**: `AppStore.js`의 초기 state는 여전히 모듈 로드 시점에 동기(sync)로 읽는다(`storageLoad()`가 동기 함수). File System Access API나 클라우드 같은 진짜 비동기 저장소로 바꾸려면 이 동기 부팅 가정 자체를 걷어내야 하는데, 이번 범위는 "호출 지점을 한 곳으로 모으는 것"까지다 — 아키텍처 리뷰(2026-07-03) 때 이미 식별했던 한계를 그대로 문서화만 하고 넘어간다.

### 변경 파일
`index.html`(Library 모달), `persistence/StorageAdapter.js`(신규), `persistence/PersistenceSubscriber.js`, `store/AppStore.js`

### 검증
`node --check` 전체 통과. localStorage 폴리필로 `dispatch → PersistenceSubscriber → StorageAdapter.save → localStorage` 전체 경로가 정상 동작하는지 확인(9-11 때와 동일한 방식). Library 모달은 순수 UI라 별도 로직 테스트 불필요.

### 브라우저 테스트 결과 (2026-07-05)
Library 모달: 헤더 버튼 클릭 → 오픈, Songs/Backgrounds/Videos 3칸 "준비 중" 문구 확인, 닫기 버튼과 바깥 클릭 모두 정상 닫힘 확인. StorageAdapter: 평소처럼 편집 → 저장 → 새로고침 후 데이터 유지 확인(겉보기 동작 변화 없음, 내부 경로 재배선만 확인하는 성격이라 이걸로 충분). 둘 다 이상 없음.

## 9-19. D-Editor-4 Section Migration 구현 (2026-07-06, TODO.md Section Migration TODO 전체)

### 배경
D-Editor-1(Range 모델, Section.startPageId 기반)을 D-Editor-4(Page 중심
모델, Page.sectionId 역참조)로 전환하는 작업. D-Editor-4 자체는
2026-07-04에 이미 결정됐지만 미구현 상태였고, 이후 Section 불변식 논의
("Page는 반드시 Section에 속한다" 채택 여부)를 거치면서 최종적으로
**원래 D-Editor-4 그대로(sectionId nullable, 기본 Section 자동 생성
없음, 최소 1개 Section 불변식 없음)** 구현하기로 확정됐다(Research/
2026-07-04 Workflow Separation.md 후속 논의 참조). 이번 세션은 그 확정된
스펙을 실제 코드로 옮겼다.

### 변경 사항

**`domain/Section.js`**: `startPageId` 필드 완전 제거. Section은 이제
순수 grouping metadata(title/note/collapsed/color)만 가진다. `isValidSection()`도 `startPageId` 검증 제거.

**`domain/Page.js`**: `sectionId` 필드 추가(모든 Page 타입 생성 함수에
`sectionId = null` 기본값). `isValidPage()`에 `sectionId`가 `string`
또는 `null`(`undefined`도 관대하게 허용)인지 검증 추가.

**`domain/Presentation.js`** (가장 큰 변경):
- `sections: []` → `sectionIds: []`(표시 순서 SSOT) + `sectionMap: {}`
  (저장소) 구조로 전환. `createPresentation()`은 기본 Section을 자동
  생성하지 않는다.
- `getSectionRanges()`/`reconcileSectionsAfterPageRemoval()` 완전 제거.
  Page 중심 모델에서는 Page 삭제가 Section 쪽에 아무 영향을 주지 않으므로
  (앵커 재조정 자체가 불필요해짐), `removePage()`가 훨씬 단순해졌다.
- `getSectionGroups()` 신규 — `pages[]`를 순서대로 훑으면서 연속된 같은
  `sectionId`를 그룹으로 묶는다(Flow View 렌더링용, 규칙 4). `sectionId:
  null`도 하나의 그룹으로 자연스럽게 나온다 — 옛 모델처럼 "첫 Section
  이전"으로 위치가 고정되지 않고 `pages[]` 안 어디서든 나타날 수 있다.
- `movePageToSection()` 신규(규칙 1) — Section을 명시적으로 바꾸는 이동.
  대상 Section의 마지막 Page 바로 뒤로 위치도 함께 옮긴다.
- `movePage()`에 자동 흡수 로직 추가(규칙 5) — 순수 위치 이동(드래그
  재정렬) 시 이동한 Page의 `sectionId`를 새 이웃 기준으로 재계산해서
  Section이 `pages[]` 안에서 파편화되는 것을 막는다.
- `removeSection()` — 소속 Page를 `sectionId: null`로 되돌린다(인접
  병합 안 함, D-Editor-4 규칙 3 그대로). "최소 1개 Section" 불변식이
  없으므로 마지막 Section을 지워도 제한이 없다.
- `setPagePositionAndSection()` 신규 — Undo 전용. 위치와 sectionId를
  동시에 정확한 값으로 복원한다(아래 HistoryManager 항목 참조).
- `sanitizePresentation()` 검증 방향 반전 — D-Editor-1 시절엔 "Section이
  존재하는 Page를 가리키는가"(Section→Page)를 확인했지만, 이제는
  "Page가 존재하는 Section을 가리키는가"(Page→Section)를 확인한다.
  참조가 끊긴 경우 9-11 정책 그대로 `sectionId: null`로 되돌리고 Page
  자체는 잃지 않는다.

**`store/AppStore.js`**: `deriveMutations()`의 `sectionsChanged` 판정을
`sectionIds`/`sectionMap` 참조 변경 여부(OR 조합)로 갱신. `MOVE_PAGE_TO_SECTION`,
`SET_PAGE_POSITION`(Undo 전용) 액션 추가. `getSectionRanges()` 래퍼를
`getSectionGroups()`로 교체.

**`history/HistoryManager.js`**: `MOVE_PAGE_TO_SECTION`의 `computeInverse()`
케이스 추가. `MOVE_PAGE`처럼 fromIndex/toIndex만 맞바꾸는 걸로는 부족해서
(sectionId까지 함께 바뀌므로) `setPagePositionAndSection()` 전용 함수로
위치+sectionId를 원자적으로 복원하는 `SET_PAGE_POSITION` 액션을 Undo
전용으로 새로 만들었다(D-Editor-4가 예고했던 "위치+소속을 함께 되돌리는
경로" 요구사항).

**`persistence/Schema.js`**: `CURRENT_SCHEMA_VERSION`을 2로 상향.
`migrateV1toV2()` 추가 — 옛 v1 `sections[]`(startPageId 보유)를 예전
Range 계산 로직으로 1회 재현해서 각 Page의 `sectionId`를 역산한다.
참조 끊긴 Section(startPageId가 가리키는 Page가 없음)은 역산에서 제외.
버전 필드 없는 데이터(2026-07-03 이전 실사용 데이터)도 v1으로 간주해서
정상 마이그레이션된다.

**`persistence/PersistenceSubscriber.js`**: 저장 필드를 `sections` →
`sectionIds`/`sectionMap`으로 갱신.

**`ui/CueList.js`**: `getSectionRanges()` 의존 제거, `getSectionGroups()`
기반으로 `renderTree()`/`createSectionGroup()` 재작성. "미분류" 그룹
렌더링이 이제 `pages[]` 어디에서든(첫 Section 이전뿐 아니라 Section
사이/이후에도) 나타날 수 있다 — groupBy 결과를 그대로 따라가므로 Page
중심 모델에서는 자연스러운 결과. fingerprint 계산도 `sectionMap`/
`page.sectionId` 기준으로 갱신.

**`index.html`**: "+ 섹션" 버튼이 더 이상 "선택된 Page 필요" 조건을
요구하지 않는다 — Section이 Page 없이도(빈 Section) 정상 생성 가능해짐.

### 범위 밖으로 남긴 것
- Page 드래그 재정렬 UI(TODO.md에 별도 항목으로 존재) — 이번 세션은
  도메인 함수(`movePage`/`movePageToSection`)만 만들었고, 실제 드래그
  UI는 이 함수들 위에 나중에 얹는다.
- 신규 Page 생성 시 기본 `sectionId`를 "현재 선택된 Section"으로 자동
  지정하는 것 — 지금은 항상 `null`(미분류)로 생성된다. D-Editor-4 문서가
  이미 "나중에 이동으로 고칠 수 있으니 급하지 않다"고 정리해둔 항목이라
  그대로 유예.
- Section 색상/메모 편집 UI, Section 순서 재정렬 UI — 기존 스코프
  그대로 범위 밖.

### 변경 파일
`domain/Section.js`, `domain/Page.js`, `domain/Presentation.js`,
`store/AppStore.js`, `history/HistoryManager.js`, `persistence/Schema.js`,
`persistence/PersistenceSubscriber.js`, `ui/CueList.js`, `index.html`

### 검증
Node 스크립트로 3단계 검증:
1. **도메인 단위 테스트**(14개) — Section 생성(startPageId 없음), Page
   기본 sectionId, 기본 Section 미생성, addSection/removeSection(제한
   없음, null 폴백), movePage 자동 흡수, movePageToSection 재배치,
   setPagePositionAndSection 정확한 복원, removePage가 Section에 영향
   없음, sanitizePresentation 방향 반전 3종, getSectionGroups 그룹핑
   2종 — 전부 통과.
2. **v1→v2 마이그레이션 테스트**(6개) — Range 구간대로 sectionId 역산,
   Section 자체가 없던 옛 데이터, 참조 끊긴 Section 제외, v2 데이터
   통과, 미래 버전 거부 — 전부 통과.
3. **jsdom 통합 테스트**(7개) — Section 추가 시 Page 없으면 헤더 안
   뜨는지, MOVE_PAGE_TO_SECTION으로 실제 이동+재배치, Header 클릭
   collapse 토글(9-15 회귀 확인), Undo/Redo로 위치+sectionId 정확히
   복원, REMOVE_SECTION(제한 없음), 저장 스냅샷 v2 형태 확인 — 전부
   통과.

`node --check`로 변경된 모든 `.js` 파일 및 `index.html`의 embedded
module script 문법 검사 통과.

**브라우저 실사용 테스트 필요**: 이번 마이그레이션은 자동화 테스트
범위가 넓었지만, 실제 브라우저에서 v1(2026-07-05 이전) 저장 데이터를
새로고침으로 불러왔을 때 마이그레이션이 실제로 동작하는지(localStorage에
저장된 진짜 옛 데이터 기준), Section 추가/삭제/collapse 토글이 여전히
매끄럽게 느껴지는지 확인 필요.

## 9-20. Section 추가 성공 피드백 토스트 (2026-07-06, 이전 세션 할당량 초과로 중단된 작업 이어서 완료)

### 배경
9-19(D-Editor-4) 이후 실사용 중 "+ 섹션" 버튼이 안 먹는 것처럼 보인다는 신고 — 진단 결과 버그가 아니라 "성공은 하는데 Page가 배정 안 된 빈 Section이라 CueList에 그릴 게 없어서" 생긴 UX 공백이었다(빈 Section 14개가 실제로 생성되어 있었음, 사용자가 직접 localStorage에서 정리). 이전 세션이 원인 진단(`a39b12c` 디버그 커밋)과 해결 방향(토스트 알림)까지 정하고 토스트 CSS(`.toast`/`.toast.is-visible`)와 `<div id="toast">`까지 심어뒀으나, 실제로 띄우는 JS 함수를 작성하기 전에 세션이 중단됐다.

### 구현
`index.html`에 `showToast(message)` 함수 추가 — 텍스트 채우고 `.is-visible` 클래스 토글, 2.2초 후 자동 숨김. `alert()`/`confirm()`/`prompt()` 같은 블로킹 대화상자를 안 쓴 이유: TODO.md에 기록된 "Section 추가 버튼의 prompt() 취약점"(브라우저가 반복 대화상자를 감지하면 "차단" 체크박스를 띄우고, 실수로 체크하면 그 뒤로 조용히 무시됨)과 같은 문제를 새로 만들지 않기 위해서다.

`add-section-btn` 핸들러의 `execute(...)`에 `.then()`을 추가해 성공 시 토스트로 안내("Page를 이 Section에 배정하면 CueList에 나타납니다" — 빈 Section이 안 보이는 게 정상 동작임을 알려줌), 기존 `.catch()`의 콘솔 에러 로깅에도 실패 토스트를 추가.

### 변경 파일
`index.html`

### 검증
`node --check`으로 임베디드 모듈 스크립트 구문 검사 통과. `execute()`가 Promise를 반환하는 것을 `command/CommandBus.js`에서 확인(`.then()`/`.catch()` 체이닝이 정상 동작할 근거). **브라우저 실사용 테스트 필요**: "+ 섹션" 클릭 → 제목 입력 → 하단에 토스트 메시지가 잠깐 떴다가 사라지는지.

## 9-21. Section 자동 배정 + Page 드래그 재정렬 (2026-07-06, TODO.md Feature TODO 2건)

### "+ 섹션" 자동 배정 (근본 원인 해결)
9-20에서 진단했던 "Page 선택 후 Section 추가해도 반응 없음"의 진짜 원인 — D-Editor-4 전환 후 `add-section-btn` 핸들러가 선택된 Page를 아예 보지 않고 제목만 있는 완전 독립 Section을 만들고 있었다. `index.html`에서 `getSelectedPage()`로 선택된 Page를 확인해, 있으면 `ADD_SECTION` 성공 직후 `MOVE_PAGE_TO_SECTION`을 이어서 실행하도록 수정. 토스트 메시지도 배정 여부에 따라 분기(배정됨/배정 안 됨 안내).

### Page 드래그 재정렬 (신규 기능)
`ui/CueList.js`의 `createCueItem()`에 HTML5 Drag and Drop 추가:
- `dragstart`/`dragend`: 드래그 중인 Page id를 모듈 스코프 변수(`draggedPageId`)로 추적 — `dataTransfer.getData()`가 `dragover` 시점에 못 읽히는 브라우저가 있어, 신뢰 가능한 소스를 따로 둠. `dataTransfer` 설정 자체는 표준 API 준수용으로 유지.
- `dragover`: 커서 Y좌표로 대상 아이템의 위쪽 절반/아래쪽 절반 판정 → 삽입선(`drag-over-top`/`drag-over-bottom`) 표시.
- `drop`: 원본 배열 기준 "여기 넣고 싶다"는 위치(`desiredOriginalPos`)를 먼저 정하고, `movePage()`의 splice 의미(제거 후 그 뒤 배열에 삽입)에 맞게 `fromIndex`와의 대소 비교로 `toIndex`를 보정 — Node로 6가지 시나리오(앞/뒤 삽입, 인접 이동, 방향 반대) 전부 검증 완료.
- Section 헤더/미분류 라벨에도 `dragover`/`drop` 추가 — 빈 Section(내부에 Page가 하나도 없어 위치 기반 드롭 대상 자체가 없는 경우)에 접근할 유일한 진입점. `MOVE_PAGE_TO_SECTION`을 직접 호출.

Section 경계를 넘나드는 위치 이동은 별도 처리 불필요 — `movePage()`의 자동 흡수(D-Editor-4 규칙 5, 9-19에서 구현)가 새 이웃 기준으로 `sectionId`를 알아서 재계산한다.

### 변경 파일
`index.html`, `ui/CueList.js`, `ui/cuelist.css`

### 검증
Node로 `movePage()`를 직접 호출해 6가지 재정렬 시나리오(앞으로/뒤로/인접/역방향 삽입) 결과 배열이 기대한 순서와 정확히 일치하는지 확인. `node --check`으로 `CueList.js`와 `index.html` 임베디드 모듈 스크립트 구문 검사 통과. **브라우저 실사용 테스트 필요**: Page 선택 후 "+ 섹션" → 자동 배정되는지, CueList에서 Page를 드래그해서 다른 Page 위/아래로 놓았을 때 순서가 바뀌는지, Section 헤더/미분류 라벨에 드롭했을 때 그 소속으로 바뀌는지, Undo(Ctrl+Z)로 위치+소속이 함께 복원되는지(9-19에서 이미 준비된 `SET_PAGE_POSITION` 활용 확인).

## 9-22. Section 목록 모달 (유령 Section 확인/삭제) (2026-07-06, 실사용 중 발견한 요청 대응)

### 배경
9-19~9-21 실사용 중 사용자가 직접 발견: "+ 섹션"으로 만든 Section이
Page를 하나도 안 받으면 CueList에 전혀 안 보인다(`getSectionGroups()`가
`pages[]` 기준으로만 그룹을 만들기 때문 — 9-19에서 이미 의도한 동작).
디버깅 과정에서 실제로 빈 Section 14개가 쌓여있었는데, 이걸 확인할
방법이 `localStorage.getItem()`을 직접 호출하는 것뿐이었다. 사용자가
"Section 목록(단순 목록)을 볼 수 있게 해달라, 유령 Section 확인, 삭제도
같이 구현해달라"고 요청.

### 구현
`index.html`에 "Section 목록" 모달 추가(`section-list-modal`, 기존
`library-modal`과 같은 `.modal-overlay`/`.modal-box` 패턴 재사용).
`sectionMap`을 `getSectionGroups()`를 거치지 않고 `sectionIds` 순서대로
직접 순회해서, Page가 0개인 Section("유령 Section")도 빠짐없이 표시한다.
각 행은 제목, Page 개수(`pages.filter(p => p.sectionId === id).length`로
직접 계산 — `getSectionGroups()`의 파편화 가능성과 무관하게 정확한 총
소속 개수), 삭제 버튼으로 구성. 유령 Section은 점선 테두리 + 빨간
"비어있음 — 유령 Section" 문구로 시각적으로 구분.

삭제는 되돌릴 수 없는 조작(`REMOVE_SECTION`은 Undo 미지원 —
FutureEditor.md D-Editor-4 "아직 열려있는 것" 참조)이라 확인 절차가
필요했지만, `confirm()`은 쓰지 않았다 — TODO.md에 이미 기록된
`prompt()` 취약점(반복 대화상자 감지 시 브라우저가 차단 체크박스를
띄우는 문제)과 같은 부류를 새로 만들 뿐이라서다. 대신 삭제 버튼을 두 번
눌러야 실제로 삭제되는 인라인 확인 방식("삭제" → "정말 삭제?")을 썼다.

Section 목록 버튼("≡ 섹션")은 "+ 섹션" 버튼 옆에 추가. 모달이 열려있는
동안 다른 경로(CueList 드래그 등)로 Section 소속이 바뀌어도
`subscribe()`로 목록이 함께 갱신된다.

### 변경 파일
`index.html`

### 검증
Node로 `renderSectionList()`와 동일한 계산 로직(유령 판정, Page 카운트)을
재현해 5개 시나리오 검증 — 빈 Section 생성 직후 유령 분류, Page 배정 후
유령 해제+카운트 반영, 유령/비유령 혼재 시 각각 정확히 계산, 삭제 후
목록에서 사라지고 소속 Page는 미분류로, 유령 Section도 제약 없이 삭제
가능 — 전부 통과. `node --check`으로 embedded module script 문법 검사
통과.

**브라우저 실사용 테스트 필요**: "≡ 섹션" 클릭 → 모달 열림, 실제로
쌓여있던 유령 Section들이 보이는지, 삭제 버튼 두 번 클릭 시 정상
삭제되는지, 모달 열어둔 채 CueList에서 드래그해도 목록이 갱신되는지.

## 9-23. 빈 Section에 Page 배정하는 경로 추가 (2026-07-06, 9-22 후속)

### 배경
9-22로 유령 Section을 "볼" 수는 있게 됐지만, 여전히 "넣을" 방법은 없었다
— CueList의 드래그(9-21)는 Section 헤더가 있어야 드롭 대상이 되는데,
Page가 0개인 Section은 헤더 자체가 안 그려지므로(`getSectionGroups()`가
`pages[]` 기준으로만 그룹을 만듦, 9-19) 애초에 드롭할 곳이 없었다.
사용자가 직접 지적: "빈 섹션에 페이지 넣을 수 있는 방법이 있어야해".

### 구현
Section 목록 모달(9-22)에 "여기로 이동" 버튼 추가. `getSelectedPage()`로
CueList에서 선택해둔 Page를 가져와, 버튼 클릭 시 그 Section으로
`MOVE_PAGE_TO_SECTION`을 실행한다("+ 섹션"의 자동 배정, 9-21과 동일한
패턴 재사용). 모달 상단에 현재 선택된 Page를 안내하는 문구를 추가해
워크플로우를 명시("CueList에서 Page를 먼저 선택 → 모달에서 배정할
Section 선택"). 선택된 Page가 없으면 버튼 비활성화, 이미 그 Section에
있으면 "현재 위치"로 표시하고 비활성화한다.

### 변경 파일
`index.html`

### 검증
Node로 3개 시나리오 검증 — 선택된 Page 없을 때 `null` 확인, Page 선택 후
유령 Section에 배정하면 유령 해제되고 카운트 반영, 이미 배정된 Page를
다시 선택하면 "현재 위치" 판정 로직이 맞는지 — 전부 통과. `node --check`
통과.

**브라우저 실사용 테스트 필요**: CueList에서 Page 선택 → "≡ 섹션" 모달
열기 → 유령 Section에 "여기로 이동" 클릭 → CueList에 그 Section 헤더가
비로소 나타나는지.

## 9-24. Section 순서 위/아래 이동 (2026-07-06, 9-23 후속 — 이전 세션이 계획만 하고 미구현 상태로 중단됐던 작업)

### 배경
9-22/9-23으로 Section 목록을 보고 빈 Section에 Page를 배정할 수는 있게 됐지만, "Section 전체의 Flow 순서"를 바꾸는 방법이 없었다. 이전 세션이 `moveSectionGroup()` 설계와 구현 계획 전체를 대화로 설명했으나(Presentation.js/AppStore.js/HistoryManager.js/index.html 순서로 진행하겠다고 밝힘), 실제 도구 호출 없이(또는 호출 도중) 세션이 끊겨 코드베이스에는 아무 변경도 반영되지 않은 상태였다 — `grep`으로 전수 확인함(`moveSectionGroup`/`MOVE_SECTION_GROUP` 등 매치 없음). 이번 세션에서 계획을 그대로 유효하다고 판단해 처음부터 구현했다.

### 구현
**`domain/Presentation.js`**: `moveSectionGroup(presentation, sectionId, direction)` 추가. `getSectionGroups()`로 현재 그룹 목록을 얻어 대상 Section과 인접 그룹(`up`→이전, `down`→다음)을 찾아 통째로 맞바꾼다(`flatMap`으로 `pages[]` 재구성). 유령 Section(그룹 자체가 없음)이나 이미 끝에 있는 경우는 원본 `presentation` 참조를 그대로 반환(no-op, 참조 동일성 보존 — 불필요한 mutation 방지 원칙 재사용, 9-13에서 확립한 패턴). 맞바꾸는 두 그룹이 둘 다 실제 Section이면 `sectionIds`(표시 순서 SSOT)의 상대 순서도 함께 맞춰 두 값이 어긋나지 않게 한다.

**`store/AppStore.js`**: `MOVE_SECTION_GROUP` 리듀서 케이스 추가.

**`history/HistoryManager.js`**: `MOVE_SECTION_GROUP`의 Undo는 **방향만 반대로 다시 실행**하면 된다 — 인접 그룹 맞바꾸기는 자기 자신의 역연산이기 때문이다(A/B를 맞바꾼 뒤 같은 두 이웃을 다시 맞바꾸면 A/B로 복귀). `prevState` 참조 없이 `action.direction`만 뒤집는 가장 단순한 형태로 구현.

**`index.html`**: Section 목록 모달의 각 행에 ▲/▼ 버튼 추가. 유령 Section이거나 이미 맨 위/맨 아래인 경우 비활성화(disabled) — 눌러도 아무 일 없는 버튼을 보여주는 대신 명확하게 막는다.

### 변경 파일
`domain/Presentation.js`, `store/AppStore.js`, `history/HistoryManager.js`, `index.html`

### 검증
Node로 도메인 함수 단독 테스트(정상 맞바꿈, `sectionIds` 동기화, 방향 반전으로 원본 복원, 유령/맨위/맨아래 3가지 no-op 케이스 — 전부 참조 동일성까지 확인) + 실제 `execute()`/`dispatch()`/`HistoryManager.undo/redo()`를 통한 전체 파이프라인 통합 테스트(Section 두 개 이동 → Undo → Redo까지 순서가 정확히 왕복하는지) 완료. `node --check`으로 전체 구문 검사 통과.

**브라우저 실사용 테스트 필요**: "≡ 섹션" 모달에서 ▲/▼ 클릭 시 CueList의 Section 순서가 실제로 바뀌는지, 유령 Section/맨 위/맨 아래에서 버튼이 비활성화로 보이는지, Ctrl+Z로 순서가 되돌아가는지.

## 9-25. Section 목록 모달 정렬 기준 수정 (2026-07-06, 9-24 실사용 피드백 대응)

### 배경
9-24 실사용 확인 중 "화살표 방향으로 직관적으로 안 움직인다"는 신고. 원인: 목록은 `sectionIds`(생성 순서) 기준으로 그려졌는데, ▲/▼ 버튼은 `pages[]` 안의 **Flow 순서**(`getSectionGroups()`)를 기준으로 옮긴다 — 두 순서가 D-Editor-4 설계상 원래 서로 다를 수 있는 값이라(FutureEditor.md "잃는 것" 참조), Section을 생성한 순서와 실제 Flow 안에서의 위치가 어긋나 있으면 "목록에 보이는 순서 ≠ 버튼이 바꾸는 순서"가 되어 방향이 어색하게 느껴졌다.

### 수정
`renderSectionList()`가 이제 `sectionIds` 대신 `getSectionGroups()` 기반 **Flow 순서**로 목록을 그린다 — "지금 보이는 순서 = 버튼이 바꾸는 순서"를 항상 일치시켜 어긋남을 원천 차단한다. Flow 안에 그룹 자체가 없는 유령 Section(Page 0개)은 Flow 순서에 낄 자리가 없으므로, `sectionIds` 순서 그대로 목록 맨 아래에 모아서 보여준다.

### 알려진 잔여 사각지대 (수정 안 함, 다음 신고 시 재검토)
Section 사이에 "미분류" Page 블록이 끼어있는 경우, ▲/▼는 바로 옆 이웃(그게 미분류 블록이어도) 한 칸만 옮긴다 — 실제로는 정확히 한 칸 이동하지만(CueList엔 반영됨), 이 모달 목록엔 미분류 항목이 표시되지 않아 "눌러도 그대로인 것처럼" 보일 수 있다. 필요해지면 미분류 구간을 목록에 비활성 placeholder 행으로 표시하는 방향으로 개선 가능 — 지금은 신고된 핵심 문제(생성 순서 vs Flow 순서 불일치)만 해결한다.

### 변경 파일
`index.html`

### 검증
Node로 "Section 사이에 미분류가 낀 경우"를 포함한 시나리오 재현 — Flow 순서 기반 목록이 신고된 핵심 케이스(미분류 없이 여러 Section)에서는 정확히 일치하고, 미분류가 낀 잔여 케이스는 위에 명시한 대로 남아있음을 확인. `node --check` 통과.

**브라우저 실사용 테스트 필요**: Section 여러 개를 서로 다른 순서로 만들고 Flow 순서를 드래그로 뒤섞은 뒤, 모달의 ▲/▼가 이제 목록에 보이는 순서 그대로 움직이는지 확인.

## 9-26. Section 색상/메모 편집 UI (2026-07-06, Section UI 마지막 남은 하위 항목)

### 배경
TODO.md의 Section UI 항목에서 유일하게 남아있던 하위 작업. `color`/`note` 필드는 `domain/Section.js`에 처음부터 있었고 CueList Section Tree(9-14)도 `section.color`를 색상 점(dot)으로 이미 그리고 있었지만, 실제로 값을 넣을 수 있는 UI가 없었다.

### 구현
Section 목록 모달(9-22)의 각 행에 추가:
- **색상**: 네이티브 `<input type="color">`. `change` 시 `UPDATE_SECTION` dispatch. 커스텀 팔레트 UI는 범위 밖 — 네이티브 컬러피커로 충분.
- **메모**: 텍스트 입력. `blur` 시점에만 저장(매 키 입력마다 dispatch하지 않음) — 값이 실제로 안 바뀌었으면 dispatch 자체를 생략.

### 변경 파일
`index.html`

### 검증
Node로 `replaceSection()`이 `color`/`note` 필드를 올바르게 병합하는지 확인. `node --check`으로 임베디드 모듈 스크립트 구문 검사 통과. **브라우저 실사용 테스트 필요**: 색상 선택 → CueList Section 헤더의 색상 점에 즉시 반영되는지, 메모 입력 후 포커스 아웃 → 모달 다시 열어도 유지되는지(영속 확인).

## 9-27. 스타일 프리셋 (D-023/D-024/D-025 구현) (2026-07-06)

### 배경
Song/Asset 관계 재검토(TODO.md) 논의 중, "재가져오기 시 스타일이
초기화되는 문제"를 다루다가 애초에 "스타일"이 무엇을 뜻하는지가
모호하다는 게 드러났다 — Page 개별 서식 필드(이미 존재)와 "이름 붙은
서식 묶음을 재사용하는 프리셋"(존재하지 않음)은 다른 개념이었다.
논의 끝에 D-022(Page가 서식 값을 직접 소유, 변경 없음), D-023(프리셋은
값 복사일 뿐 참조 아님), D-024(적용 대상은 선택된 Page 하나로 제한,
다중 선택은 Non-goal), D-025(저장 위치는 Presentation이 아닌
AppSettings)로 결정이 정리됐다.

### 구현
- `domain/StylePreset.js` 신규 — `createStylePreset()`/
  `isValidStylePreset()`/`createDefaultStylePresets()`(시스템 기본
  프리셋 "찬양 기본"/"설교 자막" 2개). Page/Section과 어떤 참조
  관계도 갖지 않는다(D-023).
- `store/AppSettingsStore.js` 신규 — `persistence/StorageAdapter.js`를
  그대로 재사용해 `tc-presenter-app-settings`라는 별도 key에 저장
  (D-025). `{ version: 1, stylePresets: [] }` 형태. 손상된 개별
  프리셋만 제외하고 복구하는 sanitize 로직 포함(Schema.js와 같은
  정신). CommandBus/HistoryManager를 거치지 않는다 — 프리셋 변경은
  Undo 대상이 아니다(Presentation 편집 이력과 무관한 앱 설정이므로).
- `index.html` — 사이드바에 "스타일 프리셋" 드롭다운 + 적용/새로
  저장/삭제 버튼 추가. "적용"은 사이드바 입력 필드를 채울 뿐이고
  (D-023의 값 복사), 실제 Page 반영은 기존 "저장"/"가사 추가" 버튼을
  그대로 눌러야 한다 — 새로운 커밋 경로를 만들지 않았다. 삭제는
  Section 목록 모달과 같은 2단계 확인 방식("삭제" → "정말 삭제?").

### 범위 밖으로 남긴 것 (D-024 Non-goal)
- 다중 선택 Page 일괄 적용 — 현재 선택 모델(`selectedPageId`, 단일)이
  전제라 별도 선택 모델 확장이 필요함.
- Section 전체/Presentation 전체 일괄 적용.
- 프리셋 "업데이트"(덮어쓰기) — 지금은 항상 새 프리셋으로 저장만
  가능. 필요성 확인되면 후속 TODO.

### 변경 파일
`domain/StylePreset.js`(신규), `store/AppSettingsStore.js`(신규),
`index.html`

### 검증
Node 테스트 10개 — 도메인(생성/검증/기본 프리셋 2종), AppSettingsStore
(최초 시드+저장, 추가/삭제/수정 각각 localStorage 반영 확인), 재로드
시나리오(기존 데이터 유지, 손상된 개별 프리셋만 제외, 완전 손상 시
기본값 폴백) — 전부 통과. `node --check`로 신규 `.js` 파일 및
`index.html` embedded module script 문법 검사 통과.

**브라우저 실사용 테스트 필요**: 사이드바에서 프리셋 선택 → 적용 →
값이 실제로 채워지는지 → 저장/가사 추가 버튼으로 Page에 반영되는지,
새로 저장/삭제가 새로고침 후에도 유지되는지(AppSettings가
Presentation과 별개로 살아남는지).

## 9-28. Song Aggregate 도메인 모델 + 저장소 (2026-07-09, Asset/Song 관계 재검토 착수)

### 배경
TODO.md에 유일하게 열려있던 Architecture 항목 "Asset/Song 관계 재검토"를
착수. 대화로 다섯 가지를 순서대로 정리했다 — (1) Song Aggregate의
책임 범위, (2) Song → Section → Page 생성 흐름이 맞는지, (3)
Presentation과 Song의 관계, (4) Library 저장 단위를 이번엔 Song만 할지,
(5) Asset과 Song의 관계. 결론은 `Decisions.md`의 `D-026`(Song Aggregate
MVP 범위)과 `D-027`(Song은 Asset이 아니라 별도 Aggregate)로 확정했다 —
`D-021`(Song → Section 재가져오기 pull 모델)은 그대로 유지, 이번 세션은
그 위에 Song 자체의 도메인 모델을 얹는 작업이다.

### 구현
- **`domain/Song.js`** 신규 — `Song`(`id`/`title`/`lyrics`/`tags`)과
  `LyricBlock`(`id`/`label`/`text`) 생성/검증 함수. `author`/
  `composer`/`ccli` 없음(`D-026`). Presentation/Section을 전혀 모른다
  — `sectionId`나 스타일 필드를 두지 않는다(`D-021` 규칙 2, `D-022`와
  대칭).
- **`store/SongStore.js`** 신규 — `store/AppSettingsStore.js`와 같은
  패턴(`persistence/StorageAdapter.js` 재사용, write-through, Undo
  대상 아님) 그대로 재사용하되 완전히 별도 storage key
  (`tc-presenter-songs`)를 쓴다. `MediaStore.js`와 서로의 존재를 모른다
  (`D-027`). `AppSettingsStore.js`와 달리 최초 실행 시 시드할 기본
  Song이 없으므로(StylePreset의 "찬양 기본"/"설교 자막"과 다름), 빈
  배열로 시작하고 최초 `persist()` 강제 호출도 생략했다 — 어차피 빈
  상태는 저장할 필요가 없다.

### 변경 파일
`docs/Decisions.md`(D-026, D-027 추가), `domain/Song.js`(신규),
`store/SongStore.js`(신규), `docs/TODO.md`

### 검증
Node로 도메인 함수(`createLyricBlock`/`createSong`/`isValidSong`/
`isValidLyricBlock`) 정상 생성·기본값·검증 실패 케이스(배열 아님,
내부 LyricBlock 손상, null) 확인. `SongStore.js`는 `localStorage`
mock으로 최초 빈 목록 → 추가 → 조회(`getSongById`) → 실제 저장된
raw JSON 확인 → 수정 → 삭제 → 손상된 데이터 복구(정상 Song 1개는
살아남고 손상된 Song 1개만 제외되는지) 시나리오까지 전부 통과.
`node --check`로 두 파일 구문 검사 통과.

**브라우저 실사용 테스트는 아직 불필요** — 이번 세션은 UI 연결 전
도메인/저장소 레이어만 구현했다. 다음 단계(Song Library UI)에서 실제
화면 확인이 필요해진다.

### 다음 단계
TODO.md에 4개 항목으로 이어둠 — Song Library UI → Song → Section →
Page 생성(`D-021` 적용) → 재가져오기(Pull) 연결 → (별도) Media
Library UI.

## 9-29. Song Library UI 연결 (2026-07-09, TODO.md Song Library UI 항목)

### 배경
9-28에서 만든 `domain/Song.js`/`store/SongStore.js` 위에 실제 UI를
얹는 작업. Library 모달(9-18에서 뼈대만 있던 것)의 Songs 카테고리에
목록/추가/편집/삭제를 연결했다. Song → Section → Page 생성(D-021
적용)과 재가져오기(Pull) 연결은 이번 세션 범위 밖 — 다음 TODO 항목.

### 구현
- **`index.html` HTML**: Library 모달 Songs 카테고리에 "+ 새 곡"
  버튼과 `#song-list-body` 목록 컨테이너 추가. 별도 `#song-editor-modal`
  신규(제목/태그/가사 입력 + 저장/취소) — 기존 `.modal-overlay`/
  `.modal-box` 패턴 그대로 재사용, 새 CSS 클래스는 추가하지 않았다
  (Section 목록 모달의 `.section-list-row`/`.section-list-actions`/
  `.section-list-delete-btn`을 그대로 재사용).
- **가사 입력 포맷**: 한 textarea에 전체 가사를 붙여넣되, 빈 줄로
  구절을 구분하고 각 구절의 첫 줄을 라벨로 취급
  (`splitLyricsToBlocks`). 기존 "가사 추가"(`utils/lyricsImport.js`)의
  "빈 줄 분절" 관습을 UX만 재사용했다 — 파일 자체는 공유하지 않는다
  (그건 Page를 만들고 이건 `LyricBlock`을 만드는 다른 목적이라, Song이
  Presentation을 모른다는 `D-026` 원칙과 같은 이유로 분리 유지).
  편집 시 되돌려 채우기 위한 역변환(`blocksToLyricsText`)도 추가 —
  왕복 변환이 원본과 동일한 구조로 복원되는지 확인함.
- **삭제**: `alert`/`confirm`/`prompt` 대신 Section 목록 모달과 같은
  2단계 확인 버튼 패턴(`is-confirming`, TODO.md의 `prompt()` 취약점
  회피와 같은 이유) 재사용.
- Song 편집 UI는 `store/SongStore.js`만 호출한다 — `AppStore`/
  `CommandBus`/`HistoryManager`를 전혀 거치지 않는다(`D-027`, Song은
  Presentation 편집 이력과 무관).

### 변경 파일
`index.html`(Library 모달 마크업, Song 편집 모달 신규, Song CRUD UI
스크립트), `docs/TODO.md`

### 검증
`index.html`에서 `<script type="module">` 블록을 추출해
`node --check` 통과. HTML 구조 무결성(중복 id 없음, `<div>` 개폐 개수
일치) 스크립트로 확인. 가사 파싱 로직(`splitLyricsToBlocks`/
`blocksToLyricsText`)은 별도로 추출해 Node에서 케이스별
(라벨+여러 줄, 라벨 없는 한 줄, 왕복 변환 동일성, 빈 입력, 빈 줄
3개 이상 연속) 검증 통과.

**브라우저 실사용 테스트는 아직 안 함** — 이 컨테이너는 네트워크
정책상 브라우저를 띄울 수 없어(허용 도메인에 브라우저 바이너리
다운로드 경로 없음), Node 레벨 검증까지만 이번 세션에서 확인했다.
다음에 실제로 "라이브러리 → + 새 곡 → 저장 → 편집 → 삭제" 흐름을
직접 확인해달라는 요청과 함께 넘긴다.

### 다음 단계
Song → Section → Page 생성(D-021 적용) → 재가져오기(Pull) 연결.

## 9-30. Song → Section → Page 생성 + 재가져오기(Pull) 연결 (2026-07-09, D-021 구현)

### 배경
9-28/9-29로 Song Aggregate와 Library UI가 준비됐으니, 이제 D-021이
정의해둔 규칙(Section에 `sourceSongId`, Page는 출처를 모름, 재가져오기는
전체 Replace, 자동 감지 없음, `isModified` 경고)을 실제로 연결하는
차례. TODO.md에 남겨뒀던 다음 순서 그대로 진행.

### 구현

**`domain/Section.js`**: `sourceSongId`(nullable)/`isModified`(boolean)
필드 추가. `isValidSection()`은 두 필드가 없어도(undefined) 유효하다고
본다 — 2026-07-09 이전에 저장된 Section도 깨지지 않아야 하므로, 실제
기본값 적용은 `sanitizePresentation()` 쪽 책임으로 분리했다.

**`domain/Presentation.js`**:
- `sanitizePresentation()` — Section 로드 시 `sourceSongId ?? null`,
  `isModified ?? false`로 정규화(구버전 데이터 호환).
- `importSongAsSection(presentation, song)` 신규(D-021 규칙 1) — Song의
  각 LyricBlock을 text Page로 변환하고, `sourceSongId`를 가진 새
  Section을 만들어 `pages[]` 맨 뒤에 붙인다. Page는 어느 LyricBlock/
  Song에서 왔는지 전혀 기록하지 않는다(규칙 2).
- `reimportSongIntoSection(presentation, sectionId, song)` 신규(규칙 3)
  — 그 Section 소속 Page를 전부 지우고 Song의 최신 내용으로 다시
  생성하되, **원래 있던 위치 그대로** 끼워 넣는다(`getSectionGroups()`로
  현재 그룹 위치를 계산). 성공하면 `isModified`를 `false`로 리셋한다.
- `markModifiedSongSections(prev, next)` 신규(규칙 5) — Song 출처가
  있는 Section의 Page 목록이 이전 상태와 하나라도 달라지면(참조
  동일성 기준) `isModified`를 `true`로 전환한다. 필드 단위 diff는
  하지 않는다(D-021이 명시적으로 피한 복잡도). 한 번 `true`가 되면
  `reimportSongIntoSection()`을 실행하기 전까지 되돌아가지 않는다.

**`store/AppStore.js`**: `IMPORT_SONG_AS_SECTION`/`REIMPORT_SONG_SECTION`
액션 추가. `dispatch()`에 `markModifiedSongSections()`를 매 액션마다
호출하는 로직을 추가하되, 이 두 액션 자신은 예외로 건너뛴다 — 두
액션 모두 "그 Section의 Page 목록을 통째로 새로 만드는" 동작이라
일반적인 diff 기준으로는 반드시 "변경"으로 잡히기 때문이다(방금 막
생성/리셋한 Section을 곧바로 "수정됨"으로 표시해버리는 버그를 테스트
중 실제로 발견하고 수정함 — 아래 검증 참조).

**`index.html`**:
- Library 모달 Songs 탭에 "Flow에 추가" 버튼 — 클릭 시
  `IMPORT_SONG_AS_SECTION` 실행, 성공 토스트.
- Section 목록 모달에 "다시 가져오기" 버튼(`sourceSongId` 있는
  Section에만 표시) — 원본 Song이 Library에서 삭제됐으면 토스트로
  안내하고 실행하지 않는다. `isModified`가 true인 Section은 Page
  개수 옆에 "⚠ 원본 Song과 달라짐(수동 편집됨)" 표시.

### 범위 밖으로 남긴 것
- `IMPORT_SONG_AS_SECTION`/`REIMPORT_SONG_SECTION`의 Undo 지원 — 기존에도
  `ADD_SECTION`/`REMOVE_SECTION`/`UPDATE_SECTION`이 Undo 미지원인 것과
  같은 이유로 이번에도 만들지 않음(FutureEditor.md D-Editor-4 "아직
  열려있는 것" 참조, 이미 알려진 gap).
- `pageStyleDefaults`(재가져오기 시 스타일 유지) — D-022로 이미 보류
  결정됨. 재가져오기해도 새로 생성되는 Page는 기본 스타일로 만들어진다.

### 변경 파일
`domain/Section.js`, `domain/Presentation.js`, `store/AppStore.js`,
`index.html`

### 검증
Node 테스트 11개:
- 도메인(7개) — Section+Page 생성/`sourceSongId` 연결, Page가 출처를
  전혀 모름, 재가져오기 시 전체 교체+위치 유지, 재가져오기 시
  `isModified` 리셋, Page 수정 시 `isModified` 전환, 일반 Section은
  영향 없음, 한 번 true면 유지.
- Store/CommandBus 통합(4개) — `IMPORT_SONG_AS_SECTION` 실행,
  `UPDATE_PAGE`로 자동 전환, `REIMPORT_SONG_SECTION`으로 전체
  교체+리셋(다시 뒤집히지 않음), 재가져오기 이후 재수정 시 다시 전환
  (반복 가능) 확인.

테스트 작성 중 **실제 버그 하나 발견 후 수정**: `IMPORT_SONG_AS_SECTION`
직후에도 `markModifiedSongSections`가 "새로 생긴 Page"를 변경으로
오인해 `isModified`를 곧바로 `true`로 만들어버리는 문제 — 처음엔
`REIMPORT_SONG_SECTION`만 예외 처리했다가, 테스트로 확인하는 과정에서
`IMPORT_SONG_AS_SECTION`도 같은 문제를 겪는다는 걸 발견해 함께 예외
처리했다.

`node --check`로 변경된 모든 `.js` 파일 및 `index.html`의 embedded
module script 문법 검사 통과.

**브라우저 실사용 테스트 필요**: Library → Songs 탭 → "Flow에 추가" →
CueList에 새 Section이 실제로 나타나는지, Section 목록 모달에서 Page
텍스트를 수정한 뒤 "⚠ 원본 Song과 달라짐" 표시가 뜨는지, "다시
가져오기" 후 그 표시가 사라지고 위치가 그대로 유지되는지.

## 9-31. Song Library 삭제 2단계 확인 버그 수정 + Song 핵심 로직 회귀 테스트 추가 (2026-07-10)

### 배경

9-29/9-30에서 남겨둔 브라우저 실사용 테스트를 진행하기 전에, 코드
레벨에서 먼저 점검했다. 그 과정에서 Song Library 모달의 2단계 삭제
확인 상태가 모달을 닫았다 열어도 초기화되지 않는 버그를 발견했다 —
Section 목록 모달(9-22)은 열 때마다 `pendingDeleteSectionId`를
리셋하는데, Song Library 모달만 이 리셋이 빠져 있었다.

### 원인

`index.html`의 `library-btn` 클릭 핸들러가 `libraryModal.style.display
= 'flex'`와 `renderSongList()`만 호출하고 `pendingDeleteSongId`를
리셋하지 않았다. 삭제 1단계("삭제" 클릭 → "정말 삭제?")를 진행한 뒤
확인하지 않고 모달을 닫았다가 다시 열면, 그 곡 행이 여전히 "정말
삭제?" 상태로 남아 한 번의 클릭만으로 확인 없이 삭제될 수 있었다 —
2단계 확인이라는 안전장치가 무력화되는 상황.

### 수정

`library-btn` 클릭 핸들러 맨 앞에 `pendingDeleteSongId = null`을
추가해, Section 목록 모달과 동일하게 "열 때마다 리셋"하도록 맞췄다.
Section 삭제 로직(`pendingDeleteSectionId` 관련 코드)은 건드리지
않았다.

### 회귀 테스트 추가

`D-028` 이후 이 프로젝트의 검증 방식이 "임시 스크립트 후 삭제"에서
"영속 테스트 축적"으로 바뀐 것에 따라, 이번 수정과 코드 리뷰에서 함께
다룬 Song 핵심 로직을 전부 영속 테스트로 남겼다:

- `index.test.js`(신규) — `index.html`은 비-모듈 거대 스크립트라 실제
  DOM 실행 테스트는 범위 밖(`D-028`)이지만, "이 수정이 소스에서 다시
  사라지지 않는지"만 감시하는 소스 레벨 회귀 가드 2개를 작성했다.
  수정 전 상태를 메모리상에서 시뮬레이션해 이 가드가 실제로
  실패했을 것임을 확인했다(인과관계 검증).
- `domain/Presentation.test.js`(신규) — `importSongAsSection`/
  `reimportSongIntoSection` 9개 케이스. "가사 0개 Song → 유령
  Section이 되는" 엣지 케이스, "앞뒤 Section 사이 위치 유지" 케이스를
  포함한다. 아직 Song 연동 함수만 다루며, `Presentation.js`의 나머지
  함수(`movePage` 등)는 범위 밖으로 남겨뒀다.
- `store/SongStore.test.js`(신규) — Song CRUD 8개 케이스(localStorage
  실제 저장 확인, 손상 데이터 부분/전체 복구, JSON 파싱 실패 폴백
  포함). `SongStore.js`가 모듈 로드 시점에 1회만 state를 읽는 구조라,
  테스트마다 쿼리스트링(`?case=N`)으로 매번 새 모듈 인스턴스를
  import하는 방식을 썼다.

`npm test` 33개 전부 통과.

### 코드 리뷰 중 추가로 확인한 것 (버그 아님, 확인만 하고 넘어감)

- 가사 없는 Song으로 "Flow에 추가"/"다시 가져오기"를 하면 Page 0개짜리
  유령 Section이 될 수 있다 — `D-021`의 "전체 Replace" 규칙대로
  의도된 동작이라 버그는 아니지만, 화면엔 아무 변화 없어 보여서
  실사용 중 헷갈릴 수 있는 지점이라 `ManualTestChecklist.md`에
  시나리오로 남겨뒀다.
- `isModified`가 한 번 `true`가 되면 Undo로 Page를 되돌려도 다시
  `false`로 안 돌아가는 것 — `D-021` 규칙 5 그대로, 의도된 동작이다.
- Song 섹션의 Page가 `pages[]` 배열 상에서 여러 조각으로 흩어지면
  `reimportSongIntoSection()`의 위치 계산이 꼬일 수 있다고 의심했으나,
  `movePage()`/`movePageToSection()`의 "인접 Page의 sectionId 자동
  흡수" 규칙(D-Editor-4 규칙 5) 때문에 애초에 그런 상태 자체가
  구조적으로 발생할 수 없음을 직접 시나리오로 재현해 확인했다 —
  문제 없음.

### 브라우저 실사용 확인 (2026-07-10)

`ManualTestChecklist.md`에 남아있던 9-29/9-30의 미확인 항목(Song
Library CRUD, Flow에 추가, 재가져오기) 전부 브라우저에서 직접 확인,
이상 없음 — 위에서 고친 `pendingDeleteSongId` 버그도 포함해서
재확인됐다. `ManualTestChecklist.md`의 "확인 필요" 섹션을 비우고
"확인 완료" 섹션으로 옮겼다.

### 변경 파일

`index.html`(1줄), `index.test.js`(신규), `domain/Presentation.test.js`
(신규), `store/SongStore.test.js`(신규), `docs/ManualTestChecklist.md`

### 다음 단계

TODO.md의 나머지 열린 항목(Media Library UI, `prompt()` 취약점,
Transition/Auto Advance 등) 중 선택.

## 9-32. Section 추가/스타일 프리셋의 `prompt()` 취약점 근본 해결 (2026-07-11)

### 배경

9-31 이후 TODO 우선순위를 재검토하면서, 남은 항목 중 "지금 바로 해야
하는 것"으로 `prompt()` 취약점을 지목했다 — 실사용 중 실제로 터진
이력이 있는 유일한 미해결 결함이었고, 스타일 프리셋 "새로 저장"까지
같은 `prompt()`를 재사용해 위험이 2곳으로 퍼져있는 상태였다(2026-07-06
발견, 9-20/9-21에서 토스트 안내·자동 배정으로 부분 대응만 완료). 브라우저가
`prompt()`/`alert()` 반복 호출을 감지해 "추가 대화상자 차단" 체크박스를
띄우면, 그 이후 `prompt()` 호출이 항상 즉시 `null`을 반환해 버튼이
안 먹는 것처럼 보이는 게 근본 원인이었다.

### 수정

`index.html`에 범용 "이름 입력" 모달(`#text-prompt-modal`)과
`showTextPrompt({ title, defaultValue })` 헬퍼를 신설했다. 기존
`.modal-overlay`/`.modal-box` 패턴을 그대로 재사용했고, `prompt()`와
동일한 반환 계약(취소 시 `null`, 확인 시 입력 문자열)을 유지해 호출부
수정을 최소화했다 — 확인/취소 버튼, 바깥 클릭, Enter(확인)/Escape(취소)
키를 전부 지원한다.

두 호출부를 교체했다:
- "+ 섹션" 버튼: `prompt('Section 제목', '섹션')` → `await
  showTextPrompt({ title: 'Section 제목', defaultValue: '섹션' })`
- 스타일 프리셋 "새로 저장": `prompt('프리셋 이름', '새 프리셋')` →
  동일 패턴으로 교체

두 핸들러 모두 기존엔 동기 화살표 함수였는데, `await`를 쓰기 위해
`async`로 전환했다. 이후 로직(`execute()` 체인, `createStylePreset()`
호출 등)은 무수정 — `prompt()` 호출 자리만 `await showTextPrompt(...)`로
바뀌었다. `grep`으로 확인한 결과 실제 코드에는 `prompt(`/`alert(` 호출이
더 이상 하나도 없다(주석에 설명으로만 남아있음).

### 회귀 테스트 추가

`index.test.js`에 4개 추가 — 코드(주석 제외)에 `prompt(` 호출이 없는지,
`showTextPrompt()`가 정의돼 있는지, Section 추가/프리셋 저장 두 핸들러가
실제로 `showTextPrompt()`를 호출하는지. 주석에 "prompt()"라는 문자열
자체가 설명 목적으로 자주 등장해서(예: "TODO.md의 prompt() 취약점 참조"),
단순 텍스트 검색은 오탐이 나 주석을 먼저 벗겨내는 `stripComments()`
헬퍼를 추가해 실제 코드만 검사하도록 했다.

`npm test` 37개 전부 통과.

### 변경 파일

`index.html`, `index.test.js`, `docs/TODO.md`(항목 완료 처리),
`docs/ManualTestChecklist.md`(브라우저 확인 항목 추가)

### 브라우저 실사용 테스트 필요

`ManualTestChecklist.md`에 등록: "+ 섹션"/프리셋 저장 모달 흐름(제목
입력→확인, 취소, Enter/Escape, 바깥 클릭)이 실제로 기존과 동일하게
동작하는지 — 아직 미확인.

## 문서 정리 (부수 작업)

`docs/presenter/` 폴더 전체 삭제. 압축 파일에 예전 Obsidian 볼트가 그대로 섞여 들어와 있었다 — 20개 md 파일은 `docs/` 루트와 줄바꿈 문자(CRLF/LF)만 다르고 내용은 100% 동일한 중복이었고, `CurrentState.md` 1개만 내용이 달랐는데 2026-06-14 시점의 stale 버전(Freeze 이전)이라 폐기했다. `docs/`에는 이제 21개 문서만 남는다.

## 9-33. Media Library UI (2026-07-11, TODO.md 로드맵의 P1 항목 구현)

### 배경

9-32 이후 `TODO.md`를 우선순위 로드맵 형태로 개편하면서(Priority/Status/
Reason/Impact/Dependency/Risk/Completion Criteria 필드 도입), 미완료 P0/P1
항목 중 Decision과 충돌하지 않는 유일한 항목으로 "Media Library UI"를
선정했다. Library 모달의 Songs 탭은 9-29에서 완성됐지만 Backgrounds/Videos
탭은 9-18 이후 "준비 중" 빈 메뉴로 남아있었다.

착수 전 두 가지를 분리해서 확인했다(`TODO.md`의 "Decision과 Research를
구분하는 기준" 참조 — Decision 충돌 여부만 강제 기준으로 삼고, Research는
위험 신호/배경 근거로만 쓴다).

**Decision 충돌 여부(강제 기준) — `Decisions.md`의 `D-002`(Presentation이
Page를 직접 소유)를 확인, 위반하지 않는다.** `D-002`는 "Presentation이
Page 순서를 직접 관리한다"는 소유 구조에 대한 결정이다. 이번 작업은 그
구조를 바꾸지 않는다 — 새로 만드는 Page도 기존 `ADD_PAGE`로 `pages[]`
맨 뒤에 그대로 들어간다.

**Research 참고(강제 아님) — `Research/2026-07-05 Library-Centric
Workflow.md`.** 이 문서는 "Media를 Page에 붙이기 전에 Library에 먼저
등록하고 재사용하는" **전체** 재구조화가 `D-002`와 정면 충돌하고
GC/Persistence 스키마 분리까지 얽힌 더 큰 결정이라 아직 Research 단계로
남겨뒀다고 명시한다(문서 1~7행: "Status: Research... 구현 근거로 쓰지
않는다"). 이 문서 자체는 Decision이 아니므로 착수를 막을 강제력이 없지만,
"mediaId를 공유하는 것 자체는 막혀있지 않지만 그걸 가능하게 하는 화면이
없다"(문서 인용)는 지적을 참고해, **여러 Presentation이 Asset을
공유**하거나 **Page/Presentation 소유 구조를 바꾸는 것**은 하지 않고
mediaId 재사용을 위한 **화면 하나**만 추가하는 것으로 스스로 범위를
좁혔다 — Research가 "하지 마라"고 강제한 게 아니라, Research가 보여준
더 큰 그림 중 지금 필요한 조각만 골라낸 것이다.

### 구현

**`media/MediaStore.js`**: `list()` 신규 export. 저장된 모든 Media의
메타데이터(`id`/`fileName`/`mimeType`/`size`/`createdAt`)를 Blob 없이
반환한다 — 목록 화면에 Blob까지 전부 메모리에 올릴 필요가 없어서다(개별
Blob은 필요할 때 기존 `get(mediaId)`로 단건 조회). 기존 `listIds()`는
그대로 유지(디버그용, 호출부 없음).

**`index.html`**: Library 모달의 Backgrounds/Videos 탭에 실제 목록/추가/
삭제/적용 UI를 연결했다. Song Library(9-29)와 동일한 패턴을 재사용한다.

- **추가**: "+ 배경 추가"/"+ 영상 추가" 버튼 → 숨겨진 file input → 선택한
  파일마다 `putMedia()`로 `MediaStore`에만 저장한다. **Page는 만들지
  않는다** — 기존 에디터 툴바의 "미디어 추가" 버튼(`media-file-input`,
  Step6)은 업로드 즉시 Page를 만드는 별개 경로로 그대로 남겨뒀고, Library
  쪽은 "등록"과 "배치"를 분리해 재사용을 가능하게 하는 것이 이번 작업의
  핵심이다.
- **목록**: `listMedia()` 결과를 `mimeType` 접두사(`image/`/`video/`)로
  필터링해 각 탭에 렌더링한다. Song 목록과 동일한 CSS 클래스
  (`section-list-row`/`section-list-info`/`section-list-actions` 등)를
  재사용해 새 스타일을 추가하지 않았다.
- **적용("Flow에 추가")**: 기존 `mediaId`를 그대로 참조하는 새
  `createImagePage()`/`createVideoPage()` Page를 만들어 `ADD_PAGE`로
  `pages[]` 맨 뒤에 추가한다. 같은 항목을 여러 번 눌러도 매번 새 Page가
  생성되며 `mediaId`는 공유된다 — 브라우저 테스트로 재사용 자체를
  확인했다(아래 참조).
- **삭제**: Song 삭제와 동일한 2단계 확인(버튼 두 번 클릭, `confirm()`
  미사용 — `prompt()` 취약점과 같은 부류의 "반복 대화상자 차단" 문제를
  피하기 위함, 9-32 참조)으로 `removeMedia()`를 호출한다. 이미 어떤
  Page가 참조 중인 `mediaId`를 삭제해도 막지 않는다 —
  `CommandBus.preloadMedia()`가 원래 "레코드를 못 찾으면 조용히 경고만
  남기고 넘어간다"로 이 상황을 이미 전제하고 설계돼 있어(기존 GC 미도입
  결정과 같은 결), 별도 사용처 검사를 추가하지 않았다.

### 회귀 테스트 추가

`media/MediaStore.test.js` 신규(5개) — `fake-indexeddb/auto`로
`globalThis.indexedDB`를 채워 `put`/`get`/`remove`/`list` 전부를 검증한다.
같은 DB를 여러 테스트가 공유하므로(모듈 스코프 `DB_NAME` 상수라
`SongStore.test.js`처럼 매번 새 인스턴스를 만들 수 없음), 각 테스트가 만든
`mediaId`는 그 테스트 안에서 직접 정리한다.

`npm test` 42개 전부 통과(기존 37 + MediaStore 5).

### 브라우저 테스트 (Playwright, 자동화)

`node:test`가 커버하지 않는 `index.html` embedded script/렌더링 영역은
9-32에서 도입한 Playwright(로컬 정적 서버 + Chromium)로 확인했다(임시
스크립트는 검증 후 삭제 — D-028 관행).

- 라이브러리 모달 오픈, Backgrounds/Videos 빈 상태 안내 문구 확인
- 배경 이미지 업로드 → 목록에 파일명/용량 표시, Videos 탭에는 안 나타남(카테고리 분리)
- "Flow에 추가" → 성공 토스트 + CueList에 실제 Page 반영
- 같은 항목을 두 번 "Flow에 추가" → 두 개의 Page가 모두 생성됨(재사용 확인)
- 삭제 2단계 확인 → 실제 삭제 → 모달 재오픈 후에도 확인 상태가 새지 않음(9-31에서 고친 Song 삭제 버그와 같은 회귀 패턴을 미리 검증)
- 영상 업로드 → Videos 탭 표시, Backgrounds 탭에는 안 나타남, "Flow에 추가" 동작 확인
- 콘솔 에러 0건

전체 18개 체크 전부 통과.

### 변경 파일

`media/MediaStore.js`(`list()` 추가), `media/MediaStore.test.js`(신규),
`index.html`(Library 모달 Backgrounds/Videos 실기능 연결), `docs/TODO.md`
(항목 완료 처리), `docs/ManualTestChecklist.md`(브라우저 확인 완료 반영).

### 다음 단계 진입 시 주의사항

1. **삭제는 사용처를 검사하지 않는다.** 이미 Page가 참조 중인 미디어를
   삭제하면 그 Page는 다음 로드 시 "미디어를 찾을 수 없음"류 경고만
   콘솔에 남고 조용히 깨진 채로 남는다(기존 `preloadMedia()` 설계 그대로,
   신규 위험 아님). 실사용 중 문제로 확인되면 그때 사용처 경고를 추가한다.
2. **Library 쪽 업로드와 에디터 툴바 업로드는 서로 다른 경로다.** 툴바
   "미디어 추가"는 업로드 즉시 Page를 만들고, Library "+ 배경/영상 추가"는
   Page를 만들지 않는다 — 이 비대칭은 의도된 것이다(재사용을 위해
   "등록"과 "배치"를 분리). 두 경로를 하나로 합칠지는 실사용 피드백을
   보고 별도로 판단한다.
3. **`D-002`(Presentation이 Page를 직접 소유) 재검토 트리거는 아직
   당겨지지 않았다.** 이번 작업은 그 경계 안에서 mediaId 재사용 화면만
   추가한 것이며, 여러 Presentation 간 Asset 공유나 Persistence 스키마
   분리 같은 `Research/2026-07-05 Library-Centric Workflow.md`의 더 큰
   질문들은 여전히 Research 단계로 열려있다.

## 다음 단계 진입 시 주의사항

1. **`Page.js`에 `mediaId`를 추가할 때 `isValidPage()`도 같이 갱신해야 한다.** 현재 `isValidPage()`는 `['text']`만 허용한다(주석으로 `// 미래: 'image', 'video' 추가`가 이미 박혀 있음). 다만 `Presentation.js`의 `addPage()`/`insertPageAt()`은 `isValidPage()`를 호출하지 않는 구조라(검증 없이 그대로 추가), 이 부분이 막혀 있어서 이번 세션 진행이 막혔던 건 아니다 — 다음 단계에서 `isValidPage()`를 검증 게이트로 실제로 쓰는 곳이 생기면 그때 동기화 필요.
2. **`preloadMedia()`가 `payload.page.mediaId`만 본다.** `Page.js`에 `mediaId` 필드를 추가할 때 이름을 다르게 짓지 않도록 주의 — `CommandBus.js`와 이름이 일치해야 한다.
3. **output.html 쪽 RuntimeCache는 메인 탭의 `MediaRuntimeCache.js`를 그대로 가져다 써도 된다(모듈 자체는 탭마다 독립 인스턴스가 되므로 공유 코드 재사용에 문제없음).** 다만 output.html이 mediaId를 받는 시점(`BroadcastChannel`의 `SHOW_PAGE` 수신)에 캐시 미스가 나면 어떻게 할지(빈 화면 vs 로딩 표시)는 다음 단계에서 결정 필요 — 아직 정해지지 않음.
4. **업로드 UI(6번)에서 `MediaStore.put()` 호출 시 `mediaId`를 먼저 `generateId()`로 발급한 뒤 넘겨야 한다.** `put(mediaId, file)`는 ID를 발급하지 않고 호출부가 넘긴 값을 그대로 키로 쓴다(설계 의도).
5. **GC는 여전히 범위 밖.** Page를 삭제하거나 이미지를 교체해도 IndexedDB의 Media 레코드는 그대로 남는다 — 의도된 동작이며, Phase 2 이전에는 정리 로직을 추가하지 않는다.

## 디버그 로그 처리 완료 메모

9-3 디버깅을 위해 `index.html`, `ui/CueList.js`, `ui/PreviewPanel.js`, `output/BroadcastOutput.js`, `command/CommandBus.js`에 임시로 삽입했던 `console.log('[DEBUG-N] ...')` 13곳은 원인 확정 후(부트스트랩 미커버 — D-020) 전부 제거했다. `grep -rn "\[DEBUG-" --include="*.js" --include="*.html" .`로 잔존 여부 재확인 완료(매치 없음).
