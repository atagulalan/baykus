# HANDOVER — specs 001–006 code-complete; 007 follow-ups landing

**Status (2026-07-16):** Specs 001–006 are code-complete. Spec 006's remaining
work is the combined browser pass in `MANUELTEST.md` §M33 (folds in older
pending checkpoints). Spec **007** (`specs/007-post-006-deltas/`) documents
out-of-006 work that landed in the same working tree (schedule calendar mode,
TV Time watch resolve, bulk unwatch, rewatched stats, search open-on-select,
chrome polish) — see that folder's tasks.md for commit order.

One open judgment call from 006 needs a human decision before it's
code-work: **ResetLibraryDialog's E74 phrase-block styling** — see
`specs/006-design-conformance/tasks.md` M28.2's `<!-- DECISION -->` note
and `spec.md`'s acceptance checklist. It's not a bug, just out of M28's
className-only scope.

## What's left for 006: one combined browser pass

`MANUELTEST.md`'s **§M33** section is the entry point — it covers spec 006
and folds in every older pending item (§M27 and earlier). None of that needs
new 006 code.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173)
pnpm test           # vitest across workspace
pnpm typecheck && pnpm lint && pnpm build
```
