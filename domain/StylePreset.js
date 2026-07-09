/**
 * StylePreset.js
 * Ownership: 스타일 프리셋 데이터 구조 정의 및 생성
 * Change Reason: 프리셋 스펙이 바뀔 때만 수정
 *
 * D-023(스타일 프리셋은 생산성 기능이지 데이터 모델이 아니다) 참조 —
 * StylePreset은 Page와 어떤 참조 관계도 갖지 않는다. 적용은 값 복사
 * (Copy)뿐이며, Page 쪽에는 "이 프리셋에서 왔다"는 흔적을 전혀 남기지
 * 않는다(`Page.presetId` 같은 필드를 두지 않는다 — D-023 Non-goal).
 *
 * D-025(저장 위치) 참조 — Presentation이 아니라 AppSettings에 저장되는
 * 별도 개체다. Presentation 생명주기와 무관하게 여러 예배/행사에서
 * 재사용된다.
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링, Page 소속에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// StylePreset 생성
// ─────────────────────────────────────────

/**
 * @param {{
 *   name?: string, fontSize?: number, color?: string, lineHeight?: number,
 *   fontWeight?: string, textStroke?: number, textShadow?: boolean,
 *   horizontalAlign?: string, verticalAlign?: string,
 * }} params
 */
export function createStylePreset({
  name = '새 프리셋',
  fontSize = 72,
  color = '#ffffff',
  lineHeight = 1.3,
  fontWeight = 'normal',
  textStroke = 0,
  textShadow = false,
  horizontalAlign = 'center',
  verticalAlign = 'bottom',
} = {}) {
  return {
    id: generateId(),
    name,
    fontSize,
    color,
    lineHeight,
    fontWeight,
    textStroke,
    textShadow,
    horizontalAlign,
    verticalAlign,
  }
}

// ─────────────────────────────────────────
// StylePreset 검증
// ─────────────────────────────────────────

export function isValidStylePreset(preset) {
  if (!preset || typeof preset !== 'object') return false
  if (!preset.id || typeof preset.id !== 'string') return false
  if (typeof preset.name !== 'string') return false
  if (typeof preset.fontSize !== 'number') return false
  if (typeof preset.color !== 'string') return false
  if (typeof preset.lineHeight !== 'number') return false
  if (typeof preset.fontWeight !== 'string') return false
  if (typeof preset.textStroke !== 'number') return false
  if (typeof preset.textShadow !== 'boolean') return false
  if (typeof preset.horizontalAlign !== 'string') return false
  if (typeof preset.verticalAlign !== 'string') return false
  return true
}

// ─────────────────────────────────────────
// 시스템 기본 프리셋 (2026-07-06, D-025)
// ─────────────────────────────────────────

/**
 * AppSettings에 저장된 프리셋이 하나도 없을 때(최초 실행) 시드로 넣을
 * 기본 프리셋 2개. 사용자가 수정/삭제 가능 — 시스템 프리셋이라고 해서
 * 보호되지 않는다(단순함 유지, D-023과 같은 정신).
 */
export function createDefaultStylePresets() {
  return [
    createStylePreset({
      name: '찬양 기본',
      fontSize: 72,
      color: '#ffffff',
      lineHeight: 1.3,
      fontWeight: 'bold',
      textStroke: 0,
      textShadow: true,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
    }),
    createStylePreset({
      name: '설교 자막',
      fontSize: 48,
      color: '#ffffff',
      lineHeight: 1.4,
      fontWeight: 'normal',
      textStroke: 1,
      textShadow: false,
      horizontalAlign: 'center',
      verticalAlign: 'bottom',
    }),
  ]
}
