# TC-Presenter Decisions

이 문서는 TC-Presenter의 주요 설계 결정을 기록한다.

새 기능을 추가하거나 구조를 변경할 때는
기존 결정을 먼저 확인한다.

---

# D-001

## Core Entity는 Lyrics가 아닌 Page이다

### 결정

Lyrics 중심 모델을 사용하지 않는다.

시스템의 핵심 엔티티는 Page이다.

### 이유

사용자가 실제로 송출하는 것은 가사가 아니라 화면이다.

예시:

* 가사 화면
* 광고 화면
* 안내 화면
* 성경 구절 화면

모두 동일하게 "한 장의 화면"이다.

따라서 Presenter의 최소 단위는 Lyrics가 아니라 Page이다.

### 결과

Lyrics 엔티티는 제거한다.

lyricsImport는 Import 단계에서만 존재한다.

시스템 내부 저장 모델은 Page이다.

---

# D-002

## Presentation은 Page 순서를 관리한다

### 결정

MVP에서는 Presentation이 Page를 직접 소유한다.

현재 구조:

Presentation
└─ Page[]

### 이유

현재 Presenter는 단일 행사(single presentation) 기준으로 동작한다.

Page Library 개념이 존재하지 않으므로
Presentation 내부에서 Page를 직접 관리하는 것이 가장 단순하다.

### 결과

현재 구현:

Presentation
└─ pages: Page[]

향후 Page Library가 도입될 경우

Presentation
└─ pageIds: string[]

구조로 전환할 수 있다.

현재 MVP에서는 Page 직접 소유를 허용한다.

### Amendment (Phase 2)

본 결정은 "Phase 2 Decisions"의 "Presentation 최소화"로 대체되었다.

현재 구조:

```text
Presentation
├─ pageIds
├─ pageMap
└─ elementMap
```

Vocabulary.md, AppStoreArchitecture.md, Architecture.md의 Presentation 스키마 예시는 위 구조를 기준으로 갱신한다.

---

# D-003

## selectedPageId 와 livePageId 를 분리한다

### 결정

선택 상태와 송출 상태를 하나로 합치지 않는다.

### 이유

편집 중인 페이지와
실제 송출 중인 페이지는 다를 수 있다.

예시:

현재 송출

```text
후렴
```

편집 중

```text
다음 절
```

따라서 두 상태는 서로 다른 책임을 가진다.

### 결과

PresenterState는 다음을 가진다.

```js
selectedPageId
livePageId
```

### Amendment (D-014)

"PresenterState"라는 이름은 D-014에 의해 "Session"으로 대체되었다.

분리 자체(selectedPageId ≠ livePageId)는 그대로 유지되지만, 두 값은 더 이상 같은 컨테이너에 속하지 않는다.

```text
Session.selection.selectedPageId
Session.live.livePageId
```

selectedPageId는 Editor가 주로 변경하는 Session.selection 하위, livePageId는 Output도 함께 구독해야 하므로 Session.live(Editor 전용이 아닌 AppState 루트 하위) 위치를 가진다. 자세한 내용은 D-014 참조.

---

# D-004

## PresenterState(Session)는 저장하지 않는다

### 결정

PresenterState는 런타임 전용 상태이다.

저장 대상이 아니다.

### 이유

프로그램을 다시 열었을 때

```text
현재 선택 페이지
현재 송출 페이지
```

를 복원할 필요가 없다.

이 상태는 행사 진행 중에만 의미가 있다.

### 결과

Page, Presentation은 저장한다.

PresenterState는 저장하지 않는다.

저장 대상:

* presentation.title
* presentation.pages (Phase 2 이후: pageIds / pageMap / elementMap)

저장 제외:

* selectedPageId
* livePageId

앱 시작 시 항상 동일한 초기 상태로 시작한다.

```text
selectedPageId = null
livePageId = null
```

(2026-06 Amendment: "PresenterState"는 D-014에 의해 "Session"으로 명칭이 통합되었다. 본 결정의 저장 제외 원칙은 Session 전체로 확장 적용된다. D-013은 본 결정에 통합되어 폐기되었다.)

---

# D-005

## Renderer는 DOM + CSS를 사용한다

### 결정

Canvas Renderer를 사용하지 않는다.

DOM + CSS Renderer를 사용한다.

### 이유

현재 프로젝트의 핵심은

* 텍스트 표시
* 스타일 적용
* 정렬

이다.

DOM/CSS가 구현 난이도와 유지보수 측면에서 유리하다.

### 결과

PageView는 HTMLElement를 반환한다.

```js
createPageView(page)
```

---

# D-006

## AppStore는 Single Source of Truth 이다

### 결정

상태 변경은 AppStore를 통해서만 수행한다.

### 이유

상태가 여러 곳에서 변경되면
예측하기 어려워진다.

### 결과

허용:

```js
dispatch(...)
```

금지:

```js
state.xxx = ...
```

직접 수정

---

# D-007

## Derived Data는 저장하지 않는다

### 결정

계산 가능한 데이터는 Store에 저장하지 않는다.

### 이유

동일한 정보가 여러 곳에 존재하면
동기화 문제가 발생한다.

### 결과

예시:

```js
getLivePage()
```

는 계산 함수이다.

state에 livePage 객체를 저장하지 않는다.

---

# D-008

## Edit Mode 와 Live Mode 를 분리한다

### 결정

Edit Mode와 Live Mode는 서로 다른 동작을 가진다.

### 이유

실수로 송출되는 상황을 방지하기 위함이다.

### 결과

Edit Mode:

```text
클릭
↓
SELECT_PAGE
```

Live Mode:

```text
클릭
↓
SELECT_PAGE
↓
GO_LIVE
```

---

# D-009

## TC-Presenter는 실시간 편집기가 아니다

### 결정

실시간 편집보다 안정적인 송출을 우선한다.

### 이유

실제 행사 환경에서는

99%

준비된 데이터를 송출한다.

실시간 수정은 예외 상황이다.

### 결과

우선순위:

1. 안정적 송출
2. 빠른 조작
3. 편집 기능 강화

---

# D-010

## MVP에서는 Drag & Drop을 우선하지 않는다

### 결정

Drag & Drop은 MVP 필수 기능이 아니다.

### 이유

실제 사용 빈도보다

수정 / 삭제 / 저장 기능의 우선순위가 높다.

### 결과

우선 구현:

* Page 수정
* Page 삭제
* localStorage 저장

후순위:

* Drag & Drop
* 고급 편집 기능
* 출력 확장 기능

---

# D-011

## CLEAR_SELECTION은 독립 Action이다

### 결정

선택 해제는 CLEAR_SELECTION action을 사용한다.

SELECT_PAGE(null) 방식은 사용하지 않는다.

### 이유

SELECT_PAGE와 CLEAR_SELECTION은 의미가 다르다.

* SELECT_PAGE: 특정 Page로 이동
* CLEAR_SELECTION: 선택 상태 종료

Action 이름이 의도를 표현해야 한다.

### 결과

대칭 구조 유지:

SELECT_PAGE ↔ CLEAR_SELECTION

GO_LIVE ↔ CLEAR_LIVE

---

# D-012

## 새 Page 진입 시 Editor를 초기화한다

### 결정

새 Page 버튼을 통해 추가 모드로 진입할 때 Editor 입력 영역과 스타일 값을 초기화한다.

삭제된 Page가 selected 상태였을 경우도 동일하게 적용한다.

### 이유

사용자가 "새 Page"를 누르는 것은 새 작업의 시작을 의미한다.

이전 수정 내용이 남아 있으면 혼란을 준다.

### 결과

새 Page 진입 시:

* textarea 초기화
* horizontalAlign 기본값 적용
* verticalAlign 기본값 적용
* fontSize 기본값 적용

삭제된 Page가 selected 상태였을 경우도 동일하게 추가 모드로 복귀한다.

---

# D-013 (폐기 — D-004에 통합됨)

## PresenterState는 저장하지 않는다

본 결정은 D-004와 중복 기재되어 있었다. 구체적인 저장 대상/제외 목록은 D-004로 이동했다.

상세 내용은 D-004를 참조한다.

---

# Editor Architecture

Editor의 책임 경계, Session 구조, Selection 소유권에 대한 전체 규칙은 `Editor Architecture.md`를 단일 출처로 한다.

본 문서에는 핵심 결정의 근거만 요약한다.

## E-001 Editor Responsibility

Editor는 Domain 객체를 생성하거나 소유하지 않는다. Editor의 책임은 사용자 편집 의도를 수집하여 Application Layer로 전달하는 것이다.

## E-003 UI State Ownership

Editor는 UI/Session State를 관리한다. Presentation, Page, Element 상태는 AppStore가 소유한다.

## E-004 Selection Ownership (D-014로 갱신됨)

Selection은 Session.selection 하위에 위치하며 Domain에 저장하지 않는다. 단, Session 자체를 "Editor 소유"로 한정하지 않는다 — D-014 참조.

세부 규칙(E-002 Element Independence 포함)은 `Editor Architecture.md`를 확인한다.

---

# Command Architecture

Command의 책임 경계, Payload 규칙, Command Lifecycle에 대한 전체 규칙은 `Command Architecture.md`를 단일 출처로 한다.

본 문서에는 핵심 결정의 근거만 요약한다.

## C-001 Intent Based Commands

Command는 사용자 편집 의도를 표현한다. 단순 Property 변경보다 사용자 작업을 나타내야 한다.

## C-002 Store Mediated Changes

Command는 Domain을 직접 수정하지 않는다. 모든 상태 변경은 AppStore를 통해 수행한다.

세부 규칙(C-003~C-006 포함)은 `Command Architecture.md`를 확인한다.

---

# Phase 2 Decisions

## Presentation 최소화

Decision:
Presentation은 id, title, pageIds만 가진다.

Reason:
Presenter는 문서 편집기보다 송출 중심 프로그램이다.
문서 전체 설정과 UI 상태를 Presentation에 넣지 않는다.

---

## Page 기본 텍스트 스타일

Decision:
Page는 defaultTextStyle을 가진다.

Reason:
송출 화면의 일관된 디자인을 유지하면서,
필요한 경우 TextElement가 styleOverride로 일부만 변경할 수 있도록 한다.

---

## Element 역참조 금지

Decision:
Element.pageId는 두지 않는다.

Reason:
Page.elementIds와 elementMap만으로 충분하다.
역참조를 제거하여 SSOT와 최소 수정 책임을 유지한다.

---

## z-order 정책

Decision:
Page.elementIds 순서가 곧 z-order이다.

Reason:
별도 zIndex 필드를 제거하여 렌더링과 Undo를 단순화한다.

---

## Live State 정책

Decision:
livePageId는 단일 PageId를 가진다.

Reason:
현재 송출 중인 페이지의 SSOT를 하나로 유지한다.
여러 Output은 livePageId를 구독하여 각자의 방식으로 렌더링한다.
Preview, LED, OBS, NDI는 Renderer만 다르다.

---

## Selection과 Live 분리

Decision:
selectedPageId와 livePageId는 독립적으로 관리한다.

Reason:
운영자는 다음 페이지를 편집하거나 미리보기 하면서,
현재 송출 중인 페이지를 유지할 수 있어야 한다.

---

## RenderRequest

Decision:
Mutation과 Renderer 사이에 RenderRequest 계층을 둔다.

Reason:
RenderRequest는 Dirty Tracking, Debounce, RAF, Partial Render,
Render Merge 등의 최적화를 위한 완충 계층(Buffer Layer)이다.
필요하지 않으면 제거 가능하지만, 나중에 추가하는 비용이 더 크다.

---

# D-014

## PresenterState를 폐지하고 Session으로 통합한다

### 결정

PresenterState라는 별도 개념을 제거한다.

selectedPageId, livePageId를 포함한 런타임 상태는 Session 하위로 통합한다.

```text
AppState
├─ Presentation
├─ AssetRegistry
└─ Session
    ├─ selection
    │   ├─ selectedPageId
    │   └─ selectedElementIds
    ├─ live
    │   └─ livePageId
    ├─ clipboard
    ├─ textEditing
    ├─ interaction
    └─ persistence
```

### 이유

같은 개념을 PresenterState(Architecture.md, Vocabulary.md, AppStoreArchitecture.md)와 Session(Editor Architecture.md, InteractionArchitecture.md)이라는 두 이름으로 부르고 있어 혼란을 유발했다. 하나만 남긴다.

### 결과

Session은 Editor의 전유물이 아니다.

Editor가 Session의 selection / clipboard / textEditing / interaction을 주로 변경(mutate)하지만, Output처럼 Editor가 아닌 레이어도 `Session.live.livePageId`를 구독할 수 있다.

Session은 AppState의 최상위 루트 중 하나이며 Editor 하위 개념이 아니다.

영향 받는 문서: Architecture.md, Vocabulary.md, AppStoreArchitecture.md, Conventions.md, Editor Architecture.md, SelectionArchitecture.md, D-003 / D-004(Amendment 반영됨).

---

# D-015

## PersistenceState는 CommandBus/AppStore 경로를 거치지 않는다

### 결정

PersistenceState(isDirty, isSaving, lastSavedAt 등)는 Persistence 계층 내부 상태로 유지하거나, 별도의 PersistenceStatusStore로 분리한다.

CommandBus → AppStore Mutation 경로를 통해 갱신하지 않는다.

### 이유

PersistenceState 갱신이 일반 Mutation과 동일한 경로(CommandBus→AppStore→Subscriber 통지)를 타면, PersistenceSubscriber가 자신이 유발한 변경에 다시 반응하는 재진입 위험이 생긴다.

"Persistence가 Store를 수정해서는 안 된다"는 기존 PersistenceArchitecture.md 원칙과도 합치한다.

### 결과

PersistenceState는 문서 구조상 Session.persistence 위치에 표기하되, 실제 갱신은 Persistence 모듈이 보유한 로컬 상태(또는 별도 Store)가 출처이며, UI로의 전달은 CommandBus를 거치지 않는 별도 알림 채널(콜백/이벤트)을 사용한다.

영향 받는 문서: PersistenceArchitecture.md, SerializationArchitecture.md.

---

# D-016

## Serializer 정의는 SerializationArchitecture.md를 단일 출처로 한다

### 결정

Serializer의 책임 / 비책임 전체 정의는 SerializationArchitecture.md에만 둔다.

PersistenceArchitecture.md는 Serializer를 외부 컴포넌트로 1줄 참조만 한다.

```text
Persistence (Consumer)
    ↓ uses
Serializer (독립 Boundary, 정의는 SerializationArchitecture.md)
    ↓
Snapshot
```

### 이유

같은 목적 / 책임 / 비책임 문장이 PersistenceArchitecture.md와 SerializationArchitecture.md 두 곳에 거의 동일하게 중복돼 있어, 한쪽만 갱신되면 드리프트가 재발하기 쉽다.

### 결과

영향 받는 문서: PersistenceArchitecture.md(`# Serializer` 섹션 삭제 후 참조로 교체).

---

# D-017

## 상태 변경 통지는 Mutation 기반 타겟 통지로 단일화한다

### 결정

storeChanged 단일 이벤트 브로드캐스트 방식은 폐기한다.

모든 Subscriber 통지는 StateMutationArchitecture.md / SubscriberArchitecture.md가 정의한 Mutation 타입 기반 타겟 통지(`interestedMutations`)를 따른다.

### 이유

AppStoreArchitecture.md(Subscriber Model), PersistenceArchitecture.md(Persistence Workflow), OutputArchitecture.md(Subscription Model)가 여전히 storeChanged 단일 이벤트를 전제로 작성되어 있어, "stateChanged 방식의 전체 재통지는 사용하지 않는다"고 명시한 StateMutationArchitecture.md와 충돌했다.

### 결과

영향 받는 문서: AppStoreArchitecture.md, PersistenceArchitecture.md, OutputArchitecture.md.

---

# D-018

## HistoryManager는 CommandBus의 Hook으로 동작하며 AppStore 이후에 관찰한다

### 결정

일반 Command 흐름은 `Editor → CommandBus → AppStore`로 직행한다.

HistoryManager는 CommandBus의 beforeExecute / afterExecute Hook으로 Mutation을 관찰해 History Entry를 기록하고, Undo/Redo 시에만 `HistoryManager → CommandBus → AppStore`로 역방향 Command를 주입한다.

HistoryManager가 모든 Command의 필수 경유 단계가 되는 구조는 폐기한다.

### 이유

AppStoreArchitecture.md의 "History Boundary"가 `CommandBus → HistoryManager → AppStore`로 그려져 있어, HistoryArchitecture.md / CommandBusArchitecture.md가 정의한 Hook 기반 모델 및 "AppStore와 HistoryManager는 서로의 존재를 모른다"는 독립성 원칙과 충돌했다.

### 결과

영향 받는 문서: AppStoreArchitecture.md("History Boundary" 섹션 전체 재작성).

# D-019

## Media Command는 비동기 Preload를 거치며, 이로 인해 CommandBus.execute()는 직렬 실행 큐를 가진 async 함수로, HistoryManager.undo()/redo()는 async 함수로 전환된다

### 결정

ADD_PAGE / UPDATE_PAGE / INSERT_PAGE_AT(Undo가 주입하는 Command 포함)는 mediaId가 있을 경우 dispatch() 이전에 MediaStore(IndexedDB)에서 Blob을 조회해 MediaRuntimeCache(mediaId -> blob URL, 메모리 전용)를 채우는 과정을 거친다. 이 Preload는 View가 아니라 CommandBus.execute() 내부(Command Handler 경로)에서만 일어난다.

이로 인해 CommandBus.execute()는 async 함수가 된다. 외부 호출 계약(`execute(command)`를 호출하고 끝내는 fire-and-forget 패턴)은 그대로 유지하되, 내부적으로 모든 호출을 단일 Promise 큐에 순차 체이닝하여 "호출 순서 = dispatch 순서"를 강제한다.

HistoryManager.undo() / redo()도 async 함수로 전환한다. commandBusExecute(entry.undoCommand)가 반환하는 Promise를 await한 뒤에야 isApplyingHistory 플래그를 해제한다.

View(PageView.js)는 이 결정과 무관하게 순수 동기 함수로 유지된다. Preload가 끝난 뒤 MediaRuntimeCache에 동기로 채워진 blob URL만 조회한다.

### 이유

View를 비동기로 만들지 않기 위해, media -> blob URL 변환을 Command 단계로 옮기기로 합의했다(2026-06-27). 그런데 이 변경이 두 가지 잠재 결함을 만들었고, 둘 다 fake-indexeddb 기반 테스트로 실제 재현 후 확정했다.

1. 순서 역전: execute()가 async가 되면서, media가 있는 Command(IndexedDB 조회로 한 틱 이상 지연)와 media가 없는 Command(즉시 완료)를 fire-and-forget으로 연속 호출하면, 늦게 호출한 media 없는 Command가 먼저 dispatch될 수 있었다. 직렬 실행 큐로 호출 순서와 dispatch 순서를 강제 일치시켜 해결했다.
2. 재귀 기록 방지 무력화: HistoryManager.undo()가 sync 함수일 때는 commandBusExecute(...)가 반환한 Promise를 기다리지 않고 isApplyingHistory를 즉시 해제했다. 그러면 media Command의 실제 dispatch(및 afterExecute 호출)가 이미 플래그가 풀린 시점에 일어나, History 재귀 기록 방지가 무력화될 수 있었다. computeInverse에 INSERT_PAGE_AT 케이스가 없어 지금까지는 결과적으로 안전했을 뿐이며, 그 케이스가 추가되는 순간 실제로 터지는 잠재 결함이었다(테스트에서 일부러 케이스를 추가해 재현 후 확인). undo()/redo()를 async로 바꾸고 await로 완료를 기다린 뒤 플래그를 해제하도록 고쳐 해결했다.

### 결과

영향 받는 파일: command/CommandBus.js(execute 직렬 큐 + preloadMedia, MEDIA_COMMANDS whitelist 추가), history/HistoryManager.js(undo/redo async 전환), media/MediaStore.js(신규, IndexedDB wrapper, GC 미구현 — Phase 2로 미룸), media/MediaRuntimeCache.js(신규, mediaId -> blob URL 런타임 캐시, 쓰기는 CommandBus만 수행).

영향 받는 문서: CommandBusArchitecture.md, HistoryArchitecture.md(둘 다 "현재는 완전 동기"로 서술된 부분이 있다면 이번 결정으로 갱신 필요 — 다음 문서 정리 세션에서 반영).

기존 호출부(index.html, ui/CueList.js)는 수정하지 않았다. execute()와 undo()/redo()를 fire-and-forget으로 호출하던 기존 코드는 그대로 동작한다.


# D-020

## 새로고침으로 복원된 Page의 media는 CommandBus.bootstrapMediaCache()로 별도 채운다 (사용자 Command와 앱 부트스트랩 책임 분리)

### 결정

CommandBus.execute()의 MEDIA_COMMANDS whitelist(ADD_PAGE/UPDATE_PAGE/INSERT_PAGE_AT)는 "사용자 Command 경로"만 커버한다. localStorage에서 복원되는 Page(store/AppStore.js 모듈 로드 시점에 state.presentation.pages로 직접 들어가는 부트스트랩 경로)는 이 whitelist를 거치지 않으므로 별도로 처리한다.

command/CommandBus.js에 bootstrapMediaCache(pages) 함수를 신규로 export한다. 내부적으로 기존 preloadMedia()를 그대로 재사용해 인자로 받은 Page 배열 전체의 media를 MediaRuntimeCache에 채운다. dispatch나 History 기록은 하지 않는다.

index.html은 초기화를 두 단계로 명시적으로 분리한다: (1) 모든 이벤트 핸들러(가사 추가/미디어 추가/Undo·Redo/저장/삭제 등) 등록은 동기로 즉시 끝낸다. (2) UI 생성(CueList/PreviewPanel/BroadcastOutput)은 별도 async 함수 initUI() 안에서 await bootstrapMediaCache(...) 완료 이후에만 이어진다. initUI() 호출 자체는 모든 핸들러 등록이 끝난 뒤, 스크립트 맨 끝에서 이루어진다.

### 이유

실사용 중 "이전 세션에 추가한 image Page를 클릭하면 Preview에서 '미디어를 찾을 수 없음'이 뜬다(새로 추가한 Page는 정상)"는 버그가 보고됐다. 처음에는 fake-indexeddb/jsdom 시뮬레이션으로 재현을 시도했으나 재현되지 않았고, 실제 브라우저에 임시 디버그 로그를 심어 콘솔 출력을 직접 확인한 끝에 원인을 확정했다.

원인: store/AppStore.js의 state.presentation 초기값은 모듈 로드 시점에 loadPresentation()(localStorage)으로 직접 채워진다. 이 경로는 CommandBus.execute()를 전혀 거치지 않으므로, 거기 담긴 image/video Page의 mediaId는 preloadMedia()가 한 번도 호출되지 않은 채로 남는다. 이후 그 Page를 클릭(SELECT_PAGE)해도 SELECT_PAGE는 MEDIA_COMMANDS에 없는 Command라 캐시를 채우지 않으므로, MediaRuntimeCache.peek()이 영구히 null을 반환한다.

새로 추가한 Page가 정상이었던 이유는 ADD_PAGE가 MEDIA_COMMANDS에 포함되어 preloadMedia()를 정상적으로 거치기 때문이다 — 즉 버그는 "media resolve 로직 자체"가 아니라 "그 로직을 타지 않는 경로(부트스트랩)가 따로 있었다"는 데 있었다.

처음 시도한 await 기반 해법(index.html 초기화 블록 전체를 await bootstrapMediaCache(...) 뒤에 순차 배치)은 부작용이 있었다 — 그 아래에 위치한 모든 버튼 이벤트 리스너 등록이 IndexedDB 조회가 끝날 때까지 지연되어, 부트스트랩이 느리면 앱이 일시적으로 먹통처럼 보일 수 있었다.

두 번째 시도로 fire-and-forget(스크립트 최상단에서 await 없이 호출)으로 바꿔 이 문제를 피했으나, 이는 PresenterState(selectedPageId/livePageId)가 항상 초기값 null로 시작한다는 사실에 기댄 "레이스에 의존하는" 설계라는 지적(GPT 리뷰)을 받았다 — 동작은 우연히 맞아떨어지지만 견고한 구조는 아니라는 판단에 동의해, 최종적으로 "이벤트 핸들러 등록"과 "UI 생성"을 initUI()라는 명시적 async 함수로 분리하는 구조로 재수정했다. bootstrapMediaCache()의 완료는 UI 생성만 지연시키고 핸들러 등록에는 전혀 영향을 주지 않으므로, await 기반 해법의 부작용 없이도 초기화 순서를 레이스가 아니라 코드 구조로 보장한다.

### 결과

영향 받는 파일: command/CommandBus.js(bootstrapMediaCache 신규 export, preloadMedia 재사용), index.html(핸들러 등록/UI 생성 순서를 initUI() async 함수로 명시적 분리).

영향 받지 않는 파일: ui/PreviewPanel.js, ui/CueList.js, output/BroadcastOutput.js, output.html — 모두 D-019에서 만든 경로를 그대로 사용하며, 이번 결정으로 수정되지 않았다.

디버깅 과정에서 ui/PreviewPanel.js, ui/CueList.js, index.html, output/BroadcastOutput.js, command/CommandBus.js에 심었던 임시 console.log('[DEBUG-N] ...') 13곳은 원인 확정 후 전부 제거했다.

영향 받는 문서: CurrentState.md 섹션 9-2(원인 재정정), CommandBusArchitecture.md(다음 문서 정리 세션에서 bootstrapMediaCache 반영 필요).

# D-021

## Song → Section 재가져오기(pull) 모델과 Section 단위 스타일 기본값

### 결정

Song(Library Aggregate, 향후 도입 예정)을 Flow에 배치한 결과는 Section
하나로 귀속된다. 다음 다섯 가지를 확정한다.

1. Section에 `sourceSongId`(nullable) 필드를 추가한다. Song에서 가져와
   만든 Section만 이 값을 가진다.
2. Page는 자신이 어느 Song에서 왔는지 전혀 모른다 — 출처 추적은 오직
   Section만 담당한다.
3. "다시 가져오기"는 그 Section 소속 Page 전체를 삭제하고 Library의
   최신 내용으로 다시 생성하는 **전체 교체(Replace)**다. 필드 단위
   병합(merge)은 하지 않는다.
4. Library 콘텐츠가 바뀌었는지 자동으로 감지해서 배지를 띄우거나 버전을
   비교하는 기능은 만들지 않는다. 사용자가 필요할 때 직접 "다시
   가져오기"를 실행한다.
5. 사용자가 그 Section의 Page를 조금이라도 수정하면(텍스트, Page
   개수, 소속 변경 등 무엇이든) `Section.isModified`를 `true`로 표시해
   경고한다. 한 번 `true`가 되면 다시 `false`로 되돌리지 않는다.

추가로, 재가져오기 시 Page의 스타일 필드(`fontSize`/`color`/
`lineHeight`/`fontWeight`/`textStroke`/`textShadow`/`horizontalAlign`/
`verticalAlign`)가 기본값으로 초기화되는 문제를 피하기 위해, Section에
`pageStyleDefaults`를 두고 재가져오기 시 그 프로필을 새로 생성되는
Page들에 일괄 적용한다. 개별 Page의 스타일 오버라이드는 허용하되,
재가져오기하면 오버라이드는 사라진다(3번의 전체 교체 원칙과 일관).

### 이유

Page 단위로 출처(`songId`)와 필드별 로컬 수정 여부를 추적하는 정교한
모델(전파형 동기화 또는 필드 단위 병합)은 구현/유지보수 비용이 크고,
지금 프로젝트 규모(개인/소규모 교회, MVP)에는 과하다. Section은 이미
만들어진 그룹핑 단위이고, "Section 전체를 하나의 단위로 다루면" 문제가
훨씬 단순해진다 — Page가 출처를 몰라도 되고, 필드 단위 diff도 필요
없다. 자동 업데이트 감지도 실사용 빈도(가사 수정이 잦지 않음)를
고려하면 지금 당장 필요한 정교함이 아니다. `isModified`를 되돌리지
않는 것도 같은 이유 — "일부만 되돌리면 다시 안전한가"를 판단하는 로직
자체가 복잡도를 늘린다.

### 결과

아직 미구현이다 — Song Aggregate와 Library 자체가 미구현이므로, 이
Decision은 그 작업이 실제로 시작될 때 적용된다. `pageStyleDefaults`
(Section 단위 스타일 기본값)의 선행 구현 여부는 `D-022`에서 별도로
다룬다 — 결론은 "지금은 안 한다"이다.

관련 문서: `Research/2026-07-05 Library-Centric Workflow.md`(Open
Questions 중 "같은 Asset을 여러 Presentation이 참조하는 상태에서 변경이
전파돼야 하는가"를 이 Decision으로 해소), `TODO.md`의 "Asset/Song 관계
재검토".

# D-022

## MVP에서는 스타일을 Page 단위로 둔다 — Section Style 승격은 지금 하지 않는다

### 결정

스타일 필드(`fontSize`/`color`/`lineHeight`/`fontWeight`/`textStroke`/
`textShadow`/`horizontalAlign`/`verticalAlign`)는 지금처럼 `Page` 단위에
그대로 둔다. `D-021`이 언급했던 `Section.pageStyleDefaults`(재가져오기
시 스타일이 초기화되는 문제를 막기 위한 Section 단위 스타일 기본값)는
지금 구현하지 않는다.

### 이유

- 아직 존재하지 않는 두 기능(Song 재가져오기, Section 단위 스타일)의
  교차점을 미리 설계하는 건 시기상조다 — 재가져오기 자체가 Song
  Aggregate/Library 착수 전에는 존재하지 않는다.
- 실사용 패턴(Section 전체를 한 번에 바꾸는 경우가 대부분인지, 특정
  Page만 자주 따로 바꾸는지, 스타일 속성이 앞으로 얼마나 늘어나는지,
  재가져오기가 정말 필요한 기능으로 판명될지)을 지금은 알 수 없다 —
  이 데이터 없이 Section Style을 만들면 예측에 기반한 설계가 된다.
- YAGNI: 지금 필요한 건 스타일 기능이 동작하는 것이고, 그건 이미
  Page 단위로 완성돼 있다(사이드바 편집 UI + `UPDATE_PAGE`로 저장,
  Step 초기 세션부터 존재 — `CurrentState.md` 참조). 재가져오기와
  스타일 보존은 그 기능이 실제로 필요해지는 시점에 다시 설계해도
  충분하다.

### Future Review

Song 재가져오기(Section 전체 Replace, `D-021`) 기능을 실제로 설계할 때
반드시 다시 검토한다.

- 실사용 패턴상 Section 단위 일괄 변경이 대부분이면 `Section.style` +
  `Page.override` 구조(`D-021`이 제안했던 형태)를 그때 도입한다.
- 이 재검토가 `D-021`의 `pageStyleDefaults` 선행 구현 권고를 대체한다.

### 결과

새로 구현할 코드는 없다 — 이미 있는 Page 단위 스타일 시스템을 그대로
유지하기로 확정하는 결정이다. `domain/Section.js`에 스타일 관련 필드를
추가하지 않는다. `TODO.md`의 관련 항목을 이 Decision을 참조하도록
정리한다.

# D-023

## 스타일 프리셋은 생산성 기능이지 데이터 모델이 아니다 — 값 복사(Copy)이며 참조(Link)가 아니다

### 결정

"스타일"(이름 붙은 서식 묶음, 예: "찬양 기본"/"설교 자막")을 도입할 때
다음 네 원칙을 지킨다.

1. `Page`는 서식 값(`fontSize`/`color`/`lineHeight`/`fontWeight`/
   `textStroke`/`textShadow`/`horizontalAlign`/`verticalAlign`)을
   직접 소유한다(`D-022` 그대로).
2. 스타일(프리셋)은 서식 값을 빠르게 입력하기 위한 **템플릿**이다.
3. 스타일 적용은 **값 복사(Copy)**이며 **참조(Link)가 아니다.**
4. 적용 이후에는 스타일과 Page 사이에 어떠한 연결도 유지하지 않는다.

즉 데이터 흐름은 아래에서 끝난다 — 이 이상으로 확장하지 않는다.

```
사용자 → 스타일 선택 → 값 복사 → Page
```

다음과 같은 참조 관계(`Page.styleId → Style`)는 **만들지 않는다.**

```
Page
  │
styleId
  │
Style
```

### Non-goal (MVP)

- 스타일과 Page의 실시간 연결(Link) 지원 안 함.
- 스타일 변경 시 기존에 적용됐던 Page를 일괄 업데이트하는 기능 지원
  안 함.
- Page가 어떤 스타일에서 생성됐는지 추적하지 않음(`Page.styleId` 같은
  필드를 두지 않는다).

### 이유

Page 단위로 값을 직접 소유하게 한 `D-022`의 취지를 스타일 프리셋이
훼손하지 않게 하기 위함이다. 참조 관계를 허용하는 순간 `D-021`이
Song에 대해 이미 겪었던 질문들이 스타일에서도 그대로 재발한다 —
"프리셋을 수정하면 기존 Page도 바뀌나요?", "이 Page가 어떤 스타일에서
왔나요?", "스타일 이름을 바꾸면?" 같은 것들. 값 복사 한 번으로
관계를 완전히 끊어버리면 이 질문들 자체가 성립하지 않는다.

`D-021`(Song 가져오기/재가져오기), `D-022`(Page가 서식 값을 소유),
스타일 프리셋(Page에 값을 복사하는 편의 기능) 세 가지는 이 결정으로
서로 완전히 독립적인 개념이 된다.

### 결과

프리셋의 구체적인 저장 위치(이 프로젝트 안 `localStorage`인지, 향후
Library로 옮길지), 적용 대상 범위(선택된 Page 하나/여러 개 선택 후
일괄/Section 전체 한 번에)는 이 Decision의 범위 밖이다 — 위 네 원칙과
Non-goal만 지키면 되고, 세부 UI/저장 방식은 구현 착수 시 정한다.

영향 받는 파일: 아직 없음(구현 전).

# D-024

## Style Preset Apply Scope — MVP에서는 현재 선택된 Page 하나만 적용한다

### 결정

스타일 프리셋 적용 대상은 MVP에서 **현재 선택된 Page 하나**로 제한한다.

### Non-goal (MVP)

- 다중 선택 Page 적용
- Section 전체 적용
- Presentation 전체 적용

### 이유

현재 선택 모델(`PresenterState.selectedPageId`)은 단일 선택 기반이다.
다중 선택은 프리셋 기능이 아니라 선택 모델(UI/State) 자체의 확장이며,
프리셋 기능만 구현하려고 선택 시스템까지 변경하는 것은 범위를
벗어난다. 필요성이 실사용으로 확인되면 이후 별도 Decision/TODO로
선택 모델을 확장한다 — 이 Decision은 그 확장을 막지 않는다(프리셋
설계 자체는 적용 대상 범위와 독립적이므로, 나중에 다중 선택이
추가되어도 프리셋 쪽을 다시 설계할 필요는 없다).

### 결과

`getSelectedPage()`(이미 존재)로 적용 대상을 얻는다. 새로운 선택
상태나 UI를 추가하지 않는다.

# D-025

## Style Preset Storage — Presentation이 아닌 AppSettings(LocalStorage)에 저장한다

### 결정

스타일 프리셋은 `Presentation`이 아니라 별도의 `AppSettings`에
저장한다.

```
AppSettings {
    version: 1,
    stylePresets: StylePreset[]
}

StylePreset {
    id, name,
    fontSize, color, lineHeight, fontWeight,
    textStroke, textShadow, horizontalAlign, verticalAlign
}
```

### 이유

- 스타일 프리셋은 하나의 Presentation(행사)에 종속되지 않고 여러
  예배/행사에 걸쳐 재사용된다("이번 주만"이 아니라 "우리 교회
  템플릿"에 가깝다) — `Presentation` 생명주기와 분리해야 한다.
- `persistence/StorageAdapter.js`의 `save(key, value)`/`load(key)`가
  이미 key를 인자로 받는 범용 구조라, 새 key(`tc-presenter-app-settings`)
  하나만 쓰면 되고 이 레이어는 변경할 필요가 없다.
- `version` 필드를 처음부터 포함한다 — `Schema.js`의 v1→v2
  마이그레이션(D-Editor-4) 때 겪었던 것과 같은 문제(버전 없이 저장했다가
  나중에 구조 바꿀 때 마이그레이션 경로가 없는 문제)를 애초에 피한다.

### 결과

`Presentation`/`Schema.js`는 건드리지 않는다. `AppSettings` 전용의
작은 저장/로드 모듈을 새로 만든다(`Schema.js`의 `migrateSnapshot`/
`withSchemaVersion` 패턴을 그대로 재사용). 초기 상태에는 시스템
기본 프리셋 2개("찬양 기본", "설교 자막")를 시드로 제공한다.

# D-026

## Song Aggregate — MVP 범위는 "가사 저장"만, 메타데이터는 확장 항목으로 미룬다

### 결정

Song Aggregate는 MVP에서 다음 필드만 가진다.

```ts
Song {
  id: string
  title: string
  lyrics: LyricBlock[]
  tags: string[]
}

LyricBlock {
  id: string
  label: string   // 예: "Verse 1", "Chorus"
  text: string
}
```

`author`/`composer`/`ccli` 같은 메타데이터 필드는 지금 넣지 않는다.

Song은 Presentation을 알지 못한다 — `LyricBlock`에 `sectionId`나
스타일 필드(`fontSize` 등)를 두지 않는다. 이는 `D-021` 규칙 2("Page는
자신이 어느 Song에서 왔는지 모른다")와 대칭 원칙이다. 스타일은 이미
`D-022`로 Page가 직접 소유하는 것으로 확정돼 있고, Song이 스타일을
들고 있으면 재가져오기 시 어느 쪽 스타일이 우선하는지가 애매해져
`D-021`의 "전체 Replace" 원칙과 충돌한다.

기본 순서는 별도 필드 없이 `lyrics` 배열의 순서 자체가 SSOT다
(`Presentation.sectionIds`와 같은 패턴).

### 이유

`author`/`composer`/`ccli`는 분명 필요한 정보지만, 지금 프로젝트에
이 값을 실제로 쓰는 기능이 하나도 없다 — 검색하지 않고, 화면에
표시하지 않고, 송출하지 않고, 재가져오기(`D-021`)에도 영향을 주지
않는다. 즉 "저장만 하고 사용하지 않는 데이터"다. 나중에 CCLI 표기나
저작권 관리 기능을 실제로 만들 때 필드를 추가해도 이미 존재하는
`lyrics`/`title`/`tags` 구조를 깨지 않으므로, 지금 선제적으로 넣어둘
이유가 없다(YAGNI, `D-022`/`D-023`과 같은 정신).

### 결과

`domain/Song.js`가 이 필드만으로 구현된다. `author`/`composer`/`ccli`
확장은 실제 필요가 생기면 별도 Decision(D-026 이후 번호)으로 다룬다 —
이 Decision이 그 확장 자체를 막지는 않는다(추가 전용 변경이라
Aggregate 구조가 깨지지 않는다).

관련 문서: `TODO.md`의 "Asset/Song 관계 재검토", `D-021`(Song →
Section 재가져오기 모델, 이 Decision은 그 위에 얹히며 재가져오기
정책 자체는 건드리지 않는다).

# D-027

## Song은 Asset이 아니라 별도 Aggregate다 — Library는 UI에서만 하나로 묶는다

### 결정

`Song`과 `Asset`(Media — image/video/audio)은 완전히 독립된 도메인
모델로 유지한다. 서로 참조하지 않고, 공통 상위 타입을 두지 않는다.

```text
Library (UI 개념 — 탭으로만 묶음)
 ├── Song   → SongStore
 └── Media  → MediaStore
```

`SongStore`와 `MediaStore`는 서로의 존재를 모른다.

### 이유

`AssetArchitecture.md`의 Asset은 본질적으로 **바이너리 리소스**를
다루는 Registry(`source`/`status`/`blob` 중심 — loading/ready/failed
같은 런타임 상태를 가짐)다. Song은 바이너리가 아니라 **구조화된
텍스트 데이터**(가사 블록 + 메타데이터)라 필드 shape 자체가 다르다.
억지로 같은 타입에 넣으면(`Asset.type: 'song'`) Asset의 "외부 리소스
최소 수정 책임"이라는 목적과 맞지 않게 된다.

`D-023`(스타일 프리셋)도 같은 결로 갔다 — 서로 다른 개념 사이에
억지로 참조 관계를 만들지 않는다는 원칙을 여기서도 재사용한다.

실무적으로도 저장 방식이 다르다 — Song은 텍스트라 `localStorage`로
충분하지만(`AppSettingsStore.js`와 같은 패턴), Media는 Blob이라
IndexedDB(`MediaStore.js`)가 필요하다. 하나로 묶으면 나중에 다시
쪼개야 할 가능성이 크다.

### 결과

`domain/Song.js` + `store/SongStore.js`(신규, `AppSettingsStore.js`
패턴 재사용, 별도 storage key)로 Song을 구현한다. Media Library UI는
이 작업 범위 밖 — TODO.md에 별도 항목으로 남긴다.

관련 문서: `TODO.md`의 "Asset/Song 관계 재검토"(이 Decision으로
해소), `AssetArchitecture.md`.

# D-028

## 테스트 인프라 도입 — node:test 기반 회귀 테스트 체계 구축

### 결정

지금까지 세션마다 임시로 작성하고 검증 후 삭제하던 Node 스크립트
방식을, 소스에 co-locate된 회귀 테스트 파일로 전환한다.

- 러너: Node 내장 `node:test` + `assert/strict`. 별도 테스트
  프레임워크(Jest/Vitest)는 도입하지 않는다.
- `package.json` 최소 신규 도입:
  `{ "type": "module", "scripts": { "test": "node --test" },
  "devDependencies": { "fake-indexeddb": "..." } }` 수준. 빌드
  스텝/번들러는 추가하지 않는다 — index.html/output.html은 여전히
  `<script type="module">`로 직접 로드되는 정적 파일 구조를
  유지한다.
- 배치: `tests/` 최상위 폴더를 신설하지 않고, 기존 폴더 구조
  (domain/store/command/history/media/persistence) 옆에
  `*.test.js`를 co-locate한다(예: `domain/Song.test.js`,
  `store/SongStore.test.js`).
- 자동화 대상은 DOM에 의존하지 않는 계층으로 한정한다: `domain/*`,
  `store/*`(SongStore/AppSettingsStore/MediaStore),
  `command/CommandBus.js`, `history/HistoryManager.js`,
  `persistence/*`. IndexedDB가 필요한 곳(MediaStore, CommandBus의
  media preload)만 `fake-indexeddb`를 사용한다.
- `ui/*.js`, `index.html`/`output.html`의 embedded script, 실제
  렌더링/클릭은 자동화 대상에서 제외하고 수동 검증으로 남긴다. 이를
  위해 `docs/ManualTestChecklist.md`를 신설해, 세션마다
  CurrentState.md에 흩어져 있던 "브라우저 실사용 테스트 필요" 항목을
  한 곳에 모아 TODO.md와 같은 방식(체크 후 세션 번호 연결)으로
  관리한다.

### 이유

CurrentState.md 전체에 걸쳐 반복된 패턴: 세션마다 Node 스크립트를 새로
작성해 검증하고, 검증이 끝나면 그 스크립트를 삭제한다(9-19, D-019/
D-020, 9-28, 9-29, 9-30 등 전 세션에서 동일). 이 방식은 그 세션 안에서는
유효하지만, 다음 세션이 같은 경로를 다시 건드릴 때 회귀를 잡아줄 게
남아있지 않다 — 실제로 D-019에서 발견된 "순서 역전"과 "재귀 기록 방지
무력화" 두 잠재 결함은 우연히 같은 세션 안에서 잡혔을 뿐, 만약 그
세션의 임시 스크립트가 이미 삭제된 뒤 다음 세션에서 `computeInverse()`에
`INSERT_PAGE_AT` 케이스가 추가됐다면 회귀로 재발했을 수 있었다.

특히 TODO.md에 남아있는 "Song CRUD/재가져오기의 Undo 지원"이 다음
후보로 거론되는데, 이 작업은 `HistoryManager.js`/`CommandBus.js`를
다시 건드리게 될 가능성이 높다 — 이 두 파일은 이미 한 번(D-019)
비동기 전환으로 인한 미묘한 타이밍 버그를 낸 이력이 있으므로, 다시
손대기 전에 지금 동작(직렬 큐, 재귀 방지 플래그, Undo/Redo 왕복)을
고정하는 회귀 테스트를 먼저 깔아두는 게 안전하다.

번들러/프레임워크를 새로 들이지 않는 이유는 이 프로젝트의 정적 파일
구조(빌드 스텝 없음)를 깨지 않기 위함이다 — `node --test`는 Node
18+ 기본 내장이라 추가 설치 없이 이 성격을 유지한다. `tests/` 폴더를
새로 만들지 않고 co-locate하는 이유는 이미 "폴더 = 책임 단위"
(domain/store/command/history 등)로 구조가 뚜렷하기 때문이다.

UI/렌더링 계층을 자동화 대상에서 제외하는 이유는, 9-2에서 실제로
발생한 버그 유형(`PreviewPanel.js`가 `media`를 하드코딩 `null`로
두고 연결을 빠뜨림)이 "로직은 맞는데 연결이 빠짐" 성격이라
domain/store 테스트로는 못 잡는 영역이기 때문이다 — 이 부분은 자동
테스트로 대체하지 않고 수동 체크리스트로 계속 관리한다.

### 결과

신규 파일: `package.json`(최소 구성), `docs/ManualTestChecklist.md`,
그리고 domain/store/command/history/persistence 계층별
`*.test.js` 파일들(첫 대상은 순차적으로 추가).

영향 받지 않는 파일: `index.html`, `output.html`, `ui/*.js`,
`view/*.js` — 이번 결정은 테스트 파일을 추가하는 것뿐이며 기존
프로덕션 코드는 한 글자도 수정하지 않는다. `reduce()`/Store/
Persistence/History 구조 자체도 무수정.

`.gitignore`에 `node_modules/` 추가 필요(신규).

이번 결정은 9-29/9-30에서 남아있는 "브라우저 실사용 테스트 필요"
부채를 해소하지 않는다 — 자동 테스트는 domain/store 로직만
커버하며, 그 부채는 `ManualTestChecklist.md`로 옮겨 별도로 추적한다.

관련 문서: `TODO.md`의 "테스트 인프라 도입" 항목(이 Decision으로
착수), `Research/AI Development Workflow.md`(Observation → Research
→ Decision → Implementation 원칙에 따라 스캐폴딩 전 이 Decision을
먼저 기록).

# D-029

## 문서 간 우선순위 판단 기준 — DocumentationHierarchy.md 채택

### 결정

`docs/DocumentationHierarchy.md`(2026-07-11 Draft로 커밋, `febfe7c`)를
문서 간 역할/우선순위 판단의 공식 기준으로 채택한다. 문서 Status
헤더를 "Draft / 제안(Decision 아님)"에서 "Confirmed by D-029"로
변경한다.

다만 이 채택은 균일하지 않다 — 실제로 검증된 부분과 아직 검증되지
않은 부분을 구분해서 채택한다.

**강제(검증됨)**:
1. `Decisions.md`(D-0XX)만 아키텍처 충돌 판단의 유일한 기준이다.
   `Research/*.md`는 위험 신호/배경 근거일 뿐 강제력이 없다(2026-07-11
   대화에서 이미 확정, `TODO.md` 필드 정의 절에 기록됨 — 이 Decision이
   그 확정을 `Decisions.md`로 승격하는 것이기도 하다).
2. 새 작업 착수 전 충돌 여부를 판단하는 순서는 항상 `Decisions.md`
   확인이 먼저다(`DocumentationHierarchy.md`의 "충돌 시 해석 순서"
   1단계).

**참고(구조는 유지하되 개별 검증 필요, 실사용으로 반박되기 전까지
잠정 채택)**:
3. `DocumentationHierarchy.md`의 Tier 1~5 분류(Architecture 계열/
   Vocabulary/Conventions/FutureDomain·FutureEditor/Research/TODO/
   CurrentState/ManualTestChecklist)와 "충돌 시 해석 순서" 2~5단계는
   그대로 유지한다 — 다만 이 부분들은 아직 실제 충돌 상황에서
   검증되지 않았다(아래 "이유" 참조). `*Architecture.md` 15개 파일
   개별 현재/Phase 2 여부, `Conventions.md`의 Tier 배치, `AI
   Development Workflow.md`의 "곁가지" 취급도 마찬가지로 구조는
   유지하되 잠정이다.

### 이유

2026-07-11 커밋(`febfe7c`) 이후 두 세션에서 이 초안의 판단 순서를
실제로 적용했다.

- **9-34(스타일 프리셋 업데이트/덮어쓰기)**: "착수 전
  `docs/DocumentationHierarchy.md`(Draft)의 판단 순서를 그대로
  적용했다 — Decision 충돌 여부만 `Decisions.md` 기준으로 확인했다"
  (`CurrentState.md` 9-34). `D-023` Non-goal과의 충돌 가능성을
  구조적으로 배제하고 착수, 마찰 없이 완료.
- **9-35(Transition)**: "착수 전 `Decisions.md`를 확인했으나
  Transition/애니메이션과 관련된 D-0XX는 없었다 — Decision 충돌
  없음. `docs/DocumentationHierarchy.md`(Draft)의 판단 순서를 그대로
  적용했고, 이번에도 마찰 없이 적용됐다"(`CurrentState.md` 9-35).

두 세션 모두 "강제(검증됨)" 두 항목(위 1, 2번)만 실제로 사용됐다 —
`Decisions.md`를 먼저 확인하고, 관련 Decision이 있으면 그 경계 안에서
범위를 좁히거나(9-34), 없으면 충돌 없음으로 판단하고 진행했다(9-35).
두 번 다 "수정·보완할 점을 찾지 못했다"(사용자 확인, 2026-07-11)는
점에서, 이 핵심 판단 순서를 잠정 상태로 계속 두는 것보다 확정하는
쪽이 낫다고 판단했다.

반면 Tier 1의 세부 분류, `FutureDomain.md`/`FutureEditor.md` 간
우선순위, "충돌 시 해석 순서"의 2~5단계는 이 두 세션 어디에서도
실제로 쓰이지 않았다(둘 다 Decision 확인 단계에서 판단이 끝났고,
Architecture 계열 문서나 Future*.md를 참조할 필요 자체가 없었다). 이
부분까지 같은 확신으로 "검증됨"이라고 말하는 건 근거를 부풀리는
것이다 — `DocumentationHierarchy.md`가 이미 "확인이 필요한 부분"
절에서 스스로 밝혔던 한계이기도 하다. 구조 자체(Tier 배치, 표)는
쓸모가 있으므로 폐기하지 않고, 검증 수준만 정직하게 구분해서
채택한다.

### Non-goal

- Tier 1의 개별 `*Architecture.md` 15개 파일이 "현재 구현과 일치"인지
  "Phase 2 목표"인지 지금 전수 조사하지 않는다 — 이 Decision의 범위가
  아니다.
- `Conventions.md`의 Tier 배치를 지금 재검토하지 않는다.
- "충돌 시 해석 순서" 2~5단계를 지금 추가로 검증하지 않는다 — 실제로
  그 단계가 필요한 충돌 상황이 생기면 그때 확인한다.

### 결과

`docs/DocumentationHierarchy.md`의 Status 헤더를 "Draft / 제안
(Decision 아님)"에서 "Confirmed by D-029(강제 항목은 위 1, 2번 —
나머지 Tier 구조는 잠정 채택, 아래 참조)"로 갱신한다. "확인이 필요한
부분" 절은 유지하되 "이 문서 자체를 Decisions.md로 승격할지" 항목만
이 Decision으로 해소됐다고 표시한다.

향후 Tier 1(Architecture 계열)이나 `FutureDomain.md`/`FutureEditor.md`
순서가 실제로 쓰이는 세션이 생기면, 그 세션의 `CurrentState.md`
기록에 "DocumentationHierarchy.md의 Tier N을 실제로 참조함"이라고
남겨 검증 사례를 계속 쌓는다 — 마찰이 발견되면 이 Decision을 개정한다.

관련 문서: `docs/DocumentationHierarchy.md`, `docs/TODO.md`의 필드
정의 절("Decision과 Research를 구분하는 기준"), `CurrentState.md`
9-34/9-35.

---

# D-030

## 데이터 내보내기/가져오기는 텍스트 데이터만, 단일 JSON, 전체 교체로 한다

### 결정

1. **범위 — 텍스트 데이터만 포함한다.** 내보내기 파일에는
   Presentation(title/pages/sectionIds/sectionMap) + Song 목록 +
   AppSettings(스타일 프리셋)를 담는다. **Media blob(IndexedDB)은
   포함하지 않는다.** PresenterState/appMode도 포함하지 않는다(D-004
   — 애초에 저장 대상이 아님).
2. **형식 — 자체 버전을 가진 단일 JSON 봉투(envelope).** 최상위에
   `format`(식별 마커) + `version`(내보내기 포맷 버전)을 두고, 각
   저장소의 스냅샷을 **각자의 저장 형식 그대로**(자체 version 필드
   포함) 내장한다. 내보내기 포맷 버전과 저장소 스키마 버전은 서로
   독립적으로 진화한다 — Schema.js의 fallthrough 마이그레이션 패턴을
   내보내기 포맷에도 동일하게 적용한다.
3. **가져오기 — 검증 선행 + 전체 교체 + 재부팅.** 가져오기는 세
   저장소를 통째로 덮어쓰는 파괴적 동작이다. (a) 쓰기 전에 파일을
   검증하고(미래 버전/손상 구조는 기존 데이터를 건드리지 않고 거부 —
   특히 Presentation은 `migrateSnapshot`+`sanitizePresentation`을
   실제로 통과하는지 확인), (b) 2단계 인라인 확인(9-36 패턴)을 거친
   뒤, (c) 저장소 키에 쓰고 페이지를 새로고침해 정규 부팅 경로(로드
   검증·마이그레이션·미디어 캐시 재구성)를 그대로 태운다 — 가져오기
   전용 상태 재주입 경로를 따로 만들지 않는다.

### 이유

- **Media 제외**: 이 기능이 해소하는 위험(Research 2026-07-11
  Deployment Strategy 위험 1)의 핵심은 사용자가 앱 안에서 직접 만든
  텍스트 데이터(가사 라이브러리·프리셋·행사 구성)의 복구 불가 유실이다.
  Media blob은 원본 파일이 사용자 디스크에 존재하므로(파일 선택으로
  가져온 것) 유실 시 재가져오기가 가능하고, 반대로 영상 blob을
  base64로 직렬화하면 파일이 수백 MB로 비대해지며 JSON.stringify가
  메인 스레드를 수 초 이상 점유할 수 있다 — "백업 버튼이 앱을 멈추게
  한다"는 D-009(안정적 송출 우선)와 정면 충돌한다. 미디어 누락
  Page는 이미 시각 폴백이 있어(view/PageView.js) 가져오기 후에도
  안전하게 인지된다.
- **부팅 경로 재사용**: 가져오기 후 상태를 런타임에 재주입하려면
  AppStore/SongStore/AppSettingsStore 세 모듈의 부팅 로직을 재현해야
  한다 — 새로고침 한 번이 그 전부를 검증된 코드 경로로 대체한다.
- **검증 선행**: 부팅 경로의 sanitize는 "손상 데이터 → 새 프로젝트
  폴백"인데, 가져오기에서 이 폴백이 발동하면 멀쩡하던 기존 데이터를
  손상 파일로 덮어쓴 뒤 빈 프로젝트가 되는 최악 경로가 된다. 그래서
  같은 검증을 **쓰기 전에** 통과시켜 거부한다.

### Non-goal

- Media 포함 내보내기 — 실사용에서 "미디어까지 한 파일로 옮기고
  싶다"는 신호가 확인되면 내보내기 포맷 버전을 올려 추가한다(그때
  직렬화 방식/파일 크기 대책을 함께 설계).
- 부분 가져오기(Song만/프리셋만) · 병합 가져오기 — MVP는 전체 교체만.
- 자동/주기 백업 — 수동 내보내기만. 필요 신호가 생기면 별도 검토.

### 결과

`persistence/ExportImport.js` 신규(순수 로직 — DOM/Store 상태를
모르고, 봉투 구성·검증·저장소 쓰기만 담당), `index.html`에
내보내기/가져오기 UI, 부팅 경로에 `navigator.storage.persist()` 호출
추가. 관련 문서: `Research/2026-07-11 Deployment Strategy.md`(선택지
B), `docs/TODO.md`의 해당 항목, D-004/D-009/D-016/D-025.

---

# D-031

## Emergency Overlay는 PresenterState 필드로 두고, CommandBus를 경유하되 Undo하지 않는다

### 결정

1. **State 위치 — PresenterState 필드.**
   `emergencyOverlay: { text, position } | null`을 PresenterState에
   추가한다(`position`은 `'top' | 'middle' | 'bottom'`, `null`이 곧
   비활성 — 별도 `active` 플래그를 두지 않는다). Overlay는
   selectedPageId/livePageId와 같은 부류의 **런타임 운영 상태**이며,
   D-004("행사 진행 중에만 의미 있다, 저장하지 않는다")의 우산에 그대로
   들어간다 — 저장/내보내기(D-030) 제외가 별도 코드 없이 구조적으로
   보장된다. **요구사항 해석 명시**: Observations(2026-07-08) 요구사항
   2의 "독립된 State"는 "**Presentation과 분리**"로 해석한다 —
   PresenterState로부터의 분리까지 요구한 것이 아니다. 이 해석은
   Overlay Engine 확장(Non-goal 참조) 착수 시 재검토한다.
2. **변경 경로 — CommandBus 경유, History는 Ignore.**
   `SET_EMERGENCY_OVERLAY` / `CLEAR_EMERGENCY_OVERLAY` 액션을
   추가하고 모든 변경은 `CommandBus.execute()`를 경유한다
   (PresenterState 변경은 전부 CommandBus 경유라는 기존 일관성 유지).
   단 `computeInverse()`는 SELECT_PAGE/GO_LIVE 등과 같은 Ignore
   블록에서 null을 반환한다 — 긴급 오버레이가 Ctrl+Z로 해제되는 것은
   운영 중 사고 경로이며, 해제는 명시적 버튼으로만 한다. 통지는
   `deriveMutations()`에 `SET_EMERGENCY_OVERLAY` Mutation을 추가해
   기존 `interestedMutations` 경로(D-017)를 그대로 탄다.
3. **송출 — 별도 Broadcast 메시지 + REQUEST_SYNC 포함.**
   `BroadcastOutput.js`는 기존 `SHOW_PAGE`/`CLEAR`와 **별도의 메시지
   타입**(`SHOW_OVERLAY` / `CLEAR_OVERLAY`)으로 Overlay를 전송한다 —
   `SHOW_PAGE`에 실으면 `lastSentPage` 참조 비교 dedupe가 깨진다.
   **`REQUEST_SYNC` 응답 시 현재 Overlay 상태도 반드시 재전송한다** —
   Overlay가 켜진 상태에서 output 창을 나중에 열어도 긴급 안내가
   보여야 한다(9-6의 STANDBY 멈춤 버그와 같은 부류의 재발 방지).
4. **livePageId와 직교 — STANDBY 위에도 렌더된다.**
   Overlay 상태는 livePageId와 완전히 독립이다. output.html은 Live
   Page가 없는 STANDBY/CLEAR 화면 위에도 Overlay를 렌더링하고,
   `CLEAR` 메시지(Live 해제)는 Overlay를 지우지 않는다 — Observations의
   돌발 상황 목록에 "행사 시작 지연, 잠시 대기 안내"가 있고, 이는
   아직 아무것도 Live가 아닌 시점의 시나리오다.
5. **렌더 우선순위** — Observations 요구사항 4 그대로: Background →
   Video → Page Content → Cue → **Emergency Overlay**(항상 최상단).

### 이유

- **PresenterState 채택(별도 Store 기각)**: SongStore/AppSettingsStore
  분리의 근거는 "영속 데이터인데 Undo가 필요 없다"였다(D-027).
  Overlay는 영속 자체가 필요 없으므로 분리 근거였던 속성이 없고,
  별도 Store로 가면 Mutation Subscriber 통지 경로를 못 타 output.html
  송출 연결을 따로 발명해야 한다. Overlay Engine 확장으로 PresenterState가
  비대해진다는 우려는 YAGNI로 보류한다(Auto Advance 보류와 같은 판단)
  — MVP는 필드 하나로 가고, 확장 트리거가 실제로 오면 그때 재검토한다.
- **History Ignore**: 기존 Recording Policy(HistoryManager.js —
  "선택/송출 변경은 일시적 포커스 상태일 뿐 데이터가 사라지지 않는다")가
  Overlay에 그대로 적용된다. 오히려 Overlay는 Undo에 걸리면 안 되는
  더 강한 이유(운영 중 오조작 경로)가 있다.
- **별도 메시지 타입 + SYNC 포함**: BroadcastChannel은 발신 시점의
  리스너에게만 전달된다 — output 창을 늦게 여는 경우는 이미 실사용에서
  확인된 패턴(9-6)이므로 Decision 수준에서 못 박는다.

### Non-goal

- **출력 대상 선택(Observations 요구사항 7)** — MVP는 "모든 출력에
  송출"로 고정한다. 현재 출력 구조는 BroadcastChannel 1:N 동일 내용
  방송이라 출력 창에 identity 개념 자체가 없다 — 요구사항 7은 출력이
  늘어나면 되는 게 아니라 **출력 식별 구조(identity/registry)라는
  선행 구조**가 필요한 항목이다. 재검토 트리거: 다중 출력 구조 착수
  (Window Management API Research, Observations 2026-07-11이 전조).
- **Overlay Engine(Countdown/QR/방송 전용 자막 등)** — 이번 설계가
  첫 기능이 될 수 있게 렌더 레이어/메시지 타입을 일반화 가능한 이름으로
  두는 정도까지만 하고, Engine 구조(복수 Overlay, 타입별 렌더러)는
  만들지 않는다. 착수 시 결정 1의 State 위치 해석부터 재검토.
- **애니메이션, 스타일 편집, 템플릿 관리, 이미지/동영상 Overlay** —
  Observations MVP 제외 목록 그대로.
- **Undo 지원** — 결정 2에 의해 의도적으로 제외(Non-goal이자 설계
  결정).

### 결과

영향 파일: `domain/PresenterState.js`(필드 + 전환 함수),
`store/AppStore.js`(reducer 케이스 2개 + `deriveMutations()`),
`history/HistoryManager.js`(Ignore 블록에 케이스 추가),
`output/BroadcastOutput.js`(SHOW_OVERLAY/CLEAR_OVERLAY +
REQUEST_SYNC 재전송), `output.html`(최상단 Overlay 레이어),
`index.html`(Live 운용 화면 상시 노출 UI — 입력→송출 2단계, 상/중/하
선택). 관련 문서: `Research/Observations.md` 2026-07-08,
D-004(저장 제외)/D-009(안정적 송출 우선)/D-017(Mutation 통지)/
D-027(별도 Store 기각 근거 대비).

# D-032

## 텍스트 Page는 배경 미디어(backgroundMediaId)를 플랫 필드로 가진다 — Element 모델 없이

### 결정

`Observations.md`(2026-07-14 #3) "텍스트에 이미지/영상 삽입" 요구를,
**텍스트 Page 뒤에 배경 미디어를 까는 배경형(background)** 으로 한정해
구현한다. 자유 배치(텍스트 안 임의 위치/크기 삽입)는 채택하지 않는다.

1. **State — 텍스트 Page의 플랫 필드 2개.** `createTextPage`에
   `backgroundMediaId: string | null`, `backgroundMediaType:
   'image' | 'video' | null`을 추가한다. `backgroundMediaType`을
   함께 저장하는 이유: `view/PageView.js`는 순수 동기 함수라
   MediaStore(IndexedDB)를 조회할 수 없어, 배경이 이미지인지 영상인지를
   Page가 스스로 알려줘야 img/video 레이어를 고를 수 있다. 이 필드들은
   `Page.js`가 이미 `// Future: backgroundMediaId`로 예고해 둔 자리이며,
   "Element 모델 전까지 플랫 필드로 버틴다"(TODO Page 모델 전환 항목)는
   승인된 전략의 이행이다. **image/video Page에는 추가하지 않는다** —
   그들은 콘텐츠 자체가 이미 화면을 채우는 배경이다.
2. **변경 경로 — 기존 UPDATE_PAGE 재사용.** 배경 적용/제거는 전용 액션을
   만들지 않고 `UPDATE_PAGE`(CommandBus 경유)로 Page를 통째로 교체한다.
   기존 text/style 편집과 완전히 같은 경로다. 따라서 (a) Mutation은
   기존 `SET_PAGES`를 그대로 타고(새 Mutation 불필요), (b) History는
   UPDATE_PAGE의 Page 전체 스냅샷 inverse가 새 필드를 자동 복원하며,
   (c) MediaStore는 건드리지 않는다 — 이미 업로드된 mediaId를 **참조만**
   한다(image Page의 mediaId와 동일, D-027 경계 유지).
3. **미디어 preload 확장.** `command/CommandBus.js`의 `preloadMedia()`가
   `page.mediaId`뿐 아니라 `page.backgroundMediaId`도 MediaRuntimeCache에
   채운다(D "Media Preload"의 mediaId 조회 메커니즘을 배경 id로 확장 —
   MEDIA_COMMANDS whitelist는 그대로). 이로써 Preview/Output이 배경 blob을
   동기 peek할 수 있다.
4. **렌더 — 기존 미디어 레이어 재사용.** `createPageView(page, media,
   backgroundMedia)`에 3번째 인자(배경 blob URL)를 추가한다. `media`는
   여전히 Page 자신의 콘텐츠 미디어(image/video Page용)이고, text Page는
   `media=null`·`backgroundMedia=배경 URL`이 된다. text 브랜치에서
   배경 레이어(`backgroundMediaType`에 따라 기존 createImageLayer/
   createVideoLayer 재사용)를 텍스트 레이어 **앞에** append해 텍스트가
   위에 오게 한다(image/video Page의 오버레이와 동일한 DOM 순서).

### 이유

- **배경형 채택(자유 배치 기각)**: 이 앱의 실사용은 "가사 위 배경 영상/
  이미지"(예배 송출 표준)다. 자유 배치는 Element 모델(Phase 2, 스키마
  마이그레이션 포함 고비용, D-002/Page 모델 전환과 충돌)을 요구하는데,
  실사용 가치의 대부분은 배경형으로 저비용에 달성된다. Element 모델
  전환 트리거("한 Page에 독립 편집 콘텐츠 3개 이상")는 여전히 미충족.
- **image Page+오버레이와의 중복 허용**: "텍스트+미디어"를 만드는 경로가
  둘(미디어 Page+텍스트 오버레이 / 텍스트 Page+배경 미디어)이 되지만
  의도적이다 — 워크플로우가 다르다. 특히 후자는 Song에서 생성된 가사
  Page(text 타입, D-021)에 배경을 입힐 수 있어, 미디어 Page로 다시
  만들면 끊기던 Song 연결을 유지한다. `type`은 콘텐츠의 "주체"를
  나타내는 값으로 유지한다(text Page는 배경이 생겨도 여전히 type:'text').
- **스키마 버전 미상향**: 순수 가법(additive) 옵셔널 필드다. 기존 저장
  데이터는 필드가 없어(undefined→falsy) 배경이 안 그려질 뿐 정상 로드되고,
  `sanitizePresentation()`이 Page를 `{...page}`로 통과시켜 새 필드를
  보존한다(화이트리스트 아님). 마이그레이션 불필요.

### Non-goal

- **자유 배치(Element 모델, 인라인 위치/크기 지정)** — 위 이유 참조.
  Element 모델 전환 트리거 충족 시 재검토.
- **배경 fit(cover/contain) 옵션·backgroundColor 사용자 편집** — MVP는
  기존 미디어 레이어의 `object-fit: contain` 고정을 그대로 재사용한다
  (image/video Page와 동일한 범위 단순화). 배경 영상의 controls 노출도
  기존 createVideoLayer 재사용에 따른 것으로, 별도 숨김 처리는 범위 밖.
- **image/video Page에 배경 미디어** — 콘텐츠가 이미 배경이라 불필요.

### 결과

영향 파일: `domain/Page.js`(createTextPage 필드 2개 + isValidPage 방어),
`domain/Page.test.js`(신규), `view/PageView.js`(3번째 인자 + 배경 레이어),
`command/CommandBus.js`(preloadMedia가 backgroundMediaId도 조회),
`command/CommandBus.test.js`(회귀), `ui/PreviewPanel.js`/`output.html`
(backgroundMediaId 해석 → 3번째 인자 전달), `index.html`(라이브러리
"배경으로 적용" + 사이드바 배경 표시/제거). 관련: `Research/Observations.md`
2026-07-14 #3, D-002(Page 소유)/D-021(Song 재가져오기)/D-027(Media 분리)/
Page 모델 전환 TODO(플랫 필드 stopgap 전략).

