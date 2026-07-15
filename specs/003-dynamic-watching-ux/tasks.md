# Tasks 003 — Dynamic Watching Signals & UI Polish

Continues the numbering of tasks 001 (M0–M9) and 002 (M10–M13). Same rules
(AGENTS.md § Execution protocol): read the referenced spec sections BEFORE
coding; a task is done only when `pnpm lint && pnpm typecheck && pnpm test`
is green; new UI strings land in BOTH `tr.json` and `en.json`; check the box
+ one conventional commit per task; tests never touch the network.

Reading map for this spec: every task below reads
`specs/003-dynamic-watching-ux/spec.md` §Edge-case decisions first; core
tasks add data-model.md, server tasks add contracts/api.md, web tasks add
ui.md. 002's docs stay normative where 003 doesn't override them.

No intentionally-broken window this time: every API change is additive, so
the app must stay runtime-working after every task.

Browser verification: no browser-automation tool is assumed. Checkpoint
tasks append their manual steps to the root `MANUELTEST.md` (established
002 convention) and mechanically verify everything else.

---

## M14 — Living İzleniyor (engine v2, added_via, window setting, zip v3)

Checkpoint goal: HotD scenario works end to end — new episode on a dormant
show lifts it to İzleniyor; a search-bar add sits in İzleniyor for the
window; imports don't; the window length is a setting.

- [x] M14.1 core: migration 0002 — `items.added_via` (E32)
  - **Files:** `packages/core/src/db/schema.ts`,
    `packages/core/migrations/0002_*.sql` (+ `meta/` journal via drizzle-kit),
    `packages/core/src/db/open.test.ts`
  - **DoD:** `schema.ts`: `export type AddedVia = "manual" | "import:tvtime"
    | "import:zip"`; `items` gains `addedVia: text("added_via")
    .$type<AddedVia>().notNull().default("manual")`; update the settings
    table's known-keys doc comment to include `watching_window_days`.
    Workflow: edit schema.ts → `pnpm exec drizzle-kit generate` in
    `packages/core` → replace the generated SQL body with plan.md
    §Migration 0002 (ALTER + two backfill UPDATEs, tvtime UPDATE **last**;
    keep drizzle's file name, journal entry, snapshot).
  - **Tests (open.test.ts):** new "migration 0002" describe block using the
    folder-override pattern from M10.1's test — old folder = `0000` + `0001`
    + matching journal; seed: item A with a `import:zip` watch, item B with
    an `import:tvtime` watch, item C with both, item D with only `manual`
    watches, item E with zero watches; reopen with the real folder; assert
    added_via = import:zip / import:tvtime / import:tvtime (tvtime wins) /
    manual / manual. Existing 0001 test untouched.
  - **Verify:** `pnpm test packages/core -- open`
  <!-- DECISION: 0001's committed journal entry has "when": 1784297400000
  (2026-07-17), ahead of real wall-clock time when 0002 was generated
  (~1784120000000, 2026-07-15). drizzle's sqlite migrator only applies a
  migration if its journal "when" is greater than the last-applied
  migration's stored created_at (sqlite-core/dialect.js
  SQLiteSyncDialect.migrate), so 0002 was silently skipped until its "when"
  was hand-set to 1784297400001 (1ms after 0001) in
  packages/core/migrations/meta/_journal.json. Smallest fix that preserves
  ordering; future migrations must keep "when" monotonically increasing
  past this value rather than trusting drizzle-kit's real-clock default. -->

- [x] M14.2 core: `watchingWindowDays` setting (E31)
  - **Files:** `packages/core/src/library/{settings.ts,settings.test.ts}`
  - **DoD:** `Settings.watchingWindowDays: number` (default 30);
    `SettingsPatch.watchingWindowDays?: number`; key `watching_window_days`
    stored as string. Tolerant read: non-integer / <1 / >365 stored values
    fall back to 30 (route zod is the write-side guard; core never throws
    on a weird stored value).
  - **Tests:** default 30 when absent; write→read round-trip; garbage stored
    value ("abc", "0", "9999") reads as 30; patch leaves other keys intact.
  - **Verify:** `pnpm test packages/core -- settings`

- [x] M14.3 core: category engine v2 (E30, E33)
  - **Files:** `packages/core/src/library/{category.ts,category.test.ts}`
    (+ any importer of `WATCHING_WINDOW_DAYS` — grep; update
    `packages/core/src/index.ts` exports if the const is re-exported)
  - **DoD:** rename `WATCHING_WINDOW_DAYS` → `DEFAULT_WATCHING_WINDOW_DAYS`;
    `computeCategoriesInternal` reads `watching_window_days` **once per
    batch** via `getSettings(db)`; base select gains `items.addedAt` +
    `items.addedVia`; new grouped aggregate `newestAiredAt` (max non-special
    `air_date ≤ todayUtc()`); `categorize` implements E30 exactly — rung 3
    splits on addedVia/addedAt, rung 6 ORs the new-episode operand
    (plain-date compare per E33). Rungs 1–2 and 4–5 byte-identical to
    002's behavior. `ItemCategoryInputs` widened accordingly.
  - **Tests:** every 002 category test stays green **unmodified** (if one
    needs changing, the code is wrong — E30 note); new: fresh manual add,
    zero watches → watching; same but added exactly W days ago → watching;
    W+1 days → not_started; fresh `import:zip`/`import:tvtime` add →
    not_started; dormant watched show + episode aired W−1 days ago →
    watching; aired exactly today−W → watching; W+1 → not_watched_recently;
    zero-watch show + new episode aired yesterday → **not_started** (no
    lift, E33); custom window (settings 7) respected by both new operands;
    manual lists still win over both lifts.
  - **Verify:** `pnpm test packages/core -- category`
  <!-- DECISION: "every 002 category test stays green unmodified" holds for
  rungs 1-2/4-5 exactly as promised, but not literally for every rung-6/7 and
  E17-window-boundary fixture — spec.md's own header lists "E16's rungs 3-7
  (replaced by E30 here)" under Supersedes, and those old fixtures use a
  filler unwatched episode dated "-2 days" (to keep airedUnwatched>0 without
  affecting the watch-recency assertion being tested). Under E33 that filler
  date is *inside* the default window, so it now independently triggers the
  new-episode lift and flips the expected result. Fixed by moving the filler
  date outside the window (-40 days) in the 3 affected tests (rung 7, "exactly
  31 days", and the batch test's notWatchedRecently fixture) — assertions
  unchanged, only the incidental filler date moved. Separately,
  packages/core/src/library/service.test.ts and apps/server/src/app.test.ts
  had tests asserting a freshly-added zero-watch series lands in
  not_started; that assumption is exactly what US-18/E30 rung 3a changes
  (a manual add now lifts to watching for the window), so those assertions
  were updated to "watching" rather than left broken — out of M14.3's Files
  list but required for the mandatory full-green-suite-before-commit gate,
  same precedent as 002's M10.1/M10.3 mechanical-fixture-fix notes. -->

- [x] M14.4 core: `addSeries` options object + zip schemaVersion 3 (E32,
      FR-031)
  - **Files:** `packages/core/src/library/{service.ts,service.test.ts}`,
    `packages/core/src/zip/{types.ts,export.ts,import.ts}`,
    `{export,import,roundtrip}.test.ts`, `packages/core/src/index.ts`,
    plus mechanical call-site updates (grep `addSeries(` across core/server
    tests and routes)
  - **DoD:** `addSeries(details, opts?: { manualList?, externalRatings?,
    watchProviders?, tags?, addedVia? })` — positional variant deleted,
    `addedVia` defaults `"manual"`, insert writes it. Zip:
    `ZipManifest.schemaVersion: 3`; `ZipItemEntry.addedVia: AddedVia`;
    `SCHEMA_VERSION = 3`; `SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3]`; v1/v2
    entries default `addedVia = "import:zip"` before the shared path (v1's
    E26 tracking mapping unchanged); export writes `addedVia`; merge —
    `addedVia` follows the same item-level rule as `addedAt`. **Do not
    weaken the round-trip test** — widen its fixture library to cover all
    three addedVia values, keep the byte-identical assertion.
  - **Tests:** addSeries defaults addedVia manual / honors an explicit
    value; round-trip green at v3 incl. addedVia variety; hand-built v1
    **and** v2 zips import with `addedVia = 'import:zip'` (extend the
    existing v1 test, add a small v2 one); schemaVersion 4 rejected 422;
    merge rule covered.
  - **Verify:** `pnpm test packages/core -- zip && pnpm test packages/core
    -- service`
  <!-- DECISION: deleting the positional addSeries overload forced every
  call site to move in this commit, including apps/server/src/routes/tvtime.ts
  — leaving it on the old positional form wouldn't compile. Since the only
  correct value for an import path is addedVia: "import:tvtime" (a "manual"
  default there is exactly the İzleniyor-flood bug the constitution/spec
  forbid), that line was written here rather than left wrong until M14.5.
  M14.5 still owns the settings-route validation piece and adds the
  route-level test asserting the tvtime add computes not_started. Separately,
  building the addSeries/tvtime.ts options object as `{ manualList: x, ... }`
  where x can be `undefined` fails under this repo's `exactOptionalPropertyTypes:
  true` (an object literal may not assign `undefined` to an optional
  property); fixed with a conditional spread (`...(x !== undefined ? {
  manualList: x } : {})`), matching the existing pattern in
  routes/library.ts's toTrackingPatch. -->

- [x] M14.5 server: settings validation + tvtime addedVia
  - **Files:** `apps/server/src/routes/{settings.ts,settings.test.ts,
    tvtime.ts,tvtime.test.ts}`
  - **DoD:** settings PATCH zod gains `watchingWindowDays: z.number().int()
    .min(1).max(365).optional()`; GET/PATCH responses carry it (flows from
    core). tvtime `importOneShow` passes `addedVia: "import:tvtime"` in the
    addSeries options.
  - **Tests:** PATCH 14 round-trips; PATCH 0 / 366 / 1.5 → 400
    VALIDATION_FAILED; GET default 30. tvtime confirm: a zero-watch imported
    show computes as `not_started` even though it was just added (proves
    import:tvtime bypasses the lift — assert via the library list the
    existing fake-provider test already exercises).
  - **Verify:** `pnpm test apps/server`

- [x] M14.6 web: window setting UI
  - **Files:** `apps/web/src/api/types.ts`,
    `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md 003 §Settings: `Settings`/`SettingsPatch` types gain
    `watchingWindowDays`; number input (min 1, max 365) in the General
    section wired to the existing patch mutation; hint text; i18n keys
    `settings.general.watchingWindow(+Hint)` both locales.
  - **Tests:** i18n parity stays green; typecheck.
  - **Verify:** `pnpm dev` → change the window to 7, category buckets shift
    on home after refresh (mechanical: PATCH via curl + GET category
    grouping if no browser).
  - _(Home/watch/calendar need no code — categories come computed from the
    server.)_

- [x] M14.7 CHECKPOINT M14
  - **DoD:** append a "M14.7" section to root `MANUELTEST.md` covering: the
    three browser lines of spec.md §Acceptance (HotD lift, search-add lift
    + import non-lift, window re-bucketing); mechanically verify everything
    else: full gate (`pnpm lint && pnpm typecheck && pnpm test &&
    pnpm build`) + curl pass against a dev server (PATCH window, add a
    series, confirm `category` in responses).
  - **Verify:** the above; then check this box and commit.
  <!-- DECISION: full gate green (51 test files, 427 tests, zero
  typecheck errors, clean build incl. apps/web + apps/server). Curl pass
  against xava's real running dev library (280 items): POST a fresh
  manual add (Pluribus, tvmazeId 86175) → response had category
  "watching" immediately (E30 rung 3a), then deleted it again; PATCH
  watchingWindowDays 30→7 visibly shrank the İzleniyor bucket 75→74,
  restored to 30 after. The HotD new-episode-lift line and the TV
  Time/zip import non-lift line aren't mechanically checkable against
  live data without seeding specific air dates / a real TV Time export,
  so they're left as unchecked MANUELTEST.md items backed by the
  category.test.ts rung-6 unit tests and M14.5's tvtime.test.ts
  assertion respectively — box checked per the task's own "then check
  this box and commit" instruction (unlike 002's convention, 003 defers
  only the final M17.7 sweep to xava, per its own "leave the box for
  them" note). -->

---

## M15 — Segmented progress + series detail polish

Checkpoint goal: cards and the detail header show the season-segmented bar
(fallback intact); detail page has specials last and an uncropped poster.

- [x] M15.1 core: `seasonProgress` on summaries (E34, FR-032)
  - **Files:** `packages/core/src/library/{progress.ts,progress.test.ts,
    types.ts,service.ts}`, `packages/core/src/index.ts`
  - **DoD:** `getSeasonProgress(db, itemId): SeasonProgress` per data-model
    003 (non-special seasons with ≥1 episode; watched/total per season;
    `sequential` = watched set is a contiguous (s,e)-prefix — one ordered
    episode+watch scan, no per-episode queries); `SeriesSummary.
    seasonProgress` filled in `buildSummary` (detail inherits).
  - **Tests:** shape + ordering; specials excluded; empty seasons excluded;
    sequential true for a clean prefix; false when an episode is skipped
    mid-season; false when a later season has a watch before an earlier one
    finishes; fully-watched-everything → sequential true, all seasons
    watched == total; unaired episodes count in `total` only.
  - **Verify:** `pnpm test packages/core -- progress`

- [x] M15.2 web: `SegmentedProgress` component (E34)
  - **Files:** new `apps/web/src/components/SegmentedProgress.tsx` +
    `SegmentedProgress.test.ts`, `apps/web/src/api/types.ts`,
    `apps/web/src/components/SeriesCard.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** ui.md 003 §SegmentedProgress: pure
    `buildProgressSegments(sp): Segment[] | null` (null → fallback) +
    component rendering squares/frontier bar; replaces the hand-rolled bars
    in SeriesCard and the detail header; fallback path renders the existing
    single bar markup; types mirror `seasonProgress`.
  - **Tests (pure helper, plain vitest — M13.1 pattern):** segmented for a
    sequential 4-season mid-S2 case (◼ bar ◻ ◻); all-watched → all filled;
    non-sequential → null; 13 seasons → null; 0 seasons → null; 1 season →
    bar only.
  - **Verify:** `pnpm dev` → card + detail render segments; a skip-around
    series shows the plain bar.

- [ ] M15.3 web: detail polish (E37, FR-035)
  - **Files:** `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** seasons sorted client-side — numeric ascending, season 0 last;
    poster `w-40 h-auto` natural aspect (crop removed), placeholder keeps
    its aspect box.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm dev` → a series with specials shows them last; a
    non-2:3 poster (TVmaze item) renders whole.

- [ ] M15.4 CHECKPOINT M15 — append M15 steps to `MANUELTEST.md` (segments,
  fallback, specials-last, uncropped poster, TR+EN spot-check); full gate
  green; then check this box and commit.

---

## M16 — Chrome & visual calendar

Checkpoint goal: sticky header, mobile bottom tabs, posters throughout the
calendar, filter reset fixed.

- [ ] M16.1 web: sticky header + mobile bottom nav (E36, FR-034)
  - **Files:** `apps/web/package.json` (+ lockfile — add `lucide-react`),
    `apps/web/src/components/Layout.tsx`
  - **DoD:** ui.md 003 §Layout: sticky header (opaque bg, z-40); `<sm` nav
    hidden in header, fixed bottom tab bar driven by the same `navItems`
    array (icons LayoutGrid/Play/CalendarDays/ChartColumn/Settings, ~10px
    `app.nav.*` labels, active state, safe-area padding); `<main>` mobile
    bottom padding; `scroll-mt` on existing anchor targets (timeline BUGÜN
    header) so the sticky header never covers them. **No FontAwesome.**
  - **Tests:** none beyond typecheck; i18n untouched.
  - **Verify:** `pnpm dev` → scroll: header stays; <640px: bottom tabs
    navigate all five pages, active tab highlighted.

- [ ] M16.2 web: posters in calendar + timeline (E35, FR-033)
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`,
    `apps/web/src/components/MonthGrid.tsx`
  - **DoD:** ui.md 003 §Calendar: timeline `CalendarEntryRow` gains the
    40×56 thumb (placeholder on null/404 — SeriesCard's `onError` pattern);
    `CompactEntry` (desktop cells) gains the ~24px thumb, text-only when
    posterRef null; mobile month list switches to the timeline row
    rendering. `+n` overflow, tags, checkbox logic untouched.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm dev` → both modes + mobile width show posters; a
    null-poster entry renders cleanly.

- [ ] M16.3 web: filter RESET fix (E41, FR-038)
  - **Files:** `apps/web/src/components/FilterPanel.tsx`
  - **DoD:** delete `RESET_SORT`; `reset()` sets the draft to
    `DEFAULT_LIBRARY_SORT` + `DEFAULT_LIBRARY_CATEGORY`. Nothing else
    changes (draft-only semantics stay).
  - **Tests:** none beyond typecheck (constant swap).
  - **Verify:** `pnpm dev` → change both filters, SIFIRLA → radios show Son
    izlenen + Tümü, UYGULA applies.

- [ ] M16.4 CHECKPOINT M16 — append M16 steps to `MANUELTEST.md` (sticky,
  bottom tabs, posters both modes + mobile, reset, TR+EN); full gate green;
  then check this box and commit.

---

## M17 — Watch page, push test, acceptance & docs

Checkpoint goal: unified watch page, working test notification, 003
acceptance walked, docs refreshed.

- [ ] M17.1 core+server: history entries gain airDate/episodeType (E38)
  - **Files:** `packages/core/src/library/{history.ts,history.test.ts}`,
    `apps/server/src/routes/watches.test.ts`
  - **DoD:** `WatchHistoryEntry` + the select gain `airDate`,
    `episodeType` (straight off the joined episodes row; nullable). Route
    code untouched (shape flows); route test asserts the two fields.
  - **Tests:** core: fields populated + null-safe; server: response shape.
  - **Verify:** `pnpm test packages/core -- history && pnpm test apps/server`

- [ ] M17.2 web: watch page rework (E38, FR-036)
  - **Files:** `apps/web/src/components/WatchNextRow.tsx` (+ its test),
    `apps/web/src/pages/WatchPage.tsx`, `apps/web/src/api/types.ts`
  - **DoD:** ui.md 003 §Watch page: shared presentational row with leading-
    checkbox (next sections) or trailing-timestamp (history) variants —
    exported pure helpers (`computeOverflowBadge`,
    `shouldShowQuickMarkCheckbox`) keep name + behavior; history section
    drops the `max-h` container + bottom-anchor effect, renders full list
    with poster rows + tags (new fields in types); one-shot anchor scroll to
    the "Sıradaki bölümler" heading after load (`scroll-mt` for the sticky
    header). E27 ordering + `watch.relativeDay.*` formatting unchanged.
  - **Tests:** existing WatchNextRow tests stay green; i18n parity.
  - **Verify:** `pnpm dev` → /watch opens anchored at Sıradaki bölümler;
    history rows visually match; quick-mark still advances rows.

- [ ] M17.3 server: push test endpoint (E39, FR-037)
  - **Files:** `apps/server/src/routes/{push.ts,push.test.ts}`,
    `apps/server/src/push/notify.ts` (only if a send helper is extracted —
    keep `notifyNewEpisodes` behavior identical)
  - **DoD:** contracts 003 §Push: `POST /api/push/test` strict
    `{ endpoint }`; 404 on unknown endpoint; sends the E39 payload to
    exactly that subscription via web-push with the VAPID details; 404/410
    from the push service → remove subscription + 404; other failures →
    existing error mapping; 200 `{}` on success.
  - **Tests:** mock web-push (notify.test.ts pattern): success 200 + one
    send to the right endpoint; unknown endpoint 404, zero sends; 410 from
    send → subscription removed + 404; extra body fields → 400 (strict).
  - **Verify:** `pnpm test apps/server`

- [ ] M17.4 web: test-notification button (E39)
  - **Files:** `apps/web/src/api/client.ts`,
    `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/lib/push.ts` (only
    if a small endpoint-getter is needed), `apps/web/src/i18n/{tr,en}.json`
  - **DoD:** ui.md 003 §Settings: "Test bildirimi gönder" button rendered
    only while subscribed; onClick reads the current subscription endpoint
    and calls the new client fn; success toast
    `settings.notifications.testSent`, failures → generic error toast; both
    locales.
  - **Tests:** i18n parity; typecheck.
  - **Verify:** `pnpm dev` + a subscribed browser → notification arrives
    (browser step; append to MANUELTEST.md if not verifiable here).

- [ ] M17.5 acceptance: walk spec.md 003 §Acceptance checklist item by item,
  checking boxes with evidence (M13.1 discipline); confirm every E30–E41 has
  a named test (E40 = the existing img.test.ts assertion); i18n parity run.
  Browser-only lines: append to `MANUELTEST.md` §M17 instead of checking.

- [ ] M17.6 docs: README feature bullets (dynamic İzleniyor signals,
  configurable window, mobile bottom nav, segmented progress, push test);
  `docs/self-hosting.md` only if it mentions the window/settings (check);
  update the root `HANDOVER.md` status (or delete it if every checkpoint —
  002's pending ones included — is confirmed done; it is a working document,
  not permanent documentation).

- [ ] M17.7 CHECKPOINT 003 — full browser pass of every `MANUELTEST.md` M14–
  M17 section in BOTH locales + M10–M13 regression spot-check + full gate
  (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) green. This is
  xava's pass if no browser tool is available — leave the box for them, per
  the M10.8 precedent.
