/**
 * BroadcastOutput.js
 * Ownership: 송출 채널 전송
 * Change Reason: 출력 채널 방식이 바뀔 때만 수정
 *
 * 규칙:
 *   1. Store를 구독하여 livePageId 변경을 감지한다.
 *   2. BroadcastChannel로 Page 데이터를 전송한다.
 *   3. DOM을 모른다. 렌더링을 모른다.
 *   4. output.html이 어떻게 처리하는지 알지 못한다.
 */

import { subscribe, getState } from '../store/AppStore.js'

const CHANNEL_NAME = 'tc-presenter-output'

export function createBroadcastOutput() {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  let lastLivePageId = null

  subscribe(({ state }) => {
    const { livePageId } = state.presenterState

    // livePageId가 바뀔 때만 전송
    if (livePageId === lastLivePageId) return
    lastLivePageId = livePageId

    if (!livePageId) {
      // 송출 해제
      channel.postMessage({ type: 'CLEAR' })
      return
    }

    const page = state.presentation.pages.find(p => p.id === livePageId) ?? null
    if (!page) return

    // Future: media 조회 후 함께 전송
    // const media = state.media[page.mediaId] ?? null
    channel.postMessage({ type: 'SHOW_PAGE', page })
  })

  return {
    close: () => channel.close(),
  }
}

export { CHANNEL_NAME }
