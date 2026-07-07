/**
 * HistoryManager.js
 * Ownership: User Intent 단위의 Undo/Redo
 * Change Reason: Undo/Redo 단위 또는 기록 정책이 바뀔 때만 수정
 *
 * D-018 핵심 원칙:
 *   - HistoryManager는 일반 Command 흐름(Editor → CommandBus → AppStore)의
 *     필수 경유 단계가 아니다. CommandBus의 Hook(afterExecute)으로 등록되어
 *     관찰만 한다.
 *   - HistoryManager는 Domain 구조를 알지 않는다. Payload 기반으로만 동작한다.
 *   - AppStore는 HistoryManager의 존재를 알지 않는다.
 *   - Undo/Redo는 HistoryManager → CommandBus → AppStore 경로로 역방향
 *     Command를 주입한다. 이때 다시 Hook이 호출되어도 History에 재기록되지
 *     않아야 한다 (재귀 기록 방지 — 아래 isApplyingHistory 참조).
 *
 * Hook 시그니처 (CommandBus와 합의된 최소 형태):
 *   historyHook.afterExecute(command, prevState)
 *   - beforeExecute는 만들지 않는다 — 이번 구현 범위의 모든 inverse 계산이
 *     prevState만으로 충분하며, beforeExecute를 쓰는 곳이 없다 (YAGNI).
 *   - nextState도 전달하지 않는다 — 동일한 이유로 실제 사용처가 없다.
 *   - 다만 메서드 이름은 record()가 아니라 afterExecute로 노출한다("CommandBus를
 *     관찰한다"는 Hook 아키텍처 의미를 유지하기 위함). 필요해지면 nextState
 *     인자를 추가하는 확장은 쉽지만, 전용 함수로 박아버리면 Hook 개념을
 *     되살려야 하므로 이 형태를 유지한다.
 *
 * 이번 단계 범위 (Step5 완료 반영):
 *   - undo() / redo() 함수를 제공하며, index.html에서 키보드(Ctrl+Z /
 *     Ctrl+Shift+Z)와 버튼에 연결되어 있다(Step5).
 *   - Composite Command / transactionId 묶음은 범위 밖이다 (현재 Composite
 *     Command가 코드에 존재하지 않으므로, Action 1개 = History Entry 1개로 간다).
 *
 * Recording Policy (Step5 실사용 후 확정):
 *   - SELECT_PAGE / CLEAR_SELECTION / GO_LIVE / CLEAR_LIVE는 Ignore 처리한다
 *     (computeInverse에서 null 반환). 선택/송출 변경은 일시적 포커스 상태일
 *     뿐 데이터가 사라지지 않으며, "삭제 Undo 1번"이 그 전에 쌓인 선택/송출
 *     변경부터 풀리는 체감이 어색하다는 실사용 확인으로 결정했다.
 *
 * History Entry 구조 (HistoryArchitecture.md 기준, 이번 단계 최소화):
 *   { id, label, undoCommand, redoCommand, timestamp }
 *   - undoCommand / redoCommand는 CommandBus.execute()에 그대로 전달 가능한
 *     { type, payload } 형태이다 (HistoryArchitecture.md의 "payload" 개념을
 *     이번 단계에서는 "되돌릴 수 있는 완성된 Command"로 구체화했다 — Command
 *     Registry가 없는 현재 단계에서는 Payload만 저장해도 재실행 시 다시
 *     Command로 변환할 registry가 없기 때문이다. CommandRegistry 도입 시
 *     undoCommand/redoCommand를 다시 순수 payload로 정리할 수 있다).
 *
 * undo()/redo() async 전환 (Step6, 2026-06-27 — 재귀 기록 방지 타이밍 버그 수정):
 *   - 문제: CommandBus.execute()가 media 있는 Command에 대해 IndexedDB
 *     조회를 await하면서 async가 됐다. 기존 undo()/redo()는 sync 함수라
 *     commandBusExecute(entry.undoCommand)가 반환한 Promise를 기다리지
 *     않고 finally에서 곧바로 isApplyingHistory = false로 되돌렸다.
 *     그러면 실제 dispatch()(및 afterExecute 호출)는 그보다 한참 뒤,
 *     이미 isApplyingHistory가 풀린 상태에서 일어나 재귀 기록 방지가
 *     무력화될 수 있었다(fake-indexeddb로 재현 확인 — 현재는 INSERT_PAGE_AT이
 *     computeInverse에 케이스가 없어 우연히 안전했을 뿐, computeInverse에
 *     INSERT_PAGE_AT 케이스가 추가되는 순간 즉시 터지는 잠재 버그였다).
 *   - 해결: undo()/redo()를 async function으로 바꾸고
 *     await commandBusExecute(entry.undoCommand)로 실제 replay(=dispatch
 *     + afterExecute 호출)가 완전히 끝난 뒤에야 isApplyingHistory를
 *     해제한다.
 *   - 호출부(index.html의 Ctrl+Z 핸들러 등)는 undo(CommandBus.execute)를
 *     호출하고 끝내는 fire-and-forget 패턴이었다면 그대로 동작한다(반환된
 *     Promise를 안 받아도 무방) — 다만 호출 직후 동기적으로 canUndo()를
 *     확인하는 코드가 있다면 그 시점의 스택 상태는 이미 pop된 뒤이므로
 *     영향 없음(스택 변경 자체는 await 이전에 동기로 일어난다, 아래 참조).
 */

// ─────────────────────────────────────────
// Undo/Redo Stack
// ─────────────────────────────────────────

const undoStack = []
const redoStack = []

const HISTORY_LIMIT = 100

// ─────────────────────────────────────────
// 재귀 기록 방지
// ─────────────────────────────────────────

/**
 * undo()/redo()가 CommandBus.execute()를 통해 역방향 Command를 실행할 때,
 * 그 실행이 다시 afterExecute Hook을 통해 History에 기록되지 않도록 막는 플래그.
 * 이 플래그가 없으면 undo → 기록 → undo → 기록 형태로 스택이 오염된다.
 */
let isApplyingHistory = false

export function isHistoryApplying() {
  return isApplyingHistory
}

// ─────────────────────────────────────────
// Action → Inverse Command 계산
// ─────────────────────────────────────────

/**
 * 발생한 action과 그 직전(prevState) state를 기반으로
 * undo용 Command와 redo용 Command를 계산한다.
 *
 * Domain 구조를 직접 해석하지 않고, prevState에 남아있는 "이전 값"을
 * 그대로 복원 Command의 payload로 사용한다 (Domain Agnostic 원칙 유지).
 *
 * 반환값이 null이면 해당 action은 기록 대상이 아니다 (예: 알 수 없는 타입).
 */
function computeInverse(action, prevState) {
  switch (action.type) {
    case 'ADD_PAGE':
      return {
        undoCommand: { type: 'REMOVE_PAGE', payload: { pageId: action.page.id } },
        redoCommand: { type: 'ADD_PAGE', payload: { page: action.page } },
        label: 'Page 추가',
      }

    case 'REMOVE_PAGE': {
      const index = prevState.presentation.pages.findIndex(p => p.id === action.pageId)
      const removedPage = prevState.presentation.pages[index]
      if (index === -1 || !removedPage) return null // 존재하지 않던 page → 기록 불필요

      return {
        // 정확한 원래 위치(index)로 복원한다 (addPage+movePage 2단계 금지, 합의된 설계).
        undoCommand: { type: 'INSERT_PAGE_AT', payload: { page: removedPage, index } },
        redoCommand: { type: 'REMOVE_PAGE', payload: { pageId: action.pageId } },
        label: 'Page 삭제',
      }
    }

    case 'UPDATE_PAGE': {
      const before = prevState.presentation.pages.find(p => p.id === action.page.id)
      if (!before) return null

      return {
        undoCommand: { type: 'UPDATE_PAGE', payload: { page: before } },
        redoCommand: { type: 'UPDATE_PAGE', payload: { page: action.page } },
        label: 'Page 수정',
      }
    }

    case 'MOVE_PAGE':
      return {
        undoCommand: { type: 'MOVE_PAGE', payload: { fromIndex: action.toIndex, toIndex: action.fromIndex } },
        redoCommand: { type: 'MOVE_PAGE', payload: { fromIndex: action.fromIndex, toIndex: action.toIndex } },
        label: 'Page 순서 변경',
      }

    // D-Editor-4(2026-07-06): "위치+소속을 함께 되돌리는 경로가 필요해진다"는
    // FutureEditor.md D-Editor-4의 예고가 실제로 필요해진 지점 — MOVE_PAGE의
    // undo(fromIndex/toIndex 맞바꿈)만으로는 부족하다(sectionId까지 함께
    // 바뀌었으므로). domain/Presentation.js의 setPagePositionAndSection()
    // 전용 함수로 위치+sectionId를 원자적으로 복원한다.
    case 'MOVE_PAGE_TO_SECTION': {
      const index = prevState.presentation.pages.findIndex(p => p.id === action.pageId)
      const before = prevState.presentation.pages[index]
      if (index === -1 || !before) return null

      return {
        undoCommand: {
          type: 'SET_PAGE_POSITION',
          payload: { pageId: action.pageId, index, sectionId: before.sectionId },
        },
        redoCommand: {
          type: 'MOVE_PAGE_TO_SECTION',
          payload: { pageId: action.pageId, sectionId: action.sectionId },
        },
        label: 'Page를 다른 Section으로 이동',
      }
    }

    case 'SET_TITLE': {
      const before = prevState.presentation.title
      return {
        undoCommand: { type: 'SET_TITLE', payload: { title: before } },
        redoCommand: { type: 'SET_TITLE', payload: { title: action.title } },
        label: '제목 변경',
      }
    }

    // 2026-07-06: Section 전체(연속된 Page 블록) 순서 이동. 인접 그룹끼리의
    // "맞바꾸기"는 자기 자신의 역연산이다 — 방향만 반대로 다시 실행하면
    // 원래대로 돌아온다(A/B를 맞바꾼 뒤 같은 두 이웃을 다시 맞바꾸면 A/B로
    // 복귀). prevState를 참조할 필요 없이 direction만 뒤집으면 된다.
    //
    // ADD_SECTION/REMOVE_SECTION/UPDATE_SECTION은 아직 History 기록 대상이
    // 아니다(default:로 떨어져 null 반환됨) — 의도적 범위 제한
    // (FutureEditor.md D-Editor-4 "아직 열려있는 것" 참조). MOVE_SECTION_GROUP만
    // 먼저 지원하는 이유: Page 위치까지 실제로 바꾸는 유일한 Section
    // 조작이라 실수로 되돌리기 어려운 결과(Flow 순서 변경)를 만들기
    // 때문이다.
    case 'MOVE_SECTION_GROUP': {
      const inverseDirection = action.direction === 'up' ? 'down' : 'up'
      return {
        undoCommand: { type: 'MOVE_SECTION_GROUP', payload: { sectionId: action.sectionId, direction: inverseDirection } },
        redoCommand: { type: 'MOVE_SECTION_GROUP', payload: { sectionId: action.sectionId, direction: action.direction } },
        label: 'Section 순서 변경',
      }
    }

    // ── Selection / Live 계열: Ignore 정책 (Step5 실사용 후 확정) ──
    // HistoryArchitecture.md "Recording Policy / Ignore"와 동일한 결로 분류한다.
    // 결정 배경: Page 추가/삭제/수정은 "내용"이 바뀌는 작업이라 Undo 대상이
    // 맞지만, Select/GoLive는 "지금 어디를 보고 있는가/무엇을 송출 중인가"의
    // 일시적 포커스 상태일 뿐 데이터가 사라지지 않는다. 사용자가 Undo를
    // 누르는 의도는 거의 항상 "방금 한 편집을 취소"이며, "방금 클릭한 곡을
    // 다시 안 보이게"가 아니다 — 삭제 Undo 1번 눌렀는데 그 전에 쌓인 선택/
    // 송출 변경 entry부터 풀리는 체감이 어색하다는 실사용 피드백으로 확정.
    //
    // 아래는 기록 대상이었을 때의 inverse 계산 로직이다. 정책을 다시 뒤집어야
    // 할 경우(예: Select/GoLive도 Undo가 필요하다는 요구가 생기면) 이 블록을
    // 복원하고 return null을 제거하면 된다 — 계산 로직 자체는 유지해 둔다.
    case 'SELECT_PAGE':
    case 'CLEAR_SELECTION':
    case 'GO_LIVE':
    case 'CLEAR_LIVE':
    case 'SET_APP_MODE': { // (TODO-001, Phase B) 모드 전환도 동일하게 Ignore — 데이터 변경 없음
      return null

      // ── 복원용 원본 로직 (참고용, 현재 비활성) ──
      // case 'SELECT_PAGE': {
      //   const before = prevState.presenterState.selectedPageId
      //   return {
      //     undoCommand: before
      //       ? { type: 'SELECT_PAGE', payload: { pageId: before } }
      //       : { type: 'CLEAR_SELECTION' },
      //     redoCommand: { type: 'SELECT_PAGE', payload: { pageId: action.pageId } },
      //     label: 'Page 선택',
      //   }
      // }
      // case 'CLEAR_SELECTION': {
      //   const before = prevState.presenterState.selectedPageId
      //   if (!before) return null
      //   return {
      //     undoCommand: { type: 'SELECT_PAGE', payload: { pageId: before } },
      //     redoCommand: { type: 'CLEAR_SELECTION' },
      //     label: '선택 해제',
      //   }
      // }
      // case 'GO_LIVE': {
      //   const before = prevState.presenterState.livePageId
      //   return {
      //     undoCommand: before
      //       ? { type: 'GO_LIVE', payload: { pageId: before } }
      //       : { type: 'CLEAR_LIVE' },
      //     redoCommand: { type: 'GO_LIVE', payload: { pageId: action.pageId } },
      //     label: '송출 시작',
      //   }
      // }
      // case 'CLEAR_LIVE': {
      //   const before = prevState.presenterState.livePageId
      //   if (!before) return null
      //   return {
      //     undoCommand: { type: 'GO_LIVE', payload: { pageId: before } },
      //     redoCommand: { type: 'CLEAR_LIVE' },
      //     label: '송출 해제',
      //   }
      // }
    }

    default:
      return null // 알 수 없는 action은 기록하지 않는다
  }
}

// ─────────────────────────────────────────
// 기록 (Hook에서 호출될 함수 — 이번 단계에서는 아직 연결 안 됨)
// ─────────────────────────────────────────

/**
 * action 실행 결과를 History Entry로 기록한다.
 * CommandBus의 afterExecute Hook에서 호출되도록 이름과 시그니처를 맞췄다.
 * isApplyingHistory가 true인 동안에는 기록하지 않는다 (재귀 기록 방지).
 *
 * @returns {boolean} 실제로 기록했는지 여부
 */
export function afterExecute(action, prevState) {
  if (isApplyingHistory) return false

  const inverse = computeInverse(action, prevState)
  if (!inverse) return false

  const entry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: inverse.label,
    undoCommand: inverse.undoCommand,
    redoCommand: inverse.redoCommand,
    timestamp: Date.now(),
  }

  undoStack.push(entry)
  if (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift() // FIFO
  }

  // 새 작업이 기록되면 Redo Stack은 비운다 (표준 Undo/Redo 동작).
  redoStack.length = 0

  return true
}

// ─────────────────────────────────────────
// Undo / Redo (CommandBus.execute를 통해 역방향 Command 주입)
// ─────────────────────────────────────────

/**
 * commandBusExecute: CommandBus.execute 함수를 주입받는다.
 * HistoryManager가 CommandBus를 직접 import하지 않고 주입받는 이유는
 * 순환 의존(CommandBus → Hook 등록 시점에 HistoryManager, HistoryManager → CommandBus)을
 * 피하기 위함이다. 실제 연결(Step5)에서 CommandBus.execute를 넘겨준다.
 *
 * async로 전환(Step6) — commandBusExecute가 반환하는 Promise가 실제
 * dispatch + afterExecute 호출까지 끝난 뒤에 resolve되므로, 그걸 await해야
 * isApplyingHistory를 안전한 시점에 해제할 수 있다 (파일 헤더 참조).
 *
 * @returns {Promise<boolean>}
 */
export async function undo(commandBusExecute) {
  const entry = undoStack.pop()
  if (!entry) return false

  isApplyingHistory = true
  try {
    await commandBusExecute(entry.undoCommand)
  } finally {
    isApplyingHistory = false
  }

  redoStack.push(entry)
  return true
}

/**
 * @returns {Promise<boolean>}
 */
export async function redo(commandBusExecute) {
  const entry = redoStack.pop()
  if (!entry) return false

  isApplyingHistory = true
  try {
    await commandBusExecute(entry.redoCommand)
  } finally {
    isApplyingHistory = false
  }

  undoStack.push(entry)
  return true
}

// ─────────────────────────────────────────
// 조회 (테스트/디버그용)
// ─────────────────────────────────────────

export function canUndo() {
  return undoStack.length > 0
}

export function canRedo() {
  return redoStack.length > 0
}

export function getHistorySnapshot() {
  return {
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  }
}

// ─────────────────────────────────────────
// CommandBus 연결용 Hook 객체
// ─────────────────────────────────────────

/**
 * CommandBus.setHistoryHook(HistoryHook) 형태로 그대로 전달한다 (Step5).
 * Hook 객체는 afterExecute 메서드 하나만 가진다 (합의된 최소 시그니처).
 */
export const HistoryHook = {
  afterExecute,
}
