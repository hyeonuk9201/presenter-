# FutureEditor.md

> Status: Proposal
>
> 이 문서는 미래 Editor 방향성을 기록한다.
> 현재 구현을 의미하지 않는다.
> FutureDomain보다 구현 우선순위가 낮다.

---

# Motivation

Presentation의 Page 수가 많아질수록 운영자가 전체 흐름을 이해하기 어려워진다.

Editor는 단순히 Page를 편집하는 도구를 넘어, Presentation의 구조(콘티)를 이해하고 관리할 수 있어야 한다.

---

# Editor Outline

Editor는 Presentation을 Outline 형태로 표시할 수 있다.

예:

```
▼ Opening
  Intro

▼ Praise
  Verse 1
  Verse 2
  Chorus

▼ Sermon
  Title
  Scripture

▼ Ending
  Blessing
```

Outline은 Editor 전용 표현이며 Domain에는 영향을 주지 않는다.

---

# Section

Section은 Page를 그룹화하는 Editor 개념이다.

Section은 송출 단위가 아니다. Page가 여전히 송출 가능한 최소 단위이다.

Section은 다음 정보를 가질 수 있다.

- title
- note
- collapsed
- color

Section은 Page의 순서를 변경하지 않는다.

## Section의 목적

- 콘티 구조 표현
- 운영 흐름 이해
- 대량 Page 탐색
- 빠른 이동

---

# Thumbnail View

Outline은 Page를 다음 형태로 표시할 수 있다.

- Text Preview
- Thumbnail
- Compact View

초기 구현에서는 첫 줄 텍스트만 표시한다(Text Preview).

---

# Future Features

필요 시 다음 기능을 추가할 수 있다.

- 접기 / 펼치기
- Drag & Drop
- Section 메모
- Section 색상
- Section 단위 복사
- 검색
- 즐겨찾기

---

# Concept

1. Editor는 Domain을 변경하지 않고도 Presentation을 다양한 방식으로 표현할 수 있다. Outline은 그중 하나이다.
2. Section은 운영 단위(Operational Unit)를 표현하기 위한 Editor 개념이다.

---

# Review Notes (Claude)

> 아래는 원본 브레인스토밍 내용이 아니라, 검토 중 든 생각을 별도로 덧붙인 것이다.
> 결정된 사항이 아니라 실제 구현 시 확인이 필요한 지점들이다.

## Section 소속 방식이 아직 정해지지 않음

"Section은 Editor 개념, Domain에 영향 없음" 원칙(FutureDomain.md의 "Layer/zIndex/Layout은 Domain에 포함하지 않는다"와 같은 결) 자체는 기존 아키텍처와 잘 맞는다. 다만 "어떤 Page가 어떤 Section에 속하는가"를 어떻게 표현할지는 이 문서에 없다. 크게 두 방향이 있다.

- **Page 순서 기반 구간(range)**: Section을 "N번째 Page부터 M번째 Page까지"로 표현. `Page.elementIds` 순서가 z-order인 것처럼, `Presentation.pages` 배열 순서 + 별도 경계 마커 배열(예: `sectionBoundaries: [{ pageId, title, collapsed, color }]`)로 표현하는 방식. Domain(Page)에 필드를 안 넣는다는 원칙과 가장 잘 맞는다.
- **역참조(Page.sectionId)**: Page가 자신이 속한 Section을 직접 참조. 구현은 더 단순하지만, DomainEntityArchitecture.md의 "Element 역참조 금지" 원칙과 결이 다르다 — Section도 같은 이유로 역참조를 피하는 게 일관적일 것 같다.

전자(순서 기반 구간)가 기존 결정들과 더 일관되어 보인다는 게 개인적인 의견이다.

## Section 상태(collapsed 등)의 영속 여부

Section이 `collapsed`/`color`/`note` 같은 상태를 가질 수 있다고 되어 있는데, 이게 새로고침 후에도 유지되어야 하는지(영속) 아니면 세션 동안만 유지되는 Editor 휘발성 상태인지가 불명확하다. 영속이 필요하다면 `PersistenceSubscriber`가 구독하는 Mutation 목록(현재 `SET_PAGES`/`SET_TITLE`/`SET_SELECTION`/`SET_LIVE_PAGE`)에 새 항목이 추가되어야 한다 — 실제 구현 시 놓치기 쉬운 지점이라 미리 남겨둔다.

## Page 삭제/재정렬 시 Section 경계 무결성

Section이 Page 배열의 위치에 종속된 구조를 택한다면, Page 삭제나 순서 변경(드래그 재정렬) 시 Section 경계가 깨지지 않도록 하는 로직이 필요하다. 지금 범위 밖이지만, 위 "Page 순서 기반 구간" 방식을 택할 경우 이 부분이 실제 구현 난이도의 대부분을 차지할 가능성이 높다.

