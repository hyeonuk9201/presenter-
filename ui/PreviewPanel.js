/**
 * PreviewPanel.js
 * Ownership: 슬라이드 미리보기 컨테이너 관리
 * Change Reason: 미리보기 UI가 바뀔 때만 수정
 *
 * 규칙:
 *   1. Store를 구독하여 변경을 감지한다.
 *   2. PageView를 호출해서 DOM 요소를 받는다.
 *   3. 받은 요소를 자신의 컨테이너에 붙인다.
 *   4. PageView가 어떻게 만드는지 알지 못한다.
 *
 * 렌더 대상 분기 (appMode 기반, output.html과는 무관한 별도 구독):
 *   edit 모드 → selectedPage 렌더
 *   live 모드 → livePage 렌더
 *   output.html(BroadcastOutput.js)은 항상 livePageId만 보는 완전히 분리된
 *   구독이라, 이 파일의 변경은 Output 창 동작에 전혀 영향을 주지 않는다.
 */

import { subscribe, getState } from '../store/AppStore.js'
import { createPageView } from '../view/PageView.js'

export function createPreviewPanel(containerEl) {
  // ── 초기 렌더링 ──────────────────────────
  render(getState())

  // ── Store 구독 ───────────────────────────
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { appMode, selectedPageId, livePageId } = state.presenterState
    const targetPageId = appMode === 'live' ? livePageId : selectedPageId

    // 대상 Page가 없으면 대기 화면
    if (!targetPageId) {
      showBlank()
      return
    }

    const page = state.presentation.pages.find(p => p.id === targetPageId) ?? null

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
