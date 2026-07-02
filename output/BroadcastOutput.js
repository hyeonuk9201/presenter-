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
 *
 * REQUEST_SYNC (2026-07-02, 실사용 발견):
 *   BroadcastChannel은 발신 시점에 존재하는 리스너에게만 전달된다 — Live를
 *   먼저 켠 뒤 Output 창을 나중에 열면, 이미 지나간 SHOW_PAGE를 못 받아
 *   Output이 STANDBY에 계속 멈춰있는 문제가 있었다(과거 9-4로 보고됐다가
 *   "재현 안 됨"으로 종결된 것과 동일 원인으로 추정). output.html이 로드
 *   시 REQUEST_SYNC를 보내면, 이 모듈이 livePageId 변경 여부와 무관하게
 *   현재 상태를 즉시 재전송한다.
 */

import { subscribe, getState } from '../store/AppStore.js'

const CHANNEL_NAME = 'tc-presenter-output'

export function createBroadcastOutput() {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  let lastLivePageId = null

  function sendState({ force = false } = {}) {
    const { livePageId } = getState().presenterState

    if (!force && livePageId === lastLivePageId) return
    lastLivePageId = livePageId

    if (!livePageId) {
      channel.postMessage({ type: 'CLEAR' })
      return
    }

    const page = getState().presentation.pages.find(p => p.id === livePageId) ?? null
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
  }

  subscribe(() => sendState())

  channel.onmessage = ({ data }) => {
    if (data.type === 'REQUEST_SYNC') {
      sendState({ force: true })
    }
  }

  return {
    close: () => channel.close(),
  }
}

export { CHANNEL_NAME }
