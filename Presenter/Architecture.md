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

```text
Page
 └─ 화면 데이터

Presentation
 └─ Page 순서

PresenterState
 └─ 런타임 상태
```

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

향후 PresenterState 기반으로 이전 검토.

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
