/**
 * CommandBus.test.js
 *
 * 직렬 실행 큐(D-019), MEDIA_COMMANDS preload, bootstrapMediaCache(D-020),
 * History Hook 호출 계약(D-018) 회귀 테스트 (TODO.md "핵심 계층 회귀
 * 테스트 구축", 기술 부채 감사 TD-3).
 *
 * D-028 근거 그대로: 이 파일(CommandBus.js)은 D-019에서 비동기 전환으로
 * 인한 타이밍 버그(순서 역전)를 낸 이력이 있다 — 당시 임시 스크립트로
 * 재현/검증했던 시나리오를 여기 상시 회귀 가드로 고정한다.
 *
 * IndexedDB(preloadMedia 경로)가 필요하므로 fake-indexeddb를 쓴다(D-028
 * 범위 규칙). AppStore는 모듈 싱글톤이지만 node --test가 파일 단위로
 * 프로세스를 분리하므로 다른 테스트 파일과 격리된다.
 */
import 'fake-indexeddb/auto'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { execute, setHistoryHook, bootstrapMediaCache } from './CommandBus.js'
import { getState } from '../store/AppStore.js'
import { put as putMedia } from '../media/MediaStore.js'
import { has as hasMediaCached, peek as peekMediaCache } from '../media/MediaRuntimeCache.js'
import { createTextPage, createImagePage } from '../domain/Page.js'
import { HistoryHook, undo } from '../history/HistoryManager.js'

function pageIndex(id) {
  return getState().presentation.pages.findIndex(p => p.id === id)
}

describe('CommandBus — execute() 기본 계약', () => {
  test('유효하지 않은 Command는 throw 없이 무시되고 state가 변하지 않는다', async () => {
    const before = getState()
    await execute(null)
    await execute({})
    await execute({ type: 42 })
    assert.equal(getState(), before)
  })

  test('History Hook은 dispatch "이후"에 prevState와 함께 호출된다(D-018 관찰자 계약)', async () => {
    const page = createTextPage({ text: 'hook-order' })
    const seen = []
    setHistoryHook({
      afterExecute(action, prevState) {
        seen.push({
          type: action.type,
          // Hook 호출 시점에 이미 dispatch가 끝나 있어야 하고(신규 Page 존재),
          prevHasPage: prevState.presentation.pages.some(p => p.id === page.id),
          nextHasPage: getState().presentation.pages.some(p => p.id === page.id),
        })
      },
    })
    try {
      await execute({ type: 'ADD_PAGE', payload: { page } })
    } finally {
      setHistoryHook(null) // 다른 테스트에 영향 주지 않도록 해제
    }

    assert.equal(seen.length, 1)
    assert.equal(seen[0].type, 'ADD_PAGE')
    assert.equal(seen[0].prevHasPage, false) // prevState는 dispatch 이전 값
    assert.equal(seen[0].nextHasPage, true)  // Hook 시점엔 dispatch 완료
  })
})

describe('CommandBus — media preload (D-019)', () => {
  test('media Page의 ADD_PAGE는 dispatch 전에 MediaRuntimeCache를 채운다', async () => {
    await putMedia('m-bus-1', new Blob(['img-bytes'], { type: 'image/png' }))
    const page = createImagePage({ mediaId: 'm-bus-1', label: 'preload' })

    await execute({ type: 'ADD_PAGE', payload: { page } })

    assert.ok(hasMediaCached('m-bus-1'))
    const url = peekMediaCache('m-bus-1')
    assert.equal(typeof url, 'string') // blob URL이 동기 조회 가능해야 View가 동기로 남는다
    assert.notEqual(pageIndex(page.id), -1)
  })

  test('직렬 큐 — media Command(지연)와 텍스트 Command(즉시)를 fire-and-forget으로 연속 호출해도 호출 순서 = dispatch 순서다', async () => {
    await putMedia('m-bus-2', new Blob(['img2'], { type: 'image/png' }))
    const imagePage = createImagePage({ mediaId: 'm-bus-2', label: 'first' })
    const textPage = createTextPage({ text: 'second' })

    // await 없이 연속 호출 — D-019가 고친 "순서 역전" 시나리오 그대로.
    // 큐가 없으면 IndexedDB 조회를 기다리는 imagePage보다 textPage가
    // 먼저 dispatch될 수 있다.
    const p1 = execute({ type: 'ADD_PAGE', payload: { page: imagePage } })
    const p2 = execute({ type: 'ADD_PAGE', payload: { page: textPage } })
    await Promise.all([p1, p2])

    assert.ok(pageIndex(imagePage.id) < pageIndex(textPage.id),
      '먼저 호출한 media Command가 먼저 dispatch되어야 한다')
  })

  test('IndexedDB에 없는 mediaId — throw 없이 Page 추가는 진행되고 캐시만 비어 있다', async () => {
    const page = createImagePage({ mediaId: 'm-bus-ghost', label: 'missing' })
    await execute({ type: 'ADD_PAGE', payload: { page } })

    assert.notEqual(pageIndex(page.id), -1) // dispatch 자체는 막히지 않는다
    assert.equal(hasMediaCached('m-bus-ghost'), false)
    assert.equal(peekMediaCache('m-bus-ghost'), null)
  })

  // TD-2 회귀(감사 2026-07-11) — IndexedDB 조회 자체가 reject하는 경우.
  // 이전에는 preload reject가 execute() 반환 Promise로 그대로 전파돼,
  // fire-and-forget 호출부에서 unhandled rejection + dispatch 미실행이 됐고
  // Undo 주입 INSERT_PAGE_AT이면 pop된 이력이 유실됐다. 지금은 "레코드
  // 없음"과 동일하게 warn 후 진행해야 한다. fake-indexeddb의
  // IDBDatabase.prototype.transaction을 일시적으로 throw시켜 조회 실패를
  // 재현한다(DB가 닫힌 InvalidStateError류 실제 실패와 같은 지점).
  test('IndexedDB 조회가 reject해도 — execute()는 resolve하고 dispatch는 진행되며 캐시만 비어 있다', async () => {
    const page = createImagePage({ mediaId: 'm-bus-broken', label: 'idb-fail' })
    const originalTransaction = globalThis.IDBDatabase.prototype.transaction
    globalThis.IDBDatabase.prototype.transaction = () => {
      throw new Error('TD-2: 의도적 IndexedDB 조회 실패')
    }
    try {
      // reject 없이 resolve해야 한다 — reject하면 이 await가 throw해서 테스트가 실패한다
      await execute({ type: 'ADD_PAGE', payload: { page } })
    } finally {
      globalThis.IDBDatabase.prototype.transaction = originalTransaction
    }

    assert.notEqual(pageIndex(page.id), -1) // preload 실패에도 dispatch는 진행
    assert.equal(hasMediaCached('m-bus-broken'), false) // 캐시 미기록
    assert.equal(peekMediaCache('m-bus-broken'), null)
  })

  // backgroundMediaId preload 회귀(D-032, 2026-07-15) — text Page의 배경 미디어도
  // mediaId와 동일하게 캐시에 채워져야 Preview/Output이 동기 peek할 수 있다.
  test('backgroundMediaId를 가진 text Page의 UPDATE_PAGE는 배경 blob을 캐시에 채운다', async () => {
    await putMedia('m-bus-bg', new Blob(['bg-bytes'], { type: 'image/png' }))
    const page = createTextPage({ text: 'bg', backgroundMediaId: 'm-bus-bg', backgroundMediaType: 'image' })
    await execute({ type: 'ADD_PAGE', payload: { page } })
    // UPDATE_PAGE로도 preload 경로(MEDIA_COMMANDS)를 타는지 확인
    await execute({ type: 'UPDATE_PAGE', payload: { page } })

    assert.ok(hasMediaCached('m-bus-bg'))
    assert.equal(typeof peekMediaCache('m-bus-bg'), 'string')
  })

  test('mediaId와 backgroundMediaId가 둘 다 있으면 둘 다 채워진다', async () => {
    await putMedia('m-bus-content', new Blob(['content'], { type: 'image/png' }))
    await putMedia('m-bus-bg2', new Blob(['bg2'], { type: 'video/mp4' }))
    // 두 참조를 동시에 가진 payload — Domain 생성 함수를 거치지 않고
    // preloadMedia가 payload의 모양(page.mediaId + page.backgroundMediaId)만
    // 본다는 점을 그대로 검증한다.
    const page = { ...createImagePage({ mediaId: 'm-bus-content', label: 'both' }), backgroundMediaId: 'm-bus-bg2', backgroundMediaType: 'video' }
    await execute({ type: 'ADD_PAGE', payload: { page } })

    assert.ok(hasMediaCached('m-bus-content'))
    assert.ok(hasMediaCached('m-bus-bg2'))
    assert.equal(typeof peekMediaCache('m-bus-content'), 'string')
    assert.equal(typeof peekMediaCache('m-bus-bg2'), 'string')
  })
})

describe('CommandBus — bootstrapMediaCache (D-020)', () => {
  test('부트스트랩 경로 — dispatch 없이 캐시만 채운다', async () => {
    await putMedia('m-bus-boot', new Blob(['boot'], { type: 'image/png' }))
    // localStorage 복원을 흉내낸 "이미 존재하는" Page 객체 — dispatch하지 않는다
    const restored = createImagePage({ mediaId: 'm-bus-boot', label: 'restored' })

    const pagesBefore = getState().presentation.pages
    await bootstrapMediaCache([restored, createTextPage({ text: 'text-safe' })])

    assert.equal(getState().presentation.pages, pagesBefore) // state 무변화(참조 동일)
    assert.ok(hasMediaCached('m-bus-boot'))
  })

  test('빈 배열/비배열 입력은 안전하게 무시된다', async () => {
    await bootstrapMediaCache([])
    await bootstrapMediaCache(null)
    await bootstrapMediaCache(undefined)
    // throw만 없으면 통과 — 부팅 경로(initUI)에서 호출되므로 어떤 입력에도 죽으면 안 된다
  })
})

describe('CommandBus — 참조 기반 sweep (D-0001)', () => {
  // 통합 시나리오 — 초안 문서 "검증 계획"(docs/Research/2026-07-19
  // MediaRuntimeCache Evict Decision Draft.md)을 그대로 옮겼다. sweep의
  // 단위 동작(revoke 실호출 등)은 media/MediaRuntimeCache.test.js가,
  // keepSet 계산은 domain/Presentation.test.js가 담당한다.
  //
  // 캐시/AppStore는 모듈 싱글톤이라 이 파일의 앞 describe들이 남긴 Page가
  // state에 남아 있다 — 그 Page들이 참조하는 id는 sweep에서 항상 유지되므로
  // 간섭이 없고, 각 테스트는 자신만의 mediaId를 쓰고 자신이 추가한 Page를
  // REMOVE_PAGE로 정리해(그 자체가 "유일 참조 제거 → 축출" 검증이기도 하다)
  // 다음 테스트에 영향을 주지 않는다.

  test('미참조 축출 — pages 변경 명령 후 state가 참조하지 않는 항목만 사라진다', async () => {
    await putMedia('m-swp-x', new Blob(['x'], { type: 'image/png' }))
    await putMedia('m-swp-y', new Blob(['y'], { type: 'image/png' }))
    // bootstrap 경로로 dispatch 없이 X·Y를 캐시에만 채운다(둘 다 아직 미참조)
    await bootstrapMediaCache([
      createImagePage({ mediaId: 'm-swp-x', label: 'x' }),
      createImagePage({ mediaId: 'm-swp-y', label: 'y' }),
    ])
    assert.ok(hasMediaCached('m-swp-x') && hasMediaCached('m-swp-y'))

    const pageX = createImagePage({ mediaId: 'm-swp-x', label: 'keep-x' })
    await execute({ type: 'ADD_PAGE', payload: { page: pageX } }) // pages 변경 → sweep

    assert.equal(typeof peekMediaCache('m-swp-x'), 'string') // state가 참조 → 유지
    assert.equal(peekMediaCache('m-swp-y'), null)            // 미참조 → 축출

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: pageX.id } }) // 정리
    assert.equal(peekMediaCache('m-swp-x'), null) // 유일 참조 제거 → 축출
  })

  test('공유 id 보존 — 두 Page가 같은 mediaId를 공유하면 하나를 지워도 유지된다', async () => {
    await putMedia('m-swp-shared', new Blob(['s'], { type: 'image/png' }))
    const p1 = createImagePage({ mediaId: 'm-swp-shared', label: 'p1' })
    const p2 = createImagePage({ mediaId: 'm-swp-shared', label: 'p2' })
    await execute({ type: 'ADD_PAGE', payload: { page: p1 } })
    await execute({ type: 'ADD_PAGE', payload: { page: p2 } })

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: p1.id } })
    assert.equal(typeof peekMediaCache('m-swp-shared'), 'string') // p2가 여전히 참조

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: p2.id } })
    assert.equal(peekMediaCache('m-swp-shared'), null) // 마지막 참조 제거 → 축출
  })

  test('backgroundMediaId 보존/축출(D-032) — 배경 참조도 keepSet에 포함된다', async () => {
    await putMedia('m-swp-bg', new Blob(['bg'], { type: 'image/png' }))
    const bgPage = createTextPage({ text: 'bg-keep', backgroundMediaId: 'm-swp-bg', backgroundMediaType: 'image' })
    const unrelated = createTextPage({ text: '무관한 텍스트' })
    await execute({ type: 'ADD_PAGE', payload: { page: bgPage } })

    await execute({ type: 'ADD_PAGE', payload: { page: unrelated } }) // 무관한 pages 변경
    assert.equal(typeof peekMediaCache('m-swp-bg'), 'string') // 배경 참조 유지 (keepSet이 배경을 빼먹으면 여기서 실패)

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: bgPage.id } })
    assert.equal(peekMediaCache('m-swp-bg'), null) // 배경의 유일 참조 제거 → 축출

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: unrelated.id } }) // 정리
  })

  test('Live/Preview 참조 보존 — live+selected Page의 media는 다른 Page 편집에도 축출되지 않는다', async () => {
    await putMedia('m-swp-live', new Blob(['live'], { type: 'image/png' }))
    const livePage = createImagePage({ mediaId: 'm-swp-live', label: 'live' })
    const other = createTextPage({ text: 'other' })
    await execute({ type: 'ADD_PAGE', payload: { page: livePage } })
    await execute({ type: 'ADD_PAGE', payload: { page: other } })
    await execute({ type: 'SELECT_PAGE', payload: { pageId: livePage.id } })
    await execute({ type: 'GO_LIVE', payload: { pageId: livePage.id } })

    await execute({ type: 'UPDATE_PAGE', payload: { page: { ...other, text: 'other-수정' } } }) // pages 변경 → sweep
    assert.equal(typeof peekMediaCache('m-swp-live'), 'string') // live+selected Page의 media 유지

    await execute({ type: 'CLEAR_LIVE' })
    await execute({ type: 'CLEAR_SELECTION' })
    await execute({ type: 'REMOVE_PAGE', payload: { pageId: livePage.id } }) // 정리
    await execute({ type: 'REMOVE_PAGE', payload: { pageId: other.id } })
  })

  test('비-pages 명령은 sweep을 생략한다 — SELECT/GO_LIVE 후에도 미참조 항목이 잔존한다', async () => {
    const anchor = createTextPage({ text: 'anchor' })
    await execute({ type: 'ADD_PAGE', payload: { page: anchor } }) // pages 변경을 먼저 끝내둔다
    await putMedia('m-swp-idle', new Blob(['idle'], { type: 'image/png' }))
    await bootstrapMediaCache([createImagePage({ mediaId: 'm-swp-idle', label: 'idle' })]) // 미참조로 캐시에만 존재

    await execute({ type: 'SELECT_PAGE', payload: { pageId: anchor.id } })
    await execute({ type: 'GO_LIVE', payload: { pageId: anchor.id } })
    assert.ok(hasMediaCached('m-swp-idle')) // 비-pages 명령 — sweep 생략, 잔존

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: anchor.id } }) // pages 변경 명령
    assert.equal(peekMediaCache('m-swp-idle'), null) // 이제서야 축출
  })

  test('undo 재preload — REMOVE로 축출된 media가 undo(INSERT_PAGE_AT)에서 다시 채워진다', async () => {
    await putMedia('m-swp-undo', new Blob(['undo'], { type: 'image/png' }))
    const page = createImagePage({ mediaId: 'm-swp-undo', label: 'undoable' })
    setHistoryHook(HistoryHook)
    try {
      await execute({ type: 'ADD_PAGE', payload: { page } })
      await execute({ type: 'REMOVE_PAGE', payload: { pageId: page.id } })
      assert.equal(peekMediaCache('m-swp-undo'), null) // 유일 참조 제거 → 축출

      await undo(execute) // inverse = INSERT_PAGE_AT — MEDIA_COMMANDS 경유 재preload
    } finally {
      setHistoryHook(null) // 다른 테스트에 영향 주지 않도록 해제
    }
    assert.notEqual(pageIndex(page.id), -1) // Page 복원
    assert.equal(typeof peekMediaCache('m-swp-undo'), 'string') // IndexedDB에서 재충전

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: page.id } }) // 정리(Hook 해제 후라 기록 안 됨)
  })

  test('UPDATE_PAGE mediaId 교체 — 새 id 충전·옛 id 축출, undo로 원상 복원', async () => {
    await putMedia('m-swp-old', new Blob(['old'], { type: 'image/png' }))
    await putMedia('m-swp-new', new Blob(['new'], { type: 'image/png' }))
    const page = createImagePage({ mediaId: 'm-swp-old', label: 'swap' })
    setHistoryHook(HistoryHook)
    try {
      await execute({ type: 'ADD_PAGE', payload: { page } })
      await execute({ type: 'UPDATE_PAGE', payload: { page: { ...page, mediaId: 'm-swp-new' } } })
      assert.equal(typeof peekMediaCache('m-swp-new'), 'string') // 새 참조 충전(preload)
      assert.equal(peekMediaCache('m-swp-old'), null)            // 옛 참조 축출(sweep)

      await undo(execute) // inverse = UPDATE_PAGE(before) — 역시 MEDIA_COMMANDS 경유
      assert.equal(typeof peekMediaCache('m-swp-old'), 'string') // 재충전
      assert.equal(peekMediaCache('m-swp-new'), null)            // 이번엔 new가 미참조 → 축출
    } finally {
      setHistoryHook(null)
    }
    await execute({ type: 'REMOVE_PAGE', payload: { pageId: page.id } }) // 정리
  })

  test('D-019 회귀 — fire-and-forget 연속 호출에도 순서 보존 + 종료 후 캐시가 참조 집합과 일치한다', async () => {
    await putMedia('m-swp-seq', new Blob(['seq'], { type: 'image/png' }))
    await putMedia('m-swp-stale', new Blob(['stale'], { type: 'image/png' }))
    // 미참조 찌꺼기를 캐시에 심어둔다 — 연쇄 실행이 끝나면 정리돼 있어야 한다
    await bootstrapMediaCache([createImagePage({ mediaId: 'm-swp-stale', label: 'stale' })])
    const imagePage = createImagePage({ mediaId: 'm-swp-seq', label: 'seq-first' })
    const textPage = createTextPage({ text: 'seq-second' })

    // await 없이 연속 호출 — D-019 "순서 역전" 시나리오에 sweep이 얹힌 형태
    const p1 = execute({ type: 'ADD_PAGE', payload: { page: imagePage } })
    const p2 = execute({ type: 'ADD_PAGE', payload: { page: textPage } })
    await Promise.all([p1, p2])

    assert.ok(pageIndex(imagePage.id) < pageIndex(textPage.id),
      '먼저 호출한 media Command가 먼저 dispatch되어야 한다')
    assert.equal(typeof peekMediaCache('m-swp-seq'), 'string') // 참조 항목 유지
    assert.equal(peekMediaCache('m-swp-stale'), null)          // 미참조 찌꺼기 축출

    await execute({ type: 'REMOVE_PAGE', payload: { pageId: imagePage.id } }) // 정리
    await execute({ type: 'REMOVE_PAGE', payload: { pageId: textPage.id } })
  })
})
