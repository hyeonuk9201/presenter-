# DomainEntityArchitecture.md

# 목적

Presenter Domain을 구성하는 Entity와 Entity 간의 관계를 정의한다.

Domain Entity는 Presentation 문서를 표현하기 위한 데이터 구조이며,
Runtime State(Session, Selection, Interaction 등)는 포함하지 않는다.

---

# Core Principle

```text
Presentation
    ↓ owns
Page
    ↓ owns
Element
    ↓ references
AssetRegistry
    ↓ contains
Asset
```

Domain은 단방향 구조를 가진다.

상위 Entity는 하위 Entity를 소유(Ownership)할 수 있으며,
Asset는 Registry를 통해 참조(Reference)된다.

---

# Entity Hierarchy

```text
Presentation Aggregate
├─ pageIds
├─ pageMap
└─ elementMap

Asset Registry
├─ assetIds
└─ assetMap
```

Presentation Aggregate와 Asset Registry는 서로 독립적이다.

Element는 Asset을 직접 소유하지 않고 assetId로 참조한다.

---

# Presentation

## 목적

문서 전체를 표현하는 Aggregate Root.

Presentation은 모든 Page와 Element의 생명주기와 구조를 책임진다.

---

## 책임

* Page 생성
* Page 삭제
* Page 순서 관리
* Element 소유
* Element 이동
* Element 생명주기 관리

---

## 비책임

* Rendering
* Selection
* Clipboard
* Text Editing
* Interaction
* Persistence
* Asset 저장 방식

---

# Structure

```text
Presentation
├─ id
├─ title
├─ pageIds
├─ pageMap
└─ elementMap
```

---

# Single Source of Truth

```text
pageIds
```

Page 순서의 SSOT.

```text
pageMap
```

Page Entity 저장소.

```text
elementMap
```

Element Entity 저장소.

Element는 반드시 elementMap에만 존재한다.

---

# Page

## 목적

하나의 슬라이드 또는 문서를 표현한다.

---

# 책임

* Element 순서 관리
* z-order 관리
* Page 속성 관리

---

# 비책임

* Element 저장
* Element 생명주기 관리
* Rendering
* Selection

---

# Structure

```text
Page
├─ id
├─ elementIds
└─ properties
```

---

# Single Source of Truth

```text
elementIds
```

Element의 z-order를 결정한다.

Element 자체는 보관하지 않는다.

---

# Element

## 목적

Presentation 내부에서 표현되는 최소 단위.

예:

```text
Text
Shape
Image
Highlight
```

---

# 책임

* 자신의 데이터 보유
* 자신의 속성 보유
* 자신의 스타일 보유

---

# 비책임

* Page 관리
* z-order 관리
* Selection
* Rendering
* Asset 관리

---

# Structure

```text
Element
├─ id
├─ type
├─ props
└─ style
```

---

# Page Ownership Rule

Element는 pageId를 가지지 않는다.

금지:

```text
Element
└─ pageId
```

허용:

```text
Page
└─ elementIds
```

Page가 Element를 소유한다.

---

# Ownership

Ownership은 하위 Entity의 생명주기와 구조를 책임지는 관계이다.

```text
Presentation
    owns
        ↓
Page
    owns
        ↓
Element
```

---

# Ownership Rules

Presentation 삭제

↓

모든 Page 삭제

↓

모든 Element 삭제

상위 Entity는 하위 Entity의 생명주기를 책임진다.

---

# Asset

## 목적

외부 리소스를 표현하는 Registry Entity.

예:

```text
Image
Video
Audio
Font
Embedded Resource
```

Asset은 Presentation Aggregate에 속하지 않는다.

---

# Structure

```text
Asset
├─ id
├─ type
├─ source
├─ metadata
└─ status
```

---

# AssetRegistry

## 목적

Asset의 Single Source of Truth.

---

# Structure

```text
AssetRegistry
├─ assetIds
└─ assetMap
```

---

# 책임

* Asset 생성
* Asset 등록
* Asset 조회
* Asset 제거
* Unused Asset 관리

---

# 비책임

* Page 관리
* Element 관리
* Rendering
* Selection
* Layout
* Undo/Redo

---

# Reference

Reference는 생명주기를 소유하지 않고 ID로 참조하는 관계이다.

```text
Element
    ↓ assetId
AssetRegistry
    ↓
Asset
```

Element는 Asset을 소유하지 않는다.

Element는 assetId를 통해 Asset을 참조만 한다.

---

# Reference Rules

허용:

```text
Element
    ↓
AssetRegistry
    ↓
Asset
```

금지:

```text
Asset
    ↓
Element

Asset
    ↓
Page

Asset
    ↓
Presentation
```

Asset은 상위 Domain Entity를 알지 못한다.

---

# Dependency Rules

허용:

```text
Presentation
    ↓
Page
    ↓
Element
    ↓
AssetRegistry
    ↓
Asset
```

금지:

```text
Page
    ↓
Presentation

Element
    ↓
Page

Asset
    ↓
Element

Asset
    ↓
Presentation
```

모든 Dependency는 단방향이어야 한다.

---

# Minimal Modification Responsibility

외부 리소스 변경은 Asset만 수정되어야 한다.

예:

```text
logo.png
↓
logo_v2.png
```

수정:

```text
Asset
```

수정 없음:

```text
Presentation
Page
Element
```

AssetRegistry는 최소 수정 책임(Minimal Modification Responsibility)을 유지하기 위한 구조이다.

---

# Decision

```text
Presentation
    = Aggregate Root

Page
    = Presentation Child Entity

Element
    = Presentation Child Entity

Asset
    = Registry Entity

AssetRegistry
    = Asset SSOT

Element
    = assetId reference only
```
