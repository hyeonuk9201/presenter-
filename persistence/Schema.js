/**
 * Schema.js
 * Ownership: 저장 스냅샷의 스키마 버전 정의
 * Change Reason: 스냅샷 구조가 바뀔 때(필드 추가/이름 변경/제거)만 수정
 *
 * 배경(2026-07-03): 지금까지 저장 형식은 { title, pages }뿐이었다 —
 * 버전 표시가 전혀 없어서, Page 구조가 바뀌면(transition/autoAdvance 등
 * 필드 추가·향후 Element 모델 전환 등) "이 데이터가 어느 시절 구조인지"를
 * 구분할 방법이 없었다. 지금은 필드가 전부 옵셔널(?? 기본값)이라 우연히
 * 안 터졌을 뿐, 구조적으로 보장된 게 아니었다.
 *
 * 버전을 지금(필드가 적을 때) 넣어두는 게 가장 싸다 — 나중에 실제로
 * breaking change가 생겼을 때 v1 → v2 마이그레이션을 끼워 넣을 자리를
 * 미리 만들어두는 것이 목적이다. 지금 당장 v1→v2 마이그레이션 로직이
 * 있는 건 아니다(아직 그런 변경이 없었으므로) — 자리만 만든다.
 */

// ─────────────────────────────────────────
// 현재 스키마 버전
// ─────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1

// ─────────────────────────────────────────
// 마이그레이션
// ─────────────────────────────────────────

/**
 * 저장된 원본 객체(raw, 어느 버전인지 모름)를 현재 버전 구조로 변환한다.
 *
 * version 필드가 없는 데이터 = 버전 개념 도입 이전(v1 이전 실사용 데이터,
 * 2026-07-03 이전 저장분) → v1으로 간주한다. v1은 최초 버전이라 실제
 * 변환할 내용은 없다(raw를 그대로 통과).
 *
 * 앞으로 스키마가 바뀌면 여기 case를 추가한다. 예:
 *   case 1: raw = migrateV1toV2(raw) // fallthrough 형태로 순차 적용
 *
 * @param {object} raw - JSON.parse 직후의 원본 객체 (아직 검증 전)
 * @returns {object | null} 현재 버전으로 변환된 객체. 마이그레이션 불가능한
 *   (미래) 버전이면 null — 호출부가 새 프로젝트로 폴백한다.
 */
export function migrateSnapshot(raw) {
  const version = typeof raw?.version === 'number' ? raw.version : 1

  if (version > CURRENT_SCHEMA_VERSION) {
    // 이 코드보다 새 버전으로 저장된 데이터 — 예: 구버전 앱으로 새 데이터를
    // 열었을 때. 잘못 해석해서 데이터를 깨뜨리느니 폴백하는 게 안전하다.
    console.warn('[Schema] 알 수 없는(미래) 스냅샷 버전:', version)
    return null
  }

  // v1: 변환 없음 (최초 버전)
  return raw
}

/**
 * 저장 시 버전 필드를 붙인다.
 *
 * @param {{ title: string, pages: object[] }} data
 * @returns {{ version: number, title: string, pages: object[] }}
 */
export function withSchemaVersion(data) {
  return { version: CURRENT_SCHEMA_VERSION, ...data }
}
