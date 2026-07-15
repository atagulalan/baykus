# HANDOVER — implement Spec 003 (Dynamic Watching Signals & UI Polish)

**From:** planning session (Claude Fable, 2026-07-15) ·
**To:** the implementing agent (Sonnet) ·
**Status:** Spec 003 written and approved this session; **no 003 code
exists yet.** Spec 002 is fully implemented (M10–M13); only
browser-checkpoint bookkeeping remains on it (see §Leftovers below —
do not lose these).

## Your mission

Implement `specs/003-dynamic-watching-ux/` end to end by working through
[`specs/003-dynamic-watching-ux/tasks.md`](specs/003-dynamic-watching-ux/tasks.md)
**strictly top-down**, one task = one commit, exactly as AGENTS.md
§ Execution protocol prescribes. Milestones M14 → M15 → M16 → M17; each
checkpoint gates the next milestone. Unlike 002 there is **no intentional
runtime-broken window** — every API change is additive, so the app must
work after every task.

## Read in this order (before any code)

1. `CLAUDE.md` + `AGENTS.md` (protocol, boundaries, order of truth — note
   the order is now constitution → code contracts → 003 > 002 > 001)
2. `specs/003-dynamic-watching-ux/spec.md` — especially §Edge-case
   decisions **E30–E41**. These are settled product decisions; never
   re-decide them.
3. `specs/003-dynamic-watching-ux/plan.md` — the migration SQL, the zip v3
   strategy, and §Risks are load-bearing.
4. Per task: the files its **Files/DoD/Tests/Verify** block names, plus
   data-model.md (core tasks), contracts/api.md (server tasks), ui.md (web
   tasks) from the 003 directory. 002's docs stay normative where 003
   doesn't override them.

## Decisions already made with the user — do not reopen

These four were asked and answered explicitly on 2026-07-15:

- Zero-watch series after the window → **`not_started`** (the category
  survives; `not_watched_recently` stays for started-then-stalled shows).
- **One** window setting (`watching_window_days`, default 30) governs all
  three windows: watch recency, new-episode lift, newly-added lift.
- The newly-added lift applies to **manual (search-bar) adds only** —
  hence `items.added_via` + zip schemaVersion 3. Imports must never flood
  İzleniyor.
- Icons come from **lucide-react**. FontAwesome is banned (user was
  emphatic).

Also settled in the spec (highlights): the new-episode lift never reaches
zero-watch items (E33); v1/v2 zips import with `addedVia='import:zip'`
(E32); segmented progress falls back to the plain bar on any skip or >12
seasons (E34); filter RESET = Son izlenen + Tümü (E41); the
browser-image-cache question needs **no work** — already implemented and
test-asserted (E40).

## fikir.txt coverage map (the notes are deleted; this is the receipt)

Every item from the 2026-07-15 product notes, and where it lives now:

| fikir.txt item | Where |
|---|---|
| 1. Dynamic İzleniyor (new-episode + newly-added + configurable ay) | US-18/US-19, E30–E33, M14 |
| 2. Sıfırla yanlış çalışıyor | E41 / FR-038, M16.3 |
| 3. Season-segmented progress bar (◼◼◼[====]◻◻) | E34 / FR-032, M15.1–M15.2 |
| 4. Takvim + zaman çizelgesi görselli; bugün highlighted | E35 / FR-033, M16.2 (today-highlight already fixed 2026-07-15 — re-verify via MANUELTEST §M11.4) |
| 5. Sticky üst menü; mobilde altta, ikonlu (FontAwesome yasak) | E36 / FR-034, M16.1 |
| 6. İç ekranda specials en altta; görsel tam gözükmüyor | E37 / FR-035, M15.3 |
| 7. Dizi görselleri browser cache | E40 / FR-039 — **already done**, no task |
| 8. Ayarlarda test notification | E39 / FR-037, M17.3–M17.4 |
| 9. Watch history aynı bileşen + up-next'e scroll | E38 / FR-036, M17.1–M17.2 |

## Leftovers from 002 — carry these, do not drop them

- **MANUELTEST.md §M11.4** has two unchecked retest items (month-mode
  today-highlight after the local-date fix; EpisodeTags NEW/UPCOMING
  split). They are xava's browser checks. `tasks.md` 002 boxes M11.4 and
  M12.4 are still unchecked pending them (M12.4's MANUELTEST items are all
  already confirmed — when xava confirms M11.4's two, check both boxes in
  a bookkeeping commit).
- **spec 002 §Acceptance checklist** has five unchecked browser-only
  lines — same pass, same bookkeeping.
- **M9.2** (hosted deployment) stays blocked on the user's credentials —
  do not attempt.
- Keep appending 003's checkpoint browser steps to **MANUELTEST.md**
  (established convention: no browser-automation tool; xava does one
  batched pass at the end).

## Hard guardrails (verbatim from the constitution/specs)

- **Never weaken the zip round-trip test** (Article III). Zip v3 touches
  types/export/import/fixtures — if the test fails, the code is wrong,
  not the test.
- Migration 0002 must pass the seeded upgrade test (tasks.md M14.1),
  incl. the tvtime-wins-over-zip backfill case, before anything is built
  on top of it.
- Engine rungs 1–2 and 4–5 stay byte-identical to 002; **every existing
  002 category test must pass unmodified** after M14.3. If one "needs
  fixing", stop and re-read E30.
- The new-episode lift must sit *below* the zero-watch rung — a
  never-started show must NOT jump to İzleniyor when an episode airs (E33).
- Any `addedVia` default of `'manual'` inside an import path recreates
  the İzleniyor flood the user explicitly declined (E32).
- No provider imports outside `apps/server` (Article II); tests never
  touch the network; i18n TR+EN in the same commit (Article IX);
  `season_number = 0` stays excluded from every category/progress
  aggregate (E1/E17).
- lucide-react goes in `apps/web` only, imported per-icon. No icon fonts,
  no CDN, **no FontAwesome**.

## Verification

Per task: `pnpm lint && pnpm typecheck && pnpm test` (+ the task's own
**Verify** line). Checkpoints add MANUELTEST.md sections + a curl pass
against `pnpm dev` (server 4004, web 5173) where a browser would be
needed. Full green suite before every commit; conventional commits,
scope = package (e.g. `feat(core): M14.3 category engine v2`).

## Bookkeeping

- Check each task's box in `specs/003-dynamic-watching-ux/tasks.md` as you
  land it, with `<!-- DECISION: … -->` notes for anything noteworthy
  (001/002 tasks.md show the established style).
- If you hit something genuinely undecided: make the smallest reasonable
  choice and record it with a `<!-- DECISION: … -->` comment in the
  relevant 003 spec file, same commit (AGENTS.md rule). Silent divergence
  is the one unforgivable failure mode.
- M17.6 updates the README and then this file; **delete this HANDOVER.md**
  only when every checkpoint — including 002's two leftover confirmations —
  is done. It is a working document, not permanent documentation.
