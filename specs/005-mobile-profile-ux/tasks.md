# Tasks 005 — Mobile-First UX, Profile Hub, Favorites & Stale Auto-Refresh

Continues the numbering of tasks 001 (M0–M9), 002 (M10–M13), 003 (M14–M17)
and 004 (M18–M22). Same rules (AGENTS.md § Execution protocol): read the
referenced spec sections BEFORE coding; a task is done only when `pnpm lint
&& pnpm typecheck && pnpm test` is green; new UI strings land in BOTH
`tr.json` and `en.json`; check the box + one conventional commit per task;
tests never touch the network (fixtures only).

Reading map for this spec: every task below reads
`specs/005-mobile-profile-ux/spec.md` §Edge-case decisions first; core/zip
tasks add data-model.md, server tasks add contracts/api.md, web tasks add
ui.md. 001+002+003+004 docs stay normative where 005 doesn't override them.

Every API change is additive — the app must stay runtime-working after
every task. Milestone order matters more than in 004: M25 consumes M23's
`favorite` field and rehomes M24's button surface; do M23 → M24 → M25 →
M26 in order.

Browser verification: no browser-automation tool is assumed. The checkpoint
task appends its manual steps to the root `MANUELTEST.md` (established 002
convention) and mechanically verifies everything else.

---

## M23 — Favorites (E61 storage + zip v4, E62 API + heart)

Checkpoint goal: heart a series on its detail page, see it flagged in the
API, export → wipe → import brings it back favorited.

- [x] M23.1 core: `tracking.favorite` migration + zip v4 + summary field
  - **Files:** `packages/core/src/db/schema.ts`,
    `packages/core/migrations/*` (new migration + journal — follow the
    existing generated pattern), `packages/core/src/db/open.test.ts`,
    `packages/core/src/zip/{types.ts,export.ts,import.ts}`,
    `packages/core/src/zip/roundtrip.test.ts` (extend only),
    `packages/core/src/zip/import.test.ts`,
    `packages/core/src/library/{types.ts,service.ts,service.test.ts}`
  - **DoD:** data-model 005 exactly: `tracking.favorite` boolean NOT NULL
    default false + migration (`ALTER TABLE tracking ADD COLUMN favorite
    integer NOT NULL DEFAULT 0`); `SCHEMA_VERSION = 4`,
    `SUPPORTED_SCHEMA_VERSIONS = [1,2,3,4]`; export writes `favorite`
    always, import defaults absent → false (zod `.default(false)`); merge
    keeps wholesale incoming-wins tracking upsert (favorite rides it);
    `SeriesSummary.favorite: boolean` off the existing tracking join;
    `updateSeries` accepts optional `favorite` through the same partial-
    update path WITHOUT bumping `listChangedAt`.
  - **Tests:** migration test — a DB created pre-005 opens with the column
    present, false everywhere; round-trip **extended** with a favorited
    item (existing assertions byte-identical — Article III); v3 archive
    imports favorite=false (extend the version-compat case); merge:
    incoming favorite=true sets it, incoming false clears it; summary
    carries favorite (false default, true after update); favorite-only
    update leaves `listChangedAt` unchanged.
  - **Verify:** `pnpm test packages/core` · run the migration against a
    **copy** of a real library.db and spot-check
    `SELECT favorite FROM tracking LIMIT 5`.

- [x] M23.2 server+web: PATCH favorite + detail heart
  - **Files:** `apps/server/src/routes/{library.ts,library.test.ts}`,
    `apps/web/src/api/{types.ts,client.ts}`,
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** contracts 005 §PATCH: body schema gains `favorite?: boolean`
    (zod), response reflects it; web types mirror `favorite` on
    SeriesSummary/SeriesDetail; detail header action cluster gains the
    heart per ui.md §Series detail (filled yellow when set, outline
    otherwise, `aria-pressed`, ≥44px, optimistic with rollback);
    `series.favorite`/`series.unfavorite` keys in both catalogs. No heart
    on SeriesCard.
  - **Tests (library.test.ts):** PATCH `{favorite: true}` → 200, summary
    shows it, GET reflects it; PATCH favorite-only leaves manualList/note
    untouched; invalid type → 400; list response carries favorite.
  - **Verify:** `pnpm test apps/server && pnpm test apps/web` · i18n
    parity green · `pnpm dev`: toggle the heart, reload, still set.

---

## M24 — Stale auto-refresh (E63 predicate, E64 sweep, E65 detail trigger)

Checkpoint goal: with a stale library, opening home starts a quiet sweep
(status line counts up, cards update); opening a stale detail refreshes
just that series; the manual button (still on library until M25) behaves
exactly as before.

- [ ] M24.1 core+server: staleness predicate + `staleOnly` refresh
  - **Files:** `packages/core/src/refresh/{engine.ts,engine.test.ts}`
    (+ the module that exports refresh constants),
    `apps/server/src/routes/{library.ts,library.test.ts}` (wherever
    `POST /api/library/refresh` lives — grep)
  - **DoD:** data-model 005 §Staleness: `STALE_REFRESH_HOURS = 24` +
    `isStale(lastRefreshedAt, now)` exported from core; engine `refreshAll`
    gains a `staleOnly` option filtering to stale items ordered
    NULL-`lastRefreshedAt` first then oldest-first; route accepts
    `?staleOnly=1|true` (zod — junk values 400 `VALIDATION_FAILED`,
    absent = full run); SSE shapes unchanged, `total` = filtered count,
    zero stale → immediate `complete`.
  - **Tests:** `isStale` — null → true, 23h → false, 25h → true (fixed
    `now`); engine staleOnly refreshes only stale items in the specified
    order, fresh items untouched; route — `staleOnly=1` skips a
    just-refreshed item (total excludes it), `staleOnly=bogus` → 400,
    paramless behavior byte-identical to before (regression assertion).
  - **Verify:** `pnpm test packages/core && pnpm test apps/server`

- [ ] M24.2 web: sweep on library mount + detail auto-refresh
  - **Files:** `apps/web/src/lib/staleSweep.ts` (new — module-scoped
    runner + `isStale` mirror + progress store),
    `apps/web/src/api/client.ts` (staleOnly param on `refreshAllSeries`),
    `apps/web/src/pages/{LibraryPage.tsx,SeriesDetailPage.tsx}`,
    `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md §Library home + §Series detail: `maybeStartSweep()` —
    module singleton, ≥15-min per-tab throttle, skipped while a manual
    refresh-all runs, stream survives navigation, library query
    invalidated once on complete, failures silent; LibraryPage mount calls
    it and renders the `library.sweep.progress` status line while running;
    SeriesDetailPage fires the existing single-item refresh once per mount
    when the loaded detail is stale (ref guard, silent, refetch on
    success, never while already pending). Manual button behavior
    unchanged (it still lives on library until M25.1).
  - **Tests:** staleSweep unit tests — throttle window, no concurrent
    runs, running-flag interplay with the manual mutation (fake timers +
    mocked client fn); client `isStale` mirror cases. Page wiring is
    M27 browser material.
  - **Verify:** `pnpm test apps/web` · `pnpm dev` with a stale copy of the
    real library: home starts the sweep (status line), detail of a stale
    series updates `lastRefreshedAt` (check via the detail response), no
    toasts anywhere on the automatic paths.

---

## M25 — Profile hub + navigation (E57–E60, E66–E68)

Checkpoint goal: tab bar reads Kütüphane/İzle/Takvim/Ara/Profil; home shows
five sections; `/user/me` shows favorites + stats + links; refresh-all
lives there; search works as a page.

- [ ] M25.1 web: `/user/$handle` routes + ProfilePage + button relocation
  - **Files:** `apps/web/src/router.tsx`,
    `apps/web/src/lib/{profilePath.ts,profilePath.test.ts}` (new),
    `apps/web/src/pages/ProfilePage.tsx` (new),
    `apps/web/src/pages/LibraryPage.tsx` (remove refresh-all UI),
    `apps/web/src/pages/StatsPage.tsx` (only if the move requires an
    export tweak), `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** data-model 005 §Profile URL grammar: routes
    `/user/$handle`, `/user/$handle/stats` (renders existing StatsPage),
    `/stats` → replace-redirect to self stats; `resolveProfileParam` +
    `selfHandleParam` per the resolution matrix (single/multi × me/own/
    foreign), replace-navigation on canonicalize, not-found state on
    foreign; ProfilePage per ui.md §Profile (identity row, favorites rail
    ordered lastWatchedAt desc with empty-state hint, three stat tiles
    reusing `getStats`, link rows, relocated Tümünü yenile with n/m
    progress + done toast, shared running-flag with the sweep); library
    top row loses the button (desktop keeps Filtrele only; mobile row
    handled in M26.1).
  - **Tests (profilePath.test.ts):** full resolution matrix incl. the
    no-loop predicate (canonical param equality — E52 discipline);
    favorites-rail filter/order helper if extracted.
  - **Verify:** `pnpm test apps/web && pnpm build` · `pnpm dev`:
    `/user/me` renders; `/stats` redirects; foreign handle 404s; heart a
    series → appears on the rail; Tümünü yenile works with progress.

- [ ] M25.2 web: AllSeriesPage + home category trim
  - **Files:** `apps/web/src/pages/AllSeriesPage.tsx` (new),
    `apps/web/src/router.tsx`, `apps/web/src/api/types.ts`
    (`HOME_CATEGORY_ORDER`), `apps/web/src/pages/LibraryPage.tsx`,
    `apps/web/src/components/CategorySection.tsx` (only if extraction
    lands there), `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md §All series + §Library home: `/user/$handle/all-series`
    renders all seven `CATEGORY_ORDER` sections + FilterPanel + total
    count, no refresh button, no sweep trigger; home "all" view groups by
    `HOME_CATEGORY_ORDER` (five sections — `CATEGORY_ORDER` itself
    untouched, grep its usages stay intact); explicit finished/stopped
    filter selection still renders on home; profile "Tüm diziler" row
    links here.
  - **Tests:** grouping helper — HOME order excludes finished/stopped
    while filter-selected finished still renders (extract `groupByCategory`
    usage or test at the constant level); existing LibraryPage tests stay
    green.
  - **Verify:** `pnpm test apps/web` · `pnpm dev`: home has no Bitirildi/
    Bırakıldı sections; all-series has both; filter category = Bitirildi
    on home still shows that grid.

- [ ] M25.3 web: `/search` page + header/tab-bar restructure
  - **Files:** `apps/web/src/pages/SearchPage.tsx` (new),
    `apps/web/src/components/SearchBar.tsx` (extract `useSeriesSearch`
    hook — same file or `lib/`), `apps/web/src/components/Layout.tsx`,
    `apps/web/src/router.tsx`, `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md §App chrome + §Search: tab bar = Kütüphane/İzle/Takvim/
    Ara/Profil (icons per spec); desktop nav = Kütüphane/İzle/Takvim/
    Profil with SearchBar center; mobile header = absolutely-centered
    wordmark, SearchBar not rendered below `sm`; `app-header`/`app-tabbar`
    view-transition names survive the restructure (E51); SearchPage —
    autofocus, debounce/min-chars parity, touch-row results, add flow via
    ManualListPicker, stays open after add, idle/three states; one shared
    search hook, no forked logic.
  - **Tests:** `useSeriesSearch` unit test (debounce + min-length gate with
    fake timers, add-mutation invalidation) if the hook is cleanly
    testable; otherwise pin the module boundary with a smoke test —
    browser matrix is M27's.
  - **Verify:** `pnpm test apps/web && pnpm build` · `pnpm dev` mobile
    emulation: 5 tabs, centered logo, Ara page adds a series; desktop:
    header search dropdown still works.

---

## M26 — Mobile ergonomics (E69–E73, E71 inset, E72 back)

Checkpoint goal: at 390px — 3-column grid, FAB filter with bottom sheet,
edge-to-edge rows, back arrows on subpages, Takvim opens at BUGÜN.

- [ ] M26.1 web: 3-column grid + filter FAB/bottom sheet
  - **Files:** `apps/web/src/pages/{LibraryPage.tsx,AllSeriesPage.tsx}`,
    `apps/web/src/components/{CategorySection.tsx,FilterPanel.tsx,
    SeriesCard.tsx}`, `apps/web/src/index.css` (only if the sheet needs it)
  - **DoD:** ui.md §Library home + §FilterPanel: one shared grid class
    (`grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6`) across
    sections/filtered/skeletons/all-series; SeriesCard mobile text scaling
    (title ≤ text-xs, meta ≤ text-[10px]); FilterPanel: FAB below `sm`
    (fixed above tab bar + safe-area, accent icon, aria-label,
    `view-transition-name: filter-fab`, active-filter dot) opening the
    same form as a bottom sheet (scrim/Kapat dismiss, APPLY/RESET
    unchanged); desktop popover untouched; form logic not forked.
  - **Tests:** active-dot predicate unit test; grid constant referenced
    from every surface (grep-assert in test or rely on the shared
    constant). Visuals are M27's.
  - **Verify:** `pnpm test apps/web && pnpm build` · devtools 390px: 3
    columns everywhere incl. skeletons; sheet opens/applies/resets; dot
    appears on non-default filter.

- [ ] M26.2 web: inset pass + back affordance
  - **Files:** `apps/web/src/components/{Layout.tsx,EpisodeRow.tsx,
    CalendarEntryRow.tsx,WatchNextRow.tsx}` (+ any row the 390px audit
    catches — SeasonSection etc.), `apps/web/src/lib/` (back-fallback
    helper if extracted), `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md §Inset pass + §App chrome: main `px-3 sm:px-6`;
    full-bleed rows `px-2 sm:px-4`-order so EpisodeRow content starts
    ≤20px from the edge at 390px (measure, record actuals in the commit);
    desktop unchanged; back arrow per E72 — mobile-only header-left slot
    on `/series/*`, `/import`, `/settings`, `/user/*` subpages;
    history-back when possible (TanStack `useCanGoBack` if available on
    1.128, else one helper), fallback parents per spec table; `app.back`
    key both catalogs; paddings only — no restyling (plan §Risks 10).
  - **Tests:** back-fallback helper unit test (canGoBack true → back;
    false → parent route per page). Measured insets are M27 material.
  - **Verify:** `pnpm test apps/web && pnpm build` · 390px emulation:
    row edges ≤20px; back arrow present/absent per route; deep-link to a
    detail → back lands on `/`.

- [ ] M26.3 web: calendar opening anchor
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`
  - **DoD:** E73 contract: after data + paint (double-rAF or equivalent),
    BUGÜN row top sits directly under the sticky header — measured header
    height (not guessed `scroll-mt-16`), instant scroll, once per
    (re)mount incl. mode-tab switches; short-content case doesn't force
    overscroll; month mode untouched; if image reflow displaces the
    anchor, reserve row min-heights rather than re-scrolling.
  - **Tests:** none beyond typecheck if the logic stays in the component
    (scroll behavior is browser material); extract the offset math into a
    pure helper + unit test if it grows beyond trivial.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm build` ·
    `pnpm dev`: open Takvim → BUGÜN under the header, no manual scroll;
    switch month↔timeline → re-anchors.

---

## M27 — CHECKPOINT 005 + docs

- [ ] M27.1 CHECKPOINT: MANUELTEST section + acceptance walk + README +
      HANDOVER
  - **Files:** root `MANUELTEST.md`, `README.md`, root `HANDOVER.md`,
    `specs/005-mobile-profile-ux/spec.md` (checklist boxes)
  - **DoD:** append an "M27" section to `MANUELTEST.md` covering, in both
    locales and at a 390px viewport where relevant: tab bar/centered
    wordmark/back-arrow matrix (incl. deep-link fallbacks); home
    five-section trim + explicit finished/stopped filter; profile page
    full walk (rail after hearting, tiles vs stats page numbers, links,
    Tümünü yenile progress); `/user/me` canonicalization + foreign-handle
    404 + `/stats` redirect; favorites zip round-trip (export → wipe →
    import → still favorited) on a THROWAWAY library; stale sweep (age a
    copy of the library >24h — status line, cards update, silence on
    failure) + stale detail auto-refresh; 3-column grid + FAB/bottom
    sheet + active dot; EpisodeRow ≤20px measurement; Takvim BUGÜN
    anchor; E51 view-transition regression re-check (poster morph +
    chrome opt-outs survived the Layout restructure). Walk spec.md
    §Acceptance checklist, check automated boxes, leave browser-only
    boxes with the `[~]`/comment convention. README gains: profile hub,
    favorites, stale auto-refresh, mobile UX pass. Update HANDOVER.md to
    reflect what remains after 005.
  - **Verify:** full gate `pnpm lint && pnpm typecheck && pnpm test &&
    pnpm build`; MANUELTEST section complete; boxes checked.
  <!-- NOTE: the user's live library.db migrates on first server start
  after M23.1 — mention it in the session summary when M23 ships (safe,
  additive, but say it out loud). -->
