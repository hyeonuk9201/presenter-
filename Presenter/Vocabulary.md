# TC-Presenter Vocabulary

## Page

사용자에게 송출 가능한 최소 단위.

예시:

* 가사 한 화면
* 광고 한 화면
* 안내 문구 한 화면

Page는 "가사"가 아니다.

Page는 "송출 화면"이다.

```js
Page {
  id,
  type,
  text,
  fontSize,
  horizontalAlign,
  verticalAlign
}
```

---

## Presentation

Page들의 순서 집합.

Presentation의 책임은 순서 관리이다.

```js
Presentation {
  id,
  title,
  pages:[]
}
```

---

## PresenterState

행사 진행 중에만 존재하는 런타임 상태.

저장 대상이 아니다.

```js
PresenterState {
  selectedPageId,
  livePageId
}
```

---

## Selected Page

현재 편집 대상으로 선택된 Page.

특징:

* Edit Mode에서 사용
* Preview 변경 안 함
* Output 변경 안 함

---

## Live Page

현재 실제 송출 중인 Page.

특징:

* Live Mode에서 사용
* Preview 변경
* Output 변경

---

## Lyrics Import

메모장 가사를 여러 개의 Page로 변환하는 과정.

```text
raw lyrics
  ↓
lyricsImport()
  ↓
Page[]
```

Lyrics는 Import 단계에서만 존재한다.

시스템 내부 저장 모델은 Page이다.

---

## Style

Page에 적용되는 시각적 표현.

예시:

* 폰트
* 글자 크기
* 정렬
* 색상
* 그림자
* 외곽선

현재는 Page 내부 속성으로 존재한다.

향후 Style 객체로 분리 가능하다.

---

## Media

Page에 연결되는 이미지 또는 영상 리소스.

향후 Page는 mediaId를 참조할 수 있다.

---

## Edit Mode / Live Mode

앱 전체의 동작 모드.

Edit Mode

* CueList 클릭 → SELECT_PAGE만 수행
* Preview 및 output.html은 변경되지 않음
* Page 생성, 수정, 삭제 작업을 수행하는 모드

Live Mode

* CueList 클릭 → SELECT_PAGE + GO_LIVE 수행
* 클릭 즉시 Preview 및 output.html 갱신
* 행사 진행 중 송출을 제어하는 모드

두 모드는 명시적으로 전환한다.

---

## Add Mode / Edit Mode (Editor)

Editor 패널 내부 상태.

앱 전체의 Edit Mode / Live Mode와는 별개 개념이다.

Add Mode

* selectedPageId = null
* 새 Page 작성 상태
* "가사 추가" 버튼 표시
* Editor는 신규 Page 입력을 위한 상태

Edit Mode (Editor)

* selectedPageId 존재
* 기존 Page 수정 상태
* "저장" 버튼 표시
* 선택된 Page의 데이터가 Editor에 로드됨

---

## STANDBY

송출 중인 Page가 없는 상태.

livePageId = null 이면 STANDBY 상태가 된다.

STANDBY 상태에서는:

* PreviewPanel에 송출 대상이 없음
* output.html에 대기 화면 표시
* CLEAR_LIVE 수행 시 STANDBY로 전환

STANDBY는 Presenter의 기본 출력 상태이다.

---

## Element

Page를 구성하는 표현 요소.

예:

* Text Element
* Image Element
* Video Element

Element는 실제 파일을 소유하지 않는다.

---

## Asset

Presentation이 사용하는 외부 리소스.

예:

* Image File
* Video File

Asset은 실제 파일 정보를 관리한다.

---

## Local First

Presenter의 기본 운영 원칙.

콘텐츠는 클라우드보다 로컬 저장소를 우선 사용한다.

예:

* PC 저장소
* 외장 SSD
* USB 저장소

---

## Renderer

Page를 실제 출력으로 변환하는 계층.

Renderer는 Domain을 해석하여 화면에 표시한다.

Renderer는 Domain 객체가 아니다.

---

## Editor

사용자의 편집 의도를 수집하는 UI Layer.

Domain을 소유하지 않는다.

---

## Editor State

Editor가 소유하는 UI 상태.

예:

- selectedPageId
- selectedElementId
- activeInspector
- drag state
- resize state

---

## Inspector

특정 Element 유형을 편집하기 위한 UI 컴포넌트.

예:

- TextInspector
- ImageInspector
- VideoInspector

---

## Command

사용자의 편집 의도를 표현하는 Application Layer 객체.

Domain 변경 요청을 표현한다.

---

## Command Catalog

시스템이 지원하는 Command 목록.

---

## Batch Command

여러 Command를 하나의 사용자 작업으로 묶는 Command.

Undo/Redo 단위를 정의한다.

---

## Asset

외부 리소스를 표현하는 Registry Entity.

Element는 Asset을 소유하지 않고 assetId로 참조한다.

---

## AssetRegistry

Asset의 Single Source of Truth.

assetIds와 assetMap으로 구성된다.

---

## Registry Entity

Aggregate 외부에 존재하며 ID로 참조되는 Entity.

예:

Asset

---

## Reference

생명주기를 소유하지 않고 ID로 참조하는 관계.

예:

Element → Asset

---

## Ownership

하위 객체의 생명주기와 구조를 책임지는 관계.

예:

Presentation → Page
Page → Element

---

## Garbage Collection (GC)

참조되지 않는 Asset을 정리하는 과정.

예:

referenceCount == 0
→ GC Candidate

---

## Asset

외부 리소스를 표현하는 Registry Entity.

Element는 Asset을 소유하지 않고 assetId로 참조한다.

---

## AssetRegistry

Asset의 Single Source of Truth.

assetIds와 assetMap으로 구성된다.

---

## Registry Entity

Aggregate 외부에 존재하며 ID로 참조되는 Entity.

예:
Asset

---

## Reference

생명주기를 소유하지 않고 ID로 참조하는 관계.

예:
Element → Asset

---

## Ownership

하위 객체의 생명주기와 구조를 책임지는 관계.

예:
Presentation → Page
Page → Element

---

## Garbage Collection (GC)

참조되지 않는 Asset을 정리하는 과정.

예:

referenceCount == 0
→ GC Candidate

---

## Snapshot

Persistence를 위해 저장 가능한 Domain State의 직렬화 결과.

Snapshot은 Runtime State를 포함하지 않는다.

---

## ExportDocument

외부 파일 생성을 위한 Export 전용 DTO.

Snapshot과 다르며 PDF, PNG, PPTX, Print Export 등에 사용된다.

---

## ImportResult

Importer가 생성하는 Runtime 독립 DTO.

외부 파일 포맷을 Domain으로 변환하기 위한 중간 표현이다.

---

## FormatExporter

ExportDocument를 특정 파일 포맷(PDF, PNG, PPTX 등)으로 변환하는 컴포넌트.

---

## Import Mode

Import 수행 방식.

* Replace
* Merge

---

## Replace Import

현재 문서를 제거하고 새로운 문서로 교체하는 Import 방식.

---

## Merge Import

현재 문서를 유지하면서 Page와 Asset을 추가하는 Import 방식.
