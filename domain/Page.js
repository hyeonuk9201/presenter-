/**
 * Page.js
 * Ownership: Page 데이터 구조 정의 및 생성
 * Change Reason: Page 스펙이 바뀔 때만 수정
 *
 * 이 파일은 순수 데이터 구조만 다룬다.
 * DOM, Store, 렌더링에 대해 알지 못한다.
 */

import { generateId } from '../utils/id.js'

// ─────────────────────────────────────────
// Page 생성
// ─────────────────────────────────────────

/**
 * 텍스트 Page 생성
 *
 * 필드 분류 주석은 미래 content/style 분리 시
 * 어떤 필드가 어느 쪽으로 가는지 기록해둔 것이다.
 * MVP에서는 플랫 구조를 유지한다.
 */
export function createTextPage({
  text = '',
  fontSize = 72,
  horizontalAlign = 'center',
  verticalAlign = 'bottom',
  color = '#ffffff',
  lineHeight = 1.3,
  fontWeight = 'normal',
  textStroke = 0,
  textShadow = false,
} = {}) {
  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'text',

    // ── Content ───────────────────────────
    // 미래: page.content.text
    text,

    // ── Style ─────────────────────────────
    // 미래: page.style.fontSize / horizontalAlign / verticalAlign / color / lineHeight / fontWeight / textStroke / textShadow
    // 미래: stylePresetId 로 교체 가능
    fontSize,
    horizontalAlign, // 'left' | 'center' | 'right'
    verticalAlign,   // 'top'  | 'middle' | 'bottom'
    color,           // 텍스트 색상 (Hex). 기본값은 어두운 배경 가정 흰색.
    lineHeight,      // 배수(multiplier). fontSize에 곱해지는 비율 — 절대 px 아님.
    fontWeight,      // 'normal' | 'bold'. 시스템 폰트 굵기만 지원 (웹폰트/폰트 패밀리는 범위 밖).
    textStroke,      // 외곽선 두께(px). 0이면 없음. 색상은 검정 고정(범위 단순화, 영상 배경 대비용 표준 조합).
    textShadow,      // 그림자 on/off. 세부 오프셋/불투명도 조정 없음(범위 단순화).

    // ── Future (미구현) ────────────────────
    // backgroundMediaId: null, // 배경 미디어
    // backgroundColor: null,   // 배경 단색
    // stylePresetId: null,     // StylePreset 도입 시
  }
}

/**
 * 이미지 Page 생성 (Step6, 2026-06-27)
 *
 * 텍스트 Page와 동일한 개념의 Page다 — CueList에 들어가고, 클릭하면
 * 미리보기/송출되는 흐름은 완전히 같다. 콘텐츠 타입만 다르다.
 *
 * 이번 MVP 단계에서는 의도적으로 최소 필드만 가진다: id, type, mediaId.
 * fit(cover/contain) 같은 표현 옵션은 후속 단계 — 목표는 우선 CueList →
 * Preview → Output 파이프라인을 완성하는 것이다(2026-06-27 합의).
 *
 * mediaId가 가리키는 실제 Blob은 이 파일이 알지 못한다(media/MediaStore.js
 * 책임). Page는 참조만 들고 있다 — blob URL 같은 휘발성 값은 절대 여기에
 * 들어가지 않는다.
 *
 * @param {{ mediaId: string }} params
 */
export function createImagePage({ mediaId } = {}) {
  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('[Page] createImagePage: mediaId는 필수 문자열이다')
  }

  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'image',

    // ── Content ───────────────────────────
    mediaId, // IndexedDB(MediaStore)에 저장된 Media 레코드 참조

    // ── Future (미구현) ────────────────────
    // fit: 'cover',  // 'cover' | 'contain' — 표현 옵션, 후속 단계
  }
}

/**
 * 영상 Page 생성 (Step6, 2026-06-27)
 *
 * createImagePage와 동일한 설계 — 최소 필드(id, type, mediaId)만 가진다.
 *
 * autoplay/muted/loop(9-5, 2026-07-02)는 Page별로 설정 가능한 필드가 아니라
 * view/PageView.js의 createVideoLayer()에 고정 기본값으로 구현했다 — 브라우저
 * autoplay 정책상 muted 없이는 자동재생 자체가 차단되므로 항상 함께 켜진다.
 * Page 단위로 켜고 끄는 옵션이 필요해지면 그때 필드로 승격한다.
 *
 * 텍스트 오버레이(9-7, 2026-07-02): 생성 시점엔 text 필드를 넣지 않는다.
 * index.html의 에디터 UI(lyrics-input + 스타일 사이드바)가 이미 Page
 * 타입과 무관하게 동작해, video Page 선택 후 텍스트/스타일 입력 →
 * UPDATE_PAGE로 text/fontSize/color/... 필드가 나중에 얹힌다(createTextPage
 * 필드와 완전히 동일한 이름 재사용 — view/PageView.js의 createTextLayer가
 * 그대로 렌더링). text가 없으면(대부분의 영상 Page) 오버레이가 그려지지
 * 않는다.
 *
 * @param {{ mediaId: string }} params
 */
export function createVideoPage({ mediaId } = {}) {
  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('[Page] createVideoPage: mediaId는 필수 문자열이다')
  }

  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'video',

    // ── Content ───────────────────────────
    mediaId,
  }
}

// ─────────────────────────────────────────
// Page 업데이트
// ─────────────────────────────────────────

/**
 * Page를 불변으로 업데이트한다.
 * 원본을 변경하지 않고 새 객체를 반환한다.
 */
export function updatePage(page, changes) {
  return { ...page, ...changes }
}

// ─────────────────────────────────────────
// Page 검증
// ─────────────────────────────────────────

/**
 * Page 검증
 *
 * type별로 필요한 최소 필드까지 함께 검증한다(Step6, 2026-06-27) — type만
 * 보고 통과시키면 mediaId 없는 image/video Page가 통과해버릴 수 있다.
 */
export function isValidPage(page) {
  if (!page || typeof page !== 'object') return false
  if (!page.id || typeof page.id !== 'string') return false
  if (!['text', 'image', 'video'].includes(page.type)) return false

  if (page.type === 'image' || page.type === 'video') {
    if (!page.mediaId || typeof page.mediaId !== 'string') return false
  }

  return true
}
