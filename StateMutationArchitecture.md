# StateMutationArchitecture.md

# 목적

User Intent가 State 변경으로 변환되고, 변경된 State가 Subscriber와 Renderer에 전파되는 흐름을 정의한다.

---

# Flow

User Intent
↓
Payload
↓
CommandBus
↓
Command
↓
Mutation[]
↓
AppStore.applyMutations()
↓
Subscribers
↓
Renderer
↓
Outputs

---

# Mutation

State 변경은 Mutation 단위로 표현한다.

예:

* ADD_PAGE
* DELETE_PAGE
* ADD_ELEMENT
* UPDATE_ELEMENT
* DELETE_ELEMENT
* SET_SELECTION
* SET_LIVE_PAGE

Command는 State를 직접 수정하지 않는다.

Command는 Mutation을 생성한다.

AppStore만 State를 변경할 수 있다.

---

# AppStore

AppStore는 Mutation을 적용한다.

Responsibilities

* Mutation 적용
* State 업데이트
* Subscriber 통지

Non-Responsibilities

* User Intent 해석
* Undo 관리
* Persistence 관리
* Output 관리

---

# Subscriber Notification

Subscriber는 Mutation 기반으로 통지된다.

예:

SET_LIVE_PAGE
↓
OutputSubscriber
LivePreviewSubscriber

UPDATE_ELEMENT
↓
SelectionSubscriber
RendererSubscriber

stateChanged 방식의 전체 재통지는 사용하지 않는다.

---

# Invariants

* State 변경은 AppStore에서만 발생한다.
* Command는 Mutation만 생성한다.
* Subscriber는 State를 직접 수정하지 않는다.
* Output은 State를 소유하지 않는다.
* 모든 Output은 Store를 구독한다.
