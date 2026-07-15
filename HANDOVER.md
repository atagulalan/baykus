# HANDOVER — implement Spec 002 (Watch Categories, Calendar Modes, Watch Page)

**From:** planning session (Claude Fable, 2026-07-15) ·
**To:** the implementing agent ·
**Status:** M10–M13.1 implemented and committed (core/server/web, full
gate green, every E16–E29 has a test). Not done: the browser-only halves
of the M10.8/M11.4/M12.4 checkpoints (no browser-automation tool in this
environment) — steps are in the root `MANUELTEST.md` for xava's manual
pass. M13.2 (docs) is in progress; this file gets deleted once the
checkpoints are confirmed and the last task box is checked.

## Your mission

Implement `specs/002-watch-categories/` end to end by working through
[`specs/002-watch-categories/tasks.md`](specs/002-watch-categories/tasks.md)
**strictly top-down**, one task = one commit, exactly as AGENTS.md
§ Execution protocol prescribes. Milestones M10 → M11 → M12 → M13; each
checkpoint gates the next milestone.

## Read in this order (before any code)

1. `CLAUDE.md` + `AGENTS.md` (protocol, boundaries, order of truth)
2. `specs/002-watch-categories/spec.md` — especially §Edge-case decisions
   **E16–E29**. These are settled product decisions; never re-decide them.
3. `specs/002-watch-categories/plan.md` — the migration SQL, the zip v2
   strategy, and §Risks are load-bearing.
4. Per task: the files its **Files/DoD/Tests/Verify** block names, plus
   data-model.md (core tasks), contracts/api.md (server tasks), ui.md (web
   tasks) from the 002 directory.

## Decisions already made with the user — do not reopen

- Seven categories, **computed on read**, never stored; only
  `manual_list` (`watch_later`/`stopped`/NULL) persists. Precedence E16.
- Calendar + push + watch-page scope = **active trio** (watching +
  not_watched_recently + up_to_date).
- Specials: visible in the calendar with SPECIAL/OVA tags (OVA = name
  heuristic), still excluded from progress/categories, never in watch-next.
- finished + watch_later allowed; finished + stopped → 409.
- Legacy `paused` → NULL (dynamic); `plan_to_watch` → watch_later;
  `dropped` → stopped. Same mapping for DB migration, v1 zips, TV Time.
- Zip schemaVersion → 2; v1 still importable. suggestCompleted (001 E7)
  removed everywhere.

If you hit something genuinely undecided: make the smallest reasonable
choice and record it with a `<!-- DECISION: … -->` comment in the relevant
002 spec file, same commit (AGENTS.md rule). Silent divergence is the one
unforgivable failure mode.

## Hard guardrails (verbatim from the constitution/specs)

- **Never weaken the zip round-trip test** (Article III). If it fails, the
  code is wrong, not the test.
- Migration 0001 must pass the seeded v1-upgrade test (tasks.md M10.1)
  before anything is built on top of it.
- E19: only `manual`/`bulk` watch sources auto-clear manual lists — imports
  must not.
- Every category aggregate excludes `season_number = 0` (E1/E17).
- No provider imports outside `apps/server` (Article II); tests never touch
  the network; i18n TR+EN in the same commit (Article IX).
- **Do not attempt M9.2** (hosted deployment) — blocked on the user's
  credentials, out of scope.
- The web app being runtime-broken between M10.6 and M10.7 is expected; do
  not add compatibility shims for it.

## Verification

Per task: `pnpm lint && pnpm typecheck && pnpm test` (+ the task's own
**Verify** line). Checkpoints add a real browser walkthrough via `pnpm dev`
(server 4004, web 5173) in both locales. Full green suite before every
commit; conventional commits, scope = package (e.g.
`feat(core): M10.2 category engine`).

## Bookkeeping

- Check each task's box in `specs/002-watch-categories/tasks.md` as you land
  it, with `<!-- DECISION: … -->` notes for anything noteworthy (see 001's
  tasks.md for the established style).
- M13.2 updates the README/docs and then **deletes this HANDOVER.md** — it
  is a working document, not permanent documentation.
- The original product notes (`fikir.txt`) were deleted after being fully
  captured into spec 002; the spec is the source of truth, not the notes.
