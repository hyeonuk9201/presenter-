# AssetArchitecture.md

# 목적

Asset은 외부 리소스를 Domain으로부터 분리하여 관리하기 위한 Registry 계층이다.

Asset의 목적은 외부 리소스 변경 시 최소 수정 책임(Minimal Modification Responsibility)을 유지하는 것이다.

---

# Core Principle

```text
Presentation
 ↓
Page
 ↓
Element
 ↓
assetId
 ↓
AssetRegistry
 ↓
Asset
```

모든 Asset 접근은 Registry를 통해서만 이루어진다.

---

# Architecture Position

Asset은 Presentation Aggregate 외부의 Registry Entity이다.

```text
Presentation Aggregate
    └─ references
           ↓
      Asset Registry
```

Asset은 Aggregate Root가 아니다.

Asset은 Element에 의해 참조되는 Registry Entity이다.

---

# Ownership

## owns

```text
Presentation
 ↓
Page
 ↓
Element
```

## references

```text
Element
 ↓
assetId
 ↓
Asset
```

Element는 Asset을 소유하지 않는다.

Element는 assetId로 참조만 한다.

---

# Asset Entity

```text
Asset
├─ id
├─ type
├─ source
├─ metadata
└─ status
```

---

# id

Asset 식별자.

---

# type

예:

```text
image
video
audio
font
embedded
```

---

# source

외부 리소스 위치.

예:

```text
blob
data url
file path
remote url
embedded data
```

구현 방식은 Asset 내부에 은닉한다.

---

# metadata

예:

```text
width
height
mimeType
size
duration
thumbnail
```

Asset 종류에 따라 선택적으로 존재한다.

---

# status

예:

```text
loading
ready
failed
missing
```

status는 Runtime 상태이며 Persistence 대상이 아니다.

---

# AssetRegistry

## 목적

Asset의 Single Source of Truth를 제공한다.

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
* Asset 참조 관리
* Unused Asset 관리

---

# 비책임

* Page 관리
* Element 관리
* Rendering
* Undo/Redo
* Selection
* Layout

---

# Dependency Rules

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

Asset는 상위 Domain을 알지 못한다.

---

# Lifecycle

## Create

```text
Import
 ↓
Asset 생성
 ↓
AssetRegistry 등록
 ↓
assetId 반환
 ↓
Element 연결
```

---

## Read

```text
Element
 ↓
assetId
 ↓
AssetRegistry
 ↓
Asset
```

---

## Update

```text
Asset 수정
```

Element 수정은 발생하지 않는다.

---

## Delete

```text
Delete Elements
 ↓
Unused Asset
 ↓
GC
```

Asset는 참조되지 않을 때 제거될 수 있다.

---

# Garbage Collection

```text
referenceCount == 0
```

↓

```text
Unused Asset
```

↓

```text
GC Candidate
```

GC 책임은 AssetRegistry가 가진다.

---

# Persistence

Asset는 Snapshot 대상이다.

```text
Snapshot
├─ presentation
└─ assets
```

Runtime 정보는 저장하지 않는다.

예:

```text
loading
upload progress
temporary cache
```

---

# Import

```text
External Resource
 ↓
Asset
 ↓
AssetRegistry
 ↓
assetId
 ↓
Element
```

---

# Export

```text
Element
 ↓
assetId
 ↓
AssetRegistry
 ↓
Asset
 ↓
Exporter
```

Element는 Asset의 실제 저장 위치를 알지 않는다.

---

# Decision

```text
Asset
= Registry Entity

AssetRegistry
= Asset SSOT

Element
= assetId reference only
```
