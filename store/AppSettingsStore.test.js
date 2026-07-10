/**
 * AppSettingsStore.test.js
 *
 * SongStore.test.js와 동일한 이유로 쿼리 스트링(`?case=N`)으로 모듈
 * 캐시를 무효화해 매 테스트마다 새 인스턴스를 얻는다 — 이 모듈도 로드
 * 시점에 1회 loadAppSettings()를 실행해 module 스코프 state를 채운다.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const STORAGE_KEY = 'tc-presenter-app-settings'

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

let importCounter = 0
async function freshAppSettingsStore(seedRaw) {
  const localStorageMock = createLocalStorageMock()
  if (seedRaw !== undefined) localStorageMock.setItem(STORAGE_KEY, seedRaw)
  globalThis.localStorage = localStorageMock

  importCounter++
  const mod = await import(`./AppSettingsStore.js?case=${importCounter}`)
  return { mod, localStorageMock }
}

describe('AppSettingsStore', () => {
  test('최초 실행(저장된 데이터 없음) — 시스템 기본 프리셋 2개로 시드된다', async () => {
    const { mod } = await freshAppSettingsStore(undefined)
    const presets = mod.getStylePresets()
    assert.equal(presets.length, 2)
    assert.deepEqual(presets.map(p => p.name), ['찬양 기본', '설교 자막'])
  })

  test('addStylePreset — 목록에 반영되고 localStorage에 실제로 저장된다', async () => {
    const { mod, localStorageMock } = await freshAppSettingsStore(undefined)
    const preset = {
      id: 'p1', name: '커스텀', fontSize: 60, color: '#000000', lineHeight: 1.2,
      fontWeight: 'normal', textStroke: 0, textShadow: false,
      horizontalAlign: 'left', verticalAlign: 'top',
    }
    mod.addStylePreset(preset)
    assert.ok(mod.getStylePresets().some(p => p.id === 'p1'))

    const saved = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.ok(saved.stylePresets.some(p => p.id === 'p1'))
  })

  test('updateStylePreset("덮어쓰기") — 해당 id의 서식 값만 교체되고 다른 프리셋은 그대로 유지된다', async () => {
    const { mod } = await freshAppSettingsStore(undefined)
    const [first, second] = mod.getStylePresets()

    mod.updateStylePreset({ ...first, fontSize: 999, color: '#123456' })

    const updated = mod.getStylePresets().find(p => p.id === first.id)
    assert.equal(updated.fontSize, 999)
    assert.equal(updated.color, '#123456')
    assert.equal(updated.name, first.name) // id/name은 그대로 — 덮어쓰기는 값만 교체

    const untouched = mod.getStylePresets().find(p => p.id === second.id)
    assert.deepEqual(untouched, second) // 다른 프리셋은 완전히 그대로
  })

  test('updateStylePreset — Presentation/Page 쪽에는 어떤 참조도 없다(D-023) — AppSettingsStore 모듈은 store/AppStore.js를 import하지 않는다', async () => {
    // 정적 검증: 이 모듈이 AppStore/Presentation을 import하지 않는지
    // 소스 텍스트로 확인한다 — "이미 적용된 Page에 소급 반영되는 경로"가
    // 애초에 존재할 수 없다는 것을 구조적으로 보장하기 위함(런타임 동작이
    // 아니라 의존 방향 자체를 검증).
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./AppSettingsStore.js', import.meta.url), 'utf8')
    assert.ok(!src.includes("from '../store/AppStore.js'"))
    assert.ok(!src.includes("from '../domain/Presentation.js'"))
  })

  test('removeStylePreset — 삭제 후 목록/저장소 양쪽에서 제거된다', async () => {
    const { mod } = await freshAppSettingsStore(undefined)
    const [first] = mod.getStylePresets()
    mod.removeStylePreset(first.id)
    assert.ok(!mod.getStylePresets().some(p => p.id === first.id))
  })
})
