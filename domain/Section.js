/**
 * Section.js
 * Ownership: Section 데이터 구조 정의 및 생성
 * Change Reason: Section 스펙이 바뀔 때만 수정
 *
 * Section은 Page를 그룹화하는 Editor 개념이다(FutureEditor.md D-Editor-4,
 * D-Editor-1/D-Editor-3 대체). Section은 더 이상 자신의 위치를 스스로
 * 정의하지 않는다 — "이 Page가 어느 Section에 속하는가"는 Page 쪽이
 * `sectionId`로 직접 들고 있다(domain/Page.js 참조). Section은 순수
 * grouping metadata(title/note/collapsed/color)만 가진다.
 *
 * Section이 Presentation 안에서 몇 번째로 표시되는지(순서)는 이 파일이
 * 알지 못한다 — Presentation.sectionIds가 그 SSOT다(domain/Presentation.js).
 *
 * `sourceSongId`/`isModified`(2026-07-09, D-021): Song에서 Section을
 * 만들면(`Presentation.importSongAsSection`) `sourceSongId`가 그 Song을
 * 가리킨다. Page는 이 관계를 전혀 모른다(D-021 규칙 2) — 오직 Section만
 * 출처를 추적한다. `isModified`는 이 Section의 Page가 조금이라도
 * 바뀌면 true로 전환되고 다시 false로 되돌아가지 않는다(D-021 규칙 5,
 * `Presentation.markModifiedSongSections` 참조) — "다시 가져오기"
 * (`Presentation.reimportSongIntoSection`)를 실행할 때만 false로
 * 리셋된다.
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링, Page 소속 계산에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// Section 생성
// ─────────────────────────────────────────

/**
 * @param {{ title?: string, note?: string, collapsed?: boolean, color?: string|null, sourceSongId?: string|null, isModified?: boolean }} params
 */
export function createSection({
  title = '섹션',
  note = '',
  collapsed = false,
  color = null,
  sourceSongId = null,
  isModified = false,
} = {}) {
  return {
    id: generateId(),
    title,
    note,
    collapsed,
    color, // Hex 문자열 또는 null(색상 없음)
    sourceSongId, // Song.id 또는 null(Song에서 안 만들어진 일반 Section)
    isModified, // sourceSongId가 있는 Section에서만 의미 있음(D-021 규칙 5)
    // startPageId 없음(D-Editor-4) — Section은 더 이상 위치를 스스로
    // 정의하지 않는다. Page 없이도(빈 Section) 정상적으로 존재할 수 있다.
  }
}

// ─────────────────────────────────────────
// Section 검증
// ─────────────────────────────────────────

export function isValidSection(section) {
  if (!section || typeof section !== 'object') return false
  if (!section.id || typeof section.id !== 'string') return false
  if (typeof section.title !== 'string') return false
  if (typeof section.collapsed !== 'boolean') return false
  if (section.color !== null && typeof section.color !== 'string') return false
  // sourceSongId/isModified는 2026-07-09에 추가된 필드라, 그 이전에
  // 저장된 Section(필드 자체가 없음)도 유효하게 받아들여야 한다 —
  // 없으면(undefined) 통과시키고, Presentation.sanitizePresentation이
  // 로드 시점에 기본값(null/false)으로 정규화한다.
  if (section.sourceSongId !== undefined && section.sourceSongId !== null && typeof section.sourceSongId !== 'string') return false
  if (section.isModified !== undefined && typeof section.isModified !== 'boolean') return false
  return true
}
