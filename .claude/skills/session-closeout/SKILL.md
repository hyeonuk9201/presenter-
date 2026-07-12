---
name: session-closeout
description: Execute the mandatory session closeout — verify tests, reconcile TODO.md/CurrentState.md/ManualTestChecklist.md, check git identity, commit and push via wsl.exe. Run before any commit that ends a work item.
---

# Session Closeout Workflow

## Trigger

Run this when a work item is finished and about to be committed, or
when the user says "마감", "커밋해줘", "커밋푸쉬" or similar. This is
the executable procedure for CLAUDE.md's "세션 마감 순서 (필수)" —
a code commit without the matching doc updates is an UNFINISHED task
(precedent: commits 6cf1730 and TD-5, see CurrentState.md 9-46/9-48).

## Step 1 — Inspect the working tree (never skip)

```
wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git status --short"
```

Compare the list against the files you intentionally changed.
If there are files you did not change or cannot explain: STOP.
Report them to the user before committing anything — do not bundle
unknown changes into your commit (6cf1730 is the counterexample).

## Step 2 — Run the tests

- Always: `node --test` from the project root (Windows node, NOT
  `npm test`). Required result: `fail 0`.
- If `ui/*.js`, `index.html`, or `output.html` changed: also run the
  e2e-verify skill (`.claude/skills/e2e-verify`).
- Any failure: fix it first. Do not commit red.

## Step 3 — Reconcile the docs (all three, in order)

1. `docs/TODO.md` — check off the completed item, compress it to the
   post-hoc one-line format, link the CurrentState session number,
   update the header's "최종 업데이트" line.
2. `docs/CurrentState.md` — append a new `## 9-NN.` section (next
   number after the last one) with: 배경 / 구현(또는 확인 내용) /
   변경 파일 / 검증 / 다음 단계 진입 시 주의사항.
3. `docs/ManualTestChecklist.md` — only if UI was changed: one result
   line.

## Step 4 — Verify git identity (every time)

```
wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git config user.email"
```

Must print `hyeonuk92@gmail.com`. If it prints anything else
(the typo `hyoenuk92@` has resurfaced before), fix it first:

```
wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git config user.email 'hyeonuk92@gmail.com'"
```

## Step 5 — Commit and push (via wsl.exe only)

- Message format: `feat|fix|docs|refactor|test|chore: 간결한 설명` —
  prefix required, no leading whitespace, Korean body explaining WHY.
- Include the code AND the Step 3 doc updates in the same commit.
- Do not mix unrelated work items in one commit.
- Multi-line messages break shell quoting easily: write the message to
  a temp file in the project root and use `git commit -F <file>`,
  then delete the file.

```
wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git add <files> && git commit -F .commit-msg-tmp.txt && rm .commit-msg-tmp.txt && git push"
```

## Step 6 — Confirm and report

```
wsl.exe -e bash -c "cd /home/hyeonuk/projects/presenter- && git status -sb | head -1 && git log origin/main -1 --oneline"
```

Confirm the push landed (no ahead/behind marker) and report to the
user: commit hash, what was committed, test result, which docs were
updated.
