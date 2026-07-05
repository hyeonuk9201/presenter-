/**
 * StorageAdapter.js
 * Ownership: 물리 저장소(localStorage) 접근을 한 곳으로 모으는 얇은 레이어
 * Change Reason: 저장 매체(localStorage → File / IndexedDB / Cloud 등)가
 *   바뀔 때만 수정 — 호출부(PersistenceSubscriber, AppStore)는 이 파일의
 *   함수 시그니처만 알면 되고, 실제 구현이 localStorage라는 사실은 몰라도
 *   된다.
 *
 * 배경(2026-07-05, 아키텍처 리뷰 TODO 항목): `localStorage.setItem`/`getItem`
 * 직접 호출이 `PersistenceSubscriber.js`와 `store/AppStore.js` 두 곳에
 * 흩어져 있었다. 결합도 자체는 낮았지만(딱 2줄), 나중에 File System
 * Access API나 Dropbox/OneDrive 같은 걸로 바꾸려면 그 2줄을 찾아 바꿔야
 * 했다. 지금 당장 다른 저장소로 바꿀 계획은 없다(Local First 원칙 유지)
 * — 이건 "언젠가 바꿀 때 여기 하나만 보면 되게" 만들어두는 것뿐이다.
 *
 * 알려진 한계(의도적으로 안 고침, PersistenceArchitecture.md에도 명시):
 * `AppStore.js`의 초기 state는 여전히 모듈 로드 시점에 동기(sync)로
 * 읽는다 — 아래 `get()`이 동기 함수인 이유다. File/Cloud 같은 진짜
 * 비동기 저장소로 바꾸려면 이 동기 가정 자체를 걷어내야 한다(AppStore의
 * 부팅 순서 변경 필요) — 이 파일의 인터페이스 교체만으로 해결되는 문제가
 * 아니다. TODO.md의 "Persistence의 localStorage 결합도 낮추기" 항목 참조.
 */

/**
 * @param {string} key
 * @param {string} value - 이미 직렬화된 문자열(JSON.stringify 결과)이어야
 *   한다. 이 파일은 직렬화 방식을 모른다 — 그건 호출부(Schema.js와
 *   PersistenceSubscriber.js)의 책임이다.
 * @throws {Error} 저장소 용량 초과 등 물리 저장 실패 시 그대로 던진다 —
 *   호출부(PersistenceSubscriber.js)가 이미 try/catch로 감싸고 있다.
 */
export function save(key, value) {
  localStorage.setItem(key, value)
}

/**
 * @param {string} key
 * @returns {string|null} 저장된 원본 문자열. 없으면 null — 이 파일은
 *   JSON.parse를 하지 않는다(호출부 책임).
 */
export function load(key) {
  return localStorage.getItem(key)
}
