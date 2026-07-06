/**
 * Section.js
 * Ownership: Section 데이터 구조 정의 및 생성
 * Change Reason: Section 스펙이 바뀔 때만 수정
 *
 * Section은 Page를 그룹화하는 Editor 개념이다(FutureEditor.md D-Editor-4,
 * D-Editor-1/D-Editor-3 대체). Section은 더 이상 자신의 위치를 스스로
 * 정의하지 않는다 — "이 Page가 어느 Section에 속하는가"는 Page 쪽이
 * `sectionId`로 직접 들고 있다(domain/Page.js 참조). Section은 순수
 * grouping metadata(title/note/collapsed/color)만 가진다.
 *
 * Section이 Presentation 안에서 몇 번째로 표시되는지(순서)는 이 파일이
 * 알지 못한다 — Presentation.sectionIds가 그 SSOT다(domain/Presentation.js).
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링, Page 소속 계산에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// Section 생성
// ─────────────────────────────────────────

/**
 * @param {{ title?: string, note?: string, collapsed?: boolean, color?: string|null }} params
 */
export function createSection({
  title = '섹션',
  note = '',
  collapsed = false,
  color = null,
} = {}) {
  return {
    id: generateId(),
    title,
    note,
    collapsed,
    color, // Hex 문자열 또는 null(색상 없음)
    // startPageId 없음(D-Editor-4) — Section은 더 이상 위치를 스스로
    // 정의하지 않는다. Page 없이도(빈 Section) 정상적으로 존재할 수 있다.
  }
}

// ─────────────────────────────────────────
// Section 검증
// ─────────────────────────────────────────

export function isValidSection(section) {
  if (!section || typeof section !== 'object') return false
  if (!section.id || typeof section.id !== 'string') return false
  if (typeof section.title !== 'string') return false
  if (typeof section.collapsed !== 'boolean') return false
  if (section.color !== null && typeof section.color !== 'string') return false
  return true
}
