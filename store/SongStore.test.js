/**
 * SongStore.test.js
 *
 * SongStore.js는 모듈 로드 시점에 딱 한 번 loadSongs()를 실행해 module
 * 스코프의 state를 채운다(AppSettingsStore.js와 같은 패턴). 그래서 매
 * 테스트마다 "이 테스트만의 localStorage 상태"를 주려면, import 자체를
 * 매번 새로 해야 한다 — Node ESM은 동일 specifier를 캐싱하므로, 쿼리
 * 스트링(`?case=N`)으로 캐시를 무효화해 매번 새 모듈 인스턴스를 얻는다.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const STORAGE_KEY = 'tc-presenter-songs'

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
async function freshSongStore(seedRaw) {
  const localStorageMock = createLocalStorageMock()
  if (seedRaw !== undefined) localStorageMock.setItem(STORAGE_KEY, seedRaw)
  globalThis.localStorage = localStorageMock

  importCounter++
  const mod = await import(`./SongStore.js?case=${importCounter}`)
  return { mod, localStorageMock }
}

describe('SongStore', () => {
  test('최초 실행(저장된 데이터 없음) — 빈 목록으로 시작한다', async () => {
    const { mod } = await freshSongStore(undefined)
    assert.deepEqual(mod.getSongs(), [])
  })

  test('addSong — 목록에 반영되고 localStorage에 실제로 저장된다', async () => {
    const { mod, localStorageMock } = await freshSongStore(undefined)
    const song = { id: 's1', title: '주 하나님 지으신 모든 세계', lyrics: [], tags: ['찬양'] }

    mod.addSong(song)

    assert.deepEqual(mod.getSongs(), [song])
    const raw = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.equal(raw.version, 1)
    assert.deepEqual(raw.songs, [song])
  })

  test('getSongById — 존재/미존재 케이스', async () => {
    const song = { id: 's1', title: 'A', lyrics: [], tags: [] }
    const { mod } = await freshSongStore(JSON.stringify({ version: 1, songs: [song] }))

    assert.deepEqual(mod.getSongById('s1'), song)
    assert.equal(mod.getSongById('no-such-id'), null)
  })

  test('updateSong — 해당 id만 교체되고 나머지는 그대로 유지된다', async () => {
    const songA = { id: 's1', title: 'A', lyrics: [], tags: [] }
    const songB = { id: 's2', title: 'B', lyrics: [], tags: [] }
    const { mod, localStorageMock } = await freshSongStore(JSON.stringify({ version: 1, songs: [songA, songB] }))

    const updatedA = { id: 's1', title: 'A 수정됨', lyrics: [], tags: ['태그'] }
    mod.updateSong(updatedA)

    assert.deepEqual(mod.getSongs(), [updatedA, songB])
    const raw = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.deepEqual(raw.songs, [updatedA, songB])
  })

  test('removeSong — 삭제 후 목록/저장소 양쪽에서 제거된다', async () => {
    const songA = { id: 's1', title: 'A', lyrics: [], tags: [] }
    const songB = { id: 's2', title: 'B', lyrics: [], tags: [] }
    const { mod, localStorageMock } = await freshSongStore(JSON.stringify({ version: 1, songs: [songA, songB] }))

    mod.removeSong('s1')

    assert.deepEqual(mod.getSongs(), [songB])
    const raw = JSON.parse(localStorageMock.getItem(STORAGE_KEY))
    assert.deepEqual(raw.songs, [songB])
  })

  test('손상된 Song 하나가 섞여 있어도, 정상 Song만 살아남고 손상된 것만 제외된다', async () => {
    const validSong = { id: 's1', title: '정상곡', lyrics: [], tags: [] }
    const corruptSong = { id: 's2', title: 123, lyrics: [], tags: [] } // title이 문자열이 아님 -> 무효
    const { mod } = await freshSongStore(JSON.stringify({ version: 1, songs: [validSong, corruptSong] }))

    assert.deepEqual(mod.getSongs(), [validSong])
  })

  test('완전히 손상된 데이터(songs가 배열이 아님)는 빈 목록으로 폴백한다', async () => {
    const { mod } = await freshSongStore(JSON.stringify({ version: 1, songs: 'not-an-array' }))
    assert.deepEqual(mod.getSongs(), [])
  })

  test('JSON 파싱 자체가 실패하는 손상 데이터도 빈 목록으로 폴백한다', async () => {
    const { mod } = await freshSongStore('{ this is not valid json')
    assert.deepEqual(mod.getSongs(), [])
  })
})
