/**
 * HistoryManager.test.js
 *
 * Undo/Redo 왕복, computeInverse 케이스, Ignore 정책, 재귀 기록 방지,
 * HISTORY_LIMIT 회귀 테스트 (TODO.md "핵심 계층 회귀 테스트 구축",
 * 기술 부채 감사 TD-3). 실제 CommandBus + AppStore와 통합으로 검증한다 —
 * D-019가 고친 버그(undo의 isApplyingHistory 조기 해제)가 바로 이 세
 * 모듈의 상호작용에서 나왔기 때문에, mock으로 대체하면 그 계열의 회귀를
 * 못 잡는다.
 *
 * 마지막 테스트는 TD-1(기술 부채 감사에서 재현된 잠재 버그 — 연속 undo
 * 시 스택 오염)의 재현 시나리오다. { todo: true }로 "알려진 실패"로
 * 표시해 둔다 — TD-1을 수정하면 이 테스트가 통과하게 되고, 그때 todo
 * 표시를 제거해 상시 회귀 가드로 승격한다(TODO.md 항목 Completion
 * Criteria).
 *
 * 스택(undoStack/redoStack)은 모듈 싱글톤이라 테스트 간 누적된다 —
 * 절대값 대신 getHistorySnapshot()의 증감(delta)으로 검증하고, 상태
 * 준비(fixture)는 History에 기록되지 않도록 dispatch()를 직접 쓴다
 * (Hook은 CommandBus 경유 실행에만 걸리므로).
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { execute, setHistoryHook } from '../command/CommandBus.js'
import { HistoryHook, undo, redo, canUndo, canRedo, getHistorySnapshot } from './HistoryManager.js'
import { getState, dispatch } from '../store/AppStore.js'
import { createTextPage } from '../domain/Page.js'
import { createSection } from '../domain/Section.js'

setHistoryHook(HistoryHook)

function pages() {
  return getState().presentation.pages
}

function pageIndex(id) {
  return pages().findIndex(p => p.id === id)
}

/** History에 기록되지 않는 fixture 정리 — dispatch 직접 호출은 Hook을 타지 않는다 */
function clearAllPagesSilently() {
  for (const page of [...pages()]) {
    dispatch({ type: 'REMOVE_PAGE', pageId: page.id })
  }
}

describe('HistoryManager — 기본 동작', () => {
  test('빈 스택에서 undo/redo는 안전한 no-op이다(false 반환, 상태 무변화)', async () => {
    // 이 파일의 첫 테스트 — 아직 아무 Command도 기록되지 않은 상태
    assert.equal(canUndo(), false)
    assert.equal(canRedo(), false)
    const before = getState()
    assert.equal(await undo(execute), false)
    assert.equal(await redo(execute), false)
    assert.equal(getState(), before)
  })

  test('Ignore 정책 — SELECT/CLEAR/GO_LIVE/SET_APP_MODE는 기록되지 않는다(Step5/Phase B 확정)', async () => {
    const page = createTextPage({ text: 'ignore' })
    dispatch({ type: 'ADD_PAGE', page }) // fixture — 기록 안 됨

    const before = getHistorySnapshot()
    await execute({ type: 'SELECT_PAGE', payload: { pageId: page.id } })
    await execute({ type: 'GO_LIVE', payload: { pageId: page.id } })
    await execute({ type: 'SET_APP_MODE', payload: { mode: 'live' } })
    await execute({ type: 'SET_APP_MODE', payload: { mode: 'edit' } })
    await execute({ type: 'CLEAR_LIVE' })
    await execute({ type: 'CLEAR_SELECTION' })
    assert.deepEqual(getHistorySnapshot(), before)
  })

  test('ADD_PAGE — 기록/undo/redo 왕복이 정확히 원복·재현되고, undo 자신은 재기록되지 않는다', async () => {
    const page = createTextPage({ text: 'roundtrip' })
    const s0 = getHistorySnapshot()

    await execute({ type: 'ADD_PAGE', payload: { page } })
    const s1 = getHistorySnapshot()
    assert.equal(s1.undoCount, s0.undoCount + 1)
    assert.equal(s1.redoCount, 0) // 새 기록은 redo 스택을 비운다

    await undo(execute)
    assert.equal(pageIndex(page.id), -1) // Page 제거됨
    const s2 = getHistorySnapshot()
    // 재귀 방지의 핵심 검증: undo가 주입한 REMOVE_PAGE가 새 entry로
    // 기록됐다면 undoCount가 다시 늘어난다 — 정확히 -1이어야 한다.
    assert.equal(s2.undoCount, s1.undoCount - 1)
    assert.equal(s2.redoCount, 1)

    await redo(execute)
    assert.notEqual(pageIndex(page.id), -1) // Page 복원됨
    const s3 = getHistorySnapshot()
    assert.equal(s3.undoCount, s1.undoCount)
    assert.equal(s3.redoCount, 0)
  })

  test('REMOVE_PAGE undo — 원래 위치(index)로 정확히 복원된다(INSERT_PAGE_AT 경로)', async () => {
    clearAllPagesSilently()
    const [a, b, c] = [createTextPage({ text: 'a' }), createTextPage({ text: 'b' }), createTextPage({ text: 'c' })]
    dispatch({ type: 'ADD_PAGE', page: a })
    dispatch({ type: 'ADD_PAGE', page: b })
    dispatch({ type: 'ADD_PAGE', page: c })

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: b.id } })
    assert.equal(pageIndex(b.id), -1)

    await undo(execute)
    assert.equal(pageIndex(b.id), 1) // 끝이 아니라 원래 자리(가운데)로
    assert.equal(pages()[1].text, 'b')
  })

  test('UPDATE_PAGE undo — 이전 필드 값으로 되돌아간다', async () => {
    const page = createTextPage({ text: 'before', fontSize: 72 })
    dispatch({ type: 'ADD_PAGE', page })

    await execute({ type: 'UPDATE_PAGE', payload: { page: { ...page, text: 'after', fontSize: 90 } } })
    assert.equal(pages().find(p => p.id === page.id).text, 'after')

    await undo(execute)
    const restored = pages().find(p => p.id === page.id)
    assert.equal(restored.text, 'before')
    assert.equal(restored.fontSize, 72)
  })

  test('SET_TITLE undo/redo 왕복', async () => {
    const originalTitle = getState().presentation.title
    await execute({ type: 'SET_TITLE', payload: { title: '새 제목' } })
    assert.equal(getState().presentation.title, '새 제목')

    await undo(execute)
    assert.equal(getState().presentation.title, originalTitle)
    await redo(execute)
    assert.equal(getState().presentation.title, '새 제목')
  })

  test('MOVE_PAGE undo — fromIndex/toIndex를 맞바꿔 원래 순서로 복원한다', async () => {
    clearAllPagesSilently()
    const [a, b] = [createTextPage({ text: 'mv-a' }), createTextPage({ text: 'mv-b' })]
    dispatch({ type: 'ADD_PAGE', page: a })
    dispatch({ type: 'ADD_PAGE', page: b })

    await execute({ type: 'MOVE_PAGE', payload: { fromIndex: 0, toIndex: 1 } })
    assert.equal(pageIndex(a.id), 1)

    await undo(execute)
    assert.equal(pageIndex(a.id), 0)
  })
})

describe('HistoryManager — Section 관련 inverse (D-Editor-4)', () => {
  test('MOVE_PAGE_TO_SECTION undo — 위치와 sectionId를 원자적으로 복원한다(SET_PAGE_POSITION 경로)', async () => {
    clearAllPagesSilently()
    const section = createSection({ title: '이동 대상' })
    dispatch({ type: 'ADD_SECTION', section }) // fixture — ADD_SECTION은 기록 대상 아님
    const [p1, p2] = [createTextPage({ text: 's-1' }), createTextPage({ text: 's-2' })]
    dispatch({ type: 'ADD_PAGE', page: p1 })
    dispatch({ type: 'ADD_PAGE', page: p2 })

    await execute({ type: 'MOVE_PAGE_TO_SECTION', payload: { pageId: p1.id, sectionId: section.id } })
    assert.equal(pages().find(p => p.id === p1.id).sectionId, section.id)

    await undo(execute)
    const restored = pages().find(p => p.id === p1.id)
    assert.equal(restored.sectionId, null) // 소속 복원
    assert.equal(pageIndex(p1.id), 0)      // 위치 복원(원자적)
  })

  test('MOVE_SECTION_GROUP undo — direction만 뒤집으면 원복된다(자기 역연산)', async () => {
    clearAllPagesSilently()
    const secA = createSection({ title: 'A' })
    const secB = createSection({ title: 'B' })
    dispatch({ type: 'ADD_SECTION', section: secA })
    dispatch({ type: 'ADD_SECTION', section: secB })
    const pa = createTextPage({ text: 'in-A', sectionId: secA.id })
    const pb = createTextPage({ text: 'in-B', sectionId: secB.id })
    dispatch({ type: 'ADD_PAGE', page: pa })
    dispatch({ type: 'ADD_PAGE', page: pb })

    await execute({ type: 'MOVE_SECTION_GROUP', payload: { sectionId: secA.id, direction: 'down' } })
    assert.ok(pageIndex(pb.id) < pageIndex(pa.id), 'A 그룹이 B 뒤로 이동해야 한다')

    await undo(execute)
    assert.ok(pageIndex(pa.id) < pageIndex(pb.id), '원래 순서(A 앞)로 복원돼야 한다')
  })
})

describe('HistoryManager — 스택 한도', () => {
  test('HISTORY_LIMIT(100)을 넘으면 가장 오래된 entry부터 버린다(FIFO)', async () => {
    // 이전 테스트들의 누적과 무관하게, 105개를 더 쌓으면 상한 100에 걸린다
    for (let i = 0; i < 105; i++) {
      await execute({ type: 'ADD_PAGE', payload: { page: createTextPage({ text: `bulk-${i}` }) } })
    }
    assert.equal(getHistorySnapshot().undoCount, 100)
  })
})

describe('HistoryManager — TD-1 (기술 부채 감사 2026-07-11에서 재현된 잠재 버그)', () => {
  // 알려진 실패: undo() 완료 전 재호출 시 첫 undo의 finally가
  // isApplyingHistory(단일 boolean)를 조기 해제 → 두 번째 undo의 역방향
  // Command가 afterExecute에서 History에 재기록되어 스택이 오염된다.
  // 수정(플래그 → 카운터 또는 undo/redo 직렬화) 후 이 테스트가 통과하면
  // { todo: true }를 제거해 상시 회귀 가드로 승격할 것.
  test('연속 undo 2회 — 첫 완료를 기다리지 않아도 스택이 오염되지 않아야 한다', { todo: true }, async () => {
    const before = getHistorySnapshot()
    assert.ok(before.undoCount >= 2, '전제: undo 가능한 entry가 2개 이상')

    const u1 = undo(execute)
    const u2 = undo(execute) // 첫 undo의 완료를 기다리지 않는다
    await Promise.all([u1, u2])

    const after = getHistorySnapshot()
    // 정상이라면: undo 2개 소모, redo 2개 적재. 오염되면 두 번째 undo의
    // 역방향 Command가 새 entry로 기록돼 undoCount가 기대보다 크고
    // redoCount가 기대보다 작다(감사 재현값: 기대 0/2 → 실제 1/1 패턴).
    assert.equal(after.undoCount, before.undoCount - 2)
    assert.equal(after.redoCount, before.redoCount + 2)
  })
})
