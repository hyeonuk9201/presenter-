/**
 * id.js
 * Ownership: 고유 ID 생성
 * Change Reason: ID 생성 전략이 바뀔 때만 수정
 */

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
