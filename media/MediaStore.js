/**
 * MediaStore.js
 * Ownership: 이미지/영상 파일의 IndexedDB 영속 저장
 * Change Reason: 저장 방식(IndexedDB 스키마)이 바뀔 때만 수정
 *
 * 이번 단계 범위 (사전 합의, 2026-06-27):
 *   - mediaId 기반 단순 key-value 저장/조회만 지원한다.
 *   - GC(참조 카운트, 미사용 Media 정리)는 명시적으로 제외한다.
 *     이유: 지금 단계의 목표는 "mediaId → IndexedDB → output까지 깨지지
 *     않는지"이며, GC가 들어가면 reference tracking / Page 삭제 lifecycle /
 *     persistence cleanup timing까지 동시에 검증해야 해서 디버깅 축이
 *     불필요하게 늘어난다. GC는 Element/AssetRegistry 도입(Phase 2,
 *     FutureDomain.md/AssetArchitecture.md) 이후로 미룬다.
 *   - 삭제 API(delete) 자체는 제공한다(아래 참조) — "자동 정리(GC)"를
 *     안 한다는 것과 "삭제 기능이 없다"는 것은 다르다. 다만 호출 시점/정책
 *     (언제 delete를 부르는가)은 이번 단계 범위 밖이며, 현재 어떤 코드도
 *     이 함수를 자동으로 호출하지 않는다.
 *
 * 이 파일은 Page/Presentation/AppStore를 모르는 독립 모듈이다 (Vocabulary.md
 * "Media" 정의 기준 — Asset/AssetRegistry라는 이름은 쓰지 않는다. 그건
 * Element 도입을 전제로 한 Phase 2 개념(AssetArchitecture.md)이고, 지금은
 * Page가 mediaId를 직접 참조하는 MVP 스코프이기 때문이다).
 *
 * 의존 방향 (허용):
 *   Command 단계 (런타임 캐시 채우는 쪽) → MediaStore → IndexedDB
 *
 * 의존 방향 (금지):
 *   MediaStore → Page / Presentation / AppStore / View
 *   (MediaStore는 무엇이 자신을 참조하는지 알지 못한다 — AssetArchitecture.md의
 *   "Asset은 상위 Domain을 알지 못한다" 원칙과 동일한 결로, mediaId 스코프에서도 유지)
 */

const DB_NAME = 'tc-presenter-media'
const DB_VERSION = 1
const STORE_NAME = 'media'

// ─────────────────────────────────────────
// IndexedDB 연결 (단일 커넥션 재사용)
// ─────────────────────────────────────────

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyPath 없이 둔다 — put() 호출 시 key를 명시적으로 넘긴다
        // (mediaId는 IndexedDB가 아니라 generateId()가 발급하므로, 레코드
        // 내부 필드를 keyPath로 끌어올릴 이유가 없다).
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

/**
 * 단일 트랜잭션을 실행하고 Promise로 감싼다.
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest} run
 */
async function withStore(mode, run) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const request = run(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─────────────────────────────────────────
// 저장 레코드 형태
// ─────────────────────────────────────────

/**
 * @typedef {object} MediaRecord
 * @property {Blob} blob       - 실제 파일 데이터
 * @property {string} mimeType - 예: 'image/png', 'video/mp4' (blob.type과 동일하지만, 조회 시 blob을 열지 않고도 type을 알 수 있도록 별도 보관)
 * @property {string} fileName - 원본 파일명 (디버깅/표시용, 식별자 아님)
 * @property {number} size     - bytes
 * @property {number} createdAt - epoch ms
 */

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

/**
 * File을 저장하고 mediaId를 반환한다.
 * mediaId 발급은 이 파일이 아니라 호출부의 generateId()(utils/id.js)를
 * 사용한다 — Page.id/Presentation.id와 동일한 ID 생성 전략을 그대로
 * 따르기 위함이며, MediaStore가 별도 ID 스킴을 만들지 않는다.
 *
 * @param {string} mediaId - utils/id.js의 generateId()로 발급된 ID
 * @param {File|Blob} file
 * @returns {Promise<string>} mediaId (인자로 받은 값을 그대로 반환 — 체이닝 편의용)
 */
export async function put(mediaId, file) {
  if (!mediaId || typeof mediaId !== 'string') {
    throw new Error('[MediaStore] put: mediaId는 필수 문자열이다')
  }
  if (!(file instanceof Blob)) {
    throw new Error('[MediaStore] put: file은 File 또는 Blob이어야 한다')
  }

  /** @type {MediaRecord} */
  const record = {
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    fileName: file.name ?? '',
    size: file.size,
    createdAt: Date.now(),
  }

  await withStore('readwrite', (store) => store.put(record, mediaId))
  return mediaId
}

/**
 * mediaId로 저장된 레코드를 조회한다.
 * @param {string} mediaId
 * @returns {Promise<MediaRecord|null>} 없으면 null (에러 아님)
 */
export async function get(mediaId) {
  if (!mediaId) return null
  const record = await withStore('readonly', (store) => store.get(mediaId))
  return record ?? null
}

/**
 * mediaId로 저장된 레코드를 삭제한다.
 *
 * 호출 시점/정책은 이번 단계 범위 밖이다 (위 파일 헤더 참조) — 이 함수
 * 자체는 제공하지만, 현재 어떤 코드도 자동으로 호출하지 않는다. Page에서
 * Media 교체/제거 시 명시적으로 호출할지는 다음 단계에서 결정한다.
 *
 * @param {string} mediaId
 * @returns {Promise<void>}
 */
export async function remove(mediaId) {
  if (!mediaId) return
  await withStore('readwrite', (store) => store.delete(mediaId))
}

/**
 * 저장된 모든 mediaId 목록을 조회한다.
 * 디버깅/향후 정리 작업을 위한 조회 전용 함수 — 일반 렌더링 경로에서는
 * 사용하지 않는다 (get(mediaId) 단건 조회가 정상 경로).
 * @returns {Promise<string[]>}
 */
export async function listIds() {
  const keys = await withStore('readonly', (store) => store.getAllKeys())
  return /** @type {string[]} */ (keys)
}
