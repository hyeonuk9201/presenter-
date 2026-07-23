/**
 * CommandBus.js
 * Ownership: Editor → AppStore 진입 경로의 단일 진입점
 * Change Reason: Command 실행 경로가 바뀔 때만 수정
 *
 * 현재 단계(Step1, Frozen v1.0 - Phase A):
 *   - 얇은 Wrapper만 제공한다.
 *   - Command = { type, payload }
 *   - execute()는 payload를 펼쳐서 AppStore.dispatch()에 그대로 전달한다.
 *   - AppStore의 reducer는 수정하지 않는다(기존 { type, ...필드 } 형태를 그대로 기대함).
 *
 * Step4 (D-018, History Hook — 단일 슬롯, 범용 Registry 아님):
 *   - setHistoryHook(hook)으로 HistoryManager 전용 Hook 1개만 등록 가능하다.
 *   - hook은 { afterExecute(command, prevState) } 형태이다.
 *   - beforeExecute는 만들지 않는다. nextState도 전달하지 않는다 — 이번 구현
 *     범위에서 실제 사용처가 없다 (YAGNI, history/HistoryManager.js 참조).
 *   - execute()는 여전히 단일 진입점이다. Hook은 dispatch 이후 "관찰"만
 *     하며, Command 실행 흐름을 가로채거나 변경하지 않는다.
 *   - 의도적으로 만들지 않는 것: Plugin/Logging/Analytics/DevTools를 위한
 *     범용 Hook Registry. 이 슬롯은 HistoryManager만 등록한다고 명시한다 —
 *     다른 목적의 Hook이 필요해지면 별도 설계/승인을 거친다.
 *
 * CommandBus는 Domain 구조를 알지 않는다.
 * CommandBus는 Command 실행만 수행한다.
 *
 * Media Preload (2026-06-27 합의):
 *   - View(PageView.js)는 순수 동기 함수로 유지해야 하므로, mediaId →
 *     blob URL 변환은 View가 아니라 여기, Command 단계에서 미리 끝내둔다.
 *   - 대상은 MEDIA_COMMANDS whitelist에 명시된 Command뿐이다 — "Page를
 *     싣고 들어오는 모든 경로"가 기준이며, 신규 생성(ADD_PAGE)/수정
 *     (UPDATE_PAGE)뿐 아니라 Undo가 주입하는 INSERT_PAGE_AT도 포함한다
 *     (REMOVE_PAGE의 undoCommand가 INSERT_PAGE_AT이기 때문 — history/
 *     HistoryManager.js의 computeInverse 참조). REMOVE_PAGE 자신은
 *     mediaId를 가진 새 Page를 들고 들어오지 않으므로 대상이 아니다.
 *   - preloadMedia()는 dispatch() "이전"에 await로 완료된다. 즉 media가
 *     있는 Command는 실제 state 반영이 한 틱(IndexedDB 조회 시간만큼)
 *     늦게 일어난다 — media가 없는 Command(텍스트 전용 Page, Select/
 *     GoLive 등)는 이 분기를 타지 않아 기존과 동일하게 완전 동기로
 *     끝난다.
 *   - execute()는 async function이 됐지만 외부 계약은 바뀌지 않는다.
 *     기존 호출부(index.html, ui/CueList.js 등)는 모두 execute(command)를
 *     그냥 호출하고 끝내는 fire-and-forget 패턴이라, 반환된 Promise를
 *     아무도 받지 않아도 동작한다 — 호출부 코드는 1바이트도 수정하지
 *     않았다.
 *   - 캐시 write는 오직 여기(preloadMedia 내부)에서만 일어난다. View/
 *     Store/History는 MediaRuntimeCache에 쓰기 권한이 없다 — media/
 *     MediaRuntimeCache.js 헤더 참조. (D-0001, 2026-07-23 확장 — 개정
 *     아님): fill은 preloadMedia, evict는 참조 기반 sweep(dispatch 직후) —
 *     둘 다 CommandBus 내부다. keepSet 계산은 domain/Presentation.js의
 *     collectReferencedMediaIds()에 위임한다.
 *   - History는 이 과정에 관여하지 않는다. afterExecute Hook은 여전히
 *     dispatch 이후에만 "관찰"하며, media를 다시 로드하거나 캐시를
 *     건드리지 않는다 — History는 deterministic replay여야 하기 때문에,
 *     media load 같은 비동기 부수효과를 갖지 않는다.
 *
 * 실행 큐 (Step6, 2026-06-27 — fire-and-forget 순서 역전 버그 수정):
 *   - 문제: execute()가 async가 되면서, media가 있는 Command(await로 한
 *     틱 이상 지연)와 media가 없는 Command(즉시 완료)를 fire-and-forget
 *     으로 연속 호출하면 호출 순서와 dispatch 순서가 달라질 수 있다.
 *     예: execute(이미지A); execute(텍스트B) 순으로 불러도, 텍스트B가
 *     이미지A보다 먼저 dispatch될 수 있다 — 이미지A는 IndexedDB 조회를
 *     기다리는 동안 텍스트B가 먼저 마이크로태스크를 통과하기 때문이다.
 *     (fake-indexeddb로 재현 확인됨.)
 *   - 해결: execute() 호출 자체를 큐에 체이닝한다. 매 호출은 "이전
 *     호출의 처리가 끝난 뒤에 내 처리를 시작"하도록 강제되며, 이로써
 *     호출 순서 = dispatch 순서가 항상 보장된다.
 *   - 외부 계약은 그대로다 — execute(command)를 호출하고 끝내는 기존
 *     패턴은 수정 없이 동작한다. 큐는 CommandBus 내부 구현 디테일이다.
 */

import { dispatch, getState } from '../store/AppStore.js'
import { get as getMedia } from '../media/MediaStore.js'
import { fill as fillMediaCache, has as hasMediaCached, sweep as sweepMediaCache } from '../media/MediaRuntimeCache.js'
import { collectReferencedMediaIds } from '../domain/Presentation.js'

/**
 * History 전용 Hook 슬롯 (단일 객체, 배열 아님).
 * setHistoryHook()으로만 교체 가능하며, 여러 Hook을 동시에 등록하는
 * 범용 레지스트리가 아니다. HistoryManager 외의 용도로 사용하지 않는다.
 */
let historyHook = null

/**
 * History Hook을 등록한다. HistoryManager만 등록한다고 간주한다.
 *
 * @param {{ afterExecute: (command: object, prevState: object) => void } | null} hook
 */
export function setHistoryHook(hook) {
  historyHook = hook
}

/**
 * media resolve 대상 Command. "Page를 싣고 들어오는 모든 경로" 기준으로
 * 정한 whitelist다 — Undo(INSERT_PAGE_AT)를 빼먹으면 이미지/영상 Page를
 * 삭제 후 Undo로 복원할 때 캐시가 비어 있을 수 있다.
 */
const MEDIA_COMMANDS = new Set(['ADD_PAGE', 'UPDATE_PAGE', 'INSERT_PAGE_AT'])

/**
 * payload.page의 미디어 참조(mediaId, backgroundMediaId)를 MediaRuntimeCache에
 * 채운다. 이미 캐시에 있으면 IndexedDB를 다시 읽지 않는다(hasMediaCached 확인).
 *
 * CommandBus는 원칙적으로 Domain 구조를 모르지만, 이 함수는 "payload에
 * page.mediaId / page.backgroundMediaId 필드가 있는가"라는 최소한의 모양만
 * 본다 — Page의 나머지 구조(text/fontSize 등)는 전혀 참조하지 않는다.
 *
 * backgroundMediaId(D-032, 2026-07-15): text Page가 배경 미디어를 가질 수 있어,
 * 콘텐츠 미디어(mediaId)와 동일한 preload 대상이다. 둘은 서로 다른 id라
 * 병렬로 조회한다.
 *
 * @param {object} payload
 */
async function preloadMedia(payload) {
  await Promise.all([
    preloadMediaId(payload?.page?.mediaId),
    preloadMediaId(payload?.page?.backgroundMediaId),
  ])
}

async function preloadMediaId(mediaId) {
  if (!mediaId) return // 미디어 없는 경우(텍스트 전용 Page, 배경 없는 Page) — 아무 일도 하지 않는다

  if (hasMediaCached(mediaId)) return // 이미 채워져 있으면 재조회하지 않는다

  // TD-2(감사 2026-07-11): IndexedDB 조회 자체가 실패(reject)하는 경우도
  // "레코드 없음"과 동일하게 warn 후 계속 진행한다. 여기서 reject를 그대로
  // 흘려보내면 fire-and-forget 호출부(index.html, ui/CueList.js)에서
  // unhandled rejection이 되고, Undo가 주입한 INSERT_PAGE_AT이면 이미 pop된
  // 이력이 유실된다. 캐시가 비어 있으면 View가 placeholder를 렌더하므로
  // (레코드 없음 경로와 동일) dispatch를 막을 이유가 없다.
  let record
  try {
    record = await getMedia(mediaId)
  } catch (err) {
    console.warn('[CommandBus] media 조회 실패 — 캐시를 채우지 않고 Command는 계속 진행:', mediaId, err)
    return
  }
  if (!record) {
    console.warn('[CommandBus] mediaId에 해당하는 레코드를 찾을 수 없음:', mediaId)
    return
  }

  fillMediaCache(mediaId, record.blob)
}

/**
 * 부트스트랩 전용 API (Step6, 2026-06-27 — 실사용 버그 수정).
 *
 * 문제: localStorage에서 복원되는 Page(앱 시작 시 store/AppStore.js의
 * 모듈 로드 시점 초기화)는 CommandBus.execute()를 거치지 않는다 — 즉
 * ADD_PAGE/UPDATE_PAGE/INSERT_PAGE_AT 중 어느 것도 타지 않으므로
 * preloadMedia()가 한 번도 호출되지 않는다. 그 결과 새로고침 전에 만든
 * image/video Page는 MediaRuntimeCache가 영영 비어있는 채로 남아,
 * 클릭(SELECT_PAGE — media와 무관한 Command)해도 "미디어를 찾을 수
 * 없음"이 뜬다. 실제 브라우저 콘솔 로그로 원인을 확정했다(이번 세션).
 *
 * 해법: "사용자 Command"와 "앱 부트스트랩"의 책임을 분리한다(2026-06-27
 * 합의). bootstrapMediaCache()는 앱 시작 시 1회, 기존 Page 목록을 받아
 * 각 Page에 대해 preloadMedia()를 재사용해 캐시를 일괄 채운다. dispatch나
 * History 기록은 전혀 하지 않는다 — 순수하게 "이미 존재하는 Page들의
 * media를 캐시에 미리 채워두는" 부수효과만 수행한다. 캐시 write가
 * preloadMedia() 한 곳으로만 모이는 원칙(View/Store/History는 쓰기
 * 권한 없음)은 그대로 유지된다 — 이 함수도 결국 preloadMedia()를
 * 호출할 뿐, 별도의 캐시 쓰기 경로를 만들지 않는다.
 *
 * 호출 시점: index.html이 앱 부팅 시 AppStore.getState()로 기존 Page
 * 목록을 가져온 직후, UI(CueList/PreviewPanel 등) 생성 전이나 직후에
 * 한 번 호출한다. 여러 Page를 동시에 처리해도 순서 보장이 필요 없다
 * (서로 다른 mediaId라 dispatch가 끼어들 일도 없음) — 그래서 직렬 큐를
 * 거치지 않고 Promise.all로 병렬 처리한다.
 *
 * @param {object[]} pages - 캐시를 채울 대상 Page 배열 (text Page가 섞여
 *   있어도 안전 — preloadMedia가 mediaId 없는 Page는 그냥 통과시킨다)
 * @returns {Promise<void>}
 */
export async function bootstrapMediaCache(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return

  await Promise.all(pages.map(page => preloadMedia({ page })))
}

/**
 * 실행 큐. 매 execute() 호출은 이 Promise 체인 뒤에 자신을 이어붙인다.
 * 큐 자체는 실패해도 끊기지 않아야 한다 — 한 Command가 내부에서 에러를
 * 던지더라도(현재는 없음, 방어적으로) 다음 Command가 영원히 막히면 안
 * 되므로 .catch(() => {})로 큐 체인 자체는 항상 살아있게 한다. 실제
 * Command 처리 중 에러는 각 executeInternal 호출의 반환 Promise를 통해
 * 그대로 호출자에게 전파된다(아래 execute() 참조). 단, media preload
 * 실패는 예외다 — preloadMediaId 내부에서 warn 처리하고 전파하지 않는다
 * (TD-2, preloadMediaId 주석 참조).
 */
let queue = Promise.resolve()

/**
 * 실제 Command 처리 본체. 이전에는 export function execute였던 로직을
 * 그대로 옮겨왔다 — 동작은 1바이트도 바뀌지 않았고, 큐에 체이닝되는
 * 방식만 추가됐다.
 *
 * @param {object} command - { type, payload }
 */
async function executeInternal(command) {
  if (!command || typeof command.type !== 'string') {
    console.warn('[CommandBus] 유효하지 않은 Command:', command)
    return
  }

  const { type, payload = {} } = command

  // media가 필요한 Command는 dispatch 이전에 캐시를 먼저 채운다.
  // media가 없는 Command는 즉시 완료되는 Promise라 사실상 동기와 동일하다.
  if (MEDIA_COMMANDS.has(type)) {
    await preloadMedia(payload)
  }

  const action = { type, ...payload }
  const prevState = getState()

  // AppStore.reduce()는 { type, ...필드 } 형태를 기대한다.
  // reducer를 수정하지 않기 위해 여기서 payload를 펼쳐서 전달한다.
  dispatch(action)

  // (D-018) History Hook은 dispatch 이후에만 관찰한다 — 가로채지 않는다.
  historyHook?.afterExecute?.(action, prevState)

  // (D-0001) 참조 기반 sweep — pages 배열 참조가 바뀐 명령만 대상.
  // 가드는 액션 타입 whitelist가 아니라 참조 비교다: 불변 Domain이 pages를
  // 새로 만드는 모든 명령을 빠짐없이 잡고, SELECT/GO_LIVE 같은 비-pages
  // 고빈도 명령은 sweep을 완전히 생략한다. keepSet 계산은 domain 헬퍼에
  // 위임해 CommandBus의 Domain 침투를 현행 수준으로 유지한다.
  if (prevState.presentation.pages !== getState().presentation.pages) {
    sweepMediaCache(collectReferencedMediaIds(getState().presentation))
  }
}

/**
 * Command를 AppStore Mutation으로 전달한다.
 *
 * 호출 순서를 보장하기 위해 큐에 체이닝한다 — 이전 호출의 executeInternal이
 * 완전히 끝난 뒤에야 이번 호출이 시작된다. 외부에서 보면 여전히
 * execute(command)를 호출하고 끝내는 단일 함수다(시그니처/반환 Promise
 * 계약 동일 — 호출부는 await 없이 fire-and-forget으로 써도 되고, undo/
 * redo처럼 await해서 완료를 기다려도 된다).
 *
 * @param {object} command - { type, payload }
 * @returns {Promise<void>}
 */
export function execute(command) {
  // 이번 호출의 처리를 큐 뒤에 이어붙인다. 이전 호출이 reject돼도(현재는
  // 발생하지 않지만 방어적으로) 큐 자체는 계속 진행되도록 처리한다 — 그래야
  // 한 Command의 실패가 이후 모든 Command를 영원히 막아버리지 않는다.
  const result = queue.then(() => executeInternal(command))
  queue = result.catch(() => {})
  return result
}
