# Editor Architecture

## Purpose

Editor는 사용자의 편집 의도를 수집하는 UI Layer이다.

Editor는 Domain 객체를 생성하거나 소유하지 않는다.

Editor는 사용자 입력을 해석하여 Command 생성 요청을 수행한다.

---

# Core Principles

## User Intent Collection Layer

Editor의 책임은 사용자의 편집 의도를 수집하는 것이다.

Editor는 Presentation, Page, Element의 내부 구조를 직접 수정하지 않는다.

---

## Store Mediated Architecture

모든 상태 변경은 AppStore를 통해 수행된다.

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

## UI State Ownership

Editor는 Session State의 주요 mutator이다.

Session State는 AppStore의 State Structure 안에 저장된다(D-014). Editor가 Session State를 "소유"하는 것이 아니라, Session의 값을 바꾸는 로직(드래그 계산, Hover 판정 등)을 Editor가 가지고 있을 뿐이다.

Presentation, Page, Element 등 Domain State도 AppStore가 관리한다.

---

# Responsibilities

Editor의 책임:

* 사용자 입력 수집
* Interaction Workflow 관리
* Selection Workflow 관리
* Inspector 표시
* Command 생성 요청
* Session State 관리

---

# Non Responsibilities

Editor의 책임이 아닌 것:

* Presentation 생성
* Page 생성
* Element 생성
* Domain 직접 수정
* Persistence
* Rendering
* History 저장

---

# Session

Editor는 Session State의 주요 mutator이다(상태 저장 자체는 AppStore가 한다, D-014).

Session은 다음 상태를 가진다.

* Selection
* Clipboard
* TextEditing
* InteractionState
* PersistenceState

Session State는 Presentation 데이터와 독립적으로 존재한다.

Session은 Editor의 전유물이 아니다. Editor가 Selection / Clipboard / TextEditing / InteractionState를 주로 변경하지만, Session.live(livePageId)나 Session.persistence는 Output, Persistence 같은 비-Editor 레이어가 더 직접적으로 관여한다. PersistenceState의 갱신 경로는 D-015에 따라 일반 Session State와 다르다(CommandBus/AppStore를 거치지 않음).

---

# Selection

Selection은 사용자가 현재 편집 대상으로 선택한 상태이다.

예:

* selectedPageId
* selectedElementIds

Selection은 편집 Workflow의 입력으로 사용된다.

---

# Clipboard

Clipboard는 Copy, Cut, Paste를 위한 Session 데이터이다.

Clipboard는 Domain 객체를 참조하지 않는다.

Clipboard는 Snapshot 기반 데이터를 가진다.

---

# Text Editing

TextEditing은 텍스트 편집 세션을 관리한다.

예:

* editingElementId
* caret
* textRange

TextEditing은 InteractionState와 독립적으로 동작한다.

---

# Interaction State

InteractionState는 일시적인 편집 상태를 가진다.

예:

* mode
* pointer
* drag
* resize
* marquee
* pan

InteractionState는 Domain Mutation을 발생시키지 않는다.

---

# Inspector Model

Editor는 특정 Element 유형에 의존하지 않는다.

구조:

Editor
└─ InspectorHost
├─ TextInspector
├─ ImageInspector
├─ VideoInspector
└─ ...

새로운 Element 유형 추가 시 새로운 Inspector 추가만으로 확장 가능해야 한다.

---

# Communication

Editor는 Domain을 직접 수정하지 않는다.

구조:

Editor
↓
Interaction Resolver
↓
Command
↓
CommandBus
↓
AppStore
↓
Domain

---

# Architecture

User Input
↓
Editor
↓
Interaction Resolver
↓
Command
↓
CommandBus
↓
AppStore

---

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Plugin Inspector
* Custom Shortcut
* Multi Selection
* Batch Editing
* Macro
* Remote Control

새로운 Element 유형 추가 시 Editor 수정 없이 확장 가능해야 한다.
