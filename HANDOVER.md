# HANDOVER — outstanding browser checkpoints only

**Status:** Specs 001–004 are all fully implemented (001 M0–M9, 002 M10–M13,
003 M14–M17.14, 004 M18–M22). Everything is lint/typecheck/test green
(484 tests) and built. What's left across all four specs is exactly one
thing: a human/browser-capable session to walk the accumulated manual test
checklists in `MANUELTEST.md` and check the remaining boxes. No chromium/
playwright was available in any of the sessions that did this work.

## What's left

- **003's M17.7 CHECKPOINT** (`specs/003-dynamic-watching-ux/tasks.md`) —
  full browser walkthrough of every `MANUELTEST.md` section for spec 003
  (M14.7, M15.4, M16.4, M17, M17.9–M17.14) in both locales, plus a 002
  regression spot-check (M10–M13).
- **004's M22 CHECKPOINT** (`specs/004-import-fidelity-ux/tasks.md`) — same
  walkthrough for `MANUELTEST.md` §M22 (import-wizard relic disclosure,
  Suits-shape archived import, Re:Zero all-filled bar, poster morph/
  cross-fade/reduced-motion/Firefox matrix, TMDB-parity URLs + canonical
  replace, E54–E56 re-verification). Fold this into the same sitting as
  M17.7.
- **002 leftovers** — M11.4/M12.4 boxes + five §Acceptance browser lines in
  002's `spec.md`; implemented and test-green, boxes reserved for the
  browser pass (M10.8 precedent).
- **M9.2** (hosted deployment) stays blocked on the user's credentials — do
  not attempt.

Once a browser session checks these boxes, this file has no more content —
delete it.

## The user's real library

The user's existing library (`apps/server/data/library.db`, ~277 items,
100% TVmaze-matched, no TMDB key configured) still holds 3 relic items and
one archived-but-uncategorized show that predate 004's importer fix (item
ids may have shifted since — re-check by title): three zero-watch relics
that would now be skipped on a fresh import, and a show TV Time considers
"stopped" that currently lacks a manual list. That's user data, not a task:
offer the choice of (a) hand-fix in the UI — remove the relics via the
detail "⋮" menu, move the affected show to Bırakıldı — or (b) Settings →
danger zone wipe + fresh re-import with the fixed importer. Do not do
either unprompted.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173)
pnpm test           # vitest across workspace; pnpm test packages/core etc.
pnpm typecheck && pnpm lint && pnpm build
```
