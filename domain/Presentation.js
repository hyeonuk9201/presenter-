/**
 * Presentation.js
 * Ownership: 행사 순서 관리
 * Change Reason: 순서 관리 로직이 바뀔 때만 수정
 *
 * Presentation은 Page를 소유한다. (MVP 기준)
 * 미래에 Page Library가 생기면 pages[] → pageIds[] 전환 필요.
 * 그 시점에 이 파일과 AppStore만 수정하면 된다.
 *
 * Section 소속 모델(2026-07-06, D-Editor-4 — D-Editor-1/D-Editor-3 대체):
 * Section은 더 이상 자신의 위치를 스스로 정의하지 않는다(startPageId
 * 제거됨). 대신 Page가 `sectionId`로 직접 자신의 소속을 들고 있다.
 * `pages[]`는 여전히 Live Order의 SSOT이고(변경 없음), `sectionIds[]`가
 * Section 표시 순서의 새 SSOT, `sectionMap{}`이 Section 저장소다.
 * 자세한 배경은 FutureEditor.md의 D-Editor-4, 논의 과정은
 * Research/2026-07-04 Workflow Separation.md 참조.
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
    pages: [], // Page[] - MVP: 소유 구조. Live Order의 SSOT(변경 없음).
               // Future: pageIds[] - Library 구조로 전환 가능
    sectionIds: [], // Section 표시 순서 SSOT(D-Editor-4).
    sectionMap: {}, // { [sectionId]: Section } - Section 저장소.
    // 기본 Section을 자동으로 만들지 않는다 — "Page는 반드시 Section에
    // 속한다"는 불변식은 채택하지 않기로 함(Research/2026-07-05 후속
    // 논의: Browser/Flow 분리 관점에서 null을 정상 상태로 유지하는 쪽이
    // 더 자연스럽다는 결론).
  }
}

// ─────────────────────────────────────────
// 저장된 데이터 검증 (실사용 버그 대응, 2026-07-03 / D-Editor-4 갱신 2026-07-06)
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
 *     제거하고 나머지는 그대로 살린다.
 *   - sectionMap 안에 개별적으로 손상된 Section이 섞여 있으면 그 항목만
 *     제외한다.
 *
 * 검증 방향 반전(2026-07-06, D-Editor-4): D-Editor-1 시절엔 "Section이
 * 존재하는 Page를 가리키는가"(Section→Page)를 확인했지만, 이제는 소속
 * 정보가 Page 쪽에 있으므로 "Page가 존재하는 Section을 가리키는가"
 * (Page→Section)를 확인한다. 참조가 끊긴 경우 그 Page를 버리지 않고
 * `sectionId: null`로 되돌린다(9-11 정책 재사용 — Page 하나가 가리키는
 * Section이 사라졌다고 Page 자체를 잃을 이유는 없다).
 *
 * @param {unknown} raw
 * @returns {{ id: string, title: string, pages: object[], sectionIds: string[], sectionMap: object } | null}
 */
export function sanitizePresentation(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!Array.isArray(raw.pages)) return null

  // 1) Section 검증 (sectionMap 형태)
  const rawSectionMap = (raw.sectionMap && typeof raw.sectionMap === 'object') ? raw.sectionMap : {}
  const validSectionMap = {}
  for (const [id, section] of Object.entries(rawSectionMap)) {
    if (isValidSection(section) && section.id === id) {
      validSectionMap[id] = section
    } else {
      console.warn('[Presentation] 손상된 Section을 제외하고 복원함:', section)
    }
  }

  // 2) sectionIds(순서 목록) 검증 — sectionMap에 없는 id는 제외,
  //    반대로 sectionMap에는 있는데 목록에서 빠진 id는 방어적으로 뒤에 채운다.
  const rawSectionIds = Array.isArray(raw.sectionIds) ? raw.sectionIds : []
  const validSectionIds = rawSectionIds.filter(id => {
    const ok = typeof id === 'string' && validSectionMap[id] !== undefined
    if (!ok) console.warn('[Presentation] sectionMap에 없는 sectionId를 순서 목록에서 제외함:', id)
    return ok
  })
  for (const id of Object.keys(validSectionMap)) {
    if (!validSectionIds.includes(id)) validSectionIds.push(id)
  }

  // 3) Page 검증 + sectionId 참조 무결성(Page→Section 방향)
  const validPages = raw.pages
    .filter(page => {
      const ok = isValidPage(page)
      if (!ok) console.warn('[Presentation] 손상된 Page를 제외하고 복원함:', page)
      return ok
    })
    .map(page => {
      const sid = page.sectionId ?? null
      if (sid !== null && !validSectionMap[sid]) {
        console.warn('[Presentation] 존재하지 않는 Section을 가리키는 Page를 미분류로 되돌림:', page.id)
        return { ...page, sectionId: null }
      }
      return page.sectionId === sid ? page : { ...page, sectionId: sid }
    })

  return {
    id: typeof raw.id === 'string' ? raw.id : generateId(),
    title: typeof raw.title === 'string' ? raw.title : '제목 없음',
    pages: validPages,
    sectionIds: validSectionIds,
    sectionMap: validSectionMap,
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
 * Page 삭제.
 *
 * D-Editor-4(2026-07-06): Page 중심 모델에서는 Section이 Page를 참조만
 * 할 뿐 위치로 정의되지 않으므로, Page를 삭제해도 Section 쪽에는 아무
 * 영향이 없다 — D-Editor-1 시절 필요했던 reconcileSectionsAfterPageRemoval()
 * (앵커 Page 삭제 시 Section 경계 재조정)이 통째로 불필요해졌다.
 */
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

/**
 * Page 순서 이동(같은 Section 안에서든 밖에서든, 순수 위치 이동).
 * Future: 드래그 재정렬 시 사용.
 *
 * 자동 흡수(D-Editor-4 규칙 5): 이 함수는 sectionId를 그대로 들고
 * 옮기지 않는다 — 이동한 자리의 새 이웃(앞/뒤 Page) 기준으로 sectionId를
 * 재계산한다. 그렇지 않으면 Section이 pages[] 안에서 여러 조각으로
 * 파편화될 수 있다(Flow View에 같은 Section이 두 번 나타나는 문제,
 * FutureEditor.md D-Editor-4 참조). Section을 명시적으로 바꾸는 이동은
 * movePageToSection()을 쓴다 — 이 함수와 책임이 다르다.
 */
export function movePage(presentation, fromIndex, toIndex) {
  const pages = [...presentation.pages]
  const [moved] = pages.splice(fromIndex, 1)

  const safeToIndex = Math.max(0, Math.min(toIndex, pages.length))
  const prevNeighbor = pages[safeToIndex - 1] ?? null
  const nextNeighbor = pages[safeToIndex] ?? null

  let newSectionId
  if (prevNeighbor && nextNeighbor && prevNeighbor.sectionId === nextNeighbor.sectionId) {
    newSectionId = prevNeighbor.sectionId
  } else if (prevNeighbor) {
    newSectionId = prevNeighbor.sectionId
  } else if (nextNeighbor) {
    newSectionId = nextNeighbor.sectionId
  } else {
    newSectionId = null // 유일한 Page였던 경우
  }

  const updatedMoved = { ...moved, sectionId: newSectionId }
  pages.splice(safeToIndex, 0, updatedMoved)
  return { ...presentation, pages }
}

/**
 * 지정한 index에 Page를 삽입한다.
 * D-018 / History: REMOVE_PAGE의 Undo가 원래 위치를 정확히 복원하기 위한
 * 전용 연산이다. addPage(끝에 추가) + movePage(위치 이동) 두 단계로 하면
 * Mutation/Persistence가 불필요하게 두 번 발생하므로, 단일 연산으로 둔다.
 *
 * movePage()와 달리 sectionId 자동 흡수를 하지 않는다 — 삽입되는 Page는
 * 이미 자신의 sectionId를 그대로 들고 온다(Undo가 삭제 당시의 sectionId를
 * 정확히 복원해야 하므로, 이웃 기준 재계산으로 덮어쓰면 안 된다).
 */
export function insertPageAt(presentation, page, index) {
  const pages = [...presentation.pages]
  const safeIndex = Math.max(0, Math.min(index, pages.length))
  pages.splice(safeIndex, 0, page)
  return { ...presentation, pages }
}

/**
 * Page를 다른 Section으로 옮긴다(명시적 소속 변경, D-Editor-4 규칙 1).
 * `sectionId`만 바꾸고 위치를 그대로 두면 Flow View의 그룹 표시와 실제
 * 진행 순서가 어긋나므로, 대상 Section(targetSectionId, null 포함)의
 * 마지막 Page 바로 뒤로 위치도 함께 옮긴다. 대상에 속한 Page가 하나도
 * 없으면(빈 Section이거나, 미분류 구간이 아예 없는 경우) 배열 끝에
 * 추가한다.
 *
 * @param {object} presentation
 * @param {string} pageId
 * @param {string|null} targetSectionId
 */
export function movePageToSection(presentation, pageId, targetSectionId) {
  const { pages } = presentation
  const pageIndex = pages.findIndex(p => p.id === pageId)
  if (pageIndex === -1) return presentation

  const page = pages[pageIndex]
  const withoutPage = pages.filter(p => p.id !== pageId)

  let insertIndex = withoutPage.length
  for (let i = withoutPage.length - 1; i >= 0; i--) {
    if (withoutPage[i].sectionId === targetSectionId) {
      insertIndex = i + 1
      break
    }
  }

  const updatedPage = { ...page, sectionId: targetSectionId }
  const newPages = [...withoutPage]
  newPages.splice(insertIndex, 0, updatedPage)

  return { ...presentation, pages: newPages }
}

/**
 * Page의 위치와 Section 소속을 동시에, 정확한 값으로 되돌린다.
 *
 * D-Editor-4가 예고했던 "위치+소속을 함께 되돌리는 경로"(FutureEditor.md
 * D-Editor-4 "잃는 것" 참조)가 실제로 필요해져서 추가한 Undo 전용 함수다
 * — `MOVE_PAGE_TO_SECTION`의 Undo는 movePageToSection()을 거꾸로 호출하는
 * 것만으로 부족하다(그건 "대상 Section의 끝"으로 보낼 뿐, 원래 있던
 * 정확한 index로 복원하지 못한다). `insertPageAt()`도 못 쓴다 — 그 Page는
 * 배열에서 없어진 적이 없고 자리만 옮겼을 뿐이라, 그대로 삽입하면 같은
 * id가 배열에 중복된다.
 *
 * 그래서 이 함수는 "이미 배열 어딘가에 있는 Page를 제거 → 지정한 index에
 * 지정한 sectionId로 재삽입"을 원자적으로 수행한다(history/HistoryManager.js
 * 전용, 일반 편집 흐름에서는 movePage()/movePageToSection()을 쓴다).
 */
export function setPagePositionAndSection(presentation, pageId, index, sectionId) {
  const current = presentation.pages.find(p => p.id === pageId)
  if (!current) return presentation

  const withoutPage = presentation.pages.filter(p => p.id !== pageId)
  const updatedPage = { ...current, sectionId }
  const safeIndex = Math.max(0, Math.min(index, withoutPage.length))
  const newPages = [...withoutPage]
  newPages.splice(safeIndex, 0, updatedPage)

  return { ...presentation, pages: newPages }
}

// ─────────────────────────────────────────
// Section 조작 (FutureEditor.md D-Editor-4)
// ─────────────────────────────────────────

/** Section 추가 (표시 순서 맨 뒤) */
export function addSection(presentation, section) {
  return {
    ...presentation,
    sectionIds: [...presentation.sectionIds, section.id],
    sectionMap: { ...presentation.sectionMap, [section.id]: section },
  }
}

/**
 * Section 삭제(D-Editor-4 규칙 3). 소속돼 있던 Page는 인접 Section에
 * 병합하지 않고 `sectionId: null`(미분류)로 되돌린다 — "인접"의 정의가
 * 애매해지고, 사용자가 예상 못 한 곳으로 Page가 옮겨가는 결과를 막기
 * 위함(FutureEditor.md D-Editor-4 세부 규칙 3 그대로).
 *
 * "Presentation은 최소 1개 Section을 가져야 한다"는 불변식은 없으므로,
 * 마지막 Section을 지워도 제한 없이 그대로 진행된다(Research/2026-07-05
 * 후속 논의 결론).
 */
export function removeSection(presentation, sectionId) {
  const { [sectionId]: _removed, ...remainingMap } = presentation.sectionMap
  return {
    ...presentation,
    sectionIds: presentation.sectionIds.filter(id => id !== sectionId),
    sectionMap: remainingMap,
    pages: presentation.pages.map(p =>
      p.sectionId === sectionId ? { ...p, sectionId: null } : p
    ),
  }
}

/** Section 교체 (title/note/collapsed/color 등 내용 업데이트) */
export function replaceSection(presentation, updatedSection) {
  return {
    ...presentation,
    sectionMap: { ...presentation.sectionMap, [updatedSection.id]: updatedSection },
  }
}

/**
 * Section 전체(그 Section에 속한 연속된 Page 블록)를 Flow 순서(pages[])
 * 안에서 앞/뒤 인접 그룹과 통째로 맞바꾼다(2026-07-06, 실사용 요청 —
 * "Section 순서를 보고 위/아래로 옮길 수 있으면 좋겠다").
 *
 * 유령 Section(Page가 0개)은 pages[] 안에 그룹 자체가 없으므로
 * (getSectionGroups() 참조) 이 함수로 옮길 대상이 되지 않는다 —
 * groupIndex를 못 찾으면 그대로(no-op) 반환한다. 먼저 Page를 배정해야
 * 순서 이동이 의미를 가진다.
 *
 * sectionIds(표시 순서 SSOT)도 가능한 한 함께 맞춘다 — 맞바꾸는 두 그룹이
 * 둘 다 실제 Section(미분류 아님)일 때만 그 둘의 상대 순서를
 * sectionIds 안에서도 맞바꾼다. 한쪽이 미분류(null) 그룹이면 sectionIds에
 * 대응 항목이 없으므로 그 부분은 건드리지 않는다 — sectionIds와 pages[]
 * 그룹 순서가 완전히 일치하지 않을 수 있다는 건 이미 알려진 트레이드오프
 * (FutureEditor.md D-Editor-4 "잃는 것" 참조)이고, 이 함수는 "가능한
 * 경우엔 맞춰준다" 정도로만 개선한다.
 *
 * @param {object} presentation
 * @param {string} sectionId
 * @param {'up'|'down'} direction
 */
export function moveSectionGroup(presentation, sectionId, direction) {
  const groups = getSectionGroups(presentation)
  const groupIndex = groups.findIndex(g => g.sectionId === sectionId)
  if (groupIndex === -1) return presentation // 유령 Section — 이동 대상 없음

  const neighborIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1
  if (neighborIndex < 0 || neighborIndex >= groups.length) return presentation // 이미 끝

  const newGroups = [...groups]
  ;[newGroups[groupIndex], newGroups[neighborIndex]] = [newGroups[neighborIndex], newGroups[groupIndex]]
  const newPages = newGroups.flatMap(g => g.pages)

  const movedSectionId = groups[groupIndex].sectionId
  const neighborSectionId = groups[neighborIndex].sectionId
  let newSectionIds = presentation.sectionIds
  if (movedSectionId !== null && neighborSectionId !== null) {
    const a = presentation.sectionIds.indexOf(movedSectionId)
    const b = presentation.sectionIds.indexOf(neighborSectionId)
    if (a !== -1 && b !== -1) {
      newSectionIds = [...presentation.sectionIds]
      ;[newSectionIds[a], newSectionIds[b]] = [newSectionIds[b], newSectionIds[a]]
    }
  }

  return { ...presentation, pages: newPages, sectionIds: newSectionIds }
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
 * Flow View 렌더링용 그룹 계산(D-Editor-4 규칙 4를 대체 — 기존
 * getSectionRanges()를 이 함수가 대체한다).
 *
 * `pages[]`를 순서 그대로 훑으면서, 연속으로 같은 sectionId를 가진
 * Page들을 하나의 그룹으로 묶는다. `sectionId: null`도 하나의 그룹으로
 * 취급한다(미분류 구간 — Section이 아니라 표시상 "그룹 없음" 상태).
 *
 * 렌더링 순서는 항상 pages[](Live Order) 기준이다(규칙 4) —
 * `sectionIds`(Section 표시 순서 SSOT)는 여기서 쓰지 않는다. 두 순서가
 * 어긋나 보일 수 있는 것 자체가 이 모델의 알려진 트레이드오프다
 * (FutureEditor.md D-Editor-4 "잃는 것" 참조) — 대신 movePage()의 자동
 * 흡수와 movePageToSection()의 위치 재배치가 항상 연속성(같은 Section이
 * pages[] 안에서 조각나지 않는 것)을 지켜주는 것을 전제로 한다.
 *
 * @param {{ pages: object[], sectionMap: object }} presentation
 * @returns {Array<{ sectionId: string|null, section: object|null, pages: object[] }>}
 */
export function getSectionGroups(presentation) {
  const { pages, sectionMap } = presentation
  const groups = []
  let current = null

  for (const page of pages) {
    const sid = page.sectionId ?? null
    if (!current || current.sectionId !== sid) {
      current = {
        sectionId: sid,
        section: sid !== null ? (sectionMap[sid] ?? null) : null,
        pages: [],
      }
      groups.push(current)
    }
    current.pages.push(page)
  }

  return groups
}
