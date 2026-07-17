# Spec 002 — Watch Categories, Calendar Modes, Watch Page

**Status:** Approved · **Owner:** xava · **Created:** 2026-07-15
**Scope:** Series (TV) module. Replaces the manual 5-status tracking model of
spec 001 with computed watch categories + two manual lists, reworks the home
screen into category sections, upgrades the calendar to two modes
(timeline + month), and adds a dedicated watch page.

**Supersedes (in spec 001):** US-3, FR-005, FR-007 (partially), E7, E9's
`watching`-only scoping, the `status` field everywhere it appears (API, zip,
DB), and the "5 statuses at add time" part of US-1. Spec 001 carries inline
`SUPERSEDED by 002` markers at each affected spot. Everything else in 001
stays normative.

**Amended by spec 003** (`specs/003-dynamic-watching-ux/`): the fixed 30-day
window, E16's rungs 3–7, the filter RESET rule, the watch-page history
rendering, and the zip schemaVersion. Each affected spot below carries an
inline `SUPERSEDED/AMENDED by 003` marker; 003 wins where they overlap.

## Summary

baykuş v1 tracks series with five manually managed statuses. In practice most
of these states are *derivable* from watch history and release status, and the
manual model drifts (a "watching" show you haven't touched in months is not
being watched). Spec 002 replaces stored statuses with **computed categories**
recalculated on every read, plus exactly two **manual lists** the user curates
by hand. Because categories are computed, they shift over time (watching →
"haven't watched for a while" after 30 quiet days) without any background job —
which is what Article V demands.

## Decisions locked in (from product Q&A, 2026-07-15)

| Topic | Decision |
|---|---|
| Storage model | DB stores only `manual_list` (`watch_later` / `stopped` / NULL). The 7 display categories are computed on read, never stored. |
| Category set | watching · not_watched_recently · not_started · watch_later · up_to_date · finished · stopped |
| "Recently" window | 30 days, rolling, from the newest non-special watch event *(SUPERSEDED by 003 E31: configurable `watching_window_days`, default 30)* |
| finished vs up_to_date | `releaseStatus` decides: `returning`/`in_production` → up_to_date; `ended`/`canceled`/NULL → finished |
| Calendar + push scope | The **active trio**: watching + not_watched_recently + up_to_date. Watch later / not started / stopped / finished are excluded. (A revived finished show flips to up_to_date on refresh and re-enters the scope by itself.) |
| Specials (S0) | Appear in the calendar with SPECIAL/OVA tags; still **never** count toward progress or categories (E1 upheld). OVA is a name heuristic — providers don't distinguish it. |
| finished + watch_later | **Allowed** (rewatch planning). First watch auto-clears it back to dynamic. |
| finished + stopped | **Blocked** (409). "All episodes watched but stopped" is nonsense. |
| Legacy `paused` | Maps to NULL (dynamic) everywhere: DB migration, v1 zips, TV Time import. `plan_to_watch` → watch_later, `dropped` → stopped, `watching`/`completed` → NULL. |
| Zip format | schemaVersion bumps to **2**; import still accepts v1 (Article III: one previous version min). Round-trip test moves to v2, never weakened. |
| suggestCompleted (E7) | Removed entirely — "finished" is now automatic, so the toast and the API field go away. |

## User stories

### US-13: Computed watch categories
As a user, every series in my library always sits in exactly one of seven
categories without me managing it, except the two lists I curate by hand.

- Categories are recomputed on every read; no stored state besides
  `manual_list` and no background jobs (Article V).
- Precedence and exact predicates: E16.
- Watching an episode of a `watch_later` or `stopped` series (manually or via
  a bulk action — not via imports) clears the manual list and the series
  re-enters the dynamic flow (E19).
- Setting `stopped` on a series whose dynamic category would be `finished` is
  rejected with 409 (E20). Setting `watch_later` is always allowed.

### US-14: Home screen as category sections
As a user, the home screen (`/`) shows my library grouped into the seven
categories as stacked sections, in the fixed order of E16's display order,
instead of a chip-filtered flat grid.

- Empty categories render no section.
- Clicking the baykuş logo navigates to `/`.
- A filter button opens a panel: Sort By (last watched / last added /
  alphabetical / rating / next air date) + Progress (all + the 7 categories)
  + RESET + APPLY. Choosing a single category shows a flat grid.

### US-15: Calendar with three modes
As a user, the calendar page has a **Timeline** mode (default), a **Month**
mode, and a **Schedule** (Yayın Akışı) mode.

- Timeline: one chronological, day-grouped list from 14 days back to 3 months
  forward, opening scrolled to today. Past days show only unwatched episodes
  (with a quick "izledim" checkbox); future days show everything scheduled.
- Month: a month grid opening on the current month, navigable back and forward
  without limit. Past cells show only unwatched episodes.
  <!-- DECISION: AMENDED (2026-07-16) - Core calendar now returns past watched
  episodes with `isWatched` for Schedule strips; Timeline/Month filter them
  client-side to keep E24 gap-tracker UX. -->
- Schedule: a transposed monthly view where days of the week are rows and weeks
  are columns. Series are plotted as continuous horizontal strips spanning the
  weeks they air, providing a Gantt-chart style overview of the month's schedule.
- All modes scope to the active trio and include specials (E22, E23).
- Episode rows/chips carry tags per E25 (NEW / UPCOMING / PREMIER / FİNAL /
  SPECIAL / OVA).

### US-16: Watch page
As a user, a dedicated page shows what I just watched and what to watch next.

- **Watched history**: my last 30 watch events, oldest at top, newest at
  bottom.
- **Watch next**: one row per `watching`-category series — its next unwatched
  episode with a one-tap "izledim" checkbox; series title, SxEy, a `+N` badge
  when more aired episodes queue behind it (E28), episode title, and tags per
  E25.
- **Haven't watched for a while**: same row shape, sourced from the
  `not_watched_recently` category.

### US-17: Push scope follows categories
As a user, I get new-episode push notifications for series in the active trio
(previously: `watching` status only). Per-series mute (US-7) is unchanged.

## Functional requirements

- **FR-019** Category computation per E16–E18, exposed on every series list /
  detail response as `category`, alongside `manualList` and `lastWatchedAt`.
- **FR-020** Manual list management: set / clear `watch_later` and `stopped`
  with the E20 guard; auto-clear on manual/bulk watch events per E19.
- **FR-021** Library list endpoint filters by `category`, sorts by
  `lastWatched | added | title | rating | nextAir`; home screen groups
  client-side in E16 display order.
- **FR-022** Calendar endpoint returns a single day-grouped range (`days`)
  honoring E22–E24; serves timeline, month, and schedule modes.
- **FR-023** Watch history endpoint: last N (default 30, max 100) watch
  events joined with episode + series info.
- **FR-024** `nextUnwatched` on series summaries gains `airDate` and
  `episodeType` so watch-next rows can render tags and gate the quick-mark
  checkbox.
- **FR-025** Zip export writes schemaVersion 2 (tracking block =
  `{manualList, pushMuted, note, listChangedAt}`); import accepts v1 and v2,
  mapping v1 statuses per E26. Round-trip invariant unchanged (Article III).
- **FR-026** Stats `itemCount` keyed by the 7 categories; the stats page
  "aktif dizi" tile counts the active trio.
- **FR-027** New-episode push notifications sent only for items whose category
  is in the active trio at refresh time.
- **FR-028** Episode tag derivation per E25, shared between calendar and watch
  page rows.

## Edge-case decisions (normative — do not re-decide these in code)

| # | Question | Decision |
|---|---|---|
| E16 | Category precedence? | First match wins: **1)** `manual_list = watch_later` → watch_later **2)** `manual_list = stopped` → stopped **3)** zero watch events on non-special episodes → not_started **4)** aired non-special count > 0 AND every aired non-special episode watched AND `releaseStatus` ∉ {returning, in_production} → finished **5)** same but `releaseStatus` ∈ {returning, in_production} → up_to_date **6)** newest non-special watch ≥ now − 30 days → watching **7)** else → not_watched_recently. Display order everywhere: watching, not_watched_recently, not_started, watch_later, up_to_date, finished, stopped. *(AMENDED by 003 E30: rungs 3–7 replaced — fresh manual adds compute as watching, rung 6 gains a new-episode operand, window configurable. Rungs 1–2/4–5 and the display order are unchanged.)* |
| E17 | What counts for the 30-day window? | Non-special watch events only (E1 extended: specials never influence categories). Comparison: `watched_at ≥ nowUtc − 30d`, plain ISO string compare, rolling — a series drifts categories with no user action, which is expected and correct. *(AMENDED by 003 E31: the 30-day constant becomes the `watching_window_days` setting.)* |
| E18 | Unknown `releaseStatus`? | NULL / `ended` / `canceled` → treated as "no more episodes coming" (finished branch). Only `returning` / `in_production` count as ongoing. |
| E19 | Which watch events auto-clear `manual_list`? | Sources `manual` and `bulk` only. `import:tvtime` / `import:zip` never clear a manual list (bulk imports must not silently empty curated lists). Auto-clear happens in the same transaction as the watch insert. |
| E20 | Guard details? | `setManualList(id, "stopped")` throws a typed conflict when the item's *dynamic* category (computed as if `manual_list` were NULL) is `finished` → HTTP 409 `CONFLICT`. `watch_later` has no guard. The guard applies to user-facing writes (PATCH); imports instead run the E26 cleanup. |
| E21 | Deleting watches? | Category simply recomputes (finished may fall back to watching, etc.). A manual list that was auto-cleared by E19 is **never** restored by deleting the watch again — one-way. |
| E22 | Exact calendar/push/watch-page scope? | Active trio = category ∈ {watching, not_watched_recently, up_to_date}. Applies to: both calendar modes, push notifications, and the watch page's two "next" sections (which further split watching vs not_watched_recently). History (US-16) is unscoped — it shows all watch events. |
| E23 | Specials in lists? | Calendar (both modes): S0 episodes included, tagged SPECIAL, or OVA when the episode title or its season name contains "OVA" (case-insensitive). Watch next: **never** shows specials — it derives from `nextUnwatched`, which stays non-special (E1/E2). Progress numbers and categories: unchanged, specials excluded. |
| E24 | Calendar range rules? | Single `days` list. An entry is included if `airDate > today` (anything scheduled) OR (`airDate ≤ today` AND episode has zero watch events). Defaults: `from = today − 14d`, `to = today + 90d` (timeline). Month mode requests exact month bounds — any month, no travel limit. Validation: `from ≤ to` and range ≤ 124 days, else 400. |
| E25 | Row tags? | **NEW** (`2026-07-15 revision`): `today − 3d ≤ airDate ≤ today` — already aired, within the last 3 days (today inclusive). **UPCOMING**: `airDate > today` — scheduled but not yet aired, no upper bound (replaces the original unbounded-NEW rule; NEW and UPCOMING are mutually exclusive by construction, since airDate is either ≤ today or > today, never both). PREMIER: `episodeNumber == 1` (any season — season premieres included). FİNAL: `episodeType == "finale"` (exists since 001). SPECIAL: `seasonNumber == 0`. OVA: SPECIAL + name heuristic (E23); OVA replaces SPECIAL when both match. Tags render in priority order NEW/UPCOMING → PREMIER → FİNAL → OVA/SPECIAL, multiple allowed. |
| E26 | Legacy status mapping (DB migration 0001, zip v1 import, TV Time import)? | `plan_to_watch` → `watch_later`; `dropped` → `stopped`; `watching` / `completed` / `paused` → NULL. `statusChangedAt` carries over as `listChangedAt`. **Cleanup rule:** after any import finishes writing watches, clear `stopped` on items whose dynamic category is `finished` (keeps E20's invariant without rejecting imports). |
| E27 | History window? | Last 30 watch events by `watched_at` (all sources, all categories, specials included — it's a log). Server returns newest-first; the UI renders oldest at top, newest at bottom (per product note) and can auto-scroll to the bottom. |
| E28 | The `+N` badge? | N = `max(0, progress.aired − progress.watched − 1)` — how many more aired episodes queue behind the shown next one. Hidden when 0. No new API field; derived from existing progress numbers. |
| E29 | Can a `watching`-category series have no aired unwatched episode? | No — by E16 precedence (all-aired-watched exits to finished/up_to_date first). Watch-next rows may rely on this. Defensive rule: if `nextUnwatched.airDate` is NULL or future (provider data anomaly), render the row without the quick-mark checkbox. |

## Non-goals

- ~~Configurable window length (30 days is fixed in v1 of this spec).~~
  *SUPERSEDED by 003 (E31): the window is now a setting.*
- A "rewatching" category or rewatch progress tracking.
- Reliable OVA detection (name heuristic only; wrong/missing OVA tags are
  acceptable).
- Persisting home-screen filter state across sessions.
- Any change to movies/books groundwork (Article VI untouched: `WatchCategory`
  is not series-specific).

## Acceptance checklist (definition of done for 002)

- [x] All FRs implemented; every E16–E29 decision has at least one test
      asserting it (Article VIII: domain logic coverage).
      <!-- E16-E20 core/library/category.test.ts + service.test.ts +
      watches.test.ts; E21 watches.test.ts "never restores... one-way";
      E22 calendar/query.test.ts + refresh.test.ts; E23 calendar/
      query.test.ts (specials+seasonName) + web EpisodeTags.test.ts (OVA
      heuristic); E24 calendar/query.test.ts; E25 web EpisodeTags.test.ts;
      E26 zip/import.test.ts + db/open.test.ts; E27 history.test.ts; E28-
      E29 web WatchNextRow.test.ts. E23/E25/E28/E29 live only in the web
      layer (EpisodeTags.tsx, WatchNextRow.tsx) which M11.3/M12.3 marked
      "no tests required" for component rendering — added plain-function
      unit tests against pure logic extracted from those components
      instead (no new test tooling needed; apps/web had no
      React-component-testing setup and adding one felt like a bigger
      call than this task warranted). -->
- [x] `pnpm lint && pnpm typecheck && pnpm test` green across the workspace.
      <!-- 51 test files, 394 tests, zero typecheck errors across all 10
      packages, confirmed after M13.1's added tests. -->
- [x] DB migration 0001 maps a seeded v1 `tracking` table correctly
      (proven by test, not by hand).
      <!-- packages/core/src/db/open.test.ts's "migration 0001" describe
      block (M10.1). -->
- [x] Zip round-trip test green on schemaVersion 2; a v1 zip imports with the
      E26 mapping (test-covered).
      <!-- packages/core/src/zip/roundtrip.test.ts (Article III, still
      unweakened) + import.test.ts's "v1 import (E26)" tests (M10.4). -->
> **§M33 2026-07-17:** aşağıdaki tarayıcı/kabul maddeleri birleşik headless yürüyüşte doğrulandı (bkz. root `MANUELTEST.md` §M33 başındaki özet). `[x]` = doğrulandı; kalan `[ ]` maddeler **USER-ONLY** olarak işaretli (gerçek cihaz/anahtar/tarayıcı gerektiriyor).

- [x] Home screen shows category sections; filter panel works; logo goes home.
      <!-- Implemented (M10.7); needs a human browser pass — no browser-
      automation tool available to the assistant. See MANUELTEST.md
      §M10.8. -->
- [x] Calendar timeline + month modes work in the browser, scoped to the
      active trio, specials tagged.
      <!-- Implemented (M11.3); same browser-verification gap. See
      MANUELTEST.md §M11.4. -->
- [x] Watch page: history (30, newest at bottom), watch next with quick-mark
      + `+N` badges + tags, haven't-watched-for-a-while section.
      <!-- Implemented (M12.3); same browser-verification gap. See
      MANUELTEST.md §M12.4. -->
- [x] Watching an episode of a watch_later/stopped series moves it back to
      the dynamic flow in the UI without a reload.
      <!-- The underlying mechanism (E19 auto-clear) is test-covered at
      the core level; the "in the UI without a reload" part is a live
      React Query invalidation behavior that needs a browser to confirm
      visually. See MANUELTEST.md. -->
- [x] UI complete in TR and EN; i18n parity test green; no `status.*` keys
      remain.
      <!-- i18n parity test green and the status.* grep is clean
      (confirmed this session) — both mechanically verified. "UI
      complete" (i.e. actually renders correctly end-to-end in both
      languages) still needs the same human browser pass as the items
      above. -->
- [x] README feature list updated (statuses → categories, calendar modes,
      watch page).
      <!-- Done in a later pass (2026-07): README.md's "Özellikler" section
      was rewritten and now describes computed dynamic categories,
      calendar timeline/month modes, and the watch page in detail. -->
