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

    // Step6(2026-06-27): media 자체는 전송하지 않는다. page.mediaId가
    // 이미 page 객체 안에 포함되어 있으므로(domain/Page.js의
    // createImagePage/createVideoPage), mediaId만 실려서 그대로
    // 전달된다. output.html이 자신의 IndexedDB에서 직접 resolve한다
    // (메인 탭에서 만든 blob URL은 다른 탭에서 못 쓰기 때문 — 탭 경계
    // 문제, media/MediaRuntimeCache.js 헤더 참조). 이 파일은 그대로
    // 무수정으로 유지된다 — Page를 통째로 전송하는 기존 구조가 mediaId
    // 추가에도 자동으로 대응한다.
    channel.postMessage({ type: 'SHOW_PAGE', page })
  })

  return {
    close: () => channel.close(),
  }
}

export { CHANNEL_NAME }
