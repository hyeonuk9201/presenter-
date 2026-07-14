/**
 * lyricsImport.test.js
 * splitLyrics(순수 분절 로직)와 importLyrics(Page 생성) 회귀 테스트.
 * 분절 규칙 변경 시 이 파일을 함께 갱신한다(D-028).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitLyrics, importLyrics } from './lyricsImport.js'

// ── 빈 줄 기준 분절(기존 동작 유지) ──────────────────

test('빈 줄이 있으면 빈 줄 기준으로 분절한다', () => {
  const raw = '1절\n주께 감사해\n\n후렴\n찬양해'
  assert.deepEqual(splitLyrics(raw), ['1절\n주께 감사해', '후렴\n찬양해'])
})

test('빈 줄 분절 시에도 각 줄 앞뒤 공백을 정리한다', () => {
  const raw = '  주께 감사해  \n  할렐루야 \n\n 찬양해 '
  assert.deepEqual(splitLyrics(raw), ['주께 감사해\n할렐루야', '찬양해'])
})

test('연속된 빈 줄도 하나의 경계로 취급한다(빈 블록 제거)', () => {
  const raw = '1절\n\n\n\n2절'
  assert.deepEqual(splitLyrics(raw), ['1절', '2절'])
})

test('빈 줄이 있으면 linesPerSlide는 무시된다(사용자 경계 우선)', () => {
  const raw = '한 줄\n두 줄\n세 줄\n\n네 줄'
  assert.deepEqual(splitLyrics(raw, 2), ['한 줄\n두 줄\n세 줄', '네 줄'])
})

// ── 빈 줄 없는 가사: N줄씩 균등 분할 ──────────────────

test('빈 줄이 없으면 linesPerSlide 줄씩 균등 분할한다', () => {
  const raw = '주께 감사해\n높이 찬양해\n할렐루야\n주님을 찬양'
  assert.deepEqual(splitLyrics(raw, 2), ['주께 감사해\n높이 찬양해', '할렐루야\n주님을 찬양'])
})

test('나누어떨어지지 않으면 마지막 블록은 남은 줄만 담는다', () => {
  const raw = 'a\nb\nc\nd\ne'
  assert.deepEqual(splitLyrics(raw, 2), ['a\nb', 'c\nd', 'e'])
})

test('linesPerSlide=1이면 한 줄이 한 슬라이드', () => {
  const raw = 'a\nb\nc'
  assert.deepEqual(splitLyrics(raw, 1), ['a', 'b', 'c'])
})

test('빈 줄 없는 가사도 각 줄 공백을 정리한다', () => {
  const raw = '  a  \n b \n  c'
  assert.deepEqual(splitLyrics(raw, 3), ['a\nb\nc'])
})

// ── 하위 호환: linesPerSlide 미지정 ──────────────────

test('빈 줄 없고 linesPerSlide 미지정이면 통짜 1개(기존 동작)', () => {
  const raw = 'a\nb\nc'
  assert.deepEqual(splitLyrics(raw), ['a\nb\nc'])
})

test('linesPerSlide가 0/음수/비정수면 통짜 1개로 폴백', () => {
  const raw = 'a\nb\nc'
  assert.deepEqual(splitLyrics(raw, 0), ['a\nb\nc'])
  assert.deepEqual(splitLyrics(raw, -2), ['a\nb\nc'])
  assert.deepEqual(splitLyrics(raw, 1.5), ['a\nb\nc'])
})

// ── 경계값 ──────────────────

test('빈 문자열/공백만이면 빈 배열', () => {
  assert.deepEqual(splitLyrics(''), [])
  assert.deepEqual(splitLyrics('   \n  \n '), [])
})

test('문자열이 아니면 빈 배열(방어)', () => {
  assert.deepEqual(splitLyrics(null), [])
  assert.deepEqual(splitLyrics(undefined), [])
})

// ── importLyrics: Page 생성 + 스타일 전달 ──────────────────

test('importLyrics는 분절 결과만큼 Page를 만들고 pageDefaults를 얹는다', () => {
  const pages = importLyrics('a\nb\nc\nd', { fontSize: 48 }, { linesPerSlide: 2 })
  assert.equal(pages.length, 2)
  assert.equal(pages[0].type, 'text')
  assert.equal(pages[0].text, 'a\nb')
  assert.equal(pages[0].fontSize, 48)
  assert.equal(pages[1].text, 'c\nd')
})

test('importLyrics는 options 없이도 기존처럼 동작한다(하위 호환)', () => {
  const pages = importLyrics('1절\n가사\n\n후렴\n가사2')
  assert.equal(pages.length, 2)
  assert.equal(pages[0].text, '1절\n가사')
})
