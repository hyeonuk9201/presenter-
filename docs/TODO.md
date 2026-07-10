# TODO.md

> 이 문서는 "지금 뭐가 남았는지"를 한눈에 보기 위한 체크리스트다.
> "무슨 일이 있었는지"는 CurrentState.md가 기록한다 — 여기는 과거를 안 남긴다.
> 완료된 항목은 체크만 하고 CurrentState.md의 해당 세션 번호(예: 9-11)로
> 자세한 내용을 넘긴다. 여기서 완료 내역을 다시 설명하지 않는다.
>
> 최종 업데이트: 2026-07-09 (Song → Section → Page 생성 + 재가져오기 연결 완료, 9-30)

---

## Architecture TODO

기능이 아니라 구조에 대한 항목. "지금 당장 눈에 보이는 기능"보다
"나중에 기능을 얼마나 쉽게 얹을 수 있는가"를 다룬다.

- [x] Schema version — 9-11
- [x] Load validation (`isValidPage()` 실제 사용, 손상 데이터 복구) — 9-11
- [x] Save failure UI — 9-11
- [x] Persistence의 localStorage 결합도 낮추기 — 9-18에서 완료. `StorageAdapter.js`로 read/write 두 지점 추출. AppStore 부팅이 여전히 동기(sync)라는 한계는 그대로 남음(문서화만 함) — 실제 비동기 저장소 도입 시 별도 작업 필요.
- [ ] Page 모델 전환 시점 재평가 — 지금은 플랫 구조. "한 Page에 독립적으로 편집 가능한 콘텐츠가 3개 이상 필요해지는 순간"이 Element 모델(DomainEntityArchitecture.md에 이미 설계됨) 전환 트리거. 그 전엔 플랫 필드 추가로 버틴다.
- [x] Asset/Song 관계 재검토 — 9-28에서 해소. Song은 Asset이 아니라 별도 Aggregate(`D-027`), MVP 범위는 "가사 저장"만(`D-026`, `Song`/`LyricBlock`, 메타데이터 보류). Reflow 도입 여부는 여전히 별도 열린 질문으로 남음(`Research/Observations.md` 2026-07-05 참조, Song Aggregate가 생겼다고 자동으로 필요해지는 건 아님 — 실사용 신호 생기면 재검토).
- [x] 스타일 기능(Page 단위) — 이미 완성되어 있었음(확인만 함, Step 초기 세션부터 존재). 사이드바 편집 UI(정렬/굵기/크기/줄간격/색상/외곽선/그림자) + `UPDATE_PAGE` 저장, 신규 Page 생성 시에도 동일 적용. **(2026-07-06)** `D-022`로 "지금은 Page 단위 그대로 두고 Section Style 승격은 보류"를 확정 — 재가져오기(`D-021`) 기능을 실제로 설계할 때 재검토.

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
- [x] 스타일 프리셋 — 9-27에서 완료. `D-023`(값 복사, 참조 아님)/`D-024`(선택된 Page 하나에만 적용)/`D-025`(AppSettings에 저장, Presentation과 독립)에 따라 구현. 시스템 기본 프리셋 2개("찬양 기본", "설교 자막") 제공, 새로 저장/삭제 가능.
- [ ] 스타일 프리셋 — 다중 선택 Page 적용 — `D-024` Non-goal로 명시 보류. 현재 선택 모델(`selectedPageId`, 단일)의 확장이 선행돼야 함 — 필요성이 실사용으로 확인되면 착수.
- [ ] 스타일 프리셋 — 업데이트(덮어쓰기) — 지금은 항상 "새로 저장"만 가능. 필요성 확인되면 착수.
- [x] Song 도메인 모델 (`domain/Song.js`) — 9-28에서 완료. `D-026`(`Song`/`LyricBlock`, 메타데이터 없음).
- [x] Song 저장소 (`store/SongStore.js`) — 9-28에서 완료. `AppSettingsStore.js` 패턴 재사용, `MediaStore.js`와 완전 독립(`D-027`).
- [x] Song Library UI — 9-29에서 완료. Library 모달 Songs 탭에 목록/추가/편집/삭제 연결.
- [x] Song → Section → Page 생성 — 9-30에서 완료. Library에서 Song 선택 시 `Section`(`sourceSongId` 설정) + `Page[]` 생성(`D-021` 적용).
- [x] Song 재가져오기(Pull) 연결 — 9-30에서 완료. `D-021`의 전체 Replace(위치 유지) + `isModified` 경고 규칙 구현. Section 목록 모달에 "다시 가져오기" 버튼 + 경고 표시.
- [ ] Song CRUD/재가져오기의 Undo 지원 — 기존 Section CRUD처럼 미지원 상태로 남음(FutureEditor.md D-Editor-4 참조). 필요성 확인되면 착수.
- [ ] Media Library UI — Song Library와 별도 작업(`D-027`, 범위 분리). `MediaStore.js`는 이미 있고 UI만 얹으면 됨.
- [ ] Section 추가 버튼의 `prompt()` 취약점 — **(2026-07-06 실사용 중 발견)** 브라우저가 `prompt()`/`alert()`를 반복 호출 감지하면 "이 페이지가 추가 대화상자를 만들지 못하게 차단" 체크박스를 띄우는데, 실수로 체크하면 그 이후 "+ 섹션" 클릭 시 프롬프트 자체가 안 뜨고 즉시 `null`을 반환해 버튼이 안 먹는 것처럼 보인다. 단순 새로고침으로는 안 풀리고 탭을 새로 열어야(로컬 서버 재시작 등) 풀리는 경우가 있어 사용자 입장에서 원인 파악이 어려움. **부분 대응 완료(9-20, 9-21)**: 성공/실패를 토스트로 안내하게 되어 "버튼이 안 먹는다"는 오인은 줄었고, 선택된 Page 자동 배정(9-21)까지 되어 실사용 혼란은 대부분 해소됨. 다만 `prompt()` 자체를 인앱 모달로 교체하는 근본 해결은 아직 안 함 — 차단 체크박스에 실수로 걸리는 근본 원인은 그대로 남아있음. **(2026-07-06 추가)** 스타일 프리셋(9-27)의 "새로 저장"도 같은 `prompt()`를 재사용하므로 동일한 위험을 공유함.

---

## 사용 방법

- 새 아키텍처 리뷰나 기능 논의가 끝나면, 여기에 항목을 추가한다.
- 작업을 시작하기 전 이 문서를 보고 우선순위를 정한다.
- 작업이 끝나면 체크하고, CurrentState.md에 세션 번호를 남긴 뒤 여기에 그 번호를 연결한다.
- 오래돼서 더 이상 유효하지 않은 항목(요구사항이 바뀜, 다른 방식으로 해결됨)은 이유와 함께 삭제한다 — 완료 표시(`[x]`)가 아니라 그냥 삭제.
