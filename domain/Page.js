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
// Page 공통 동작(Behavior) 필드 — Transition/AutoAdvance 뼈대 (2026-07-03)
// ─────────────────────────────────────────

/**
 * transition/autoAdvance는 "콘텐츠"가 아니라 "이 Page를 어떻게 넘기는가"에
 * 대한 속성이라, text/image/video 타입과 무관하게 모든 Page가 동일한
 * 모양으로 가진다 — Element 모델(DomainEntityArchitecture.md 참조) 없이도
 * 플랫 구조에 안전하게 얹을 수 있는 필드다(아키텍처 리뷰 2026-07-03 결론).
 *
 * 지금은 값만 존재하고 아무것도 소비하지 않는다:
 *   - view/PageView.js는 transition을 읽지 않는다 — Page 전환 시 항상
 *     즉시 교체(cut)된다. type:'fade'를 넣어도 실제로 fade 되지 않는다.
 *   - autoAdvance를 구독해 다음 Page로 자동 전환하는 타이머/로직이 없다.
 *     enabled:true로 저장해도 아무 일도 일어나지 않는다.
 *
 * 이 필드들이 실제로 뭔가를 하게 만드는 건 후속 단계다. 지금 목적은
 * "나중에 UI/렌더러가 이 필드를 읽기 시작해도 Page 스키마 자체는 안
 * 바뀌게" 미리 자리를 잡아두는 것뿐이다 — Undo/Redo(Page 전체 스냅샷
 * diff)와 Persistence(Page를 통째로 저장)는 새 필드가 늘어나도 이미
 * 자동으로 대응하므로, 여기 추가하는 것만으로 그 두 곳은 손 안 대도 된다.
 */
function createBehaviorDefaults({ transition, autoAdvance } = {}) {
  return {
    // 'none' | 'fade' | 'cut' — 값만 존재, 렌더러가 아직 안 읽음
    transition: {
      type: transition?.type ?? 'none',
      duration: transition?.duration ?? 300, // ms
    },
    // 다음 Page로 자동 전환 — 값만 존재, 아무도 구독 안 함
    autoAdvance: {
      enabled: autoAdvance?.enabled ?? false,
      duration: autoAdvance?.duration ?? 5000, // ms
    },
  }
}

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
  transition,
  autoAdvance,
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

    // ── Behavior (2026-07-03, 뼈대만) ──────
    ...createBehaviorDefaults({ transition, autoAdvance }),

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
export function createImagePage({ mediaId, label = '', transition, autoAdvance } = {}) {
  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('[Page] createImagePage: mediaId는 필수 문자열이다')
  }

  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'image',

    // ── Content ───────────────────────────
    mediaId, // IndexedDB(MediaStore)에 저장된 Media 레코드 참조
    label, // CueList 식별용 표시 이름(2026-07-05). 업로드 시 원본 파일명을
           // 기본값으로 채우고(index.html), 이후 사용자가 자유롭게 수정
           // 가능하다 — MediaStore의 fileName(원본, 불변)과는 별개로,
           // Page 단위로 편집 가능한 별도 필드다.

    // ── Behavior (2026-07-03, 뼈대만) ──────
    ...createBehaviorDefaults({ transition, autoAdvance }),

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
export function createVideoPage({ mediaId, label = '', transition, autoAdvance } = {}) {
  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('[Page] createVideoPage: mediaId는 필수 문자열이다')
  }

  return {
    // ── Identity ──────────────────────────
    id: generateId(),
    type: 'video',

    // ── Content ───────────────────────────
    mediaId,
    label, // domain/Page.js의 createImagePage 주석 참조 — 동일한 용도

    // ── Behavior (2026-07-03, 뼈대만) ──────
    ...createBehaviorDefaults({ transition, autoAdvance }),
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
