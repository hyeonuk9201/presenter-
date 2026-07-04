# 2026-07-04 Workflow Separation

> Status: Research
>
> 이 문서는 아직 확정되지 않은 아이디어와 논의 과정을 있는 그대로 기록한다.
> **구현 문서가 아니다.** 여기 적힌 것 중 실제로 채택되어 구현 범위에 들어간
> 부분은 `FutureEditor.md`의 `D-Editor-4`를 참조하라 — 이 문서와 그 결정이
> 서로 어긋나면 D-Editor-4가 우선한다.
>
> 목적: "이번엔 왜 갑자기 방향이 바뀌었는가"를 나중에 다시 볼 때 재구성할
> 수 있게 하는 것. 결론만 남기면 다음에 이 프로젝트를 다시 여는 사람(또는
> Claude 세션)이 "왜?"를 모른 채 이전 설계를 옹호하거나, 반대로 이유 없이
> 뒤집으려 들 수 있다.

---

## 시작점: "미분류(Uncategorized)를 없앨 수 있을까?"

9-13~9-15에서 구현한 Section Tree UI를 실사용하면서, "Section에 속하지
않는 Page(미분류)"가 예외 상태로 남아있는 게 계속 신경 쓰였다. 처음
제안은 도메인 불변식을 바꾸는 것이었다:

> Presentation은 항상 최소 1개의 Section을 가진다. Page는 반드시 정확히
> 하나의 Section에 속한다.

이 제안은 검토 과정에서 기각되었다 — 이유는 아래 "논의 흐름 1".

## 논의 흐름

### 1. "미분류 제거"는 D-Editor-1(순서 기반 Range 모델)과 정면 충돌

`D-Editor-1`은 Section의 위치를 `startPageId`(실제 존재하는 Page)로
정의한다. "빈 Section이 정상 상태"라는 불변식은 이 전제 자체를 무너뜨린다
— Page가 하나도 없는 Section은 이 모델에서 "어디 있는지"를 표현할 방법이
없다. 즉 이건 정책 변경이 아니라 소속 결정 메커니즘 자체를 바꾸는
문제였다.

이 시점에 나온 대안 세 가지(A. Page가 sectionId 역참조, B. Section이
pageIds 소유, C. Section 마커를 포함한 통합 순서 리스트)를 비교했고,
결론 없이 "지금 당장 도메인을 바꿀 만큼 급한 문제는 아니다"로 일단
보류했다.

### 2. 재검토: 진짜 문제는 "미분류"가 아니라 "Section 간 이동 불가"

다시 논의하면서, 미분류/자동 편입/이동 불가 세 가지 불편함이 사실 하나의
원인("Page를 Section 간에 옮길 수 없다")에서 나온다는 게 확인됐다. 이
결론에 따르면 도메인을 바꾸지 않고도(D-Editor-1 유지) UX 문제 대부분이
해결될 것처럼 보였다 — `movePage()`를 호출하는 드래그 UI만 만들면
D-Editor-3("위치가 곧 소속")이 자동으로 나머지를 처리해 줄 거라는
판단이었다.

이 판단에서 발견된 유일한 문제: Section의 시작점(anchor) Page 자체를
옮기면 Section 경계 전체가 함께 움직여버린다 — Page 하나만 옮기려던
사용자 의도와 다른 결과(Section이 통째로 사라지거나 합쳐짐)가 나올 수
있다.

### 3. 다시 뒤집힘: GPT와의 논의 후 Page 중심 모델로 최종 결정

이후 별도로 GPT와 논의를 이어간 결과, 결국 "Page 중심(`page.sectionId`)
모델로 전환하고 Section은 계산하지 않는 순수 grouping metadata로
단순화한다"는 결론으로 다시 방향이 바뀌었다. Range 모델이 안고 있던
"앵커 이동 시 경계가 함께 움직인다"는 구조적 문제 자체를 없애는 방향이다.

이 전환이 새로 만드는 문제(아래)도 같은 논의에서 식별되고 답이 나왔다:

- **Live 진행 순서와 UI Grouping 분리 문제**: `sectionId`만 바꾸면
  `pages[]` 순서(실제 진행 순서)와 화면상 그룹 표시가 어긋날 수 있다.
  → 해결: `pages[]`를 Live Order의 SSOT로 계속 유지하고, Flow View는
  항상 `pages[]` 순서로 렌더링하며 Section은 grouping 표시만 담당한다.
  Section 이동은 `sectionId` 변경 + 대상 Section 끝으로 위치 재배치를
  함께 수행한다(Flow View 정렬 유지).
- **Section 자체의 표시 순서 SSOT가 없어짐**: `sectionIds` 배열을
  Presentation의 새 SSOT로 둔다.
- **Section 삭제 시 소속 Page 처리**: `sectionId = null`(미분류)로 되돌린다.
- **Content Browser 등에서 발생하는 순수 위치 이동이 Section 연속성을
  깰 수 있는 문제**: 자동 흡수(이동 후 새 이웃 기준으로 `sectionId` 재계산)
  방식을 채택 — 파편화를 허용하는 대안보다 사용자 정신 모델과 일치하고,
  구현/유지보수 비용도 더 낮다고 판단했다(ProPresenter류 UX가 "Section은
  항상 하나로 뭉쳐 보인다"는 기대를 주는 것과 일치).

**확정되어 구현 범위로 승격된 부분은 `FutureEditor.md`의 `D-Editor-4`에
있다.** 이 문서에서 중복 설명하지 않는다.

## 확장된 논의: Flow View / Content Browser 이중 뷰 구조 (여기서부터는 순수 Research)

Section 재설계 논의 중, ProPresenter식으로 UI 자체를 "실행용 화면"과
"편집/탐색용 화면"으로 나누면 어떨까 하는 아이디어가 나왔다. 다시
돌아보면 처음 고민은 "Section 구조를 어떻게 바꿀 것인가"였지만, 논의를
계속하면서 근본 문제는 Section이 아니라 **CueList 하나가 Flow(진행) /
Browser(탐색·관리) / Editor(편집) 세 가지 역할을 동시에 떠맡고 있다는
것**이라는 데 도달했다 — 화면 하나가 점점 복잡해지는 느낌의 원인이었다.

장기적으로 고려하게 된 구조:

```
Content Browser
        │
        ▼
   Flow View
        │
        ▼
     Live
```

- **Content Browser**: 전체 콘텐츠 탐색, 검색, 재사용, 관리. 모든 Page를
  Section과 무관하게 flat list로 표시 — Media/Text 선택 및 재배치용.
- **Flow View**: 실제 진행 순서(`pages[]`) 기반, Section Grouping, Live
  운영 기준 화면. 지금의 CueList와 비슷하되 이 문서의 결론(D-Editor-4)이
  반영된 버전.
- **Live**: 현재 송출 상태.

이건 **ProPresenter의 UI를 모방하려는 목적이 아니다.** 실제 운영 중
WorshipTools를 쓰면서 겪었던 문제(콘텐츠 관리, Asset 재사용, 편집과
진행이 한 화면에 섞여 있어 생기는 혼란)를 돌아보다가, ProPresenter가 왜
지금 같은 Workflow(Playlist/Flow와 Library/Browser의 분리)를 택했는지를
이해하게 됐고, 그 설계 원칙 자체를 연구 대상으로 삼게 된 것이다.

**이 아이디어는 아직 Research 단계다. 구현 범위(MVP)가 아니다.** 앞으로
이 방향으로 계속 검토하되, "이 Workflow가 왜 필요한가 / 운영자가 어떤
문제를 풀려고 이 구조를 쓰는가 / 이 프로젝트에는 어떤 형태로 맞을까"라는
질문을 먼저 풀고 나서야 Decision으로 승격할 대상이다. `Architecture.md`에는
아직 넣지 않는다 — Architecture는 확정된 것만 기록하는 문서이기 때문이다.

관련 원시 메모는 `Research/Observations.md` 참조.

## 실제 경험에서 나온 요구사항

이번 방향 전환에는 실제 운영 경험이 큰 영향을 주었다.

과거 집회에서 WorshipTools를 사용할 때, 클라우드 동기화 문제로 작업
내용이 초기화된 적이 있었다. 영상 연결 정보까지 모두 사라져 행사 직전에
여러 영상을 다시 연결해야 했고, 상당한 부담을 겪었다.

반면 ProPresenter는 Library에 등록된 Asset을 Presentation이 참조하는
구조였고, Presentation이 손상되더라도 Asset 자체는 유지되는 점이 매우
인상적이었다.

이 경험을 통해 다음 원칙을 장기 방향으로 고려하게 되었다:

> Presentation은 실행 계획(execution plan)이며, 콘텐츠는 독립적인
> 자산(asset)이다. 실행 계획이 손상되어도 자산은 영향을 받아서는 안 된다.

이 원칙은 지금 이 프로젝트의 `Page.mediaId` → `MediaStore`(IndexedDB) 참조
구조(Step6, 9-2/9-3)와 이미 방향이 같다 — Page는 Blob을 직접 들고 있지
않고 참조만 한다. 다만 지금은 "미디어 하나"에 대한 참조 수준이고,
ProPresenter/WorshipTools 경험이 가리키는 건 "Presentation 전체가
손상되어도 자산 라이브러리는 별도로 안전해야 한다"는 더 큰 범위의
원칙이다 — 이 프로젝트의 `TODO.md`에 있는 "Asset/Song 관계 재검토",
"Library" 항목과 직접 연결된다.

## 앞으로 연구할 내용

아직 구현 대상은 아니지만 앞으로 계속 관찰할 항목이다.

- Flow와 Browser의 책임 분리
- Editor를 별도 Surface로 분리하는 방식
- Asset Library 구조
- Presentation과 Asset의 참조 모델
- Live 운영 중 실수를 줄이는 Workflow
- ProPresenter가 UI가 아닌 Workflow를 어떻게 설계했는지

이번 논의는 단순히 Section 모델을 변경하는 작업이 아니었다. 오히려
Presenter가 앞으로 어떤 제품이 되어야 하는지에 대한 방향성을 다시
생각하게 된 계기였다. 앞으로는 ProPresenter의 UI를 모방하기보다, 왜 그런
Workflow를 선택했는지, 그리고 실제 운영에서 어떤 문제를 해결하려 했는지를
중심으로 연구를 이어갈 예정이다.

## 다음 연구 질문

- 왜 이 Workflow가 필요한가?
- 운영자가 어떤 문제를 해결하기 위해 이런 구조를 사용하는가?
- 이 프로젝트에 맞는 형태로 어떻게 적용할 수 있는가? (예: 이 프로젝트
  규모에서 Library/Asset 개념이 실제로 필요한 시점은 언제인가 — Section
  재설계처럼 "필요해 보이지만 사실 더 좁은 문제"일 가능성을 항상 의심할 것.)

## 이 문서를 읽는 방법 (Claude/후속 세션을 위한 메모)

- 여기 적힌 "Flow View / Content Browser" 같은 아이디어를 근거로 코드를
  바로 작성하지 말 것 — Research 단계 아이디어는 구현 승인이 아니다.
  D-Editor-4로 명시적으로 승격된 항목만 구현 대상이다.
- 반대로 D-Editor-1/D-Editor-3(Range 기반 모델)을 최신 설계로 착각하지
  말 것 — D-Editor-4가 이를 대체했다.
