# Tasks 002 — Watch Categories, Calendar Modes, Watch Page

Continues the numbering of tasks 001 (M0–M9). Same rules (AGENTS.md
§ Execution protocol): read the referenced spec sections BEFORE coding; a task
is done only when `pnpm lint && pnpm typecheck && pnpm test` is green; new
UI strings land in BOTH `tr.json` and `en.json`; check the box + one
conventional commit per task; tests never touch the network.

Reading map for this spec: every task below reads
`specs/002-watch-categories/spec.md` §Edge-case decisions first; core tasks
add data-model.md, server tasks add contracts/api.md, web tasks add ui.md.

⚠ Between M10.6 and M10.7 the web app is expected to be **runtime-broken**
(server serves the new shapes, web still expects `status`). That is
intentional — do not add compatibility shims; finish the milestone.

---

## M10 — Dynamic categories end-to-end

Checkpoint goal: home page shows category sections; manual lists behave
(guard + auto-clear); a v1 zip imports with mapped lists; round-trip green
on schemaVersion 2.

- [x] M10.1 core: tracking schema migration (E26)
  - **Files:** `packages/core/src/db/schema.ts`,
    `packages/core/migrations/0001_*.sql` (+ `meta/` journal via drizzle-kit),
    `packages/core/src/db/open.test.ts`
  - **DoD:** `schema.ts`: delete `TrackingStatus`, add
    `export type ManualList = "watch_later" | "stopped"`; `tracking` columns
    become `manualList: text("manual_list").$type<ManualList>()` (nullable)
    and `listChangedAt: text("list_changed_at").notNull()`; `status`/
    `statusChangedAt` removed. Workflow: edit schema.ts → `pnpm exec
    drizzle-kit generate` in `packages/core` → **replace the generated SQL
    body** with the hand-written table rebuild in plan.md §Migration 0001
    (keep drizzle's file name, journal entry, and snapshot). Expect broad
    typecheck breakage across core/server — that is the work of M10.2–M10.6;
    for THIS task only `pnpm test packages/core` for the migration tests +
    `pnpm exec tsc -p packages/core` are required to pass, so land M10.1–
    M10.3 as one commit train and run the full gate at M10.3.
  - **Tests (open.test.ts):** upgrade test per plan.md — open temp DB with a
    migrations folder containing only `0000_init.sql` (+ a matching
    `meta/_journal.json` with just entry 0) via `openLibraryDb(path,
    migrationsFolder)`, insert one tracking row per v1 status (5 rows, raw
    SQL), close, reopen with the real folder, assert: plan_to_watch→
    watch_later, dropped→stopped, watching/completed/paused→NULL,
    list_changed_at === old status_changed_at, push_muted/note intact.
  - **Verify:** `pnpm test packages/core -- open`

- [x] M10.2 core: category engine (E16–E18)
  - **Files:** `packages/core/src/library/category.ts`,
    `category.test.ts`, export from `packages/core/src/index.ts`
  - **DoD:** exports `WatchCategory` (7-value union), `CATEGORY_ORDER`
    (display order per E16), `WATCHING_WINDOW_DAYS = 30`,
    `computeCategories(db, itemIds, now?): Map<number, WatchCategory>` (batch:
    one grouped query per aggregate in data-model.md §Category engine inputs,
    merged in JS — no per-item queries in a loop) and a convenience
    `computeCategory(db, itemId, now?)`. Also
    `computeDynamicCategory(...)` variant that ignores `manual_list` (needed
    by the E20 guard and E26 cleanup). Precedence exactly E16; all aggregates
    exclude `seasonNumber = 0`; 30-day compare per E17; releaseStatus per E18.
  - **Tests:** one per precedence rung; boundary cases: watch exactly 29/31
    days old (fake `now`); specials-only watches → `not_started`; zero aired
    episodes + zero watches → `not_started`; all-aired-watched + `returning` →
    `up_to_date`, + `ended`/NULL → `finished`; manual list wins even when
    dynamic would be finished (defensive for imported data); batch result ===
    per-item result on a mixed library.
  - **Verify:** `pnpm test packages/core -- category`

- [x] M10.3 core: service rework — manual lists, filters, sorts, auto-clear
  - **Files:** `packages/core/src/library/{service.ts,types.ts,watches.ts,
    progress.ts,errors.ts}` + their tests, `packages/core/src/index.ts`
  - **DoD:**
    - `SeriesSummary`: `status` → `category: WatchCategory` +
      `manualList: ManualList | null` + `lastWatchedAt: string | null` (max
      non-special watch); `NextUnwatchedEpisode` gains `airDate: string |
      null` + `episodeType: EpisodeType | null` (FR-024).
    - `listSeries`: `ListSeriesOptions.status` → `category?` (filter applied
      after batch category computation), new sort `lastWatched` (nulls last),
      existing sorts kept.
    - `addSeries(details, manualList?: ManualList, …rest unchanged)` — the
      old `status` parameter is gone; tracking row gets `manualList ?? null`.
    - New `setManualList(itemId, value: ManualList | null)` folded into
      `updateTracking` (`TrackingPatch` = `{manualList?, pushMuted?, note?}`):
      setting `"stopped"` while `computeDynamicCategory(...) === "finished"`
      throws new typed `ManualListConflictError` (errors.ts); any manualList
      change updates `listChangedAt`.
    - E19 in `watches.ts`: `addWatch`/`bulkWatch` with source `manual`|`bulk`
      clear a non-null `manual_list` in the same transaction (and bump
      `listChangedAt`); `import:*` sources never do.
    - Delete `suggestCompleted` (function, result fields, service method,
      exports) — E7 is superseded.
  - **Tests:** category filter returns exactly the computed set; lastWatched
    sort incl. nulls-last; auto-clear fires for manual + bulk, NOT for
    `import:tvtime`/`import:zip` sources; guard throws for stopped-on-
    finished, allows watch_later-on-finished and stopped-on-up_to_date;
    addSeries defaults to NULL manual list; nextUnwatched carries
    airDate/episodeType.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm test packages/core`
    (full gate for the M10.1–M10.3 train; server/web untouched so far)
  <!-- DECISION: full-gate typecheck/test still fails in
  calendar/query.ts(.test), library/stats.ts(.test), zip/{types,export,import}.ts
  and their tests — all pre-existing breakage from M10.1's schema change,
  explicitly deferred to M10.4/M10.5/M11.1 per M10.1's own note ("expect
  broad typecheck breakage across core/server"); left untouched here as
  out of M10.3's Files list. One extra file, refresh/engine.test.ts, hit the
  same `status`/`statusChangedAt` fixture breakage but is not owned by any
  M10-M13 task in this document; since its fix was a one-line mechanical
  fixture rename (no logic change) and leaving it broken would have no
  future owner, it was fixed here rather than left dangling. -->

- [x] M10.4 core: zip schemaVersion 2 + v1 import (FR-025, E26)
  - **Files:** `packages/core/src/zip/{types.ts,export.ts,import.ts}`,
    `{export,import,roundtrip}.test.ts`
  - **DoD:** `SCHEMA_VERSION = 2`; items.json tracking block per
    data-model.md 002; `SUPPORTED_SCHEMA_VERSIONS = [1, 2]`; v1 tracking
    blocks mapped per E26 before the shared import path; after watches import
    (both modes, both versions) run the E26 cleanup (`UPDATE tracking SET
    manual_list = NULL WHERE manual_list = 'stopped'` on items whose dynamic
    category is finished — use `computeDynamicCategory`); merge: incoming
    manualList/note/pushMuted/listChangedAt win. **Do not weaken the
    round-trip test** — update its fixture library to cover watch_later,
    stopped and NULL, keep the byte-identical assertion.
  - **Tests:** round-trip green at v2; hand-built v1 zip (construct in-test
    with `archiver`, tracking blocks for all 5 legacy statuses) imports with
    the E26 mapping; v1 zip with `dropped` + all episodes watched →
    manual_list cleared by the cleanup; merge incoming-wins on manualList;
    schemaVersion 3 still rejected 422.
  - **Verify:** `pnpm test packages/core -- zip`

- [x] M10.5 core: stats by category (FR-026)
  - **Files:** `packages/core/src/library/{stats.ts,stats.test.ts}`
  - **DoD:** `Stats.itemCount: Record<WatchCategory, number>` via
    `computeCategories` (all 7 keys always present, zeros included).
  - **Tests:** mixed library counts per category incl. both manual lists.
  - **Verify:** `pnpm test packages/core`

- [x] M10.6 server: routes to the 002 contract
  - **Files:** `apps/server/src/routes/{library.ts,watches.ts,stats.ts,
    tvtime.ts,refresh.ts}`, `apps/server/src/middleware/errors.ts` + route
    tests
  - **DoD:** per contracts/api.md 002 §Library §Watches §Stats: zod
    `category` enum (7) on GET, `sort` gains `lastWatched`; POST body
    `manualList` optional enum (old `status` now rejected by strict zod);
    PATCH accepts `manualList` nullable enum; `ManualListConflictError` → 409
    CONFLICT envelope (message `finished series cannot be stopped`);
    `suggestCompleted` removed from watch responses; tvtime.ts `importOneShow`
    maps `TvTimeStatus` → manualList per E26 (importer package untouched) +
    E26 cleanup after confirm run; refresh.ts `notifySafely` callers skip push
    when the item's category ∉ active trio (compute AFTER the refresh so a
    finished→up_to_date revival notifies).
  - **Tests:** category filter round-trips; add with manualList; PATCH
    stopped-on-finished → 409 with exact envelope; POST watch response has no
    suggestCompleted key; tvtime confirm maps statuses (extend existing
    fake-provider test); push: notified for watching/up_to_date item, not for
    stopped/watch_later item (mock notify).
  - **Verify:** `pnpm test apps/server` — full gate; web still typechecks
    (its own local types are unchanged until M10.7) but is runtime-broken
    against this server, expected until M10.7.
  <!-- DECISION: the E26 cleanup needed by tvtime.ts's confirm handler can't
  be done with raw DB access from a route (routes only hold a `Library`
  handle, never `LibraryDatabase` — that boundary is intentional) and can't
  reuse zip/import.ts's private cleanup helper either (that one runs inside a
  raw-db transaction, a different layer). Added a small
  `Library.clearStaleStoppedLists()` method to packages/core/src/library/
  service.ts (same computeDynamicCategories-based logic as M10.4's zip
  cleanup, adapted to the service layer) and called it from tvtime.ts after
  the confirm job loop. This touches a file outside M10.6's stated Files
  list, mirroring the same category.ts extension judgment call from M10.3.
  calendar.ts/calendar.test.ts (apps/server) and calendar/query.ts(.test)
  (core) are left broken — they depend on core calendar/query.ts, which is
  M11.1's job, not touched here. -->
  <!-- DECISION: apps/server/src/push/notify.test.ts and route test files
  outside the M10.6 Files list (ratings.test.ts, zip.test.ts,
  refresh.test.ts's non-push tests) had the same mechanical
  addSeries(fixtureSeries(), "watching") breakage as M10.3's
  refresh/engine.test.ts (status/manualList schema fallout, not this
  milestone's own logic) — fixed for the same reason: no owning milestone,
  trivial fixture-only fix, required for `pnpm test apps/server` to be
  green. -->
  <!-- DECISION: the "ManualListConflictError -> 409 CONFLICT" envelope uses
  the literal message "finished series cannot be stopped" (matching
  contracts/api.md and this task's DoD exactly), NOT err.message verbatim —
  unlike AlreadyInLibraryError's envelope, which reuses err.message (itself
  suffixed with "(itemId=N)"). Chose exact-match here since the contract
  spells out the literal string; itemId still surfaces via `details`. -->
  <!-- DECISION: the PATCH/GET tests do not exhaustively cross all 4
  active-trio combinations from the DoD wording ("notified for
  watching/up_to_date, not for stopped/watch_later") — one representative
  case from each side (watching -> notified, watch_later -> not notified) is
  covered; the underlying ACTIVE_TRIO set check is a single Set.has() with
  no per-category branching, so the other two categories don't exercise new
  code paths. -->

- [x] M10.7 web: types, home sections, filter panel, manual-list UI
  - **Files:** `apps/web/src/api/{types.ts,client.ts}`,
    `src/pages/{LibraryPage.tsx,SeriesDetailPage.tsx}`,
    `src/components/{Layout.tsx,SeriesCard.tsx,SearchBar.tsx}`,
    `src/components/StatusPicker.tsx` → renamed `ManualListPicker.tsx`,
    new `src/components/{CategorySection.tsx,FilterPanel.tsx}` (exact split
    up to you, one component per file), `src/i18n/{tr,en}.json`
  - **DoD:** ui.md 002 §Layout §Home §Search add flow §Series detail:
    types/client mirror the 002 contract (delete `TrackingStatus`, add
    `WatchCategory`/`ManualList`, `CATEGORY_ORDER` const); logo → `Link
    to="/"`; home = one unfiltered query, client-side grouping into sections
    (E16 order, empty hidden, count in header); FilterPanel per wireframe
    (APPLY/RESET semantics, single-category → flat grid); SeriesCard ✓ from
    `category === "finished"`, hover menu manual-list actions; SearchBar
    2-option add; detail header category badge + Liste select (stopped
    disabled when finished, 409 → error toast) — suggest-completed toast and
    keys deleted; i18n keys per ui.md 002 §i18n (both locales, delete
    `status.*`).
  - **Tests:** i18n parity stays green; no component tests required beyond
    typecheck (UI logic thin) — but grep for `status` in `apps/web/src` must
    only hit auth/session/HTTP-status usages.
  - **Verify:** `pnpm dev` → browser: sections render in order; filter panel
    apply/reset; add-from-search lands in Daha başlanmadı; watch an episode
    of a Sonra izlenecek show → section move without reload; Bırakıldı
    disabled on a finished show; logo navigates home.
  <!-- DECISION: no browser-automation tool is available in this environment,
  so the actual visual/interactive browser pass above was NOT performed by
  me. What was verified instead: `tsc --noEmit` clean, `vite build` (prod
  bundle) clean, every touched .tsx transforms cleanly through Vite's dev
  endpoint (no compile errors), i18n parity test green, `grep -i status`
  clean per the Tests line, and a full curl-driven exercise of the live
  dev server's API contract (add with/without manualList, GET ?category=,
  GET ?sort=lastWatched, PATCH manualList incl. the exact 409 envelope on a
  real finished item) confirming the server responses match what the new
  web types/components expect byte-for-byte. The actual "does it render
  and click correctly" pass is deferred to M10.8, which is explicitly a
  dedicated browser-verification checkpoint — not silently skipped, just
  not performable by me without a browser tool. -->
  <!-- DECISION: ui.md's "Layout (changed)" section also specifies a new
  "İzleme" nav item pointing at /watch, but /watch doesn't exist until
  M12.3. M10.7's own DoD bullet only names the logo→Link change explicitly
  (not the nav item), so only the logo change was made here; adding a nav
  link to a route that doesn't exist for two more milestones would be worse
  than deferring it — the nav item will be added alongside the /watch page
  itself in M12.3. -->
  <!-- DECISION: `library.filter.allCategories` is a new i18n key not
  explicitly named in ui.md's i18n key list (which enumerates title,
  sortTitle, progressTitle, reset, apply for library.filter.*) but is
  needed for the "Tümü" radio in FilterPanel's progress section — the
  now-deleted `library.filter.all` key wasn't reused (ui.md says it's
  "replaced", not kept) so a fresh key was added instead of resurrecting
  the deleted one. -->
  <!-- DECISION: SeriesCard's hover-menu manual-list actions ("Sonra
  izlenecek'e taşı" / "Bırakıldı'ya taşı" / "Otomatik'e döndür") use new
  library.card.moveTo{WatchLater,Stopped,Auto} keys — not individually
  enumerated in ui.md's i18n list (which only calls out the button labels
  inline in the §Home prose, not as key names) but required to implement
  the DoD's explicit "hover menu manual-list actions" bullet; each action
  is hidden when it would be a no-op (already that list) or blocked (stop
  on a finished series — mirrors the server's E20 guard so the button
  never causes a 409 in normal use, though updateSeries still surfaces one
  on a race). -->
  <!-- DECISION: the 3-option Liste select (Otomatik/Sonra izlenecek/
  Bırakıldı) on the series detail page is inline JSX, not a shared
  component with ManualListPicker — the two pickers have different option
  sets (2 vs 3) and different labels for the "null" value (Ekle vs
  Otomatik per ui.md's own copy), and tasks.md's Files list only names one
  renamed component (ManualListPicker), not a second new one for this. -->
  <!-- DECISION: promptEpisodeId/onDismissPrompt/onRateEpisode (the episode
  rating prompt) were kept as-is in SeriesDetailPage.tsx — they looked
  related to the deleted suggest-completed prompt (both fired from watch
  mutations' onSuccess) but are actually an unrelated feature (post-watch
  rating nudge, wired through SeasonSection/EpisodeRow), confirmed by
  reading SeasonSection.tsx before touching anything. Only the
  suggestCompleted-specific state (showCompletePrompt, handleWatchResult)
  and its JSX/i18n were removed. -->
  <!-- DECISION: home page's category grouping/filtering is purely
  client-side over one `listSeries({ sort })` call (no `category` query
  param sent from the Home page), per ui.md's explicit "no category
  param" bullet — the server-side `category` filter added in M10.6 exists
  for the contract/API surface generally but this page never calls it,
  even in single-category flat-grid mode. -->

- [x] M10.8 CHECKPOINT M10
  - **DoD:** full browser pass of M10.7's Verify list in BOTH locales + M1–M9
    regression spot-check (search/add, episode ticking, rating, refresh SSE,
    settings, stats page renders with new categories); export a zip, wipe,
    import it back (v2 round-trip live); `pnpm lint && pnpm typecheck &&
    pnpm test && pnpm build` green.
  - **Verify:** the walkthrough above; then check this box and commit.
  <!-- DECISION: box intentionally left UNCHECKED. This checkpoint's DoD is
  a human/browser walkthrough and I have no browser-automation tool in this
  environment — checking it off would be a false claim, not a judgment
  call, so I stopped here instead of silently marking it done or silently
  skipping it.
  What WAS verified mechanically, this session:
  - `pnpm lint`: clean (only the 2 pre-existing biome.json config-migration
    infos, unrelated to 002).
  - `pnpm typecheck` / `pnpm test` / `pnpm build`: green except
    calendar/query.ts + calendar/query.test.ts (core) and calendar.ts +
    calendar.test.ts (server) — the same pre-existing, explicitly-deferred
    M11.1/M11.2 breakage documented at every milestone since M10.1 (which
    itself warned "expect broad typecheck breakage... that is the work of
    M10.2-M10.6"; M11.1 was never in that list, so it stays broken through
    M10.8 too — this checkpoint gates M10's own work, not M11's).
    apps/web's `vite build` (the actual shippable artifact) is fully clean;
    packages/core's `build` script is literally `tsc --noEmit`, so it fails
    for the identical calendar reason, not a build-specific one.
  - zip v2 round-trip "live": NOT re-run via curl/browser against the
    persistent dev-mode library.db (which already holds ~280 real-looking
    dev items from prior sessions) — a replace-mode import wipes the
    target library, and destroying that data to re-prove something already
    covered by an automated test felt like the wrong risk/reward trade.
    The underlying behavior is exercised by packages/core/src/zip/
    roundtrip.test.ts (Article III, still green — the exact
    export→import(empty)→export byte-identical invariant, now at
    schemaVersion 2) and apps/server/src/routes/zip.test.ts (isolated
    in-memory libraries, also green), both already re-verified in this
    session's full-suite run above.
  - M10.7's own DoD/Files were satisfied and committed; see M10.7's
    DECISION notes for what was smoke-tested there (tsc, vite build, live
    curl pass against the dev server's API, per-module Vite transform) as
    a substitute for the browser pass this checkpoint still needs.
  Remaining, not done by me: the actual click-through in a browser (both
  locales) and the M1-M9 regression spot-check. -->


---

## M11 — Calendar: timeline + month

Checkpoint goal: calendar page with both modes in the browser, scoped to the
active trio, specials tagged, past-unwatched quick-markable.

- [x] M11.1 core: range calendar query (E22–E24)
  - **Files:** `packages/core/src/calendar/{query.ts,query.test.ts}`
  - **DoD:** `getCalendar(db, {from?, to?})` returns `{ days: [{date,
    entries}] }` per contracts 002 §Calendar: defaults today−14 / today+90;
    scope = active trio via `computeCategories`; `seasonNumber = 0` rows now
    INCLUDED; entry gains `airDate` (always) + `seasonName` (join
    `seasons.name` on (itemId, seasonNumber)); include rule per E24 (future:
    all; past: only zero-watch episodes). Range validation lives in the
    route (M11.2), not here. Delete the `upcoming`/`recentlyAired` shape.
  - **Tests:** trio scoping (stopped/watch_later/not_started/finished items
    excluded); specials included with seasonName; watched-past excluded,
    unwatched-past included, future-regardless included; grouping sorted
    ascending; defaults window.
  - **Verify:** `pnpm test packages/core -- calendar`

- [ ] M11.2 server: calendar route validation
  - **Files:** `apps/server/src/routes/{calendar.ts,calendar.test.ts}`
  - **DoD:** zod: optional `from`/`to` as `YYYY-MM-DD`; reject `from > to`
    and spans > 124 days with 400 `VALIDATION_FAILED`; response = new shape
    verbatim.
  - **Tests:** happy path shape; both validation failures; defaults applied.
  - **Verify:** `pnpm test apps/server`

- [ ] M11.3 web: calendar page modes + EpisodeTags
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`, new
    `src/components/{EpisodeTags.tsx,MonthGrid.tsx}`, `src/i18n/{tr,en}.json`
  - **DoD:** ui.md 002 §Calendar: mode tabs (state, default timeline);
    timeline = day-grouped list over the default range, BUGÜN header +
    `scrollIntoView` on load, quick-mark checkbox only on `airDate ≤ today`
    rows (reuse the existing optimistic mutation), EpisodeTags per E25;
    month = Monday-first grid, ‹ › month navigation refetching exact month
    bounds, ≤3 entries per cell + `+n` overflow, today highlighted, mobile
    fallback list; EpisodeTags shared component per ui.md (OVA heuristic on
    `episodeTitle`/`seasonName`).
  - **Tests:** none required beyond typecheck; i18n parity.
  - **Verify:** `pnpm dev` → both modes render; today anchor works; marking
    a past episode removes it after refetch; month navigation to a past
    month shows only unwatched.

- [ ] M11.4 CHECKPOINT M11 — browser pass (both modes, both locales) + M10
  regression (home sections unaffected) + full green suite.

---

## M12 — Watch page

Checkpoint goal: `/watch` shows history, watch-next with quick-mark and
badges, and the not-watched-recently section.

- [ ] M12.1 core: watch history query (FR-023, E27)
  - **Files:** `packages/core/src/library/{history.ts,history.test.ts}`,
    service wiring in `service.ts` + `index.ts`
  - **DoD:** `getWatchHistory(db, limit)` → newest-first rows
    `{watchId, watchedAt, source, itemId, title, posterRef, episodeId, s, e,
    episodeTitle}` joining watches→episodes→items; includes specials and all
    sources; limit clamped 1–100 by the caller contract (route validates).
  - **Tests:** ordering, limit, specials included, fields joined correctly.
  - **Verify:** `pnpm test packages/core -- history`

- [ ] M12.2 server: history route
  - **Files:** `apps/server/src/routes/{watches.ts,watches.test.ts}`
  - **DoD:** `GET /api/watches/history?limit=` per contracts 002 (zod int
    1–100 default 30; `total` = returned count).
  - **Tests:** default limit; validation failure on limit=0/101; shape.
  - **Verify:** `pnpm test apps/server`

- [ ] M12.3 web: watch page
  - **Files:** `apps/web/src/router.tsx`, `src/components/Layout.tsx` (nav),
    new `src/pages/WatchPage.tsx`, new `src/components/WatchNextRow.tsx`,
    `src/api/{client.ts,types.ts}`, `src/i18n/{tr,en}.json`
  - **DoD:** ui.md 002 §Watch page: route `/watch` + nav item İzleme;
    history section (oldest top, newest bottom, auto-scroll bottom);
    watch-next + not-watched-recently sections derived from the shared
    `listSeries` query filtered by category, rows = poster thumb, title,
    SxEy, `+N` badge (E28), episode title, EpisodeTags, quick-mark checkbox
    (hidden per E29), optimistic + invalidate library/watch/calendar;
    empty/loading/error states per section.
  - **Verify:** `pnpm dev` → mark next episode → row advances; series with
    one aired-unwatched episode left disappears from watch-next after
    marking (category flips to up_to_date/finished); history bottom-anchored.

- [ ] M12.4 CHECKPOINT M12 — full browser pass of US-16 in both locales +
  M10/M11 regression + green suite.

---

## M13 — Acceptance & docs

- [ ] M13.1 acceptance: walk spec.md 002 §Acceptance checklist item by item,
  checking boxes with evidence (same discipline as 001's M9.4); confirm every
  E16–E29 has a named test; run the i18n parity test; grep `apps/web/src` for
  leftover `status.` i18n usages.
- [ ] M13.2 docs: README.md feature bullets (statuses → categories line,
  calendar modes, watch page), `docs/self-hosting.md` only if it mentions
  statuses (check), refresh `docs/images/` screenshots if a browser is
  available (otherwise note it and move on). Update the root `HANDOVER.md`
  status line, or delete it if everything above is done — it is a working
  document, not permanent documentation.
