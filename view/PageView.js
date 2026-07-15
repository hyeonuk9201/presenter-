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
 * Media (Step6, 2026-06-27):
 *   page.type === 'image' / 'video'일 때 media 인자를 사용해 렌더링한다.
 *   media는 blob URL 문자열이다(MediaRuntimeCache.peek(page.mediaId)의 반환값을
 *   호출부가 그대로 넘겨준다 — 이 파일은 MediaRuntimeCache를 직접 import하지
 *   않는다). 이 파일은 여전히 순수 동기 함수다: IO를 하지 않고, media가 이미
 *   준비된 문자열로 주어진다고만 가정한다. media 준비(IndexedDB 조회 →
 *   캐시 채우기)는 Command 단계(command/CommandBus.js)의 책임이다.
 *   media가 null/undefined로 들어오면(캐시 미스 — preloadMedia가 IndexedDB에서
 *   레코드를 못 찾은 경우 등) "미디어 없음"을 시각적으로 표시한다 — 빈 화면
 *   대신 사용자가 무엇이 잘못됐는지 알 수 있게 한다.
 */

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * Page → HTMLElement
 * @param {object} page  - Page 도메인 객체
 * @param {string|null} media - blob URL 문자열 (image/video 타입의 콘텐츠 미디어). text 타입에는 영향 없음.
 * @param {string|null} backgroundMedia - blob URL 문자열 (text Page의 배경 미디어, D-032). 다른 타입에는 영향 없음.
 * @returns {HTMLElement}
 */
export function createPageView(page, media = null, backgroundMedia = null) {
  const slide = document.createElement('div')
  slide.className = 'slide'
  slide.dataset.pageId = page.id
  slide.dataset.pageType = page.type

  applyBackground(slide, page)

  if (page.type === 'text') {
    // 배경 미디어(D-032) — 텍스트 뒤에 깔린다. image/video Page의 오버레이와
    // 대칭이며 DOM 순서도 동일하다: 미디어 레이어를 먼저 append해 텍스트가
    // 위에 오게 한다. backgroundMediaId만 있고 blob(backgroundMedia)이 없으면
    // (캐시 미스) 기존 미디어 레이어가 "미디어 없음" placeholder를 보여준다.
    if (page.backgroundMediaId) {
      slide.appendChild(
        page.backgroundMediaType === 'video'
          ? createVideoLayer(backgroundMedia)
          : createImageLayer(backgroundMedia),
      )
    }
    slide.appendChild(createTextLayer(page))
  } else if (page.type === 'image') {
    slide.appendChild(createImageLayer(media))

    // 이미지 위 텍스트 오버레이(2026-07-05) — 9-7에서 video에 만든 것과
    // 완전히 동일한 패턴. 에디터 UI는 이미 타입 무관하게 동작하므로
    // 여기서 막던 것도 video 때와 같은 이유(렌더러가 안 그림)였다.
    if (page.text) {
      slide.appendChild(createTextLayer(page))
    }
  } else if (page.type === 'video') {
    slide.appendChild(createVideoLayer(media))

    // 영상 위 텍스트 오버레이(2026-07-02, 실사용 요청). 에디터 UI(lyrics-input
    // + 스타일 사이드바)는 이미 Page 타입과 무관하게 동작해 UPDATE_PAGE로
    // text/fontSize/color 등을 어떤 타입의 Page에도 저장할 수 있었다 —
    // 막혀있던 건 여기, video 타입일 때 텍스트 레이어를 안 그리던 것뿐이다.
    // text가 없으면(일반 영상 Page) 기존과 동일하게 아무것도 안 그린다.
    if (page.text) {
      slide.appendChild(createTextLayer(page))
    }
  }

  return slide
}

// ─────────────────────────────────────────
// 내부 함수
// ─────────────────────────────────────────

function applyBackground(el, page) {
  // Future: page.backgroundMediaId → media 객체로 배경 설정
  // Future: page.backgroundColor → 단색 배경
  // image/video Page는 콘텐츠 자체가 화면을 채우므로(아래 object-fit: contain),
  // 빈 여백이 보일 수 있다 — 배경은 검정 고정으로 충분하다(범위 단순화).
  el.style.backgroundColor = page.backgroundColor ?? '#000000'
}

/**
 * 이미지 레이어. media(blob URL)가 없으면 "미디어 없음" placeholder를 보여준다.
 * fit(cover/contain) 옵션은 후속 단계 — 지금은 contain 고정(2026-06-27 합의,
 * Page.js의 createImagePage 주석 참조 — 표현 옵션은 범위 밖).
 */
function createImageLayer(media) {
  const layer = document.createElement('div')
  layer.className = 'media-layer'

  if (!media) {
    layer.appendChild(createMediaMissingPlaceholder())
    return layer
  }

  const img = document.createElement('img')
  img.className = 'slide-image'
  img.src = media
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'contain'

  layer.appendChild(img)
  return layer
}

/**
 * 영상 레이어. media(blob URL)가 없으면 "미디어 없음" placeholder를 보여준다.
 * autoplay/muted/loop는 고정 default로 구현됨(9-5, 2026-07-02) — controls도
 * 함께 노출해 필요 시 수동 제어 가능하게 한다. Page별 on/off 옵션은 범위 밖
 * (domain/Page.js의 createVideoPage 주석 참조).
 */
function createVideoLayer(media) {
  const layer = document.createElement('div')
  layer.className = 'media-layer'

  if (!media) {
    layer.appendChild(createMediaMissingPlaceholder())
    return layer
  }

  const video = document.createElement('video')
  video.className = 'slide-video'
  video.src = media
  video.controls = true
  video.autoplay = true
  video.muted = true // 브라우저 autoplay 정책상 필수 — 사용자가 원하는 default(9-5, 2026-07-02)
  video.loop = true
  video.playsInline = true // iOS Safari가 video를 OS 레벨 오버레이 평면으로 렌더링해
                            // z-index/DOM 순서를 무시하고 항상 최상단에 그리는 문제 방지.
                            // 영상+텍스트 오버레이(9-7)가 iPad에서 텍스트가 영상에
                            // 가려 안 보이던 원인(2026-07-02, 실사용 발견).
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'contain'

  layer.appendChild(video)
  return layer
}

/**
 * media 캐시 미스 시 표시하는 placeholder. 빈 화면 대신 사용자가 문제를
 * 인지할 수 있게 한다 — Live 중에 이게 보이면 잘못된 파일/누락된 mediaId를
 * 바로 알 수 있어야 한다.
 */
function createMediaMissingPlaceholder() {
  const el = document.createElement('div')
  el.className = 'media-missing'
  el.textContent = '미디어를 찾을 수 없음'
  el.style.color = '#ff6666'
  el.style.fontSize = '32px'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.width = '100%'
  el.style.height = '100%'
  return el
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
