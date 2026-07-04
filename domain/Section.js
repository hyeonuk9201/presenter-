/**
 * Section.js
 * Ownership: Section 데이터 구조 정의 및 생성
 * Change Reason: Section 스펙이 바뀔 때만 수정
 *
 * Section은 Page를 그룹화하는 Editor 개념이다(FutureEditor.md D-Editor-1).
 * Page.sectionId 같은 역참조를 두지 않는다 — Section은 자신이 시작하는
 * Page(startPageId)만 알고, "이 Page가 어느 Section에 속하는가"는
 * Presentation.pages 배열 순서 위에서 계산한다
 * (domain/Presentation.js의 getSectionRanges 참조).
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링, Page 배열 순서 계산에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// Section 생성
// ─────────────────────────────────────────

/**
 * @param {{ title?: string, note?: string, collapsed?: boolean, color?: string|null, startPageId: string }} params
 */
export function createSection({
  title = '섹션',
  note = '',
  collapsed = false,
  color = null,
  startPageId,
} = {}) {
  if (!startPageId || typeof startPageId !== 'string') {
    throw new Error('[Section] createSection: startPageId는 필수 문자열이다')
  }

  return {
    id: generateId(),
    title,
    note,
    collapsed,
    color, // Hex 문자열 또는 null(색상 없음)
    startPageId, // 이 Section이 시작되는 Page의 id. 끝 지점은 저장하지 않는다
                 // (다음 Section의 시작 직전까지로 계산 — 중복 정보로 인한
                 // 불일치를 피하기 위함, FutureEditor.md D-Editor-1)
  }
}

// ─────────────────────────────────────────
// Section 검증
// ─────────────────────────────────────────

export function isValidSection(section) {
  if (!section || typeof section !== 'object') return false
  if (!section.id || typeof section.id !== 'string') return false
  if (!section.startPageId || typeof section.startPageId !== 'string') return false
  if (typeof section.title !== 'string') return false
  return true
}
