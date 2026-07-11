# 기술 부채 감사 보고서 (2026-07-11)

> Status: Research — 이 문서는 감사 결과 기록이며 구현 근거로 쓰지
> 않는다. 여기 담긴 항목을 착수하려면 TODO.md 항목 승격(7필드 작성)과
> 필요 시 Decision 작성이 선행돼야 한다(D-029의 판단 순서).
>
> 감사 방법: 전 소스 파일 정독(command/history/store/persistence/media/
> ui/output 계층 + index.html/output.html/test.html), Decisions.md
> D-001~D-029 대조, 테스트 파일 목록 대조, 잠재 버그 1건은 임시
> 스크립트로 실제 재현(재현 후 스크립트 삭제 — D-028 관행). 코드는
> 무수정.

---

## 요약

전반적으로 부채가 잘 통제되는 프로젝트다 — 대부분의 한계는 이미
Decisions.md/TODO.md/CurrentState.md에 "의도적 보류"로 기록돼 있고,
이번 감사에서 그 기록과 코드가 어긋난 곳은 소수였다. 그러나 **재현
가능한 잠재 버그 1건(TD-1)**과 **D-028이 스스로 세운 원칙의 미이행
1건(TD-3)**이 발견됐고, 둘은 같은 파일(HistoryManager/CommandBus)을
가리킨다.

| ID | 항목 | 분류 | 심각도 | 검증 수준 |
| --- | --- | --- | --- | --- |
| TD-1 | 연속 Undo 시 History 스택 오염 | 잠재 버그 | 높음(도달성은 낮음) | **재현됨** → **9-42 수정 완료** |
| TD-2 | fire-and-forget 경로의 미처리 rejection | 잠재 버그 | 중간 | 추측(코드 분석만) |
| TD-3 | command/history/persistence 계층 테스트 0건 | 테스트 부채 | 높음 | 확인됨 → **9-41 해소** |
| TD-4 | D-017 vs 이중 통지 병행 — 전 UI가 legacy 경로 사용 | 구조 부채 | 중간 | 확인됨 |
| TD-5 | 선택/송출 변경마다 전체 저장 | 성능 부채 | 중간 | 확인됨 |
| TD-6 | test.html — 금지 패턴 위반 레거시 파일 잔존 | 위생 | 낮음 | 확인됨 |
| TD-7 | docs/.obsidian/ 이 git 추적됨 | 위생 | 낮음 | 확인됨 |
| TD-8 | node_modules 미설치(이 체크아웃) | 환경 | 낮음 | 확인됨 → **9-41 해소**(npm install) |
| TD-9 | (기록만) 이미 문서화된 의도적 보류 목록 | — | — | 대조 완료 |

---

## TD-1. 연속 Undo 시 재귀 기록 방지 무력화 → History 스택 오염 (재현됨)

**증상**: `undo()`가 완료되기 전에 `undo()`를 다시 호출하면, 두 번째
undo의 역방향 Command가 History에 새 항목으로 재기록되어 스택이
오염된다.

**재현** (임시 스크립트, 실제 모듈 사용, 검증 후 삭제):

```
ADD_PAGE 2회 → undo() 2회를 첫 완료를 기다리지 않고 연속 호출
기대: { undoCount: 0, redoCount: 2 }
실제: { undoCount: 1, redoCount: 1 }   ← 오염
(state 자체는 정상 — pages는 정확히 [] 로 복원됨. 오염되는 건 스택만)
```

**원인**: `history/HistoryManager.js`의 `isApplyingHistory`가 단일
boolean 플래그라는 것. 시퀀스:

1. `undo()` 1회차 — entry pop, 플래그 `true`, `execute(u1)` await
   (CommandBus 직렬 큐에 체이닝됨)
2. 1회차가 끝나기 전 `undo()` 2회차 — entry pop, 플래그 `true`(이미
   true), `execute(u2)`는 큐에서 u1 뒤에 대기
3. u1 완료 → 1회차의 `finally`가 플래그를 `false`로 해제
4. **u2는 그 뒤에 dispatch됨** → `afterExecute`가 플래그 `false`를 보고
   u2의 역방향 Command를 undo 스택에 기록 + redo 스택 초기화

D-019가 고쳤던 것("undo가 await 없이 플래그를 조기 해제")과 정확히
같은 계열의 타이밍 버그다 — D-019는 "한 undo 안에서의" 타이밍을
고쳤지만, "두 undo 사이의" 타이밍은 남아 있었다.

**실사용 도달성 (추측 — 브라우저에서는 재현하지 않음)**: 낮다.
키보드/버튼 이벤트는 각각 별도 매크로태스크라, CommandBus 큐가
비어있으면 다음 Ctrl+Z가 오기 전에 이전 undo가 마이크로태스크 안에서
전부 끝난다. 도달하려면 큐가 실제로 지연 중이어야 한다 — 예:
media 캐시 미스 Command(IndexedDB 조회)가 큐에 걸려 있는 상태에서
빠른 연속 Ctrl+Z. `index.html`의 핸들러(1098/1113행)는 재진입 가드가
없고, `canUndo()` 가드가 있어도 pop이 동기라 막지 못한다.

**수정 방향 제안 (착수 시 참고)**: (a) boolean 플래그를 카운터로
바꾸거나, (b) undo/redo 자체를 CommandBus처럼 직렬화. 어느 쪽이든
**TD-3(회귀 테스트 선행)이 먼저다** — D-028이 이 두 파일을 다시 만지기
전에 테스트부터 깔라고 명시한 바로 그 상황이다.

## TD-2. fire-and-forget 경로의 미처리 rejection (추측)

`command/CommandBus.js`의 `execute()`는 rejection을 호출자에게
전파하지만, 호출부 전체(index.html, ui/CueList.js)가 fire-and-forget이라
아무도 catch하지 않는다. `preloadMedia()`는 "레코드 없음"(null)은
처리하지만 IndexedDB 자체가 reject하는 경우(권한/디스크 오류)는
처리하지 않는다 → unhandled promise rejection.

부수 경로: `HistoryManager.undo()`는 entry를 pop한 뒤 await하므로,
execute가 reject하면 entry가 undo/redo 어느 스택에도 남지 않고
유실된다(해당 편집의 되돌리기 이력이 조용히 사라짐).

큐 체인 자체는 `.catch(() => {})`로 보호되어 있어 후속 Command가
막히지는 않는다 — 영향 범위는 "조용한 실패"에 한정. IndexedDB 오류
상황을 재현하지 않았으므로 추측 수준으로 기록한다.

## TD-3. D-028 자동화 대상 계층의 테스트 부재 (확인됨)

현재 테스트 파일 6개(51건): `domain/Presentation.test.js`,
`domain/Song.test.js`, `store/SongStore.test.js`,
`store/AppSettingsStore.test.js`, `media/MediaStore.test.js`,
`index.test.js`(정적 가드).

D-028이 자동화 대상으로 명시한 계층 중 **테스트가 0건인 곳**:

- `command/CommandBus.js` — 직렬 큐, MEDIA_COMMANDS preload,
  bootstrapMediaCache
- `history/HistoryManager.js` — computeInverse 전 케이스, 재귀 방지,
  Undo/Redo 왕복
- `persistence/*` — Schema v1→v2 마이그레이션, sanitize 폴백
- `store/AppStore.js` — reduce() 전 액션, deriveMutations,
  markModifiedSongSections 예외 규칙
- `domain/Page.js`/`Section.js`/`PresenterState.js`/`StylePreset.js`

D-028의 핵심 근거가 "HistoryManager/CommandBus는 이미 한 번(D-019)
타이밍 버그를 낸 이력이 있으므로, 다시 손대기 전에 현재 동작을
고정하는 회귀 테스트를 먼저 깔아두는 게 안전하다"였는데, 그 테스트가
아직 없고 — 이번 감사에서 바로 그 파일에서 TD-1이 나왔다. TD-1 수정
착수 여부와 무관하게, 이 계층의 회귀 테스트가 현재 가장 수익 높은
부채 상환이다.

## TD-4. D-017(storeChanged 폐기 결정) vs 코드의 이중 통지 병행 (확인됨)

D-017은 "storeChanged 단일 이벤트 브로드캐스트 방식은 폐기한다"고
결정했지만, 코드는 두 경로를 병행 유지 중이고 실제 사용 분포가
결정과 반대다:

- Mutation 타겟 통지 사용: `PersistenceSubscriber` **1곳뿐**
- legacy `subscribe()`(storeChanged) 사용: `ui/CueList.js`,
  `ui/PreviewPanel.js`, `output/BroadcastOutput.js`,
  `index.html` 3곳 — **UI 전부**

결과적으로 모든 dispatch마다 전 UI가 재통지받는다. 특히
`ui/PreviewPanel.js`는 매 통지마다 `createPageView()`를 새로 만들어
DOM을 통째로 교체한다 — 9-35가 PreviewPanel에 Transition을 못 넣은
구조적 원인이 바로 이것이다("매 상태 변경마다 재렌더링되는 구조").
D-017이 문서 정합성 결정(문서끼리의 충돌 해소)이었고 코드 이행을
명시하지 않았으므로 "위반"은 아니지만, 결정 방향과 코드 현실의
간극으로 기록한다. Element Migration(Phase C)이나 렌더링 최적화가
필요해지는 시점에 이 간극이 먼저 정리돼야 한다.

## TD-5. 선택/송출 변경마다 presentation 전체 저장 (확인됨)

`persistence/PersistenceSubscriber.js`의 `interestedMutations`에
`SET_SELECTION`/`SET_LIVE_PAGE`가 포함돼 있는데, 저장 페이로드
(title/pages/sectionIds/sectionMap)에는 selection/live가 애초에 없다
(D-004). 즉 **Page를 클릭하거나 Live로 송출을 넘길 때마다, 내용이
전혀 안 바뀐 presentation 전체를 JSON.stringify + localStorage 쓰기**
한다. Live 진행 중 슬라이드를 넘길 때마다 전체 직렬화가 도는 셈이라
D-009(안정적 송출 우선)와 긴장 관계다.

파일 주석은 "기존 AppStore.dispatch() 내부 저장 1회와 정확히 동일한
빈도"라고 밝히고 있어 의도된 동등 이전이었음은 분명하다 — 버그가
아니라, 데이터가 커질수록 Live 중 jank 요인이 되는 성능 부채다. 두
Mutation을 목록에서 빼는 것만으로 해소되지만, REMOVE_PAGE처럼
SET_PAGES와 동반되는 경우는 어차피 저장되므로 동작 손실이 없는지
회귀 테스트(TD-3)와 함께 다루는 게 안전하다.

## TD-6. test.html — 금지 패턴 위반 레거시 파일 (확인됨)

루트의 `test.html`(git 추적 중)은 초기 세션의 수동 테스트 하니스로,
`dispatch({ type: 'ADD_PAGE', ... })`를 **CommandBus 없이 직접 호출**
한다 — CLAUDE.md 금지 패턴("CommandBus 없이 Presentation 상태 직접
수정")에 해당하는 코드가 저장소에 잔존하는 형태다. History에도 안
잡히는 경로라, 새 세션이 이 파일을 참고 패턴으로 오인하면 위험하다.
D-028 이후 역할도 node:test + Playwright로 대체됐다. 삭제(또는 최소한
파일 머리에 deprecated 표시)가 적절하다 — TODO.md의 "오래돼서 유효하지
않은 항목은 이유와 함께 삭제" 원칙과 같은 결.

## TD-7. docs/.obsidian/ 이 git 추적됨 (확인됨)

`docs/.obsidian/` 5개 파일(app/appearance/core-plugins/graph/
workspace.json)이 추적 중이다. 특히 `workspace.json`은 Obsidian이
열 때마다 바꾸는 개인 상태 파일이라 앞으로 diff 노이즈를 만든다.
`.gitignore` 추가 + `git rm --cached` 후보 (`.claude/settings.local.json`
처리와 같은 결).

## TD-8. node_modules 미설치 — 이 체크아웃에서 npm test 실행 불가 (확인됨)

현재 워킹 카피에 `node_modules`가 없어 `npm test`(fake-indexeddb 의존)
가 바로 실행되지 않는다. `npm install` 1회로 해소되는 환경 문제지만,
"다음 세션이 테스트를 돌려보지 않고 넘어가는" 유인이 되므로 기록한다.

## TD-9. 이미 문서화된 의도적 보류 (신규 아님 — 대조 확인만)

아래는 코드에서 재확인됐으나 전부 기존 문서에 의도와 트리거가 기록돼
있어 **새 부채로 세지 않는다**:

- AppStore 부팅이 동기(sync) — 비동기 저장소 전환 시 별도 작업
  (TODO.md 9-18 주석, StorageAdapter.js 헤더)
- Media GC 부재 — 삭제된 Page의 IndexedDB blob 잔존,
  `MediaRuntimeCache.evict()` 무호출(blob URL 세션 내 영구 잔존) —
  Phase 2 명시 보류 (D-019, MediaStore.js 헤더)
- `Page.autoAdvance` 죽은 필드 — P3 보류, 사용자 판단 (TODO.md)
- PresenterState → Session 미통합 — D-014 결정만 있고 미착수
  (CurrentState.md에 기록)
- Section CRUD(ADD/REMOVE/UPDATE)의 Undo 미지원 — HistoryManager에
  의도적 범위 제한 주석 존재 (FutureEditor.md D-Editor-4)
- `index.html` 2245줄(내장 스크립트 약 1,270줄) — "단일 HTML 파일
  구조"는 스택 결정 사항이라 위반이 아니다. 다만 D-028이 자동화
  제외한 최대 미검증 표면이 계속 자라는 중이라는 점은 관찰 대상.

사소(기록만): `AppStore.deriveMutations(actionType, ...)`의 첫 파라미터
미사용, `subscribe()`에 해제(unsubscribe) 수단 없음(현재 싱글톤 UI라
실해 없음).

---

## 권장 착수 순서 (TODO.md 승격은 사용자 판단 대기)

1. **TD-3** — CommandBus/HistoryManager/AppStore/Schema 회귀 테스트.
   D-028 미이행분이며 다른 모든 항목의 선행 조건.
2. **TD-1** — 테스트가 깔린 뒤 플래그 → 카운터(또는 undo 직렬화) 수정.
   D-027/D-018/D-019와 충돌 없음 확인함.
3. **TD-6, TD-7** — 저위험 위생 정리(파일 삭제/gitignore). 즉시 가능.
4. **TD-5** — interestedMutations에서 SET_SELECTION/SET_LIVE_PAGE 제거
   검토. 1번의 테스트로 동작 동등성 확인 후.
5. **TD-2, TD-4** — 실사용 신호가 생기거나 해당 파일을 다시 만질 때
   함께. TD-4는 Phase C/렌더링 최적화의 선행 검토 항목으로만 유지.

Decision 충돌 검토: 위 권장안 중 기존 D-0XX와 충돌하는 것은 없다.
TD-4를 "storeChanged 완전 제거"까지 밀고 가면 그건 D-017의 코드 이행
이므로 오히려 결정과 정방향이다. TD-5는 D-004/D-015의 경계를 바꾸지
않는다(저장 트리거만 줄이고 저장 내용/경로는 그대로).
