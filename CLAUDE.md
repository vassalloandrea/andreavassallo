# CLAUDE.md

The hard technical rules — stack, conventions, file structure — live in
[`AGENTS.md`](AGENTS.md). Read that first. This file only adds what's specific
to working here with Claude Code.

## Voice

This is Andrea's own site. Load the `andrea-voice` skill for any work in this
repo, code included, not only prose — commit messages, PR descriptions, and
any content under `src/content/` all go out under his name.

## Shipping a change

Use the `open-pr` skill to take a change from prompt to PR: worktree, checks
green (`npm run lint`), draft PR, QA, ready for review.
