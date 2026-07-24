# presenter- 타임라인 (timeline)

형식 정본: ITDA 레포 `.itda/schema.md`. 세션마다 `## 날짜 · 세션 · 제목`
블록 하나를 파일 끝에 append. 결정은 `decisions.md`로 역참조(D-NNNN —
이 레포의 `docs/Decisions.md` D-NNN과는 별개 체계).

---

## 2026-07-24 · 세션 0c3f9891-745b-43ea-8f7d-926c2f135cad — C1 추출 → C5 승인
- **미결** (open): 다음 로드맵 택일 제안(①실사용 라운드 ②main/bus 라우팅 Research 착수 ③성경/찬송가 데이터 소스 조사) — 사용자가 택일하지 않고 가사 마커 불편 보고로 전환되어 결론 없음 · 영어 절 표기(Verse/Chorus) 감지 — 이번에 채택 안 함, 영어 가사에서 같은 불편이 생기면 그때 D-0002에 패턴 추가하는 것으로 보류
- **다음작업** (next): 없음
- **변경파일** (changed): `.itda/decisions.md` — D-0001, D-0002 두 결정 append 등재 · `.itda/cache.md` — 결정 등재 후 재생성 2회 (1건 → 2건) · `docs/Research/2026-07-19 MediaRuntimeCache Evict Decision Draft.md` — Status를 채택됨으로 갱신 · `domain/Presentation.js` — `collectReferencedMediaIds()` 신설 · `domain/Presentation.test.js` — 회귀 테스트 추가 (서브에이전트) · `media/MediaRuntimeCache.js` — `sweep(keepSet)` 신설, 헤더 원칙 갱신 · `media/MediaRuntimeCache.test.js` — 신규 생성 (서브에이전트) · `command/CommandBus.js` — dispatch 후 pages 참조 비교 가드로 sweep 연결 (서브에이전트) · `command/CommandBus.test.js` — 회귀 테스트 추가 (서브에이전트) · `docs/TODO.md` — D-0001·D-0002 완료 반영, 최종 업데이트 갱신 · `docs/ManualTestChecklist.md` — E2E 결과 기록 (서브에이전트) · `utils/lyricsImport.js` — 절 표시 마커 감지(`isSectionMarker`) 및 분절 규칙 확장 · `utils/lyricsImport.test.js` — 마커 테스트 8건 추가 · `index.html` — import 확장 + `splitLyricsToBlocks` 마커 분기 (서브에이전트) · `/home/hyeonuk/.claude/projects/-home-hyeonuk-projects-presenter-/memory/fable-orchestration-gate.md` — fable 게이트(턴당 2파일 제한) 메모리 신규 · `/home/hyeonuk/.claude/projects/-home-hyeonuk-projects-presenter-/memory/MEMORY.md` — 메모리 인덱스 신규
- **중요 명령** (commands): `python3 /home/hyeonuk/projects/ITDA/c1/scripts/cache.py build --itda /home/hyeonuk/projects/presenter-/.itda` → cache.md 재생성 (수동 append 후 필수 절차) · `node --test` → 166/166 pass, fail 0 (D-0001 구현 후 독립 재실행 검증) · `git commit -F .commit-msg-tmp.txt && git push` → `10e06cd`(docs: Decision 채택), `bcc1c2a`(feat: sweep 구현) main 푸시 · `node --test utils/lyricsImport.test.js` → 22/22 pass (마커 분절 단위 검증) · `node --test` → 174/174 pass, fail 0 (D-0002 구현 후 최종 전체 검증) · `git commit -F .commit-msg-tmp.txt && git push` → `bda0877`(feat: 마커 감지) main 푸시, ahead/behind 없음 확인
- **결정** (decisions): 없음

## 2026-07-24 · 세션 1ba3bb09-7fdc-475a-a030-ce0b981e580f — C1 추출 → C5 승인
- **미결** (open): main/bus 출력 identity·라우팅 모델(Research 초안)은 **"미채택 (사람 승인 대기)"** 상태 — 채택 여부는 사용자 결정 사항 (근거: L0260 "Status \"Research — 미채택 (사람 승인 대기)\" 명시", L0364 "채택하시려면 말씀 주세요") · 채택 전 사용자가 정해야 할 쟁점 5건 (L0356-L0362): · 1. 상태 모델 최종 승인 — `livePageId` → 맵 전환(S-A) 회귀 위험 감수 여부 · 2. feed 슬롯 방식 — 자유 정의 vs 고정 슬롯(bus1~4) · 3. bus 송출 UI 제스처 (Phase 2 시 확정 가능) · 4. Overlay feed별 라우팅의 Phase 2 승격 여부 · 5. Phase 1 착수 시점
- **다음작업** (next): [ ] main/bus Research 초안 채택 여부 사용자 결정 대기 — 채택 시 ITDA 전주기(승인 → `.itda/decisions.md` D-0NNN 등재)로 진행 (근거: L0364) · [ ] 쟁점 1·2 확정 시 Phase 1(구조만) 착수 가능 (근거: L0364 "쟁점 1·2만 정해지면 Phase 1 착수가 가능한 상태입니다")
- **변경파일** (changed): `.itda/cache.md` — 세션 기록 반영 (커밋 7300f3e) · `.itda/decisions.md` — 세션 기록 반영 (커밋 7300f3e) · `.itda/timeline.md` — 세션 절 추가 (커밋 7300f3e) · `docs/Research/2026-07-24 Output Identity-Routing Decision Draft.md` — main/bus 출력 identity/라우팅 Decision 초안 신규 생성 (커밋 5f75903) · `docs/TODO.md` — 해당 P3 항목 Status를 "Research 초안 작성됨(미채택)"으로 갱신 + 최종 업데이트 헤더 수정 (커밋 5f75903)
- **중요 명령** (commands): `git add .itda/*.md && git commit … && push` → `[main 7300f3e]` 3 files changed, main 푸시 완료 (L0061-L0064) · `Agent(deep-reasoner) — main/bus 라우팅 Research 초안` → 문서 1개 생성, 코드 무변경·커밋 안 함, 권고안(논리 feed identity / registry 이원화 / livePageIds 맵 전환 / 2-Phase) 도출 (L0260-L0267) · `git add docs/Research/… docs/TODO.md && git commit … && push` → `[main 5f75903]` 2 files changed, 342 insertions, main 푸시 완료 (L0339-L0343)
- **결정** (decisions): 없음
