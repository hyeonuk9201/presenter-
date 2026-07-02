/**
 * BroadcastOutput.js
 * Ownership: 송출 채널 전송
 * Change Reason: 출력 채널 방식이 바뀔 때만 수정
 *
 * 규칙:
 *   1. Store를 구독하여 Live Page의 변경을 감지한다.
 *   2. BroadcastChannel로 Page 데이터를 전송한다.
 *   3. DOM을 모른다. 렌더링을 모른다.
 *   4. output.html이 어떻게 처리하는지 알지 못한다.
 *
 * REQUEST_SYNC (2026-07-02, 실사용 발견):
 *   BroadcastChannel은 발신 시점에 존재하는 리스너에게만 전달된다 — Live를
 *   먼저 켠 뒤 Output 창을 나중에 열면, 이미 지나간 SHOW_PAGE를 못 받아
 *   Output이 STANDBY에 계속 멈춰있는 문제가 있었다(과거 9-4로 보고됐다가
 *   "재현 안 됨"으로 종결된 것과 동일 원인으로 추정). output.html이 로드
 *   시 REQUEST_SYNC를 보내면, 이 모듈이 강제로 현재 상태를 즉시 재전송한다.
 *
 * Page 참조 비교로 dedupe (2026-07-02, 실사용 발견 — 9-7 직후):
 *   최초 구현은 livePageId "값"만 비교했다 — 같은 Page가 계속 Live인 채로
 *   그 내용만 바뀌는 경우(예: 영상 위 텍스트 오버레이를 Live 중에 추가)
 *   livePageId는 그대로라 전송이 아예 생략되는 버그가 있었다. dispatch()의
 *   UPDATE_PAGE는 domain/Presentation.js의 replacePage()를 거치며 항상 새
 *   Page 객체를 만들므로, "마지막으로 보낸 Page 객체 참조"와 비교하면
 *   Page 전환과 내용 변경 둘 다 하나의 조건으로 감지된다.
 */

import { subscribe, getState } from '../store/AppStore.js'

const CHANNEL_NAME = 'tc-presenter-output'

export function createBroadcastOutput() {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  let lastSentPage = null // 마지막으로 보낸 Page 객체 참조. null = CLEAR 상태

  function sendState({ force = false } = {}) {
    const { livePageId } = getState().presenterState

    if (!livePageId) {
      if (!force && lastSentPage === null) return
      lastSentPage = null
      channel.postMessage({ type: 'CLEAR' })
      return
    }

    const page = getState().presentation.pages.find(p => p.id === livePageId) ?? null
    if (!page) return

    if (!force && page === lastSentPage) return
    lastSentPage = page

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
