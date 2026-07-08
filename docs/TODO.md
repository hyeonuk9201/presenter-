# TODO.md

> 이 문서는 "지금 뭐가 남았는지"를 한눈에 보기 위한 체크리스트다.
> "무슨 일이 있었는지"는 CurrentState.md가 기록한다 — 여기는 과거를 안 남긴다.
> 완료된 항목은 체크만 하고 CurrentState.md의 해당 세션 번호(예: 9-11)로
> 자세한 내용을 넘긴다. 여기서 완료 내역을 다시 설명하지 않는다.
>
> 최종 업데이트: 2026-07-06 (Section UI 전체 완료, 9-26)

---

## Architecture TODO

기능이 아니라 구조에 대한 항목. "지금 당장 눈에 보이는 기능"보다
"나중에 기능을 얼마나 쉽게 얹을 수 있는가"를 다룬다.

- [x] Schema version — 9-11
- [x] Load validation (`isValidPage()` 실제 사용, 손상 데이터 복구) — 9-11
- [x] Save failure UI — 9-11
- [x] Persistence의 localStorage 결합도 낮추기 — 9-18에서 완료. `StorageAdapter.js`로 read/write 두 지점 추출. AppStore 부팅이 여전히 동기(sync)라는 한계는 그대로 남음(문서화만 함) — 실제 비동기 저장소 도입 시 별도 작업 필요.
- [ ] Page 모델 전환 시점 재평가 — 지금은 플랫 구조. "한 Page에 독립적으로 편집 가능한 콘텐츠가 3개 이상 필요해지는 순간"이 Element 모델(DomainEntityArchitecture.md에 이미 설계됨) 전환 트리거. 그 전엔 플랫 필드 추가로 버틴다.
- [ ] Asset/Song 관계 재검토 — Library 작업 들어가기 전에. Background/Video는 그냥 Asset이지만, Song이 Asset 하나인지 아니면 "Page 여러 개 + 메타데이터"를 묶는 별도 Aggregate인지 아직 열린 질문. **(2026-07-05 추가)** ProPresenter의 "Reflow"(가사 원본 텍스트 ↔ Page[] 양방향 재편집) 기능 도입 여부도 이 질문에 종속됨 — 지금은 `lyricsImport.js`가 원본 텍스트를 버리는 일방향 구조라 불가능. 조사 내용은 `Research/Observations.md` 2026-07-05 참조.

---

## Section Migration TODO (D-Editor-4 — 9-19에서 완료)

`FutureEditor.md`의 `D-Editor-4`(Page 중심 소속 모델, D-Editor-1/D-Editor-3
대체)를 9-19에서 구현 완료. 자세한 내용은 `CurrentState.md`의 9-19 참조.

- [x] `domain/Section.js` — `startPageId` 제거, `isValidSection()` 갱신 — 9-19
- [x] `domain/Page.js` — `sectionId` 필드 추가(기본 `null`), `isValidPage()` 갱신 — 9-19
- [x] `domain/Presentation.js` — `sections[]` → `sectionIds[]` + `sectionMap{}` 전환, `getSectionRanges()`/`reconcileSectionsAfterPageRemoval()` 제거, `movePageToSection()` 신규(규칙 1), `movePage()`에 자동 흡수 로직 추가(규칙 5), `removeSection()`에 소속 Page `sectionId=null` 처리(규칙 3), Flow View용 그룹 계산 함수(`getSectionGroups()`) 신규(규칙 4) — 9-19
- [x] `sanitizePresentation()` — 검증 방향 반전(Page→Section 참조 무결성 확인), 참조 끊기면 `sectionId=null` 폴백 — 9-19
- [x] `store/AppStore.js` — `deriveMutations()`의 `sectionsChanged` 판정을 `sectionIds`/`sectionMap` 기준으로 변경, `MOVE_PAGE_TO_SECTION` 액션 추가 — 9-19
- [x] `history/HistoryManager.js` — `MOVE_PAGE_TO_SECTION`의 `computeInverse()` 케이스 추가 — 9-19. 위치+sectionId를 원자적으로 복원하는 `SET_PAGE_POSITION`(Undo 전용) 액션도 함께 추가됨(계획에는 없었지만 구현 중 필요성이 드러남).
- [x] `persistence/Schema.js` — `CURRENT_SCHEMA_VERSION` 2로 상향, v1→v2 마이그레이션 — 9-19
- [x] `ui/CueList.js` (Flow View) — `getSectionRanges()` 의존 제거, `getSectionGroups()` 기반으로 교체 — 9-19
- [x] `index.html` — Section 추가 버튼이 더 이상 "선택된 Page 필요" 조건을 요구하지 않음 — 9-19

남은 하위 항목(Section 삭제 UI, 색상/메모 편집 UI)은 아래 "Feature TODO"의
"Section UI" 항목에서 이어간다. Page 드래그 재정렬 UI(별도 항목, 아래)도
이제 이 모델 위에서 설계 가능해졌다.

- [ ] (Research, MVP 아님) Flow View / Content Browser 이중 뷰 구조 —
  `Research/2026-07-04 Workflow Separation.md`, `Research/2026-07-05
  Browser-Flow Separation.md` 참조. 아직 질문 단계이며 구현 우선순위
  대상이 아니다. Architecture.md에도 아직 반영하지 않는다.

---

## Feature TODO

사용자가 직접 체감하는 기능. 실제 동작 구현이 완료 기준이다 — 필드만
있고 아무것도 안 하면 미완료로 둔다.

- [ ] Transition — 필드 뼈대만 있음(9-12), 실제 fade/cut 애니메이션은 아직 없음
- [ ] Auto Advance — 필드 뼈대만 있음(9-12), 실제 자동 전환 타이머는 아직 없음
- [x] Cue Label — 9-16에서 해결. 원래 계획(텍스트 오버레이 유무 표시)보다 확장되어, 미디어 Page의 파일명 기반 `label`(수정 가능) 표시까지 포함. **(2026-07-05 브라우저 테스트 후 추가)** "가사첫줄 — 파일명" 조합이 항목 폭 제약으로 잘려 보여 평상시 화면에서 순서/전체 텍스트 확인이 어려움(우회로: Page 삭제 확인 문구에서만 전체 텍스트 노출) — 당장 고치기엔 영향 범위가 커서 보류. 아래 신규 항목 참조.
- [ ] CueList 항목 텍스트 잘림 개선 — 위 Cue Label 항목에서 발견. hover 툴팁으로 풀네임 노출하거나 항목 레이아웃(높이/폭) 자체를 조정하는 방향 검토 필요. 우선순위 낮음(기능 자체는 정상 동작, UX 개선 성격).
- [x] Image Overlay — 9-17에서 해결. video와 동일한 패턴 재사용.
- [x] Library — 9-18에서 뼈대(빈 메뉴)만 완료. Songs/Backgrounds/Videos 카테고리 UI만 있고 기능 없음. 실제 데이터 연결은 "Asset/Song 관계 재검토"(Architecture TODO) 이후 별도 작업.
- [x] Section UI — 도메인 모델/Store/Persistence(9-13) + CueList Section Tree/접기/펼치기/Section 추가(9-14) 완료. D-Editor-4(Page 중심 모델)로 9-19에서 마이그레이션 완료. Section 삭제 UI는 9-22, 빈 Section에 Page 배정하는 경로는 9-23, Section 순서 위/아래 이동은 9-24, 색상/메모 편집 UI는 9-26에서 완료 — 하위 항목 전부 완료.
- [x] Page 드래그 재정렬 UI — 9-21에서 완료. HTML5 Drag and Drop, Section 헤더/미분류 라벨 드롭도 지원(빈 Section 진입점).
- [x] Section 순서 위/아래 이동 — 9-24에서 완료. `moveSectionGroup()`(인접 그룹 맞바꾸기, 자기 자신이 역연산이라 Undo가 방향 반전만으로 충분), Section 목록 모달에 ▲/▼ 버튼. 유령 Section/맨 위/맨 아래는 비활성화.
- [ ] Section 추가 버튼의 `prompt()` 취약점 — **(2026-07-06 실사용 중 발견)** 브라우저가 `prompt()`/`alert()`를 반복 호출 감지하면 "이 페이지가 추가 대화상자를 만들지 못하게 차단" 체크박스를 띄우는데, 실수로 체크하면 그 이후 "+ 섹션" 클릭 시 프롬프트 자체가 안 뜨고 즉시 `null`을 반환해 버튼이 안 먹는 것처럼 보인다. 단순 새로고침으로는 안 풀리고 탭을 새로 열어야(로컬 서버 재시작 등) 풀리는 경우가 있어 사용자 입장에서 원인 파악이 어려움. **부분 대응 완료(9-20, 9-21)**: 성공/실패를 토스트로 안내하게 되어 "버튼이 안 먹는다"는 오인은 줄었고, 선택된 Page 자동 배정(9-21)까지 되어 실사용 혼란은 대부분 해소됨. 다만 `prompt()` 자체를 인앱 모달로 교체하는 근본 해결은 아직 안 함 — 차단 체크박스에 실수로 걸리는 근본 원인은 그대로 남아있음.

---

## 사용 방법

- 새 아키텍처 리뷰나 기능 논의가 끝나면, 여기에 항목을 추가한다.
- 작업을 시작하기 전 이 문서를 보고 우선순위를 정한다.
- 작업이 끝나면 체크하고, CurrentState.md에 세션 번호를 남긴 뒤 여기에 그 번호를 연결한다.
- 오래돼서 더 이상 유효하지 않은 항목(요구사항이 바뀜, 다른 방식으로 해결됨)은 이유와 함께 삭제한다 — 완료 표시(`[x]`)가 아니라 그냥 삭제.
