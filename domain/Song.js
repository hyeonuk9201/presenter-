/**
 * Song.js
 * Ownership: Song(가사) 데이터 구조 정의 및 생성
 * Change Reason: Song 스펙이 바뀔 때만 수정
 *
 * D-026(Song Aggregate MVP 범위) 참조 — Song은 MVP에서 "가사 저장"만
 * 책임진다. author/composer/ccli 같은 메타데이터는 지금 넣지 않는다
 * (실제로 쓰는 기능이 없는 저장 전용 데이터라 YAGNI로 보류, 필요해지면
 * 추가 전용 변경으로 확장 가능).
 *
 * Song은 Presentation을 알지 못한다 — LyricBlock에 sectionId나 스타일
 * 필드(fontSize 등)를 두지 않는다. D-021 규칙 2("Page는 자신이 어느
 * Song에서 왔는지 모른다")와 대칭 원칙이다.
 *
 * D-027(Song은 Asset이 아니라 별도 Aggregate) 참조 — MediaStore/
 * AssetArchitecture.md와 아무 관계도 갖지 않는다. Library는 UI에서만
 * Song/Media를 탭으로 묶을 뿐, 도메인 레이어는 완전히 분리된다.
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링, Presentation/Section에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// LyricBlock 생성
// ─────────────────────────────────────────

/**
 * @param {{ label?: string, text?: string }} params
 */
export function createLyricBlock({ label = '', text = '' } = {}) {
  return {
    id: generateId(),
    label, // 예: "Verse 1", "Chorus" — 자유 텍스트, 강제 enum 아님
    text,
  }
}

// ─────────────────────────────────────────
// LyricBlock 검증
// ─────────────────────────────────────────

export function isValidLyricBlock(block) {
  if (!block || typeof block !== 'object') return false
  if (!block.id || typeof block.id !== 'string') return false
  if (typeof block.label !== 'string') return false
  if (typeof block.text !== 'string') return false
  return true
}

// ─────────────────────────────────────────
// Song 생성
// ─────────────────────────────────────────

/**
 * @param {{ title?: string, lyrics?: object[], tags?: string[] }} params
 *   lyrics는 이미 만들어진 LyricBlock 배열을 받는다(createLyricBlock으로
 *   각각 생성 후 넘기는 것이 호출부 책임 — 이 함수는 문자열 파싱을
 *   하지 않는다).
 */
export function createSong({ title = '제목 없음', lyrics = [], tags = [] } = {}) {
  return {
    id: generateId(),
    title,
    lyrics, // LyricBlock[] — 배열 순서 자체가 가사 순서 SSOT(별도 order 필드 없음)
    tags,
  }
}

// ─────────────────────────────────────────
// Song 검증
// ─────────────────────────────────────────

export function isValidSong(song) {
  if (!song || typeof song !== 'object') return false
  if (!song.id || typeof song.id !== 'string') return false
  if (typeof song.title !== 'string') return false
  if (!Array.isArray(song.lyrics)) return false
  if (!song.lyrics.every(isValidLyricBlock)) return false
  if (!Array.isArray(song.tags)) return false
  if (!song.tags.every(t => typeof t === 'string')) return false
  return true
}
