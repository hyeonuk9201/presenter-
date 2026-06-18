# PersistenceArchitecture.md

# 목적

Persistence는 AppStore Runtime State를 영속 저장소에 저장하고 복원하기 위한 I/O 계층이다.

Persistence는 Store의 Consumer이며 Runtime State의 소유자가 아니다.

---

# 책임

* Store 변경 감지
* 저장 요청 발생
* Runtime State → Snapshot 직렬화
* Snapshot 저장 및 로드
* Dirty State 관리
* 저장 정책(Auto Save, Manual Save) 지원

---

# 비책임

* State Mutation
* Renderer 호출
* Undo/Redo
* Import/Export
* Domain Entity 생성
* Presentation 구조 관리

---

# Core Principle

Persistence는 Store의 하위 Consumer이다.

```text
CommandBus
    ↓
AppStore
    ↓
Subscribers
       ├─ RenderSubscriber
       └─ PersistenceSubscriber
```

Persistence가 Store를 수정해서는 안 된다.

금지:

```text
Persistence
    ↓
AppStore Mutation
```

허용:

```text
AppStore
    ↓
Persistence
```

---

# Architecture

```text
AppStore
    ↓
PersistenceSubscriber
    ↓
Serializer
    ↓
StorageAdapter
```

Dependency는 단방향이어야 한다.

---

# Persistence Workflow

```text
CommandBus
      ↓
AppStore
      ↓
State Mutation
      ↓
storeChanged
      ↓
PersistenceSubscriber
      ↓
Serializer
      ↓
Snapshot
      ↓
StorageAdapter
      ↓
Save Complete
      ↓
PersistenceState Update
```

Persistence는 Store 변경 이후에만 동작한다.

---

# PersistenceSubscriber

## 책임

* storeChanged 구독
* 저장 요청 발생
* Save Scheduling
* Dirty State 관리

## 비책임

* JSON 생성
* Storage 접근
* Import
* Export
* Renderer 호출
* Undo/Redo

---

# Serializer

## 목적

Runtime State와 Persistence Schema를 분리한다.

```text
Runtime State
      ↓
Serializer
      ↓
Serializable Snapshot
```

## 책임

* Runtime State 읽기
* Snapshot 생성
* Snapshot 복원

## 비책임

* Storage 접근
* Save Scheduling
* File I/O
* LocalStorage
* IndexedDB

---

# StorageAdapter

## 목적

Snapshot 저장소 접근을 추상화한다.

```text
Snapshot
     ↓
StorageAdapter
     ↓
Storage
```

## 책임

* save(snapshot)
* load()
* remove()
* exists()

## 비책임

* State 구조 이해
* Page 관리
* Element 관리
* Undo/Redo
* Rendering

---

# Storage Independence

StorageAdapter 교체가 AppStore와 Serializer에 영향을 주어서는 안 된다.

```text
localStorage
IndexedDB
File System
Cloud Storage
```

모두 동일한 인터페이스로 취급한다.

---

# Dirty State

Dirty State는 Runtime 정보이며 저장 대상이 아니다.

```text
Store Changed
      ↓
isDirty = true
      ↓
Save Success
      ↓
isDirty = false
```

---

# PersistenceState

Persistence 관련 Runtime 상태는 Session 하위에 위치한다.

```text
Session
    └─ PersistenceState
```

예시:

```text
PersistenceState
    ├─ isDirty
    ├─ lastSavedAt
    ├─ saveStatus
    └─ pendingSave
```

PersistenceState는 Snapshot에 포함되지 않는다.

---

# Save Policy

Persistence는 저장 정책을 강제하지 않는다.

지원 가능한 정책:

## Immediate Save

```text
Mutation
    ↓
Save
```

## Debounced Save

```text
Mutation
    ↓
Dirty
    ↓
Delay
    ↓
Save
```

## Manual Save

```text
Mutation
    ↓
Dirty
    ↓
User Save Action
```

Presenter는 정책 변경이 AppStore와 Serializer에 영향을 주지 않아야 한다.

---

# Dependency Rules

허용:

```text
AppStore
    ↓
PersistenceSubscriber
    ↓
Serializer
    ↓
StorageAdapter
```

금지:

```text
StorageAdapter
    ↓
Serializer

Serializer
    ↓
AppStore

PersistenceSubscriber
    ↓
Mutation
```

모든 Dependency는 단방향이어야 한다.

---

# Asset Persistence

Asset는 Snapshot 대상이다.

```text
Snapshot
├─ presentation
└─ assets
```

Runtime Asset 상태는 저장하지 않는다.

예:

```text
loading
upload progress
temporary cache
```
---

# Asset Persistence

Asset는 Snapshot 대상이다.

```text
Snapshot
├─ presentation
└─ assets
```

Runtime Asset 상태는 저장하지 않는다.

예:

```text
loading
upload progress
temporary cache
```

Asset Persistence는 AssetRegistry를 통해 수행된다.

```text
AssetRegistry
      ↓
Serializer
      ↓
Snapshot.assets
```

Element는 Asset의 저장 위치를 알지 않는다.

Element는 assetId를 통해 Asset을 참조만 한다.

