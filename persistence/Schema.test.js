/**
 * Schema.test.js
 *
 * 저장 스냅샷 버전/마이그레이션 회귀 테스트 (TODO.md "핵심 계층 회귀
 * 테스트 구축", 기술 부채 감사 TD-3). 순수 함수만 다루므로 전역
 * 폴리필이 필요 없다.
 *
 * v1 → v2 마이그레이션(D-Editor-4)은 "옛 Range 모델의 재현 계산"이라
 * 이 파일이 유일한 자동 검증 지점이다 — domain/Presentation.js는 옛
 * 모델을 더 이상 모른다(Schema.js 헤더 참조).
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { CURRENT_SCHEMA_VERSION, migrateSnapshot, withSchemaVersion } from './Schema.js'

describe('Schema — 버전 부여', () => {
  test('CURRENT_SCHEMA_VERSION은 2다 — 버전을 올리면 이 파일의 마이그레이션 테스트도 함께 갱신해야 한다', () => {
    assert.equal(CURRENT_SCHEMA_VERSION, 2)
  })

  test('withSchemaVersion — version 필드를 붙이고 데이터는 보존한다', () => {
    const out = withSchemaVersion({ title: 't', pages: [], sectionIds: [], sectionMap: {} })
    assert.equal(out.version, CURRENT_SCHEMA_VERSION)
    assert.equal(out.title, 't')
    assert.deepEqual(out.pages, [])
  })
})

describe('Schema — migrateSnapshot', () => {
  test('미래 버전은 null을 반환한다(잘못 해석하는 대신 폴백)', () => {
    assert.equal(migrateSnapshot({ version: CURRENT_SCHEMA_VERSION + 1, title: 'x' }), null)
  })

  test('현재 버전(v2)은 변환 없이 통과한다', () => {
    const raw = {
      version: 2,
      title: 't',
      pages: [{ id: 'p1', type: 'text', sectionId: null }],
      sectionIds: [],
      sectionMap: {},
    }
    const out = migrateSnapshot(raw)
    assert.equal(out.title, 't')
    assert.equal(out.pages[0].id, 'p1')
  })

  test('version 필드가 없으면 v1으로 간주하고 v2로 마이그레이션한다', () => {
    const out = migrateSnapshot({ title: 't', pages: [{ id: 'p1', type: 'text' }] })
    // v2 형태: sectionIds/sectionMap 존재, pages에 sectionId 채워짐
    assert.deepEqual(out.sectionIds, [])
    assert.deepEqual(out.sectionMap, {})
    assert.equal(out.pages[0].sectionId, null)
    assert.ok(!('sections' in out)) // 옛 필드는 제거된다
  })

  test('v1 → v2 — 옛 sections[](startPageId)의 Range를 역산해 Page.sectionId를 채운다', () => {
    const raw = {
      version: 1,
      title: 't',
      pages: [
        { id: 'p1', type: 'text' }, // 첫 Section 시작 전 — 미분류로 남아야 함
        { id: 'p2', type: 'text' }, // sA 시작
        { id: 'p3', type: 'text' }, // sA 구간
        { id: 'p4', type: 'text' }, // sB 시작
      ],
      sections: [
        { id: 'sB', title: 'B', note: '', collapsed: false, color: null, startPageId: 'p4' },
        { id: 'sA', title: 'A', note: '', collapsed: false, color: null, startPageId: 'p2' },
      ],
    }
    const out = migrateSnapshot(raw)

    const sectionIdOf = id => out.pages.find(p => p.id === id).sectionId
    assert.equal(sectionIdOf('p1'), null)
    assert.equal(sectionIdOf('p2'), 'sA')
    assert.equal(sectionIdOf('p3'), 'sA')
    assert.equal(sectionIdOf('p4'), 'sB')

    // sectionIds는 저장 배열 순서가 아니라 실제 위치(startIndex) 순
    assert.deepEqual(out.sectionIds, ['sA', 'sB'])
    // startPageId는 폐기된다(D-Editor-4)
    assert.ok(!('startPageId' in out.sectionMap.sA))
    assert.equal(out.sectionMap.sB.title, 'B')
  })

  test('v1 → v2 — 참조가 끊긴 Section(존재하지 않는 startPageId)은 버려진다', () => {
    const raw = {
      version: 1,
      title: 't',
      pages: [{ id: 'p1', type: 'text' }],
      sections: [
        { id: 'sGhost', title: 'G', startPageId: 'no-such-page' },
        { id: 'sA', title: 'A', startPageId: 'p1' },
      ],
    }
    const out = migrateSnapshot(raw)
    assert.deepEqual(out.sectionIds, ['sA'])
    assert.ok(!('sGhost' in out.sectionMap))
    assert.equal(out.pages[0].sectionId, 'sA')
  })
})
