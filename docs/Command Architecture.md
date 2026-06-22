# CommandArchitecture.md

# Purpose

Command는 사용자의 편집 의도를 표현하는 Application Action이다.

Command는 Editor와 AppStore 사이의 계약(Contract)이다.

모든 Domain Mutation은 Command를 통해 수행된다.

---

# Core Principles

## Intent Based

Command는 상태 변경 방법(How)이 아니라 사용자의 의도(What)를 표현한다.

좋음:

* MoveElements
* ResizeElements
* DeleteSelection
* PasteClipboard

나쁨:

* SetX
* SetY
* SetWidth
* SetHeight

---

## Store Mediated

Command는 Domain을 직접 수정하지 않는다.

허용:

Editor
↓
Command
↓
CommandBus
↓
AppStore

금지:

Editor
↓
Domain 직접 수정

---

## User Action Granularity

Command는 사용자가 하나의 작업으로 인식하는 단위를 표현한다.

예:

MouseDown
↓
Move
Move
Move
↓
MouseUp
↓
MoveElements

사용자는 하나의 이동으로 인식한다.

---

## Behavior Based

Command는 특정 Domain 구조에 의존하지 않는다.

Command는:

* Presentation 구조
* Page 구조
* Element 구조

를 직접 알지 않는다.

---

## Extensible

새로운 Element 유형 추가 시 기존 Command Catalog 수정 없이 확장 가능해야 한다.

---

# Command Contract

Command는 Type과 Payload로 구성된다.

구조:

Command
├─ type
└─ payload

---

# Payload Principles

Payload는 다음 조건을 만족해야 한다.

* Serializable
* Immutable
* Replayable
* Versionable
* Deterministic

---

# Payload Rules

Payload는 순수 데이터만 가진다.

허용:

* id
* string
* number
* boolean
* array
* object

금지:

* DOM
* HTMLElement
* CanvasContext
* Function
* Closure

---

# Command Invariant

Command는 결정론적으로 실행되어야 한다.

입력:

payload
+
current AppState

출력:

next AppState

동일한 입력은 항상 동일한 결과를 만들어야 한다.

---

# Command Lifecycle

User Input
↓
Interaction Resolver
↓
Create Command
↓
Validate
↓
CommandBus
↓
AppStore Mutation
↓
Subscribers
↓
Render Request
↓
Renderer

---

# Command Categories

## Presentation Commands

* CreatePresentation
* LoadPresentation
* SavePresentation
* ClosePresentation

---

## Page Commands

* AddPage
* DeletePage
* DuplicatePage
* MovePage

---

## Element Commands

* AddElement

* DeleteElement

* DuplicateElement

* MoveElements

* ResizeElements

* RotateElements

* BringForward

* SendBackward

* BringToFront

* SendToBack

* MoveElementsToPage

---

## Property Commands

* ChangeProperty

---

## Selection Commands

* SetSelection
* AddSelection
* RemoveSelection
* ClearSelection

Selection은 Session Workflow의 일부이며 Command를 통해 변경될 수 있다.

---

## Clipboard Commands

* CopySelection
* CutSelection
* PasteClipboard

Clipboard는 Snapshot 기반으로 동작한다.

---

## Text Commands

* StartTextEditing
* FinishTextEditing
* ChangeText

Text Editing은 InteractionState와 독립적으로 동작한다.

---

## Composite Commands

하나의 User Intent가 여러 Command로 구성될 수 있다.

예:

PasteClipboard
├─ AddElement
├─ AddElement
└─ SetSelection

예:

AddSong
├─ AddPage
├─ AddElement
└─ SetSelection

---

# Composite Command Principles

# N Commands

1 User Intent

사용자는 내부 Command 개수를 인식하지 않는다.

---

# Transaction

Transaction은 History Boundary를 정의한다.

예:

PointerDown
↓
Preview
↓
Preview
↓
Preview
↓
PointerUp
↓
MoveElements

Undo:

Ctrl + Z

1회

---

# Preview and Commit

Preview:

* Drag Preview
* Resize Preview
* Marquee Preview
* Pan Preview

Commit:

* MoveElements
* ResizeElements
* ChangeProperty

원칙:

Preview
≠
Persisted Mutation

절대 혼합하지 않는다.

---

# Architecture

User Input
↓
Interaction Resolver
↓
Command
↓
CommandBus
↓
AppStore
↓
Subscribers
↓
Renderer

---

# Non Goals

Command는 다음 책임을 가지지 않는다.

* Domain 직접 수정
* Persistence
* Rendering
* Undo 저장
* UI 표시
* Pointer 상태 관리
* Drag Preview 관리
* Resize Preview 관리

---

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Macro Recording
* Action Replay
* Plugin Command
* Remote Control
* Batch Editing
* Multi Selection
* Collaborative Editing

새로운 Command 추가 시 기존 Command 수정 없이 확장 가능해야 한다.
