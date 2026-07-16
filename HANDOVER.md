# HANDOVER — specs 001–008 fully done; only the pre-008 §M33 browser pass is left

**Status (2026-07-17):** Specs 001–008 are all code-complete, and spec
008's own browser checkpoint (M52) is done too. Nothing is queued for new
code work. The only remaining item anywhere in the repo is `MANUELTEST.md`
**§M33**, an older backlog predating 008 (specs 002–007) — see below.

Spec **007** (`specs/007-post-006-deltas/`) documents out-of-006 work that
landed in the same working tree, in two batches: M34–M40 (schedule calendar
mode, TV Time watch resolve, bulk unwatch, rewatched stats, search
open-on-select, chrome polish, metadata cache) and M41–M43 (TV Time parse
fidelity round 2, `needs_review` category + zip v5, polish — found as an
uncommitted working-tree batch, audited/fixed/packaged 2026-07-16, E89–E94).
See that folder's tasks.md for the commit map.

Spec **008** (`specs/008-stats-dashboard/`, M44–M52, E95–E111) rebuilt the
full statistics surface prototyped in root `dashboard.html` as a native part
of the app: `watches.date_unknown` fidelity flag + zip v6, the full
`packages/core/src/library/stats/` aggregate suite (`totals.ts`/
`buckets.ts`/`timeline.ts`), `GET /api/stats?tz=`, and a restructured
`/stats` page (20 sections). Landed 2026-07-17, one commit per milestone (M44.2 through M52), full gate
green on each — see that folder's tasks.md for the commit map (all boxes
checked).

**M52 (the browser checkpoint) is done, not just documented** —
`MANUELTEST.md` §M52 has the actual results, run via an ad hoc
headless-browser (playwright, not a standing project skill) pass against
xava's real library (246 series, 7316 watches), with zero mutation of that
real data (the one mutating check — dateUnknown → footer caveat — ran
against an isolated throwaway library; the one real-data mutation, a
language switch, was reverted to leave no trace):
- Full page renders with zero console errors; caught and fixed one real
  bug along the way (weekly watch-time panel was spacing bars by array
  position over the sparse week list instead of true ISO week number).
- `dashboard.html` comparison done and recorded (hero/favorites/binges) —
  file deleted afterward per M44.2's own deferral clause.
- tz correctness proven mathematically on live data: `?tz=Europe/Istanbul`'s
  `byHour` is exactly UTC's rotated by 3 (fixed UTC+3, no DST), totals
  identical.
- Two-language pass: full EN render confirmed, zero raw i18n keys.

## What's left, period: `MANUELTEST.md` §M33 (pre-008, older backlog)

§M33 covers specs 002–007 and folds in every older pending item (§M27 and
earlier) — none of it is 008 work, none of it needs new code. It just
never got walked in a session with browser access before this one.

One open judgment call from 006 still needs a human decision before it's
code-work (unrelated to 008): **ResetLibraryDialog's E74 phrase-block
styling** — see `specs/006-design-conformance/tasks.md` M28.2's
`<!-- DECISION -->` note and `spec.md`'s acceptance checklist. Not a bug,
just out of M28's className-only scope.

If §M33 is done and that decision's been made by the time you read this,
there is nothing queued — ask xava what's next before starting new work.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173, proxies /api and /img)
pnpm test           # vitest across workspace
pnpm typecheck && pnpm lint && pnpm build
```
