/**
 * PresenterState.js
 * Ownership: 런타임 상태 구조 정의
 * Change Reason: 런타임 상태 항목이 바뀔 때만 수정
 *
 * 저장하지 않는다. 행사 진행 중에만 존재한다.
 * Presentation 내부에 절대 넣지 않는다.
 *
 * Future: 멀티스크린 지원 시
 *   livePageId: string → livePageIds: { [screenId]: string }
 */

export function createPresenterState() {
  return {
    selectedPageId: null, // 현재 편집/포커스 중인 Page
    livePageId: null,     // 현재 실제 송출 중인 Page
  }
}

// ─────────────────────────────────────────
// 상태 전환
// ─────────────────────────────────────────

export function selectPage(state, pageId) {
  return { ...state, selectedPageId: pageId }
}

export function goLive(state, pageId) {
  return { ...state, livePageId: pageId }
}

export function clearLive(state) {
  return { ...state, livePageId: null }
}

export function clearSelection(state) {
  return { ...state, selectedPageId: null }
}
