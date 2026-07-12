---
name: fnr-patch
description: Apply minimal, localized patches to existing code with the Edit tool. Never rewrite whole files.
---

# Minimal Patch Workflow

## Purpose

Modify existing code with the smallest possible changes.

Avoid rewriting entire files.
Use the Edit tool (old_string → new_string) to patch only the lines that must change.

## Core Rules

* Do not rewrite complete files (Write tool on an existing file) unless explicitly requested.
* Always patch with the Edit tool: `old_string` = exact existing code, `new_string` = replacement.
* Keep changes localized.
* Preserve existing comments and formatting.
* Do not change architecture without approval.
* Avoid unnecessary refactoring.
* Follow existing project conventions.

## Before Making Changes

Always:

1. Read the relevant existing code first (Edit fails without a prior Read).
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

## Modification Guidelines

* Prefer one focused patch over multiple unrelated changes.
* Do not introduce new abstractions unless necessary.
* Do not remove existing behavior without confirmation.
* Preserve compatibility with the current architecture.

## Completion Check

After modifications:

1. Summarize changed files and why each change was required.
2. Explain final behavior and possible side effects.
3. Run or add the tests required by CLAUDE.md's 검증 (D-028) section.
4. Mention remaining risks.
