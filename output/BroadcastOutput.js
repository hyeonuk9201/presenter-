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

import { registerSubscriber, getState } from '../store/AppStore.js'

const CHANNEL_NAME = 'tc-presenter-output'

export function createBroadcastOutput() {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  let lastSentPage = null // 마지막으로 보낸 Page 객체 참조. null = CLEAR 상태
  let lastSentOverlay = null // 마지막으로 보낸 emergencyOverlay 객체 참조. null = 해제 상태 (D-031)

  // (D-031) 긴급 오버레이는 SHOW_PAGE/CLEAR와 별도 메시지 타입으로 보낸다 —
  // SHOW_PAGE에 실으면 lastSentPage 참조 비교 dedupe가 깨진다. Page 송출과
  // 완전히 직교하므로(STANDBY 위에도 렌더, output.html 참조) 서로의 상태를
  // 전혀 참조하지 않는다.
  function sendOverlay({ force = false } = {}) {
    const { emergencyOverlay } = getState().presenterState

    if (!force && emergencyOverlay === lastSentOverlay) return
    lastSentOverlay = emergencyOverlay

    if (!emergencyOverlay) {
      channel.postMessage({ type: 'CLEAR_OVERLAY' })
      return
    }
    channel.postMessage({ type: 'SHOW_OVERLAY', overlay: emergencyOverlay })
  }

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

  // D-017 코드 이행(2026-07-11, 감사 TD-4): storeChanged 대신 Mutation
  // 타겟 통지. 관심 목록의 근거 — SET_LIVE_PAGE는 송출 대상 전환/해제,
  // SET_PAGES는 "같은 Page가 Live인 채로 내용만 바뀌는" 경우(위 헤더의
  // dedupe 배경 참조 — Page 참조 비교가 이 경우를 감지한다). selection/
  // appMode/title/sections는 송출과 무관 — 특히 Live 진행 중 매 선택
  // 변경마다 sendState()가 불리던 것이 이 이행으로 사라진다(OutputArchitecture
  // .md의 "SET_LIVE_PAGE Mutation을 구독한다" 서술과도 이제 일치).
  registerSubscriber({
    id: 'BroadcastOutput',
    interestedMutations: ['SET_PAGES', 'SET_LIVE_PAGE', 'SET_EMERGENCY_OVERLAY'],
    notify: (mutations) => {
      // Page 송출과 Overlay 송출은 직교 — 발생한 Mutation에 해당하는 쪽만 보낸다.
      if (mutations.includes('SET_PAGES') || mutations.includes('SET_LIVE_PAGE')) sendState()
      if (mutations.includes('SET_EMERGENCY_OVERLAY')) sendOverlay()
    },
  })

  channel.onmessage = ({ data }) => {
    if (data.type === 'REQUEST_SYNC') {
      sendState({ force: true })
      // (D-031) Overlay 상태도 반드시 재전송 — Overlay가 켜진 상태에서
      // output 창을 나중에 열어도 긴급 안내가 보여야 한다(9-6의 STANDBY
      // 멈춤 버그와 같은 부류의 재발 방지).
      sendOverlay({ force: true })
    }
  }

  return {
    close: () => channel.close(),
  }
}

export { CHANNEL_NAME }
