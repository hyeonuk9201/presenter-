name: architecture-review
description: Review code changes against project architecture rules before implementation. Check SSOT, state ownership, rendering flow, history, and persistence impact.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Architecture Review Workflow

## Purpose

Review implementation plans and code changes before modifying the project architecture.

The goal is to prevent accidental violations of existing design decisions.

## Core Architecture Principles

Always consider:

* Single Source of Truth (SSOT)
* Clear ownership of state
* Separation of domain, application, rendering, and output responsibilities
* Minimal modification responsibility
* Existing architecture decisions

## Before Coding

Before implementing a change:

1. Identify affected modules.
2. Understand current data flow.
3. Check ownership of modified state.
4. Identify possible architecture risks.
5. Explain the implementation approach before making large changes.

## Architecture Checks

Verify the following:

### State and SSOT

Check:

* Is there a new source of truth being introduced?
* Is existing state duplicated?
* Is data ownership clear?
* Are derived values incorrectly stored?

### Command and Mutation Flow

Check:

* Are state changes going through the correct mutation path?
* Is CommandBus being bypassed?
* Are direct mutations creating hidden side effects?

### Rendering Flow

Check:

* Does rendering read state only?
* Is rendering logic modifying application state?
* Could this create render loops or inconsistent UI?

### History and Undo/Redo

Check:

* Does this change require history tracking?
* Is user intent preserved?
* Could undo/redo behavior break?

### Persistence

Check:

* Does saved data remain compatible?
* Is migration required?
* Are temporary/runtime values being persisted incorrectly?

## Change Evaluation

For significant changes, provide:

1. Current behavior
2. Proposed change
3. Affected areas
4. Risks
5. Recommended implementation approach

## After Implementation

Summarize:

* Modified files
* Architecture impact
* Remaining risks
* Suggested verification steps

---


