/**
 * PersistenceSubscriber.test.js
 *
 * 저장 트리거 회귀 가드 (TODO.md "저장 트리거 정리 — 감사 TD-5").
 *
 * 고정하는 것:
 *   1. 선택/Live 전환(SET_SELECTION/SET_LIVE_PAGE)만으로는 저장이 발생하지
 *      않는다 — 저장 페이로드에 selection/live가 애초에 없으므로(D-004)
 *      직렬화+localStorage 쓰기가 돌 이유가 없다.
 *   2. 내용 변경(SET_PAGES 등) 시 저장은 정상 동작한다.
 *   3. REMOVE_PAGE처럼 SET_PAGES + SET_SELECTION + SET_LIVE_PAGE가 동시에
 *      발생하는 액션은 저장이 정확히 1회 실행된다 (동작 손실 없음 +
 *      mutation 개수만큼 중복 저장하지 않음 — 파일 주석의 "dispatch당
 *      저장 호출 횟수: 1회" 계약).
 *
 * AppStore는 모듈 싱글톤이라(AppStore.test.js 주석 참조) 이 파일의 테스트는
 * 자신이 만든 Page id로만 검증하고, 저장 횟수는 테스트마다 카운터를 리셋해
 * 서로 간섭하지 않게 한다. localStorage mock은 모듈 로드 전에 깔아둔다 —
 * AppStore가 부트스트랩 시점에 storageLoad를 호출하기 때문이다.
 */
import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
    _raw: store,
  }
}

const localStorageMock = createLocalStorageMock()
globalThis.localStorage = localStorageMock

const { dispatch, getState, registerSubscriber, unregisterSubscriber, STORAGE_KEY } =
  await import('../store/AppStore.js')
const { PersistenceSubscriber } = await import('./PersistenceSubscriber.js')
const { createTextPage } = await import('../domain/Page.js')

// STORAGE_KEY 쓰기 횟수 추적 — save() 1회 = setItem 1회
let saveCount = 0
const originalSetItem = localStorageMock.setItem
localStorageMock.setItem = (key, value) => {
  if (key === STORAGE_KEY) saveCount++
  originalSetItem(key, value)
}

registerSubscriber(PersistenceSubscriber)

describe('PersistenceSubscriber — 저장 트리거 (감사 TD-5)', () => {
  beforeEach(() => {
    saveCount = 0
  })

  test('interestedMutations에 SET_SELECTION/SET_LIVE_PAGE가 없다 (정적 가드)', () => {
    assert.deepEqual(
      [...PersistenceSubscriber.interestedMutations].sort(),
      ['SET_PAGES', 'SET_SECTIONS', 'SET_TITLE']
    )
  })

  test('내용 변경(ADD_PAGE → SET_PAGES) 시 저장이 실행된다', () => {
    const page = createTextPage({ text: 'td5-save' })
    dispatch({ type: 'ADD_PAGE', page })

    assert.equal(saveCount, 1)
    const saved = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.ok(saved.pages.some(p => p.id === page.id))
  })

  test('선택 전환(SELECT_PAGE)만으로는 저장이 발생하지 않는다', () => {
    const page = createTextPage({ text: 'td5-select' })
    dispatch({ type: 'ADD_PAGE', page })
    saveCount = 0

    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    assert.equal(getState().presenterState.selectedPageId, page.id)
    assert.equal(saveCount, 0)
  })

  test('Live 전환(GO_LIVE)만으로는 저장이 발생하지 않는다', () => {
    const page = createTextPage({ text: 'td5-live' })
    dispatch({ type: 'ADD_PAGE', page })
    saveCount = 0

    dispatch({ type: 'GO_LIVE', pageId: page.id })
    assert.equal(getState().presenterState.livePageId, page.id)
    assert.equal(saveCount, 0)
  })

  test('REMOVE_PAGE(SET_PAGES+SET_SELECTION+SET_LIVE_PAGE 동시 발생) — 저장은 정확히 1회', () => {
    const page = createTextPage({ text: 'td5-remove' })
    dispatch({ type: 'ADD_PAGE', page })
    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    dispatch({ type: 'GO_LIVE', pageId: page.id })
    saveCount = 0

    dispatch({ type: 'REMOVE_PAGE', pageId: page.id })

    assert.equal(saveCount, 1)
    const saved = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.ok(!saved.pages.some(p => p.id === page.id))
  })
})

// 다른 테스트 파일과는 node --test의 파일 단위 프로세스 분리로 격리되지만,
// 명시적으로 해제해 이 파일 안에서의 의도를 남긴다.
test('cleanup — subscriber 해제', () => {
  unregisterSubscriber(PersistenceSubscriber.id)
})
