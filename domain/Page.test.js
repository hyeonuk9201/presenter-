/**
 * Page.test.js
 * 범위: 배경 미디어(backgroundMediaId/backgroundMediaType, D-032, 2026-07-15)
 * 필드의 생성 기본값·보존·검증을 회귀 가드로 고정한다. text Page 전용 필드라
 * image/video Page에는 존재하지 않아야 한다는 경계도 함께 검증한다.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createTextPage, createImagePage, createVideoPage, isValidPage } from './Page.js'

describe('createTextPage — 배경 미디어 필드(D-032)', () => {
  test('기본값은 backgroundMediaId=null, backgroundMediaType=null', () => {
    const page = createTextPage({ text: 'x' })
    assert.equal(page.backgroundMediaId, null)
    assert.equal(page.backgroundMediaType, null)
  })

  test('backgroundMediaId/backgroundMediaType을 넘기면 보존한다', () => {
    const page = createTextPage({ backgroundMediaId: 'm1', backgroundMediaType: 'image' })
    assert.equal(page.backgroundMediaId, 'm1')
    assert.equal(page.backgroundMediaType, 'image')
  })
})

describe('createImagePage/createVideoPage — 배경 미디어 필드 없음(text 전용)', () => {
  test('createImagePage는 backgroundMediaId 필드를 갖지 않는다', () => {
    const page = createImagePage({ mediaId: 'c1' })
    assert.equal('backgroundMediaId' in page, false)
    assert.equal('backgroundMediaType' in page, false)
  })

  test('createVideoPage는 backgroundMediaId 필드를 갖지 않는다', () => {
    const page = createVideoPage({ mediaId: 'c2' })
    assert.equal('backgroundMediaId' in page, false)
    assert.equal('backgroundMediaType' in page, false)
  })
})

describe('isValidPage — 배경 미디어 검증(D-032)', () => {
  test('배경 없는 text page는 유효하다', () => {
    assert.equal(isValidPage(createTextPage({ text: 'x' })), true)
  })

  test('backgroundMediaId + type=image는 유효하다', () => {
    assert.equal(isValidPage(createTextPage({ backgroundMediaId: 'm1', backgroundMediaType: 'image' })), true)
  })

  test('backgroundMediaId + type=video는 유효하다', () => {
    assert.equal(isValidPage(createTextPage({ backgroundMediaId: 'm2', backgroundMediaType: 'video' })), true)
  })

  test('backgroundMediaId만 있고 backgroundMediaType이 없으면 무효', () => {
    const page = { ...createTextPage({ text: 'x' }), backgroundMediaId: 'm1', backgroundMediaType: null }
    assert.equal(isValidPage(page), false)
  })

  test('backgroundMediaType이 이상한 값이면 무효', () => {
    const page = { ...createTextPage({ text: 'x' }), backgroundMediaId: 'm1', backgroundMediaType: 'audio' }
    assert.equal(isValidPage(page), false)
  })

  test('backgroundMediaId가 문자열이 아니면 무효', () => {
    const page = { ...createTextPage({ text: 'x' }), backgroundMediaId: 42, backgroundMediaType: 'image' }
    assert.equal(isValidPage(page), false)
  })
})
