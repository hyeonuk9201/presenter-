/**
 * Presentation.test.js
 * 범위: 이 파일은 아직 Presentation.js 전체를 커버하지 않는다 — 지금은
 * Song 연동 함수(D-021: importSongAsSection/reimportSongIntoSection)만
 * 다룬다. movePage/moveSectionGroup 등 나머지 함수의 회귀 테스트는
 * 별도 작업으로 남겨둔다.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createPresentation,
  addPage,
  addSection,
  importSongAsSection,
  reimportSongIntoSection,
  getSectionGroups,
} from './Presentation.js'
import { createTextPage } from './Page.js'

function makeSong({ id = 'song-1', title = '테스트곡', lyrics = [{ text: 'A' }, { text: 'B' }] } = {}) {
  return { id, title, lyrics }
}

describe('importSongAsSection', () => {
  test('Song의 각 lyrics 항목을 Page로, Song 자체는 새 Section으로 만든다', () => {
    let presentation = createPresentation({ title: 't' })
    const song = makeSong({ lyrics: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] })

    const next = importSongAsSection(presentation, song)

    assert.equal(next.sectionIds.length, 1)
    const sectionId = next.sectionIds[0]
    const section = next.sectionMap[sectionId]
    assert.equal(section.title, song.title)
    assert.equal(section.sourceSongId, song.id)
    assert.equal(section.isModified, false)

    assert.equal(next.pages.length, 3)
    assert.deepEqual(next.pages.map(p => p.text), ['A', 'B', 'C'])
    assert.ok(next.pages.every(p => p.sectionId === sectionId))
  })

  test('생성된 Page는 자신이 어느 Song/LyricBlock에서 왔는지 모른다 (D-021 규칙 2)', () => {
    let presentation = createPresentation({ title: 't' })
    const song = makeSong()
    const next = importSongAsSection(presentation, song)

    for (const page of next.pages) {
      assert.equal('songId' in page, false)
      assert.equal('lyricBlockId' in page, false)
      assert.equal('sourceSongId' in page, false)
    }
  })

  test('기존 Page/Section이 있어도 그대로 유지하고 새 것을 뒤에 이어붙인다', () => {
    let presentation = createPresentation({ title: 't' })
    const existingSection = { id: 'sec-existing', title: '기존 섹션', note: '', collapsed: false, color: null, sourceSongId: null, isModified: false }
    presentation = addSection(presentation, existingSection)
    presentation = addPage(presentation, createTextPage({ text: '기존 페이지', sectionId: 'sec-existing' }))

    const song = makeSong({ lyrics: [{ text: 'A' }] })
    const next = importSongAsSection(presentation, song)

    assert.equal(next.sectionIds.length, 2)
    assert.equal(next.sectionIds[0], 'sec-existing')
    assert.equal(next.pages.length, 2)
    assert.equal(next.pages[0].text, '기존 페이지') // 기존 Page 순서 그대로
    assert.equal(next.pages[1].text, 'A') // 새 Page는 뒤에 추가
  })

  test('가사가 0개인 Song도 Section은 생성되지만 Page는 0개다 (유령 Section이 되는 경우)', () => {
    let presentation = createPresentation({ title: 't' })
    const song = makeSong({ lyrics: [] })

    const next = importSongAsSection(presentation, song)

    assert.equal(next.sectionIds.length, 1)
    assert.equal(next.pages.length, 0)
    // getSectionGroups()는 pages 기준으로만 그룹을 만들기 때문에, 이 Section은
    // Flow(getSectionGroups) 어디에도 나타나지 않는다 — "유령 Section" 상태.
    const groups = getSectionGroups(next)
    assert.equal(groups.some(g => g.sectionId === next.sectionIds[0]), false)
  })
})

describe('reimportSongIntoSection', () => {
  function buildThreeSectionFlow() {
    let presentation = createPresentation({ title: 't' })
    presentation = importSongAsSection(presentation, makeSong({ id: 'song-before', title: '앞 섹션', lyrics: [{ text: 'before-1' }] }))
    presentation = importSongAsSection(presentation, makeSong({ id: 'song-target', title: '대상 섹션', lyrics: [{ text: 'old-1' }, { text: 'old-2' }] }))
    presentation = importSongAsSection(presentation, makeSong({ id: 'song-after', title: '뒤 섹션', lyrics: [{ text: 'after-1' }] }))
    const targetSectionId = presentation.sectionIds[1]
    return { presentation, targetSectionId }
  }

  test('존재하지 않는 sectionId는 no-op이다', () => {
    const presentation = createPresentation({ title: 't' })
    const next = reimportSongIntoSection(presentation, 'no-such-section', makeSong())
    assert.equal(next, presentation)
  })

  test('대상 Section의 Page만 전체 교체하고, 원래 위치(앞뒤 Section 사이)를 그대로 유지한다', () => {
    const { presentation, targetSectionId } = buildThreeSectionFlow()
    const updatedSong = makeSong({ id: 'song-target', title: '대상 섹션', lyrics: [{ text: 'new-1' }, { text: 'new-2' }, { text: 'new-3' }] })

    const next = reimportSongIntoSection(presentation, targetSectionId, updatedSong)

    assert.deepEqual(
      next.pages.map(p => p.text),
      ['before-1', 'new-1', 'new-2', 'new-3', 'after-1'],
    )
    assert.ok(next.pages.filter(p => p.sectionId === targetSectionId).every(p => ['new-1', 'new-2', 'new-3'].includes(p.text)))
  })

  test('재가져오기 후 isModified가 false로 리셋된다', () => {
    const { presentation, targetSectionId } = buildThreeSectionFlow()
    // 먼저 isModified를 true로 만들어 리셋이 실제로 일어나는지 확인 가능하게 한다
    const dirtied = {
      ...presentation,
      sectionMap: {
        ...presentation.sectionMap,
        [targetSectionId]: { ...presentation.sectionMap[targetSectionId], isModified: true },
      },
    }

    const next = reimportSongIntoSection(dirtied, targetSectionId, makeSong({ id: 'song-target', lyrics: [{ text: 'x' }] }))

    assert.equal(next.sectionMap[targetSectionId].isModified, false)
  })

  test('가사 개수가 줄어들거나 늘어나도 앞뒤 Section 위치는 그대로 유지된다', () => {
    const { presentation, targetSectionId } = buildThreeSectionFlow()

    const shrunk = reimportSongIntoSection(presentation, targetSectionId, makeSong({ id: 'song-target', lyrics: [{ text: 'only-one' }] }))
    assert.deepEqual(shrunk.pages.map(p => p.text), ['before-1', 'only-one', 'after-1'])

    const emptied = reimportSongIntoSection(presentation, targetSectionId, makeSong({ id: 'song-target', lyrics: [] }))
    assert.deepEqual(emptied.pages.map(p => p.text), ['before-1', 'after-1']) // 대상 Section은 유령화
  })

  test('유령 Section(Page가 이미 0개)을 재가져오면 끝에 추가된다', () => {
    let presentation = createPresentation({ title: 't' })
    presentation = importSongAsSection(presentation, makeSong({ id: 'song-a', title: 'A', lyrics: [{ text: 'a-1' }] }))
    presentation = importSongAsSection(presentation, makeSong({ id: 'song-ghost', title: '유령', lyrics: [] })) // Page 0개
    const ghostSectionId = presentation.sectionIds[1]

    const next = reimportSongIntoSection(presentation, ghostSectionId, makeSong({ id: 'song-ghost', lyrics: [{ text: 'revived' }] }))

    assert.deepEqual(next.pages.map(p => p.text), ['a-1', 'revived'])
  })
})
