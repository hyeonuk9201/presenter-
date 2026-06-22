# FutureDomain.md

> Status: Proposal
>
> 이 문서는 미래 Domain 방향성을 기록한다.
> 현재 구현을 의미하지 않는다.
> Decisions보다 우선순위가 낮다.

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

(주: 위 "Presentation └─ Assets[]" 직접 소유 구조는 이후 AssetArchitecture.md / DomainEntityArchitecture.md의 "Asset은 Presentation Aggregate에 속하지 않는다, AssetRegistry는 독립적이다" 결정으로 대체되었다. 현재 구조는 `AppState ├─ Presentation └─ AssetRegistry`이다, D-014 참조.)

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

아래 항목 중 일부는 이후 Decisions.md "Phase 2 Decisions"와 DomainEntityArchitecture.md / AssetArchitecture.md에서 이미 확정되었다. 더 이상 미결정 상태가 아니다.

확정됨 (해당 문서 참조):

- Element 저장 방식 → Page.elementIds + elementMap, Element.pageId 없음 ("Element 역참조 금지")
- zIndex 규칙 → 별도 zIndex 필드 없음, Page.elementIds 순서가 z-order ("z-order 정책")
- Asset 참조 방식 → Element는 assetId로만 참조, AssetRegistry가 SSOT (AssetArchitecture.md)

여전히 미결정:

- Layer 구조 (zIndex 외의 합성/그룹 구조)
- Layout 시스템
- Animation 시스템
- Renderer 구현 방식

해당 항목은 Output Architecture 단계에서 검토한다.