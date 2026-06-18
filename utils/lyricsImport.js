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
 * 빈 줄 기준으로 분절하여 Page 배열 반환
 *
 * 입력 예:
 *   "1절\n주께 감사해\n\n후렴\n찬양해"
 *
 * 출력 예:
 *   [ Page{ text: "1절\n주께 감사해" }, Page{ text: "후렴\n찬양해" } ]
 */
export function importLyrics(rawText, pageDefaults = {}) {
  return rawText
    .split(/\n\s*\n/)          // 빈 줄 기준 분절
    .map(section => section.trim())
    .filter(Boolean)           // 빈 섹션 제거
    .map(text => createTextPage({ text, ...pageDefaults }))
}
