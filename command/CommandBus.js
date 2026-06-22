/**
 * CommandBus.js
 * Ownership: Editor → AppStore 진입 경로의 단일 진입점
 * Change Reason: Command 실행 경로가 바뀔 때만 수정
 *
 * 현재 단계(Step1, Frozen v1.0 - Phase A):
 *   - 얇은 Wrapper만 제공한다.
 *   - Command = { type, payload }
 *   - execute()는 payload를 펼쳐서 AppStore.dispatch()에 그대로 전달한다.
 *   - AppStore의 reducer는 수정하지 않는다(기존 { type, ...필드 } 형태를 그대로 기대함).
 *
 * Step4 (D-018, History Hook — 단일 슬롯, 범용 Registry 아님):
 *   - setHistoryHook(hook)으로 HistoryManager 전용 Hook 1개만 등록 가능하다.
 *   - hook은 { afterExecute(command, prevState) } 형태이다.
 *   - beforeExecute는 만들지 않는다. nextState도 전달하지 않는다 — 이번 구현
 *     범위에서 실제 사용처가 없다 (YAGNI, history/HistoryManager.js 참조).
 *   - execute()는 여전히 단일 진입점이다. Hook은 dispatch 이후 "관찰"만
 *     하며, Command 실행 흐름을 가로채거나 변경하지 않는다.
 *   - 의도적으로 만들지 않는 것: Plugin/Logging/Analytics/DevTools를 위한
 *     범용 Hook Registry. 이 슬롯은 HistoryManager만 등록한다고 명시한다 —
 *     다른 목적의 Hook이 필요해지면 별도 설계/승인을 거친다.
 *
 * CommandBus는 Domain 구조를 알지 않는다.
 * CommandBus는 Command 실행만 수행한다.
 */

import { dispatch, getState } from '../store/AppStore.js'

/**
 * History 전용 Hook 슬롯 (단일 객체, 배열 아님).
 * setHistoryHook()으로만 교체 가능하며, 여러 Hook을 동시에 등록하는
 * 범용 레지스트리가 아니다. HistoryManager 외의 용도로 사용하지 않는다.
 */
let historyHook = null

/**
 * History Hook을 등록한다. HistoryManager만 등록한다고 간주한다.
 *
 * @param {{ afterExecute: (command: object, prevState: object) => void } | null} hook
 */
export function setHistoryHook(hook) {
  historyHook = hook
}

/**
 * Command를 AppStore Mutation으로 전달한다.
 *
 * @param {object} command - { type, payload }
 */
export function execute(command) {
  if (!command || typeof command.type !== 'string') {
    console.warn('[CommandBus] 유효하지 않은 Command:', command)
    return
  }

  const { type, payload = {} } = command
  const action = { type, ...payload }
  const prevState = getState()

  // AppStore.reduce()는 { type, ...필드 } 형태를 기대한다.
  // reducer를 수정하지 않기 위해 여기서 payload를 펼쳐서 전달한다.
  dispatch(action)

  // (D-018) History Hook은 dispatch 이후에만 관찰한다 — 가로채지 않는다.
  historyHook?.afterExecute?.(action, prevState)
}
