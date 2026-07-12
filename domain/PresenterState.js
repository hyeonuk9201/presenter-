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
 *
 * appMode (TODO-001, Phase B):
 *   Edit Mode / Live Mode 판정을 DOM class(`#app.mode-live`) 읽기에서
 *   state 기반으로 옮긴다. D-014(Session 전역 구조 도입)는 범위 밖이며,
 *   appMode는 우선 기존 PresenterState 컨테이너에 추가하는 최소 범위로 간다.
 */

// Emergency Overlay 위치 허용값 (D-031). 세밀한 좌표 대신 상/중/하만 —
// 운영 속도 우선(Research/Observations.md 2026-07-08 요구사항 6).
const OVERLAY_POSITIONS = new Set(['top', 'middle', 'bottom'])

export function createPresenterState() {
  return {
    selectedPageId: null, // 현재 편집/포커스 중인 Page
    livePageId: null,     // 현재 실제 송출 중인 Page
    appMode: 'edit',      // 'edit' | 'live' — 현재 UI 모드 (TODO-001)
    // 긴급 안내 오버레이 (D-031). null = 비활성(별도 active 플래그 없음).
    // livePageId와 완전히 직교한다 — Live Page가 없어도(STANDBY) 송출된다.
    emergencyOverlay: null, // null | { text: string, position: 'top'|'middle'|'bottom' }
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

export function setAppMode(state, mode) {
  return { ...state, appMode: mode }
}

// ─────────────────────────────────────────
// Emergency Overlay (D-031)
// ─────────────────────────────────────────

/**
 * 긴급 안내 오버레이를 설정한다. 빈 문자열은 "송출할 게 없음"이므로
 * 해제와 동일하게 처리한다(호출부가 빈 입력을 걸러도 도메인에서 한 번 더
 * 보장 — 빈 오버레이가 송출 화면을 가리는 사고 방지). position이 허용값
 * 밖이면 'bottom'으로 폴백한다 — 잘못된 값 때문에 긴급 송출 자체가
 * 실패하는 것보다 기본 위치로라도 나가는 게 낫다(운영 기능 특성).
 */
export function setEmergencyOverlay(state, { text, position } = {}) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return clearEmergencyOverlay(state)

  return {
    ...state,
    emergencyOverlay: {
      text: trimmed,
      position: OVERLAY_POSITIONS.has(position) ? position : 'bottom',
    },
  }
}

/**
 * 긴급 안내 오버레이를 해제한다. 이미 비활성이면 같은 참조를 반환해
 * dispatch가 변경 없음으로 처리하게 한다(불필요한 통지 방지).
 */
export function clearEmergencyOverlay(state) {
  if (state.emergencyOverlay === null) return state
  return { ...state, emergencyOverlay: null }
}
