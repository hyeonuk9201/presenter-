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
* LivePreviewSubscriber
* OutputSubscriber

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
state.presentation.pageMap[pageId].elementIds.push(elementId)
state.session.live.livePageId = pageId
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
  assetRegistry,
  session
}
```

(2026 Amendment, D-014: 기존 `presenterState`는 `session`으로 명칭이 통합되었다. `assetRegistry`는 Phase 2 Element 모델 도입과 함께 추가된 최상위 루트이다.)

---

## presentation

저장 대상이다.

```js
{
  id,
  title,
  pageIds,
  pageMap,
  elementMap
}
```

Presentation Domain의 Single Source of Truth이다. (D-002 Amendment, Phase 2 Decisions "Presentation 최소화" 참조)

---

## assetRegistry

저장 대상이다.

Asset의 Single Source of Truth. assetIds와 assetMap으로 구성된다. 상세 구조는 AssetArchitecture.md를 따른다.

---

## session

런타임 전용 상태이다.

저장하지 않는다. 단, `session.persistence`는 D-015에 따라 본 Store의 Mutation 경로로 갱신하지 않는다(아래 "What AppStore Does Not Own" 섹션 참조).

```js
{
  selection: {
    selectedPageId,
    selectedElementIds
  },
  live: {
    livePageId
  },
  clipboard,
  textEditing,
  interaction,
  persistence
}
```

(D-014: 기존 `presenterState`가 이 구조로 흡수되었다.)

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

# History Boundary (D-018)

Store 진입 경로는 하나만 존재한다.

```text
Editor
 ↓
CommandBus
 ↓
AppStore
```

HistoryManager는 이 경로의 필수 경유 단계가 아니다. CommandBus의 beforeExecute / afterExecute Hook으로 등록되어 Mutation을 관찰할 뿐이며, 일반 Command 흐름을 가로채지 않는다.

```text
CommandBus
 ├─ (Hook) HistoryManager  ← 관찰만 함
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
HistoryManager → AppStore (직접 호출)
AppStore → HistoryManager
Editor → AppStore
```

AppStore는 History 시스템을 알지 않는다. HistoryManager도 AppStore 내부 구조를 알지 않는다. 둘은 Command를 통해서만 연결된다. (HistoryArchitecture.md, CommandBusArchitecture.md의 Lifecycle Hooks와 동일한 모델이다. 과거 버전에서 `CommandBus → HistoryManager → AppStore`로 그려졌던 다이어그램은 이 모델과 충돌하여 폐기되었다.)

---

# Subscriber Model (D-017)

storeChanged 단일 이벤트 브로드캐스트 방식은 사용하지 않는다.

각 Subscriber는 자신이 관심 있는 Mutation 타입을 `interestedMutations`로 선언하고, 해당 타입의 Mutation이 발생했을 때만 통지받는다. 상세 규칙은 StateMutationArchitecture.md / SubscriberArchitecture.md를 단일 출처로 한다.

```text
Mutation 발생
 ├─ interestedMutations에 ADD_PAGE 포함 → RenderSubscriber 통지
 ├─ interestedMutations에 SET_SELECTION 포함 → SelectionSubscriber 통지
 ├─ interestedMutations에 SET_LIVE_PAGE 포함 → LivePreviewSubscriber, OutputSubscriber 통지
 └─ PersistenceSubscriber는 자신이 만든 session.persistence Mutation에는 반응하지 않는다 (D-015)
```

각 구독자는 독립적으로 반응한다.

구독자 간 실행 순서에 의존하지 않도록 설계한다.

---

# Execution Order (D-017)

```text
dispatch(command)
 ↓
reduce(state, command)
 ↓
state 교체
 ↓
Mutation 타입별 타겟 통지
 ↓
interestedMutations에 해당하는 구독자만 실행
```

통지 대상 구독자 간 실행 순서는 보장하지 않는다.

실행 순서에 의존하는 로직은 AppStore 밖에서 조율한다.

(과거 버전의 단일 `storeChanged` 브로드캐스트 다이어그램은 StateMutationArchitecture.md의 "전체 재통지는 사용하지 않는다" 원칙과 충돌하여 폐기되었다.)

---

# What AppStore Does Not Own

AppStore가 소유하지 않는 것 (상태 저장이 아니라 로직/동작 차원에서):

* Undo/Redo 로직 (HistoryManager가 Hook으로 처리)
* 저장/복원 로직 (Persistence가 처리)
* 송출 제어 로직 (Output이 처리)
* Drag/Resize 계산 로직 (Editor/InteractionResolver가 처리, 결과만 `session.interaction`에 반영)
* Domain Command 목록 (Command Catalog는 Application Layer가 관리)

### Session은 AppStore가 상태를 보관하지만 로직을 소유하지 않는다

`session.selection`, `session.clipboard`, `session.textEditing`, `session.interaction`은 다른 Domain 상태(presentation, assetRegistry)와 동일하게 AppStore의 State Structure 안에 저장되고, CommandBus → AppStore 경로로 갱신된다(D-014). 다만 그 값을 "언제, 어떻게" 바꿀지 결정하는 로직(드래그 델타 계산, Hover 판정 등)은 Editor/InteractionResolver에 있다. 즉 AppStore는 Session의 **저장소**이지 **동작 주체**가 아니다.

`session.persistence`는 예외다. D-015에 따라 CommandBus/AppStore 경로를 거치지 않고 Persistence 모듈 내부 상태(또는 별도 PersistenceStatusStore)로 관리한다.

selectedPageId(`session.selection.selectedPageId`)와 livePageId(`session.live.livePageId`)는 AppStore의 State Structure 안에 있다. (과거 "Editor UI 상태", "임시 선택 상태"가 AppStore 소유가 아니라고 한 표현은 D-014로 대체되었다.)

---

# Future Compatibility

다음 기능이 추가되어도 AppStore는 수정하지 않는 것을 목표로 한다.

* HistoryManager 도입 또는 교체
* PersistenceSubscriber 교체
* OutputController 추가
* Plugin 시스템
* Macro 시스템
* Replay 시스템

AppStore의 변경 이유는 하나다.

```text
State 구조가 바뀔 때만 수정한다.
```
