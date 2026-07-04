# TODO.md

> 이 문서는 "지금 뭐가 남았는지"를 한눈에 보기 위한 체크리스트다.
> "무슨 일이 있었는지"는 CurrentState.md가 기록한다 — 여기는 과거를 안 남긴다.
> 완료된 항목은 체크만 하고 CurrentState.md의 해당 세션 번호(예: 9-11)로
> 자세한 내용을 넘긴다. 여기서 완료 내역을 다시 설명하지 않는다.
>
> 최종 업데이트: 2026-07-04 (Section Migration TODO 추가 — D-Editor-4 방향 확정에 따름, 아직 미착수)

---

## Architecture TODO

기능이 아니라 구조에 대한 항목. "지금 당장 눈에 보이는 기능"보다
"나중에 기능을 얼마나 쉽게 얹을 수 있는가"를 다룬다.

- [x] Schema version — 9-11
- [x] Load validation (`isValidPage()` 실제 사용, 손상 데이터 복구) — 9-11
- [x] Save failure UI — 9-11
- [ ] Persistence의 localStorage 결합도 낮추기 — `StorageAdapter.js`로 두 지점(read/write)만 추출. 급하지 않음, "거의 공짜"라 다른 Persistence 작업 할 때 같이 처리해도 됨.
- [ ] Page 모델 전환 시점 재평가 — 지금은 플랫 구조. "한 Page에 독립적으로 편집 가능한 콘텐츠가 3개 이상 필요해지는 순간"이 Element 모델(DomainEntityArchitecture.md에 이미 설계됨) 전환 트리거. 그 전엔 플랫 필드 추가로 버틴다.
- [ ] Asset/Song 관계 재검토 — Library 작업 들어가기 전에. Background/Video는 그냥 Asset이지만, Song이 Asset 하나인지 아니면 "Page 여러 개 + 메타데이터"를 묶는 별도 Aggregate인지 아직 열린 질문. **(2026-07-05 추가)** ProPresenter의 "Reflow"(가사 원본 텍스트 ↔ Page[] 양방향 재편집) 기능 도입 여부도 이 질문에 종속됨 — 지금은 `lyricsImport.js`가 원본 텍스트를 버리는 일방향 구조라 불가능. 조사 내용은 `Research/Observations.md` 2026-07-05 참조.

---

## Section Migration TODO (D-Editor-4, 2026-07-04 — 아직 미착수)

`FutureEditor.md`의 `D-Editor-4`(Page 중심 소속 모델, D-Editor-1/D-Editor-3
대체)가 방향으로 확정됨. 아래는 실제 구현 시 필요한 항목이다 — 착수 전
반드시 `D-Editor-4` 전체와 `Research/2026-07-04 Workflow Separation.md`를
먼저 읽을 것.

- [ ] `domain/Section.js` — `startPageId` 제거, `isValidSection()` 갱신
- [ ] `domain/Page.js` — `sectionId` 필드 추가(기본 `null`), `isValidPage()` 갱신
- [ ] `domain/Presentation.js` — `sections[]` → `sectionIds[]` + `sectionMap{}` 전환, `getSectionRanges()`/`reconcileSectionsAfterPageRemoval()` 제거, `movePageToSection()` 신규(규칙 1), `movePage()`에 자동 흡수 로직 추가(규칙 5), `removeSection()`에 소속 Page `sectionId=null` 처리(규칙 3), Flow View용 그룹 계산 함수 신규(규칙 4)
- [ ] `sanitizePresentation()` — 검증 방향 반전(Section→Page 참조 대신 Page→Section 참조 무결성 확인), 참조 끊기면 `sectionId=null` 폴백(9-11 정책 재사용)
- [ ] `store/AppStore.js` — `deriveMutations()`의 `sectionsChanged` 판정을 `sectionIds`/`sectionMap` 기준으로 변경, `MOVE_PAGE_TO_SECTION` 액션 추가
- [ ] `history/HistoryManager.js` — `MOVE_PAGE_TO_SECTION`의 `computeInverse()` 케이스 추가 (원래 위치+원래 sectionId를 함께 복원)
- [ ] `persistence/Schema.js` — `CURRENT_SCHEMA_VERSION` 2로 상향, v1→v2 마이그레이션(옛 Range 계산으로 각 Page의 `sectionId`를 1회 역산해 채움)
- [ ] `ui/CueList.js` (Flow View) — `getSectionRanges()` 의존 제거, 신규 그룹 계산 함수로 교체, "미분류" 그룹 렌더링을 groupBy 결과 기준으로 변경
- [ ] `index.html` — Section 추가 버튼이 더 이상 "선택된 Page 필요" 조건을 요구하지 않도록 변경(Section이 Page 없이도 생성 가능해짐)

이 작업이 끝나면 아래 "Feature TODO"의 "Section UI" 항목 중 남은
하위 항목(Section 삭제 UI, 색상/메모 편집 UI)을 이 모델 위에서 이어간다.
Page 드래그 재정렬 UI(별도 항목, 아래)도 이 모델을 전제로 설계해야 한다.

- [ ] (Research, MVP 아님) Flow View / Content Browser 이중 뷰 구조 —
  `Research/2026-07-04 Workflow Separation.md` 참조. 아직 질문 단계이며
  구현 우선순위 대상이 아니다. Architecture.md에도 아직 반영하지 않는다.

---

## Feature TODO

사용자가 직접 체감하는 기능. 실제 동작 구현이 완료 기준이다 — 필드만
있고 아무것도 안 하면 미완료로 둔다.

- [ ] Transition — 필드 뼈대만 있음(9-12), 실제 fade/cut 애니메이션은 아직 없음
- [ ] Auto Advance — 필드 뼈대만 있음(9-12), 실제 자동 전환 타이머는 아직 없음
- [ ] Cue Label — CueList 미리보기가 영상 Page의 텍스트 오버레이 유무를 안 보여줌(지금 `(video)`로만 표시)
- [ ] Image Overlay — 텍스트 오버레이가 지금 video Page에만 적용됨(9-7). image Page엔 아직
- [ ] Library — Songs/Backgrounds/Videos 메뉴. 뼈대(빈 메뉴)만이라도 우선.
- [x] Section UI — 도메인 모델/Store/Persistence(9-13) + CueList Section Tree/접기/펼치기/Section 추가(9-14) 완료. **단, 이 구현은 D-Editor-1(Range 모델) 기준이며 위 "Section Migration TODO"(D-Editor-4)로 대체될 예정** — 남은 하위 항목(Section 삭제 UI, 색상/메모 편집 UI)은 마이그레이션 완료 후 이어간다.
- [ ] Page 드래그 재정렬 UI — `domain/Presentation.js`의 `movePage()`는 있지만 이걸 호출하는 화면(드래그 핸들 등)이 CueList에 없음. **D-Editor-4의 "자동 흡수" 규칙(순수 위치 이동 시 sectionId 재계산)을 전제로 설계할 것** — Section Migration TODO 완료 후 착수 권장.

---

## 사용 방법

- 새 아키텍처 리뷰나 기능 논의가 끝나면, 여기에 항목을 추가한다.
- 작업을 시작하기 전 이 문서를 보고 우선순위를 정한다.
- 작업이 끝나면 체크하고, CurrentState.md에 세션 번호를 남긴 뒤 여기에 그 번호를 연결한다.
- 오래돼서 더 이상 유효하지 않은 항목(요구사항이 바뀜, 다른 방식으로 해결됨)은 이유와 함께 삭제한다 — 완료 표시(`[x]`)가 아니라 그냥 삭제.
