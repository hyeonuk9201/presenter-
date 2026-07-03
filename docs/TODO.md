# TODO.md

> 이 문서는 "지금 뭐가 남았는지"를 한눈에 보기 위한 체크리스트다.
> "무슨 일이 있었는지"는 CurrentState.md가 기록한다 — 여기는 과거를 안 남긴다.
> 완료된 항목은 체크만 하고 CurrentState.md의 해당 세션 번호(예: 9-11)로
> 자세한 내용을 넘긴다. 여기서 완료 내역을 다시 설명하지 않는다.
>
> 최종 업데이트: 2026-07-03

---

## Architecture TODO

기능이 아니라 구조에 대한 항목. "지금 당장 눈에 보이는 기능"보다
"나중에 기능을 얼마나 쉽게 얹을 수 있는가"를 다룬다.

- [x] Schema version — 9-11
- [x] Load validation (`isValidPage()` 실제 사용, 손상 데이터 복구) — 9-11
- [x] Save failure UI — 9-11
- [ ] Persistence의 localStorage 결합도 낮추기 — `StorageAdapter.js`로 두 지점(read/write)만 추출. 급하지 않음, "거의 공짜"라 다른 Persistence 작업 할 때 같이 처리해도 됨.
- [ ] Page 모델 전환 시점 재평가 — 지금은 플랫 구조. "한 Page에 독립적으로 편집 가능한 콘텐츠가 3개 이상 필요해지는 순간"이 Element 모델(DomainEntityArchitecture.md에 이미 설계됨) 전환 트리거. 그 전엔 플랫 필드 추가로 버틴다.
- [ ] Asset/Song 관계 재검토 — Library 작업 들어가기 전에. Background/Video는 그냥 Asset이지만, Song이 Asset 하나인지 아니면 "Page 여러 개 + 메타데이터"를 묶는 별도 Aggregate인지 아직 열린 질문.

---

## Feature TODO

사용자가 직접 체감하는 기능. 실제 동작 구현이 완료 기준이다 — 필드만
있고 아무것도 안 하면 미완료로 둔다.

- [ ] Transition — 필드 뼈대만 있음(9-12), 실제 fade/cut 애니메이션은 아직 없음
- [ ] Auto Advance — 필드 뼈대만 있음(9-12), 실제 자동 전환 타이머는 아직 없음
- [ ] Cue Label — CueList 미리보기가 영상 Page의 텍스트 오버레이 유무를 안 보여줌(지금 `(video)`로만 표시)
- [ ] Image Overlay — 텍스트 오버레이가 지금 video Page에만 적용됨(9-7). image Page엔 아직
- [ ] Library — Songs/Backgrounds/Videos 메뉴. 뼈대(빈 메뉴)만이라도 우선.

---

## 사용 방법

- 새 아키텍처 리뷰나 기능 논의가 끝나면, 여기에 항목을 추가한다.
- 작업을 시작하기 전 이 문서를 보고 우선순위를 정한다.
- 작업이 끝나면 체크하고, CurrentState.md에 세션 번호를 남긴 뒤 여기에 그 번호를 연결한다.
- 오래돼서 더 이상 유효하지 않은 항목(요구사항이 바뀜, 다른 방식으로 해결됨)은 이유와 함께 삭제한다 — 완료 표시(`[x]`)가 아니라 그냥 삭제.
