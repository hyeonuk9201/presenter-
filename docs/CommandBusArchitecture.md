# CommandBusArchitecture.md

# Purpose

CommandBus는 Application 내부의 모든 Command 실행 진입점을 제공한다.

모든 Domain Mutation 요청은 CommandBus를 통해 AppStore로 전달된다.

CommandBus는 Command 실행 순서를 보장하고 Command Lifecycle의 진입점을 제공한다.

---

# Core Principles

## Single Entry Point

AppStore로 진입하는 Command 경로는 하나만 존재한다.

허용:

Editor
↓
CommandBus
↓
AppStore

Undo
↓
CommandBus
↓
AppStore

Redo
↓
CommandBus
↓
AppStore

Macro
↓
CommandBus
↓
AppStore

Remote Control
↓
CommandBus
↓
AppStore

금지:

Editor
↓
AppStore

Undo
↓
AppStore

Redo
↓
AppStore

직접 Mutation

---

## Store Mediated Architecture

모든 상태 변경은 CommandBus를 통해 수행된다.

AppStore는 CommandBus 외부의 Mutation 경로를 가지지 않는다.

---

## Domain Agnostic

CommandBus는 Domain 구조를 알지 않는다.

CommandBus는 다음을 알지 않는다.

* Presentation 구조
* Page 구조
* Element 구조
* Asset 구조

CommandBus는 Command 실행만 수행한다.

---

## Deterministic Execution

동일한 Command Sequence는 항상 동일한 결과를 만들어야 한다.

구조:

Command Sequence
+
Current AppState
↓
Next AppState

---

# Responsibilities

CommandBus의 책임:

* Command 실행
* 실행 순서 보장
* Command Lifecycle 진입점 제공
* CommandExecutor 호출
* AppStore 전달

---

# Non Responsibilities

CommandBus의 책임이 아닌 것:

* Domain 생성
* Domain 수정 로직
* Undo 저장
* Persistence
* Rendering
* Output 처리
* UI 상태 관리

---

# Architecture

Editor
↓
Command
↓
CommandBus
↓
CommandExecutor
↓
AppStore
↓
Subscribers
↓
Renderer

---

# Command Execution Flow

User Input
↓
Interaction Resolver
↓
Create Command
↓
CommandBus.execute()
↓
CommandExecutor
↓
AppStore.dispatch()
↓
Subscribers
↓
RenderRequest
↓
Renderer

---

# Command Executor

## Purpose

CommandExecutor는 Command를 AppStore Mutation으로 변환한다.

---

## Responsibilities

* Command Validation
* Command Execution
* AppStore Dispatch

---

## Non Responsibilities

* History 저장
* Rendering
* Persistence
* UI 상태 관리

---

# Lifecycle Hooks

CommandBus는 Command Lifecycle Hook을 제공할 수 있다.

Hook:

* beforeExecute
* afterExecute
* onError

---

# Hook Usage

다음 시스템은 Hook을 사용할 수 있다.

* History
* Logging
* Analytics
* Plugin
* DevTools

Hook은 Command 실행을 관찰할 수 있지만 Command를 직접 수정하지 않는다.

---

# Command Registry

## Purpose

Payload 기반으로 Command를 생성한다.

구조:

Payload
↓
CommandRegistry
↓
Command
↓
CommandBus

---

# Registration

예:

registry.register(
"MOVE_ELEMENTS",
MoveElementsCommand
);

registry.register(
"CHANGE_PROPERTY",
ChangePropertyCommand
);

---

# Replay

History Payload
↓
CommandRegistry
↓
Command
↓
CommandBus
↓
AppStore

---

# Why Registry

장점:

* Open / Closed Principle
* Plugin 확장
* Macro Recording
* Replay
* Remote Control
* 최소 수정 책임

새로운 Command 추가 시 Registry 등록만으로 확장 가능해야 한다.

---

# Composite Execution

하나의 User Intent는 여러 Command로 구성될 수 있다.

예:

PasteClipboard
├─ AddElement
├─ AddElement
└─ SetSelection

CommandBus는 Composite Command를 하나의 실행 단위로 처리할 수 있어야 한다.

---

# Transaction Support

CommandBus는 Transaction 실행을 지원할 수 있다.

예:

Transaction
├─ Command A
├─ Command B
└─ Command C

실행 순서는 항상 보장되어야 한다.

---

# Ordering Guarantee

CommandBus는 FIFO 순서를 보장한다.

예:

Command A
↓
Command B
↓
Command C

실행 결과:

A
↓
B
↓
C

실행 중 Command 순서가 변경되어서는 안 된다.

---

# Error Handling

Command 실행 실패 시:

실패 Command
↓
onError
↓
Rollback Policy 결정

실패한 Command 이후 Command는 실행되지 않는다.

Partial Mutation 상태를 남겨서는 안 된다.

---

# Pipeline

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
AppStore Mutation
↓
Subscribers
↓
RenderRequest
↓
Renderer

---

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Undo / Redo
* Macro Recording
* Action Replay
* Plugin Command
* Remote Control
* Batch Editing
* Collaborative Editing
* DevTools Time Travel

새로운 Command 추가 시 CommandBus 수정 없이 확장 가능해야 한다.

---

# 현재 구현 노트 (D-018 / D-019 / D-020 반영, 2026-07-11 문서 정리)

위 본문은 목표 구조다. 현재 구현(`command/CommandBus.js`)과의 차이를
여기에 기록한다 — D-019/D-020이 "다음 문서 정리 세션에서 반영"으로
예고했던 갱신이다. 세부 근거는 `Decisions.md`의 해당 항목과 소스 파일
헤더 주석이 단일 출처다.

## async 직렬 실행 큐 (D-019)

`execute()`는 완전 동기가 아니라 **async 함수**다. media가 있는
Command(ADD_PAGE / UPDATE_PAGE / INSERT_PAGE_AT — `MEDIA_COMMANDS`
whitelist)는 dispatch 이전에 `preloadMedia()`로 IndexedDB(MediaStore)를
조회해 MediaRuntimeCache(mediaId → blob URL)를 채운다.

이로 인한 순서 역전(늦게 호출한 media 없는 Command가 먼저 dispatch되는
문제)을 막기 위해 모든 `execute()` 호출은 **내부 단일 Promise 큐에 순차
체이닝**된다 — 본문의 "Ordering Guarantee"(FIFO)는 이 큐가 실제로
구현한다. 외부 호출 계약은 그대로다(fire-and-forget 허용, 반환 Promise를
await해도 됨).

## bootstrapMediaCache (D-020)

localStorage에서 복원되는 Page(앱 부팅 경로)는 `execute()`를 거치지
않으므로, 부팅 시 1회 `bootstrapMediaCache(pages)`를 호출해 캐시를
일괄로 채운다. 이 함수는 **dispatch도 History 기록도 하지 않는다** —
Mutation 경로가 아니라 캐시 부수효과만 수행하므로, 본문의 "Single Entry
Point" 원칙(모든 Mutation은 CommandBus 경유)과 충돌하지 않는다. 캐시
쓰기가 `preloadMedia()` 한 곳으로 모이는 원칙도 그대로 유지된다.

## 아직 구현되지 않은 개념

CommandExecutor / CommandRegistry / Composite Command / Transaction은
현재 코드에 존재하지 않는다(목표 구조). Lifecycle Hook은 범용 Registry가
아니라 **HistoryManager 전용 단일 슬롯**(`setHistoryHook`, `afterExecute`만)
으로 구현되어 있다 — D-018 참조.
