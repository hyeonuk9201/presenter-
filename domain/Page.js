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
  color = '#ffffff',
  lineHeight = 1.3,
  fontWeight = 'normal',
  textStroke = 0,
  textShadow = false,
} = {}) {
  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'text',

    // ── Content ───────────────────────────
    // 미래: page.content.text
    text,

    // ── Style ─────────────────────────────
    // 미래: page.style.fontSize / horizontalAlign / verticalAlign / color / lineHeight / fontWeight / textStroke / textShadow
    // 미래: stylePresetId 로 교체 가능
    fontSize,
    horizontalAlign, // 'left' | 'center' | 'right'
    verticalAlign,   // 'top'  | 'middle' | 'bottom'
    color,           // 텍스트 색상 (Hex). 기본값은 어두운 배경 가정 흰색.
    lineHeight,      // 배수(multiplier). fontSize에 곱해지는 비율 — 절대 px 아님.
    fontWeight,      // 'normal' | 'bold'. 시스템 폰트 굵기만 지원 (웹폰트/폰트 패밀리는 범위 밖).
    textStroke,      // 외곽선 두께(px). 0이면 없음. 색상은 검정 고정(범위 단순화, 영상 배경 대비용 표준 조합).
    textShadow,      // 그림자 on/off. 세부 오프셋/불투명도 조정 없음(범위 단순화).

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
