/**
 * PageView.js
 * Ownership: Page 객체 → HTMLElement 생성
 * Change Reason: 렌더링 방식(DOM 구조/스타일)이 바뀔 때만 수정
 *
 * 규칙:
 *   1. DOM 요소를 만들어 반환한다.
 *   2. DOM에 붙이지 않는다. 붙이는 건 호출한 쪽의 책임.
 *   3. Store에 접근하지 않는다.
 *   4. 이벤트를 등록하지 않는다.
 *
 * Future:
 *   page.type === 'image' → ImageView
 *   page.type === 'video' → VideoView
 *   각 type별 View로 위임하는 구조로 확장 가능
 */

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Page → HTMLElement
 * @param {object} page  - Page 도메인 객체
 * @param {object} media - Media 객체 (현재 미사용, 구조만 확보)
 * @returns {HTMLElement}
 */
export function createPageView(page, media = null) {
  const slide = document.createElement('div')
  slide.className = 'slide'
  slide.dataset.pageId = page.id
  slide.dataset.pageType = page.type

  // 배경 (Future: media 타입에 따라 분기)
  applyBackground(slide, page, media)

  // 콘텐츠
  if (page.type === 'text') {
    slide.appendChild(createTextLayer(page))
  }

  // Future:
  // if (page.type === 'image') slide.appendChild(createImageLayer(media))
  // if (page.type === 'video') slide.appendChild(createVideoLayer(media))

  return slide
}

// ─────────────────────────────────────────
// 내부 함수
// ─────────────────────────────────────────

function applyBackground(el, page, media) {
  // Future: page.backgroundMediaId → media 객체로 배경 설정
  // Future: page.backgroundColor → 단색 배경
  el.style.backgroundColor = page.backgroundColor ?? '#000000'
}

function createTextLayer(page) {
  const layer = document.createElement('div')
  layer.className = 'text-layer'

  // 텍스트
  const textEl = document.createElement('div')
  textEl.className = 'slide-text'
  textEl.textContent = page.text ?? ''

  // 스타일 적용
  applyTextStyle(textEl, page)

  layer.appendChild(textEl)
  return layer
}

function applyTextStyle(el, page) {
  el.style.fontSize     = `${page.fontSize ?? 72}px`
  el.style.textAlign    = page.horizontalAlign ?? 'center'

  // verticalAlign은 부모 flex로 처리
  el.dataset.verticalAlign = page.verticalAlign ?? 'bottom'
}
