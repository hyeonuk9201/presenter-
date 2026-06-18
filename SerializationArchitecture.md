# SerializationArchitecture.md

# 목적

Serialization은 Runtime State와 Persistence Schema를 분리하기 위한 경계(Boundary) 계층이다.

Serializer는 AppStore Runtime State를 직접 저장하지 않고,
Persistence용 Snapshot으로 변환한다.

---

# Core Principle

```text
Runtime State
      ↓
Serializer
      ↓
Snapshot
```

Serializer는 Runtime 구조와 저장 포맷을 분리한다.

---

# 책임

* Runtime State → Snapshot 변환
* Snapshot → Runtime State 복원
* Snapshot Version 확인
* Migration Pipeline 진입점 제공

---

# 비책임

* Storage 접근
* Save Scheduling
* Auto Save
* Import
* Export
* State Mutation
* Renderer 호출

---

# Architecture

```text
AppStore State
      ↓
Serializer
      ↓
Snapshot
      ↓
StorageAdapter
```

Serializer는 Snapshot 생성만 담당한다.

---

# Runtime State ≠ Persistence State

Runtime State와 Persistence State는 동일하지 않다.

금지:

```text
JSON.stringify(AppStore)
```

허용:

```text
AppStore
      ↓
Serializer
      ↓
Snapshot
```

---

# Snapshot Boundary

## Persistable State

```text
Presentation
PageIds
PageMap
ElementMap
Assets
Metadata
```

---

## Runtime State

```text
Session
Selection
Clipboard
TextEditing
InteractionState
History
PersistenceState
```

Runtime State는 Snapshot에 포함되지 않는다.

---

# Snapshot Principle

Snapshot은 문서(Document)를 복원하기 위한 데이터이다.

Snapshot은 Runtime Session을 저장하지 않는다.

---

# Snapshot Version

모든 Snapshot은 Version을 가진다.

```text
Snapshot
 ├─ version
 └─ document
```

Version이 없는 Snapshot은 허용하지 않는다.

---

# Version Rule

Serializer는 항상 Latest Snapshot Schema만 생성한다.

```text
Serializer
      ↓
Latest Snapshot
```

구버전 Snapshot 생성은 지원하지 않는다.

---

# Migration Rule

```text
Load
 ↓
Version Check
 ↓
Migration
 ↓
Latest Snapshot
 ↓
Deserialize
```

Serializer는 Latest Snapshot만 이해한다.

---

# Dependency

```text
StorageAdapter
      ↓
Snapshot
      ↓
Migration
      ↓
Serializer
      ↓
AppStore
```

Dependency는 역방향 참조를 허용하지 않는다.

---

# Stability Rule

다음 변경은 Snapshot Version 증가 없이 가능해야 한다.

```text
SelectionState 변경
InteractionState 변경
History 구조 변경
PersistenceState 변경
```

---

# Breaking Change Rule

다음 변경은 Snapshot Version 증가를 고려한다.

```text
Presentation 구조 변경
Page 구조 변경
Element Schema 변경
Asset Schema 변경
Document Metadata 변경
```

---

# Serializer Contract

Serializer는 다음 계약을 만족해야 한다.

```text
serialize(state)
      ↓
Snapshot

deserialize(snapshot)
      ↓
Runtime State
```

Serializer는 Snapshot 외부의 정보를 요구해서는 안 된다.

---

# Future Compatibility

Snapshot은 다음 기능 추가를 허용해야 한다.

```text
Import
Export
Cloud Sync
Collaboration
Version Migration
```

새로운 기능 추가가 기존 Snapshot을 깨뜨려서는 안 된다.
