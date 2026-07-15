# Plan 005 — Technical Plan for Mobile-First UX, Profile Hub, Favorites & Stale Auto-Refresh

**Spec:** [spec.md](spec.md) · **Base:** plans 001 + 002 + 003 + 004 (stack,
layout, modes, cost model all unchanged — this plan only covers what 005
adds/changes).

## Shape of the work

Four tracks. Track A (favorites) and Track B (stale refresh) are pure
data/API additions and fully independent. Track C (profile + navigation)
consumes A's `favorite` field and hosts B's relocated button, so C lands
after A and B. Track D (mobile ergonomics) is web-presentational and mostly
independent, but its header/back work touches the same `Layout.tsx` as C —
do C first, D second. Every API change is additive; the app stays
runtime-working after every task.

1. **Favorites** (E61/E62) — first schema migration since 001, zip v4
   (first format bump since 003), one PATCH field, one heart button.
2. **Stale auto-refresh** (E63–E65) — one query param on the existing
   refresh-all SSE endpoint, a core staleness predicate, two web triggers.
3. **Profile hub + navigation** (E57–E60, E66) — new client-side routes,
   two new pages (Profile, AllSeries), one moved page (Stats), nav/tab-bar
   restructure, home category trim, refresh-button relocation.
4. **Mobile ergonomics** (E67–E73) — header/tab-bar chrome, search page,
   grid columns, FAB + bottom sheet, inset pass, back affordance, calendar
   scroll anchor.

## What changes where

| Package / app | Change |
|---|---|
| `packages/core` — db | `tracking.favorite` integer-boolean NOT NULL DEFAULT false in `schema.ts` + a new file in `packages/core/migrations/` (follow the existing generated-migration pattern). |
| `packages/core` — zip | `SCHEMA_VERSION = 4`; `SUPPORTED_SCHEMA_VERSIONS = [1,2,3,4]`; per-item tracking block gains `favorite` (export always writes it, import defaults absent → false); round-trip test extended. |
| `packages/core` — library | `SeriesSummary.favorite: boolean` off the existing tracking join; `updateSeries` (the PATCH service fn) accepts `favorite`; `STALE_REFRESH_HOURS = 24` + stale predicate used by refresh. |
| `packages/core` — refresh | `refreshAll` (engine) gains a `staleOnly` option: filters to stale items, NULL-`lastRefreshedAt` first then oldest-first. |
| `apps/server` — library route | PATCH body schema gains `favorite?: boolean`; `POST /api/library/refresh` gains zod-validated `staleOnly` query param wired to the engine option. |
| `apps/web` — routes | `/user/$handle`, `/user/$handle/all-series`, `/user/$handle/stats` (new); `/search` (new); `/stats` becomes a replace-redirect; route-tree additions only, no server routes. |
| `apps/web` — pages | `ProfilePage` (new), `AllSeriesPage` (new), `SearchPage` (new); `LibraryPage` (trim + sweep trigger + top-row slimming); `SeriesDetailPage` (heart + auto-refresh); `CalendarPage` (scroll anchor); `StatsPage` (unchanged content, now rendered under the profile route). |
| `apps/web` — components | `Layout.tsx` (mobile header: centered wordmark + back slot; tab bar: Ara + Profil, minus İstatistik/Ayarlar; desktop nav: Profil); `FilterPanel.tsx` (FAB + bottom-sheet presentation below `sm`); `SearchBar.tsx` (logic extracted to a shared hook); `EpisodeRow.tsx` + row components (inset pass); `SeriesCard.tsx` (3-up text scaling). |
| `apps/web` — lib | `lib/profilePath.ts` (self-handle param helpers, `me` canonicalization predicate — unit-tested like `seriesPath.ts`); `lib/staleness.ts` or equivalent (24h client predicate + module-scoped sweep guard). |
| i18n | New keys: profile.*, search page, favorites (heart aria/hint), sweep status line, back aria — both catalogs, parity test guards. |
| settings / contracts | No new settings keys. API deltas: PATCH favorite, refresh staleOnly, summary favorite — see contracts/api.md. |

## Favorites notes (E61/E62)

- **Migration mechanics:** `packages/core/migrations/` is drizzle-managed
  (`open.ts` runs `migrate()` on every open). Generate with drizzle-kit
  against the updated `schema.ts` (or hand-write matching the existing
  files' journal format — inspect `migrations/meta/_journal.json` first).
  `ALTER TABLE tracking ADD COLUMN favorite integer NOT NULL DEFAULT 0` is
  the entire content. Add a test in `db/open.test.ts` opening a pre-005 DB
  fixture (or a DB created by the previous migration set) and asserting the
  column exists with false values.
- **Zip:** export writes `favorite` unconditionally (canonical JSON — a
  always-present boolean keeps the round-trip byte-comparison trivial).
  Import: zod `.default(false)` on the tracking block so v1–v3 archives
  (field absent) parse clean; v4 validation requires nothing new beyond the
  boolean type. Merge path: tracking is "incoming wins" wholesale — the
  favorite rides the existing tracking upsert; verify no field-level
  cherry-picking exists that would skip it.
- **Round-trip test:** add a favorited item to the fixture library, assert
  survival. Do not touch existing assertions (Article III). Also add: v3
  archive (no favorite field) imports with favorite=false — extend the
  existing version-compat test.
- **Service/PATCH:** `updateSeries` already handles `manualList`/
  `pushMuted`/`note` partial updates — `favorite` is one more optional
  field through the same code path (tracking upsert). No `listChangedAt`
  bump on favorite-only changes (that timestamp is manual-list semantics,
  E-decisions in 002 — don't couple).
- **Web heart:** detail header action cluster; optimistic via React Query
  mutation with `onMutate` rollback (mirror the pushMuted toggle if one
  exists, else the simplest optimistic pattern already in the codebase).
  Filled/outline `Heart` from lucide; accent yellow when set.

## Stale-refresh notes (E63–E65)

- **Predicate:** one exported helper in core (`isStale(lastRefreshedAt,
  now)`), used by the engine filter; a mirrored 3-line client predicate is
  fine (don't import core into web — boundary rules).
- **Engine:** `refreshAll` today iterates all items; the `staleOnly` option
  filters + orders (`ORDER BY last_refreshed_at IS NOT NULL, last_refreshed_at ASC`
  or the drizzle equivalent). SSE `total` derives from the filtered list —
  no progress-shape change.
- **Route:** query param, zod `z.enum(["1","true"]).optional()` (or
  equivalent) → 400 on junk per E64. Keep the SSE headers/flow identical.
- **Web sweep:** module-scoped runner (not a component effect that dies on
  unmount — the fetch stream must survive navigating away). Shape: a small
  module with `maybeStartSweep()` (throttle timestamp + "already running"
  flag) and a subscribable progress snapshot (tiny external store via
  `useSyncExternalStore`, or a module singleton + React Query's
  `queryClient.invalidateQueries` on complete). LibraryPage calls
  `maybeStartSweep()` in an effect and renders the status line from the
  store. Manual refresh-all (profile) sets the same "running" flag so the
  two never race from one client.
- **Detail trigger:** in `SeriesDetailPage`, an effect on
  `query.data?.lastRefreshedAt` + a `useRef` fired-guard; call the existing
  `refreshSeries(id)` then invalidate detail + library on success; swallow
  errors. Do not gate render on it.

## Profile/navigation notes (E57–E60, E66)

- **Self-handle resolution:** session data (`mode`, `handle`) is already
  fetched in `Layout`. `lib/profilePath.ts` exports
  `selfHandleParam(session): string` (`handle ?? "me"`) and
  `resolveProfileParam(param, session): "self" | "canonicalize" | "not-found"`.
  Unit-test the matrix (single/multi × me/own/foreign). The page replace-
  navigates on `"canonicalize"` (multi-mode `/user/me` → `/user/<handle>`),
  renders not-found on `"not-found"` — same replace-no-loop discipline as
  E52 (predicate tested, not hoped).
- **Route tree:** flat routes like the existing ones (the codebase
  deliberately avoids pathless layout routes — keep that). `/stats`
  route's component becomes a tiny redirect component (replace-navigate to
  `/user/<self>/stats`); StatsPage itself moves under the profile route
  unchanged.
- **ProfilePage:** favorites rail = client filter of the standard
  `listSeries` response (`items.filter(i => i.favorite)`, sorted
  `lastWatchedAt` desc — the default sort already delivers that order);
  stat tiles reuse `getStats` (React Query will share the cache with the
  stats page). Refresh-all button: lift the mutation code out of
  LibraryPage mostly as-is; it coordinates with the sweep flag (see above).
- **Home trim:** a `HOME_CATEGORY_ORDER` constant (five entries) next to
  the existing `CATEGORY_ORDER` — do NOT touch `CATEGORY_ORDER` itself
  (stats, filter, all-series depend on it).
- **AllSeriesPage:** extract the grouped-grid rendering LibraryPage uses
  today into a shared component (or copy the ~40 lines — judge by how
  clean the extraction is; a forked FilterPanel is forbidden, a forked
  page shell is fine). No sweep trigger here (E60).

## Mobile-ergonomics notes (E67–E73)

- **Layout/header:** centered wordmark below `sm` needs the absolute-center
  pattern (`absolute left-1/2 -translate-x-1/2` or grid `1fr auto 1fr`) so
  back-arrow presence doesn't shift it. Keep `app-header`/`app-tabbar`
  view-transition names through the restructure (E51 regression risk #1).
  The back slot: `Layout` decides visibility from the matched route (a
  small "has tab entry" set), renders the arrow `sm:hidden`; fallback
  parent per E72's table — implement `canGoBack` via TanStack's
  `useCanGoBack()` if present in v1.128, else `window.history.length`
  heuristic behind one helper.
- **SearchBar extraction:** pull the query/debounce/add-mutation into
  `useSeriesSearch()` (hook returning state + handlers); `SearchBar`
  (dropdown) and `SearchPage` (full page, autofocus, stays-open-after-add)
  are two renderings. ManualListPicker reused as-is.
- **FilterPanel:** one component, two shells — below `sm` render trigger as
  FAB (fixed positioning must account for tab bar + safe-area:
  `bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]` order of magnitude)
  and panel as bottom sheet; `sm+` keeps the current popover. The
  draft-state/apply/reset logic is shared verbatim. Active-dot predicate:
  `sort !== DEFAULT_LIBRARY_SORT || category !== DEFAULT_LIBRARY_CATEGORY`.
- **Grid/card:** the grid class string appears in LibraryPage (×2 incl.
  skeleton) and CategorySection — extract one constant or component so
  3-col lands everywhere at once (all-series inherits). SeriesCard text:
  responsive text classes only, no layout change.
- **Inset pass (E71):** `Layout` main → `px-3 sm:px-6`. Then audit
  full-bleed rows at 390px: EpisodeRow (`px-4` → `px-2 sm:px-4`),
  CalendarEntryRow, WatchNextRow/watch-page rows, SeasonSection's own
  horizontal padding if any. The ≤20px acceptance is measured in devtools —
  record actuals in the checkpoint notes.
- **Calendar anchor (E73):** replace `scroll-mt-16` guesswork with a
  measured offset: read the header's `offsetHeight` (it's sticky, it's in
  the DOM) into `scroll-margin-top` via style, and run the
  `scrollIntoView({ block: "start", behavior: "instant" })` inside a
  double-`requestAnimationFrame` after `!isLoading`. Keep the
  per-mount-once ref. If image loads still shift the anchor, give timeline
  rows a fixed min-height (poster thumb size) rather than re-scrolling.

## Suggested milestone order (tasks.md has the full breakdown)

M23 favorites (core→server→web) · M24 stale refresh (core/server→web
triggers) · M25 profile hub + navigation (routes/profile → all-series/trim →
search/header) · M26 mobile ergonomics (grid/FAB → insets/back → calendar) ·
M27 checkpoint + docs.

## Risks / mistakes to avoid

1. **Round-trip test** — this spec touches the zip format for the first
   time since 003. Extend (new favorited-item assertion, v4 bump, v3
   compat), never weaken; if any *existing* assertion needs editing, stop —
   you've broken Article III.
2. **Migration on real data** — the user's live `library.db` (~277 items)
   will run this migration. `NOT NULL DEFAULT 0` on ALTER is safe in
   SQLite; anything fancier is not. Test against a copy, never the live
   file.
3. **Article V wording** — the sweep is visit-triggered. No timers that
   re-fire while idle (the 15-min throttle limits *re-triggering on
   mount*, it is not a polling interval), no service-worker scheduling.
4. **View-transition regressions** — Layout restructure must keep
   `app-header`/`app-tabbar` names; the FAB gets its own name (E70). The
   E51 browser matrix re-runs in M27's checkpoint.
5. **`CATEGORY_ORDER` blast radius** — home trims via a new constant;
   stats/filter/all-series keep the full order. Grep usages before
   changing anything.
6. **Redirect loops** — `/user/me` canonicalization and `/stats` redirect
   are replace-navigations guarded by tested predicates (the E52
   discipline). A loop between `me` and handle forms must be structurally
   impossible in `resolveProfileParam`.
7. **Sweep leaks** — the SSE fetch must not be tied to component lifetime
   (navigating away mid-sweep should neither abort nor duplicate it), and
   two sweeps must never run concurrently (module singleton flag).
8. **Boundary rules** — web imports nothing from packages; the staleness
   predicate is duplicated (3 lines), not imported. Provider/import
   boundaries untouched by this spec.
9. **i18n drift** — profile/search/back/sweep strings in both catalogs,
   same commit; parity test guards.
10. **Scope creep in the inset pass** — E71 is paddings only; do not
    restyle rows, reorder columns, or "fix" typography while in there.
