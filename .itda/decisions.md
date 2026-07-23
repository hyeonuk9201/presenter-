# presenter- 결정 기록 (decisions) — ITDA 체계

형식 정본: ITDA 레포 `.itda/schema.md`(`~/projects/ITDA`). 새 결정은 파일
끝에 append. `status: accepted`는 사람이 확정한 것, `proposed`는 승인 대기.
유입 경로: C1 전주기(추출→승인, ITDA 레포에서 `approve.py apply … --itda
이 디렉토리`) 또는 사람 확정 수동 append.

> **전환(2026-07-23) — 신규 결정의 정본은 이 파일이다.** 기존
> `docs/Decisions.md`(`D-NNN`, 3자리)는 동결 아카이브 — 기재된 결정은
> 계속 유효하나 신규 append는 여기(`D-NNNN`, 4자리)로만 한다. 두 번호
> 체계는 별개다. 기존 D-NNN을 근거로 참조할 때는 `doc:docs/Decisions.md#d-nnn`
> ref를 쓴다.

이 `.itda/`는 ITDA 중앙 설치(2026-07-23)로 생성됐다 — 스크립트는 ITDA
레포에만 있고, 여기는 presenter- 자신의 결정 데이터만 담는다.

---
