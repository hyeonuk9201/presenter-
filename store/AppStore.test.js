/**
 * AppStore.test.js
 *
 * reduce()/deriveMutations()/markModifiedSongSections 경로 회귀 테스트
 * (TODO.md "핵심 계층 회귀 테스트 구축", 기술 부채 감사 TD-3).
 *
 * 이 파일은 Store 계층 자체를 검증하므로 dispatch()를 직접 호출한다 —
 * "모든 상태 변경은 CommandBus 경유" 규칙은 앱 코드(UI)에 대한 것이고,
 * Store의 단위 테스트는 Store의 공개 API(dispatch)를 직접 시험하는 것이
 * 맞다. CommandBus/History와의 통합은 command/CommandBus.test.js와
 * history/HistoryManager.test.js가 다룬다.
 *
 * AppStore는 모듈 싱글톤이라 테스트 간 state가 누적된다 — 각 테스트는
 * 자신이 만든 Page의 id로만 조회/검증해 서로 간섭하지 않게 한다.
 * (node --test는 파일 단위로 프로세스를 분리하므로 다른 테스트 파일과는
 * 격리된다.)
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { dispatch, getState, registerSubscriber, unregisterSubscriber, getSelectedPage, getLivePage } from './AppStore.js'
import { createTextPage } from '../domain/Page.js'
import { createSong, createLyricBlock } from '../domain/Song.js'

function findPage(id) {
  return getState().presentation.pages.find(p => p.id === id) ?? null
}

describe('AppStore — reduce()', () => {
  test('ADD_PAGE — pages에 추가된다', () => {
    const page = createTextPage({ text: 'add-1' })
    dispatch({ type: 'ADD_PAGE', page })
    assert.equal(findPage(page.id).text, 'add-1')
  })

  test('UPDATE_PAGE — 대상 Page만 교체되고 다른 Page 참조는 유지된다', () => {
    const a = createTextPage({ text: 'up-a' })
    const b = createTextPage({ text: 'up-b' })
    dispatch({ type: 'ADD_PAGE', page: a })
    dispatch({ type: 'ADD_PAGE', page: b })

    dispatch({ type: 'UPDATE_PAGE', page: { ...a, text: 'up-a2' } })
    assert.equal(findPage(a.id).text, 'up-a2')
    // 무관한 Page는 객체 참조 자체가 그대로 — BroadcastOutput의 참조
    // 비교 dedupe(9-7)가 이 성질에 기대고 있다.
    assert.equal(findPage(b.id), b)
  })

  test('REMOVE_PAGE — 선택/송출 중이던 Page를 지우면 selection/live도 함께 해제된다', () => {
    const page = createTextPage({ text: 'rm-1' })
    dispatch({ type: 'ADD_PAGE', page })
    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    dispatch({ type: 'GO_LIVE', pageId: page.id })

    dispatch({ type: 'REMOVE_PAGE', pageId: page.id })
    assert.equal(findPage(page.id), null)
    assert.equal(getState().presenterState.selectedPageId, null)
    assert.equal(getState().presenterState.livePageId, null)
  })

  test('REMOVE_PAGE — 무관한 Page를 지우면 selection/live는 유지된다', () => {
    const keep = createTextPage({ text: 'rm-keep' })
    const gone = createTextPage({ text: 'rm-gone' })
    dispatch({ type: 'ADD_PAGE', page: keep })
    dispatch({ type: 'ADD_PAGE', page: gone })
    dispatch({ type: 'SELECT_PAGE', pageId: keep.id })
    dispatch({ type: 'GO_LIVE', pageId: keep.id })

    dispatch({ type: 'REMOVE_PAGE', pageId: gone.id })
    assert.equal(getState().presenterState.selectedPageId, keep.id)
    assert.equal(getState().presenterState.livePageId, keep.id)
  })

  test('selectedPageId와 livePageId는 독립이다(D-003)', () => {
    const a = createTextPage({ text: 'sel' })
    const b = createTextPage({ text: 'live' })
    dispatch({ type: 'ADD_PAGE', page: a })
    dispatch({ type: 'ADD_PAGE', page: b })

    dispatch({ type: 'SELECT_PAGE', pageId: a.id })
    dispatch({ type: 'GO_LIVE', pageId: b.id })
    assert.equal(getSelectedPage().id, a.id)
    assert.equal(getLivePage().id, b.id)

    dispatch({ type: 'CLEAR_SELECTION' })
    assert.equal(getSelectedPage(), null)
    assert.equal(getLivePage().id, b.id) // live는 영향 없음

    dispatch({ type: 'CLEAR_LIVE' })
    assert.equal(getLivePage(), null)
  })

  test('SET_APP_MODE — appMode만 바뀐다(비영속 런타임 상태, Phase B)', () => {
    dispatch({ type: 'SET_APP_MODE', mode: 'live' })
    assert.equal(getState().presenterState.appMode, 'live')
    dispatch({ type: 'SET_APP_MODE', mode: 'edit' })
    assert.equal(getState().presenterState.appMode, 'edit')
  })

  test('알 수 없는 action — state 참조가 그대로다(no-op, 이벤트 생략)', () => {
    const before = getState()
    dispatch({ type: 'NO_SUCH_ACTION' })
    assert.equal(getState(), before)
  })
})

describe('AppStore — deriveMutations / Mutation Subscriber', () => {
  test('REMOVE_PAGE(선택+송출 중) 1회 dispatch = notify 1회, Mutation 3종 동시 도출', () => {
    const page = createTextPage({ text: 'mut-1' })
    dispatch({ type: 'ADD_PAGE', page })
    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    dispatch({ type: 'GO_LIVE', pageId: page.id })

    const calls = []
    registerSubscriber({
      id: 'test-mut-1',
      interestedMutations: ['SET_PAGES', 'SET_SELECTION', 'SET_LIVE_PAGE'],
      notify: (mutations) => calls.push(mutations),
    })
    dispatch({ type: 'REMOVE_PAGE', pageId: page.id })
    unregisterSubscriber('test-mut-1')

    // PersistenceSubscriber의 "notify 1회 = save 1회" 계약이 기대는 성질
    assert.equal(calls.length, 1)
    assert.deepEqual([...calls[0]].sort(), ['SET_LIVE_PAGE', 'SET_PAGES', 'SET_SELECTION'])
  })

  test('SELECT_PAGE는 SET_SELECTION만 도출한다', () => {
    const page = createTextPage({ text: 'mut-2' })
    dispatch({ type: 'ADD_PAGE', page })

    const calls = []
    registerSubscriber({
      id: 'test-mut-2',
      interestedMutations: ['SET_PAGES', 'SET_SELECTION'],
      notify: (mutations) => calls.push(mutations),
    })
    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    unregisterSubscriber('test-mut-2')

    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], ['SET_SELECTION'])
  })

  test('관심 없는 Mutation만 발생하면 notify가 호출되지 않는다(타겟 통지)', () => {
    const page = createTextPage({ text: 'mut-3' })
    dispatch({ type: 'ADD_PAGE', page })

    let called = 0
    registerSubscriber({
      id: 'test-mut-3',
      interestedMutations: ['SET_TITLE'],
      notify: () => { called++ },
    })
    dispatch({ type: 'SELECT_PAGE', pageId: page.id })
    unregisterSubscriber('test-mut-3')

    assert.equal(called, 0)
  })
})

describe('AppStore — Song Section isModified (D-021 규칙 5)', () => {
  test('IMPORT_SONG_AS_SECTION 자신은 isModified를 세우지 않고, 이후 Page 수정이 세운다', () => {
    const song = createSong({
      title: '테스트 곡',
      lyrics: [createLyricBlock({ label: 'Verse 1', text: '가사 한 줄' })],
    })
    dispatch({ type: 'IMPORT_SONG_AS_SECTION', song })

    const { presentation } = getState()
    const section = presentation.sectionIds
      .map(id => presentation.sectionMap[id])
      .find(s => s.sourceSongId === song.id)
    assert.ok(section, 'Song에서 만들어진 Section이 존재해야 한다')
    assert.equal(section.isModified, false) // 가져오기 직후는 미수정 상태

    const imported = getState().presentation.pages.find(p => p.sectionId === section.id)
    assert.ok(imported, 'Section 소속 Page가 생성돼야 한다')

    dispatch({ type: 'UPDATE_PAGE', page: { ...imported, text: '수정된 가사' } })
    assert.equal(getState().presentation.sectionMap[section.id].isModified, true)
  })

  test('REIMPORT_SONG_SECTION은 isModified를 다시 세우지 않는다(리셋 직후 오탐 방지)', () => {
    const song = createSong({
      title: '재가져오기 곡',
      lyrics: [createLyricBlock({ label: 'V1', text: '원본' })],
    })
    dispatch({ type: 'IMPORT_SONG_AS_SECTION', song })
    const { presentation } = getState()
    const section = presentation.sectionIds
      .map(id => presentation.sectionMap[id])
      .find(s => s.sourceSongId === song.id)

    // Page를 건드려 isModified를 true로 만든 뒤
    const page = getState().presentation.pages.find(p => p.sectionId === section.id)
    dispatch({ type: 'UPDATE_PAGE', page: { ...page, text: '로컬 수정' } })
    assert.equal(getState().presentation.sectionMap[section.id].isModified, true)

    // 재가져오기 — Page 목록이 통째로 바뀌지만 "수정됨"으로 오탐하면 안 된다
    dispatch({ type: 'REIMPORT_SONG_SECTION', sectionId: section.id, song })
    assert.equal(getState().presentation.sectionMap[section.id].isModified, false)
  })
})
