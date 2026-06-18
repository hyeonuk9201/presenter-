/**
 * AppStore.js
 * Ownership: 상태 SSOT + 단방향 데이터 흐름
 * Change Reason: 상태 저장 구조가 바뀔 때만 수정
 *
 * 규칙:
 *   1. 상태는 dispatch()를 통해서만 변경한다.
 *   2. UI는 subscribe()로 변경을 감지한다.
 *   3. 계산 데이터(Derived)는 Store에 저장하지 않는다.
 */

import { createPresentation, addPage, removePage, replacePage, movePage } from '../domain/Presentation.js'
import { createPresenterState, selectPage, goLive, clearLive, clearSelection } from '../domain/PresenterState.js'

// ─────────────────────────────────────────
// localStorage 헬퍼
// ─────────────────────────────────────────

const STORAGE_KEY = 'tc-presenter-presentation'

function loadPresentation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) // { title, pages }
  } catch {
    return null
  }
}

function savePresentation(presentation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      title: presentation.title,
      pages: presentation.pages,
    }))
  } catch {
    // 저장 실패 시 무시 (용량 초과 등)
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
// Event Bus
// ─────────────────────────────────────────

const bus = new EventTarget()

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
  const next = reduce(state, action)
  if (next === state) return // 변경 없으면 이벤트 생략

  state = next
  savePresentation(state.presentation)
  bus.dispatchEvent(
    new CustomEvent('storeChanged', {
      detail: { action, state },
    })
  )
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

    case 'SET_TITLE':
      return {
        ...state,
        presentation: { ...state.presentation, title: action.title },
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
