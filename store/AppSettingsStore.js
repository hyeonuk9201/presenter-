/**
 * AppSettingsStore.js
 * Ownership: Presentation과 무관한 앱 전역 설정(현재는 스타일 프리셋만)의
 *   저장/로드
 * Change Reason: AppSettings에 새 항목이 추가되거나 스키마가 바뀔 때만 수정
 *
 * D-025(Style Preset Storage) 참조 — 스타일 프리셋은 Presentation
 * (행사 하나)에 종속되지 않고 여러 예배/행사에 걸쳐 재사용되므로,
 * `store/AppStore.js`/`persistence/Schema.js`와 완전히 분리된 별도
 * 저장소를 쓴다. `persistence/StorageAdapter.js`를 그대로 재사용한다
 * (그 파일은 이미 key를 인자로 받는 범용 구조라 이 용도에 그대로 맞는다).
 *
 * D-023(스타일 프리셋은 생산성 기능이지 데이터 모델이 아니다) 참조 —
 * 이 모듈은 CommandBus/HistoryManager를 거치지 않는다. 프리셋 변경은
 * Undo/Redo 대상이 아니다(Presentation의 편집 이력과 무관한 앱 설정이므로
 * — Section/Page의 Undo 스택과 섞이면 오히려 혼란스럽다).
 *
 * Presentation의 AppStore.js처럼 "매 dispatch마다 구독자에게 알림"까지는
 * 필요 없다 — 프리셋 목록은 모달을 열 때마다 다시 읽으면 충분한 규모라,
 * 함수 호출 즉시 저장(write-through)하는 단순한 형태로 둔다.
 */

import { createDefaultStylePresets, isValidStylePreset } from '../domain/StylePreset.js'
import { save, load } from '../persistence/StorageAdapter.js'

const STORAGE_KEY = 'tc-presenter-app-settings'
const CURRENT_VERSION = 1

// ─────────────────────────────────────────
// 검증 (persistence/Schema.js의 sanitizePresentation과 같은 정신 —
// 손상된 개별 항목만 제외하고 나머지는 살린다)
// ─────────────────────────────────────────

function sanitizeAppSettings(raw) {
  if (!raw || typeof raw !== 'object') return null
  const rawPresets = Array.isArray(raw.stylePresets) ? raw.stylePresets : []
  const stylePresets = rawPresets.filter(p => {
    const ok = isValidStylePreset(p)
    if (!ok) console.warn('[AppSettings] 손상된 StylePreset을 제외하고 복원함:', p)
    return ok
  })
  return { stylePresets }
}

// ─────────────────────────────────────────
// 로드 (모듈 로드 시점에 1회, AppStore.js의 부팅 패턴과 동일)
// ─────────────────────────────────────────

function loadAppSettings() {
  try {
    const raw = load(STORAGE_KEY)
    if (!raw) {
      return { stylePresets: createDefaultStylePresets() } // 최초 실행 — 시스템 기본 프리셋 시드
    }
    const parsed = JSON.parse(raw)
    // version 필드는 지금 버전이 1뿐이라 마이그레이션 분기가 없다 —
    // Schema.js처럼 나중에 버전이 늘어나면 여기 fallthrough를 추가한다.
    const sanitized = sanitizeAppSettings(parsed)
    return sanitized ?? { stylePresets: createDefaultStylePresets() }
  } catch (err) {
    console.warn('[AppSettings] 로드 실패, 기본값으로 폴백:', err)
    return { stylePresets: createDefaultStylePresets() }
  }
}

let state = loadAppSettings()

function persist() {
  try {
    save(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, ...state }))
  } catch (err) {
    console.error('[AppSettings] 저장 실패:', err)
  }
}

// 최초 실행(시스템 기본 프리셋을 방금 시드한 경우)에는 바로 저장해서,
// 다음 로드부터는 항상 실제 저장된 값을 읽게 한다.
persist()

// ─────────────────────────────────────────
// 조회/조작
// ─────────────────────────────────────────

export function getStylePresets() {
  return state.stylePresets
}

export function addStylePreset(preset) {
  state = { ...state, stylePresets: [...state.stylePresets, preset] }
  persist()
}

export function updateStylePreset(updatedPreset) {
  state = {
    ...state,
    stylePresets: state.stylePresets.map(p => (p.id === updatedPreset.id ? updatedPreset : p)),
  }
  persist()
}

export function removeStylePreset(id) {
  state = { ...state, stylePresets: state.stylePresets.filter(p => p.id !== id) }
  persist()
}
