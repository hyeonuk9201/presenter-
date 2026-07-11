# HistoryArchitecture.md

# Purpose

History는 사용자의 편집 작업을 취소하거나 재실행할 수 있도록 한다.

History는 User Intent 단위의 Undo와 Redo를 제공한다.

History는 Domain 구조를 알지 않으며 Payload 기반으로 동작한다.

---

# Core Principles

## User Intent Based

Undo 단위는 Command 개수가 아니다.

Undo 단위는 사용자가 하나의 작업으로 인식하는 행동(User Intent)이다.

예:

곡 추가
↓
Undo 1회

페이지 삭제
↓
Undo 1회

드래그 이동
↓
Undo 1회

---

## Payload Based

History는 Command 객체를 저장하지 않는다.

History는 Command 생성용 Payload를 저장한다.

예:

{
type: "MOVE_ELEMENTS",
payload: {
elementIds,
dx,
dy
}
}

---

## Replayable

저장된 Payload는 항상 다시 실행될 수 있어야 한다.

구조:

History Entry
↓
Payload
↓
Command Registry
↓
Command
↓
CommandBus
↓
AppStore

---

## Domain Agnostic

HistoryManager는 Domain 구조를 알지 않는다.

HistoryManager는 다음을 알지 않는다.

* Presentation 구조
* Page 구조
* Element 구조
* Asset 구조

HistoryManager는 History Entry의 저장과 재실행만 담당한다.

---

## Store Independence

AppStore는 HistoryManager의 존재를 알지 않는다.

HistoryManager도 AppStore 내부 구조를 알지 않는다.

둘은 Command를 통해서만 연결된다.

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
CommandExecutor
↓
AppStore
↓
HistoryManager

---

# Responsibilities

HistoryManager의 책임:

* History Entry 저장
* Undo 수행
* Redo 수행
* Transaction 관리
* History Limit 관리

---

# Non Responsibilities

HistoryManager의 책임이 아닌 것:

* Domain 수정
* Rendering
* Persistence
* UI 상태 관리
* Command 생성 로직
* Pointer 상태 관리
* Interaction Preview 관리

---

# History Entry

History Entry는 User Intent 단위를 표현한다.

구조:

* id
* transactionId
* label
* undoPayload
* redoPayload
* timestamp

---

# Entry Fields

id

* History Entry 고유 식별자

transactionId

* 하나의 User Intent 식별자

label

* 사용자 표시용 이름

undoPayload

* Undo Command 생성 데이터

redoPayload

* Redo Command 생성 데이터

timestamp

* 생성 시각

---

# Why Transaction Id

예:

PasteClipboard
├─ AddElement
├─ AddElement
└─ SetSelection

사용자는:

Paste

하나의 작업으로 인식한다.

구조:

transactionId = tx-1

Undo:

Ctrl + Z

1회

Redo:

Ctrl + Shift + Z

1회

---

# Composite Command

하나의 User Intent가 여러 Command로 구성될 수 있다.

예:

AddSong
├─ AddPage
├─ AddElement
└─ SetSelection

예:

PasteClipboard
├─ AddElement
├─ AddElement
└─ SetSelection

원칙:

# N Commands

# 1 User Intent

1 History Entry

---

# Transaction Boundary

Transaction은 History 생성 경계를 정의한다.

예:

PointerDown
↓
Drag Preview
↓
Drag Preview
↓
Drag Preview
↓
PointerUp
↓
MoveElements
↓
History Entry 생성

---

# Preview and Commit

Preview:

* Hover
* Drag Preview
* Resize Preview
* Marquee Preview
* Pan Preview

Commit:

* MoveElements
* ResizeElements
* RotateElements
* ChangeProperty

원칙:

Preview
≠
Persisted Mutation

Preview는 History를 생성하지 않는다.

Commit만 History를 생성한다.

---

# Recording Policy

## Record

* AddPage
* DeletePage
* DuplicatePage
* AddElement
* DeleteElement
* DuplicateElement
* MoveElements
* ResizeElements
* RotateElements
* ChangeProperty
* PasteClipboard
* CutSelection

---

## Ignore

* Hover
* PointerMove
* Pan
* Drag Preview
* Resize Preview
* Marquee Preview
* Selection Highlight
* Caret Blink

---

# Undo Flow

Undo 요청
↓
HistoryManager
↓
undoPayload 조회
↓
Command Registry
↓
Command 생성
↓
CommandBus
↓
AppStore
↓
Subscribers
↓
Renderer

---

# Redo Flow

Redo 요청
↓
HistoryManager
↓
redoPayload 조회
↓
Command Registry
↓
Command 생성
↓
CommandBus
↓
AppStore
↓
Subscribers
↓
Renderer

---

# History Limit

History는 최대 개수를 가진다.

기본값:

100 Entries

정책:

101번째 Entry 추가
↓
가장 오래된 Entry 제거

FIFO 방식을 사용한다.

---

# Failure Policy

Undo 또는 Redo 실패 시:

실패 Entry
↓
onError
↓
History 유지

실패한 Entry는 자동 삭제하지 않는다.

HistoryManager는 Partial Mutation 상태를 남겨서는 안 된다.

---

# Replay Support

History는 Replay를 지원할 수 있어야 한다.

구조:

History Entries
↓
Payload Sequence
↓
Command Sequence
↓
CommandBus
↓
AppStore

---

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Macro Recording
* Action Replay
* Plugin Command
* Remote Control
* Batch Editing
* Collaborative Editing
* DevTools Time Travel

HistoryManager 수정 없이 확장 가능해야 한다.

---

# 현재 구현 노트 (D-018 / D-019 반영, 2026-07-11 문서 정리)

위 본문은 목표 구조다. 현재 구현(`history/HistoryManager.js`)과의
차이를 여기에 기록한다 — D-019가 "다음 문서 정리 세션에서 반영"으로
예고했던 갱신이다. 세부 근거는 `Decisions.md`의 해당 항목과 소스 파일
헤더 주석이 단일 출처다.

## undo() / redo()의 async 전환 (D-019)

`CommandBus.execute()`가 async가 되면서(media preload, D-019)
`undo()` / `redo()`도 **async 함수**다. `await commandBusExecute(...)`로
역방향 Command의 실제 replay(dispatch + afterExecute 호출)가 완전히
끝난 뒤에야 재귀 기록 방지 플래그(`isApplyingHistory`)를 해제한다 —
sync였을 때는 플래그가 dispatch보다 먼저 풀려 재귀 기록 방지가
무력화될 수 있는 잠재 결함이 있었다(fake-indexeddb로 재현 후 수정).

## History Entry 구조 (현재)

본문의 `{ id, transactionId, label, undoPayload, redoPayload, timestamp }`
대신, 현재는 `{ id, label, undoCommand, redoCommand, timestamp }`를
저장한다. CommandRegistry가 아직 없어 순수 Payload를 저장해도 재실행 시
Command로 되돌릴 변환기가 없기 때문에, "되돌릴 수 있는 완성된
Command"(`CommandBus.execute()`에 그대로 전달 가능한 형태)를 저장한다.
CommandRegistry 도입 시 본문 구조로 정리할 수 있다. `transactionId`
(Composite Command 묶음)는 미구현 — Action 1개 = Entry 1개.

## Recording Policy (현재)

본문의 Ignore 목록에 더해, 현재 구현은 다음을 Ignore한다(Step5 실사용
후 확정 + Phase B): `SELECT_PAGE` / `CLEAR_SELECTION` / `GO_LIVE` /
`CLEAR_LIVE` / `SET_APP_MODE` — 일시적 포커스/모드 상태일 뿐 데이터
변경이 없다. History Limit(100, FIFO)은 본문대로 구현되어 있다.
