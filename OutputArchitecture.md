# OutputArchitecture.md

## Purpose

Output은 Domain 상태를 실제 화면에 전달하는 책임을 가진다.

본 문서는 Output의 책임 경계, 구독 방식, 확장 정책을 정의한다.

---

# Core Principle

## Domain Does Not Know Output

Domain은 출력 시스템의 존재를 알지 않는다.

Domain은 다음을 알지 않는다.

* BroadcastChannel
* output.html
* PreviewPanel
* Window
* OBS

---

## Output Does Not Know History

OutputController는 Undo/Redo 시스템의 존재를 알지 않는다.

OutputController는 자신이 구독한 Mutation(예: SET_LIVE_PAGE) 통지 시점의 상태만 사용한다(D-017).

---

## Renderer Does Not Know Output

Renderer는 출력 장치를 알지 않는다.

Renderer는 Domain을 해석하여 표현 가능한 형태로 변환한다.

표현 결과를 어디에 보내는지는 Output의 책임이다.

---

# Architecture

```text
AppStore
 ↓
Mutation 타입별 타겟 통지 (interestedMutations: SET_LIVE_PAGE 등)
 ↓
OutputController
 ↓
Renderer
 ↓
Output
 ↓
Display
```

---

# Responsibilities

## OutputController

* 관심 Mutation 타입 구독 (`interestedMutations`: SET_LIVE_PAGE 등)
* Live Page 조회
* Renderer 호출
* Output 전달 결정

OutputController의 책임이 아닌 것:

* Domain 수정
* 상태 변경
* 저장

---

## Renderer

* Domain을 해석한다
* Element 유형별 표현을 결정한다
* Layer 순서를 결정한다
* 출력 장치를 알지 않는다

예시:

```text
Video Element → Layer 0
Text Element  → Layer 1
```

Layer 결정은 Renderer 책임이다.

Domain은 Layer 개념을 포함하지 않는다.

---

## Output

* Renderer 결과를 실제 Display에 전달한다
* 출력 장치별로 독립적으로 존재한다

현재:

```text
BroadcastOutput
```

향후:

```text
WindowOutput
OBSOutput
NDIOutput
```

Output 추가 시 Renderer와 Domain은 수정하지 않는다.

---

# Subscription Model (D-017)

OutputController는 `SET_LIVE_PAGE` Mutation을 `interestedMutations`로 등록하여 구독한다. storeChanged 단일 브로드캐스트는 사용하지 않는다.

```text
SET_LIVE_PAGE Mutation 통지
 ↓
OutputController
 ↓
getLivePage()
 ↓
livePage 존재?
 ├─ Yes → Renderer → Output
 └─ No  → STANDBY 전송
```

---

# STANDBY

livePageId = null 이면 STANDBY 상태이다.

STANDBY 시 output.html은 대기 화면을 표시한다.

STANDBY는 Output의 기본 상태이다.

---

# BroadcastChannel Boundary

현재 Output 구현은 BroadcastChannel을 사용한다.

```text
OutputController
 ↓
BroadcastOutput
 ↓
BroadcastChannel
 ↓
output.html
```

BroadcastChannel은 Output 계층 내부에 존재한다.

AppStore와 Renderer는 BroadcastChannel을 알지 않는다.

---

# Video Playback

Video 재생 상태는 Domain에 포함하지 않는다.

다음은 Renderer 또는 Output의 책임이다.

* play / pause
* currentTime
* loop

---

# RenderModel

Renderer와 Output 사이의 별도 RenderModel 계층은 현재 도입하지 않는다.

다음 조건 중 하나가 만족될 경우 재검토한다.

* 다수 Output 동시 지원
* Layout Engine 도입
* Animation / Transition 도입
* Renderer 계산 비용 증가

---

# Future Compatibility

본 구조는 다음 기능을 지원할 수 있다.

* Stage Monitor Output
* Confidence Monitor Output
* OBS Output
* NDI Output
* Remote Output

Output 추가 시 AppStore, Domain, Renderer는 수정하지 않는다.