import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createLyricBlock, isValidLyricBlock, createSong, isValidSong } from './Song.js'

describe('createLyricBlock', () => {
  test('기본값으로 생성', () => {
    const block = createLyricBlock()
    assert.equal(typeof block.id, 'string')
    assert.equal(block.label, '')
    assert.equal(block.text, '')
  })

  test('label/text를 전달하면 그대로 반영', () => {
    const block = createLyricBlock({ label: 'Verse 1', text: '가사 내용' })
    assert.equal(block.label, 'Verse 1')
    assert.equal(block.text, '가사 내용')
  })

  test('호출마다 다른 id 발급', () => {
    const a = createLyricBlock()
    const b = createLyricBlock()
    assert.notEqual(a.id, b.id)
  })
})

describe('isValidLyricBlock', () => {
  test('createLyricBlock 결과는 유효하다', () => {
    assert.equal(isValidLyricBlock(createLyricBlock({ label: 'Chorus', text: '나 나' })), true)
  })

  test('null/객체가 아니면 무효', () => {
    assert.equal(isValidLyricBlock(null), false)
    assert.equal(isValidLyricBlock('text'), false)
  })

  test('id가 없으면 무효', () => {
    assert.equal(isValidLyricBlock({ label: '', text: '' }), false)
  })

  test('label/text가 문자열이 아니면 무효', () => {
    assert.equal(isValidLyricBlock({ id: '1', label: 1, text: '' }), false)
    assert.equal(isValidLyricBlock({ id: '1', label: '', text: null }), false)
  })
})

describe('createSong', () => {
  test('기본값으로 생성', () => {
    const song = createSong()
    assert.equal(typeof song.id, 'string')
    assert.equal(song.title, '제목 없음')
    assert.deepEqual(song.lyrics, [])
    assert.deepEqual(song.tags, [])
  })

  test('lyrics 배열 순서를 그대로 보존한다 (D-026: 순서 자체가 SSOT)', () => {
    const blocks = [
      createLyricBlock({ label: 'Verse 1', text: 'a' }),
      createLyricBlock({ label: 'Chorus', text: 'b' }),
    ]
    const song = createSong({ title: '찬양', lyrics: blocks, tags: ['찬양'] })
    assert.equal(song.title, '찬양')
    assert.deepEqual(song.lyrics, blocks)
    assert.deepEqual(song.tags, ['찬양'])
  })
})

describe('isValidSong', () => {
  test('createSong 결과는 유효하다', () => {
    const song = createSong({
      title: '찬양',
      lyrics: [createLyricBlock({ label: 'Verse 1', text: 'a' })],
    })
    assert.equal(isValidSong(song), true)
  })

  test('null이면 무효', () => {
    assert.equal(isValidSong(null), false)
  })

  test('lyrics가 배열이 아니면 무효', () => {
    const song = createSong()
    song.lyrics = '배열아님'
    assert.equal(isValidSong(song), false)
  })

  test('lyrics 내부에 손상된 LyricBlock이 하나라도 있으면 무효', () => {
    const song = createSong({
      lyrics: [createLyricBlock({ label: 'Verse 1', text: 'a' }), { id: '1', label: 1, text: '' }],
    })
    assert.equal(isValidSong(song), false)
  })

  test('tags가 문자열 배열이 아니면 무효', () => {
    const song = createSong()
    song.tags = [1, 2]
    assert.equal(isValidSong(song), false)
  })
})
