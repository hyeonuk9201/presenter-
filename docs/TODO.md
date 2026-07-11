# TODO.md

> 이 문서는 "지금 뭐가 남았는지"와 "다음에 뭘 먼저 해야 하는지"를 함께
> 보기 위한 로드맵이다. 단순 체크리스트가 아니라 **판단 근거가 남는
> 문서**를 목표로 한다 — 왜 필요한지, 뭘 건드리는지, 뭐가 선행돼야
> 하는지, 위험은 뭔지, 뭘 봐야 끝난 건지를 항목마다 남긴다.
>
> "무슨 일이 있었는지"는 CurrentState.md가 기록한다 — 여기는 과거를
> 다시 설명하지 않는다. 완료된 항목은 체크만 하고 CurrentState.md의
> 해당 세션 번호(예: 9-11)로 자세한 내용을 넘긴다.
>
> 최종 업데이트: 2026-07-11 (Research 탐구 → 승격 4건 + 문서 위생,
> 9-44 — 사용자 승인으로 Live Emergency Overlay(P2, Decision 선행)/
> UI 통지 이행(P2, TD-4)/저장 트리거 정리(P3, TD-5)/가사→Song 통합
> 검토(P3) 승격, Research 문서 낡은 절 해소 표시 완료. 이전: 저장소
> 위생(9-43), 연속 Undo 수정(9-42), 회귀 테스트 구축(9-41), 배포 전략
> Research(9-40), 기술 부채 감사(9-39))

---

## 필드 정의

각 항목은 아래 7개 필드를 가진다. 완료된 항목은 사후 기록으로 압축해서
한 줄에 남긴다(작업 시작 전 판단이 아니라 "당시 이런 판단이었다"는
기록이므로).

| 필드 | 의미 |
| --- | --- |
| **Priority** | P0(지금 당장) / P1(다음 착수 후보) / P2(여유 있을 때) / P3(나중에·트리거 대기) |
| **Status** | 예정 / 진행중 / 완료 / 보류(의도적으로 중단·대기 중, "안 함"이 아니라 "지금은 아님") |
| **Reason** | 왜 필요한가 — 발견 경위, 사용자 체감 격차, 구조적 필요성 |
| **Impact** | 어디를 건드리는가 — 파일/도메인/아키텍처 레이어 |
| **Dependency** | 먼저 끝나야 하는 작업·결정이 있는가 |
| **Risk** | 변경 위험도(낮음/중간/높음)와 이유 — 특히 기존 Decision과 충돌 가능성 |
| **Completion Criteria** | 뭘 보면 "끝났다"고 판단하는가 |

**⚠ 표시**는 이미 확정된 아키텍처 원칙(`Decisions.md`)과 정면 또는 부분
충돌하는 항목이다 — 착수 전 반드시 해당 Decision을 먼저 재검토해야
한다. 전체 목록은 [아키텍처 원칙 충돌 항목](#아키텍처-원칙-충돌-항목)
참조.

**🔍 표시**는 `Research/*.md` 문서가 제기한 위험 신호 때문에 범위를
좁히거나 착수를 보류한 항목이다 — `Decisions.md`처럼 지켜야 하는
제약은 **아니다**. 착수 자체를 막지 않으며, 판단은 그때그때 다시 열 수
있다.

### Decision과 Research를 구분하는 기준 (2026-07-11)

Media Library UI(9-33) 작업 중 Research 문서를 근거로 범위를 좁혔는데,
"Research가 막았다"와 "Decision이 막았다"가 기록에서 섞이면 나중에
그 항목이 실제로 강제되는 제약인지 아닌지 헷갈린다. 그래서 아래 세
규칙을 문서 전반에 적용한다.

1. **Decision 충돌 여부는 `Decisions.md`만 기준으로 판단한다.** 어떤
   항목이 D-0XX와 충돌하면 ⚠로 표시하고, 착수 전 그 Decision을 먼저
   재검토(또는 대체 Decision 작성)해야 한다 — 이건 강제다.
2. **`Research/*.md`는 위험 신호와 배경 근거로만 쓴다.** Research
   문서는 아직 승인되지 않은 조사/가설이다(`Research/2026-07-05 Library-
   Centric Workflow.md` 1~7행: "Status: Research... 구현 근거로 쓰지
   않는다"). Research가 "이렇게 하면 위험하다"고 지적해도, 그 자체로
   착수를 막는 강제력은 없다 — Decision으로 승격되기 전까지는 참고
   자료다.
3. **Research 때문에 범위를 축소하거나 보류할 때는, 그게 "지금 지켜야
   하는 제약"(Decision 근거)인지 "앞으로 다시 볼 문제"(Research 근거,
   아직 미확정)인지 항목에 명시한다.** 예: Media Library UI는 `D-002`
   (Decision) 위반 여부를 확인해 위반하지 않는 선으로 범위를 좁혔고,
   Research 문서가 지적한 더 큰 질문(여러 Presentation 간 Asset 공유,
   GC, Persistence 분리)은 Decision이 아니므로 강제하지 않고 "향후
   검토 사항"으로만 남겼다 — 아래 Media Library UI 항목 참조.

---

## 우선순위 로드맵 (미완료 항목만)

### 지금 해야 하는 것 (P0/P1)

- 현재 P0/P1(미완료) 항목 없음. 가장 최근 P1이었던 핵심 계층 회귀
  테스트 구축은 9-41에서 완료(88 tests — 87 pass + TD-1 알려진 실패
  1 todo). 다음 착수 후보는 아래 "다음 후보(P2)" 참조 — 특히 연속
  Undo 수정은 선행 조건이 충족되어 바로 착수 가능해졌다.

### 다음 후보 (P2)

권장 착수 순서(2026-07-11, Research 탐구 승인): 내보내기/가져오기 →
Emergency Overlay(Decision 선행) → UI 통지 이행.

- **데이터 내보내기/가져오기 + 저장소 persist** — 배포 전략
  Research(9-40)에서 승격. 브라우저 저장소 축출 시 전체 데이터가 복구
  불가인 유일한 실위험의 해소책 — 기능 대기열 1순위 유지. 상세는
  [Feature TODO](#feature-todo) 참조.
- **Live Emergency Overlay (MVP)** — Research 탐구(9-44)에서 승격.
  `Observations.md` 2026-07-08에 요구사항 7개가 이미 정리됨. **착수
  전 새 Decision(Overlay State 위치/경로) 필수** — 상세는
  [Feature TODO](#feature-todo) 참조.
- **UI 통지 경로 이행 — storeChanged → Mutation 타겟 통지 (감사 TD-4,
  D-017 코드 이행)** — Research 탐구(9-44)에서 승격. Overlay 등 UI
  확장 전 선행 가치 — 상세는 [Architecture TODO](#architecture-todo)
  참조.
- 감사의 나머지 항목(TD-2 미처리 rejection, TD-4 이중 통지, TD-5
  선택마다 전체 저장, TD-8 node_modules)은 **의도적으로 승격하지
  않았다** — 실사용 신호가 없거나(TD-2/TD-5), 트리거 대기(TD-4,
  Phase C/렌더링 최적화 착수 시), 환경 문제(TD-8)라서다. 근거와
  재검토 트리거는 `Research/2026-07-11 Tech Debt Audit.md`에만 둔다.

### 나중에 (P3 / 트리거·재검토 대기)

- **Auto Advance** — Risk(Live 중 의도치 않은 자동 전환) 대비 Return이
  낮다는 사용자 판단으로 보류(2026-07-11). 실사용 필요가 확인되면 재검토.
- **Page 모델 전환 시점 재평가** — "한 Page에 독립 편집 콘텐츠 3개
  이상 필요" 트리거 대기.
- **Flow View / Content Browser 이중 뷰 구조** — 아직 Research 단계,
  질문 자체가 안 끝남.
- **스타일 프리셋 — 다중 선택 Page 적용** — ⚠ `D-024` Non-goal에 명시
  금지, 선택 모델 확장이 먼저 필요.
- **Song CRUD/재가져오기의 Undo 지원** — ⚠ `D-027`(Song은 CommandBus/
  HistoryManager를 안 거침)과 충돌 가능, 새 Decision 선행 필요.
- **"가사 추가" 경로의 Song 통합 검토** — Research 탐구(9-44)에서
  P3 승격. `importLyrics()` 일방향 문제의 근본 해소 후보이나 실사용
  불편 신호 대기 — 상세는 [Feature TODO](#feature-todo) 참조.
- **저장 트리거 정리 — SET_SELECTION/SET_LIVE_PAGE 저장 제거 (감사
  TD-5)** — UI 통지 이행(P2)과 같은 시기 처리 권장 — 상세는
  [Architecture TODO](#architecture-todo) 참조.

---

## Architecture TODO

기능이 아니라 구조에 대한 항목. "지금 당장 눈에 보이는 기능"보다
"나중에 기능을 얼마나 쉽게 얹을 수 있는가"를 다룬다.

- [x] **Schema version** — 9-11
  - Priority(당시): P1 · Status: 완료 · Reason: 저장 포맷 버전 없이는 향후 마이그레이션 경로가 없음 · Impact: `persistence/Schema.js` · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 버전 필드 저장/로드 확인(충족, 9-11)

- [x] **Load validation** (`isValidPage()` 실제 사용, 손상 데이터 복구) — 9-11
  - Priority(당시): P1 · Status: 완료 · Reason: 손상된 저장 데이터가 앱 전체를 깨뜨리는 것을 막아야 함 · Impact: `persistence/*`, 로드 경로 전반 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 손상 데이터 폴백 동작 확인(충족, 9-11)

- [x] **Save failure UI** — 9-11
  - Priority(당시): P1 · Status: 완료 · Reason: 저장 실패가 조용히 무시되면 사용자가 데이터 유실을 모름 · Impact: UI 저장 경로 전반 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 저장 실패 시 사용자에게 알림(충족, 9-11)

- [x] **Persistence의 localStorage 결합도 낮추기** — 9-18에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: 저장소 교체 가능성을 열어두기 위해 read/write 지점을 추상화해야 함 · Impact: `persistence/StorageAdapter.js` 신규 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: read/write 두 지점이 `StorageAdapter.js`로 추출됨(충족, 9-18). **남은 한계(신규 항목 아님, 기록만)**: AppStore 부팅이 여전히 동기(sync) — 실제 비동기 저장소 도입 시 별도 작업 필요, 지금은 문서화만 함.

- [ ] **Page 모델 전환 시점 재평가**
  - Priority: P3 · Status: 보류(트리거 대기)
  - Reason: 지금은 플랫 구조로 충분하지만, "한 Page에 독립적으로 편집 가능한 콘텐츠가 3개 이상 필요해지는 순간" Element 모델(`DomainEntityArchitecture.md`에 이미 설계됨)로 전환해야 한다. 그 전엔 플랫 필드 추가로 버틴다.
  - Impact: `domain/Page.js`, `domain/Presentation.js` 전면 재설계, `AppStore`/`persistence/*`/`ui/*` 전체 — Element 모델 전환은 Phase 2 규모 변경(`Architecture.md` 목표 구조 참조).
  - Dependency: 트리거 조건(Page당 독립 편집 콘텐츠 3개 이상) 충족 관찰이 선행. 조건 미충족 시 착수하지 않는다.
  - Risk: 높음 — 스키마/Store/Persistence 전반 재설계. 부분 전환은 Page 스키마의 이중 의미를 유발하므로 금지(`Architecture.md` 명시) — 한 번에 전환해야 함.
  - Completion Criteria: 트리거 조건 충족 확인 → Element 모델 설계 검토 → 마이그레이션(Schema version 상향 포함) 완료.

- [x] **문서 정리 — D-019/D-020 예고 갱신 이행 + CurrentState.md 낡은 절 해소** — 9-38
  - Priority(당시): P1 · Status: 완료 · Reason: D-019/D-020이 "다음 문서 정리 세션에서 반영"으로 예고한 아키텍처 문서 갱신이 미이행 상태였고, CurrentState.md의 낡은 절(2026-07-03 헤더, "미구현" 표기된 D-Editor-4, Step6 시절 주의사항)이 다음 세션의 TODO 후보 판단을 실제로 오염시킨 사례가 확인됨 · Impact: `docs/CommandBusArchitecture.md`/`docs/HistoryArchitecture.md`(말미 "현재 구현 노트" 추가), `docs/CurrentState.md`(낡은 절 3곳 상태 표시) — 코드 무수정 · Dependency: 없음 · Risk: 낮음(문서만, 소스 대조 후 작성) · Completion Criteria: D-019/D-020의 "영향 받는 문서" 항목 이행 + CurrentState.md 오도 지점 해소(충족, 9-38)

- [x] **테스트 인프라 도입** (node:test 기반) — `D-028`, 2026-07-10 완료
  - Priority(당시): P0 · Status: 완료(단, 지속 관행으로 이어짐) · Reason: 세션마다 임시 스크립트를 작성 후 삭제해 회귀를 못 잡는 문제(9-19 등에서 반복 확인) · Impact: `package.json`(`node --test` + `fake-indexeddb`), `domain/*.test.js`, `store/*.test.js`, `docs/ManualTestChecklist.md` 신설 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 첫 회귀 테스트 작성 + 브라우저 확인 부채를 `ManualTestChecklist.md`로 이관(충족, 9-28/D-028). **주의**: 이 항목 자체는 "완료"지만, "domain/store 전체 회귀 테스트 구축"은 일회성 완료가 아니라 이후 모든 기능/버그 수정에 테스트를 같이 추가하는 관행으로 지속된다 — 새 세션에서 이 원칙을 어기면 그게 곧 회귀다.

- [x] **핵심 계층 회귀 테스트 구축 (CommandBus/HistoryManager/AppStore/Schema)** — 9-41에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: 기술 부채 감사(9-39,
    TD-3)에서 승격 — D-028 자동화 대상 계층에 테스트 0건 + 그 계층에서
    잠재 버그(TD-1) 재현으로 필요성 실증 · Impact:
    `command/CommandBus.test.js`/`history/HistoryManager.test.js`/
    `store/AppStore.test.js`/`persistence/Schema.test.js`(전부 신규,
    co-locate), 프로덕션 코드 무수정 · Dependency: 없음(`npm install`
    수행으로 TD-8도 함께 해소) · Risk: 낮음(이미 검증됨) · Completion
    Criteria: 직렬 큐 순서 보장(D-019 시나리오)·재귀 기록 방지·
    Undo/Redo 왕복·computeInverse 전 케이스·Ignore 정책·HISTORY_LIMIT·
    reduce 전 액션·deriveMutations·isModified 규칙·v1→v2 마이그레이션
    고정 + TD-1 재현 시나리오를 `{ todo: true }` 알려진 실패로
    포함(충족, 9-41 — 88 tests: 87 pass, 0 fail, 1 todo). **TD-1 수정
    시 그 테스트의 todo 표시를 제거해 상시 가드로 승격할 것.**

- [x] **연속 Undo 시 History 스택 오염 수정 (감사 TD-1)** — 9-42에서 완료
  - Priority(당시): P2 · Status: 완료 · Reason: 기술 부채 감사(9-39)에서
    재현된 잠재 버그 — undo() 완료 전 재호출 시 boolean 가드가 조기
    해제되어 역방향 Command가 History에 재기록(스택 오염) · Impact:
    `history/HistoryManager.js`(`isApplyingHistory` boolean →
    `applyingDepth` 카운터, 두 안 중 카운터 채택 — undo/redo 직렬화는
    CommandBus 큐와 이중 직렬화라 과함), `docs/HistoryArchitecture.md`
    (현재 구현 노트 갱신) · Dependency: 회귀 테스트 P1(9-41 충족) ·
    Risk: 중간이었으나 재현 테스트가 선행돼 있어 수정→todo 제거→통과의
    짧은 루프로 완료 · Completion Criteria: 재현 시나리오(연속 undo
    2회)가 `{ todo: true }` 제거 후 정식 통과 + 전체 88 tests 통과
    (충족, 9-42 — 88 pass, 0 fail, 0 todo).

- [x] **저장소 위생 — test.html 제거 + docs/.obsidian gitignore (감사 TD-6/TD-7)** — 9-43에서 완료
  - Priority(당시): P2 · Status: 완료 · Reason: test.html은 CommandBus
    우회 `dispatch()` 직접 호출(금지 패턴)을 담은 레거시 하니스로,
    실데이터 Page를 일괄 삭제하는 데모 버튼까지 있어 잔존 자체가 위험
    했음. docs/.obsidian은 개인 에디터 상태 파일 · Impact: `test.html`
    삭제(git rm), `.gitignore`에 `docs/.obsidian/` 추가 + `git rm
    --cached`(로컬 파일은 보존) · Dependency: 없음 · Risk: 낮음(이미
    검증됨 — 전역 grep으로 test.html 참조 0건 확인 후 삭제) ·
    Completion Criteria: 저장소에 test.html 없음 + .obsidian 미추적 +
    전체 테스트 88/88 통과로 앱 영향 없음 확인(충족, 9-43).

- [ ] **UI 통지 경로 이행 — storeChanged → Mutation 타겟 통지 (감사 TD-4, D-017 코드 이행)**
  - Priority: P2 · Status: 예정
  - Reason: 기술 부채 감사(9-39, TD-4)에서 확인, Research 탐구(9-44)에서
    사용자 승인으로 승격. `D-017`은 storeChanged 단일 브로드캐스트
    폐기를 결정했지만 코드의 실사용 분포는 반대다 — Mutation 타겟
    통지는 `PersistenceSubscriber` 1곳뿐, UI 전부(`ui/CueList.js`,
    `ui/PreviewPanel.js`, `output/BroadcastOutput.js`, `index.html`
    3곳)가 legacy `subscribe()`(storeChanged)를 쓴다. 결과적으로 모든
    dispatch마다 전 UI가 재통지받고, 특히 PreviewPanel은 매 통지마다
    DOM을 통째로 교체한다(9-35가 PreviewPanel에 Transition을 못 넣은
    구조적 원인). Emergency Overlay 등 UI 확장 전에 통지 경로가 먼저
    정리돼 있어야 새 UI가 legacy 경로를 또 늘리지 않는다 — 선행 가치.
  - Impact: `ui/CueList.js`, `ui/PreviewPanel.js`,
    `output/BroadcastOutput.js`, `index.html` 구독 3곳의
    `interestedMutations` 기반 이행, `store/AppStore.js`(legacy
    `subscribe()` 제거 또는 잔존 사유 명시).
  - Dependency: 없음 — 핵심 계층 회귀 테스트(9-41)가 안전망으로 이미
    깔려 있다. 저장 트리거 정리(TD-5, P3)와 같은 시기 처리 권장(둘 다
    Subscriber 계층).
  - Risk: 중간 — 각 UI가 관심 가질 Mutation 매핑을 실수하면 재렌더링
    누락(화면 stale)이 생긴다. Decision 충돌 없음 — 감사 문서(9-39)
    에서 확인했듯 이 작업은 `D-017`의 코드 이행이므로 결정과 정방향.
  - Completion Criteria: legacy storeChanged 구독 0곳(잔존 시 사유
    기록) + 각 UI가 관심 Mutation에만 반응 + 전체 테스트 통과 +
    Playwright로 편집/Live 흐름(선택, 송출 전환, 스타일 편집) 회귀
    없음 확인.

- [ ] **저장 트리거 정리 — SET_SELECTION/SET_LIVE_PAGE 저장 제거 (감사 TD-5)**
  - Priority: P3 · Status: 예정(UI 통지 이행과 같은 시기 처리 권장)
  - Reason: 기술 부채 감사(9-39, TD-5)에서 확인, Research 탐구(9-44)
    에서 사용자 승인으로 승격. `PersistenceSubscriber`의
    `interestedMutations`에 `SET_SELECTION`/`SET_LIVE_PAGE`가 포함돼,
    Page를 클릭하거나 Live 송출을 넘길 때마다 내용이 전혀 안 바뀐
    presentation 전체를 직렬화+localStorage 쓰기 한다(저장 페이로드에
    selection/live는 애초에 없음 — `D-004`). Live 진행 중 매 슬라이드
    전환마다 전체 직렬화가 도는 셈이라 `D-009`(안정적 송출 우선)와
    긴장 관계인 성능 부채다 — 버그가 아니라 의도된 동등 이전(파일
    주석 명시)이었으므로 P3.
  - Impact: `persistence/PersistenceSubscriber.js`(목록에서 2건 제거 +
    주석 갱신).
  - Dependency: 없음 — 회귀 테스트(9-41)로 동작 동등성 확인 가능.
  - Risk: 낮음 — `D-004`/`D-015` 경계 불변(감사 문서에서 확인 — 저장
    트리거만 줄고 저장 내용/경로는 그대로). REMOVE_PAGE처럼 SET_PAGES와
    동반되는 경우는 어차피 저장되므로 동작 손실 없음을 테스트로 확인할
    것.
  - Completion Criteria: 선택/Live 전환만으로는 저장이 발생하지 않고,
    내용 변경(SET_PAGES 등) 시 저장은 정상 동작 + 전체 테스트 통과.

- [x] **Asset/Song 관계 재검토** — 9-28에서 해소
  - Priority(당시): P1 · Status: 완료 · Reason: Song을 Asset의 하위 타입으로 둘지 별도로 둘지가 Library 설계 전체를 좌우함 · Impact: `domain/Song.js`, `AssetArchitecture.md`와의 경계 확정 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: `D-026`/`D-027`로 확정, Song은 별도 Aggregate·MVP 범위는 "가사 저장"만(충족). Reflow 도입 여부는 별도 열린 질문으로 남음(`Research/Observations.md` 2026-07-05) — 실사용 신호 생기면 재검토, 지금은 항목화하지 않음.

- [x] **스타일 기능(Page 단위)** — 이미 완성되어 있었음(확인만 함)
  - Priority(당시): P1 · Status: 완료 · Reason: 사이드바 편집 UI(정렬/굵기/크기/줄간격/색상/외곽선/그림자) 존재 확인 · Impact: `domain/Page.js`, `UPDATE_PAGE` 저장 경로 · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 신규 Page 생성 시에도 동일 적용 확인(충족). **(2026-07-06)** `D-022`로 "Page 단위 유지, Section Style 승격은 보류"를 확정 — 재가져오기(`D-021`) 기능을 실제로 설계할 때 재검토(트리거 아직 미충족).

---

## Section Migration TODO (D-Editor-4 — 9-19에서 완료)

`FutureEditor.md`의 `D-Editor-4`(Page 중심 소속 모델, D-Editor-1/D-Editor-3
대체)를 9-19에서 구현 완료. 아래 8개 하위 항목은 같은 세션 안에서 원자적으로
함께 구현된 하나의 마이그레이션 단위라, 필드는 그룹 단위로 한 번만 기록한다.

- Priority(당시): P0 · Status: 완료 · Reason: D-Editor-1/D-Editor-3(순서 기반 구간 소속)이 Page 이동 시 소속이 암묵적으로 바뀌는 문제를 일으켜 폐기, Page가 직접 `sectionId`를 갖는 명시적 모델로 대체 필요 · Impact: `domain/Section.js`, `domain/Page.js`, `domain/Presentation.js`, `store/AppStore.js`, `history/HistoryManager.js`, `persistence/Schema.js`(v1→v2), `ui/CueList.js`, `index.html` — 도메인 전 계층 · Dependency: 없음(설계는 `FutureEditor.md`에 사전 확정) · Risk: 높음(스키마 마이그레이션 포함, 실제로는 이미 검증 완료) · Completion Criteria: 아래 8개 하위 항목 전부 충족(9-19) + 마이그레이션 후 기존 데이터 로드 확인.

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

- [ ] **(Research, MVP 아님) Flow View / Content Browser 이중 뷰 구조**
  - Priority: P3 · Status: 보류(Research 단계, 질문 자체가 안 끝남)
  - Reason: `Research/2026-07-04 Workflow Separation.md`, `Research/2026-07-05 Browser-Flow Separation.md`에서 제기된 열린 질문 — 편집 흐름을 Flow View와 Content Browser로 분리할지 여부.
  - Impact: 미정 — 채택되면 `ui/CueList.js` 및 전체 편집 UX 구조에 영향, 아직 `Architecture.md`에도 반영 안 함.
  - Dependency: Research 결론 도출이 선행. 결론 없이 구현 착수 금지.
  - Risk: 현재는 없음(비활성 상태) — 채택 시 UX/아키텍처 전반에 파급되므로 높음.
  - Completion Criteria: Research 결론이 나서 채택/기각이 별도 Decision(D-0XX)으로 명문화됨.

---

## Feature TODO

사용자가 직접 체감하는 기능. 실제 동작 구현이 완료 기준이다 — 필드만
있고 아무것도 안 하면 미완료로 둔다.

- [x] **Transition** — 9-35에서 완료
  - Priority(당시): P2 · Status: 완료
  - Reason: `domain/Page.js`에 필드 뼈대만 있음(9-12), 실제 fade/cut 애니메이션이 없어 필드가 죽은 데이터였음.
  - Impact: `output.html`(크로스페이드 렌더링, `renderPage()`/`crossfadeToSlide()`), `index.html`(사이드바에 "전환" select 추가 — 뼈대만 있던 필드를 사용자가 실제로 설정할 방법이 없었어서 함께 추가), `domain/Page.js`(주석 갱신, 필드 자체는 무수정). `output/BroadcastOutput.js`/`view/PageView.js`/`ui/PreviewPanel.js`는 무수정 — 범위를 실제 "송출" 화면(output.html)으로만 한정(아래 참조).
  - Dependency: 없음. CSS transition 방식으로 구현(JS 타이머 애니메이션 대신 — 브라우저 네이티브 opacity transition + `setTimeout` 정리만 사용).
  - Risk: 낮음(구현 후 재평가) — Core Philosophy(송출 안정성 우선)상 우려했던 지점은 "연속으로 빠르게 전환할 때 이전 슬라이드가 안 지워지고 쌓이는 것"이었는데, DOM 조회 대신 `currentSlideEl` 변수로 "지금 진짜 보여지는 슬라이드"를 추적해 해결 — Playwright로 빠른 연속 전환(B→C, 이전 전환 완료 전에 다음 전환 트리거)까지 검증. `ui/PreviewPanel.js`는 의도적으로 범위에서 뺐다 — 매 상태 변경(편집 중 키 입력 포함)마다 재렌더링되는 구조라 페이드를 넣으면 편집 중에도 계속 재생돼 오히려 방해가 됨.
  - Completion Criteria: Live Mode에서 실제 fade/cut 전환이 시각적으로 확인됨(충족, 9-35). Playwright 브라우저 E2E 9건(전환 도중 슬라이드 2개 겹침 확인, 완료 후 1개로 정리, `none` 타입은 즉시 교체, 빠른 연속 전환에도 leak 없음)으로 검증.

- [ ] **Auto Advance**
  - Priority: P3(하향 조정, 2026-07-11) · Status: 보류 — **사용자 판단: Risk 대비 Return이 낮아 구현하지 않는 게 낫다(2026-07-11)**
  - Reason(원래 동기): `domain/Page.js`에 필드 뼈대만 있음(9-12), 실제 자동 전환 타이머가 없어 필드가 죽은 데이터임.
  - Impact: `domain/Page.js`(필드), 새 타이머/스케줄러 로직(`ui/PreviewPanel.js` 또는 신규 모듈), `command/CommandBus.js` 액션 추가 가능성.
  - Dependency: 없음.
  - Risk: 중간 — 타이머 기반 자동 진행은 Live 송출 중 의도치 않은 시점에 전환될 위험이 있어 신중한 테스트가 필요했음. **보류 판단의 근거: 이 Risk를 감당할 만큼 Return(체감 가치)이 크지 않다고 판단** — 필드가 죽은 채로 남아있는 것 자체는 무해하고(Undo/Persistence는 이미 대응됨, `Page.js` 주석 참조), 실사용에서 자동 전환이 필요하다는 신호가 없는 상태에서 Live 중 오작동 가능성이 있는 기능을 미리 만들어둘 이유가 약함(YAGNI).
  - Completion Criteria: (보류 상태이므로 해당 없음 — 재개하려면 먼저 "왜 지금 필요한가"의 근거부터 다시 세운다.)
  - **재검토 트리거**: 실사용 중 "자동으로 다음 Page 넘기고 싶다"는 구체적 요청/필요가 확인되면 그때 Priority/Risk를 다시 평가한다.

- [x] **Cue Label** — 9-16에서 해결
  - Priority(당시): P1 · Status: 완료 · Reason: CueList에서 텍스트 오버레이 유무를 구분할 방법이 없었음 · Impact: `ui/CueList.js` · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 원래 계획(오버레이 유무 표시)보다 확장되어 미디어 Page의 파일명 기반 `label`(수정 가능) 표시까지 포함(충족, 9-16). **(2026-07-05 브라우저 테스트 후 발견, 신규 항목으로 분리)** "가사첫줄 — 파일명" 조합이 항목 폭 제약으로 잘려 보임 — 아래 별도 항목 참조.

- [x] **CueList 항목 텍스트 잘림 개선** — 9-37에서 완료
  - Priority(당시): P3 · Status: 완료
  - Reason: Cue Label 항목에서 발견(2026-07-05) — 항목 폭 제약으로 "가사첫줄 — 파일명" 조합이 잘려 평상시 화면에서 순서/전체 텍스트 확인이 어려움. 우회로(Page 삭제 확인 문구에서만 전체 텍스트 노출)는 있었음.
  - Impact: `ui/CueList.js`(`.cue-preview`에 `title` 속성 추가). CSS/도메인/Store 무수정.
  - Dependency: 없음.
  - Risk: 낮음(이미 검증됨) — 설계 방향은 hover 툴팁으로 확정. 커스텀 툴팁 컴포넌트 대신 네이티브 `title` 속성을 재사용했다(Section 헤더의 `count.title`과 동일한 기존 패턴) — 레이아웃/CSS 변경 없이 가장 낮은 리스크로 완료 조건을 만족.
  - Completion Criteria: hover로 긴 텍스트를 확인할 수 있음(충족, 9-37). Playwright 브라우저 E2E 6건(텍스트/미디어 Page 둘 다 `title`에 전체 텍스트 포함, 실제 CSS ellipsis로 시각 잘림이 발생하는 상황 재현 확인)으로 검증.

- [x] **Image Overlay** — 9-17에서 해결
  - Priority(당시): P1 · Status: 완료 · Reason: video와 동일한 오버레이 패턴이 image에는 없었음 · Impact: `domain/Page.js`, `output/BroadcastOutput.js` · Dependency: video 오버레이 패턴(선행 구현됨) · Risk: 낮음(이미 검증됨) · Completion Criteria: video와 동일한 패턴 재사용 확인(충족, 9-17)

- [x] **Library** — 9-18에서 뼈대(빈 메뉴)만 완료
  - Priority(당시): P1 · Status: 완료(뼈대만) · Reason: Songs/Backgrounds/Videos를 한 곳에서 관리할 진입점 필요 · Impact: `index.html`(Library 모달 UI) · Dependency: 없음 · Risk: 낮음(이미 검증됨) · Completion Criteria: 카테고리 UI 표시(충족, 9-18). 실제 데이터 연결은 Song 쪽은 완료(아래), Media 쪽은 미완료 — [Media Library UI](#feature-todo) 참조.

- [x] **Section UI** — 하위 항목 전부 완료
  - Priority(당시): P0 · Status: 완료 · Reason: Section 없이는 Song → Flow 연결(Library-centric workflow)이 불가능 · Impact: `domain/Section.js`, `store/AppStore.js`, `ui/CueList.js`, `index.html` · Dependency: D-Editor-4(Section Migration, 위 참조)가 선행돼야 함 · Risk: 낮음(이미 검증됨) · Completion Criteria: 도메인 모델/Store/Persistence(9-13) + CueList Section Tree/접기/펼치기/Section 추가(9-14) + D-Editor-4 마이그레이션(9-19) + Section 삭제 UI(9-22) + 빈 Section에 Page 배정(9-23) + Section 순서 위/아래 이동(9-24) + 색상/메모 편집 UI(9-26) 전부 충족.

- [x] **Page 드래그 재정렬 UI** — 9-21에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Section Migration(D-Editor-4) 이후에야 위치 기반 재정렬이 안전하게 설계 가능해짐 · Impact: `ui/CueList.js`(HTML5 Drag and Drop) · Dependency: D-Editor-4(Section Migration) 완료가 선행 조건이었음 · Risk: 낮음(이미 검증됨) · Completion Criteria: Section 헤더/미분류 라벨 드롭 지원(빈 Section 진입점) 확인(충족, 9-21)

- [x] **Section 순서 위/아래 이동** — 9-24에서 완료
  - Priority(당시): P2 · Status: 완료 · Reason: Section이 여러 개 생기면 순서 조정 수단이 필요 · Impact: `domain/Presentation.js`(`moveSectionGroup()`), Section 목록 모달 UI · Dependency: Section Migration(D-Editor-4) · Risk: 낮음(이미 검증됨) · Completion Criteria: 인접 그룹 맞바꾸기(자기 자신이 역연산이라 Undo가 방향 반전만으로 충분) + ▲/▼ 버튼 + 유령 Section/맨 위/맨 아래 비활성화 확인(충족, 9-24)

- [x] **스타일 프리셋** — 9-27에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: 매번 서식 값을 수동으로 맞추는 반복 작업을 줄이기 위함 · Impact: `AppSettingsStore.js`(신규), 스타일 사이드바 UI · Dependency: `D-022`(Page가 서식 값 직접 소유) 확정이 선행 · Risk: 낮음(이미 검증됨) · Completion Criteria: `D-023`(값 복사, 참조 아님)/`D-024`(선택된 Page 하나에만 적용)/`D-025`(AppSettings 저장) 규칙대로 구현, 시스템 기본 프리셋 2개("찬양 기본", "설교 자막") 제공, 새로 저장/삭제 가능(충족, 9-27)

- [ ] **스타일 프리셋 — 다중 선택 Page 적용** ⚠
  - Priority: P3 · Status: 보류(`D-024` Non-goal 명시)
  - Reason: 여러 Page에 스타일을 한 번에 적용하고 싶은 잠재 수요가 있으나, 현재 선택 모델(`selectedPageId`, 단일)로는 지원 불가.
  - Impact: **⚠ 아키텍처 원칙 충돌** — `D-024`(Style Preset Apply Scope, MVP는 선택된 Page 하나만) Non-goal에 정면으로 해당하는 항목. 착수하려면 `PresenterState.selectedPageId`(단일 선택) 자체를 다중 선택 모델로 확장해야 하고, 이는 `SelectionArchitecture.md` 전반과 CueList/PreviewPanel의 선택 상태 처리 코드 전체에 영향을 준다 — 스타일 프리셋 기능 자체보다 훨씬 큰 범위.
  - Dependency: 다중 선택 State/UI 확장(현재 미착수, 별도 작업)이 반드시 선행돼야 함.
  - Risk: 높음 — 선택 모델 확장은 Selection/Interaction 아키텍처 전반에 파급.
  - Completion Criteria: (1) 다중 선택 모델이 별도로 먼저 완료되고, (2) 실사용 필요성이 재확인된 뒤, (3) `D-024`를 대체/보완하는 새 Decision이 작성된 다음에 착수.

- [x] **스타일 프리셋 — 업데이트(덮어쓰기)** — 9-34에서 완료
  - Priority(당시): P2 · Status: 완료
  - Reason: 지금까지는 항상 "새로 저장"만 가능해 비슷한 이름의 프리셋이 계속 늘어났음 — 기존 프리셋 값을 덮어쓰고 싶은 경우를 지원 안 했음.
  - Impact: `index.html`(프리셋 액션 행에 "덮어쓰기" 버튼 추가, `updateStylePreset()` 호출 — 이 store 함수는 9-27부터 이미 존재했으나 호출부가 없었음).
  - Dependency: 없음.
  - Risk: 낮음(이미 검증됨). **Decision 충돌 여부(강제 기준) — `D-023` Non-goal을 확인, 위반하지 않음**: 구현 범위를 "프리셋 정의 자체의 서식 값만 교체"로 한정했다. `updateStylePreset()`이 건드리는 건 `AppSettingsStore`뿐이고, `Page`는 애초에 `presetId` 같은 참조 필드를 갖지 않으므로(`D-023`) 이미 적용된 Page에 소급 반영될 코드 경로 자체가 존재하지 않는다 — "적용됐던 Page 일괄 업데이트" Non-goal과 구조적으로 충돌할 수 없다.
  - Completion Criteria: 기존 프리셋을 선택해 현재 값으로 덮어쓰는 UI가 동작하고, 이미 적용된 Page들에는 아무 영향이 없음을 확인(충족, 9-34). `store/AppSettingsStore.test.js` 5건(다른 프리셋 미영향 포함) + Playwright 브라우저 E2E 10건(덮어쓰기 이전에 만든 Page의 fontSize가 그대로 유지되는 것까지 실제 확인)으로 검증.

- [x] **Song 도메인 모델** (`domain/Song.js`) — 9-28에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Library-centric workflow의 전제 조건 · Impact: `domain/Song.js`(신규) · Dependency: Asset/Song 관계 재검토(`D-026`/`D-027`) 확정이 선행 · Risk: 낮음(이미 검증됨) · Completion Criteria: `D-026`(Song/LyricBlock, 메타데이터 없음) 규칙대로 구현(충족, 9-28)

- [x] **Song 저장소** (`store/SongStore.js`) — 9-28에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Song 도메인 모델의 영속화 필요 · Impact: `store/SongStore.js`(신규) · Dependency: Song 도메인 모델 · Risk: 낮음(이미 검증됨) · Completion Criteria: `AppSettingsStore.js` 패턴 재사용, `MediaStore.js`와 완전 독립(`D-027`) 확인(충족, 9-28)

- [x] **Song Library UI** — 9-29에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Song 저장소만으로는 사용자가 접근 불가, UI 연결 필요 · Impact: Library 모달 Songs 탭 · Dependency: Song 도메인 모델 + Song 저장소 · Risk: 낮음(이미 검증됨) · Completion Criteria: 목록/추가/편집/삭제 연결 확인(충족, 9-29). 삭제 2단계 확인 상태가 모달 재오픈 시 유지되는 버그는 9-31에서 수정(`a8a8449`).

- [x] **Song → Section → Page 생성** — 9-30에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Song을 실제 Flow(송출 순서)에 반영할 방법이 없으면 Library가 죽은 데이터 저장소일 뿐임 · Impact: `domain/Presentation.js`(`importSongAsSection()`), Library UI · Dependency: Song Library UI · Risk: 낮음(이미 검증됨) · Completion Criteria: Library에서 Song 선택 시 `Section`(`sourceSongId` 설정) + `Page[]` 생성(`D-021` 적용) 확인(충족, 9-30)

- [x] **Song 재가져오기(Pull) 연결** — 9-30에서 완료
  - Priority(당시): P1 · Status: 완료 · Reason: Song 원본 수정 후 이미 Flow에 배치된 Section에 반영할 방법 필요 · Impact: `domain/Presentation.js`, Section 목록 모달 UI · Dependency: Song → Section → Page 생성 · Risk: 낮음(이미 검증됨) · Completion Criteria: `D-021`의 전체 Replace(위치 유지) + `isModified` 경고 규칙 구현, "다시 가져오기" 버튼 + 경고 표시 확인(충족, 9-30)

- [ ] **Song CRUD/재가져오기의 Undo 지원** ⚠
  - Priority: P3 · Status: 보류(필요성 미확인 + 아키텍처 충돌 가능성)
  - Reason: 기존 Section CRUD처럼 Undo 미지원 상태(`FutureEditor.md` D-Editor-4 참조) — 사용자가 실수로 Song을 삭제하거나 재가져오기하면 되돌릴 수 없음.
  - Impact: **⚠ 아키텍처 원칙 충돌 가능성** — `D-027`은 "Song은 `CommandBus`/`HistoryManager`를 전혀 거치지 않는다"고 명시했다. Undo를 지원하려면 `SongStore` CRUD/`importSongAsSection`이 `CommandBus`/`HistoryManager` 경로를 타야 하는데, 이는 D-027이 세운 "Song은 Presentation의 Undo 히스토리와 무관한 별도 저장소"라는 경계를 흔든다. Section 생성/삭제(Undo 가능, Presentation 쪽)와 Song 원본 삭제(Undo 불가, Library 쪽)를 어떻게 구분할지부터 다시 결정해야 함.
  - Dependency: `D-027` 재검토 또는 이를 보완하는 새 Decision이 선행돼야 함 — 설계 없이 구현 착수 금지.
  - Risk: 높음 — 두 개의 독립된 히스토리 체계(Presentation Undo vs Library 비Undo)를 어떻게 공존시킬지에 대한 설계 결정이 없으면 착수 불가.
  - Completion Criteria: 새 Decision으로 Song Undo 범위(어떤 조작까지 되돌릴 수 있는지)를 확정한 뒤, 그 범위만큼 구현 + 회귀 테스트 통과.

- [x] **Media Library UI** — 9-33에서 완료 🔍(Research 근거로 범위 축소, Decision 충돌 아님)
  - Priority(당시): P1 · Status: 완료
  - Reason: Library 모달의 Songs 탭은 완성됐지만(9-29) Backgrounds/Videos 탭은 9-18 이후 빈 메뉴로 남아있었음.
  - Impact: `media/MediaStore.js`(`list()` 신규), `index.html`(Library 모달).
  - Dependency: 없음(`MediaStore.js` 이미 존재, `D-027`로 Song과 이미 분리).
  - Risk: 낮음(이미 검증됨). **Decision 충돌 여부(강제 기준) — 착수 전 `D-002`(Presentation이 Page를 직접 소유)를 확인, 위반하지 않음**: 이번 구현은 Page/Presentation 소유 구조를 바꾸지 않고 "Page 생성 시 기존 mediaId를 재사용하는 화면"만 추가했으므로 `D-002` 경계 안이다. **Research 참고(강제 아님) — `Research/2026-07-05 Library-Centric Workflow.md`**가 지적한 더 큰 위험(여러 Presentation 간 Asset 공유, GC 정책, Persistence 스키마 분리를 요구하는 전체 "Library-centric" 재구조화)은 아직 Decision으로 승격되지 않은 조사 단계라 이번 구현 여부를 막을 강제력은 없었다 — 다만 그 방향으로 확장할 때 실제로 부딪힐 문제라는 배경 정보로 참고해 범위를 스스로 좁혔다(아래 향후 검토 사항 참조).
  - Completion Criteria: Backgrounds/Videos 탭에서 목록/추가/삭제 동작 + "Flow에 추가"로 기존 mediaId를 재사용하는 새 Page 생성 확인(충족, 9-33). `media/MediaStore.test.js` 5건 + Playwright 브라우저 E2E 18건으로 검증.
  - **향후 검토 사항(Research 단계, Decision 아님)**: 여러 Presentation이 하나의 Media Asset을 공유하는 것, GC(미사용 Asset 정리) 도입, Persistence 스키마를 Presentation/Library로 분리하는 것 — 전부 `Research/2026-07-05 Library-Centric Workflow.md`의 열린 질문으로 남아있고, 이번 작업으로 해소되지 않았다. 이 방향으로 확장하려면 `D-002`를 다시 여는 별도 Decision이 먼저 필요하다.

- [x] **Section 추가 버튼의 `prompt()` 취약점** — 9-32에서 근본 해결
  - Priority(당시): P0 · Status: 완료 · Reason: **(2026-07-06 실사용 중 발견)** 브라우저가 `prompt()`/`alert()` 반복 호출을 감지하면 "추가 대화상자 차단" 체크박스를 띄우는데, 실수로 체크하면 이후 프롬프트가 즉시 `null`을 반환해 버튼이 안 먹는 것처럼 보이는 실사용 버그(보안 취약점이라기보다 UX 장애에 가까웠으나 근본 원인은 네이티브 API 의존) · Impact: `index.html`(Section 추가/스타일 프리셋 저장 두 호출부) · Dependency: 없음 · Risk: 낮음(부분 대응 3회 거친 뒤 근본 해결, node:test 회귀 가드 4건 + Playwright 브라우저 E2E 17건으로 검증됨) · Completion Criteria: 부분 대응(9-20, 9-21, 토스트 안내/자동 배정)에 이어, 9-32에서 `showTextPrompt()`(인앱 모달)로 교체해 `prompt()` 자체를 제거(충족) — 네이티브 dialog 미발생을 자동화 테스트로 확인.

- [x] **CueList/"초기화" 버튼의 잔존 `confirm()` 제거** — 9-36에서 완료(신규 발견, 사전에 TODO.md에 없던 항목)
  - Priority(당시): P0(발견 즉시 처리 — `prompt()`와 같은 위험군) · Status: 완료
  - Reason: **(2026-07-11, CueList 텍스트 잘림 개선 착수 중 발견)** 9-32는 `prompt()`만 인앱 모달로 교체했고, `confirm()` 두 곳(`ui/CueList.js`의 Page 삭제, `index.html`의 "초기화" 버튼)은 함께 고쳐지지 않은 채 남아있었다 — 브라우저가 반복 대화상자를 차단하면 버튼이 안 먹는 것처럼 보이는 동일한 위험. 전역 grep(`confirm(`/`prompt(`/`alert(`)으로 이 두 곳이 프로젝트 전체에서 유일한 실사용처임을 확인한 뒤 착수.
  - Impact: `ui/CueList.js`(Page 삭제 2단계 인라인 확인), `index.html`("초기화" 버튼 2단계 확인 + 관련 CSS), `ui/cuelist.css`(`.cue-delete-btn.is-confirming` — 스타일 소유권 원칙에 따라 index.html이 아닌 이 파일에 둠).
  - Dependency: 없음.
  - Risk: 낮음 — Song/Section/Media 삭제에서 이미 검증된 2단계 인라인 확인 패턴을 그대로 재사용. CueList는 항목 클릭으로 다른 Page를 선택하면 대기 중이던 삭제 확인을 취소하도록 추가(9-31의 `pendingDeleteSongId` 리셋 누락 회귀와 같은 종류의 문제를 사전 예방). "초기화" 버튼은 모달이 아니라 상시 노출된 툴바 버튼이라 3초 타임아웃으로 자동 취소를 추가(새로운 패턴이지만 국소적).
  - Completion Criteria: 전체 코드에 `confirm()` 호출이 없음(충족) — `index.test.js`에 정적 회귀 가드 4건 추가 + Playwright 브라우저 E2E 10건(네이티브 dialog 미발생, 2단계 확인 동작, 다른 항목 선택 시 취소, 타임아웃 자동 취소)으로 검증. `npm test` 51/51 통과.

- [ ] **데이터 내보내기/가져오기 + 저장소 persist (배포 전략 Research 선택지 B)**
  - Priority: P2 · Status: 예정
  - Reason: `Research/2026-07-11 Deployment Strategy.md`에서 승격(9-40).
    모든 데이터(Presentation/Song/AppSettings/Media)가 브라우저 소유
    저장소(localStorage/IndexedDB)에만 있고 백업 수단이 없어, 브라우저
    저장소 축출·프로필 정리 시 **찬양 라이브러리를 포함한 전체 데이터가
    복구 불가로 유실**된다 — D-009(안정적 송출 우선) 관점에서 현 구조의
    유일하게 "지금 아픈" 위험. 운영 환경 전제(데스크톱 중심, 9-40
    재평가)와 무관하게 불변인 결론이며, 장기적으로 EXE로 가더라도
    백업/기기 이전 기능으로 계속 필요하다.
  - Impact: `index.html`(내보내기/가져오기 UI — 다운로드/파일 선택),
    직렬화는 기존 `persistence/Schema.js`의 `withSchemaVersion`/
    `migrateSnapshot` 패턴 재사용, 내보내기 대상은 Presentation
    (STORAGE_KEY) + `store/SongStore.js` + `store/AppSettingsStore.js`.
    `navigator.storage.persist()` 호출은 부팅 경로(initUI)에 추가.
    **Media(IndexedDB blob) 포함 여부는 설계 시 결정** — 파일 크기/
    직렬화 비용 문제(Research 문서 Open Question 4).
  - Dependency: 없음. (핵심 계층 회귀 테스트 P1과 독립 — 이 기능은
    CommandBus/History를 거치지 않는 저장소 레벨 기능.)
  - Risk: 중간 — 가져오기(import)는 기존 데이터를 통째로 덮어쓰는
    파괴적 동작이라 확인 UX가 필수(2단계 인라인 확인 패턴 재사용,
    9-36과 동일 결). Decision 충돌 없음 확인됨(Research 5절):
    PresenterState/appMode는 내보내기에서 제외(D-004), 직렬화 형식은
    D-016 경계 준수, `version` 필드 포함(D-025 관행). 가져온 데이터는
    로드 경로와 동일하게 `migrateSnapshot`+`sanitizePresentation`을
    거쳐야 손상 파일에 안전.
  - Completion Criteria: (1) 내보내기 JSON에 version + Presentation +
    Song + AppSettings가 담기고 PresenterState는 미포함, (2) 빈
    브라우저에서 가져오기로 완전 복원, (3) 손상/미래 버전 파일
    가져오기 시 기존 데이터를 파괴하지 않고 거부, (4) persist() 호출이
    부팅에 포함, (5) 직렬화/역직렬화 회귀 테스트 + 브라우저 E2E
    (다운로드→복원 왕복) 통과.

- [ ] **Live Emergency Overlay (MVP)**
  - Priority: P2 · Status: 예정 — **착수 전 새 Decision 필수(아래 Dependency)**
  - Reason: Research 탐구(9-44)에서 사용자 승인으로 승격.
    `Research/Observations.md` 2026-07-08에 요구사항 7개가 이미 정리됨
    — Live 진행 중 돌발 상황(영상 재생 오류, 시작 지연, 음향 점검 등)
    에서 현재 송출 화면을 유지한 채 운영자가 수 초 내에 긴급 안내
    문구를 송출/해제할 수 있어야 한다. 일반 슬라이드 작성과 구분되는
    운영(Operational) 기능이며, 향후 Overlay Engine(Countdown/QR 등)의
    첫 기능이 될 수 있게 설계한다.
  - Impact: 새 Overlay State(위치 미정 — Presentation/Page가 아님,
    Observations 요구사항 2가 명시), `output.html`(최상단 렌더 레이어
    — Background → Video → Page Content → Cue → Emergency Overlay),
    `index.html`(Live 운용 화면의 상시 노출 UI), CommandBus 액션 추가
    가능성.
  - Dependency: **새 Decision 선행 필수** — Overlay State를 어디에 둘지
    (PresenterState 인접? 별도 Store?), CommandBus 경유 여부, `D-004`
    (PresenterState는 저장 제외)와의 관계를 D-NNN으로 확정한 뒤 착수.
    권장 착수 순서상 UI 통지 이행(TD-4, P2)이 먼저 정리되면 Overlay
    구독 설계가 legacy 경로를 늘리지 않는다.
  - Risk: 중간 — Live 송출 경로에 새 렌더 레이어를 얹는 작업이라
    `D-009`(안정적 송출 우선)에 직결. MVP 범위 제한은 Observations에
    이미 정의됨(텍스트 Overlay, 상/중/하 위치, 즉시 송출/종료, 출력
    대상 선택까지 — 애니메이션/스타일 편집/템플릿/이미지·영상 Overlay
    제외).
  - Completion Criteria: (1) Overlay State Decision 확정, (2) Live 중
    메시지 입력→송출 두 단계로 수 초 내 오버레이 표시, (3) 송출 중인
    슬라이드/Live Page/프로젝트 데이터가 전혀 변경되지 않고 해제 시
    원래 화면 즉시 복원, (4) 회귀 테스트 + Playwright E2E(송출 중
    오버레이 켜고 끄기, 슬라이드 전환과 병행) 통과.

- [ ] **"가사 추가" 경로의 Song 통합 검토**
  - Priority: P3 · Status: 보류(실사용 불편 신호 대기)
  - Reason: Research 탐구(9-44)에서 사용자 승인으로 P3 승격.
    `index.html`의 "가사 추가"는 `utils/lyricsImport.js`의
    `importLyrics()`를 직접 호출하는 **일방향 파이프라인**이다 —
    "실행 후 rawText는 버려진다. Page[]만 남는다"(파일 주석,
    `Research/Observations.md` 2026-07-05 Reflow 조사에서 재확인).
    Song(`D-026`/`D-027`)을 거치지 않으므로 원본 보존/재가져오기
    (`D-021`)의 혜택이 없고, 나중에 가사를 고치려면 Page를 하나하나
    수정해야 한다. "가사 추가"를 Song 생성 경유로 통합하면 근본 해소
    후보.
  - Impact: `index.html`("가사 추가" 흐름을 Song 생성 + `importSong
    AsSection()` 재사용으로 교체 또는 병존), `utils/lyricsImport.js`
    (역할 축소 또는 Song 생성 보조로 전환). 도메인/Store 무수정 가능
    (기존 Song 경로 재사용).
  - Dependency: 실사용에서 "가사 추가로 만든 Page를 나중에 통째로
    고치고 싶다"는 구체적 불편 신호 확인이 선행 — 신호 없이 착수하지
    않는다(Auto Advance 보류와 같은 YAGNI 판단).
  - Risk: 낮음~중간 — 기존 빠른 경로(Song 등록 없이 바로 Page 생성)를
    없애면 오히려 일회성 텍스트(설교 자막 등)에 마찰이 늘 수 있다. 두
    경로 병존 시의 혼란 여부가 핵심 설계 쟁점. Decision 충돌 없음
    (`D-026`/`D-027` 경계 안에서 호출 방향만 바뀜 — Song이 CommandBus
    를 안 거치는 구조는 유지).
  - Completion Criteria: 검토 결과(채택/기각/병존)가 기록되고, 채택 시
    "가사 추가"가 Song을 경유해 원본 텍스트가 보존됨 + 재가져오기
    동작 확인.

---

## 아키텍처 원칙 충돌 항목

기존 Decision과 부딪히는 미완료 항목만 모아 다시 정리한다 — 착수 전
반드시 아래 Decision을 먼저 열어볼 것.

| 항목 | 충돌 대상 | 충돌 내용 | 선행 필요 |
| --- | --- | --- | --- |
| 스타일 프리셋 — 다중 선택 Page 적용 | `D-024` | Non-goal에 "다중 선택 Page 적용"이 명시적으로 금지돼 있음 | 다중 선택 State/UI 확장 + `D-024` 대체 Decision |
| Song CRUD/재가져오기의 Undo 지원 | `D-027` | "Song은 CommandBus/HistoryManager를 전혀 거치지 않는다"와 정면 충돌 | `D-027` 재검토 또는 보완 Decision |

(스타일 프리셋 — 업데이트(덮어쓰기)는 9-34에서 범위를 좁혀 구현 완료 —
`D-023`과 충돌하지 않음을 확인했으므로 이 표에서 제외. 상세는
Feature TODO의 해당 항목 참조.)

---

## 사용 방법

- 새 아키텍처 리뷰나 기능 논의가 끝나면, 여기에 항목을 추가한다 —
  7개 필드(Priority/Status/Reason/Impact/Dependency/Risk/Completion
  Criteria)를 채우고, 기존 Decision과 충돌하면 ⚠ 표시와 함께 [아키텍처
  원칙 충돌 항목](#아키텍처-원칙-충돌-항목) 표에도 추가한다.
- 작업을 시작하기 전 이 문서의 "우선순위 로드맵"을 보고 우선순위를
  정한다. P0/P1부터, ⚠ 항목은 선행 Decision부터.
- 작업이 끝나면 체크하고, `Status: 완료`로 바꾸고, CurrentState.md에
  세션 번호를 남긴 뒤 여기에 그 번호를 연결한다. 완료 시 7개 필드는
  사후 기록으로 압축해 한 줄에 남긴다(위 완료 항목들 형식 참조).
- 오래돼서 더 이상 유효하지 않은 항목(요구사항이 바뀜, 다른 방식으로
  해결됨)은 이유와 함께 삭제한다 — 완료 표시(`[x]`)가 아니라 그냥
  삭제.
