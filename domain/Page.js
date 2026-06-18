/**
 * Page.js
 * Ownership: Page 데이터 구조 정의 및 생성
 * Change Reason: Page 스펙이 바뀔 때만 수정
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// Page 생성
// ─────────────────────────────────────────

/**
 * 텍스트 Page 생성
 *
 * 필드 분류 주석은 미래 content/style 분리 시
 * 어떤 필드가 어느 쪽으로 가는지 기록해둔 것이다.
 * MVP에서는 플랫 구조를 유지한다.
 */
export function createTextPage({
  text = '',
  fontSize = 72,
  horizontalAlign = 'center',
  verticalAlign = 'bottom',
} = {}) {
  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'text',

    // ── Content ───────────────────────────
    // 미래: page.content.text
    text,

    // ── Style ─────────────────────────────
    // 미래: page.style.fontSize / horizontalAlign / verticalAlign
    // 미래: stylePresetId 로 교체 가능
    fontSize,
    horizontalAlign, // 'left' | 'center' | 'right'
    verticalAlign,   // 'top'  | 'middle' | 'bottom'

    // ── Future (미구현) ────────────────────
    // mediaId: null,           // 전경 미디어
    // backgroundMediaId: null, // 배경 미디어
    // backgroundColor: null,   // 배경 단색
    // stylePresetId: null,     // StylePreset 도입 시
  }
}

// ─────────────────────────────────────────
// Page 업데이트
// ─────────────────────────────────────────

/**
 * Page를 불변으로 업데이트한다.
 * 원본을 변경하지 않고 새 객체를 반환한다.
 */
export function updatePage(page, changes) {
  return { ...page, ...changes }
}

// ─────────────────────────────────────────
// Page 검증
// ─────────────────────────────────────────

export function isValidPage(page) {
  if (!page || typeof page !== 'object') return false
  if (!page.id || typeof page.id !== 'string') return false
  if (!['text'].includes(page.type)) return false // 미래: 'image', 'video' 추가
  return true
}
