# HANDOVER — spec 005 queued + outstanding browser checkpoints

**Status (2026-07-16):** Specs 001–004 are fully implemented and green
(484 tests). **Spec 005 (`specs/005-mobile-profile-ux/`) is approved and
not started** — it is the active work. Additionally, the accumulated
browser checkpoints from 003/004 are still waiting for a browser-capable
session (they can be folded into 005's M27 checkpoint sitting).

## Next up: spec 005 — Mobile-First UX, Profile Hub, Favorites & Stale Auto-Refresh

From the user's 2026-07-16 `fikir.txt` (mobile UX pass) + product Q&A the
same day (decisions locked in spec.md §Decisions). Read
`specs/005-mobile-profile-ux/spec.md` (especially §Edge-case decisions
E57–E73), then plan.md; execute `tasks.md` **M23 → M27 in order**
(M23.1 is the entry point). Summary of tracks:

- **M23 favorites** — `tracking.favorite` (first migration since 001!),
  zip v3→v4 (extend the round-trip test, never weaken — Article III),
  PATCH field, detail-page heart.
- **M24 stale auto-refresh** — 24h staleness constant, `staleOnly=1` on
  the refresh-all SSE endpoint, library-mount sweep + detail-open
  auto-refresh (visit-triggered — Article V compliant, no background
  jobs).
- **M25 profile hub** — `/user/$handle` (self-only; `me` in single mode),
  ProfilePage (favorites rail, stat tiles, links, relocated Tümünü yenile),
  AllSeriesPage, home trimmed to five categories, `/search` page, tab bar
  Kütüphane/İzle/Takvim/Ara/Profil.
- **M26 mobile ergonomics** — 3-col grid, filter FAB + bottom sheet,
  E71 inset rule (≤20px at 390px), back arrows, calendar BUGÜN anchor.
- **M27 checkpoint** — MANUELTEST §M27, README, this file.

Gotchas the specs call out: keep `app-header`/`app-tabbar`
view-transition names through the Layout restructure (E51 regression);
`CATEGORY_ORDER` stays untouched (home uses a new `HOME_CATEGORY_ORDER`);
the sweep runner is module-scoped (survives navigation, never concurrent
with the manual button); web never imports from packages (duplicate the
3-line staleness predicate). **M23.1's migration will run against the
user's real library.db on next server start — safe/additive, but say it
in the session summary.**

## Still outstanding: browser checkpoints (003 + 004)

A browser-capable session should fold these into the same sitting as M27:

- **003's M17.7** (`specs/003-dynamic-watching-ux/tasks.md`) — full
  `MANUELTEST.md` walkthrough for spec 003 sections, both locales, plus a
  002 regression spot-check.
- **004's M22** — `MANUELTEST.md` §M22 (import-wizard relic disclosure,
  Suits-shape archived import, Re:Zero all-filled bar, poster morph/
  cross-fade/reduced-motion/Firefox matrix, TMDB-parity URLs + canonical
  replace, E54–E56 re-verification).
- **002 leftovers** — M11.4/M12.4 boxes + five §Acceptance browser lines
  in 002's spec.md (implemented and test-green; boxes reserved for the
  browser pass).
- **M9.2** (hosted deployment) stays blocked on the user's credentials —
  do not attempt.

Note: 005 moves some furniture these checklists reference (search bar
location, stats/settings nav entries, library refresh button). Where a
MANUELTEST step's *surface* moved, verify the behavior at its new home and
annotate the step — don't fail it on furniture.

## The user's real library

`apps/server/data/library.db` (~277 items, 100% TVmaze-matched, no TMDB
key configured) still holds 3 relic items and one archived-but-
uncategorized show predating 004's importer fix (re-check by title: Troy
the magic show, Gotham, Y Gwyll relics; Suits should be Bırakıldı). User
data, not a task: offer (a) hand-fix in the UI or (b) danger-zone wipe +
re-import. Do not do either unprompted.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173)
pnpm test           # vitest across workspace; pnpm test packages/core etc.
pnpm typecheck && pnpm lint && pnpm build
```
