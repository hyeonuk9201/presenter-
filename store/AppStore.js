/**
 * AppStore.js
 * Ownership: 상태 SSOT + 단방향 데이터 흐름
 * Change Reason: 상태 저장 구조가 바뀔 때만 수정
 *
 * 규칙:
 *   1. 상태는 dispatch()를 통해서만 변경한다.
 *   2. UI는 subscribe()로 변경을 감지한다.
 *   3. 계산 데이터(Derived)는 Store에 저장하지 않는다.
 *
 * Step2 (Mutation 기반 Subscriber, 병행 추가):
 *   - 기존 storeChanged 단일 브로드캐스트는 그대로 유지한다. (기존 Subscriber 제거하지 않음)
 *   - registerSubscriber()로 등록한 Mutation Subscriber는 자신이 선언한
 *     interestedMutations에 해당하는 Mutation이 발생했을 때만 notify()를 받는다.
 *   - Mutation은 Action 자체가 아니라 "State의 어떤 부분이 바뀌었는가"를 나타내는
 *     별도 타입이다 (StateMutationArchitecture.md, SubscriberArchitecture.md 기준).
 *     예: REMOVE_PAGE 액션 1개가 SET_PAGES + SET_SELECTION + SET_LIVE_PAGE를
 *     동시에 발생시킬 수 있다.
 *   - Mutation은 reduce() 실행 전/후 state를 비교하여 도출한다 (reducer 무수정).
 *   - 구독자 간 실행 순서는 보장하지 않는다(등록 순서로 호출하되, 의존하지 않게 작성).
 *
 * Step3 (D-015, PersistenceSubscriber):
 *   - 저장(write)은 더 이상 AppStore가 수행하지 않는다.
 *     PersistenceSubscriber(Mutation Subscriber)가 dispatch 이후 별도로 저장한다.
 *   - 읽기(load)는 AppStore의 부트스트랩 책임으로 그대로 유지한다
 *     (초기 state 생성은 AppStore 책임, 저장은 Persistence 책임).
 *   - AppStore는 Persistence의 존재를 알지 않는다. PersistenceSubscriber는
 *     registerSubscriber()를 통해 자신을 등록할 뿐이며, AppStore는 어떤
 *     Subscriber가 등록되어 있는지 신경 쓰지 않는다.
 */

import { createPresentation, addPage, removePage, replacePage, movePage, insertPageAt, movePageToSection, setPagePositionAndSection, sanitizePresentation, addSection, removeSection, replaceSection, getSectionGroups as getPresentationSectionGroups } from '../domain/Presentation.js'
import { createPresenterState, selectPage, goLive, clearLive, clearSelection, setAppMode } from '../domain/PresenterState.js'
import { migrateSnapshot } from '../persistence/Schema.js'
import { load as storageLoad } from '../persistence/StorageAdapter.js'

// ─────────────────────────────────────────
// 저장소 읽기 헬퍼 (읽기만 유지 — 쓰기는 PersistenceSubscriber로 이동, D-015)
// 실제 물리 저장소 접근은 StorageAdapter.js에 위임(2026-07-05)
// ─────────────────────────────────────────

/**
 * STORAGE_KEY를 export하는 이유:
 * load(부트스트랩, AppStore 책임)와 save(부수효과, PersistenceSubscriber 책임)가
 * 같은 저장 위치를 봐야 하기 때문이다. AppStore는 여전히 "초기 state 생성"
 * 책임을 가지므로 load는 그대로 둔다(D-015 합의: load는 이번 단계 범위 밖).
 *
 * 검증/마이그레이션 추가(2026-07-03, 실사용 안정성 검토):
 *   raw JSON을 그대로 state에 꽂던 기존 방식은 손상된 데이터가 있으면
 *   이후 렌더링 어딘가에서 예고 없이 죽을 수 있었다(isValidPage()가
 *   정의만 되고 어디서도 안 쓰이고 있었음). migrateSnapshot()으로 버전을
 *   맞추고, sanitizePresentation()으로 손상된 Page를 걸러낸 뒤에만
 *   state에 반영한다. 전체가 복구 불가능하면 null을 반환해 호출부가
 *   새 프로젝트로 폴백한다 — 앱이 죽는 것보다 훨씬 안전하다.
 */
export const STORAGE_KEY = 'tc-presenter-presentation'

function loadPresentation() {
  try {
    const raw = storageLoad(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) // { version, title, pages }
    const migrated = migrateSnapshot(parsed)
    if (!migrated) return null // 알 수 없는 미래 버전 — 폴백

    return sanitizePresentation(migrated) // 손상된 Page 제외, 전체 손상이면 null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────
// State (SSOT)
// ─────────────────────────────────────────

let state = {
  // Source of Truth (저장 대상)
  presentation: (() => {
    const saved = loadPresentation()
    if (saved) return saved  // title + pages 복원
    return createPresentation({ title: '새 행사' })
  })(),

  // Runtime State (저장 안 함 — 항상 초기값)
  presenterState: createPresenterState(),
}

// ─────────────────────────────────────────
// Event Bus (기존 storeChanged 브로드캐스트 — 유지)
// ─────────────────────────────────────────

const bus = new EventTarget()

// ─────────────────────────────────────────
// Mutation Subscriber Registry (신규, 병행 추가)
// ─────────────────────────────────────────

/**
 * 등록된 Mutation Subscriber 목록.
 * Subscriber: { id, interestedMutations: string[], notify(mutations, state) }
 */
const mutationSubscribers = []

/**
 * Mutation Subscriber를 등록한다.
 * 기존 subscribe()(storeChanged)와는 별개의 통지 경로이다.
 *
 * @param {{ id: string, interestedMutations: string[], notify: (mutations: string[], state: object) => void }} subscriber
 */
export function registerSubscriber(subscriber) {
  if (!subscriber || typeof subscriber.notify !== 'function' || !Array.isArray(subscriber.interestedMutations)) {
    console.warn('[AppStore] 유효하지 않은 Subscriber:', subscriber)
    return
  }
  mutationSubscribers.push(subscriber)
}

/**
 * Mutation Subscriber를 해제한다. (테스트/정리용)
 */
export function unregisterSubscriber(id) {
  const idx = mutationSubscribers.findIndex(s => s.id === id)
  if (idx !== -1) mutationSubscribers.splice(idx, 1)
}

/**
 * action.type과 prev/next state를 비교하여 발생한 Mutation 목록을 도출한다.
 * Mutation은 "무엇이 바뀌었는가"를 나타내며, Action 이름과 다를 수 있다.
 *
 * 실제로 값이 바뀌었는지는 prev/next 비교로 확정한다 (reducer 추측 금지).
 */
function deriveMutations(actionType, prev, next) {
  const mutations = []

  const pagesChanged =
    prev.presentation.pages !== next.presentation.pages
  // D-Editor-4(2026-07-06): sections[] 단일 배열 대신 sectionIds[](순서)와
  // sectionMap{}(저장소) 두 곳을 각각 참조가 바뀌었는지로 판정한다. 둘 중
  // 하나만 바뀌어도(예: title만 수정 → sectionMap만 바뀜, sectionIds는
  // 그대로) SET_SECTIONS를 발동시켜야 하므로 OR로 묶는다.
  const sectionsChanged =
    prev.presentation.sectionIds !== next.presentation.sectionIds ||
    prev.presentation.sectionMap !== next.presentation.sectionMap
  const titleChanged =
    prev.presentation.title !== next.presentation.title
  const selectionChanged =
    prev.presenterState.selectedPageId !== next.presenterState.selectedPageId
  const liveChanged =
    prev.presenterState.livePageId !== next.presenterState.livePageId
  const appModeChanged =
    prev.presenterState.appMode !== next.presenterState.appMode

  if (pagesChanged) mutations.push('SET_PAGES')
  if (sectionsChanged) mutations.push('SET_SECTIONS')
  if (titleChanged) mutations.push('SET_TITLE')
  if (selectionChanged) mutations.push('SET_SELECTION')
  if (liveChanged) mutations.push('SET_LIVE_PAGE')
  if (appModeChanged) mutations.push('SET_APP_MODE')

  return mutations
}

/**
 * 발생한 Mutation을 관심 있는 Subscriber에게만 통지한다.
 * 구독자 간 실행 순서는 보장하지 않는다.
 */
function notifyMutationSubscribers(mutations, state) {
  if (mutations.length === 0) return

  for (const subscriber of mutationSubscribers) {
    const relevant = mutations.filter(m => subscriber.interestedMutations.includes(m))
    if (relevant.length > 0) {
      subscriber.notify(relevant, state)
    }
  }
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

export function getState() {
  return state
}

export function subscribe(listener) {
  bus.addEventListener('storeChanged', (e) => listener(e.detail))
}

export function dispatch(action) {
  const prev = state
  const next = reduce(state, action)
  if (next === state) return // 변경 없으면 이벤트 생략

  state = next

  // (D-015) 저장은 더 이상 여기서 수행하지 않는다.
  // PersistenceSubscriber가 SET_PAGES / SET_TITLE / SET_SELECTION / SET_LIVE_PAGE
  // Mutation을 구독하여 dispatch 이후 별도로 저장한다.

  // (기존, 유지) storeChanged 단일 브로드캐스트
  bus.dispatchEvent(
    new CustomEvent('storeChanged', {
      detail: { action, state },
    })
  )

  // (신규, 병행) Mutation 기반 타겟 통지
  const mutations = deriveMutations(action.type, prev, state)
  notifyMutationSubscribers(mutations, state)
}

// ─────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────

function reduce(state, action) {
  switch (action.type) {

    // ── Presentation ──────────────────────

    case 'ADD_PAGE':
      return {
        ...state,
        presentation: addPage(state.presentation, action.page),
      }

    case 'REMOVE_PAGE': {
      const updated = removePage(state.presentation, action.pageId)
      const ps = state.presenterState
      const wasSelected = ps.selectedPageId === action.pageId
      const wasLive     = ps.livePageId     === action.pageId
      const ps1 = wasSelected ? clearSelection(ps) : ps
      const ps2 = wasLive     ? clearLive(ps1)     : ps1
      return {
        ...state,
        presentation: updated,
        presenterState: ps2,
      }
    }

    case 'UPDATE_PAGE':
      return {
        ...state,
        presentation: replacePage(state.presentation, action.page),
      }

    case 'MOVE_PAGE':
      return {
        ...state,
        presentation: movePage(state.presentation, action.fromIndex, action.toIndex),
      }

    // D-Editor-4(2026-07-06): Page를 다른 Section으로 명시적으로 옮긴다
    // (sectionId 변경 + 대상 Section 끝으로 위치 재배치, 규칙 1).
    // 순수 위치 이동(드래그 재정렬)은 MOVE_PAGE를 그대로 쓴다 — 그쪽은
    // movePage()의 자동 흡수(규칙 5)가 sectionId를 알아서 재계산한다.
    case 'MOVE_PAGE_TO_SECTION':
      return {
        ...state,
        presentation: movePageToSection(state.presentation, action.pageId, action.sectionId),
      }

    // history/HistoryManager.js 전용 — MOVE_PAGE_TO_SECTION의 정확한 Undo를
    // 위해서만 쓴다(위치+sectionId 동시 복원). 일반 편집 흐름에서 직접
    // dispatch하지 않는다(INSERT_PAGE_AT과 동일한 성격 — D-018 참조).
    case 'SET_PAGE_POSITION':
      return {
        ...state,
        presentation: setPagePositionAndSection(state.presentation, action.pageId, action.index, action.sectionId),
      }

    case 'INSERT_PAGE_AT':
      // D-018 / History: REMOVE_PAGE Undo 전용. 일반 편집 흐름에서는 사용하지 않는다.
      return {
        ...state,
        presentation: insertPageAt(state.presentation, action.page, action.index),
      }

    case 'SET_TITLE':
      return {
        ...state,
        presentation: { ...state.presentation, title: action.title },
      }

    // ── Section (FutureEditor.md D-Editor-4) ──

    case 'ADD_SECTION':
      return {
        ...state,
        presentation: addSection(state.presentation, action.section),
      }

    case 'REMOVE_SECTION':
      return {
        ...state,
        presentation: removeSection(state.presentation, action.sectionId),
      }

    case 'UPDATE_SECTION':
      return {
        ...state,
        presentation: replaceSection(state.presentation, action.section),
      }

    // ── PresenterState ────────────────────

    case 'SELECT_PAGE':
      return {
        ...state,
        presenterState: selectPage(state.presenterState, action.pageId),
      }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        presenterState: clearSelection(state.presenterState),
      }

    case 'GO_LIVE':
      return {
        ...state,
        presenterState: goLive(state.presenterState, action.pageId),
      }

    case 'CLEAR_LIVE':
      return {
        ...state,
        presenterState: clearLive(state.presenterState),
      }

    // (TODO-001, Phase B) Edit/Live Mode 전환을 state 기반으로 판정하기 위한
    // action. DOM class(#app.mode-live) 읽기를 대체한다. D-014(Session) 범위는
    // 가져오지 않고, 기존 presenterState 컨테이너에 최소 범위로 추가했다.
    case 'SET_APP_MODE':
      return {
        ...state,
        presenterState: setAppMode(state.presenterState, action.mode),
      }

    default:
      console.warn(`[AppStore] 알 수 없는 action: ${action.type}`)
      return state
  }
}

// ─────────────────────────────────────────
// Derived Data (계산 함수 - Store에 저장 안 함)
// ─────────────────────────────────────────

export function getSelectedPage() {
  const { presentation, presenterState } = state
  return presentation.pages.find(p => p.id === presenterState.selectedPageId) ?? null
}

export function getLivePage() {
  const { presentation, presenterState } = state
  return presentation.pages.find(p => p.id === presenterState.livePageId) ?? null
}

/**
 * Flow View 렌더링용 Section 그룹을 계산해 반환한다(CueList 표시용).
 * domain/Presentation.js의 getSectionGroups 참조(D-Editor-4, 기존
 * getSectionRanges 대체) — 매번 pages/sectionMap으로부터 새로 계산되는
 * 파생 값이며 Store에 저장되지 않는다.
 */
export function getSectionGroups() {
  return getPresentationSectionGroups(state.presentation)
}
