/**
 * PresenterState.test.js
 *
 * Emergency Overlay(D-031) 도메인 전환 함수 회귀 가드. 기존
 * selectPage/goLive 계열은 AppStore.test.js가 dispatch 경유로 이미
 * 커버하므로, 여기서는 D-031이 새로 추가한 규칙(빈 text = 해제,
 * position 폴백, 해제 no-op)만 도메인 순수 함수 수준에서 고정한다.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createPresenterState, setEmergencyOverlay, clearEmergencyOverlay } from './PresenterState.js'

describe('PresenterState — Emergency Overlay (D-031)', () => {
  test('초기 상태는 비활성(null)이다 — D-004: 앱 시작 시 항상 동일한 초기 상태', () => {
    assert.equal(createPresenterState().emergencyOverlay, null)
  })

  test('setEmergencyOverlay — text/position이 설정되고 원본 state는 불변이다', () => {
    const s0 = createPresenterState()
    const s1 = setEmergencyOverlay(s0, { text: '음향 점검 중', position: 'top' })

    assert.deepEqual(s1.emergencyOverlay, { text: '음향 점검 중', position: 'top' })
    assert.equal(s0.emergencyOverlay, null) // 불변성
    assert.equal(s1.livePageId, s0.livePageId) // 다른 필드 무영향
  })

  test('text 앞뒤 공백은 잘라서 저장한다', () => {
    const s = setEmergencyOverlay(createPresenterState(), { text: '  잠시 대기  ', position: 'middle' })
    assert.equal(s.emergencyOverlay.text, '잠시 대기')
  })

  test('빈/공백 text는 해제로 처리한다 — 빈 오버레이가 송출 화면을 가리는 사고 방지', () => {
    const active = setEmergencyOverlay(createPresenterState(), { text: '점검', position: 'top' })
    assert.equal(setEmergencyOverlay(active, { text: '', position: 'top' }).emergencyOverlay, null)
    assert.equal(setEmergencyOverlay(active, { text: '   ', position: 'top' }).emergencyOverlay, null)
    assert.equal(setEmergencyOverlay(active, {}).emergencyOverlay, null)
  })

  test('허용값 밖 position은 bottom으로 폴백한다 — 잘못된 값 때문에 긴급 송출이 실패하면 안 됨', () => {
    const s = setEmergencyOverlay(createPresenterState(), { text: '안내', position: 'center' })
    assert.equal(s.emergencyOverlay.position, 'bottom')
  })

  test('clearEmergencyOverlay — 해제되고, 이미 비활성이면 같은 참조를 반환한다(no-op)', () => {
    const active = setEmergencyOverlay(createPresenterState(), { text: '안내', position: 'bottom' })
    const cleared = clearEmergencyOverlay(active)
    assert.equal(cleared.emergencyOverlay, null)

    // 이미 null이면 새 객체를 만들지 않는다 — dispatch의 "변경 없음" 판정이 기대는 성질
    assert.equal(clearEmergencyOverlay(cleared), cleared)
  })
})
