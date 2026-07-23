/**
 * MediaRuntimeCache.test.js
 *
 * 참조 기반 sweep(D-0001) 단위 회귀 테스트 + fill/peek/evict 기본 계약.
 * CommandBus를 거치지 않는 순수 캐시 동작만 다룬다 — sweep이 실제 명령
 * 흐름에서 언제 도는지는 command/CommandBus.test.js의 통합 시나리오가
 * 담당한다.
 *
 * IndexedDB가 필요 없으므로 fake-indexeddb를 쓰지 않는다(D-028 범위 규칙
 * — "필요한 곳만"). Node의 전역 Blob/URL.createObjectURL을 그대로 쓴다
 * (CommandBus.test.js의 preload 경로와 동일 전제).
 *
 * 캐시(urlCache)는 모듈 싱글톤이라 이 파일 안에서 테스트 간 공유된다 —
 * 각 테스트는 자신만의 mediaId를 쓰고, 끝에 sweep(new Set())으로 전체
 * 정리해 다음 테스트에 영향을 주지 않는다(MediaStore.test.js의 수동 격리
 * 방식과 같은 취지).
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { fill, has, peek, size, sweep, evict } from './MediaRuntimeCache.js'

function makeBlob(content = 'bytes') {
  return new Blob([content], { type: 'image/png' })
}

/** revokeObjectURL 실호출을 기록하는 스파이 설치 — 반드시 restore()로 원복 */
function spyRevoke() {
  const original = URL.revokeObjectURL
  const calls = []
  URL.revokeObjectURL = url => calls.push(url)
  return { calls, restore: () => { URL.revokeObjectURL = original } }
}

describe('MediaRuntimeCache — fill/peek 기본 계약', () => {
  test('fill은 blob URL을 만들어 캐시에 채우고, peek은 동기로 같은 값을 돌려준다', () => {
    const url = fill('m-rc-fill', makeBlob())
    assert.equal(typeof url, 'string')
    assert.ok(has('m-rc-fill'))
    assert.equal(peek('m-rc-fill'), url)
    sweep(new Set()) // 정리
  })

  test('같은 mediaId를 다시 fill하면 새 URL을 만들지 않고 기존 값을 재사용한다', () => {
    const first = fill('m-rc-dup', makeBlob('a'))
    const second = fill('m-rc-dup', makeBlob('b'))
    assert.equal(second, first) // 중복 createObjectURL 없음(헤더 원칙)
    assert.equal(size(), 1)
    sweep(new Set())
  })

  test('fill에 mediaId가 없으면 throw한다', () => {
    assert.throws(() => fill(null, makeBlob()))
    assert.throws(() => fill('', makeBlob()))
  })

  test('peek — 캐시에 없는 id/null/undefined는 전부 null (IndexedDB 재조회 없음)', () => {
    assert.equal(peek('m-rc-none'), null)
    assert.equal(peek(null), null)
    assert.equal(peek(undefined), null)
  })
})

describe('MediaRuntimeCache — sweep (D-0001)', () => {
  test('keepSet에 없는 항목만 축출하고, 있는 항목은 유지한다', () => {
    const keptUrl = fill('m-rc-keep', makeBlob('keep'))
    fill('m-rc-drop-1', makeBlob('d1'))
    fill('m-rc-drop-2', makeBlob('d2'))

    sweep(new Set(['m-rc-keep']))

    assert.equal(peek('m-rc-keep'), keptUrl) // 참조 항목 — URL까지 그대로
    assert.equal(peek('m-rc-drop-1'), null)
    assert.equal(peek('m-rc-drop-2'), null)
    assert.equal(size(), 1)
    sweep(new Set())
  })

  test('빈 keepSet이면 전체 축출된다', () => {
    fill('m-rc-all-1', makeBlob())
    fill('m-rc-all-2', makeBlob())

    sweep(new Set())

    assert.equal(size(), 0)
    assert.equal(has('m-rc-all-1'), false)
    assert.equal(has('m-rc-all-2'), false)
  })

  test('revokeObjectURL 실호출 — 축출 대상 URL만 revoke되고, 유지 항목은 호출되지 않는다', () => {
    const keptUrl = fill('m-rc-rv-keep', makeBlob('keep'))
    const droppedUrl = fill('m-rc-rv-drop', makeBlob('drop'))

    const spy = spyRevoke()
    try {
      sweep(new Set(['m-rc-rv-keep']))
    } finally {
      spy.restore()
    }

    assert.deepEqual(spy.calls, [droppedUrl]) // 정확히 1회, 축출 대상만
    assert.ok(!spy.calls.includes(keptUrl))
    sweep(new Set())
  })
})

describe('MediaRuntimeCache — evict (단건, 비표준 경로 보존)', () => {
  test('해당 항목을 revoke + 삭제한다', () => {
    const url = fill('m-rc-ev', makeBlob())
    const spy = spyRevoke()
    try {
      evict('m-rc-ev')
    } finally {
      spy.restore()
    }
    assert.deepEqual(spy.calls, [url])
    assert.equal(peek('m-rc-ev'), null)
  })

  test('캐시에 없는 id는 revoke 없이 no-op이다', () => {
    const spy = spyRevoke()
    try {
      evict('m-rc-ghost')
    } finally {
      spy.restore()
    }
    assert.equal(spy.calls.length, 0)
  })
})
