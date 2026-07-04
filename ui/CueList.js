/**
 * CueList.js
 * Ownership: 행사 순서 목록 UI
 * Change Reason: 순서 목록 UI가 바뀔 때만 수정
 *
 * 클릭 모델:
 *   Edit Mode → SELECT만  (Editor에 내용 로드)
 *   Live Mode → SELECT + GO_LIVE (즉시 송출)
 *
 * (TODO-001, Phase B 해결됨) Mode 판정은 DOM class(#app.mode-live) 읽기가
 * 아니라 state.presenterState.appMode 기반으로 동작한다.
 */

import { subscribe, getState, getSectionRanges } from '../store/AppStore.js'
import { execute } from '../command/CommandBus.js'

export function createCueList(containerEl) {
  let lastFingerprint = ''

  render(getState())
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { pages, sections } = state.presentation
    const { selectedPageId, livePageId } = state.presenterState

    // Step6(2026-06-27): text뿐 아니라 mediaId까지 fingerprint에 포함한다.
    // 기존에는 `${p.id}:${p.text}`만 봤는데, image/video Page는 text가
    // 항상 undefined라 mediaId가 바뀌어도(미디어 교체) 변경 감지가 안 될
    // 수 있었다 — type과 mediaId를 추가해 그 경우도 감지하게 한다.
    //
    // 9-13(2026-07-03): sections도 fingerprint에 포함한다 — Section
    // 추가/삭제/제목/색상/접기 상태가 바뀌면 구조 자체(Section Tree)가
    // 달라지므로 다시 그려야 한다. pages 변경 감지 로직과 별개 관심사라
    // 이름은 pagesChanged로 유지하되 실제로는 "다시 그려야 하는가"를 뜻한다.
    const pagesFingerprint = pages.map(p => `${p.id}:${p.type}:${p.text}:${p.mediaId}`).join('|')
    const sectionsFingerprint = sections
      .map(s => `${s.id}:${s.title}:${s.collapsed}:${s.color}:${s.startPageId}`)
      .join('|')
    const currentFingerprint = `${pagesFingerprint}::${sectionsFingerprint}`
    const pagesChanged = currentFingerprint !== lastFingerprint

    if (pagesChanged) {
      lastFingerprint = currentFingerprint
      containerEl.innerHTML = ''

      if (pages.length === 0) {
        containerEl.appendChild(createEmptyMessage())
        return
      }

      renderTree(state)
    }

    containerEl.querySelectorAll('.cue-item').forEach(el => {
      const id = el.dataset.pageId
      el.classList.toggle('is-selected', id === selectedPageId)
      el.classList.toggle('is-live',     id === livePageId)
    })
  }

  /**
   * Section Tree 렌더링(9-13 도메인 모델 위에 UI 추가, GPT 설계 원칙 반영).
   * "CueList는 Page List가 아니라 Section Tree를 지향한다" — Section이
   * 없으면(sections:[] — 대부분의 기존 프로젝트) 그냥 flat하게, Page
   * 번호는 항상 전체 순서 기준 전역 번호를 쓴다(Section별로 1번부터
   * 다시 세지 않는다 — Page는 여전히 송출 가능한 최소 단위이므로).
   */
  function renderTree(state) {
    const { pages } = state.presentation
    const ranges = getSectionRanges()
    let globalIndex = 0

    if (ranges.length === 0) {
      pages.forEach(page => {
        containerEl.appendChild(createCueItem(page, globalIndex++))
      })
      return
    }

    // 첫 Section 시작 이전(미분류) Page — 헤더 없이 그냥 나열
    const firstStartIndex = pages.findIndex(p => p.id === ranges[0].startPageId)
    if (firstStartIndex > 0) {
      const unsectioned = document.createElement('div')
      unsectioned.className = 'cue-unsectioned'
      for (let i = 0; i < firstStartIndex; i++) {
        unsectioned.appendChild(createCueItem(pages[i], globalIndex++))
      }
      containerEl.appendChild(unsectioned)
    }

    ranges.forEach(range => {
      containerEl.appendChild(createSectionGroup(range, globalIndex))
      globalIndex += range.pages.length
    })
  }

  // ── Section 그룹 DOM 생성 ────────────────
  function createSectionGroup(range, startGlobalIndex) {
    // range는 getSectionRanges()가 만든 { ...section, pages: [...] } 형태.
    // pages는 이 함수 렌더링에만 쓰는 계산된 값이라, Section 자체를
    // UPDATE_SECTION으로 되돌려보낼 때는 반드시 떼어내야 한다 — 안 그러면
    // Section 도메인 객체에 스냅샷이 섞여 저장된다.
    const { pages: sectionPages, ...section } = range

    const group = document.createElement('div')
    group.className = 'cue-section'
    group.classList.toggle('is-collapsed', !!section.collapsed)
    group.dataset.sectionId = section.id

    const header = document.createElement('div')
    header.className = 'cue-section-header'

    const toggle = document.createElement('span')
    toggle.className = 'cue-section-toggle'
    toggle.textContent = '▾'

    const colorDot = document.createElement('span')
    colorDot.className = 'cue-section-color-dot'
    if (section.color) colorDot.style.background = section.color

    const title = document.createElement('span')
    title.className = 'cue-section-title'
    title.textContent = section.title

    const count = document.createElement('span')
    count.className = 'cue-section-count'
    count.textContent = sectionPages.length

    header.appendChild(toggle)
    header.appendChild(colorDot)
    header.appendChild(title)
    header.appendChild(count)

    // 표시와 액션 전달만 담당 — 실제 상태 변경은 Store(UPDATE_SECTION)를
    // 통해서만 이루어진다. UI가 직접 collapsed를 뒤집어서 그리지 않는다.
    header.addEventListener('click', () => {
      execute({
        type: 'UPDATE_SECTION',
        payload: { section: { ...section, collapsed: !section.collapsed } },
      })
    })

    const pagesEl = document.createElement('div')
    pagesEl.className = 'cue-section-pages'
    sectionPages.forEach((page, i) => {
      pagesEl.appendChild(createCueItem(page, startGlobalIndex + i))
    })

    group.appendChild(header)
    group.appendChild(pagesEl)
    return group
  }

  // ── CueItem DOM 생성 ─────────────────────
  function createCueItem(page, index) {
    const item = document.createElement('div')
    item.className = 'cue-item'
    item.dataset.pageId = page.id

    const num = document.createElement('div')
    num.className = 'cue-number'
    num.textContent = index + 1

    const badge = document.createElement('div')
    badge.className = 'cue-live-badge'
    badge.textContent = 'LIVE'

    const preview = document.createElement('div')
    preview.className = 'cue-preview'
    preview.textContent = getPreviewText(page)

    const type = document.createElement('div')
    type.className = 'cue-type'
    type.textContent = page.type

    const del = document.createElement('button')
    del.className = 'cue-delete-btn'
    del.textContent = '×'
    del.title = '삭제'

    item.appendChild(num)
    item.appendChild(badge)
    item.appendChild(preview)
    item.appendChild(type)
    item.appendChild(del)

    del.addEventListener('click', (e) => {
      e.stopPropagation() // 아이템 클릭(SELECT) 전파 차단
      // Step6(2026-06-27): getPreviewText()로 통일 — image/video Page는
      // page.text가 항상 undefined라 기존 코드(`page.text?.split(...)`)로는
      // 무조건 "(빈 페이지)"로 표시되는 문제가 있었다. getPreviewText는
      // 이미 type별 분기를 갖고 있어(line 131~136) image Page는 "(image)"로
      // 보여준다.
      const firstLine = getPreviewText(page)
      if (!confirm('이 Page를 삭제할까요?\n\n"' + firstLine + '"')) return

      const { presenterState } = getState()
      const wasSelected = presenterState.selectedPageId === page.id
      const wasLive     = presenterState.livePageId     === page.id

      execute({ type: 'REMOVE_PAGE', payload: { pageId: page.id } })

      if (wasSelected) {
        // selectedPageId → null → subscribe else 분기에서 Editor 초기화 처리
      }

      if (wasLive) {
        // REMOVE_PAGE reducer가 이미 CLEAR_LIVE 처리 →
        // BroadcastOutput이 자동으로 CLEAR 전송 → output.html STANDBY
        // 추가 작업 불필요
      }
    })

    // Edit Mode: SELECT만
    // Live Mode: SELECT + GO_LIVE
    item.addEventListener('click', () => {
      execute({ type: 'SELECT_PAGE', payload: { pageId: page.id } })

      // (TODO-001, Phase B) DOM class(#app.mode-live) 읽기 대신 state의
      // presenterState.appMode를 직접 읽는다.
      const isLiveMode = getState().presenterState.appMode === 'live'

      if (isLiveMode) {
        execute({ type: 'GO_LIVE', payload: { pageId: page.id } })
      }
    })

    return item
  }

  function createEmptyMessage() {
    const el = document.createElement('div')
    el.className = 'cue-empty'
    el.textContent = 'Page가 없습니다. 가사를 입력하거나 Page를 추가하세요.'
    return el
  }

  function getPreviewText(page) {
    if (page.type === 'text') {
      return page.text?.split('\n')[0] ?? '(빈 페이지)'
    }
    return `(${page.type})`
  }
}
