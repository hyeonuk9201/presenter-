# TC-Presenter Architecture

## Core Philosophy

TC-Presenter는 실시간 편집 프로그램이 아니다.

행사 전에 준비된 Page를

빠르고 안정적으로 송출하는 프로그램이다.

편집보다 송출 안정성을 우선한다.

---

## Why Page?

초기 아이디어는 Lyrics 중심 모델이었다.

하지만 실제 송출 단위는 가사가 아니라 화면이었다.

따라서 시스템의 핵심 엔티티를 Lyrics가 아닌 Page로 정의하였다.

---

## Domain Model

현재 구현(MVP, CurrentState.md 기준):

```text
Page
 └─ 화면 데이터 (text, fontSize, align 등 직접 보유)

Presentation
 └─ Page 순서 (pages: Page[])

PresenterState
 └─ 런타임 상태 (selectedPageId, livePageId)
```

목표 구조 (Phase 2, Decisions.md D-014 / DomainEntityArchitecture.md 기준):

```text
AppState
├─ Presentation
│   ├─ pageIds
│   ├─ pageMap
│   └─ elementMap
├─ AssetRegistry
└─ Session
    ├─ selection (selectedPageId, selectedElementIds)
    ├─ live (livePageId)
    ├─ clipboard
    ├─ textEditing
    ├─ interaction
    └─ persistence
```

"PresenterState"라는 이름은 폐기되었고 "Session"으로 통합되었다(D-014). 시각 표현 데이터는 Page가 아니라 Element가 가지며, Element는 elementMap에 저장되고 Page는 elementIds로 순서만 가진다.

실제 코드가 아직 MVP 구조라면, 목표 구조로의 전환은 Element 모델 도입 시점에 한 번에 진행한다(부분 전환은 Page 스키마의 이중 의미를 유발하므로 지양).

---

## Data Flow

```text
Editor
 ↓
AppStore
 ↓
CueList
 ↓
PreviewPanel
 ↓
BroadcastOutput
 ↓
output.html
```

모든 상태 변경은 AppStore를 통해 흐른다.

---

## Runtime Separation

```text
selectedPageId
```

편집 대상

```text
livePageId
```

실제 송출 대상

두 상태는 절대 합치지 않는다.

---

## Current Status

Walking Skeleton 완료.

구현 완료:

* Page 생성
* Lyrics Import
* CueList
* PreviewPanel
* BroadcastOutput
* output.html
* Edit Mode
* Live Mode
* Font Size
* Horizontal Align
* Vertical Align

---

## Current Priorities

Priority A

* Page 수정

Priority B

* Page 삭제

Priority C

* localStorage 저장

Priority D

* Drag & Drop 재정렬

---

## Technical Debt

TODO-001

현재 일부 Mode 판정이 DOM 기반이다.

향후 Session 기반(D-014)으로 이전 검토.

---

TODO-002

fontSize, align 등 Style 정보가 Page 내부에 존재한다.

향후 Style 객체 분리 검토.

---

## Future Expansion

Tier 1

* Save / Load
* Recent Presentation
* Favorite Presentation

Tier 2

* Media System
* Style Preset
* Background Video

Tier 3

* Stage Monitor
* Confidence Monitor
* OBS Output
* NDI Output

Output 확장은 가능하지만 Domain 구조는 유지하는 것을 목표로 한다.
