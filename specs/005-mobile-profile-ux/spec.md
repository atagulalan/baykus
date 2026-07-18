# Spec 005 — Mobile-First UX, Profile Hub, Favorites & Stale Auto-Refresh

**Status:** Approved · **Owner:** xava · **Created:** 2026-07-16
**Scope:** Series (TV) module. Restructures navigation around a profile hub
(`/user/:handle` with all-series and stats subpages), trims the home library
to actively-tracked categories, adds a favorites flag (heart on detail,
poster rail on profile — first zip format bump since 003, v3 → v4), replaces
the top-of-library "Tümünü yenile" button with visit-triggered stale
auto-refresh (>24h), and does a mobile ergonomics pass: centered logo +
search as a tab, 3-column grid, floating filter button with bottom sheet,
edge-to-edge list rows, back affordance, calendar opening anchored to today.

**Supersedes (in earlier specs):** 001/003 ui.md's header layout **on
mobile viewports only** (search bar in the header — moves to an "Ara" tab,
E67; desktop header unchanged); 002 ui.md §Home's all-seven-category
grouping (home now renders five, E59 — the full grouping moves to the
profile's all-series page, E60); the library top-row "Tümünü yenile" button
placement (001 ui.md §Home — relocated to the profile page, E66); `/stats`
and `/settings` as top-level nav entries (E57/E58 — the routes survive,
the nav entries move under Profil); zip `schemaVersion: 3` as the current
export version (003 data-model — now 4, E61). Everything else in
001 + 002 + 003 + 004 stays normative (newest wins on overlap; 005 wins
over all four).

## Summary

Every item from the 2026-07-16 `fikir.txt` (the second one — mobile UX) is
covered here — none dropped. The eight complaints map as follows:

1. *"genel yapı mobil uyumlu olmalı (geri butonu, menüler)"* → E71 (inset
   rule), E72 (back affordance); menus were already made touch-safe by 004's
   E56 standing rule, which this spec extends with concrete mobile chrome.
2. *"zaman çizelgesi ve takvim aşağı kaymış açılıyor"* → E73. Product Q&A:
   keep the past-days-above structure, fix the opening scroll so BUGÜN lands
   directly under the sticky header.
3. *"kütüphane/istatistikler/ayarlar tek sayfada, profilde"* → E57–E60.
   Product Q&A: library stays the home page but hides Bitirildi/Bırakıldı;
   the profile hub carries favorites + simple stats and links to detailed
   stats, the full all-series view, and settings. URL grammar per the
   user's own suggestion: `/user/x/all-series`-style.
4. *"mobilde padding, EpisodeRow çok içeride"* → E71.
5. *"tümünü yenile en üstte olmamalı; 1 günden fazla görmediyse otomatik
   yenilesin"* → E63–E66. Constitution Article V note: the auto-refresh is
   **visit-triggered** (library/detail page open), never a scheduler or
   background job; the manual refresh-all button survives, relocated to the
   profile page.
6. *"mobilde 3 column"* → E69.
7. *"filtrele butonu floating aşağıda"* → E70.
8. *"logo ortalansın, arama aşağıya"* → E67/E68. Product Q&A: search becomes
   its own bottom-tab ("Ara") with a full search page; the mobile header
   keeps only the centered wordmark (plus a contextual back arrow, E72).

Favorites are the one net-new data concept (user's addition during Q&A):
a boolean on `tracking`, a heart toggle on the detail page, a poster rail
on the profile. It is the first schema + zip format change since 003
(zip v4); the round-trip test is **extended** for it, never weakened
(Article III).

## Decisions locked in (from product Q&A, 2026-07-16)

| Topic | Decision |
|---|---|
| Profile scope | Library stays the home page, but home hides Bitirildi (finished) and Bırakıldı (stopped). Profile shows favorites + simple stats; detailed stats and the full all-series view are subpages reached from the profile. Settings link moves under profile. |
| Profile URLs | `/user/:handle` grammar (the user's `/user/x/all-series` suggestion), **self-only for now** — another user's handle 404s; single mode uses `me` as the handle segment. Public profiles were offered and declined as separate future work. |
| Favorites | Heart toggle on the series detail page, unlimited count ("Top N" showcase and skip-for-now were offered and declined). Favorites render as a poster rail on the profile. |
| Auto-refresh trigger | **Both** detail-open (refresh that series if stale) and library-open (sweep all stale items sequentially, rate-limit respectful). "Detail only" and "library only" were offered and declined. |
| Calendar opening | Keep the timeline structure (past days above), fix the opening scroll so BUGÜN aligns under the sticky header ("today pinned at top with load-earlier" and "month as default" were offered and declined). |
| Mobile search | Search leaves the mobile header entirely and becomes an "Ara" bottom tab with a dedicated page; the logo centers. (Second header row and expanding icon were offered and declined.) |

## User stories

### US-30: Profile hub
As a user, my home page shows only what I'm actively tracking; everything
else lives one tap away in my profile. `/user/me` (or `/user/<myhandle>` on
the hosted instance) shows my favorites and headline numbers, and from
there I reach my full library (`…/all-series`), detailed stats (`…/stats`),
and settings.

- Home renders watching / not-watched-recently / not-started / watch-later /
  up-to-date sections only (E59); finished + stopped live in all-series.
- Profile = favorites rail + episodes-watched / hours / active-series tiles
  + all-series, detailed-stats, settings links + the manual refresh-all
  button (E58).
- `/user/<someone-else>` 404s — profiles are self-only in 005 (E57).

### US-31: Favorites
As a user, I can heart a series on its detail page and see all my hearted
series as a poster rail at the top of my profile. Favorites survive zip
export/import (v4) and round-trip losslessly.

### US-32: Always-fresh library
As a user, I never think about refreshing: opening the library quietly
refreshes anything not refreshed in the last 24 hours (progress shown
subtly, failures silent), and opening a series detail refreshes that series
if stale. The manual "Tümünü yenile" still exists on my profile — it is the
primary path (Article V); the auto-sweep is a convenience layered on top.

### US-33: Mobile-first ergonomics
As a mobile user: the header shows a centered baykuş wordmark (with a back
arrow on subpages), search is a thumb-reachable bottom tab, the library
shows 3 poster columns, the filter is a floating button opening a bottom
sheet, and list rows (EpisodeRow) run nearly edge-to-edge instead of being
double-inset.

### US-34: Calendar opens at today
As a user, opening the Takvim tab shows the BUGÜN row at the top of my
viewport, directly under the app header — past days are still there when I
scroll up, but I never *land* on them.

## Functional requirements

- **FR-053** Profile routes (E57): `/user/$handle`, `/user/$handle/all-series`,
  `/user/$handle/stats` (client-side only — no new server endpoints).
  Self-only resolution: multi mode accepts the session handle (and `me`,
  which replace-navigates to the canonical handle form); single mode's
  canonical segment is `me`. Anything else renders the not-found state.
  `/stats` replace-redirects to the profile stats subpage; `/settings` is
  unchanged as a route.
- **FR-054** Profile page (E58): favorites poster rail, three stat tiles
  (reusing `GET /api/stats`), links to all-series (with total count),
  detailed stats, and settings, plus the relocated refresh-all button with
  its existing SSE progress UX.
- **FR-055** Home category trim (E59): the home "all" view renders only the
  five active categories; the FilterPanel's explicit category filter still
  offers all seven.
- **FR-056** All-series page (E60): the full seven-category grouped view
  with the same FilterPanel/sort — functionally today's LibraryPage.
- **FR-057** Favorites storage (E61): `tracking.favorite` boolean NOT NULL
  default false (drizzle migration); zip `schemaVersion` 4 with `favorite`
  in the per-item tracking block; v1–v3 imports read favorite=false; merge
  rule: incoming wins (001 §Merge tracking row). Round-trip test extended.
- **FR-058** Favorites API + UI (E62): `SeriesSummary.favorite: boolean`
  (additive, detail inherits); `PATCH /api/library/series/:id` accepts
  `favorite?: boolean`; heart toggle on the detail header (controlled,
  optimistic, ≥44px touch target, no hover requirement per E56).
- **FR-059** Stale refresh (E63/E64): an item is stale iff
  `lastRefreshedAt` is NULL or older than 24 hours (timestamp compare,
  constant — not a setting). `POST /api/library/refresh?staleOnly=1`
  refreshes only stale items, NULL-first then oldest-first; SSE shape
  unchanged, `total` = stale count. Library mount triggers the sweep with
  a ≥15-minute per-tab throttle; a slim status line shows progress;
  failures are silent.
- **FR-060** Detail auto-refresh (E65): opening a stale series detail fires
  the existing single-item refresh once per mount, silently; success
  refetches, failure is ignored.
- **FR-061** Refresh-all relocation (E66): the button leaves the library
  top row (the row disappears on mobile) and lands on the profile page.
- **FR-062** Mobile header + search tab (E67/E68): mobile header = centered
  wordmark (+ back arrow slot); search removed from the mobile header; tab
  bar becomes Kütüphane · İzle · Takvim · Ara · Profil; `/search` page
  reuses the SearchBar behavior (debounce, min-2-chars, add flow with
  ManualListPicker) full-page. Desktop header keeps logo + search + text
  nav (Kütüphane, İzle, Takvim, Profil).
- **FR-063** 3-column mobile grid (E69): every poster grid (home sections,
  filtered view, all-series, loading skeletons) renders 3 columns below
  `sm` with tightened gaps and scaled-down card text.
- **FR-064** Filter FAB (E70): on mobile the filter trigger is a floating
  action button above the tab bar opening the same sort/category form as a
  bottom sheet; an active-filter dot shows when sort/category differ from
  defaults. Desktop keeps the top-right popover button.
- **FR-065** Mobile inset rule (E71): one level of horizontal inset on
  mobile — at 390px viewport width, list-row content (EpisodeRow) starts
  ≤20px from the screen edge. Main container `px-3` below `sm`.
- **FR-066** Back affordance (E72): pages without a tab-bar entry (series
  detail, import, profile subpages) show a mobile-only back arrow in the
  header; history-back with a sensible fallback when the app has no
  history entry.
- **FR-067** Calendar anchor (E73): the timeline opens with the BUGÜN row
  at the top of the viewport directly under the sticky header, reliably
  (post-paint scroll, correct scroll margin); month mode unchanged.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E57 | Profile URL grammar and who can see whom? | Routes `/user/$handle`, `/user/$handle/all-series`, `/user/$handle/stats` — **client-side only**; every data call stays on the existing session-scoped endpoints, so no server change and no privacy surface. Self-only: in multi mode the param must equal the session handle; `me` is always accepted and replace-navigates (no history entry) to `/user/<handle>` when a handle exists. In single mode (`handle: null`) the canonical segment is `me` and any other param renders the not-found state. A foreign handle renders not-found — do NOT redirect to self (that would lie about whose profile it is) and do NOT build public profiles now; the grammar exists so public profiles can later ship without breaking URLs. `/stats` becomes a replace-redirect to `/user/<self>/stats` (old bookmarks keep working); `/settings` keeps its route — settings is device/account config, not profile content; only its nav entry moves into the profile page. |
| E58 | What exactly is on the profile page? | Top to bottom: identity row (owl-mark avatar placeholder + `@handle` in multi mode, the localized "Profilim" title in single mode, plus a settings gear icon-link); favorites poster rail (E62 — horizontal scroll, `SeriesCard`-derived tiles, ordered by `lastWatchedAt` desc to match the library default; empty state = one hint line pointing at the detail-page heart); three stat tiles reusing `GET /api/stats` verbatim (episodes watched, hours = `watchTimeMin/60` rounded, active series) — tapping the tiles area links to detailed stats; link rows: "Tüm diziler" (with total item count), "Detaylı istatistikler", "Ayarlar"; and the relocated "Tümünü yenile" button with its n/m SSE progress (E66). No new stats endpoint — favorites count and totals derive from data already fetched. The import wizard stays reachable from Settings (unchanged). <!-- DECISION: superseded by 011 E153 — order is banner → identity → stats tiles → favorites → all-series rails; Detailed stats / Settings link rows and profile Refresh all removed; Refresh all lives in Settings → Data. --> |
| E59 | Which categories disappear from home, and can I still see them there? | Home's "all" view renders exactly `watching, not_watched_recently, not_started, watch_later, up_to_date` — in the existing E16 order, empty-section behavior unchanged. `finished` and `stopped` sections are not rendered on home. **Capability is preserved:** the FilterPanel category radio still offers all seven + "all", and explicitly selecting finished/stopped shows that grid on home as today — only the default grouping is trimmed. Computed categories, the API, and `CATEGORY_ORDER` (used by stats, all-series, and the filter) are untouched — this is a home-rendering change only. The all-series page (E60) is the canonical place for the full picture. |
| E60 | All-series page shape? | `/user/$handle/all-series` renders what LibraryPage renders today: all seven category sections in E16 order, same FilterPanel semantics (sort + category, FAB/bottom-sheet on mobile per E70), same grid/card components, same three data states. Page header carries the total item count. No refresh-all button here (it's on the profile, E66); the stale sweep does NOT trigger from this page (library home only, E64 — one trigger surface is enough and the sweep is library-wide anyway). |
| E61 | Favorite storage, zip format, merge? | `tracking.favorite` integer-boolean NOT NULL DEFAULT false, added by a drizzle migration (the first since 001 — follow the existing migrations-folder pattern; existing DBs get the column with false everywhere). Zip: per-item `tracking` block gains `favorite: boolean`; `SCHEMA_VERSION` bumps to **4**; `SUPPORTED_SCHEMA_VERSIONS` becomes `[1,2,3,4]`; v1–v3 archives import with favorite=false (absent field, zod `.default(false)`). Merge (import into non-empty library): favorite joins the existing "tracking status/note: **incoming wins**" rule (001 data-model §Merge) — no OR-semantics special case; a v3 zip merged over a library with favorites therefore *clears* them (incoming false wins) — consistent, documented, acceptable for a personal-backup format. Round-trip test: **extend** with at least one favorited item asserting survival; existing assertions stay byte-identical (Article III — extending is allowed, weakening never). |
| E62 | Favorite API + heart mechanics? | `SeriesSummary.favorite: boolean` additive (read off the existing tracking join — no extra query; detail inherits; appears everywhere summaries do). `PATCH /api/library/series/:id` body gains optional `favorite: boolean` (zod; same route, same response shape — the updated summary/detail reflects it). Web: heart toggle in the detail header's action cluster — filled = favorited (accent yellow, brand-consistent), outline = not; controlled component, optimistic update with rollback on error, `aria-pressed`, ≥44px touch target, operable without hover (E56). Cards do NOT show a heart badge (no poster clutter); favorites are visible on the profile rail. No dedicated favorites endpoint/filter param — the profile rail client-filters the standard library list it already fetches. |
| E63 | What counts as "stale"? | `lastRefreshedAt IS NULL` **or** `lastRefreshedAt < now − 24h` — full ISO-timestamp compare (NOT the plain-date E3 rule: "1 günden fazla" means 24 hours, and refresh timestamps are exact). The threshold is a named constant in `packages/core` (`STALE_REFRESH_HOURS = 24`), deliberately **not** a settings key (declined scope — see Non-goals). Staleness is evaluated server-side for the sweep (E64) and client-side for the detail trigger (E65, from the detail's existing `lastRefreshedAt` field) — same rule both places. |
| E64 | Library-open sweep mechanics? | `POST /api/library/refresh` gains optional query param `staleOnly` (zod; accepts `"1"`/`"true"`; anything else 400 `VALIDATION_FAILED`; absent = today's full-library behavior — additive, manual button unchanged). With it, the engine refreshes only stale items (E63), ordered NULL-`lastRefreshedAt` first then oldest-first, sequentially through the existing rate-limit-respecting loop; SSE progress shape unchanged with `total` = stale count (0 stale → immediate `complete`, zero `progress` events). Client: LibraryPage mount fires the sweep **silently** — module-scoped (survives navigation, no duplicate stream per remount), throttled to at most one attempt per 15 minutes per tab, skipped entirely while a manual refresh-all is running. Progress renders as a slim one-line status above the grid (`{done}/{total}` + label), not a toast; on complete the library query invalidates once (not per event); per-item failures are silent (the engine already continues past them; the sweep never toasts errors — the manual button keeps its toast behavior). Only the library **home** page triggers it (not all-series, not other tabs). Article V: this is a page-visit-triggered fetch, not a background job or scheduler; manual refresh remains the primary, always-available path. |
| E65 | Detail-open auto-refresh mechanics? | When the detail query settles and the item is stale (E63, judged from the response's `lastRefreshedAt`), fire the existing `POST /api/library/series/:id/refresh` **once per mount** — a ref guard, no retry, no toast, no spinner beyond the row-level updates the refetch brings. On success: invalidate the detail + library queries (progress bars/next-episode data update in place). On failure: do nothing visible (`refresh_log` records it server-side as today); `lastRefreshedAt` stays stale so the next mount retries — acceptable. Never fires while the item's refresh is already pending, and doesn't stack with the E64 sweep (worst case a double refresh of one item — harmless, don't build coordination). The manual per-series refresh in the "⋮" menu (if present) keeps its explicit feedback; only the *automatic* path is silent. |
| E66 | Where does "Tümünü yenile" live now? | On the profile page (E58), full-width action row under the link rows, same SSE progress (n/m counter inline) and same completion toast (`library.refreshAllDone`) as today. It disappears from the library top row entirely — with the filter FAB'd on mobile (E70), the home top row vanishes on mobile viewports (desktop keeps a slim top-right row holding just the Filtrele button). It always refreshes **all** items (no staleOnly) — it is the Article V manual primary path and the escape hatch when the auto-sweep's 24h window is too lazy. <!-- DECISION: superseded by 011 E153 — Refresh all moves to Settings → Data; same sweep/progress/toast semantics. --> |
| E67 | Mobile header layout? | Below `sm`: single-row header — back-arrow slot on the left (E72, empty on tab-bar pages), the `baykuş` wordmark **absolutely centered** (independent of side-slot widths), nothing on the right; the SearchBar is not rendered on mobile at all. `sm` and up: today's layout stands (wordmark left, search center, text nav right — nav entries per FR-062: Kütüphane, İzle, Takvim, Profil). The header keeps `view-transition-name: app-header` (E51) — restructuring must not drop the chrome opt-out. Tab bar: Kütüphane (LayoutGrid), İzle (Play), Takvim (CalendarDays), Ara (Search), Profil (CircleUser) — 5 items, existing active/inactive styling, keeps `app-tabbar`. |
| E68 | Search page behavior? | `/search` (route exists for all viewports; only the mobile tab bar links it — desktop users keep the header dropdown, both paths coexist). Full-page composition: search input autofocused on mount, same 300ms debounce / min-2-chars / provider search call as SearchBar; results as a vertical list of touch-friendly rows (poster thumb, title, year, network); tapping a result opens the same add flow (ManualListPicker → add → success toast → library invalidation). Implementation MUST extract and share the search/add logic with SearchBar (one hook/module, two renderings) — no forked copy. Empty/loading/error states per the standard three-state convention. Adding from `/search` stays on the page (allows multi-add); the header dropdown's existing post-add behavior is unchanged. |
| E69 | Grid columns and card scaling? | All poster grids: `grid-cols-3` below `sm` (was 2), gaps tightened to `gap-2` below `sm` (`sm:gap-4` unchanged), `sm:grid-cols-4 lg:grid-cols-6` unchanged. Applies to: home category sections, home filtered grid, all-series page, and the loading skeletons (same class string — keep them identical to the real grid). SeriesCard at 3-up (~120px) scales its text down below `sm` (title ≤ `text-xs`, meta ≤ `text-[10px]`) and keeps the segmented progress bar legible (segment height unchanged; if 12 season squares can't fit ~120px, the existing E34 fallback bar rules apply — do not invent a new breakpoint rule). Poster morph names (E51) are per-item and unaffected by column count. The profile favorites rail (E58) is a horizontal scroll row, not a grid — same card component, fixed tile width ~96–112px. |
| E70 | Filter FAB + bottom sheet mechanics? | Below `sm`: the FilterPanel trigger renders as a FAB — fixed, right-aligned, floating above the tab bar (`bottom: tabbar + safe-area + 12px`), circular, accent-yellow funnel/filter icon, `aria-label`, and its own `view-transition-name: filter-fab` so route fades don't smear it. Tapping opens the existing sort/category form as a **bottom sheet** (fixed inset-x-0 bottom-0 panel, drag-free — tap the scrim or Kapat to dismiss; APPLY/RESET semantics and draft-state behavior unchanged from 002). An active-filter indicator dot on the FAB when `sort !== lastWatched || category !== "all"`. `sm` and up: today's top-right popover button unchanged. Surfaces: home + all-series (the only pages with the FilterPanel). One component, two presentations — do not fork FilterPanel's form logic. |
| E71 | The inset rule (padding)? | Normative for all mobile layouts from here on: **one level of horizontal inset per edge** — either the page container or the row/card provides the mobile gutter, never both stacked. Concretely: `main` goes `px-3 sm:px-6`; full-bleed list rows (EpisodeRow, calendar timeline rows, watch rows) reduce their own horizontal padding below `sm` (`px-2` order of magnitude) so total edge inset ≤20px at 390px viewport; grids rely on the container gutter alone. Modals/sheets keep their internal padding (they're not edge-anchored; bottom sheets span full width with internal `px-4+`). Acceptance is measured, not eyeballed: at 390px, EpisodeRow's first character starts ≤20px from the screen edge (was ~40px+ via `px-6` main + `px-4` row). Desktop (`sm+`) paddings unchanged. |
| E72 | Back affordance — where, and what does it do? | Mobile-only (`sm:hidden` — desktop relies on the browser); rendered in the header's left slot (E67) on every routed page that has **no tab-bar entry**: series detail, `/import`, `/user/*` subpages (all-series, detailed stats). Not on the five tab pages, not on `/settings` (reached from profile → gets the arrow too — it has no tab entry anymore; same rule, no exception). Behavior: if the router history can go back within the app, `history.back()` (preserves scroll/state and plays the reverse view transition); otherwise (deep link/fresh tab) navigate to the page's natural parent — detail → `/`, import → `/settings`, profile subpages → `/user/<self>`, settings → `/user/<self>`. Icon-button ≥44px, `aria-label` localized. The slot participates in the header's `app-header` transition group (no separate name). |
| E73 | Calendar opening-scroll fix — mechanics? | Root cause class: the current `scrollIntoView` in a `useEffect` fires while images/rows above are still reflowing, and `scroll-mt-16` is a guess at the header height — BUGÜN ends up anywhere but the top. Fix contract (behavior, not implementation dogma): when the timeline mounts with data, after paint (double-rAF or equivalent), the BUGÜN row's top edge sits directly below the sticky header (real measured header height or a CSS-var-driven `scroll-margin-top`), with **no smooth-scroll animation** (instant — this is initial positioning, not navigation); if the content above BUGÜN is shorter than one viewport the page simply rests wherever the browser puts it (no forced overscroll); re-anchor on every timeline (re)mount including mode-tab switches (current per-mount ref behavior stands); month mode keeps opening at the top with the current month (unchanged). If reflow-after-scroll (image loads) still displaces the anchor, reserve row heights rather than re-scrolling repeatedly — one settle, no scroll-fighting. |

## Non-goals

- **Public profiles** — viewing other users' profiles, sharing, follower
  mechanics. The `/user/:handle` grammar anticipates it; nothing else does.
  Declined in Q&A as separate future work.
- **Favorite curation** — ordering, pinning, "Top N" showcase slots, a
  `favoritedAt` timestamp. The flag is boolean; the rail sorts by
  `lastWatchedAt`.
- **Configurable staleness window** — 24h is a constant, not a setting
  (003's watching-window precedent does not extend here; revisit only on
  real demand).
- **Smart refresh policies** — skipping ended/finished shows in the sweep,
  per-category cadences, provider-aware scheduling. The sweep is
  staleness-only; the cost equals today's manual refresh-all.
- **Background/scheduled refresh** — Article V. Everything here is
  visit-triggered.
- **Removing capabilities from home** — the category filter keeps all seven
  options; only the default grouping is trimmed (E59).
- **Desktop redesign** — desktop header, popover filter, grid columns, and
  paddings are unchanged except where a shared component shrinks below `sm`.
- **Gesture navigation, pull-to-refresh, PWA install/offline work** — none
  of it; the back affordance and FAB are plain buttons.
- **A favorites API filter/endpoint** — client-side filtering of the
  existing list response suffices at this library size.

## Acceptance checklist (definition of done for 005)

> **§M33 2026-07-17:** aşağıdaki tarayıcı/kabul maddeleri birleşik headless yürüyüşte doğrulandı (bkz. root `MANUELTEST.md` §M33 başındaki özet). `[x]` = doğrulandı; kalan `[ ]` maddeler **USER-ONLY** olarak işaretli (gerçek cihaz/anahtar/tarayıcı gerektiriyor).

- [x] All FRs implemented; every E57–E73 decision that is automatable has at
      least one test asserting it (browser-only rows explicitly listed in
      MANUELTEST §M27).
      <!-- E61: packages/core/src/zip/{export,import,roundtrip}.test.ts +
      db/open.test.ts migration 0003 test. E62: library/service.test.ts
      favorite-only update + app.test.ts PATCH favorite (200/GET-list
      reflect/other-fields-untouched/400). E63/E64: refresh/engine.test.ts
      isStale + filterStaleItemIds ordering + apps/server routes/
      refresh.test.ts staleOnly route tests. E57: lib/profilePath.test.ts
      full resolution matrix incl. no-loop predicate. E59: lib/
      groupByCategory.test.ts HOME_CATEGORY_ORDER exclusion. E64/E65 web
      side: lib/staleSweep.test.ts (throttle, no-concurrent-run, manual-
      flag interplay, silent failure). E70: components/FilterPanel.test.ts
      active-dot predicate. E68: lib/useSeriesSearch.test.ts resultKey
      smoke test. E72: lib/backFallback.test.ts full route→fallback table.
      E58/E60/E66/E67/E69/E71/E73 are presentational/CSS/layout — no
      dedicated unit test, same precedent as 004's E51 (M25/M26 DoDs say
      "Tests: none beyond typecheck" for these). Marked partial rather
      than done because those and E62's heart/E70's sheet/E73's scroll
      rely on a human browser pass — see MANUELTEST.md §M27. -->
- [x] `pnpm lint && pnpm typecheck && pnpm test` green across the workspace.
      <!-- 60 test files, 528 tests, zero typecheck errors across all 10
      packages, confirmed after M26.3 (commit 0d861d5). -->
- [x] Zip round-trip test green and **extended**: a favorited item survives
      export→import byte-identically (schemaVersion 4); a v3 archive still
      imports (favorite=false); no existing round-trip assertion touched
      (Article III).
      <!-- roundtrip.test.ts: item2 (Breaking Bad) marked favorite: true in
      buildPopulatedDb, all three existing byte-identical assertions
      untouched and still pass. import.test.ts "v3 import (E61)" — v3 zip
      (no tracking.favorite field) imports with favorite=false. Merge
      test: incoming true sets it, incoming false clears it (M23.1). -->
- [x] Migration: opening a pre-005 library DB adds `tracking.favorite`
      (false everywhere) without data loss — asserted by a migration test.
      <!-- db/open.test.ts "migration 0003: tracking.favorite (E61)" — a
      v3-schema DB with existing tracking rows opens with favorite=0 on
      every row. Separately verified the actual 0003 migration applies
      cleanly against a safe .backup copy of the real library.db (M23.1;
      also caught and fixed a real drizzle-migration-journal timestamp
      bug in the process — see the M23.1 commit). -->
- [x] `staleOnly=1` refresh: unit/route tests cover the stale predicate
      (NULL, <24h fresh, >24h stale), ordering, `total` = stale count, and
      the 400 on junk param values.
      <!-- engine.test.ts "isStale (E63)" (null/23h/25h) + "staleOnly
      (E64)" (NULL-first-then-oldest ordering, fresh items untouched);
      routes/refresh.test.ts "staleOnly=1" skips a fresh item (0
      progress events, immediate complete), refreshes a backdated one,
      "staleOnly=bogus" -> 400 VALIDATION_FAILED, paramless path has an
      explicit regression test (M24.1). -->
- [x] Browser (mobile viewport, both locales): tab bar shows
      Kütüphane/İzle/Takvim/Ara/Profil; header = centered wordmark; back
      arrow on detail/import/profile-subpages/settings works with both
      in-app history and deep-link fallback.
      <!-- Implemented (M25.3 tab bar/header, M26.2 back arrow +
      backFallback.ts unit-tested for the fallback-parent half of this;
      the canGoBack-true "goes back" half needs a real browser history
      stack). Visual + interaction pass pending. See MANUELTEST.md §M27. -->
- [x] Browser: home shows five sections; Bitirildi/Bırakıldı reachable via
      profile → Tüm diziler and via the explicit category filter.
      <!-- HOME_CATEGORY_ORDER unit-tested (M25.2); the explicit-filter
      path reuses LibraryPage's pre-existing byCategory branch untouched.
      Visual pass pending. See MANUELTEST.md §M27. -->
- [x] Browser: profile shows favorites rail (after hearting ≥1 series),
      stat tiles matching `/user/<self>/stats` numbers, working links, and
      a functioning Tümünü yenile with progress.
      <!-- Implemented (M25.1); both the profile and stats pages call the
      same getStats()/listSeries() so the numbers are the same query,
      not just visually similar, but a live side-by-side click-through is
      still pending. See MANUELTEST.md §M27. -->
- [x] Browser: `/user/me` canonicalizes in multi mode; foreign handle 404s;
      `/stats` redirects into the profile stats subpage.
      <!-- resolveProfileParam's full matrix (single/multi × me/own/
      foreign) is unit-tested (profilePath.test.ts); the actual redirect/
      404 rendering (ProfileGuard, StatsRedirect) needs a browser. This
      dev instance runs single mode, so the multi-mode canonicalize path
      specifically has never executed against a real session. See
      MANUELTEST.md §M27. -->
- [x] Browser: library at 390px renders 3 columns; filter FAB opens the
      bottom sheet; APPLY/RESET behave as before; active-filter dot shows.
      <!-- SERIES_GRID_CLASSNAME shared across every grid surface (M26.1);
      hasActiveFilter unit-tested. FilterForm is one shared component
      behind both presentations, so APPLY/RESET logic isn't forked, but
      the sheet's open/scrim/dismiss interaction needs a human pass. See
      MANUELTEST.md §M27. -->
- [x] Browser: EpisodeRow content starts ≤20px from the screen edge at
      390px.
      <!-- Arithmetic, not a screenshot: main's px-3 (12px) + row's px-2
      (8px) = 20px, the exact ceiling (M26.2). DevTools measurement still
      pending. See MANUELTEST.md §M27. -->
- [x] Browser: Takvim opens with BUGÜN directly under the header
      (timeline), month mode unaffected.
      <!-- Root cause fixed (double-rAF instant scroll + measured
      --app-header-height instead of scroll-mt-16, M26.3); no unit test
      possible for scroll behavior itself. See MANUELTEST.md §M27. -->
- [x] Browser: with a >24h-stale library, opening home starts a quiet sweep
      (status line, cards update); opening a stale detail refreshes it
      silently; neither shows error toasts on failure.
      <!-- staleSweep.test.ts covers the throttle/concurrency/silent-
      failure logic end to end with a mocked refresh fn; the route-level
      staleOnly behavior against a real stale item is covered by
      apps/server's refresh.test.ts. The actual browser sighting (status
      line rendering, card data updating) needs a >24h-stale copy of a
      real library and a browser. See MANUELTEST.md §M27. -->
- [x] UI complete in TR and EN; i18n parity test green.
      <!-- apps/web/src/i18n/parity.test.ts green throughout (every M23–
      M26 task added keys to both catalogs in the same commit: series.
      favorite/unfavorite, library.sweep.progress, profile.*, notFound.
      profile, app.nav.search/profile, app.back, search.page.hint,
      library.filter.close). Full visual TR/EN pass pending a browser
      session. See MANUELTEST.md §M27. -->
- [x] README feature list updated (profile hub, favorites, auto-refresh,
      mobile UX pass).
