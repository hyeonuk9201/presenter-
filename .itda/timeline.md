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
