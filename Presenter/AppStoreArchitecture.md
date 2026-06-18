# AppStoreArchitecture.md

## Purpose

AppStore는 Application State의 Single Source of Truth(SSOT)이다.

AppStore의 책임은 상태 저장과 변경 통지이다.

AppStore의 변경 이유는 하나다.

```text
State 구조가 바뀔 때만 수정한다.
```

---

# Core Principles

## AppStore Does Not Know History

AppStore는 Undo/Redo 시스템의 존재를 알지 않는다.

AppStore는 다음을 알지 않는다.

* HistoryManager
* Undo Stack
* Redo Stack
* User Intent
* History Entry 구조

AppStore의 책임은 상태 변경뿐이다.

---

## AppStore Does Not Know Persistence

AppStore는 저장 시스템의 존재를 알지 않는다.

AppStore는 다음을 알지 않는다.

* localStorage
* IndexedDB
* 파일 시스템
* 저장 시점
* 저장 대상

---

## AppStore Does Not Know Output

AppStore는 출력 시스템의 존재를 알지 않는다.

AppStore는 다음을 알지 않는다.

* BroadcastChannel
* output.html
* PreviewPanel
* OutputController

---

## Derived Data Is Not Stored

계산 가능한 데이터는 Store에 저장하지 않는다.

예시:

```js
getSelectedPage()
getLivePage()
```

는 계산 함수이다.

Store에는 객체 자체를 저장하지 않는다.

허용:

```js
selectedPageId
livePageId
```

금지:

```js
selectedPage
livePage
```

---

## State Is Serializable

State는 직렬화 가능한 데이터만 가진다.

허용:

* Object
* Array
* String
* Number
* Boolean
* null

금지:

* Function
* DOM Element
* Timer
* Window
* BroadcastChannel
* Class Instance

이 원칙은 다음 기능을 단순하게 만든다.

* Persistence
* Undo/Redo
* Replay
* Plugin
* Import/Export

---

# Store API

AppStore가 외부에 공개하는 API는 세 가지이다.

```js
dispatch(command)
getState()
subscribe(listener)
```

AppStore는 이 외의 진입점을 제공하지 않는다.

---

## dispatch(command)

상태 변경 요청이다.

모든 상태 변경은 dispatch를 통해서만 수행한다.

예시:

```js
dispatch(new AddPageCommand(page))
dispatch(new GoLiveCommand(pageId))
```

직접 수정은 금지한다.

금지:

```js
state.presentation.pages.push(page)
state.presenterState.livePageId = pageId
```

---

## getState()

현재 상태를 반환한다.

반환된 State는 읽기 전용으로 취급한다.

직접 수정하지 않는다.

---

## subscribe(listener)

상태 변경 시 호출되는 리스너를 등록한다.

```js
subscribe(({ command, state }) => {
  // 상태 변경 감지
})
```

상태가 변경되지 않으면 이벤트를 발행하지 않는다.

---

# State Structure

```js
{
  presentation,
  presenterState
}
```

---

## presentation

저장 대상이다.

```js
{
  id,
  title,
  pages
}
```

Presentation Domain의 Single Source of Truth이다.

---

## presenterState

런타임 전용 상태이다.

저장하지 않는다.

예시:

```js
{
  selectedPageId,
  livePageId
}
```

---

# Reducer

AppStore는 Reducer를 통해서만 상태를 변경한다.

```js
nextState = reduce(currentState, command)
```

Reducer는 순수 함수(Pure Function)이다.

동일한 입력에 동일한 출력을 보장한다.

부작용이 없다.

Reducer는 입력 State를 직접 수정하지 않는다.

Reducer는 항상 새로운 State를 반환한다.

---

# History Boundary

Store 진입 경로는 하나만 존재한다.

```text
Editor
 ↓
CommandBus
 ↓
HistoryManager
 ↓
AppStore
```

Undo:

```text
HistoryManager
 ↓
CommandBus
 ↓
AppStore
```

Redo:

```text
HistoryManager
 ↓
CommandBus
 ↓
AppStore
```

허용:

```text
CommandBus → AppStore
```

금지:

```text
HistoryManager → AppStore
AppStore → HistoryManager
Editor → AppStore
```

AppStore는 History 시스템을 알지 않는다.

---

# Subscriber Model

storeChanged는 단일 이벤트이다.

```text
storeChanged
 ├─ CueList
 ├─ PreviewPanel
 ├─ PersistenceManager
 └─ OutputController
```

각 구독자는 독립적으로 반응한다.

구독자 간 실행 순서에 의존하지 않도록 설계한다.

---

# Execution Order

```text
dispatch(command)
 ↓
reduce(state, command)
 ↓
state 교체
 ↓
storeChanged 발행
 ↓
구독자 일괄 통지
```

storeChanged 이후 구독자 실행 순서는 보장하지 않는다.

실행 순서에 의존하는 로직은 AppStore 밖에서 조율한다.

---

# What AppStore Does Not Own

AppStore가 소유하지 않는 것:

* Undo/Redo 로직
* 저장/복원 로직
* 송출 제어 로직
* Editor UI 상태
* Hover 상태
* Drag 상태
* 임시 선택 상태
* Tool 상태
* Domain Command 목록

Page Selection(`selectedPageId`)은 presenterState가 소유한다.

---

# Future Compatibility

다음 기능이 추가되어도 AppStore는 수정하지 않는 것을 목표로 한다.

* HistoryManager 도입 또는 교체
* PersistenceManager 교체
* OutputController 추가
* Plugin 시스템
* Macro 시스템
* Replay 시스템

AppStore의 변경 이유는 하나다.

```text
State 구조가 바뀔 때만 수정한다.
```
