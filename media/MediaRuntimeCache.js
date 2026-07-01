/**
 * MediaRuntimeCache.js
 * Ownership: mediaId → blob URL 런타임 전용 캐시 (메모리, 비영속)
 * Change Reason: 캐시 정책(채우는 시점/비우는 시점)이 바뀔 때만 수정
 *
 * 핵심 원칙 (2026-06-27 합의):
 *   - 이 캐시는 절대 Page(영속 객체)에 들어가지 않는다. blob URL은
 *     새로고침/새탭에서 무효가 되는 휘발성 값이기 때문이다 (Page는
 *     mediaId만 보유 — domain/Page.js 참조).
 *   - write(채우기)는 오직 Command Handler 내부에서만 일어난다
 *     (CommandBus.js의 preloadMedia()). View/Store/History는 이 모듈에
 *     쓰기 권한이 없다 — 아래 "허용되지 않는 의존" 참조.
 *   - read(조회)는 View(PageView.js, PreviewPanel.js 등)에서 동기로
 *     이루어진다. 이 모듈의 조회 함수(peek)는 절대 비동기가 아니다 —
 *     캐시에 없으면 그냥 null을 반환할 뿐, IndexedDB를 다시 읽지 않는다
 *     (그 책임은 MediaStore.js + CommandBus.js의 preloadMedia()에 있다).
 *
 * 허용되는 의존:
 *   CommandBus.js (preloadMedia) → MediaRuntimeCache (write)
 *   View (PageView.js 등)        → MediaRuntimeCache (read, sync)
 *
 * 허용되지 않는 의존:
 *   View → MediaStore.js (직접 IndexedDB 접근 금지 — View는 동기여야 한다)
 *   History/Reducer → MediaRuntimeCache (write 금지 — History는
 *     deterministic replay여야 하며 media load 같은 부수효과를 갖지 않는다)
 *
 * 탭 경계:
 *   이 캐시는 현재 JS 실행 컨텍스트(탭/창) 전용이다. output.html은 별도
 *   탭이라 이 모듈을 import해도 완전히 독립된 인스턴스를 가진다 — blob
 *   URL을 메인 탭에서 만들어 전달하는 방식은 쓰지 않는다(다른 탭에서는
 *   무효한 URL이기 때문). output.html은 자신만의 preloadMedia 경로로
 *   직접 채운다 (다음 단계에서 연결).
 */

// mediaId → blob URL (string)
const urlCache = new Map()

// ─────────────────────────────────────────
// Write (Command Handler 전용)
// ─────────────────────────────────────────

/**
 * mediaId에 대한 blob URL을 캐시에 채운다.
 * 이미 같은 mediaId로 채워진 URL이 있으면 새로 만들지 않고 그대로 둔다
 * (같은 mediaId에 대해 URL.createObjectURL을 중복 호출하지 않기 위함 —
 * 매번 새 URL을 만들면 이전 URL을 revoke해야 하는 책임이 생기고, 그
 * 시점에 다른 곳에서 이전 URL을 여전히 참조 중일 수도 있어 불필요하게
 * 복잡해진다. 같은 Blob을 가리키는 한 같은 URL을 재사용한다).
 *
 * @param {string} mediaId
 * @param {Blob} blob
 * @returns {string} blob URL (기존 캐시에 있었으면 기존 값, 없었으면 새로 생성한 값)
 */
export function fill(mediaId, blob) {
  if (!mediaId) {
    throw new Error('[MediaRuntimeCache] fill: mediaId는 필수다')
  }

  const existing = urlCache.get(mediaId)
  if (existing) return existing

  const url = URL.createObjectURL(blob)
  urlCache.set(mediaId, url)
  return url
}

/**
 * mediaId가 이미 캐시에 채워져 있는지 확인한다.
 * CommandBus.preloadMedia()가 "이미 채워진 mediaId는 다시 IndexedDB를
 * 읽지 않는다"는 판단을 할 때 사용한다.
 * @param {string} mediaId
 * @returns {boolean}
 */
export function has(mediaId) {
  return urlCache.has(mediaId)
}

// ─────────────────────────────────────────
// Read (View 전용, 항상 동기)
// ─────────────────────────────────────────

/**
 * mediaId에 대한 blob URL을 동기로 조회한다.
 * 캐시에 없으면 null을 반환할 뿐, IndexedDB를 다시 읽지 않는다 — View는
 * 절대 비동기가 되어서는 안 되기 때문이다. 캐시 미스가 발생했다는 건
 * Command Handler의 preloadMedia()가 누락됐다는 신호다(설계상 발생하지
 * 않아야 함 — MEDIA_COMMANDS whitelist가 정확하면 View 호출 시점엔
 * 항상 이미 채워져 있어야 한다).
 *
 * @param {string|null|undefined} mediaId
 * @returns {string|null} blob URL, 없으면 null
 */
export function peek(mediaId) {
  if (!mediaId) return null
  return urlCache.get(mediaId) ?? null
}

// ─────────────────────────────────────────
// 조회/디버그
// ─────────────────────────────────────────

/**
 * 캐시에 들어있는 mediaId 개수. 디버그/검증용.
 * @returns {number}
 */
export function size() {
  return urlCache.size
}

// ─────────────────────────────────────────
// 비우기 (현재 범위 밖 — 자리만 마련)
// ─────────────────────────────────────────

/**
 * 명시적으로 1개 mediaId의 blob URL을 해제한다.
 * GC(자동 정리)는 이번 단계 범위 밖이다(media/MediaStore.js 헤더 참조) —
 * 이 함수도 현재 어떤 코드도 자동으로 호출하지 않는다. 호출 시점/정책은
 * Phase 2(Element/AssetRegistry 도입) 검토 대상.
 * @param {string} mediaId
 */
export function evict(mediaId) {
  const url = urlCache.get(mediaId)
  if (!url) return
  URL.revokeObjectURL(url)
  urlCache.delete(mediaId)
}
