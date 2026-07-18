# START HERE — Spec 010 (ux-polish-round3), parallel agents

This spec is a UX overhaul of the baykuş web app, split into **4 independent work
packages (WPs)** meant to run **in parallel**, one agent each. It's a delta over
spec 009 (newest wins where they overlap).

## 1. Pick your work package
Open **your** WP file and treat it as your full brief — each is self-contained
(ground rules + your task + parallel-safety notes). Only edit files in your WP's
"Owns" list.

| WP | File | What you build | Backend? |
|----|------|----------------|----------|
| **WP1** | [`wp1-nav.md`](./wp1-nav.md) | Instagram-style bottom nav: icon-only, active = filled (search = bolder). Tabs stay watch/calendar/search/profile. | No |
| **WP2** | [`wp2-watch.md`](./wp2-watch.md) | Remove the filter FAB, move sort into page/section headers, sensible per-category default sorts, split Watch History into its own flat-list page. | No |
| **WP3** | [`wp3-series-detail.md`](./wp3-series-detail.md) | Move series metadata into a bottom sheet + add **cast** (TMDB credits fetch + store + UI). | Yes |
| **WP4** | [`wp4-profile.md`](./wp4-profile.md) | Profile overhaul: All-Series as a horizontal rail, selectable banner from watched-series backdrops, uploadable profile photo, stats led by time-spent (`8y 21g 4s`). | Yes |

`parallel-agent-brief.md` is the combined index (all four in one doc) if you want
the whole picture.

## 2. Before you code (every WP)
- Read `AGENTS.md` (repo root) and this folder.
- Code/comments/commits/docs in **English**; UI strings in i18n
  (`apps/web/src/i18n/tr.json` default + `en.json`, additive only); talk to the
  user in **Turkish**.
- Node 26 — prefix package commands with `env PATH="/usr/bin:$PATH"` if your shell
  inherited older node. Stop the dev server by killing the **root pnpm** process.
- Add vitest tests for new lib logic; run web + server suites before finishing.
- Verify UI end-to-end with the **`verify` skill** (headless Playwright).
- Never weaken the zip round-trip test or provider import boundaries.

## 3. Parallel-safety (the only cross-WP contact points)
- **`apps/web/src/api/types.ts`** — WP3 adds a `cast` slice to `SeriesDetail`; WP4
  adds `backdropRef` to `SeriesSummary`. Disjoint sections, **additive only**,
  trivial merge; last one to merge rebases.
- **Drizzle migrations** — WP3 (cast) and WP4 (avatar/banner) each add one.
  **Gotcha:** a freshly generated migration's real-clock `when` can sort *before*
  this repo's hand-set future journal timestamps and be silently skipped — after
  `drizzle-kit generate`, **bump the new entry's `when` by hand** to sort last in
  `meta/_journal.json`. WP3 and WP4 must use distinct, ordered timestamps.
- **i18n catalogs** — everyone adds keys; additive only, namespaced
  (`nav.*`, `watch.history.*`, `series.cast.*`, `profile.banner.*`, …).
- Everything else is single-owner: `Layout.tsx` (WP1); `router.tsx`,
  `uiPrefs.ts`, `sortSeries.ts` (WP2); `SeriesDetailPage.tsx` (WP3);
  `ProfilePage.tsx`, `settings.ts`, `date.ts` (WP4).

## 4. Suggested sequencing
- **WP1 and WP2** are fully independent — start immediately, no coordination.
- **WP3 and WP4** can run in parallel too; they only meet in `api/types.ts` and
  the migration journal — whoever merges second rebases those two spots.
