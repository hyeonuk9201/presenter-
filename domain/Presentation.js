/**
 * Presentation.js
 * Ownership: 행사 순서 관리
 * Change Reason: 순서 관리 로직이 바뀔 때만 수정
 *
 * Presentation은 Page를 소유한다. (MVP 기준)
 * 미래에 Page Library가 생기면 pages[] → pageIds[] 전환 필요.
 * 그 시점에 이 파일과 AppStore만 수정하면 된다.
 */

import { generateId } from '../utils/id.js'
import { isValidPage } from './Page.js'
import { isValidSection } from './Section.js'

// ─────────────────────────────────────────
// Presentation 생성
// ─────────────────────────────────────────

export function createPresentation({ title = '제목 없음' } = {}) {
  return {
    id: generateId(),
    title,
    pages: [], // Page[] - MVP: 소유 구조
                // Future: pageIds[] - Library 구조로 전환 가능
    sections: [], // Section[] - Editor 개념(FutureEditor.md). Page를 그룹화만
                   // 할 뿐 소유하지 않는다 — startPageId로 pages를 참조.
  }
}

// ─────────────────────────────────────────
// 저장된 데이터 검증 (실사용 버그 대응, 2026-07-03)
// ─────────────────────────────────────────

/**
 * localStorage에서 복원한 원본 객체를 검증하고 안전한 Presentation으로
 * 정리한다. isValidPage()는 Step6부터 정의만 되어있고 실제로 어디서도
 * 호출되지 않았다 — load 경로에 검증이 전혀 없어, 손상된 데이터가 섞여
 * 있으면 이후 렌더링 어딘가에서 예고 없이 죽을 수 있었다(예: pages가
 * 배열이 아니면 presentation.pages.find(...)에서 TypeError).
 *
 * 정책: "부분 손상"은 복구하고, "전체 손상"만 폐기한다.
 *   - raw 자체가 object가 아니거나 pages가 배열이 아니면 복구 불가 → null
 *     (호출부가 새 프로젝트로 폴백한다)
 *   - pages 배열 안에 개별적으로 손상된 Page가 섞여 있으면, 그 항목만
 *     제거하고 나머지는 그대로 살린다 — Page 하나 깨졌다고 전체 행사
 *     데이터를 날리지 않는다.
 *   - sections도 동일한 정책. 추가로, startPageId가 (검증 통과한) pages
 *     안에 없는 Section은 참조가 끊긴 것이므로 제외한다(2026-07-03, Section
 *     도입 시 함께 추가 — FutureEditor.md D-Editor-1).
 *
 * @param {unknown} raw
 * @returns {{ id: string, title: string, pages: object[], sections: object[] } | null}
 */
export function sanitizePresentation(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!Array.isArray(raw.pages)) return null

  const validPages = raw.pages.filter(page => {
    const ok = isValidPage(page)
    if (!ok) {
      console.warn('[Presentation] 손상된 Page를 제외하고 복원함:', page)
    }
    return ok
  })

  const validPageIds = new Set(validPages.map(p => p.id))
  const rawSections = Array.isArray(raw.sections) ? raw.sections : []
  const validSections = rawSections.filter(section => {
    const ok = isValidSection(section) && validPageIds.has(section.startPageId)
    if (!ok) {
      console.warn('[Presentation] 손상되었거나 참조가 끊긴 Section을 제외하고 복원함:', section)
    }
    return ok
  })

  return {
    id: typeof raw.id === 'string' ? raw.id : generateId(),
    title: typeof raw.title === 'string' ? raw.title : '제목 없음',
    pages: validPages,
    sections: validSections,
  }
}

// ─────────────────────────────────────────
// Page 순서 조작
// ─────────────────────────────────────────

/** Page 추가 (마지막) */
export function addPage(presentation, page) {
  return {
    ...presentation,
    pages: [...presentation.pages, page],
  }
}

/**
 * Section이 참조하는 Page가 사라졌을 때 정합성을 유지한다
 * (FutureEditor.md D-Editor-3).
 *
 * 정책: startPageId가 가리키던 Page가 삭제되면, 삭제되기 전 순서 기준으로
 * "그 다음에 오는, 아직 남아있는 Page"로 시작점을 옮긴다. 그런 Page가
 * 하나도 없으면(그 Section 뒤에 남은 Page가 없음) Section 자체를 제거한다.
 *
 * 알려진 한계: 이 재조정은 REMOVE_PAGE의 Undo(INSERT_PAGE_AT)가 복원하지
 * 않는다 — Undo는 Page만 원래 위치로 되돌리고, 이 함수가 그 시점에 만든
 * Section 변경(재조정/삭제)까지는 되돌리지 않는다. Page 하나 삭제로 Section
 * 경계까지 매번 히스토리에 남기는 비용이 이 rare-case를 해결하는 것보다
 * 크다고 판단해 지금은 받아들인다. TODO.md에 등록.
 *
 * @param {object[]} sections - 삭제 전 sections
 * @param {object[]} oldPages - 삭제 전 pages (순서 판단 기준)
 * @param {string} removedPageId
 * @returns {object[]} 재조정된 sections
 */
function reconcileSectionsAfterPageRemoval(sections, oldPages, removedPageId) {
  // 삭제되는 Page가 어떤 Section의 시작점도 아니면 sections는 그대로다.
  // 참조를 그대로 반환해야 AppStore의 deriveMutations()가 불필요한
  // SET_SECTIONS를 잘못 발동시키지 않는다(.map()은 내용이 같아도 항상 새
  // 배열을 만들기 때문에, 여기서 조기 반환하지 않으면 Section과 무관한
  // Page를 지울 때도 매번 SET_SECTIONS가 잘못 딸려온다).
  const needsReconciliation = sections.some(s => s.startPageId === removedPageId)
  if (!needsReconciliation) return sections

  const remainingPageIds = new Set(
    oldPages.filter(p => p.id !== removedPageId).map(p => p.id)
  )

  return sections
    .map(section => {
      if (section.startPageId !== removedPageId) return section

      const oldIndex = oldPages.findIndex(p => p.id === removedPageId)
      const nextSurviving = oldPages
        .slice(oldIndex + 1)
        .find(p => remainingPageIds.has(p.id))

      return nextSurviving ? { ...section, startPageId: nextSurviving.id } : null
    })
    .filter(Boolean)
}

/** Page 삭제 */
export function removePage(presentation, pageId) {
  return {
    ...presentation,
    pages: presentation.pages.filter(p => p.id !== pageId),
    sections: reconcileSectionsAfterPageRemoval(presentation.sections, presentation.pages, pageId),
  }
}

/** Page 교체 (내용 업데이트) */
export function replacePage(presentation, updatedPage) {
  return {
    ...presentation,
    pages: presentation.pages.map(p =>
      p.id === updatedPage.id ? updatedPage : p
    ),
  }
}

/** Page 순서 이동
 * Future: 드래그 재정렬 시 사용
 *
 * sections는 startPageId(참조)만 가지고 있어 손대지 않아도 된다 —
 * Page 위치가 바뀌면 getSectionRanges()가 다음 조회 시 자동으로 새
 * 위치를 반영한다(FutureEditor.md D-Editor-3, "위치가 곧 소속").
 */
export function movePage(presentation, fromIndex, toIndex) {
  const pages = [...presentation.pages]
  const [moved] = pages.splice(fromIndex, 1)
  pages.splice(toIndex, 0, moved)
  return { ...presentation, pages }
}

/**
 * 지정한 index에 Page를 삽입한다.
 * D-018 / History: REMOVE_PAGE의 Undo가 원래 위치를 정확히 복원하기 위한
 * 전용 연산이다. addPage(끝에 추가) + movePage(위치 이동) 두 단계로 하면
 * Mutation/Persistence가 불필요하게 두 번 발생하므로, 단일 연산으로 둔다.
 */
export function insertPageAt(presentation, page, index) {
  const pages = [...presentation.pages]
  const safeIndex = Math.max(0, Math.min(index, pages.length))
  pages.splice(safeIndex, 0, page)
  return { ...presentation, pages }
}

// ─────────────────────────────────────────
// Section 조작 (FutureEditor.md D-Editor-1~3)
// ─────────────────────────────────────────

/** Section 추가 */
export function addSection(presentation, section) {
  return { ...presentation, sections: [...presentation.sections, section] }
}

/** Section 삭제 (Section만 제거 — 소속된 Page는 그대로 남고, 위쪽 Section 또는
 * "미분류" 구간으로 자연히 편입된다) */
export function removeSection(presentation, sectionId) {
  return {
    ...presentation,
    sections: presentation.sections.filter(s => s.id !== sectionId),
  }
}

/** Section 교체 (title/note/collapsed/color/startPageId 등 내용 업데이트) */
export function replaceSection(presentation, updatedSection) {
  return {
    ...presentation,
    sections: presentation.sections.map(s =>
      s.id === updatedSection.id ? updatedSection : s
    ),
  }
}

// ─────────────────────────────────────────
// 조회
// ─────────────────────────────────────────

export function getPageById(presentation, pageId) {
  return presentation.pages.find(p => p.id === pageId) ?? null
}

export function getPageIndex(presentation, pageId) {
  return presentation.pages.findIndex(p => p.id === pageId)
}

/**
 * Section들을 pages 배열 순서로 정렬하고, 각 Section이 담당하는 Page
 * 구간을 계산해서 반환한다. Section의 "끝"은 저장하지 않고 항상 이렇게
 * 계산한다(FutureEditor.md D-Editor-1) — 다음 Section의 시작 직전까지,
 * 마지막 Section은 배열 끝까지.
 *
 * 이 함수는 Editor(CueList 등) 표현 전용이다. 계산 결과를 Store에 다시
 * 저장하지 않는다 — 매번 pages/sections로부터 다시 계산되는 파생 값이다.
 *
 * @param {{ pages: object[], sections: object[] }} presentation
 * @returns {Array<{ id: string, title: string, note: string, collapsed: boolean, color: string|null, startPageId: string, pages: object[] }>}
 */
export function getSectionRanges(presentation) {
  const { pages, sections } = presentation
  if (!sections || sections.length === 0) return []

  const withIndex = sections
    .map(section => ({
      section,
      startIndex: pages.findIndex(p => p.id === section.startPageId),
    }))
    .filter(({ startIndex }) => startIndex !== -1) // 방어적 이중 안전장치 — sanitizePresentation이 이미 걸러냄
    .sort((a, b) => a.startIndex - b.startIndex)

  return withIndex.map(({ section, startIndex }, i) => {
    const endIndex = i + 1 < withIndex.length ? withIndex[i + 1].startIndex : pages.length
    return { ...section, pages: pages.slice(startIndex, endIndex) }
  })
}
