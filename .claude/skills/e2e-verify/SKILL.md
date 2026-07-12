---
name: e2e-verify
description: Verify ui/*.js, index.html, or output.html changes with a temporary Playwright E2E script using the project's verified launch recipe, then record one line in docs/ManualTestChecklist.md.
---

# E2E Verify Workflow

## Trigger

Run this BEFORE committing any change to `ui/*.js`, `index.html`, or
`output.html` embedded scripts (same condition as CLAUDE.md's 검증
(D-028) section). Not needed for domain/store/persistence/command/
history-only changes — those use `node --test`.

## Why this exact recipe (do not improvise)

- The app uses ES Modules, which Chromium blocks over `file://` —
  you MUST serve the project over http. The template below embeds a
  tiny static server; no extra dependency or global install needed.
- The project lives on a UNC path (`\\wsl.localhost\...`). Use
  `fileURLToPath()` to resolve the project root — manual string
  manipulation of `import.meta.url` breaks on UNC (verified failure).
- Playwright + Chromium are installed on the Windows side; run the
  script with Windows `node` from the project root.

## Steps

1. Create `_e2e_tmp.mjs` in the project root from the template below.
2. Replace the marked section with your test scenario (click buttons,
   assert DOM/state). Keep the boot check and the JS-error collectors.
3. Run: `node _e2e_tmp.mjs` (from the project root, Windows node).
4. If it fails: fix the code (or the scenario) and re-run until PASS.
5. Delete `_e2e_tmp.mjs`. Never commit it.
6. Append one line to `docs/ManualTestChecklist.md`: date, what was
   verified, result (e.g. `2026-07-13 — Overlay 켜고 끄기 E2E 4건 통과`).

## Template (verified 2026-07-13 — boots the app, fails on any JS error)

```js
// e2e-verify 임시 스크립트 — 검증 후 삭제한다. 커밋 금지.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = fileURLToPath(new URL('.', import.meta.url)) // UNC 경로 호환 — 문자열 조작 금지
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
}

const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0])
    const body = await readFile(join(ROOT, path))
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end()
  }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

await page.goto(`${base}/index.html`)
await page.waitForSelector('#app', { timeout: 5000 }) // 부팅 확인

// ── 여기에 검증 시나리오 작성 (버튼 클릭, 상태 확인 등) ──
// 예: await page.click('#some-button'); await page.waitForSelector('.expected')

await browser.close()
server.close()

if (errors.length > 0) {
  console.error(`FAIL — JS 에러 ${errors.length}건:\n` + errors.join('\n'))
  process.exit(1)
}
console.log('PASS — JS 에러 0건')
```

## Notes

- To test `output.html` (BroadcastChannel), open a second page in the
  same browser context: `const out = await browser.newPage()` then
  `await out.goto(base + '/output.html')` — same-origin pages share
  the channel. Attach the same error collectors to it.
- If the scenario needs a clean slate, clear storage before boot:
  `await page.context().addInitScript(() => localStorage.clear())`.
