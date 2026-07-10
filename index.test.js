/**
 * index.test.js
 * Ownership: index.html의 embedded module script 중, DOM 없이도
 * 소스 레벨에서 회귀를 잡을 수 있는 특정 지점만 검증한다.
 *
 * index.html은 하나의 거대한 비-모듈 스크립트라 실제 클릭/렌더링을
 * 자동화하려면 jsdom + 전체 부트스트랩(Store/CommandBus/MediaStore 등)이
 * 필요하다 — D-028에서 이 계층은 자동화 대상에서 제외하고 수동 검증
 * (ManualTestChecklist.md)으로 남기기로 결정했다.
 *
 * 이 파일은 그 예외로, "고쳤던 버그가 소스에서 다시 사라지는지"만
 * 문자열 레벨로 감시하는 회귀 가드다 — 실제 DOM 동작을 검증하지
 * 않는다(그건 여전히 ManualTestChecklist.md의 몫).
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(join(__dirname, 'index.html'), 'utf8')

function extractModuleScript(source) {
  const match = source.match(/<script type="module">([\s\S]*?)<\/script>/)
  if (!match) throw new Error('index.html에서 <script type="module"> 블록을 찾을 수 없음')
  return match[1]
}

// '<elementId>' 버튼의 addEventListener('click', () => { ... }) 콜백
// 본문만 중괄호 짝을 맞춰 추출한다.
function extractClickHandlerBody(script, elementId) {
  const marker = `document.getElementById('${elementId}').addEventListener('click', () => {`
  const start = script.indexOf(marker)
  if (start === -1) throw new Error(`'${elementId}' 클릭 핸들러를 찾을 수 없음`)

  const bodyStart = start + marker.length
  let depth = 1
  let i = bodyStart
  while (depth > 0 && i < script.length) {
    if (script[i] === '{') depth++
    else if (script[i] === '}') depth--
    i++
  }
  return script.slice(bodyStart, i - 1)
}

describe('Library 모달 — pendingDeleteSongId 초기화 회귀 가드', () => {
  const script = extractModuleScript(html)
  const handlerBody = extractClickHandlerBody(script, 'library-btn')

  test('library-btn 클릭 핸들러가 pendingDeleteSongId를 null로 리셋한다', () => {
    // 이 assert가 깨지면 "삭제 1단계 후 모달을 닫았다 열면 2단계 확인이
    // 무력화되는" 버그가 되돌아온 것이다.
    assert.match(handlerBody, /pendingDeleteSongId\s*=\s*null/)
  })

  test('리셋이 모달을 화면에 띄우기 전에 실행된다', () => {
    const resetIndex = handlerBody.search(/pendingDeleteSongId\s*=\s*null/)
    const showIndex = handlerBody.indexOf("libraryModal.style.display = 'flex'")
    assert.notEqual(resetIndex, -1)
    assert.notEqual(showIndex, -1)
    assert.ok(resetIndex < showIndex, '리셋은 모달을 보여주기 전에 실행돼야 한다')
  })
})
