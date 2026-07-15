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
