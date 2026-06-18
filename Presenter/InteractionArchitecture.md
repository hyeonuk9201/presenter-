# InteractionArchitecture.md

# Purpose

Interaction은 사용자 입력을 해석하여 편집 의도를 생성하는 계층이다.

Interaction은 Domain을 직접 수정하지 않는다.

Interaction은 사용자 입력을 Session State와 Command로 변환하는 책임을 가진다.

---

# Core Principles

## Input Driven

모든 Interaction은 사용자 입력에서 시작된다.

입력:

* Mouse
* Keyboard
* Wheel
* Touch

---

## Preview and Commit Separation

Preview와 Persisted Mutation은 분리된다.

Preview:

* Drag Preview
* Resize Preview
* Marquee Preview
* Pan Preview

Commit:

* MoveElements
* ResizeElements
* ChangeProperty
* DeleteSelection

Preview는 Session State만 변경한다.

Commit만 Domain Mutation을 발생시킨다.

---

## Store Mediated Mutation

Interaction은 AppStore를 직접 수정하지 않는다.

허용:

User Input
↓
Interaction
↓
Command
↓
CommandBus
↓
AppStore

금지:

Interaction
↓
AppStore 직접 수정

---

## Session Based

Interaction 상태는 Session 아래 존재한다.

구조:

Session
├─ Selection
├─ Clipboard
├─ TextEditing
└─ InteractionState

---

# Interaction State

InteractionState는 일시적인 편집 상태를 관리한다.

예:

* mode
* pointer
* drag
* resize
* marquee
* pan

InteractionState는 Persistence 대상이 아니다.

---

# InteractionState

예시:

* mode
* pointer
* drag
* resize
* marquee
* pan

---

# Pointer Workflow

Pointer 입력은 모든 Interaction의 시작점이다.

구조:

PointerDown
↓
HitTest
↓
Interaction 결정

예:

* Select
* Drag
* Resize
* Marquee
* Text Edit

---

# Drag Workflow

목적:

선택된 Element 이동

구조:

PointerDown
↓
StartDrag
↓
PointerMove
↓
UpdateDrag
↓
Render Preview
↓
PointerUp
↓
MoveElements Command

---

# Drag State

예:

* active
* startPoint
* currentPoint
* elementIds

---

# Resize Workflow

목적:

Element 크기 변경

구조:

PointerDown
↓
StartResize
↓
PointerMove
↓
UpdateResize
↓
Render Preview
↓
PointerUp
↓
ResizeElements Command

---

# Resize State

예:

* active
* handle
* startBounds
* currentBounds
* elementIds

---

# Marquee Workflow

목적:

영역 선택

구조:

PointerDown
↓
StartMarquee
↓
PointerMove
↓
UpdateMarquee
↓
Render Preview
↓
PointerUp
↓
SetSelection Command

---

# Marquee State

예:

* active
* startPoint
* currentPoint
* rect

---

# Pan Workflow

목적:

Canvas 이동

구조:

PointerDown
↓
StartPan
↓
PointerMove
↓
UpdatePan
↓
Render Preview
↓
PointerUp
↓
EndPan

Pan은 Domain Mutation을 발생시키지 않는다.

---

# Selection Workflow

Selection은 현재 편집 대상을 정의한다.

예:

* selectedPageId
* selectedElementIds

Selection 변경:

* SetSelection
* AddSelection
* RemoveSelection
* ClearSelection

---

# Selection Invariants

selectedElementIds는 항상 selectedPageId의 Element만 포함해야 한다.

Cross Page Selection은 허용하지 않는다.

---

# Clipboard Workflow

Clipboard는 Snapshot 기반으로 동작한다.

구조:

Selection
↓
Clone
↓
Clipboard Snapshot 저장

Paste:

Clipboard Snapshot
↓
Clone
↓
New Id 생성
↓
AddElement Command
↓
Selection 갱신

Clipboard는 Domain 객체를 참조하지 않는다.

---

# Text Editing Workflow

Text Editing은 InteractionState와 독립적으로 동작한다.

예:

* editingElementId
* caret
* selection

---

# Enter Text Edit

Double Click
↓
SetEditingElement

---

# Exit Text Edit

ESC
↓
ClearTextEditing

또는

Outside Click
↓
ClearTextEditing

---

# Text Editing Priority

Text Editing 중에는:

* Drag 금지
* Resize 금지
* Marquee 금지

우선순위:

TextEditing

>

InteractionState

---

# Shortcut Workflow

구조:

KeyDown
↓
ShortcutResolver
↓
Command
↓
CommandBus
↓
AppStore

예:

Delete
↓
DeleteSelection

Ctrl + C
↓
CopySelection

Ctrl + V
↓
PasteClipboard

Ctrl + A
↓
SelectAll

ESC
↓
CancelInteraction

---

# Interaction Command Mapping

구조:

User Input
↓
Interaction Resolver
↓
Command
↓
CommandBus
↓
AppStore

---

# Architecture

Mouse
Keyboard
Wheel
Touch
↓
Interaction Resolver
↓
Session State
↓
Preview
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

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Touch Gesture
* Pen Input
* Macro
* Plugin Tool
* Multi Selection
* Batch Editing
* Remote Control

새로운 Interaction 유형 추가 시 기존 Workflow 수정 없이 확장 가능해야 한다.
