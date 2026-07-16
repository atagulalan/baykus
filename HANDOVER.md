# HANDOVER — specs 001–008 code-complete; combined browser pass is all that's left

**Status (2026-07-17):** Specs 001–008 are all code-complete. Nothing is
queued for new code work — the only remaining work anywhere in the repo is
the combined manual browser pass in `MANUELTEST.md`.

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
`/stats` page (20 sections). Landed 2026-07-17 in 6 commits (M44.2 decision
through M51), one per milestone, full gate green on each — see that folder's
tasks.md for the commit map. M52 (the browser checkpoint) is documented in
`MANUELTEST.md` §M52 but not yet walked — see below. `dashboard.html` is
kept until that walk's value spot-checks are done (M44.2's own clause),
then gets deleted in the same commit that checks off M44.2 + M52.1.

A headless-browser pass (playwright, set up ad hoc — not a standing project
skill) ran against the real library (246 series, 7151 episodes) during
M51: the full `/stats` page rendered with zero console errors, and the pass
caught and fixed one real bug (weekly watch-time panel was spacing bars by
array position over the payload's sparse week list rather than true ISO
week number). This is not a substitute for the MANUELTEST.md §M52 walk
(dashboard.html spot-checks, zip re-import, tz sanity, two-language pass)
— it just means the code side is already known-good going into it.

## What's left, period: one combined browser pass

`MANUELTEST.md`'s **§M33** section covers specs 002–006 and folds in every
older pending item (§M27 and earlier); **§M52** (new) covers spec 008. None
of it needs new code — it's all manual verification xava does when there's
browser access. §M33 and §M52 can be walked in either order.

One open judgment call from 006 still needs a human decision before it's
code-work (unrelated to 008): **ResetLibraryDialog's E74 phrase-block
styling** — see `specs/006-design-conformance/tasks.md` M28.2's
`<!-- DECISION -->` note and `spec.md`'s acceptance checklist. Not a bug,
just out of M28's className-only scope.

If nothing above applies when you read this (browser pass done, decision
made), there is nothing queued — ask xava what's next before starting new
work.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173, proxies /api and /img)
pnpm test           # vitest across workspace
pnpm typecheck && pnpm lint && pnpm build
```
