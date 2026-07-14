/**
 * lyricsImport.js
 * Ownership: rawText → Page[] 변환 (Import 헬퍼)
 * Change Reason: 분절 규칙이 바뀔 때만 수정
 *
 * 이것은 도메인 모델이 아니다.
 * 가사 붙여넣기를 Page 여러 개로 만들어주는 일회성 Import 도구다.
 * 실행 후 rawText는 버려진다. Page[]만 남는다.
 */

import { createTextPage } from '../domain/Page.js'

/**
 * 가사 원문을 분절하여 Page 배열 반환
 *
 * 분절 규칙(2026-07-15, Observations #4):
 *   - 빈 줄이 하나라도 있으면 → 빈 줄 기준 분절(사용자가 의도적으로
 *     나눈 경계를 존중한다). 기존 관습 유지.
 *   - 빈 줄이 전혀 없으면 → linesPerSlide 줄씩 균등 분할한다(빈 줄 없이
 *     붙여넣은 가사 대응). linesPerSlide가 없으면 통짜 1개(기존 동작).
 *
 * 공백 정리는 두 경로 모두에 적용된다 — 각 줄 앞뒤 공백 제거 + 빈 줄
 * 제거(가사 내용 자체는 건드리지 않는다).
 *
 * @param {string} rawText
 * @param {object} [pageDefaults] - createTextPage에 전달할 스타일/전환 등
 * @param {{ linesPerSlide?: number }} [options]
 */
export function importLyrics(rawText, pageDefaults = {}, options = {}) {
  return splitLyrics(rawText, options.linesPerSlide)
    .map(text => createTextPage({ text, ...pageDefaults }))
}

/**
 * 가사 원문을 텍스트 블록 배열로 분절한다(Page 생성 없는 순수 로직 —
 * 테스트/미리보기용으로 분리). 규칙은 importLyrics 주석 참조.
 *
 * @param {string} rawText
 * @param {number} [linesPerSlide] - 유효한 양의 정수일 때만 균등 분할에 사용
 * @returns {string[]}
 */
export function splitLyrics(rawText, linesPerSlide) {
  if (typeof rawText !== 'string') return []

  // 빈 줄이 있으면 사용자가 명시적으로 나눈 것 — 그 경계를 존중한다.
  if (/\n\s*\n/.test(rawText)) {
    return rawText
      .split(/\n\s*\n/)
      .map(cleanBlock)
      .filter(Boolean)
  }

  // 빈 줄이 없으면 줄 단위로 정리한 뒤 N줄씩 균등 분할한다.
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  // linesPerSlide가 유효하지 않으면 통짜 1개(기존 동작과 동일).
  const n = Number.isInteger(linesPerSlide) && linesPerSlide > 0 ? linesPerSlide : lines.length
  const blocks = []
  for (let i = 0; i < lines.length; i += n) {
    blocks.push(lines.slice(i, i + n).join('\n'))
  }
  return blocks
}

/** 한 블록 내부의 각 줄 앞뒤 공백을 제거하고 빈 줄을 없앤다. */
function cleanBlock(block) {
  return block
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
}
