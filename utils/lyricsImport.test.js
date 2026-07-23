/**
 * lyricsImport.test.js
 * splitLyrics(순수 분절 로직)와 importLyrics(Page 생성) 회귀 테스트.
 * 분절 규칙 변경 시 이 파일을 함께 갱신한다(D-028).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitLyrics, importLyrics, isSectionMarker } from './lyricsImport.js'

// ── 빈 줄 기준 분절(기존 동작 유지) ──────────────────
// 주의: 2026-07-23 마커 규칙 도입으로 "1절"/"후렴" 같은 줄은 더 이상
// 일반 내용이 아니다 — 빈 줄 규칙 자체의 검증에는 마커가 아닌 가사를 쓴다.

test('빈 줄이 있으면 빈 줄 기준으로 분절한다', () => {
  const raw = '주께 감사해\n할렐루야\n\n찬양해\n영원히'
  assert.deepEqual(splitLyrics(raw), ['주께 감사해\n할렐루야', '찬양해\n영원히'])
})

test('빈 줄 분절 시에도 각 줄 앞뒤 공백을 정리한다', () => {
  const raw = '  주께 감사해  \n  할렐루야 \n\n 찬양해 '
  assert.deepEqual(splitLyrics(raw), ['주께 감사해\n할렐루야', '찬양해'])
})

test('연속된 빈 줄도 하나의 경계로 취급한다(빈 블록 제거)', () => {
  const raw = '첫 가사\n\n\n\n둘째 가사'
  assert.deepEqual(splitLyrics(raw), ['첫 가사', '둘째 가사'])
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
  const pages = importLyrics('첫 가사\n둘째 줄\n\n후렴 가사\n넷째 줄')
  assert.equal(pages.length, 2)
  assert.equal(pages[0].text, '첫 가사\n둘째 줄')
})

// ── 절 표시 마커(2026-07-23, 사용자 확정) ──────────────────
// 마커 줄은 분절 경계로만 쓰고 결과에서 제거한다. N줄 분할 카운트는
// 마커 경계마다 리셋 — "1절" 줄이 분할 계산에 끼어 전체가 한 줄씩
// 밀리던 실사용 문제의 회귀 가드.

test('마커 줄은 경계로만 쓰고 결과에서 제거된다(N줄 분할)', () => {
  const raw = '1절\nㅇㅇㅇ\nㅁㅁㅁ\n2절\nㅅㅅㅅ\nㅈㅈㅈ'
  assert.deepEqual(splitLyrics(raw, 2), ['ㅇㅇㅇ\nㅁㅁㅁ', 'ㅅㅅㅅ\nㅈㅈㅈ'])
})

test('N줄 분할 카운트는 마커 경계마다 리셋된다(밀림 방지)', () => {
  const raw = '1절\na\nb\nc\n후렴\nd\ne'
  assert.deepEqual(splitLyrics(raw, 2), ['a\nb', 'c', 'd\ne'])
})

test('linesPerSlide 없이 마커만 있으면 마커 구간당 통짜 1개', () => {
  const raw = '1절\na\nb\n2절\nc\nd'
  assert.deepEqual(splitLyrics(raw), ['a\nb', 'c\nd'])
})

test('마커와 빈 줄이 섞이면 두 경계가 병행 적용된다', () => {
  const raw = '1절\na\nb\n\nc\n후렴\nd'
  assert.deepEqual(splitLyrics(raw), ['a\nb', 'c', 'd'])
})

test('마커 뒤에 내용이 붙은 줄은 일반 가사 줄이다(보수적 감지)', () => {
  const raw = '1절 사랑의 노래\n둘째 줄'
  assert.deepEqual(splitLyrics(raw, 2), ['1절 사랑의 노래\n둘째 줄'])
})

test('마커만 있는 입력은 빈 배열', () => {
  assert.deepEqual(splitLyrics('1절\n후렴\n간주'), [])
})

test('isSectionMarker — 감지 목록(한국어 기본형, 공백 허용)', () => {
  for (const line of ['1절', '2 절', '12절', '후렴', '후렴2', '후렴 2', '간주', '브릿지', ' 1절 ']) {
    assert.equal(isSectionMarker(line), true, `감지돼야 함: "${line}"`)
  }
})

test('isSectionMarker — 미감지 목록(내용이 붙거나 다른 단어)', () => {
  for (const line of ['1절 사랑의 노래', '후렴처럼', '절', 'Verse 1', 'Chorus', '전주', '1', '가사 1절']) {
    assert.equal(isSectionMarker(line), false, `감지되면 안 됨: "${line}"`)
  }
})
