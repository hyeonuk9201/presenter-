# ITDA 컨텍스트 캐시 (context cache)

> **파생 뷰 — 손으로 고치지 말 것.** 정본은 이 디렉토리의
> `decisions.md`·`timeline.md`이고, 자동 로드되는 것은 이 캐시뿐이다
> (D-0020 — 전달 경로 v1). **인덱스에만 있는 결정의 상세가 필요하면**
> **`.itda/decisions.md`에서 그 D-번호를 찾아 읽을 것**(cache miss →
> 정본 fetch). 취사 선택: `pins.md`(pin) > 정본 `캐시` 필드 > 최근
> 5건 규칙. 재생성: `python3 /home/hyeonuk/projects/ITDA/c1/scripts/cache.py build --itda /home/hyeonuk/projects/presenter-/.itda`
> (approve.py apply가 자동 수행 · 정본 수동 append 후엔 직접 실행).
> 생성: 2026-07-23 · 결정 1건 중 핫 1건

## 결정 인덱스 (전체)

- D-0001 · MediaRuntimeCache 축출은 참조 기반 sweep으로, CommandBus 안에서 dispatch 직후 수행한다

## 핫 결정 (전문 — 정본 그대로)

## D-0001 · MediaRuntimeCache 축출은 참조 기반 sweep으로, CommandBus 안에서 dispatch 직후 수행한다
- **이유** (rationale): evict() 호출부 0곳으로 blob URL 누수가 코드로
  확정됐고(전역 grep), D-032 배경 미디어·9-52 썸네일로 blob 생성 표면이
  커졌다. 참조 집합이 state.presentation.pages에 정확히 존재하므로
  근사(LRU)나 액션별 whitelist 없이 "state가 참조하지 않는 id만 축출"이
  구조적으로 성립한다 — Live/Preview가 참조 중인 media는 절대 축출되지
  않는다는 불변식이 명령 타입 열거 없이 보장된다. 대안 B(액션별 evict —
  whitelist 누락 함정 재발), C(전용 Subscriber — 단일 쓰기 지점 원칙
  개정 필요), D(LRU — 과설계), E(현상 유지 — 확정된 누수 방치)는 기각.
- **근거** (evidence):
  - `doc:docs/Research/2026-07-19 MediaRuntimeCache Evict Decision Draft.md`
    "sweep은 `state.presentation.pages`에 없는 mediaId만 제거한다"
  - `doc:docs/TODO.md#architecture-todo` "MediaRuntimeCache blob URL
    미축출 — evict() 호출부 0곳 (런타임 누수)"
- **시각** (time): 2026-07-23
- **상태** (status): accepted
- **출처** (source): 세션 2026-07-23 (사용자 승인 — 초안은 9-56에서 작성,
  deep-reasoner 설계 분석 기반)
- **하위** (sub):
  - 참조 집합 계산은 domain 순수 함수 —
    `Presentation.collectReferencedMediaIds()`가 모든 Page의 mediaId +
    backgroundMediaId(D-032)를 수집. CommandBus의 Domain 침투를 현행
    수준으로 유지 / 근거: `doc:docs/Research/2026-07-19 MediaRuntimeCache
    Evict Decision Draft.md` "Domain이 자기 구조를 아는 것은 정당하며"
  - 호출 지점은 CommandBus 한 곳, dispatch+historyHook 이후 **pages 배열
    참조 비교** 가드로 실행(whitelist 아님 — 비-pages 명령은 sweep 생략) /
    근거: 같은 문서 "가드는 액션 타입 whitelist가 아니라 pages 배열 참조
    비교"
  - 2026-06-27 캐시 단일 쓰기 지점 원칙을 "fill은 preloadMedia, evict는
    sweep — 둘 다 CommandBus 내부"로 **확장**(개정 아님) / 근거: 같은
    문서 §대안 C 기각
  - Non-goal: output.html 자체 캐시 축출(별도 realm·크로스페이드 revoke
    위험 — 별도 후속 Decision), IndexedDB 영속 GC(D-002 재개 선행),
    라이브러리 썸네일 objectURL(자체 revoke 관리 중), LRU/상한 / 근거:
    같은 문서 §Non-goal
