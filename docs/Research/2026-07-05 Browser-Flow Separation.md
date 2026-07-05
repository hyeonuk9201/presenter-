# 2026-07-05 Browser-Flow Separation Architecture

> Status: Research
>
> 이 문서는 아직 확정되지 않은 아이디어와 논의 과정을 있는 그대로 기록한다.
> **구현 문서가 아니다.** 여기 적힌 내용은 Decision으로 승격되기 전까지
> 구현 근거로 쓰지 않는다.
>
> 이 문서는 `Research/2026-07-04 Workflow Separation.md`에서 시작된 논의를
> UX/화면 구성 관점으로 확장한 것이다 — 데이터 구조/자산 관리 관점은 의도적으로
> 분리해 `Research/2026-07-05 Library-Centric Workflow.md`에 별도로 담는다.
> 두 문서는 서로 연관되어 있지만, 서로 다른 축(화면 구성 vs 도메인 구조)을
> 다루므로 각자 독립적으로 성숙시킨 뒤 필요할 때 합친다.

---

## 배경

Section Tree UI(9-13~9-15)를 실사용하고, 이어서 D-Editor-4(Page 중심
소속 모델)를 논의하는 과정에서 반복적으로 같은 관찰이 나왔다 —
"CueList 하나가 너무 많은 역할을 동시에 하고 있다"는 것. 처음엔 Section
구조 문제로 보였지만, 논의를 계속하면서 실제로는 화면 구조 자체의 문제라는
쪽으로 좁혀졌다.

## 현재 CueList가 수행하는 역할

지금 `ui/CueList.js` 하나가 다음 세 가지 역할을 동시에 떠맡고 있다.

1. **Flow(진행)**: `Presentation.pages[]` 순서 그대로, Live 운영 기준
   화면. 현재 Live 중인 Page 강조, 클릭 시 Live 전환.
2. **Browser(탐색·관리)**: Section으로 그룹핑해서 전체 Page를 훑어보고,
   원하는 Page로 빠르게 이동. 9-13~9-15에서 추가된 Section Tree가 이
   역할을 강화하려던 시도였다.
3. **Editor(편집 진입점)**: Page를 선택하면 사이드바 편집 패널이
   연동되는 구조라, CueList 자체가 편집 대상 선택 UI 역할도 겸한다.

화면 하나에 이 세 가지가 계속 눌려 담기다 보니, Section 기능을 추가할
때마다("접기/펼치기", "미분류 표시", "Section 간 이동") 매번 "이게 진행
순서를 위한 기능인가, 탐색을 위한 기능인가"가 헷갈리는 지점이 반복해서
나왔다 — 예를 들어 D-Editor-1(Range 모델)이 겪었던 "앵커 Page를 옮기면
Section 경계가 함께 움직인다"는 문제도, 따지고 보면 "위치 이동(Flow의
책임)"과 "그룹 소속 변경(Browser의 책임)"이 하나의 조작(드래그)에
뭉뚱그려져 있었기 때문이라고도 볼 수 있다.

## Browser/Flow를 분리할 경우 얻는 장점

- **역할이 명확해진다.** Flow는 "지금 이 순서대로 진행한다"에만 집중하고,
  Browser는 "무엇을 어떻게 찾고 정리할까"에만 집중한다. 기능을 추가할 때
  "이건 어느 화면 책임인가"를 먼저 물을 수 있게 된다.
- **Live 중 안정성이 올라갈 여지가 있다.** Observations.md(2026-07-05)의
  ProPresenter 관찰에서 나온 "Show 모드는 변동성이 낮아야 한다"는 인상과
  맞닿아 있다 — Flow/Live 화면에서는 실수로 구조가 바뀔 위험을 줄이고,
  탐색·재구성 같은 조작은 Browser라는 별도 공간에 격리할 수 있다.
- **Section 설계의 부담이 줄어든다.** "미분류를 없앨 것인가", "Page가
  Section에 속하지 않을 수 있는가" 같은 질문이 Flow 안에서는 계속
  까다로웠는데, Browser가 별도로 존재하면 애초에 "아직 Flow에 없는
  콘텐츠"라는 자리가 생겨서 질문 자체가 완화될 가능성이 있다(단, 이건
  아직 열린 질문이다 — 아래 Open Questions 및 `2026-07-04 Workflow
  Separation.md`의 후속 논의 참조).
- **향후 Library/Asset 재사용과 자연스럽게 연결된다.** Browser가
  "탐색·관리" 전용 화면이 되면, 나중에 Library(재사용 가능한 콘텐츠
  저장소)가 생겼을 때 그 콘텐츠를 보여주는 자리로 확장하기 쉽다(관계는
  `Library-Centric Workflow.md` 참조).

## Browser는 어떤 역할을 담당할 수 있는가

아직 확정되지 않았고, 정확히 이 질문이 `2026-07-04 Workflow
Separation.md`에 Open Question으로 남아있다 — "Browser는 무엇을
브라우징하는 공간인가?"(Page Browser / Content Browser / Library
Browser 세 후보). 이 문서에서는 그 질문을 전제로, 세 후보 각각이
맡게 될 역할만 정리해둔다.

- Page 단위 탐색·재배치(Page Browser 후보)
- Text/Image/Video/Template 등 콘텐츠 유형을 아우르는 탐색(Content
  Browser 후보)
- Library(Project 외부 Asset 저장소) 탐색(Library Browser 후보)
- 공통적으로 기대되는 것: 검색, Section/카테고리별 그룹 보기, Flow로
  "배치"하는 동작(드래그 또는 버튼)

## Flow는 어떤 역할만 남게 되는가

Browser가 탐색·관리를 가져가면, Flow에는 다음만 남는다.

- `Presentation.pages[]` 순서 그대로의 진행 화면
- Section Grouping 표시(그룹 짓는 것 자체는 유지 — Section은 여전히
  Editor 개념, `FutureEditor.md` 정의 그대로)
- Live 전환, 현재 진행 위치 강조
- Live Order를 바꾸는 조작(재정렬) — 다만 "어떤 콘텐츠를 새로 가져올까"는
  더 이상 Flow의 책임이 아니게 된다(Browser에서 가져와 배치하는 동작으로
  이전)

## ProPresenter와 WorshipTools에서 얻은 인사이트

`Research/Observations.md`(2026-07-04~05)에 기록된 관찰을 이 논의
관점으로 재정리하면:

- **WorshipTools의 실패 경험**: 콘텐츠 관리(재사용)와 실제 진행(Live
  순서)이 한 화면/한 목록에 섞여 있어서, 콘티를 짤 때와 행사 진행 중
  필요한 조작이 계속 뒤섞이는 걸 실제로 겪었다. 클라우드 동기화 문제로
  작업이 초기화됐을 때 영상 연결 정보까지 다 날아간 경험도, 결국 "실행
  계획"과 "콘텐츠"가 구조적으로 분리돼 있지 않았기 때문이라고 볼 여지가
  있다.
- **ProPresenter의 Library/Playlist 분리**: Library에 등록된 Asset을
  Presentation이 참조하는 구조라, Presentation이 손상돼도 Asset은
  안전했다. 재사용 가능한 콘텐츠(Asset)와 "이번 행사에서 쓸 순서
  (Playlist)"는 라이프사이클이 다르다는 가설로 이어졌다.
- **ProPresenter의 Show/Edit 분리**: 운영(Show) 모드는 변동성을
  낮추고, Reflow 같은 예외적 수정 기능은 상단 메뉴에서 따로 활성화해야
  접근 가능하게 좁은 범위로 열어둔 것으로 관찰됐다. "사용자가 원하는
  기능"과 "사용자가 피하고 싶은 실수" 양쪽을 Workflow 설계에 반영하고
  있다는 인상.

이 프로젝트의 `presenterState.appMode`(edit/live)가 이미 이 Show/Edit
구분과 개념적으로 겹치는 부분이 있다는 것도 Observations.md에 메모돼
있다 — 다만 지금은 이름이 비슷한 정도이고, Browser/Flow 분리가 이
구분과 어떻게 합쳐질지는 아직 안 풀렸다.

## Open Questions

- **Browser는 무엇을 브라우징하는 공간인가?** (`2026-07-04 Workflow
  Separation.md`의 Open Questions, A/B/C 후보 참조 — 이 문서의 나머지
  질문 대부분이 여기 종속된다.)
- Browser는 별도 화면(Surface)인가, 아니면 같은 화면 안의 다른 패널/모드인가?
- Live 진행 중에도 Browser 접근을 허용할 것인가? 허용한다면 어떤 조작을
  막아야 안전한가(ProPresenter의 Reflow처럼 "제한된 긴급 수정"만
  허용하는 방식이 참고가 될 수 있다).
- `presenterState.appMode`(edit/live)와 Browser/Flow 구분은 같은 축인가,
  다른 축인가? 예를 들어 "edit 모드 + Flow"와 "edit 모드 + Browser"가
  둘 다 있을 수 있는가?
- Section은 Flow 전용 개념으로 남는가, 아니면 Browser의 그룹핑에도
  쓰이는가?
- Editor(사이드바 편집 패널)는 Flow에 남는가, Browser에도 필요한가,
  아니면 독립된 세 번째 Surface가 되는가?
- Browser → Flow로 콘텐츠를 옮기는 조작(드래그? 버튼? 둘 다?)의 UX는
  어떤 모양이어야 하는가?

## Decision으로 승격하기 전에 검토해야 할 항목

- **실사용 신호가 있는가?** Section 미분류 문제는 실제 QA 피드백(9-15)으로
  확인됐지만, "Browser가 없어서 실사용 중 불편했다"는 기록은 아직
  `CurrentState.md` 어디에도 없다 — `Observations.md`도 같은 판단을
  이미 남겨뒀다. 이 신호가 쌓이기 전에는 구현 우선순위로 끌어올리지
  않는다.
- 위 Open Questions, 특히 "Browser는 무엇을 브라우징하는가"에 대한 답이
  먼저 나와야 한다 — 이게 안 정해진 채로 화면을 만들면 나중에 다시
  갈아엎을 가능성이 크다.
- 최소한의 정보구조(IA) 초안 — 화면이 몇 개로 늘어나는지, 화면 간 이동
  경로가 어떻게 되는지 스케치가 필요하다.
- `Library-Centric Workflow.md`(데이터 구조 축)와의 정합성 — 두 문서가
  각자 성숙한 뒤, Browser의 데이터 소스가 Library인지 아닌지가 맞아
  떨어지는지 다시 확인해야 한다.
- 이 프로젝트 규모(단일 행사 중심, MVP)에서 화면을 늘리는 비용 대비
  이득이 맞는지 — Section 재설계 때처럼 "필요해 보이지만 사실 더 좁은
  문제"일 가능성을 항상 의심할 것(Research/Observations.md의 기존
  경계 원칙 재사용).
