/**
 * MediaStore.test.js
 *
 * IndexedDB 기반이라 fake-indexeddb/auto로 globalThis.indexedDB를 채운
 * 뒤 테스트한다(D-028 범위: "IndexedDB가 필요한 곳만 fake-indexeddb를
 * 사용한다"). DB_NAME이 모듈 스코프 상수라 테스트마다 격리된 DB를 쓸 수
 * 없으므로, SongStore.test.js와 달리 각 test가 이전 test가 남긴 레코드에
 * 영향받지 않도록 매 테스트에서 만든 mediaId는 그 test 안에서 remove까지
 * 마친다(공유 DB에 대한 테스트 간 격리를 수동으로 보장).
 */
import 'fake-indexeddb/auto'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { put, get, remove, list } from './MediaStore.js'

function makeBlob(content, type) {
  const blob = new Blob([content], { type })
  // Node의 Blob에는 File의 name이 없다 — MediaStore.put()이 file.name을
  // 읽으므로(없으면 빈 문자열) 테스트에서 직접 채워 넣는다.
  return blob
}

describe('MediaStore', () => {
  test('put — 저장 후 get으로 동일한 레코드를 조회할 수 있다', async () => {
    const blob = makeBlob('fake-image-bytes', 'image/png')
    await put('m-put-1', blob)

    const record = await get('m-put-1')
    assert.equal(record.mimeType, 'image/png')
    assert.equal(record.size, blob.size)
    assert.ok(record.blob instanceof Blob)

    await remove('m-put-1')
  })

  test('get — 없는 mediaId는 null을 반환한다(에러 아님)', async () => {
    const record = await get('m-does-not-exist')
    assert.equal(record, null)
  })

  test('remove — 삭제 후에는 get이 null을 반환한다', async () => {
    await put('m-remove-1', makeBlob('x', 'video/mp4'))
    await remove('m-remove-1')
    assert.equal(await get('m-remove-1'), null)
  })

  test('list — blob 없이 메타데이터만 반환하고, 저장한 항목이 포함된다', async () => {
    await put('m-list-1', makeBlob('img', 'image/png'))
    await put('m-list-2', makeBlob('vid', 'video/mp4'))

    const results = await list()
    const ids = results.map(r => r.id)
    assert.ok(ids.includes('m-list-1'))
    assert.ok(ids.includes('m-list-2'))

    const entry = results.find(r => r.id === 'm-list-1')
    assert.equal(entry.mimeType, 'image/png')
    assert.equal(entry.blob, undefined) // blob은 목록에 포함하지 않는다(메모리 절약)

    await remove('m-list-1')
    await remove('m-list-2')
  })

  test('list — 삭제된 항목은 더 이상 목록에 나타나지 않는다', async () => {
    await put('m-list-gone', makeBlob('x', 'image/jpeg'))
    await remove('m-list-gone')

    const results = await list()
    assert.ok(!results.some(r => r.id === 'm-list-gone'))
  })
})
