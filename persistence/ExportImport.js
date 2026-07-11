/**
 * ExportImport.js
 * Ownership: 데이터 내보내기/가져오기 봉투(envelope)의 구성·검증·저장소 쓰기
 * Change Reason: 내보내기 포맷(봉투 구조/버전)이 바뀔 때만 수정
 *
 * D-030 참조 — 범위는 텍스트 데이터만(Presentation + Song + AppSettings),
 * Media blob(IndexedDB)과 PresenterState/appMode(D-004)는 포함하지 않는다.
 *
 * 이 모듈은 순수 로직이다 — DOM을 모르고, 각 Store의 런타임 상태도
 * 모른다. 호출부(index.html)가 각 Store에서 꺼낸 값을 인자로 넘기고,
 * 파일 다운로드/선택/새로고침 같은 브라우저 상호작용도 호출부 책임이다.
 *
 * 가져오기가 저장소 쓰기(applyImportToStorage)까지만 하고 상태 재주입을
 * 하지 않는 이유(D-030): 세 저장소(AppStore/SongStore/AppSettingsStore)는
 * 전부 모듈 로드 시점에 부팅하므로, 새로고침 한 번이 "가져온 데이터를
 * 정규 로드 경로(마이그레이션·sanitize·미디어 캐시 재구성)로 다시 읽는
 * 것"과 정확히 같다 — 가져오기 전용 재주입 경로를 만들면 그 경로만
 * 검증이 얇아진다.
 */

import { CURRENT_SCHEMA_VERSION, migrateSnapshot, withSchemaVersion } from './Schema.js'
import { save } from './StorageAdapter.js'
import { sanitizePresentation } from '../domain/Presentation.js'
import { STORAGE_KEY as PRESENTATION_STORAGE_KEY } from '../store/AppStore.js'
import { SONG_STORAGE_KEY, SONG_STORAGE_VERSION } from '../store/SongStore.js'
import { APP_SETTINGS_STORAGE_KEY, APP_SETTINGS_STORAGE_VERSION } from '../store/AppSettingsStore.js'

// ─────────────────────────────────────────
// 내보내기 포맷 버전 (저장소 스키마 버전과 독립 — D-030)
// ─────────────────────────────────────────

export const EXPORT_FORMAT = 'tc-presenter-export'
export const EXPORT_FORMAT_VERSION = 1

// ─────────────────────────────────────────
// 내보내기 — 봉투 구성
// ─────────────────────────────────────────

/**
 * 내보내기 봉투를 만든다. 각 저장소의 스냅샷을 "그 저장소가 localStorage에
 * 쓰는 형식 그대로"(자체 version 필드 포함) 내장한다 — 가져오기가 검증 후
 * 같은 형식을 그대로 키에 쓰면 되도록.
 *
 * @param {object} args
 * @param {{ title: string, pages: object[], sectionIds: string[], sectionMap: object }} args.presentation
 *   - AppStore state의 presentation에서 저장 대상 필드만 추린 것
 *     (PersistenceSubscriber.js가 저장하는 페이로드와 동일 구성)
 * @param {object[]} args.songs - SongStore.getSongs() 결과
 * @param {object[]} args.stylePresets - AppSettingsStore.getStylePresets() 결과
 * @returns {object} 직렬화 전 봉투 객체
 */
export function buildExportPayload({ presentation, songs, stylePresets }) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    presentation: withSchemaVersion({
      title: presentation.title,
      pages: presentation.pages,
      sectionIds: presentation.sectionIds,
      sectionMap: presentation.sectionMap,
    }),
    songs: { version: SONG_STORAGE_VERSION, songs },
    appSettings: { version: APP_SETTINGS_STORAGE_VERSION, stylePresets },
  }
}

/**
 * 내보내기 파일명. 브라우저 다운로드 속성(a[download])에 쓴다.
 * @param {Date} [now]
 * @returns {string} 예: tc-presenter-backup-2026-07-11.json
 */
export function buildExportFileName(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `tc-presenter-backup-${y}-${m}-${d}.json`
}

// ─────────────────────────────────────────
// 가져오기 — 검증 (저장소 쓰기 전에 반드시 통과해야 함, D-030)
// ─────────────────────────────────────────

/**
 * 가져오기 파일(JSON.parse 결과)을 검증한다. 기존 데이터를 덮어쓰기 전에
 * 호출해야 하며, 실패 시 저장소는 전혀 건드리지 않는다.
 *
 * 검증이 부팅 경로의 sanitize보다 엄격한 이유: 부팅의 "손상 → 새 프로젝트
 * 폴백"이 가져오기에서 발동하면, 멀쩡한 기존 데이터를 손상 파일로 덮어쓴
 * 뒤 빈 프로젝트가 되는 최악 경로가 된다. 그래서 Presentation은 실제 로드
 * 경로와 동일한 변환(migrateSnapshot → sanitizePresentation)을 여기서
 * 미리 통과시켜 본다.
 *
 * @param {unknown} parsed - JSON.parse 직후의 값
 * @returns {{ ok: true, data: { presentation: object, songs: object, appSettings: object } }
 *         | { ok: false, reason: string }}
 *   data의 세 스냅샷은 "저장소 키에 그대로 쓸" 원본이다(마이그레이션은
 *   부팅 경로가 다시 수행 — 검증용 변환 결과를 쓰지 않는 이유는 로드
 *   경로와 저장 원본의 이중화를 피하기 위함).
 */
export function validateImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: '내보내기 파일 형식이 아닙니다.' }
  }
  if (parsed.format !== EXPORT_FORMAT) {
    return { ok: false, reason: 'TC-Presenter 내보내기 파일이 아닙니다.' }
  }
  if (typeof parsed.version !== 'number' || parsed.version > EXPORT_FORMAT_VERSION) {
    return { ok: false, reason: '더 새로운 버전의 앱에서 내보낸 파일입니다 — 앱을 먼저 업데이트해주세요.' }
  }
  // (버전 1뿐이라 봉투 마이그레이션 분기가 없다 — 포맷이 진화하면
  // Schema.js의 fallthrough 패턴을 여기 추가한다.)

  // Presentation — 실제 로드 경로와 동일한 변환을 통과하는지 확인
  const presentation = parsed.presentation
  if (!presentation || typeof presentation !== 'object') {
    return { ok: false, reason: '파일에 Presentation 데이터가 없습니다.' }
  }
  if (typeof presentation.version === 'number' && presentation.version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: '더 새로운 버전의 앱에서 내보낸 파일입니다 — 앱을 먼저 업데이트해주세요.' }
  }
  let migrated
  try {
    migrated = migrateSnapshot(presentation)
  } catch {
    migrated = null
  }
  const sanitized = migrated ? sanitizePresentation(migrated) : null
  if (!sanitized) {
    return { ok: false, reason: 'Presentation 데이터가 손상되어 가져올 수 없습니다.' }
  }

  // Song — 구조/버전만 확인(개별 항목 sanitize는 부팅 경로 SongStore가 수행)
  const songs = parsed.songs
  if (!songs || typeof songs !== 'object' || !Array.isArray(songs.songs)) {
    return { ok: false, reason: 'Song 데이터가 손상되어 가져올 수 없습니다.' }
  }
  if (typeof songs.version !== 'number' || songs.version > SONG_STORAGE_VERSION) {
    return { ok: false, reason: '더 새로운 버전의 앱에서 내보낸 파일입니다 — 앱을 먼저 업데이트해주세요.' }
  }

  // AppSettings — 구조/버전만 확인(개별 항목 sanitize는 AppSettingsStore가 수행)
  const appSettings = parsed.appSettings
  if (!appSettings || typeof appSettings !== 'object' || !Array.isArray(appSettings.stylePresets)) {
    return { ok: false, reason: '스타일 프리셋 데이터가 손상되어 가져올 수 없습니다.' }
  }
  if (typeof appSettings.version !== 'number' || appSettings.version > APP_SETTINGS_STORAGE_VERSION) {
    return { ok: false, reason: '더 새로운 버전의 앱에서 내보낸 파일입니다 — 앱을 먼저 업데이트해주세요.' }
  }

  return { ok: true, data: { presentation, songs, appSettings } }
}

// ─────────────────────────────────────────
// 가져오기 — 저장소 쓰기 (검증 통과 후에만 호출할 것)
// ─────────────────────────────────────────

/**
 * 검증을 통과한 스냅샷 세 개를 각 저장소 키에 그대로 쓴다. 호출부는 이
 * 직후 페이지를 새로고침해 정규 부팅 경로로 다시 읽어야 한다(D-030).
 *
 * @param {{ presentation: object, songs: object, appSettings: object }} data
 *   - validateImportPayload()가 반환한 data
 * @throws {Error} 저장소 용량 초과 등 물리 저장 실패 시 그대로 던진다 —
 *   호출부가 try/catch로 감싸 사용자에게 알린다.
 */
export function applyImportToStorage(data) {
  save(PRESENTATION_STORAGE_KEY, JSON.stringify(data.presentation))
  save(SONG_STORAGE_KEY, JSON.stringify(data.songs))
  save(APP_SETTINGS_STORAGE_KEY, JSON.stringify(data.appSettings))
}
