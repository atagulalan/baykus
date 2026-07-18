# baykuş — Spec 010 — WP2: Watch sorting + Watch History page

You are the agent for **WP2**, working **in parallel** with 3 other agents on the
baykuş web app (`apps/web` React + TanStack Router/Query + Tailwind; `apps/server`
Fastify + Drizzle). Stay inside WP2's "Owns" list. This is spec 010
(ux-polish-round3), a delta over 009.

## Ground rules
- Read `AGENTS.md` and `specs/010-ux-polish-round3/` before coding.
- Code/comments/commits/`specs/` docs in **English**. UI strings in i18n catalogs
  (`apps/web/src/i18n/tr.json` default + `en.json`) — never hardcoded. tr is the
  source of truth. Talk to the user in **Turkish**.
- Match surrounding style; add/adjust vitest tests for any lib logic; run web +
  server test suites before finishing.
- Env: Node 26 — prefix package commands with `env PATH="/usr/bin:$PATH"` if your
  shell inherited older node. Stop the dev server by killing the **root pnpm**
  process (tsx watch respawns otherwise).
- Verify UI end-to-end with the **`verify` skill** (headless Playwright).
- Don't weaken the zip round-trip test or provider import boundaries.

## Shared-file etiquette (parallel safety)
- i18n `tr.json`/`en.json`: **additive only**, namespaced keys (yours:
  `watch.history.*`, sort labels). Never reorder/delete existing keys.
- **Yours alone:** `router.tsx`, `lib/uiPrefs.ts`, `lib/sortSeries.ts`. Don't
  touch `Layout.tsx` (WP1), `api/types.ts`, `settings.ts`, or migrations.

## Your task
**Goal:** Remove the floating filter FAB, surface **sort in the section/page
headers everywhere**, give each category a **sensible default sort**, and split
**Watch History into its own list page**.

**Requirements**
1. **Kill the filter FAB in grid view.** The `FilterPanel` FAB
   (`components/FilterPanel.tsx`) still appears on the grid/Library view — remove
   it there. Replace filtering/sorting affordances with **in-header sort controls**
   (reuse the Watch page's per-section header sort pattern from
   `CategoryListSection`) on **every** browse surface: Library grid (`/`),
   AllSeries, Watch sections.
2. **AllSeries** (`pages/AllSeriesPage.tsx`): **no category add/remove**, but
   **sorting must work** via the in-header control (not the FAB).
3. **Sensible per-category default sorts** ("mantıklı initial değerler"). Replace
   the single global `DEFAULT_LIBRARY_SORT` fallback in `sectionSort` with
   per-category defaults, e.g.:
   - `not_started` / plan-to-watch → **recently added first** (`added` desc)
   - `finished` → **recently finished first** (`lastWatched` desc as the proxy)
   - `watching` → recently watched first (`lastWatched` desc)
   - choose equally sensible defaults for the rest.
   Note `SeriesSummary` has no real `addedAt`/`finishedAt` (`sortSeries.ts` uses
   `id` desc as the "added" proxy; no finished timestamp). Use the available
   proxies; only add backend timestamps if the proxies are visibly wrong — and if
   so, **flag it** rather than silently expanding scope.
4. **Watch History → separate page.** Remove the collapsible **accordion**
   `HistorySection` from `WatchPage`. Add a new route (`/watch/history`) + page
   rendering history as a **flat list, most-recent watched at top**, no accordion.
   Preserve the unwatch action; the quick-mark fly-animation anchoring dance can be
   simplified away if it fights the new layout.
5. **Entry point:** add a **history icon at the top-right of the Watch view** (to
   the right of the "watch" title) linking to the new page.

**Owns:** `pages/WatchPage.tsx`, new `pages/WatchHistoryPage.tsx`, `router.tsx`,
`components/CategoryListSection.tsx`, `components/FilterPanel.tsx`,
`pages/AllSeriesPage.tsx`, `pages/LibraryPage.tsx`, `lib/sortSeries.ts`,
`lib/uiPrefs.ts`, `lib/useLibraryFilter.ts`, related tests + i18n.

**Acceptance:** No filter FAB anywhere; sort selectable from headers on Library
grid / AllSeries / Watch; each category opens on its sensible default sort;
`/watch/history` is a flat most-recent-first list with no accordion; history icon
present at Watch top-right; tests green.
