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

// ─────────────────────────────────────────
// Presentation 생성
// ─────────────────────────────────────────

export function createPresentation({ title = '제목 없음' } = {}) {
  return {
    id: generateId(),
    title,
    pages: [], // Page[] - MVP: 소유 구조
                // Future: pageIds[] - Library 구조로 전환 가능
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

/** Page 삭제 */
export function removePage(presentation, pageId) {
  return {
    ...presentation,
    pages: presentation.pages.filter(p => p.id !== pageId),
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
// 조회
// ─────────────────────────────────────────

export function getPageById(presentation, pageId) {
  return presentation.pages.find(p => p.id === pageId) ?? null
}

export function getPageIndex(presentation, pageId) {
  return presentation.pages.findIndex(p => p.id === pageId)
}
