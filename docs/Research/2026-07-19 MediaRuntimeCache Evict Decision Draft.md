# [Draft] MediaRuntimeCache 축출(evict) 시점 Decision 초안

> **Status: 채택됨(2026-07-23) — `.itda/decisions.md` D-0001로 등재.**
> ITDA 전환(2026-07-23)으로 Decisions.md(동결 아카이브)가 아니라
> `.itda/decisions.md`에 4자리 번호(D-0001)로 등재됐다. 이 파일은
> 설계 근거(대안 비교·정합성 논증·검증 계획)의 원문으로 유지한다.
>
> 배경: TODO.md Architecture 항목 "MediaRuntimeCache blob URL 미축출 —
> evict() 호출부 0곳"(2026-07-18 등록, 2026-07-16 탐색에서 코드로 확정).
> 작성: 2026-07-19, deep-reasoner 설계 분석(코드 전수 검증) 기반.

---

# D-0XX (번호 미부여 — 채택 시 부여)

## MediaRuntimeCache 축출은 참조 기반 sweep으로, CommandBus 안에서 dispatch 직후에 수행한다 (안)

### 결정 (안)

`media/MediaRuntimeCache.js`의 blob URL 누수(evict() 호출부 0곳 —
표시된 모든 미디어의 blob URL이 세션 종료까지 잔존)를 **참조 기반
sweep**으로 해소한다.

1. **참조 집합 계산은 domain 순수 함수.** `domain/Presentation.js`에
   `collectReferencedMediaIds(presentation) → Set<string>` 신설 — 모든
   Page의 `mediaId` + `backgroundMediaId`(D-032)를 모은다(null 제외).
   Domain이 자기 구조를 아는 것은 정당하며, 이 함수 덕분에 CommandBus의
   Domain 침투는 현행 수준(payload.page.mediaId 최소 모양)을 넘지 않는다.
2. **sweep은 MediaRuntimeCache의 공식 API.** `sweep(keepSet)` 신설 —
   keepSet에 없는 모든 항목을 `URL.revokeObjectURL` + Map 삭제. 기존
   `evict(mediaId)`(단건)는 유지하되 sweep이 표준 경로다.
3. **호출 지점은 CommandBus 한 곳.** `executeInternal()`의 dispatch +
   historyHook 이후에:
   ```js
   if (prevState.presentation.pages !== getState().presentation.pages) {
     sweep(collectReferencedMediaIds(getState().presentation))
   }
   ```
   `prevState`는 dispatch 전에 이미 캡처하고 있으므로 재사용한다.
   가드는 액션 타입 whitelist가 아니라 **pages 배열 참조 비교** —
   불변 Domain이 pages를 새로 만드는 모든 명령을 빠짐없이 잡고,
   SELECT/GO_LIVE/오버레이 등 비-pages 명령은 sweep을 생략한다.
4. **단일 쓰기 지점 원칙의 확장(개정 아님).** 2026-06-27 합의("캐시
   write는 CommandBus.preloadMedia만")를 "fill은 preloadMedia, evict는
   sweep — 둘 다 CommandBus 내부"로 확장한다. View/Store/History의
   쓰기 금지는 그대로다. `MediaRuntimeCache.js`/`CommandBus.js` 헤더
   문구를 이에 맞춰 갱신한다.

### 핵심 정합성 불변식 (오축출이 불가능한 근거)

> sweep은 `state.presentation.pages`에 없는 mediaId만 제거한다. 메인
> 탭의 모든 렌더 표면(Preview가 그리는 selected/live Page)은 state의
> 원소이므로, 그들이 참조하는 id는 항상 keepSet에 포함된다. 따라서
> **"Live/Preview가 참조 중인 media는 절대 축출되지 않는다"가 명령
> 타입 열거 없이 구조적으로 성립한다.** output.html은 별도 탭/realm의
> 독립 캐시 인스턴스라 메인 탭 sweep이 송출 화면에 도달할 수 없다.

### 이유

- **누수는 코드로 확정됐고 표면이 커졌다.** evict() 호출부 0곳(전역
  grep), D-032 배경 미디어 + 9-52 라이브러리 성장으로 blob 생성 지점
  증가. 수정은 저위험·저비용(순수 함수 1 + sweep 1 + 호출 3줄).
- **undo 정합성은 엄밀히 성립한다(전수 확인).** `computeInverse` 전
  케이스 검토 결과, 현재 state에서 미디어 참조가 사라지는 명령은
  REMOVE_PAGE(inverse=INSERT_PAGE_AT)와 UPDATE_PAGE의 mediaId 교체
  (inverse=UPDATE_PAGE)뿐이며, 두 inverse 모두 MEDIA_COMMANDS에 있어
  undo 시 IndexedDB에서 재preload된다. MOVE_PAGE_TO_SECTION의
  inverse(SET_PAGE_POSITION, whitelist 밖)는 Page를 제거하지 않아
  애초에 sweep 대상을 만들지 않는다. 즉 정합성의 근거는 whitelist가
  아니라 **"IndexedDB는 영속한다(런타임 캐시만 지운다) + Page를 state에
  재도입하는 모든 경로는 MEDIA_COMMANDS를 거친다"** 두 사실이다.
  비용은 undo 시 IndexedDB 1회 재읽기뿐.
- **타이밍이 안전하다.** dispatch는 동기이고 구독자 통지(UI 재렌더)도
  dispatch 안에서 동기 완료된다 — sweep이 도는 시점엔 제거된 Page의
  img/video가 이미 DOM에서 detach된 뒤라 revoke가 렌더를 깨뜨릴 수
  없다. Preview는 크로스페이드 없이 전면 교체(`innerHTML=''`)라 구
  슬라이드 잔존 구간 자체가 없다(크로스페이드는 output.html만 — 그래서
  output이 Non-goal이다). preload(dispatch 전)와 sweep(dispatch 후)은
  같은 직렬 큐 태스크 안이라 레이스가 없다.
- **URL 재발급도 무해하다.** 메인 탭 소비자(PreviewPanel/PageView)는 매
  렌더마다 fresh peek하고 URL을 보관하지 않는다. 축출 후 같은 id가
  재추가되면 INSERT_PAGE_AT/ADD_PAGE preload가 새 URL로 다시 채운다.
- **성능**: keepSet O(pages)+sweep O(cache), 수백 Page에서도 <1ms.
  pages 참조 비교 가드로 고빈도 명령(SELECT/GO_LIVE)은 완전 생략.

### 대안 비교 (기각 근거)

| 안 | 기각 이유 |
|---|---|
| B. 액션별 국소 evict + 참조 카운트 | 삭제성 액션 whitelist를 유지해야 한다 — D-020의 근본 원인("whitelist를 안 타는 경로의 누락")과 같은 함정을 evict 쪽에 다시 심는다. 누락의 실패 모드가 조용한 누수 재발. |
| C. 전용 Subscriber(SET_PAGES 구독) | revoke도 캐시 "쓰기"다 — 쓰기가 CommandBus 밖으로 나가 2026-06-27 단일 쓰기 지점 원칙의 **개정**이 필요해진다. 구독자 간 순서도 미보장이라 추론이 취약. A는 원칙을 확장만 하고 개정 비용이 0. |
| D. LRU/상한 | 참조 정보가 state에 정확히 있는데 근사(LRU)를 도입하는 과설계. 상한 도달 시 참조 중 항목을 축출할 수 있어 결국 A의 참조 제외를 다시 얹어야 한다. 실측 압력 신호도 없음. |
| E. 현상 유지(Element/AssetRegistry까지 보류) | 누수가 코드로 확정됐고 수정이 저위험인데 방치하면 장시간·다미디어 세션에서 메모리 누적. 단 P3 트리거 존중 — Decision 확정과 구현 착수 시점은 분리 가능. |

### Non-goal

1. **output.html(송출 탭) 자체 캐시의 축출** — 별도 realm이라 state를
   소유하지 않아 "참조 집합"이 정의되지 않고, 크로스페이드 중
   previousSlide가 구 URL을 duration 동안 사용해 revoke 타이밍 위험이
   있다. 송출 안정성(Core Philosophy) 직결이므로 별도 후속 Decision.
   (누적 규모도 "그 세션에 송출된 서로 다른 미디어 수"로 유계.)
2. **IndexedDB 영속 GC**(미사용 Media 레코드 삭제) — Library-Centric
   Research/D-002 재개가 선행인 별개 설계. 본 건은 런타임 메모리만.
3. **index.html 라이브러리 썸네일 objectURL(9-52)** — 이미 재렌더 시
   자체 revoke로 관리됨.
4. **LRU/상한** — 참조 기반이 실측 압력에서 부족해질 때 재검토.
5. **축출 UX(placeholder 등)** — 미참조 id만 지우므로 사용자에게
   보이지 않는다. 불필요.

### 알려진 한계 (정직 기록)

- **부트스트랩 레이스(무해, 자가 치유).** bootstrapMediaCache는 직렬 큐
  밖(Promise.all)이라, 부팅 조회가 끝나기 전에 REMOVE_PAGE가 실행되면
  sweep이 지운 id를 부트스트랩이 한 박자 늦게 다시 채울 수 있다. 결과는
  "미참조 항목 1개가 다음 pages 변경 명령의 sweep까지 잔존"— 렌더는
  안 깨지고(미참조라 아무도 안 그림) 다음 sweep이 정리한다. 부팅 직후
  수 초의 엣지라 별도 방어를 두지 않는다.

### 검증 계획 (구현 시 Completion Criteria)

회귀 테스트(`node --test`, fake-indexeddb — `command/CommandBus.test.js`,
`media/MediaRuntimeCache.test.js`(신규), `domain/Presentation.test.js`):

1. 미참조 축출: X·Y fill → state는 X만 참조 → pages 변경 명령 →
   peek(X) 유지, peek(Y) null.
2. 공유 id 보존: 두 Page가 X 공유 → 하나 REMOVE → peek(X) 유지.
3. backgroundMediaId 포함(D-032): text Page 배경 B → 무관 명령 후 B
   유지, 그 Page REMOVE 후 B 축출. (keepSet이 배경을 빼먹으면 실패하는
   필수 가드.)
4. Live/Preview 참조 보존: X를 쓰는 Page가 live+selected 상태에서 다른
   Page UPDATE → peek(X) 유지. (TODO Completion Criteria 직접 이행.)
5. undo 재preload: 유일 참조 Page REMOVE → X 축출 → undo() → X 재충전
   (INSERT_PAGE_AT 경유).
6. 비-pages 명령 sweep 생략: 미참조 X가 SELECT_PAGE/GO_LIVE 후에도
   잔존, 이후 pages 변경 명령에서 축출.
7. D-019 회귀: media 명령→text 명령 연속 fire-and-forget에도 dispatch
   순서 보존 + 종료 후 캐시 상태 정확.
8. UPDATE mediaId 교체: X→Y 교체 시 Y 충전·X 축출(미참조 시), undo로
   X 복원.
9. revoke 실호출: URL.revokeObjectURL 스파이로 축출 대상만 revoke,
   참조 항목엔 미호출.

E2E(Playwright, e2e-verify 템플릿, 메인 탭): 이미지 Page 2개 → 첫째
삭제 → 둘째 이미지가 유효 blob으로 계속 렌더(깨진 이미지 없음) +
size() 감소 → undo로 첫째 재렌더 → text Page 배경(D-032) 적용/제거
정상. 검증 후 스크립트 삭제 + ManualTestChecklist 한 줄.

### 기존 Decision/원칙과의 충돌 검토

- "CommandBus는 Domain 구조를 알지 않는다" — keepSet 계산을 domain
  헬퍼로 위임해 침투 폭을 현행 수준으로 유지. pages 참조 비교는 구조
  지식이 아님. 헤더에 위임 사실 한 줄 보강 필요(위반 아님).
- 2026-06-27 캐시 단일 쓰기 지점 — 확장(fill+sweep 모두 CommandBus),
  개정 아님. 양 파일 헤더 문구 갱신 필요.
- D-019(직렬 큐)/D-020(bootstrap)/D-027(Media 별도 저장소)/D-032
  (backgroundMediaId) — 충돌 없음(각각 큐 내부 동기 실행 / 키 집합
  서로소(위 "알려진 한계"의 무해 레이스 제외) / IndexedDB 불변 /
  keepSet에 배경 id 포함으로 대칭 유지).
- 결론: 기존 D와 충돌하는 요구가 아니므로 에스컬레이션 대상이 아닌
  **정상 신규 Decision 경로**다. 다만 원칙 확장 + domain 헬퍼 신설이라
  D-029 규칙상 구현 전 Decision 확정(사용자 승인)이 필수다.

### 결과 (예상 영향 — 채택 시)

영향 파일: `domain/Presentation.js`(+test), `media/MediaRuntimeCache.js`
(+test 신규), `command/CommandBus.js`(+test). UI/output.html/persistence/
history 무수정. 스키마/Mutation/History 무변경(런타임 캐시만).

채택 절차: 사용자 승인 → Decisions.md에 D-0XX로 등재(이 파일은 근거
링크로 유지 또는 정리) → TODO 항목의 Dependency 충족 처리 → 구현.
