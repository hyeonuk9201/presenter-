/**
 * CueList.js
 * Ownership: 행사 순서 목록 UI
 * Change Reason: 순서 목록 UI가 바뀔 때만 수정
 *
 * 클릭 모델:
 *   Edit Mode → SELECT만  (Editor에 내용 로드)
 *   Live Mode → SELECT + GO_LIVE (즉시 송출)
 */

import { subscribe, dispatch, getState } from '../store/AppStore.js'

export function createCueList(containerEl) {
  let lastFingerprint = ''

  render(getState())
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { pages } = state.presentation
    const { selectedPageId, livePageId } = state.presenterState

    const currentFingerprint = pages.map(p => `${p.id}:${p.text}`).join('|')
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
      const firstLine = page.text?.split('\n')[0] || '(빈 페이지)'
      if (!confirm('이 Page를 삭제할까요?\n\n"' + firstLine + '"')) return

      const { presenterState } = getState()
      const wasSelected = presenterState.selectedPageId === page.id
      const wasLive     = presenterState.livePageId     === page.id

      dispatch({ type: 'REMOVE_PAGE', pageId: page.id })

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
      dispatch({ type: 'SELECT_PAGE', pageId: page.id })

      const isLiveMode = document.getElementById('app')
        ?.classList.contains('mode-live')

      if (isLiveMode) {
        dispatch({ type: 'GO_LIVE', pageId: page.id })
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
