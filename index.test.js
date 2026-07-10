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

// '<elementId>' 버튼의 addEventListener('click', () => { ... }) 또는
// addEventListener('click', async () => { ... }) 콜백 본문만 중괄호
// 짝을 맞춰 추출한다.
function extractClickHandlerBody(script, elementId) {
  const marker = new RegExp(
    `document\\.getElementById\\('${elementId}'\\)\\.addEventListener\\('click',\\s*(?:async\\s*)?\\(\\)\\s*=>\\s*\\{`,
  )
  const match = marker.exec(script)
  if (!match) throw new Error(`'${elementId}' 클릭 핸들러를 찾을 수 없음`)

  const bodyStart = match.index + match[0].length
  let depth = 1
  let i = bodyStart
  while (depth > 0 && i < script.length) {
    if (script[i] === '{') depth++
    else if (script[i] === '}') depth--
    i++
  }
  return script.slice(bodyStart, i - 1)
}

// 주석(// 한 줄, /* 여러 줄) 안의 문자열은 제외하고 실제 코드에서만
// 특정 패턴을 찾기 위한 헬퍼 — 이 프로젝트 다른 파일들의 주석이 설명
// 목적으로 "prompt()"라는 문자열 자체를 자주 언급하기 때문에, 순수
// 텍스트 검색만으로는 오탐이 난다.
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
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

describe('prompt() 취약점 근본 해결 회귀 가드 (2026-07-11)', () => {
  const script = extractModuleScript(html)
  const codeOnly = stripComments(script)

  test('실제 코드에는 prompt() 호출이 더 이상 없다', () => {
    // 이 assert가 깨지면 Section 추가나 스타일 프리셋 저장이 다시
    // 브라우저 네이티브 prompt()로 되돌아간 것이다 — 반복 호출 차단
    // 체크박스에 걸리면 버튼이 안 먹는 것처럼 보이는 그 버그.
    assert.doesNotMatch(codeOnly, /\bprompt\s*\(/)
  })

  test('showTextPrompt() 헬퍼가 정의돼 있다', () => {
    assert.match(codeOnly, /function showTextPrompt\(/)
  })

  test('add-section-btn 핸들러가 showTextPrompt()를 사용한다', () => {
    const body = extractClickHandlerBody(script, 'add-section-btn')
    assert.match(body, /await showTextPrompt\(/)
  })

  test('preset-save-btn 핸들러가 showTextPrompt()를 사용한다', () => {
    // presetSaveBtn은 getElementById가 아니라 변수로 참조되므로, 이
    // 핸들러가 프리셋 이름을 받을 때 showTextPrompt를 거치는지는
    // 전체 스크립트 안에서 "프리셋 이름" 호출 지점 근처를 직접 확인한다.
    const idx = codeOnly.indexOf("title: '프리셋 이름'")
    assert.notEqual(idx, -1, "'프리셋 이름' 호출부를 찾을 수 없음")
    assert.match(codeOnly.slice(Math.max(0, idx - 80), idx), /showTextPrompt/)
  })
})
