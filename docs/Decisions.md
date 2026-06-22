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