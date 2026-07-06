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
 * v1 → v2 (2026-07-06, D-Editor-4): Section 소속 모델이 Range 기반
 * (Section.startPageId + 위치 계산)에서 Page 중심(Page.sectionId 역참조)
 * 으로 바뀌면서 저장 스키마 자체가 바뀌었다 — FutureEditor.md D-Editor-4의
 * 각주("이번엔 필드 추가가 아니라 구조 자체의 변경이라 버전을 올려야
 * 한다")가 예고했던 지점. v1 데이터의 `sections[]`(startPageId 보유)를
 * 옛 Range 계산 로직으로 1회 재현해서, 각 Page가 어느 Section 구간에
 * 있었는지 역산한 뒤 `Page.sectionId`로 채운다.
 */

// ─────────────────────────────────────────
// 현재 스키마 버전
// ─────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 2

// ─────────────────────────────────────────
// 마이그레이션
// ─────────────────────────────────────────

/**
 * v1(Range 모델) → v2(Page 중심 모델) 변환.
 *
 * 옛 sections[]의 각 항목은 { id, title, note, collapsed, color, startPageId }
 * 형태였다. domain/Presentation.js에 있던(현재는 제거된) 예전
 * getSectionRanges()와 동일한 계산을 여기서 1회성으로 재현해서, 각 Page의
 * sectionId를 역산한다 — 이 계산 로직 자체는 마이그레이션 전용이라
 * domain/Presentation.js에 남겨두지 않고 여기서만 재현한다(도메인 코드가
 * 옛 모델을 몰라도 되게 하기 위함).
 *
 * 첫 Section 시작 이전의 Page(옛 모델에서도 "미분류"였던 구간)는
 * sectionId: null로 남는다 — v2에서도 동일한 의미(정상 허용 상태)다.
 *
 * @param {object} raw - v1 스냅샷(버전 필드 없거나 1)
 * @returns {object} v2 스냅샷
 */
function migrateV1toV2(raw) {
  const pages = Array.isArray(raw.pages) ? raw.pages : []
  const oldSections = Array.isArray(raw.sections) ? raw.sections : []

  const withIndex = oldSections
    .map(section => ({
      section,
      startIndex: pages.findIndex(p => p && p.id === section.startPageId),
    }))
    .filter(({ startIndex }) => startIndex !== -1) // 참조 끊긴 Section은 역산 대상에서 제외
    .sort((a, b) => a.startIndex - b.startIndex)

  const pageSectionId = new Map() // pageId -> sectionId (없으면 미분류)
  withIndex.forEach(({ section, startIndex }, i) => {
    const endIndex = i + 1 < withIndex.length ? withIndex[i + 1].startIndex : pages.length
    for (let idx = startIndex; idx < endIndex; idx++) {
      if (pages[idx]) pageSectionId.set(pages[idx].id, section.id)
    }
  })

  const migratedPages = pages.map(page => ({
    ...page,
    sectionId: pageSectionId.get(page.id) ?? null,
  }))

  const sectionMap = {}
  const sectionIds = []
  for (const { section } of withIndex) {
    const { startPageId, ...groupingOnly } = section // startPageId 폐기(D-Editor-4)
    sectionMap[section.id] = groupingOnly
    sectionIds.push(section.id)
  }

  const { sections: _oldSections, version: _oldVersion, ...rest } = raw
  return {
    ...rest,
    pages: migratedPages,
    sectionIds,
    sectionMap,
  }
}

/**
 * 저장된 원본 객체(raw, 어느 버전인지 모름)를 현재 버전 구조로 변환한다.
 *
 * version 필드가 없는 데이터 = 버전 개념 도입 이전(v1 이전 실사용 데이터,
 * 2026-07-03 이전 저장분) → v1으로 간주한다.
 *
 * v1→v2는 fallthrough 형태로 순차 적용한다 — 앞으로 v3가 생기면 같은
 * 패턴으로 이어 붙인다.
 *
 * @param {object} raw - JSON.parse 직후의 원본 객체 (아직 검증 전)
 * @returns {object | null} 현재 버전으로 변환된 객체. 마이그레이션 불가능한
 *   (미래) 버전이면 null — 호출부가 새 프로젝트로 폴백한다.
 */
export function migrateSnapshot(raw) {
  let version = typeof raw?.version === 'number' ? raw.version : 1
  let data = raw

  if (version > CURRENT_SCHEMA_VERSION) {
    // 이 코드보다 새 버전으로 저장된 데이터 — 예: 구버전 앱으로 새 데이터를
    // 열었을 때. 잘못 해석해서 데이터를 깨뜨리느니 폴백하는 게 안전하다.
    console.warn('[Schema] 알 수 없는(미래) 스냅샷 버전:', version)
    return null
  }

  if (version === 1) {
    data = migrateV1toV2(data)
    version = 2
  }

  // v2: 변환 없음(현재 버전)
  return data
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
