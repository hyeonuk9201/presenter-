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
  el.style.color        = page.color ?? '#ffffff'
  el.style.lineHeight   = page.lineHeight ?? 1.3 // 배수 — 단위 없음
  el.style.fontWeight   = page.fontWeight ?? 'normal'
  el.style.textShadow   = buildTextShadow(page)

  // verticalAlign은 부모 flex로 처리
  el.dataset.verticalAlign = page.verticalAlign ?? 'bottom'
}

/**
 * 외곽선(textStroke)과 그림자(textShadow)를 하나의 CSS text-shadow로 합성한다.
 * -webkit-text-stroke 대신 text-shadow 8방향 오프셋으로 외곽선을 흉내내는 이유:
 * iPad/Safari 포함 모든 WebKit 계열에서 안정적으로 동작하며, CSS 표준 속성이라
 * 별도 vendor prefix 분기 없이 동일 코드로 처리 가능하다.
 * 외곽선 색상은 검정으로 고정한다(범위 단순화) — 영상/사진 배경에서도 흰 텍스트+
 * 검정 외곽선 조합은 방송 자막/캡션의 표준 조합이라 배경색이 바뀌어도 대비가
 * 거의 항상 유지된다. 사용자가 검정 텍스트를 검정 배경 위에 두는 경우는 색상
 * 선택의 책임 영역이지 외곽선 기능의 책임 영역이 아니다.
 */
function buildTextShadow(page) {
  const layers = []

  const strokeWidth = page.textStroke ?? 0
  if (strokeWidth > 0) {
    // 8방향 오프셋으로 외곽선 효과 합성
    const offsets = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [0, -1], [0, 1], [-1, 0], [1, 0],
    ]
    offsets.forEach(([dx, dy]) => {
      layers.push(`${dx * strokeWidth}px ${dy * strokeWidth}px 0 #000000`)
    })
  }

  if (page.textShadow) {
    layers.push('2px 2px 6px rgba(0, 0, 0, 0.6)')
  }

  return layers.length > 0 ? layers.join(', ') : 'none'
}
