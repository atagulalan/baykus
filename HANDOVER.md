# HANDOVER — specs 001–007 code-complete; 008 proposed

**Status (2026-07-16):** Specs 001–007 are code-complete. Spec 006's remaining
work is the combined browser pass in `MANUELTEST.md` §M33 (folds in older
pending checkpoints). Spec **007** (`specs/007-post-006-deltas/`) documents
out-of-006 work that landed in the same working tree, in two batches:
M34–M40 (schedule calendar mode, TV Time watch resolve, bulk unwatch,
rewatched stats, search open-on-select, chrome polish, metadata cache) and
M41–M43 (TV Time parse fidelity round 2, `needs_review` category + zip v5,
polish — found as an uncommitted working-tree batch, audited/fixed/packaged
2026-07-16, E89–E94). See that folder's tasks.md for the commit map.

## Active: spec 008 — Stats Dashboard (APPROVED — start here)

Spec **008** (`specs/008-stats-dashboard/`, M44–M52) rebuilds the full
statistics surface prototyped in root `dashboard.html` (a throwaway static
export from a TV Time GDPR zip, generated 2026-07-02) as a native part of
the app: `watches.date_unknown` fidelity flag, extended `GET /api/stats?tz=`
payload (E95–E111), and a restructured Stats page with ~20 sections.

**Approved by xava 2026-07-16** — all four open decisions confirmed as
specced (E95 date flag + one-time re-import, single long page, full
20-section scope, Monday-first weekday). **Entry point: M44.2** (delete
`dashboard.html`; biome already ignores it), then **M45.1** onward through
tasks.md in order, one conventional commit per milestone, full gate
(`pnpm test && pnpm typecheck && pnpm lint && pnpm build`) green on each.
Read spec.md §Edge-case decisions + plan.md §Risks before M45 — the
Drizzle journal `when` must be hand-bumped past the future-dated entries,
and `getStats`'s existing fields must stay byte-compatible (E111).

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
