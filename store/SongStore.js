/**
 * SongStore.js
 * Ownership: Song(Library) 목록의 저장/로드
 * Change Reason: Song 저장 방식/스키마가 바뀔 때만 수정
 *
 * D-027(Song은 Asset이 아니라 별도 Aggregate) 참조 — MediaStore.js와
 * 완전히 독립된 저장소다. 서로의 존재를 모른다.
 *
 * AppSettingsStore.js와 같은 이유로 같은 패턴을 그대로 재사용한다 —
 * `persistence/StorageAdapter.js`(key 인자 받는 범용 구조)를 그대로
 * 쓰고, CommandBus/HistoryManager를 거치지 않는다. Song 목록 변경은
 * Undo/Redo 대상이 아니다(Presentation 편집 이력과 무관한 Library
 * 데이터이므로 — Section/Page의 Undo 스택과 섞이면 오히려 혼란스럽다).
 * 프리셋과 마찬가지로 Library 모달을 열 때마다 다시 읽으면 충분한
 * 규모라, 함수 호출 즉시 저장(write-through)하는 단순한 형태로 둔다.
 *
 * Song 자체는 Presentation에 직접 들어가지 않는다(D-021) — 이 파일은
 * Song 목록의 CRUD만 책임지고, Song → Section/Page 변환은 별도 계층
 * (아직 미구현, TODO 참조)의 책임이다.
 */

import { isValidSong } from '../domain/Song.js'
import { save, load } from '../persistence/StorageAdapter.js'

const STORAGE_KEY = 'tc-presenter-songs'
const CURRENT_VERSION = 1

// ─────────────────────────────────────────
// 검증 (AppSettingsStore.js의 sanitizeAppSettings와 같은 정신 —
// 손상된 개별 항목만 제외하고 나머지는 살린다)
// ─────────────────────────────────────────

function sanitizeSongs(raw) {
  if (!raw || typeof raw !== 'object') return null
  const rawSongs = Array.isArray(raw.songs) ? raw.songs : []
  const songs = rawSongs.filter(s => {
    const ok = isValidSong(s)
    if (!ok) console.warn('[SongStore] 손상된 Song을 제외하고 복원함:', s)
    return ok
  })
  return { songs }
}

// ─────────────────────────────────────────
// 로드 (모듈 로드 시점에 1회, AppSettingsStore.js의 부팅 패턴과 동일)
// ─────────────────────────────────────────

function loadSongs() {
  try {
    const raw = load(STORAGE_KEY)
    if (!raw) {
      return { songs: [] } // 최초 실행 — 시스템 기본 Song 없음(StylePreset과 다름, 시드할 콘텐츠가 없다)
    }
    const parsed = JSON.parse(raw)
    // version 필드는 지금 버전이 1뿐이라 마이그레이션 분기가 없다 —
    // Schema.js처럼 나중에 버전이 늘어나면 여기 fallthrough를 추가한다.
    const sanitized = sanitizeSongs(parsed)
    return sanitized ?? { songs: [] }
  } catch (err) {
    console.warn('[SongStore] 로드 실패, 빈 목록으로 폴백:', err)
    return { songs: [] }
  }
}

let state = loadSongs()

function persist() {
  try {
    save(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, ...state }))
  } catch (err) {
    console.error('[SongStore] 저장 실패:', err)
  }
}

// ─────────────────────────────────────────
// 조회/조작
// ─────────────────────────────────────────

export function getSongs() {
  return state.songs
}

export function getSongById(id) {
  return state.songs.find(s => s.id === id) ?? null
}

export function addSong(song) {
  state = { ...state, songs: [...state.songs, song] }
  persist()
}

export function updateSong(updatedSong) {
  state = {
    ...state,
    songs: state.songs.map(s => (s.id === updatedSong.id ? updatedSong : s)),
  }
  persist()
}

export function removeSong(id) {
  state = { ...state, songs: state.songs.filter(s => s.id !== id) }
  persist()
}
