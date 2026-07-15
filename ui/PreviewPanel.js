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

import { registerSubscriber, getState } from '../store/AppStore.js'
import { createPageView } from '../view/PageView.js'
import { peek as peekMediaCache } from '../media/MediaRuntimeCache.js'

export function createPreviewPanel(containerEl) {
  // ── 초기 렌더링 ──────────────────────────
  render(getState())

  // ── Store 구독 ───────────────────────────
  // D-017 코드 이행(2026-07-11, 감사 TD-4): storeChanged 대신 Mutation
  // 타겟 통지. 관심 목록의 근거 — 렌더 대상 결정에 appMode(SET_APP_MODE)와
  // selectedPageId/livePageId(SET_SELECTION/SET_LIVE_PAGE)가 쓰이고, 대상
  // Page의 내용 변경(SET_PAGES — 편집 중 실시간 미리보기)도 다시 그려야
  // 한다. SET_SECTIONS/SET_TITLE은 Page 렌더링과 무관. 매 통지마다 DOM을
  // 통째로 교체하는 구조 자체는 그대로다(9-35가 Transition을 못 넣은
  // 원인) — 이번 이행은 "불필요한 Mutation에 반응하지 않게" 하는 것까지고,
  // 증분 렌더링은 별도 작업.
  registerSubscriber({
    id: 'PreviewPanel',
    interestedMutations: ['SET_PAGES', 'SET_SELECTION', 'SET_LIVE_PAGE', 'SET_APP_MODE'],
    notify: (_mutations, state) => render(state),
  })

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

    // Step6(2026-06-27): MediaRuntimeCache에서 동기 조회. command/
    // CommandBus.js의 preloadMedia()가 ADD_PAGE/UPDATE_PAGE/INSERT_PAGE_AT
    // 처리 중에 이미 캐시를 채워둔 상태라고 가정한다 — 이 함수는 절대
    // IndexedDB를 직접 읽지 않는다(View는 동기 유지 원칙).
    // page.mediaId가 없는 텍스트 Page는 peek(undefined) → null이라
    // 기존 동작과 동일하다.
    //
    // 새로고침 등으로 복원된 Page(localStorage → AppStore 부트스트랩,
    // CommandBus를 거치지 않음)는 index.html이 부팅 시 1회
    // bootstrapMediaCache()를 호출해 미리 캐시를 채워둔다 — 그렇지
    // 않으면 여기서 캐시 미스가 난다(실사용 중 발견, 2026-06-27).
    const media = peekMediaCache(page.mediaId)
    const backgroundMedia = page.backgroundMediaId ? peekMediaCache(page.backgroundMediaId) : null

    containerEl.innerHTML = ''
    containerEl.appendChild(createPageView(page, media, backgroundMedia))
  }

  function showBlank() {
    containerEl.innerHTML = ''
    const blank = document.createElement('div')
    blank.className = 'preview-blank'
    blank.textContent = '송출 대기 중'
    containerEl.appendChild(blank)
  }
}
