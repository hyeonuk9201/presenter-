# DocumentationHierarchy.md

> **Status: Draft / 제안 (Decision 아님)**
>
> 이 문서는 `docs/` 폴더의 각 문서가 실제로 어떤 역할을 하고 있는지,
> 그리고 문서끼리 내용이 어긋날 때 어떤 순서로 신뢰해야 하는지를
> **현재 운영 방식을 관찰해서 정리한 초안**이다. 새 규칙을 만드는 게
> 아니라, 이미 문서들 스스로가 암묵적으로/명시적으로 선언해온 순서를
> 한곳에 모아본 것에 가깝다 — 아래 각 항목에 "문서에 명시됨"과 "이
> 초안이 추정함"을 구분해뒀다.
>
> **확정 문서가 아니다.** 여기 적힌 우선순위/역할 구분에 동의하면
> `Decisions.md`에 D-0XX로 승격하거나, 이 문서 자체의 Status를
> "Confirmed"로 바꾸는 별도 결정이 필요하다. 그 전까지는 참고용
> 지도(map)일 뿐이다.

---

## 이미 문서들 스스로 선언한 순서 (이 초안이 새로 만든 게 아님)

아래는 각 문서 파일 안에 이미 적혀 있던 우선순위/흐름 선언을 그대로
모은 것이다 — 이 초안의 "발명"이 아니라 "발견"이다.

1. **`Research/Observations.md`**가 명시한 문서 흐름 파이프라인:
   > Observation(이 문서) → Research → Decision → Architecture →
   > Implementation → CurrentState.

2. **`FutureDomain.md`** 머리말:
   > "이 문서는 미래 Domain 방향성을 기록한다. 현재 구현을 의미하지
   > 않는다. **Decisions보다 우선순위가 낮다.**"

3. **`FutureEditor.md`** 머리말:
   > "이 문서는 미래 Editor 방향성을 기록한다. 현재 구현을 의미하지
   > 않는다. **FutureDomain보다 구현 우선순위가 낮다.**"
   > → 즉 문서들 스스로 `Decisions.md` > `FutureDomain.md` >
   > `FutureEditor.md` 순서를 이미 선언해뒀다.

4. **`Research/2026-07-04 Workflow Separation.md`** 머리말:
   > "여기 적힌 것 중 실제로 채택되어 구현 범위에 들어간 부분은
   > `FutureEditor.md`의 `D-Editor-4`를 참조하라 — **이 문서와 그
   > 결정이 서로 어긋나면 D-Editor-4가 우선한다.**"
   > → Research 문서 자신이 "나는 관련 Decision에게 진다"고 밝혀둔
   > 실제 사례.

5. **`Architecture.md`** 머리말(CurrentState.md 참조부):
   > "다음 작업 목록은 TODO.md 참조(**2026-07-03부터 여기 요약 대신
   > TODO.md가 단일 출처**)."
   > → `Architecture.md`의 "Current Priorities"/"Future Expansion"
   > 절은 2026-07-03 이후로는 본인 스스로 유효하지 않다고 밝힌 것과
   > 같다. 실제로 이 절들은 Walking Skeleton 시기(9-12 이전)의
   > 내용이 그대로 남아있다 — TODO.md가 대체한 뒤 갱신되지 않았다.

6. **`Vocabulary.md`**의 `Page` 항목은 Phase 2(Element 모델) 기준
   구조를 적어두고, 곧바로 괄호로 "CurrentState.md 기준 실제 구현은
   아직 Element 모델 이전 단계"라고 스스로 각주를 단다 — 목표 구조와
   현재 구현이 다를 수 있음을 문서 자신이 인지하고 있다.

7. **어제(2026-07-11) 대화에서 사용자가 확정한 규칙**(아직
   `Decisions.md`에는 없고 `TODO.md` 필드 정의 절에만 기록됨):
   `Decisions.md`만 충돌 판단의 강제 기준이고, `Research/*.md`는
   위험 신호/배경 근거일 뿐 강제력이 없다. (⚠ = Decision 충돌,
   🔍 = Research 근거로 범위 축소, `TODO.md` 참조)

---

## 우선순위 계층 제안 (Tier)

아래 Tier 구분과 각 Tier 안의 상대 순서는 위 1~7번 근거를 바탕으로
이 초안이 **정리**한 것이다. Tier 사이의 "누가 이긴다"는 위에서
문서 스스로 밝힌 것(1~5번)과 사용자가 이미 확정한 규칙(7번)을
그대로 반영했고, 그 사이를 메우는 나머지 배치는 **추정**이다 —
동의 여부 확인 필요.

```
Tier 0  Decisions.md
          │ (충돌 시 반드시 우선 — 유일한 강제 기준, 이미 확정된 규칙)
Tier 1  Architecture.md + *Architecture.md 시리즈 + DomainEntityArchitecture.md
          │ + Vocabulary.md, Conventions.md
          │ (구조/네이밍 설계 참조 — 아래 "주의" 참조: 상당수가 Phase 2
          │  목표 구조를 서술하며 현재 코드와 다를 수 있음)
Tier 1.5 FutureDomain.md > FutureEditor.md
          │ (Proposal 상태, 문서 스스로 Decisions보다 낮다고 선언)
Tier 2  Research/*.md (날짜별 문서) + Observations.md
          │ (조사/가설/원시 메모 — 비강제, Decision으로 승격되기 전까지
          │  배경 근거로만 사용)
Tier 3  TODO.md
          │ (실행 로드맵 — Tier 0/1/1.5/2를 참조해서 우선순위를 매기는
          │  소비자 쪽 문서)
Tier 4  CurrentState.md
          │ (실제 구현 이력 — "지금 코드가 실제로 뭘 하는지"의 최종 근거)
Tier 5  ManualTestChecklist.md
          (QA 추적 — 다른 Tier와 병렬, 우선순위 축에 속하지 않음)

곁가지  AI Development Workflow.md
          (TC-Presenter 도메인과 무관한 범용 협업 프로세스 문서 —
           이 계층 자체의 대상이 아님, 별도 취급 제안)
```

**주의 (Tier 1 관련, 추정)**: `Architecture.md`와 `*Architecture.md`
시리즈는 서술 어조가 단정적("~이다")이라 마치 지금 코드 상태를 그대로
설명하는 것처럼 읽히지만, 실제로는 상당 부분이 **Phase 2 목표
구조**(Element 모델, AssetRegistry, `session.*` 통합 State 등)를
서술한다 — `AppStoreArchitecture.md`(D-014/Phase 2 Amendment 명시),
`Vocabulary.md`(Page 항목 자체 각주)에서 확인됨. 나머지 개별
`*Architecture.md` 파일들(Persistence/Command/CommandBus/Selection/
Serialization/StateMutation/Subscriber/Interaction/Output/Import/
Editor)은 이번 초안 작성 과정에서 머리말 수준만 확인했고, 각 파일이
"지금 코드와 정확히 일치"인지 "Phase 2 목표"인지까지는 파일별로 전수
확인하지 않았다 — **필요할 때 해당 도메인 코드/CurrentState.md와
대조해서 확인**하는 걸 제안한다(이 초안이 그 대조 작업까지 하진
않았음).

---

## 문서별 역할 표

| 문서 | 역할 | 강제력 | 근거 |
| --- | --- | --- | --- |
| `Decisions.md` | 확정된 설계 결정(D-0XX) 기록 | **강제** — 충돌 판단의 유일한 기준 | 사용자 확정(2026-07-11), 문서 서문("새 기능을 추가하거나 구조를 변경할 때는 기존 결정을 먼저 확인한다") |
| `Architecture.md` | 전체 아키텍처 개요, MVP 현재 구조 + Phase 2 목표 구조 병기 | 참고 — Current Priorities/Future Expansion 절은 2026-07-03부로 TODO.md에 자리를 내줌(본문 명시) | 문서 자체 명시 |
| `AppStoreArchitecture.md`, `PersistenceArchitecture.md`, `AssetArchitecture.md`, `Command Architecture.md`, `CommandBusArchitecture.md`, `DomainEntityArchitecture.md`, `Editor Architecture.md`, `HistoryArchitecture.md`, `ImportPipeline.md`, `InteractionArchitecture.md`, `OutputArchitecture.md`, `SelectionArchitecture.md`, `SerializationArchitecture.md`, `StateMutationArchitecture.md`, `SubscriberArchitecture.md` | 레이어별 책임 경계 설계 참조(각 시스템의 "이렇게 나뉘어야 한다") | 참고 — 일부는 Phase 2 목표, 일부는 현재 구현과 일치(파일별 확인 필요) | 추정(위 "주의" 참조) |
| `Vocabulary.md` | 공용 용어 사전 | 참고 — 다른 문서들이 이 용어를 전제로 서술 | 문서 자체 각주로 현재/목표 구분 명시 |
| `Conventions.md` | 네이밍/스타일 규칙(PascalCase/camelCase/UPPER_SNAKE_CASE 등) | 참고이지만 다른 Tier 1 문서와 달리 **지금 바로 적용되는 규칙**(Phase 구분 없음으로 보임) | 추정(문서에 Phase 언급 없음) |
| `FutureDomain.md` | 미래 Domain 방향성 제안 | Proposal — Decisions보다 낮음 | 문서 자체 명시 |
| `FutureEditor.md` | 미래 Editor 방향성 제안 | Proposal — FutureDomain보다 낮음 | 문서 자체 명시 |
| `Research/*.md`(날짜별) | 특정 주제 조사/논의 과정 기록 | 비강제 — 위험 신호/배경 근거, Decision으로 승격 전까지 구현 근거 아님 | 각 문서 서문 명시 + 2026-07-11 사용자 확정 |
| `Research/Observations.md` | 날짜별 원시 메모(결론 아님) | 비강제 — Research보다도 이전 단계 | 문서 자체 명시("결론이 아니라 그때그때 든 생각") |
| `Research/AI Development Workflow.md` | 프로젝트 무관 범용 AI 협업 프로세스 정리 | 이 계층 밖 — TC-Presenter 도메인 결정에 관여하지 않음 | 문서 자체 명시("특정 프로젝트에 종속되지 않으며") |
| `TODO.md` | 실행 우선순위 로드맵(Priority/Status/Reason/Impact/Dependency/Risk/Completion Criteria) | 실행 계획 — Decisions/Research를 참조해서 우선순위를 매기는 소비자 | 2026-07-11 개편 |
| `CurrentState.md` | 세션별 구현 이력(append-only) | 사실 기록 — "지금 코드가 실제로 뭘 하는지"의 최종 근거 | 문서 서문("무슨 일이 있었는지") |
| `ManualTestChecklist.md` | 브라우저 전용(비자동화) 검증 추적 | QA 보조 — 우선순위 축과 무관 | 문서 서문(D-028 참조) |

---

## 충돌 시 해석 순서 (제안)

문서 두 개가 서로 다른 말을 할 때 어떻게 판단할지 제안한다 — 이것도
아직 **제안**이며, Decisions.md에 별도 D-0XX로 명문화되기 전까지는
관행 수준으로만 취급한다.

1. `Decisions.md`에 관련 D-0XX가 있으면 무조건 그것을 따른다.
2. 없으면, Tier 1(Architecture 계열)이 "목표 구조"인지 "현재 구조"인지
   구분해서 본다 — 헷갈리면 `CurrentState.md`(실제 구현 이력)를
   기준으로 "지금은 아직 아니다"를 확인한다.
3. `FutureDomain.md`/`FutureEditor.md`끼리 충돌하면 `FutureDomain.md`가
   우선한다(문서 자체 선언).
4. `Research/*.md`는 그 자체로 어느 쪽도 강제하지 않는다 — 위험 신호로
   참고하되, 실제 판단은 관련 Decision을 찾아보거나 새로 만든다.
5. 그 무엇도 없으면(완전히 새로운 영역) `Decisions.md`에 새 D-0XX를
   만드는 것부터 시작한다 — `Research/Observations.md`가 정의한
   Observation → Research → Decision 흐름을 따른다.

---

## 확인이 필요한 부분 (이 초안이 자신 있게 말하지 못하는 것)

- Tier 1의 개별 `*Architecture.md` 15개 파일 각각이 "현재 구현과
  일치"인지 "Phase 2 목표"인지 파일 단위로 전수 조사하지 않았다 —
  필요해지는 시점(그 레이어를 실제로 건드릴 때)에 개별 확인 권장.
- `Conventions.md`를 Tier 1과 같은 급으로 둔 것은 추정이다 — 네이밍
  규칙은 구조 설계와 성격이 달라서 별도 Tier로 뺄지도 검토 대상.
- "충돌 시 해석 순서" 절 자체가 지금까지 실제로 쓰인 적은 없다(이번에
  처음 정리) — 다음에 실제 문서 충돌 상황이 생기면 이 순서가
  실전에서도 맞는지 재검증 필요.
- 이 문서 자체를 `Decisions.md`에 D-0XX로 승격할지, 아니면 계속
  "참고용 지도" 상태로 둘지는 아직 결정하지 않았다.
