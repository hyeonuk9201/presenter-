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

# Decisions (2026-07-03)

> 아래 3가지는 Review Notes(검토 의견)에서 시작해, 구현 착수 전에 결정으로 확정한 것이다.

## D-Editor-1. Section 소속 방식: 순서 기반 구간

Page.sectionId 같은 역참조 대신, `Presentation`에 별도 `sections` 배열을 둔다. 각 Section은 시작 Page의 id를 경계 마커로 가진다.

```js
sections: [
  { id, title, note, collapsed, color, startPageId },
  ...
]
```

"이 Page가 어느 Section에 속하는가"는 `pages` 배열 순서 위에서 계산한다 — `sections`를 `startPageId`가 `pages` 배열에서 나타나는 순서대로 정렬한 뒤, 각 구간을 "이 Section의 시작부터 다음 Section 시작 전까지"로 해석한다. 별도의 "끝 지점" 필드는 두지 않는다(중복 정보는 불일치 위험을 만든다).

Page.sectionId 역참조를 피한 이유는 DomainEntityArchitecture.md의 Element 역참조 금지 원칙과 결을 맞추기 위함이다. 또한 이 방식은 domain/Page.js를 전혀 건드리지 않는다 — 9-11에서 만든 로드 검증/마이그레이션 로직에 영향이 없다.

## D-Editor-2. Section 상태는 영속한다

`collapsed`/`color`/`note`/`title`은 새로고침 후에도 유지되어야 한다 — 운영자가 콘티를 접어둔 채로 준비하다 새로고침되면 다시 다 펼쳐지는 건 나쁜 UX다.

`PersistenceSubscriber`가 구독하는 Mutation 목록에 `SET_SECTIONS`를 추가한다(기존 `SET_PAGES`/`SET_TITLE`/`SET_SELECTION`/`SET_LIVE_PAGE`와 동렬). 저장 스냅샷에도 `sections` 필드가 추가된다 — Schema.js의 `CURRENT_SCHEMA_VERSION`을 올릴 이유는 아니다(필드 추가는 breaking change가 아니고, 버전 필드 없는 구 데이터도 `sections: []`로 안전하게 기본값 처리 가능).

## D-Editor-3. Page 이동 시 Section 소속은 위치가 결정한다(자동 편입)

D-Editor-1(순서 기반 구간)의 자연스러운 귀결이다. Page를 드래그해서 다른 Section의 범위 안으로 옮기면, 별도 재배정 로직 없이 자동으로 그 Section에 속하게 된다 — "소속"이라는 별도 상태가 없고 위치가 곧 소속이기 때문이다.

Page 삭제 시에도 별도 처리가 필요 없다 — `sections`는 `pages` 배열을 참조만 할 뿐 소유하지 않으므로, `pages`에서 Page가 사라지면 그 계산 결과에서도 자동으로 빠진다. 다만 한 가지 엣지 케이스는 처리가 필요하다: Section의 `startPageId`가 가리키던 Page 자체가 삭제되는 경우 — 이때는 그 Section의 시작점을 "삭제된 Page 다음으로 남은 Page"로 자동 재조정하거나(Section이 비지 않는 한), Section에 속한 Page가 하나도 안 남으면 Section 자체를 제거한다.


