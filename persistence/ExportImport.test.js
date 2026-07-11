/**
 * ExportImport.test.js
 *
 * D-030 회귀 가드 — 내보내기 봉투 구성, 가져오기 검증(특히 "손상/미래
 * 버전 파일은 기존 데이터를 건드리지 않고 거부"), 저장소 쓰기를 고정한다.
 *
 * ExportImport.js 자체는 순수 로직이지만, import 그래프에 AppStore/
 * SongStore/AppSettingsStore(모듈 로드 시점에 localStorage를 읽는다)가
 * 있어서, SongStore.test.js와 같은 방식으로 localStorage mock을 먼저
 * 깔아둔 뒤 동적 import한다. 순수 함수만 테스트하므로 fresh import는
 * 1회면 충분하다(쿼리 스트링 캐시 무효화 불필요).
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { createTextPage } from '../domain/Page.js'
import { createSong } from '../domain/Song.js'
import { createStylePreset } from '../domain/StylePreset.js'

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear(),
    _raw: store,
  }
}

const localStorageMock = createLocalStorageMock()
globalThis.localStorage = localStorageMock

const {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  buildExportPayload,
  buildExportFileName,
  validateImportPayload,
  applyImportToStorage,
} = await import('./ExportImport.js')

// ─────────────────────────────────────────
// 헬퍼 — 실제 도메인 팩토리로 만든 "건강한" 내보내기 봉투
// ─────────────────────────────────────────

function makeHealthyPayload() {
  const page = createTextPage({ text: '주께 감사해 할렐루야' })
  return buildExportPayload({
    presentation: {
      title: '주일 예배',
      pages: [page],
      sectionIds: [],
      sectionMap: {},
    },
    songs: [createSong({ title: '주 하나님 지으신 모든 세계' })],
    stylePresets: [createStylePreset({ name: '테스트 프리셋' })],
  })
}

describe('ExportImport — 내보내기 봉투 구성', () => {
  test('봉투에 format/version/exportedAt과 세 스냅샷이 담긴다', () => {
    const payload = makeHealthyPayload()
    assert.equal(payload.format, EXPORT_FORMAT)
    assert.equal(payload.version, EXPORT_FORMAT_VERSION)
    assert.ok(typeof payload.exportedAt === 'string' && payload.exportedAt.length > 0)
    assert.equal(payload.presentation.title, '주일 예배')
    assert.equal(payload.songs.songs.length, 1)
    assert.equal(payload.appSettings.stylePresets.length, 1)
  })

  test('Presentation 스냅샷은 저장 형식과 동일하게 스키마 버전을 가진다', () => {
    const payload = makeHealthyPayload()
    assert.equal(typeof payload.presentation.version, 'number')
    assert.ok(payload.presentation.version >= 2) // v2(D-Editor-4) 이후
    assert.ok(Array.isArray(payload.presentation.pages))
    assert.ok(Array.isArray(payload.presentation.sectionIds))
    assert.equal(typeof payload.presentation.sectionMap, 'object')
  })

  test('PresenterState/appMode는 봉투에 포함되지 않는다 (D-004)', () => {
    const payload = makeHealthyPayload()
    const keys = JSON.stringify(payload)
    assert.ok(!keys.includes('presenterState'))
    assert.ok(!keys.includes('livePageId'))
    assert.ok(!keys.includes('appMode'))
  })

  test('파일명은 날짜 기반으로 만들어진다', () => {
    assert.equal(buildExportFileName(new Date(2026, 6, 11)), 'tc-presenter-backup-2026-07-11.json')
    assert.equal(buildExportFileName(new Date(2026, 0, 5)), 'tc-presenter-backup-2026-01-05.json')
  })
})

describe('ExportImport — 가져오기 검증 (왕복)', () => {
  test('내보낸 봉투는 그대로 검증을 통과하고, 스냅샷이 원본과 같다', () => {
    const payload = makeHealthyPayload()
    // 실제 사용 경로(파일 저장 → 파일 읽기)와 동일하게 직렬화 왕복을 거친다
    const result = validateImportPayload(JSON.parse(JSON.stringify(payload)))
    assert.equal(result.ok, true)
    assert.deepEqual(result.data.presentation, payload.presentation)
    assert.deepEqual(result.data.songs, payload.songs)
    assert.deepEqual(result.data.appSettings, payload.appSettings)
  })
})

describe('ExportImport — 가져오기 검증 (거부: 기존 데이터를 보호해야 하는 입력)', () => {
  test('객체가 아니거나 format 마커가 없으면 거부한다', () => {
    assert.equal(validateImportPayload(null).ok, false)
    assert.equal(validateImportPayload('문자열').ok, false)
    assert.equal(validateImportPayload([]).ok, false)
    assert.equal(validateImportPayload({}).ok, false)
    assert.equal(validateImportPayload({ format: '다른앱-export', version: 1 }).ok, false)
  })

  test('미래 버전 봉투는 거부한다', () => {
    const payload = makeHealthyPayload()
    payload.version = EXPORT_FORMAT_VERSION + 1
    const result = validateImportPayload(payload)
    assert.equal(result.ok, false)
    assert.match(result.reason, /새로운 버전/)
  })

  test('미래 스키마 버전의 Presentation은 거부한다 (Schema.js 폴백이 빈 프로젝트를 만들기 전에)', () => {
    const payload = makeHealthyPayload()
    payload.presentation = { ...payload.presentation, version: 999 }
    assert.equal(validateImportPayload(payload).ok, false)
  })

  test('손상된 Presentation(sanitize 불가)은 거부한다', () => {
    const payload = makeHealthyPayload()
    payload.presentation = { ...payload.presentation, pages: '배열이 아님' }
    assert.equal(validateImportPayload(payload).ok, false)

    const payload2 = makeHealthyPayload()
    payload2.presentation = null
    assert.equal(validateImportPayload(payload2).ok, false)
  })

  test('Song 스냅샷이 구조 손상이거나 미래 버전이면 거부한다', () => {
    const broken = makeHealthyPayload()
    broken.songs = { version: 1 } // songs 배열 없음
    assert.equal(validateImportPayload(broken).ok, false)

    const future = makeHealthyPayload()
    future.songs = { ...future.songs, version: 999 }
    assert.equal(validateImportPayload(future).ok, false)
  })

  test('AppSettings 스냅샷이 구조 손상이거나 미래 버전이면 거부한다', () => {
    const broken = makeHealthyPayload()
    broken.appSettings = { version: 1 } // stylePresets 배열 없음
    assert.equal(validateImportPayload(broken).ok, false)

    const future = makeHealthyPayload()
    future.appSettings = { ...future.appSettings, version: 999 }
    assert.equal(validateImportPayload(future).ok, false)
  })
})

describe('ExportImport — 저장소 쓰기', () => {
  test('검증 통과한 스냅샷 세 개가 각 저장소 키에 그대로 쓰인다', () => {
    const payload = makeHealthyPayload()
    const result = validateImportPayload(payload)
    assert.equal(result.ok, true)

    localStorageMock.clear()
    applyImportToStorage(result.data)

    assert.deepEqual(
      JSON.parse(localStorageMock.getItem('tc-presenter-presentation')),
      payload.presentation
    )
    assert.deepEqual(
      JSON.parse(localStorageMock.getItem('tc-presenter-songs')),
      payload.songs
    )
    assert.deepEqual(
      JSON.parse(localStorageMock.getItem('tc-presenter-app-settings')),
      payload.appSettings
    )
  })
})
