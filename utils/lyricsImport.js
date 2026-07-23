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
 * 절 표시(마커) 줄 판정 (2026-07-23, 사용자 확정 — 곡 편집 실사용 신호).
 *
 * 줄 전체(trim 후)가 아래 한국어 기본형 중 하나일 때만 마커다:
 *   "N절"(공백 허용 — "2 절"), "후렴"/"후렴N", "간주", "브릿지"
 * 뒤에 다른 내용이 붙으면("1절 사랑의 노래") 일반 가사 줄로 취급한다 —
 * 오감지로 진짜 가사가 사라지는 것보다 미감지가 안전하다는 판단(보수적).
 * 영어 표기(Verse/Chorus)는 채택하지 않음(같은 날 사용자 선택).
 */
const SECTION_MARKER_RE = /^(?:\d+\s*절|후렴\s*\d*|간주|브릿지)$/

/**
 * 줄 하나가 절 표시 마커인지 판정한다. index.html의 곡 편집기
 * (splitLyricsToBlocks)도 같은 판정을 쓰도록 export한다 — 두 경로의
 * 마커 정의가 어긋나면 사용자 혼란이므로 정의는 여기 한 곳에만 둔다.
 * @param {string} line
 * @returns {boolean}
 */
export function isSectionMarker(line) {
  return SECTION_MARKER_RE.test(line.trim())
}

/**
 * 가사 원문을 분절하여 Page 배열 반환
 *
 * 분절 규칙(2026-07-15, Observations #4 + 2026-07-23 마커 확장):
 *   - 절 표시 마커 줄("1절"/"후렴" 등, isSectionMarker 참조)은 분절
 *     경계로만 쓰고 결과에서 제거한다(송출 화면에 안 나옴) — 마커가
 *     N줄 분할 계산에 끼어 전체가 한 줄씩 밀리던 문제의 해소.
 *   - 빈 줄이 하나라도 있으면 → 빈 줄 기준 분절(사용자가 의도적으로
 *     나눈 경계를 존중한다). 기존 관습 유지. 마커 경계와 병행 적용.
 *   - 빈 줄이 전혀 없으면 → linesPerSlide 줄씩 균등 분할한다(빈 줄 없이
 *     붙여넣은 가사 대응). 분할 카운트는 마커 경계마다 리셋된다.
 *     linesPerSlide가 없으면 마커 구간당 통짜 1개(기존 동작의 확장).
 *
 * 공백 정리는 모든 경로에 적용된다 — 각 줄 앞뒤 공백 제거 + 빈 줄
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
 * 구현: 먼저 마커 줄을 경계로 구간을 나누고(마커 줄은 버림), 각 구간에
 * 기존 규칙(빈 줄 우선 → N줄 분할)을 독립 적용한다. 마커가 없는 입력은
 * 구간이 1개라 기존 동작과 완전히 동일하다(하위 호환).
 *
 * @param {string} rawText
 * @param {number} [linesPerSlide] - 유효한 양의 정수일 때만 균등 분할에 사용
 * @returns {string[]}
 */
export function splitLyrics(rawText, linesPerSlide) {
  if (typeof rawText !== 'string') return []

  return splitByMarkers(rawText).flatMap(segment => splitSegment(segment, linesPerSlide))
}

/**
 * 마커 줄을 경계로 원문을 구간 배열로 나눈다. 마커 줄 자체는 결과에
 * 포함하지 않는다. 구간 내부의 빈 줄은 보존한다(뒤따르는 빈 줄 분절
 * 규칙이 구간 단위로 동작해야 하므로).
 * @param {string} rawText
 * @returns {string[]} 내용이 있는 구간만
 */
function splitByMarkers(rawText) {
  const segments = []
  let current = []
  for (const line of rawText.split('\n')) {
    if (isSectionMarker(line)) {
      segments.push(current.join('\n'))
      current = []
    } else {
      current.push(line)
    }
  }
  segments.push(current.join('\n'))
  return segments.filter(seg => seg.trim() !== '')
}

/** 한 구간에 기존 분절 규칙(빈 줄 우선 → N줄 분할)을 적용한다. */
function splitSegment(rawText, linesPerSlide) {
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
