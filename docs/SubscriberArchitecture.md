# SubscriberArchitecture.md

# 목적

State 변경을 관심 있는 시스템에 전달하는 구조를 정의한다.

Subscriber는 Mutation과 State를 입력으로 받아 필요한 후속 작업을 수행한다.

---

# Flow

AppStore.applyMutations()
↓
State 변경
↓
Subscriber Notification

---

# Subscriber Interface

Subscriber
├─ id
├─ interestedMutations
└─ notify(mutations, state)

---

# Notification

Subscriber는 다음 값을 전달받는다.

* mutations
* latestState

---

# Responsibilities

* State 읽기
* 후속 계산 수행
* Render 요청
* Output 요청
* 캐시 갱신

---

# Non-Responsibilities

* State 변경
* User Intent 해석
* Undo 관리
* Persistence 관리

---

# Invariants

AppStore만 State를 변경한다.

Subscriber는 State를 읽기만 한다.

Subscriber는 State를 직접 수정하지 않는다.

Subscriber는 관심 있는 Mutation에 대해서만 실행된다.
