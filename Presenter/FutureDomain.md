:::writing{variant="document" id="90121"} # FutureDomain.md

> Status: Proposal > > 이 문서는 미래 Domain 방향성을 기록한다. > 현재 구현을 의미하지 않는다. > Decisions보다 우선순위가 낮다.

---

# Motivation

Presenter는 장기적으로 다음 콘텐츠를 함께 다루는 것을 목표로 한다.

- Text - Image - Video

또한 Cloud 기반보다 Local First 환경을 우선한다.

예:

- PC 저장소 - 외장 SSD - USB 저장소

---

# Domain Principle

Domain은 무엇을 표시하는지를 표현한다.

Rendering은 어떻게 표시하는지를 표현한다.

Layer, zIndex, Layout, Animation은 Domain에 포함하지 않는다.

---

# Proposed Model

Presentation ├─ Pages[] └─ Assets[]

Page └─ Elements[]

Element ├─ Text Element ├─ Image Element └─ Video Element

Asset ├─ Image File └─ Video File

---

# Responsibilities

## Presentation

행사 전체를 표현한다.

Presentation은 다음을 관리한다.

- Pages - Assets

---

## Page

송출 가능한 최소 단위이다.

예:

- 찬양 1절 - 찬양 후렴 - 광고 화면 - 영상 화면

Page는 하나 이상의 Element로 구성된다.

---

## Element

Page를 구성하는 표현 요소이다.

예:

- Text Element - Image Element - Video Element

Text, Image, Video는 Page의 종류가 아니다.

Element의 종류이다.

Element는 실제 파일을 소유하지 않는다.

---

## Asset

Presentation이 사용하는 외부 리소스이다.

예:

- worship-bg.mp4 - intro.mp4 - poster.png

Asset은 실제 파일 정보를 관리한다.

Element는 Asset을 참조할 수 있다.

---

# Example

Asset └─ worship-bg.mp4

Page 1 ├─ VideoElement(assetId=1) └─ TextElement("1절")

Page 2 ├─ VideoElement(assetId=1) └─ TextElement("2절")

Page 3 ├─ VideoElement(assetId=1) └─ TextElement("후렴")

동일 Asset을 여러 Page에서 재사용할 수 있다.

---

# Deferred Decisions

다음 항목은 아직 결정하지 않는다.

- Element 저장 방식 - Asset 참조 방식 - Layer 구조 - zIndex 규칙 - Layout 시스템 - Animation 시스템 - Renderer 구현 방식

해당 항목은 Output Architecture 단계에서 검토한다. :::