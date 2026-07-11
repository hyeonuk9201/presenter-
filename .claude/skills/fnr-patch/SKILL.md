name: fnr-patch
description: Create minimal Find and Replace patches for code modifications.
----------------------------------------------------------------------------

# FNR Patch Workflow

## Purpose

Modify existing code with the smallest possible changes.

Avoid rewriting entire files.
Prefer precise Find and Replace patches.

## Core Rules

* Do not rewrite complete files unless explicitly requested.
* Always use Find and Replace blocks.
* Keep changes localized.
* Preserve existing comments and formatting.
* Do not change architecture without approval.
* Avoid unnecessary refactoring.
* Follow existing project conventions.

## Before Making Changes

Always:

1. Read the relevant existing code first.
2. Understand the current implementation flow.
3. Identify affected functions and dependencies.
4. Check for Single Source of Truth (SSOT) violations.
5. Consider impact on:

   * Rendering flow
   * State management
   * History / Undo / Redo
   * Persistence
   * Import / Export
   * Output generation

## Output Format

Always provide:

### File

Target file path.

### FIND

Provide the exact existing code that should be replaced.

### REPLACE

Provide the new code.

### Reason

Explain:

* Why this change is required.
* Which functions are affected.
* Possible side effects.
* Why this approach is safe.

## Modification Guidelines

* Prefer one focused patch over multiple unrelated changes.
* Do not introduce new abstractions unless necessary.
* Do not remove existing behavior without confirmation.
* Preserve compatibility with the current architecture.

## Completion Check

After modifications:

1. Summarize changed files.
2. Explain final behavior.
3. Suggest test cases.
4. Mention remaining risks.

---
