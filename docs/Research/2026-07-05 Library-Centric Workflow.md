# 2026-07-05 Library-Centric Workflow

> Status: Research
>
> 이 문서는 아직 확정되지 않은 아이디어와 논의 과정을 있는 그대로 기록한다.
> **구현 문서가 아니다.** 여기 적힌 내용은 Decision으로 승격되기 전까지
> 구현 근거로 쓰지 않는다.
>
> 이 문서는 `Research/2026-07-05 Browser-Flow Separation.md`와 연관되어
> 있지만 의도적으로 분리했다 — 그 문서는 화면 구성/UX(사용자가 어떻게
> 작업하는가) 축을, 이 문서는 도메인/데이터 구조(콘텐츠를 내부적으로 어떻게
> 관리하는가) 축을 다룬다. 둘 다 성숙하면 하나의 Future Architecture 또는
> Decision으로 합칠 수 있으나, 지금은 각자 독립적으로 추적한다.

---

## 배경

`Research/2026-07-04 Workflow Separation.md`의 "실제 경험에서 나온
요구사항" 절에서 이미 다음 원칙이 장기 방향으로 제안된 바 있다.

> Presentation은 실행 계획(execution plan)이며, 콘텐츠는 독립적인
> 자산(asset)이다. 실행 계획이 손상되어도 자산은 영향을 받아서는 안 된다.

이 문서는 그 원칙을 Page/Media 구조 관점에서 더 구체적으로 파고든다.

## 현재 Page 중심 구조

지금 구조는 `domain/Page.js`가 `mediaId`로 `MediaStore`(IndexedDB)의
Blob을 참조하는 방식이다(Step6, 9-2/9-3에서 확립). Page는 Blob을
직접 들고 있지 않고 참조만 한다는 점에서 이미 "콘텐츠 분리" 원칙과
방향은 같다.

다만 지금 구조에는 다음과 같은 특징이 있다.

- **재사용 개념이 없다.** 업로드된 미디어는 그 Page 하나에 묶이는
  것을 전제로 동작한다 — 같은 영상을 여러 Page/여러 Presentation에서
  "다시 선택"해서 쓰는 흐름이 없다(매번 새로 업로드하거나, 최소한
  "이전에 올린 것 중에서 고르기"가 불가능).
- **`Presentation`이 `Page`를 직접 소유한다.** `Decisions.md`의
  `D-002`("MVP에서는 Presentation이 Page를 직접 소유한다")가 이미
  이 구조를 명시적으로 확정해뒀다.
- **GC(가비지 컬렉션)가 없다.** Page를 삭제하거나 이미지를 교체해도
  `MediaStore`의 레코드는 그대로 남는다(9-18 TODO.md에 "GC는 여전히
  범위 밖"으로 명시된 의도적 보류).
- **`label`(9-16)이 파일명 기반으로 붙지만, 이것도 Page 단위 필드다.**
  같은 파일을 다른 Page에서 쓰면 label도 다시 입력해야 한다 — 파일
  자체에 종속된 메타데이터가 아니다.

## Library 중심 구조의 개념

핵심 아이디어: Media(Image/Video)와 Song 같은 콘텐츠를 Page에 붙이기
전에 **Library라는 독립된 저장소에 먼저 등록**하고, Page는 그 Library
Asset을 "배치"만 하는 방식으로 바꾼다.

```
Media / Image / Song / Video
        │  (등록)
        ▼
     Library
        │  (배치)
        ▼
      Page
        │  (구성)
        ▼
  Presentation
```

이렇게 되면:

- 하나의 Library Asset을 여러 Page, 여러 Presentation에서 참조할 수
  있다.
- Asset 자체의 메타데이터(파일명, label, 원본 정보)는 Library에
  귀속되고, Page는 "이 위치에서 이 Asset을 보여준다"는 배치 정보만
  가진다.
- Presentation(실행 계획)이 손상되거나 초기화되더라도 Library(자산)는
  별도로 안전하게 남는다 — WorshipTools 사고 경험이 가리키는 원칙과
  직접 연결된다.

## Browser와 Library의 관계

`Browser-Flow Separation.md`의 Open Question("Browser는 무엇을
브라우징하는가")의 세 후보 중 **C안(Library Browser)**이 이 문서의
개념과 가장 직접적으로 맞물린다 — Library가 데이터 저장소 역할을 하고,
Browser는 그 Library를 탐색·검색·미리보기하는 화면 역할을 한다.

다만 두 문서는 서로를 전제하지 않는다. Browser가 A안(Page Browser)으로
좁게 결정되더라도 Library 자체는 별도로 존재할 수 있고(그 경우 Library
접근은 다른 진입점을 가짐), 반대로 Library 없이 Browser만 먼저 만들어질
수도 있다 — 그래서 이 두 문서를 의도적으로 분리해뒀다.

## Asset 재사용 관점

지금 구조에서 "재사용"이 막혀 있는 지점을 구체적으로 짚으면:

- 같은 배경 영상을 여러 Page에 쓰려면 매번 업로드부터 다시 해야 한다
  (혹은 최소한 "같은 mediaId를 다른 Page에도 연결"하는 UI가 없다 —
  기술적으로 `mediaId`를 공유하는 것 자체는 막혀있지 않지만, 그걸
  가능하게 하는 화면이 없다).
- Song(가사)의 경우 문제가 더 복잡하다 — `TODO.md`의 "Asset/Song 관계
  재검토" 항목이 정확히 이 질문이다: Song이 Asset 하나인지, 아니면
  "Page 여러 개 + 메타데이터"를 묶는 별도 Aggregate인지 아직 열려있다.
  `lyricsImport.js`가 원본 가사 텍스트를 버리는 일방향 구조라서
  (`Observations.md` 2026-07-05 참조), 지금은 Song을 하나의 재사용
  가능한 단위로 다루는 것 자체가 어렵다.

## 실사용 워크플로우 비교

| | 현재(Page 중심) | Library 중심 |
|---|---|---|
| 미디어 추가 | 업로드 즉시 해당 Page에 귀속 | Library에 등록 → 필요할 때 Flow에 배치 |
| 같은 파일 재사용 | 사실상 어려움(재업로드) | Library에서 다시 선택만 하면 됨 |
| Presentation 손상 시 | Page와 함께 mediaId 참조도 영향받을 수 있음(구조상 mediaId 자체는 살아있지만, Page가 사라지면 그 배치 정보는 사라짐) | Asset 자체는 Presentation과 무관하게 보존 |
| 파일명/라벨 관리 | Page마다 개별 관리(9-16 `label`) | Asset에 귀속, 여러 Page가 공유 가능 |
| 정리(GC) | 범위 밖(9-18 TODO) | Library 차원에서 "안 쓰는 Asset" 개념이 자연스럽게 생김 — 다만 이것도 별도 설계 필요 |

## WorshipTools와 ProPresenter에서 얻은 차이점

`Research/2026-07-04 Workflow Separation.md`에 이미 기록된 내용을 이
문서 관점(데이터 구조)으로 다시 요약하면:

- WorshipTools는 콘텐츠(Song/Background/Video)와 실행 순서가 한
  구조로 묶여 있었던 것으로 보이고, 클라우드 동기화 실패 시 영상
  연결 정보까지 통째로 날아간 경험이 있다 — 즉 Asset과 실행 계획의
  라이프사이클이 분리돼 있지 않았다는 근거로 볼 수 있다.
- ProPresenter는 Library(Asset)와 Playlist(실행 계획)가 명확히
  분리돼 있어서, Presentation이 손상돼도 Asset은 안전했다.

## 현재 구조와 충돌하는 부분

- **`D-002`("MVP에서는 Presentation이 Page를 직접 소유한다")와 정면
  충돌한다.** Library 중심 구조로 가려면 이 결정을 다시 열어야 한다.
  `Observations.md`(2026-07-05)에도 이미 "Asset/Song 관계 재검토는
  사실상 D-002를 다시 열지 말지를 묻는 질문"이라고 지적돼 있다.
- **Reflow(가사 원본 ↔ Page 양방향 재편집, `Observations.md` 참조)와
  맞물린다.** Library 중심 구조에서 Song을 재사용 가능한 단위로
  다루려면, 지금처럼 가사 원본 텍스트를 버리는 일방향 파이프라인
  (`lyricsImport.js`)으로는 부족하다 — Song Aggregate 설계가 먼저
  풀려야 한다.
- **GC 정책 부재와 충돌 소지가 있다.** Library가 생기면 "이 Asset을
  아무 Page도 안 쓰고 있다"는 상태가 훨씬 자주, 그리고 의도적으로
  발생한다(재사용을 전제로 하니까) — 지금처럼 GC를 완전히 범위 밖에
  두는 게 Library 도입 이후에도 유효한 판단인지 다시 봐야 한다.
- **Persistence 스키마 확장이 필요하다.** 지금 `persistence/Schema.js`는
  Presentation 하나를 통째로 저장하는 구조인데, Library가 Presentation과
  독립적으로 존재하려면 저장 단위 자체를 나눠야 한다(Presentation
  저장소와 Library 저장소를 분리하거나, 최소한 스키마 버전을 다시
  올려야 한다).

## 향후 검토해야 할 Open Questions

- Song은 Asset 하나인가, Page 여러 개 + 메타데이터를 묶는 별도
  Aggregate인가? (`TODO.md` "Asset/Song 관계 재검토"와 동일한 질문)
- Library Asset과 Page 사이의 참조 구조는 1:N인가, N:N인가? (하나의
  Asset을 여러 Page가 동시에 참조할 수 있어야 하는가)
- 같은 Asset을 여러 Presentation이 참조하는 상태에서, Asset을 수정하면
  이미 만들어진 Page들에도 변경이 전파돼야 하는가, 아니면 배치 시점의
  스냅샷을 유지해야 하는가?
- `D-002`를 다시 열 시점은 언제인가? ("Asset/Song 관계 재검토"
  착수 시점이 트리거라고 이미 `TODO.md`/`Observations.md`에 잠정
  기록돼 있다.)
- GC를 도입한다면 어떤 시점에, 어떤 기준(예: N일 이상 미참조)으로
  할 것인가?
- Reflow 기능을 Song Aggregate 설계 전에 부분적으로라도 먼저 만들
  가치가 있는가, 아니면 반드시 순서를 지켜야 하는가? (`Observations.md`
  결론은 "Song Aggregate 논의가 시작될 때 자연스럽게 끼워 넣는 게
  순서상 맞다" — 이 문서도 같은 판단을 유지한다.)
- Persistence 스키마를 Presentation과 Library로 분리할 때, 기존
  저장 데이터(Presentation 안에 미디어 참조가 있는 v1/v2 데이터)를
  어떻게 마이그레이션할 것인가?

## 아직 하지 않는 것

이 문서는 방향을 조사하는 단계이며, 다음을 전제하지 않는다.

- `D-002`를 지금 뒤집는 것
- `MediaStore`/`Schema.js`를 지금 변경하는 것
- Library UI(9-18에서 만든 빈 메뉴)에 실제 데이터를 연결하는 것

`TODO.md`의 "Asset/Song 관계 재검토" 항목이 실제로 착수될 때, 이
문서와 `Browser-Flow Separation.md`를 함께 다시 읽고 Decision으로
승격할 부분을 추려낸다.
