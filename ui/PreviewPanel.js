/**
 * PreviewPanel.js
 * Ownership: 슬라이드 미리보기 컨테이너 관리
 * Change Reason: 미리보기 UI가 바뀔 때만 수정
 *
 * 규칙:
 *   1. Store를 구독하여 livePageId 변경을 감지한다.
 *   2. PageView를 호출해서 DOM 요소를 받는다.
 *   3. 받은 요소를 자신의 컨테이너에 붙인다.
 *   4. PageView가 어떻게 만드는지 알지 못한다.
 */

import { subscribe, getState, getLivePage } from '../store/AppStore.js'
import { createPageView } from '../view/PageView.js'

export function createPreviewPanel(containerEl) {
  // ── 초기 렌더링 ──────────────────────────
  render(getState())

  // ── Store 구독 ───────────────────────────
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { livePageId } = state.presenterState

    // livePageId가 없으면 대기 화면
    if (!livePageId) {
      showBlank()
      return
    }

    const page = state.presentation.pages.find(p => p.id === livePageId) ?? null

    if (!page) {
      showBlank()
      return
    }

    // Future: media 조회
    // const media = state.media[page.mediaId] ?? null
    const media = null

    containerEl.innerHTML = ''
    containerEl.appendChild(createPageView(page, media))
  }

  function showBlank() {
    containerEl.innerHTML = ''
    const blank = document.createElement('div')
    blank.className = 'preview-blank'
    blank.textContent = '송출 대기 중'
    containerEl.appendChild(blank)
  }
}
