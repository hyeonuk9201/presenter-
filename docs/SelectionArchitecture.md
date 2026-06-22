# SelectionArchitecture.md

# 목적

Presenter의 선택(Selection) 상태와 불변 규칙(Invariant)을 정의한다.

Selection은 Domain Entity가 아닌 Runtime UI State이다.

저장 위치는 AppStore의 State Structure 안 `session` 하위이다(D-014). `selectedPageId`, `selectedElementIds`는 `session.selection`에 위치한다. `editingElementId`는 Editor Architecture.md 기준 `session.textEditing`에 속하고, `hoveredElementId`는 `session.interaction`에 속한다 — 네 가지를 모두 본 문서에서 함께 다루는 이유는 서로 간의 불변 규칙(아래 Delete Rules / Page Change Rules)을 한곳에서 검증하기 위함이며, 저장 위치가 모두 `session.selection` 하나라는 뜻은 아니다.

---

# Selection State

selectedPageId
selectedElementIds
editingElementId
hoveredElementId

---

# selectedPageId

현재 편집 중인 페이지.

Type

PageId | null

Rules

* 항상 0개 또는 1개만 존재한다.
* livePageId와 독립적으로 변경될 수 있다.

---

# selectedElementIds

현재 선택된 Element 집합.

Type

ElementId[]

Rules

* 0개 이상 선택 가능하다.
* 다중 선택을 허용한다.
* 중복을 허용하지 않는다.
* 순서는 의미를 가지지 않는다.

---

# editingElementId

현재 편집 중인 Element.

예:

* 텍스트 입력
* 인라인 편집

Type

ElementId | null

Rules

* 항상 0개 또는 1개만 존재한다.
* null이 아니면 selectedElementIds 안에 반드시 포함되어야 한다.

---

# hoveredElementId

마우스가 올라가 있는 Element.

Type

ElementId | null

Rules

* 항상 0개 또는 1개만 존재한다.
* Selection과 독립적으로 동작한다.

---

# Delete Rules

Element 삭제 시:

1. selectedElementIds에서 제거한다.
2. editingElementId와 같으면 null로 변경한다.
3. hoveredElementId와 같으면 null로 변경한다.

---

# Page Change Rules

selectedPageId 변경 시:

selectedElementIds = []
editingElementId = null
hoveredElementId = null

페이지 간 Selection은 공유하지 않는다.

---

# Selection Responsibilities

* 현재 선택 대상 관리
* 다중 선택 관리
* 편집 대상 관리
* Hover 대상 관리

---

# Non-Responsibilities

* Element 데이터 관리
* Undo 관리
* Persistence 관리
* Output 관리
