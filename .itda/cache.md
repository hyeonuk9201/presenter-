# ITDA 컨텍스트 캐시 (context cache)

> **파생 뷰 — 손으로 고치지 말 것.** 정본은 이 디렉토리의
> `decisions.md`·`timeline.md`이고, 자동 로드되는 것은 이 캐시뿐이다
> (D-0020 — 전달 경로 v1). **인덱스에만 있는 결정의 상세가 필요하면**
> **`.itda/decisions.md`에서 그 D-번호를 찾아 읽을 것**(cache miss →
> 정본 fetch). 취사 선택: `pins.md`(pin) > 정본 `캐시` 필드 > 최근
> 5건 규칙. 재생성: `python3 /home/hyeonuk/projects/ITDA/c1/scripts/cache.py build --itda /home/hyeonuk/projects/presenter-/.itda`
> (approve.py apply가 자동 수행 · 정본 수동 append 후엔 직접 실행).
> 생성: 2026-07-24 · 결정 2건 중 핫 2건

## 결정 인덱스 (전체)

- D-0001 · MediaRuntimeCache 축출은 참조 기반 sweep으로, CommandBus 안에서 dispatch 직후 수행한다
- D-0002 · 가사 절 표시 마커는 한국어 기본형만 감지, 경계로만 쓰고 송출에서 제거한다

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

## D-0002 · 가사 절 표시 마커는 한국어 기본형만 감지, 경계로만 쓰고 송출에서 제거한다
- **이유** (rationale): 곡 편집 실사용에서 "1절" 같은 절 표시 줄이 N줄
  자동 분할 계산에 끼어 슬라이드 전체가 한 줄씩 밀리는 불편이 보고됨
  (9-52가 "절/후렴 키워드 감지"를 채택 안 하고 남겨둔 자리의 실사용
  신호). 오감지로 진짜 가사 줄이 사라지는 것보다 미감지가 안전하므로
  패턴은 보수적으로 잡는다 — 줄 전체가 마커 단어일 때만 감지.
- **근거** (evidence):
  - `doc:docs/TODO.md#feature-todo` "절/후렴 키워드 감지·미리보기 확정은
    채택 안 함(향후 Reflow/Song 통합과 함께 `splitLyrics` 위에 얹을
    자리로 남김)"
  - `commit:bcc1c2a` 직후 세션 — 사용자 보고 "1절 ㅇㅇㅇ ㅁㅁㅁ 이러면
    ㅇㅇㅇ ㅁㅁㅁ 를 써야하는데 1절 ㅇㅇㅇ 다음장 ㅁㅁㅁ 이런식으로?"
- **시각** (time): 2026-07-23
- **상태** (status): accepted
- **출처** (source): 세션 2026-07-23 (사용자가 3개 설계 선택지를 직접 확정)
- **하위** (sub):
  - 감지 패턴은 한국어 기본형만 — `N절`(공백 허용 "2 절"), `후렴`/
    `후렴N`, `간주`, `브릿지`. 줄 전체(trim 후) 일치일 때만. 영어 표기
    (Verse/Chorus)는 채택 안 함 / 근거: 사용자 선택("한국어 기본형만")
  - 마커 정의는 `utils/lyricsImport.js`의 `isSectionMarker()` 한 곳에만
    둔다 — index.html 곡 편집기도 이를 import(두 경로의 마커 정의
    불일치 방지). isSectionMarker는 Page/Song을 모르는 순수 줄 판정이라
    D-026(Song의 독립 파싱) 위반 아님 / 근거: `doc:utils/lyricsImport.js`
  - 가사 추가 경로: 마커는 분절 경계로만 쓰고 결과에서 제거(송출 화면에
    안 나옴), N줄 분할 카운트는 마커 경계마다 리셋 / 근거: 사용자
    선택("경계로만 쓰고 제거")
  - 곡 편집기 경로: 빈 줄이 전혀 없을 때만 마커 기반 분리(마커=LyricBlock
    label, 이후 줄=text). 빈 줄이 있으면 기존 규칙(빈 줄 분리+첫 줄
    라벨) 그대로 — 하위 호환·왕복 유지 / 근거: 사용자 선택("가사 추가 +
    곡 편집 둘 다")


## 현재 상태 (최신 timeline: 2026-07-24 · 세션 0c3f9891-745b-43ea-8f7d-926c2f135cad — C1 추출 → C5 승인)

- **미결** (open): 다음 로드맵 택일 제안(①실사용 라운드 ②main/bus 라우팅 Research 착수 ③성경/찬송가 데이터 소스 조사) — 사용자가 택일하지 않고 가사 마커 불편 보고로 전환되어 결론 없음 · 영어 절 표기(Verse/Chorus) 감지 — 이번에 채택 안 함, 영어 가사에서 같은 불편이 생기면 그때 D-0002에 패턴 추가하는 것으로 보류
- **다음작업** (next): 없음
- **결정** (decisions): 없음
