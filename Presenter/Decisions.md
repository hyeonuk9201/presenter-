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

---

# D-004

## PresenterState는 저장하지 않는다

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

# D-013

## PresenterState는 저장하지 않는다

### 결정

localStorage에는 presentation만 저장한다.

PresenterState는 저장하지 않는다.

### 저장 대상

* presentation.title
* presentation.pages

### 저장 제외

* selectedPageId
* livePageId

### 이유

PresenterState는 런타임 상태다.

앱 재실행 시 운영자가 직접 선택하고 송출해야 한다.

### 결과

앱 시작 시:

* selectedPageId = null
* livePageId = null

항상 동일한 초기 상태로 시작한다.

---

# Editor Architecture

## E-001 Editor Responsibility

Editor는 Domain 객체를 생성하거나 소유하지 않는다.

Editor의 책임은 사용자 편집 의도를 수집하여
Application Layer로 전달하는 것이다.

---

## E-002 Element Independence

Editor는 특정 Element 유형에 의존하지 않는다.

Element별 편집 기능은 독립 Inspector로 분리한다.

새 Element 추가 시
기존 Editor Core 수정 없이 확장 가능해야 한다.

---

## E-003 UI State Ownership

Editor는 UI State만 소유한다.

Presentation, Page, Element 상태는
AppStore가 소유한다.

---

## E-004 Selection Ownership

Selection은 Editor State이다.

Selection은 Domain에 저장하지 않는다.

---

# Command Architecture

## C-001 Intent Based Commands

Command는 사용자 편집 의도를 표현한다.

Command는 단순 Property 변경보다
사용자 작업을 나타내야 한다.

---

## C-002 Store Mediated Changes

Command는 Domain을 직접 수정하지 않는다.

모든 상태 변경은 AppStore를 통해 수행한다.

---

## C-003 User Action Granularity

Command는 UI 이벤트 단위가 아니라
사용자 작업 단위로 생성한다.

예:
드래그 중 100회의 MouseMove는
1회의 MoveElement Command가 될 수 있다.

---

## C-004 Behavior Based Commands

Command는 Element 유형이 아니라
Element 행위를 기준으로 설계한다.

---

## C-005 Composite Operations

여러 Command는 하나의 사용자 작업으로
묶일 수 있다.

Batch Command를 허용한다.

---

## C-006 Open For New Elements

새 Element 유형 추가 시
기존 Command Catalog 수정 없이
확장이 가능해야 한다.

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