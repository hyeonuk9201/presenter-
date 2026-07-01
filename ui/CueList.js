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

import { subscribe, getState } from '../store/AppStore.js'
import { execute } from '../command/CommandBus.js'

export function createCueList(containerEl) {
  let lastFingerprint = ''

  render(getState())
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { pages } = state.presentation
    const { selectedPageId, livePageId } = state.presenterState

    // Step6(2026-06-27): text뿐 아니라 mediaId까지 fingerprint에 포함한다.
    // 기존에는 `${p.id}:${p.text}`만 봤는데, image/video Page는 text가
    // 항상 undefined라 mediaId가 바뀌어도(미디어 교체) 변경 감지가 안 될
    // 수 있었다 — type과 mediaId를 추가해 그 경우도 감지하게 한다.
    const currentFingerprint = pages.map(p => `${p.id}:${p.type}:${p.text}:${p.mediaId}`).join('|')
    const pagesChanged = currentFingerprint !== lastFingerprint

    if (pagesChanged) {
      lastFingerprint = currentFingerprint
      containerEl.innerHTML = ''

      if (pages.length === 0) {
        containerEl.appendChild(createEmptyMessage())
        return
      }

      pages.forEach((page, index) => {
        containerEl.appendChild(createCueItem(page, index))
      })
    }

    containerEl.querySelectorAll('.cue-item').forEach(el => {
      const id = el.dataset.pageId
      el.classList.toggle('is-selected', id === selectedPageId)
      el.classList.toggle('is-live',     id === livePageId)
    })
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
