# TC-Presenter CurrentState

본 문서는 현재 구현 상태를 기록한다.
최종 목표 구조는 Architecture.md 및 Decisions.md를 따른다.

마지막 업데이트: 2026-06-14

---

# MVP 상태

현재 MVP 사용 가능 상태

완료:

* Create (Page 생성)
* Read (CueList / Preview)
* Update (Page 수정)
* Delete (Page 삭제)
* Broadcast (output.html 송출)
* Persistence (localStorage 저장/복원)

---

## 완료된 기능

### Walking Skeleton

* Page 모델 → AppStore → CueList → PreviewPanel → BroadcastChannel → output.html
* Edit Mode / Live Mode 분리

### Page 수정

* Edit Mode에서 CueList 클릭 → Editor에 내용 로드
* 저장 버튼 → UPDATE_PAGE dispatch
* 수정 후 CueList / Preview / Broadcast 즉시 반영

### Page 삭제

* CueList 아이템 hover → 삭제 버튼 표시
* confirm 후 REMOVE_PAGE dispatch
* 삭제된 Page가 selected 상태였으면 → 추가 모드 복귀
* 삭제된 Page가 live 상태였으면 → STANDBY 화면 전환

### Editor UX

* Edit Mode에서 Page 클릭 → 수정 모드
* 새 Page 버튼 → 추가 모드 복귀
* 새 Page 진입 시 Editor 초기화
* 삭제된 Page가 selected 상태였을 경우 Editor 초기화

### localStorage 저장

* presentation(title + pages) 자동 저장
* 앱 시작 시 자동 복원
* PresenterState는 저장하지 않음

---

## Action 목록

| Action          | 설명      |
| --------------- | ------- |
| ADD_PAGE        | Page 추가 |
| REMOVE_PAGE     | Page 삭제 |
| UPDATE_PAGE     | Page 수정 |
| MOVE_PAGE       | 순서 변경   |
| SET_TITLE       | 제목 변경   |
| SELECT_PAGE     | 선택      |
| CLEAR_SELECTION | 선택 해제   |
| GO_LIVE         | 송출      |
| CLEAR_LIVE      | 송출 해제   |

---

## Persistence 정책

저장 대상:

* presentation.title
* presentation.pages

저장 제외:

* selectedPageId
* livePageId

앱 시작 시:

* selectedPageId = null
* livePageId = null

---

## Known Technical Debt

### CueList Mode 판정

현재 CueList는 DOM class를 읽어 Edit Mode / Live Mode를 판정한다.

현재 구현:

document.getElementById('app')
?.classList.contains('mode-live')

이는 MVP 기준으로는 충분히 단순한 구현이다.

향후 PresenterState 기반 모드 관리가 도입되면
DOM 의존성을 제거하는 방향을 검토할 수 있다.

---

## MVP 이후 검토 항목

* 순서 드래그 재정렬 (DnD)
* 출력 확장 (배경 이미지 / 배경 색상)
* 다중 행사 관리
