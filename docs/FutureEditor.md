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

## D-Editor-1. Section 소속 방식: 순서 기반 구간 (폐기 — D-Editor-4로 대체됨, 2026-07-04)

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

> **각주 (2026-07-04, D-Editor-4 예고)**: "Section 상태는 영속한다"는 원칙 자체는 D-Editor-4 이후에도 그대로 유지된다. 다만 저장되는 필드 모양이 `sections: []` → `sectionIds: []` + `sectionMap: {}`로 바뀌고, `Page`에도 `sectionId` 필드가 추가되어 함께 영속되어야 한다. 이번엔 필드 추가가 아니라 구조 자체의 변경이라, 실제 구현 시점에는 `CURRENT_SCHEMA_VERSION`을 올리고 `migrateSnapshot()`에 v1→v2 변환을 추가해야 한다(위 문단의 "버전 안 올려도 된다"는 결론은 D-Editor-1 구조 한정이며, D-Editor-4에는 적용되지 않는다).

## D-Editor-3. Page 이동 시 Section 소속은 위치가 결정한다(자동 편입) (폐기 — D-Editor-4로 대체됨, 2026-07-04)

D-Editor-1(순서 기반 구간)의 자연스러운 귀결이다. Page를 드래그해서 다른 Section의 범위 안으로 옮기면, 별도 재배정 로직 없이 자동으로 그 Section에 속하게 된다 — "소속"이라는 별도 상태가 없고 위치가 곧 소속이기 때문이다.

Page 삭제 시에도 별도 처리가 필요 없다 — `sections`는 `pages` 배열을 참조만 할 뿐 소유하지 않으므로, `pages`에서 Page가 사라지면 그 계산 결과에서도 자동으로 빠진다. 다만 한 가지 엣지 케이스는 처리가 필요하다: Section의 `startPageId`가 가리키던 Page 자체가 삭제되는 경우 — 이때는 그 Section의 시작점을 "삭제된 Page 다음으로 남은 Page"로 자동 재조정하거나(Section이 비지 않는 한), Section에 속한 Page가 하나도 안 남으면 Section 자체를 제거한다.

## D-Editor-4. Page 중심 소속 모델로 전환 (Supersedes D-Editor-1, D-Editor-3)

> 배경/논의 과정은 `Research/2026-07-04 Workflow Separation.md` 참조. 이
> 절은 그 논의에서 실제로 채택되어 구현 범위로 승격된 결정만 기록한다 —
> 논의 자체(왜 이렇게 결론났는지의 서사)는 중복 기록하지 않는다.
>
> **이 결정은 아직 구현되지 않았다 (2026-07-04 기준, 방향만 확정).**
> 실제 코드 반영 여부는 `CurrentState.md`, 남은 작업은 `TODO.md`를 확인할 것.

### 결정

`Page.sectionId` 역참조를 도입한다. Section은 더 이상 Page 구간을
계산하는 대상이 아니라, 순수 grouping metadata로 단순화한다.

```ts
Page {
  id: string
  sectionId: string | null   // null = 미분류
  ...
}

Section {
  id: string
  title: string
  note: string
  collapsed: boolean
  color: string | null
  // startPageId 없음 — 더 이상 위치를 스스로 정의하지 않는다
}

Presentation {
  pages: Page[]          // 여전히 Live Order의 SSOT (변경 없음)
  sectionIds: string[]   // Section 표시 순서 SSOT (신규)
  sectionMap: { [id]: Section }
}
```

D-Editor-1이 명시적으로 피하려 했던 "Page.sectionId 역참조"를 이번에
정면으로 채택한다 — `DomainEntityArchitecture.md`의 Element 역참조 금지
원칙과 모순되는 것처럼 보일 수 있으나, 그 원칙의 적용 범위는 Domain
Entity 계층(Element/Asset)이며 Section은 Editor 개념(이 문서 상단 "Section"
절 참조)이라 스코프 밖이다 — 이 구분을 여기 명시해 둔다, 안 그러면 나중에
"왜 Element는 금지고 Page-Section은 허용인가"라는 혼란이 재발한다.

### 세부 규칙 (2026-07-04 확정)

1. **Section 간 이동**: `sectionId` 변경 시 Page는 기본적으로 대상
   Section의 끝으로 이동한다(Flow View 표시 순서 정렬 유지). `sectionId`
   변경만 하고 위치를 그대로 두지 않는다 — 그러면 Flow View 그룹 표시와
   실제 진행 순서가 어긋난다.
2. **Section 순서 SSOT**: `sectionIds` 배열을 Presentation의 SSOT로
   쓴다. `sectionMap`은 저장소일 뿐, 표시 순서를 결정하지 않는다.
3. **Section 삭제 정책**: Section 삭제 시 그 안에 속해 있던 Page는
   `sectionId = null`(미분류)로 되돌린다. 인접 Section에 병합하지 않는다
   (병합은 "인접"의 정의가 애매해지고, 사용자가 예상 못 한 곳으로 Page가
   옮겨가는 결과를 만든다).
4. **Flow/Live 정합성**: Flow View의 렌더링 순서는 항상 `pages[]` 기준이며,
   UI grouping은 `sectionId`로만 표현한다. 두 구조(순서/그룹)는 개념적으로
   분리되지만, Flow View는 항상 Live Order를 따른다 — 이 원칙이 깨지면
   화면에 보이는 진행 순서와 실제 송출 순서가 어긋나는 실사용 리스크가
   생긴다(행사 진행 중 오조작 위험).
5. **자동 흡수 (Contiguity 보장)**: 순수 위치 이동(`sectionId`를 직접
   바꾸지 않는 이동, 예: 향후 Content Browser의 재정렬)이 일어나면, 이동한
   Page의 `sectionId`를 새 이웃(앞/뒤 Page)의 `sectionId`로 자동
   재계산한다. Section이 `pages[]` 안에서 여러 조각으로 파편화되는 상태를
   정상으로 허용하지 않는다 — Flow View에 같은 Section이 두 번 나타나는
   것을 막기 위함이다.

### 이유

D-Editor-1(Range 모델)의 핵심 문제는 "Section의 위치를 앵커(Page)로
정의"한다는 전제 자체였다 — 앵커 Page를 옮기면 Section 경계 전체가
의도치 않게 함께 움직였다(D-Editor-3의 "위치가 곧 소속" 원칙이 만드는
부작용). Page가 자기 소속을 직접 들고 있으면 이 문제 자체가 사라진다.

### Tradeoff

- **얻는 것**: 빈 Section이 자연스러운 상태가 될 수 있고(이번엔 채택 안
  했지만 앞으로 필요해지면 쉬움), Section 간 이동이 단순 필드 변경으로
  줄어들며, `reconcileSectionsAfterPageRemoval` 같은 별도 재조정 로직이
  필요 없어진다(Page 삭제가 Section 쪽에 아무 영향을 주지 않음).
- **잃는 것**: `pages[]`와 `sectionId`라는 두 개의 정보가 항상 일관되게
  유지되어야 한다는 새로운 책임이 생긴다(위 규칙 1, 5로 대응). Undo 시
  "위치+소속"을 함께 되돌리는 경로가 `MOVE_PAGE`/`UPDATE_PAGE`보다
  한 단계 더 필요해진다(예: 신규 액션 1개 추가 검토 대상 — TODO.md 참조).

### 아직 열려 있는 것 (구현 시 결정 필요, Decision 아님)

- ~~신규 Page 생성 시 기본 `sectionId`를 무엇으로 할지~~ — 9-19에서 항상
  `null`(미분류)로 구현함. "현재 선택된 Section" 자동 지정은 하지 않음
  (나중에 이동으로 고칠 수 있어 급하지 않다는 잠정 결론 그대로 유지).
- Section CRUD(`ADD_SECTION`/`REMOVE_SECTION`/`UPDATE_SECTION`)가 여전히
  `HistoryManager.js`의 `computeInverse()`에 케이스가 없어 Undo 기록
  대상이 아니다(D-Editor-1 시절부터의 기존 상태, 9-19에서도 그대로 남음
  — `MOVE_PAGE_TO_SECTION`만 Undo 지원이 추가됐다) — 범위에 포함할지는
  별도 결정.


