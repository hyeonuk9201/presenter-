/**
 * PersistenceSubscriber.js
 * Ownership: AppStore Mutation 발생 후 localStorage에 저장하는 부수효과(Side Effect) 계층
 * Change Reason: 저장 시점/저장 대상 판단 로직이 바뀔 때만 수정
 *
 * D-015 핵심 원칙:
 *   - PersistenceState(isDirty, lastSavedAt 등)는 CommandBus → AppStore Mutation
 *     경로를 통해 갱신하지 않는다.
 *   - PersistenceSubscriber는 AppStore의 Mutation Subscriber로 등록되어
 *     "관심 있는 Domain Mutation"만 구독한다. 자신이 만든 PersistenceState
 *     변경에는 다시 반응하지 않는다 (재진입 루프 방지).
 *   - 저장 실패가 Store state나 UI 동작에 영향을 주지 않는다. 완전히
 *     격리된 부수효과이며, 실패해도 dispatch()를 다시 호출하지 않는다.
 *
 * 책임:
 *   - 관심 Mutation 타입 구독 (Domain Mutation만 등록 — SET_PAGES, SET_SECTIONS,
 *     SET_TITLE, SET_SELECTION, SET_LIVE_PAGE)
 *   - Runtime State → localStorage 직렬화
 *   - PersistenceState(isDirty, lastSavedAt, saveStatus)를 로컬로 관리하고,
 *     별도 콜백 채널로만 외부에 알림 (AppStore Mutation 경로 사용 안 함)
 *
 * 비책임:
 *   - State Mutation
 *   - Renderer 호출
 *   - Undo/Redo
 *   - JSON 생성 방식 결정 외의 Storage 접근 방식 (StorageAdapter 추상화는 범위 밖)
 *
 * dispatch당 저장 호출 횟수: 1회.
 *   하나의 dispatch()는 notifyMutationSubscribers()를 통해 PersistenceSubscriber의
 *   notify(mutations, state)를 정확히 1번 호출한다 (mutations는 그 dispatch에서
 *   발생한 관심 Mutation들의 배열). 따라서 notify() 1회 = save 1회이며, 이는
 *   기존 AppStore.dispatch() 내부의 savePresentation() 1회 호출과 정확히 동일한
 *   빈도다. REMOVE_PAGE처럼 한 액션이 SET_PAGES + SET_SELECTION + SET_LIVE_PAGE를
 *   동시에 발생시켜도 save는 1번만 실행된다 (mutation 개수만큼 중복 저장하지 않음).
 */

import { STORAGE_KEY } from '../store/AppStore.js'
import { withSchemaVersion } from './Schema.js'

// ─────────────────────────────────────────
// PersistenceState (로컬 상태 — AppStore에 두지 않음, D-015)
// ─────────────────────────────────────────

/**
 * @typedef {object} PersistenceState
 * @property {boolean} isDirty
 * @property {string|null} lastSavedAt - ISO timestamp
 * @property {'idle'|'saving'|'saved'|'failed'} saveStatus
 */
let persistenceState = {
  isDirty: false,
  lastSavedAt: null,
  saveStatus: 'idle',
}

/**
 * PersistenceState 변경을 외부에 알리는 콜백 목록.
 * CommandBus/AppStore 경로를 거치지 않는 별도 알림 채널이다 (D-015).
 * index.html의 저장 상태 표시(2026-07-03)가 이 채널을 구독한다 —
 * 이전에는 등록 지점만 있고 실제 구독자가 없어서, 저장 실패가 발생해도
 * 사용자에게 전혀 보이지 않았다.
 */
const persistenceStateListeners = []

function setPersistenceState(patch) {
  persistenceState = { ...persistenceState, ...patch }
  for (const listener of persistenceStateListeners) {
    listener(persistenceState)
  }
}

/**
 * PersistenceState 변경 콜백을 등록한다.
 * AppStore.subscribe() / registerSubscriber()와는 무관한 별도 채널이다.
 */
export function onPersistenceStateChange(listener) {
  persistenceStateListeners.push(listener)
}

export function getPersistenceState() {
  return persistenceState
}

// ─────────────────────────────────────────
// 저장 (Side Effect)
// ─────────────────────────────────────────

function save(presentation) {
  setPersistenceState({ saveStatus: 'saving' })

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withSchemaVersion({
      title: presentation.title,
      pages: presentation.pages,
      sections: presentation.sections,
    })))
    setPersistenceState({
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      saveStatus: 'saved',
    })
  } catch (err) {
    // 저장 실패(용량 초과 등). Store state와 UI 동작에는 영향을 주지
    // 않는다 — dispatch()를 다시 호출하지 않고 여기서 조용히 끝낸다.
    // 다만 saveStatus:'failed'는 onPersistenceStateChange 구독자(2026-07-03
    // 부터 index.html의 저장 상태 표시가 구독함)에게 전달되어 사용자에게
    // 보여진다 — 이전에는 콘솔에도 안 남고 UI에도 안 보여서 완전히
    // 조용히 사라졌었다.
    console.error('[PersistenceSubscriber] 저장 실패:', err)
    setPersistenceState({ saveStatus: 'failed' })
  }
}

// ─────────────────────────────────────────
// Mutation Subscriber 정의
// ─────────────────────────────────────────

/**
 * AppStore.registerSubscriber()에 그대로 전달할 수 있는
 * Mutation Subscriber 객체.
 */
export const PersistenceSubscriber = {
  id: 'PersistenceSubscriber',

  // Domain Mutation만 등록한다. PersistenceState 자체의 변경은
  // 별도 채널(onPersistenceStateChange)로 통지하므로 여기 포함하지 않는다.
  // SET_SECTIONS 추가(2026-07-03, FutureEditor.md D-Editor-2) — Section의
  // collapsed/color/note/title은 새로고침 후에도 유지되어야 한다.
  interestedMutations: ['SET_PAGES', 'SET_SECTIONS', 'SET_TITLE', 'SET_SELECTION', 'SET_LIVE_PAGE'],

  notify(mutations, state) {
    setPersistenceState({ isDirty: true })
    save(state.presentation)
  },
}
