/**
 * CueList.js
 * Ownership: 행사 순서 목록 UI
 * Change Reason: 순서 목록 UI가 바뀔 때만 수정
 *
 * 클릭 모델:
 *   Edit Mode → SELECT만  (Editor에 내용 로드)
 *   Live Mode → SELECT + GO_LIVE (즉시 송출)
 *
 * (TODO-001, Phase B 해결됨) Mode 판정은 DOM class(#app.mode-live) 읽기가
 * 아니라 state.presenterState.appMode 기반으로 동작한다.
 */

import { subscribe, getState, getSectionGroups } from '../store/AppStore.js'
import { execute } from '../command/CommandBus.js'

export function createCueList(containerEl) {
  let lastFingerprint = ''

  // 드래그 재정렬(2026-07-06). dataTransfer.getData()는 일부 브라우저에서
  // dragover 시점에 못 읽는 경우가 있어(보안 정책상 drop에서만 확정적으로
  // 읽힘), 신뢰 가능한 소스는 이 모듈 스코프 변수로 따로 들고 다닌다.
  // dataTransfer 쪽 설정은 표준 API 준수를 위한 것일 뿐, 실제 로직은
  // 이 변수를 본다.
  let draggedPageId = null

  // Page 삭제 2단계 확인(2026-07-11, confirm() 제거 — index.html의 Song/
  // Section/Media 삭제와 동일한 패턴). 브라우저 네이티브 confirm()은
  // 반복 호출 시 "이 페이지가 추가 대화상자를 만들지 못하게 차단" 체크로
  // 막힐 수 있다(prompt() 취약점, 9-32와 동일한 위험군 — CueList의
  // confirm()은 그때 함께 안 고쳐지고 남아있었다). pendingDeletePageId는
  // 상태가 아니라 UI 전용 값이라 Store에 두지 않는다.
  let pendingDeletePageId = null
  let pendingDeleteBtnEl = null

  function resetPendingDelete() {
    if (pendingDeleteBtnEl) {
      pendingDeleteBtnEl.textContent = '×'
      pendingDeleteBtnEl.classList.remove('is-confirming')
    }
    pendingDeletePageId = null
    pendingDeleteBtnEl = null
  }

  render(getState())
  subscribe(({ state }) => render(state))

  // ── 렌더링 ───────────────────────────────
  function render(state) {
    const { pages, sectionMap } = state.presentation
    const { selectedPageId, livePageId } = state.presenterState

    // Step6(2026-06-27): text뿐 아니라 mediaId까지 fingerprint에 포함한다.
    // 기존에는 `${p.id}:${p.text}`만 봤는데, image/video Page는 text가
    // 항상 undefined라 mediaId가 바뀌어도(미디어 교체) 변경 감지가 안 될
    // 수 있었다 — type과 mediaId를 추가해 그 경우도 감지하게 한다.
    //
    // D-Editor-4(2026-07-06): sections[] 배열 대신 Page 각각의 sectionId를
    // fingerprint에 포함한다 — Page 소속이 바뀌는 것 자체가 이제 Page
    // 필드 변경이기 때문이다(Section 쪽 anchor가 움직이던 옛 모델과 달리,
    // Section 메타데이터 변경은 sectionMap 쪽만 봐도 충분하다).
    const pagesFingerprint = pages
      .map(p => `${p.id}:${p.type}:${p.text}:${p.mediaId}:${p.label}:${p.sectionId}`)
      .join('|')
    const sectionsFingerprint = Object.values(sectionMap)
      .map(s => `${s.id}:${s.title}:${s.collapsed}:${s.color}`)
      .join('|')
    const currentFingerprint = `${pagesFingerprint}::${sectionsFingerprint}`
    const pagesChanged = currentFingerprint !== lastFingerprint

    if (pagesChanged) {
      lastFingerprint = currentFingerprint
      resetPendingDelete() // DOM을 통째로 다시 그리면 이전 pendingDeleteBtnEl 참조가 끊어진다
      containerEl.innerHTML = ''

      if (pages.length === 0) {
        containerEl.appendChild(createEmptyMessage())
        return
      }

      renderTree(state)
    }

    containerEl.querySelectorAll('.cue-item').forEach(el => {
      const id = el.dataset.pageId
      el.classList.toggle('is-selected', id === selectedPageId)
      el.classList.toggle('is-live',     id === livePageId)
    })
  }

  /**
   * Section Tree 렌더링(D-Editor-4, 2026-07-06 — getSectionRanges/Range
   * 모델 대체). "CueList는 Page List가 아니라 Section Tree를 지향한다"는
   * 원칙은 그대로다. getSectionGroups()가 pages[](Live Order) 순서를
   * 그대로 훑으면서 연속된 같은 sectionId를 하나의 그룹으로 묶어 반환한다
   * — sectionId: null인 그룹도 "미분류" 그룹으로 자연스럽게 나온다(옛
   * 모델처럼 "첫 Section 이전"으로 위치가 고정되지 않고, pages[] 안
   * 어디에서든 나타날 수 있다 — Page 중심 모델의 자연스러운 결과).
   * Page 번호는 항상 전체 순서 기준 전역 번호를 쓴다(Section별로 1번부터
   * 다시 세지 않는다 — Page는 여전히 송출 가능한 최소 단위이므로).
   */
  function renderTree(state) {
    const groups = getSectionGroups()
    let globalIndex = 0

    groups.forEach(group => {
      if (group.sectionId === null) {
        // 미분류 구간. QA 피드백(2026-07-04)에서 확인된 대로, Section
        // Header와 대비되는 non-collapsible 라벨을 붙인다 — 접기 기능은
        // 없다(접을 대상이 되는 Section 자체가 아니므로).
        const unsectionedLabel = document.createElement('div')
        unsectionedLabel.className = 'cue-unsectioned-label'
        unsectionedLabel.textContent = '미분류'

        // 미분류 라벨에 드롭 → sectionId: null로 되돌린다(2026-07-06).
        // Section 헤더 드롭과 대칭되는 동작 — "이 Page를 어느 Section에도
        // 안 속하게" 하는 유일한 명시적 진입점.
        unsectionedLabel.addEventListener('dragover', (e) => {
          if (!draggedPageId) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          unsectionedLabel.classList.add('drag-over')
        })
        unsectionedLabel.addEventListener('dragleave', () => {
          unsectionedLabel.classList.remove('drag-over')
        })
        unsectionedLabel.addEventListener('drop', (e) => {
          e.preventDefault()
          unsectionedLabel.classList.remove('drag-over')
          const sourceId = draggedPageId
          draggedPageId = null
          if (!sourceId) return
          execute({ type: 'MOVE_PAGE_TO_SECTION', payload: { pageId: sourceId, sectionId: null } })
        })

        const unsectioned = document.createElement('div')
        unsectioned.className = 'cue-unsectioned'
        group.pages.forEach(page => {
          unsectioned.appendChild(createCueItem(page, globalIndex++))
        })

        containerEl.appendChild(unsectionedLabel)
        containerEl.appendChild(unsectioned)
      } else {
        containerEl.appendChild(createSectionGroup(group, globalIndex))
        globalIndex += group.pages.length
      }
    })
  }

  // ── Section 그룹 DOM 생성 ────────────────
  function createSectionGroup(sectionGroup, startGlobalIndex) {
    // sectionGroup은 getSectionGroups()가 만든 { sectionId, section, pages }
    // 형태. section이 sectionMap 조회 실패로 null이면(정상 경로에서는
    // 발생하지 않아야 함 — sanitizePresentation이 참조 무결성을 보장)
    // 방어적으로 대체값을 쓴다.
    const section = sectionGroup.section ?? { id: sectionGroup.sectionId, title: '(알 수 없는 Section)', note: '', collapsed: false, color: null }
    const sectionPages = sectionGroup.pages

    const group = document.createElement('div')
    group.className = 'cue-section'
    group.classList.toggle('is-collapsed', !!section.collapsed)
    group.dataset.sectionId = section.id

    const header = document.createElement('div')
    header.className = 'cue-section-header'

    // QA 피드백(2026-07-04) 대응: 기존에는 '▾' 고정 글리프 + CSS
    // rotate(-90deg)로만 collapsed 상태를 표현했다. 그런데 Section
    // Header 클릭 시 컨테이너 전체를 다시 그리는 구조(render() 상단의
    // containerEl.innerHTML = '')라, 매번 새 DOM 노드가 생성되면서
    // transition이 "이전 상태 → 다음 상태"로 애니메이션되지 않고 최종
    // 상태로 곧바로 나타난다. 결과물 자체는 맞지만(펼침↔접힘 모두 동작),
    // 작은 회색 아이콘이 순간적으로 살짝 회전만 하다 보니 클릭해도 반응이
    // 없는 것처럼 보인다는 피드백을 받았다 — 실제로는 동작하지만 신호가
    // 너무 약했던 것. 회전 대신 글리프 자체를 바꿔(▼ 펼침 / ▶ 접힘)
    // 상태 변화를 명확하게 한다.
    const toggle = document.createElement('span')
    toggle.className = 'cue-section-toggle'
    toggle.textContent = section.collapsed ? '▶' : '▼'

    const colorDot = document.createElement('span')
    colorDot.className = 'cue-section-color-dot'
    if (section.color) colorDot.style.background = section.color

    const title = document.createElement('span')
    title.className = 'cue-section-title'
    title.textContent = section.title

    // QA 피드백(2026-07-04): "제목 외에 숫자가 나오는 게 의도된 건지"
    // 문의 — 의도된 기능(이 Section에 포함된 Page 개수)이지만 괄호 없이
    // 숫자만 있어 용도가 불분명했다. 괄호와 title(툴팁)을 추가해 명확히 한다.
    const count = document.createElement('span')
    count.className = 'cue-section-count'
    count.textContent = `(${sectionPages.length})`
    count.title = '이 섹션에 포함된 Page 수'

    header.appendChild(toggle)
    header.appendChild(colorDot)
    header.appendChild(title)
    header.appendChild(count)

    // 표시와 액션 전달만 담당 — 실제 상태 변경은 Store(UPDATE_SECTION)를
    // 통해서만 이루어진다. UI가 직접 collapsed를 뒤집어서 그리지 않는다.
    header.addEventListener('click', () => {
      execute({
        type: 'UPDATE_SECTION',
        payload: { section: { ...section, collapsed: !section.collapsed } },
      })
    })

    // 헤더에 직접 드롭 → 그 Section으로 즉시 배정(2026-07-06). 특히 Page가
    // 하나도 없는 빈 Section은 위치 기반 드롭(cue-item끼리의 drop)으로는
    // 애초에 드롭할 대상 자체가 없어서 접근 불가능하다 — 헤더가 그 유일한
    // 진입점이다.
    header.addEventListener('dragover', (e) => {
      if (!draggedPageId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      header.classList.add('drag-over')
    })
    header.addEventListener('dragleave', () => {
      header.classList.remove('drag-over')
    })
    header.addEventListener('drop', (e) => {
      e.preventDefault()
      header.classList.remove('drag-over')
      const sourceId = draggedPageId
      draggedPageId = null
      if (!sourceId) return
      execute({ type: 'MOVE_PAGE_TO_SECTION', payload: { pageId: sourceId, sectionId: section.id } })
    })

    const pagesEl = document.createElement('div')
    pagesEl.className = 'cue-section-pages'
    sectionPages.forEach((page, i) => {
      pagesEl.appendChild(createCueItem(page, startGlobalIndex + i))
    })

    group.appendChild(header)
    group.appendChild(pagesEl)
    return group
  }

  // ── CueItem DOM 생성 ─────────────────────
  function createCueItem(page, index) {
    const item = document.createElement('div')
    item.className = 'cue-item'
    item.dataset.pageId = page.id
    item.draggable = true

    const num = document.createElement('div')
    num.className = 'cue-number'
    num.textContent = index + 1

    const badge = document.createElement('div')
    badge.className = 'cue-live-badge'
    badge.textContent = 'LIVE'

    const preview = document.createElement('div')
    preview.className = 'cue-preview'
    const previewText = getPreviewText(page)
    preview.textContent = previewText
    // 항목 폭 제약으로 "가사첫줄 — 파일명" 조합이 CSS ellipsis로 잘리는
    // 문제(2026-07-05 발견, TODO.md "CueList 항목 텍스트 잘림 개선").
    // hover 시 네이티브 title 툴팁으로 전체 텍스트를 보여준다 — 별도
    // 커스텀 툴팁 컴포넌트 없이 가장 낮은 리스크로 완료 조건(hover로
    // 확인 가능)을 만족한다. Section 헤더의 count.title과 동일한 패턴.
    preview.title = previewText

    const type = document.createElement('div')
    type.className = 'cue-type'
    type.textContent = page.type

    const isPendingDelete = pendingDeletePageId === page.id
    const del = document.createElement('button')
    del.className = 'cue-delete-btn' + (isPendingDelete ? ' is-confirming' : '')
    del.textContent = isPendingDelete ? '정말 삭제?' : '×'
    del.title = '삭제'
    if (isPendingDelete) pendingDeleteBtnEl = del // 전체 재렌더링(드래그 등) 이후에도 참조를 최신 DOM으로 갱신

    item.appendChild(num)
    item.appendChild(badge)
    item.appendChild(preview)
    item.appendChild(type)
    item.appendChild(del)

    // ── 드래그 재정렬(2026-07-06) ──────────
    // movePage()의 자동 흡수(D-Editor-4 규칙 5)가 sectionId 재계산을
    // 알아서 처리하므로, 여기서는 순수 위치(index) 이동만 신경 쓰면 된다
    // — 다른 Section 범위 안으로 드롭하면 그 Section 소속으로 자동 편입.
    item.addEventListener('dragstart', (e) => {
      draggedPageId = page.id
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', page.id) // 표준 API 준수용(실제 로직은 draggedPageId를 본다)
      item.classList.add('is-dragging')
    })

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging')
      clearDragOverIndicators()
      draggedPageId = null
    })

    item.addEventListener('dragover', (e) => {
      if (!draggedPageId || draggedPageId === page.id) return
      e.preventDefault() // drop을 허용하려면 반드시 필요
      e.dataTransfer.dropEffect = 'move'

      const rect = item.getBoundingClientRect()
      const isTopHalf = e.clientY < rect.top + rect.height / 2
      clearDragOverIndicators()
      item.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom')
    })

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-top', 'drag-over-bottom')
    })

    item.addEventListener('drop', (e) => {
      e.preventDefault()
      e.stopPropagation() // Section 헤더/미분류 라벨의 drop 핸들러로 전파 방지
      const insertBefore = item.classList.contains('drag-over-top')
      clearDragOverIndicators()

      const sourceId = draggedPageId
      draggedPageId = null
      if (!sourceId || sourceId === page.id) return

      const { pages } = getState().presentation
      const fromIndex = pages.findIndex(p => p.id === sourceId)
      const targetIndex = pages.findIndex(p => p.id === page.id)
      if (fromIndex === -1 || targetIndex === -1) return

      // 원본 배열 기준 "여기에 넣고 싶다"는 위치를 먼저 정하고, 그 다음
      // movePage()의 splice 의미(제거 → 그 뒤 배열에 삽입)에 맞게 보정한다.
      const desiredOriginalPos = insertBefore ? targetIndex : targetIndex + 1
      const toIndex = desiredOriginalPos > fromIndex ? desiredOriginalPos - 1 : desiredOriginalPos
      if (toIndex === fromIndex) return

      execute({ type: 'MOVE_PAGE', payload: { fromIndex, toIndex } })
    })

    del.addEventListener('click', (e) => {
      e.stopPropagation() // 아이템 클릭(SELECT) 전파 차단

      if (pendingDeletePageId !== page.id) {
        // 1단계: 확인 대기로 전환. 다른 항목이 확인 대기 중이었다면 먼저 취소.
        resetPendingDelete()
        pendingDeletePageId = page.id
        pendingDeleteBtnEl = del
        del.textContent = '정말 삭제?'
        del.classList.add('is-confirming')
        return
      }

      // 2단계: 같은 버튼을 다시 눌렀다 — 실제 삭제 진행.
      resetPendingDelete()

      const { presenterState } = getState()
      const wasSelected = presenterState.selectedPageId === page.id
      const wasLive     = presenterState.livePageId     === page.id

      execute({ type: 'REMOVE_PAGE', payload: { pageId: page.id } })

      if (wasSelected) {
        // selectedPageId → null → subscribe else 분기에서 Editor 초기화 처리
      }

      if (wasLive) {
        // REMOVE_PAGE reducer가 이미 CLEAR_LIVE 처리 →
        // BroadcastOutput이 자동으로 CLEAR 전송 → output.html STANDBY
        // 추가 작업 불필요
      }
    })

    // Edit Mode: SELECT만
    // Live Mode: SELECT + GO_LIVE
    item.addEventListener('click', () => {
      // 다른 항목의 삭제 확인이 대기 중이었다면 취소한다 — Song 삭제
      // 2단계 확인 상태가 무관한 조작 이후에도 남아있던 회귀(9-31,
      // pendingDeleteSongId 리셋 누락)와 같은 종류의 문제를 예방한다.
      if (pendingDeletePageId && pendingDeletePageId !== page.id) resetPendingDelete()

      execute({ type: 'SELECT_PAGE', payload: { pageId: page.id } })

      // (TODO-001, Phase B) DOM class(#app.mode-live) 읽기 대신 state의
      // presenterState.appMode를 직접 읽는다.
      const isLiveMode = getState().presenterState.appMode === 'live'

      if (isLiveMode) {
        execute({ type: 'GO_LIVE', payload: { pageId: page.id } })
      }
    })

    return item
  }

  function clearDragOverIndicators() {
    containerEl.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom')
    })
    containerEl.querySelectorAll('.cue-section-header.drag-over, .cue-unsectioned-label.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
  }

  function createEmptyMessage() {
    const el = document.createElement('div')
    el.className = 'cue-empty'
    el.textContent = 'Page가 없습니다. 가사를 입력하거나 Page를 추가하세요.'
    return el
  }

  /**
   * 2026-07-05: image/video Page의 `label`(라벨, 기본값은 업로드 시
   * 원본 파일명)을 표시한다 — 이전엔 `(video)`/`(image)`로만 나와서
   * CueList만 보고는 어떤 미디어인지 알 수 없었다(클릭해봐야 확인
   * 가능). 텍스트 오버레이(9-7)가 있으면 "가사 첫줄 — 파일명" 순서로
   * 붙인다(실사용 피드백으로 순서 확정, 2026-07-05) — 운영자가 실제로
   * 찾는 건 가사 쪽이라 먼저 보여야 스캔이 빠르다.
   */
  function getPreviewText(page) {
    if (page.type === 'text') {
      return page.text?.split('\n')[0] ?? '(빈 페이지)'
    }

    const base = page.label || `(${page.type})`
    if (page.text) {
      return `${page.text.split('\n')[0]} — ${base}`
    }
    return base
  }
}
