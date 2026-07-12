---
name: architecture-review
description: Review a planned change against this project's architecture boundaries (Decisions.md D-NNN, SSOT, CommandBus, History, Persistence) before touching domain/, store/, persistence/, command/, or history/.
---

# Architecture Review Workflow

## Trigger

Run this BEFORE modifying or creating any file under `domain/`, `store/`,
`persistence/`, `command/`, `history/` (same condition as CLAUDE.md's
Skills section). Not required for pure `ui/`/HTML/docs changes.

## Step 1 — Check binding Decisions first (mandatory, D-029)

1. Search `docs/Decisions.md` for D-NNN entries related to the change
   (search by the module name, feature name, and store names involved).
2. If a related Decision exists: work only inside its stated boundary.
3. If the change conflicts with a Decision: STOP. Do not implement.
   Report the conflict and escalate per CLAUDE.md's 에스컬레이션 section.
   Known standing conflicts: multi-page style preset apply = D-024,
   Song Undo = D-027.
4. `Research/*.md` files are background signals only — they never block
   or authorize work (D-029).

## Step 2 — Architecture checks

### State and SSOT
* Is a new source of truth being introduced? (AppStore owns
  Presentation/PresenterState — nothing else may own them.)
* Is existing state duplicated, or a derived value stored instead of
  computed?

### Command and Mutation flow
* Do Presentation/PresenterState changes go through
  `CommandBus.execute()`? Direct `dispatch()` calls are forbidden.
* SongStore/AppSettingsStore/MediaStore must NOT pass through
  CommandBus/HistoryManager (D-027).
* New state fields need a Mutation in `deriveMutations()`
  (store/AppStore.js) and subscribers use `interestedMutations` —
  the legacy storeChanged broadcast no longer exists (D-017).

### Rendering flow
* Rendering reads state only; it never modifies application state.
* `domain/*` files must not know DOM/Store/rendering.

### History and Undo/Redo
* Does the action need an inverse in `computeInverse()`
  (history/HistoryManager.js), or does it belong in the Ignore block
  (SELECT_PAGE/GO_LIVE-style transient state)?

### Persistence
* Does saved data stay compatible? If the schema changes, bump
  `CURRENT_SCHEMA_VERSION` and add a migration (persistence/Schema.js).
* Runtime-only state (PresenterState, D-004) must never be persisted.
* All localStorage access goes through persistence/StorageAdapter.js.

## Step 3 — Before large changes

If the change touches 3+ files or crosses a layer (folder) boundary,
write down and show: current behavior → proposed change → affected
files → risks, before editing.

## After implementation

Follow CLAUDE.md's "세션 마감 순서" and "검증 (D-028)" sections —
do not duplicate them here.
