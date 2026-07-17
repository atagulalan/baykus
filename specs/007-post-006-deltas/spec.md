# Spec 007 — Post-006 Deltas

**Status:** Implemented · **Owner:** xava · **Created:** 2026-07-16 ·
**Updated:** 2026-07-16 (M41–M43 fidelity round 2)
**Scope:** Schedule calendar mode, TV Time watch-position fidelity, bulk
unwatch, most-rewatched stats, search open-on-select, small chrome polish,
TV Time parse/resolve fidelity round 2, `needs_review` category + zip v5.
Deltas over 001–006; **007 wins on overlap**.

These features landed in the same working tree as 006 but are **out of 006's
web-only / no-API charter**. This spec records the decisions so the code is
normative rather than silent divergence. Items 8–10 are a second such batch
(M41–M43), audited and packaged the same way.

## Summary

1. **Schedule (Yayın Akışı)** — third calendar mode: weekday×week Gantt strips;
   core calendar returns past watched episodes with `isWatched` + `hasMore*`;
   Timeline/Month keep E24 gap-tracker UX via client filter.
2. **TV Time watch resolve** — `resolveWatchPosition` precedence + TVDB
   airing-order map for season-number drift; season `episode_number=0` bulk
   marks; `providerEpisodeCount` discrepancy hint on the import report.
3. **Bulk unwatch** — `DELETE …/watches/bulk` + season checkbox confirm dialog.
4. **Most rewatched** — `stats.mostRewatched` top 10 (`count(*) > 1`).
5. **Search open-on-select** — click result adds (or opens existing) and
   navigates to detail (supersedes 006 E77 "stay-on-page multi-add" for the
   row click path; ManualListPicker no longer gates the click).
6. **Chrome polish** — film-grain overlay, `ScrollRestoration`, filter FAB
   recenter, profile refresh via `startManualSweep`.
7. **Metadata cache** — SQLite cache wrapping provider `search` /
   `getSeriesDetails` / `findEpisodeByTvdbId` for TV Time import (1-day TTL),
   so re-imports and large GDPR zips do not re-hit rate limits for the same
   lookups.
8. **TV Time parse fidelity round 2** — duplicate-watch collapse window
   widened to 7 days (E89); watch-bearing shows omitted from every show file
   are rescued instead of dropped (E91); import-report episode counts are
   distinct episodes, not raw watch rows (E94).
9. **Season-drift refinement** — specials excluded from the TVDB airing-order
   map; E84's map-beats-CSV rule now only fires for shows with a detected
   overflow season (E92); per-season **underflow** detection surfaces on the
   match report (warning triangle on matched/fuzzy rows).
10. **`needs_review` category** — `tracking.needs_review` flag (migration
    0004) set when a TV Time import lands with underflow seasons; new first
    category in `CATEGORY_ORDER`; `PATCH …/series/:id` accepts `needsReview`;
    detail page shows a fill-or-dismiss banner (E93); zip schema v5 carries
    the flag (E90).

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E82 | Does the core calendar still hide past watched episodes? | **No for the API.** `getCalendar` returns all active-trio aired episodes in range with `isWatched`. Timeline/Month **client-filter** past watched rows (E24 UX). Schedule keeps them for continuous strips. `hasMorePast` / `hasMoreFuture` reflect active-trio episodes outside the requested range. |
| E83 | How does E81 interact? | Unchanged for Timeline: session `justWatched` pin + no calendar invalidation. Client filter treats pinned ids as visible even when `isWatched` is true. |
| E84 | TV Time watch position precedence? | (1) provider `findEpisodeByTvdbId` if in inventory; (2) TVDB airing-order map when CSV season ≠ mapped season; (3) CSV s/e if in inventory; (4) airing-order map last resort. `episode_number=0` with a season → mark every episode in that season at that `watchedAt`. |
| E85 | Bulk unwatch semantics? | Same candidate set as bulkWatch (aired-only). Deletes **all** watches on those episodes (rewatch history wiped). Confirm dialog when season `watchedCount > 1`. |
| E86 | Most rewatched? | Top 10 episodes with watch count > 1; join item title + S/E; linked list on Stats. |
| E87 | Search click behavior? | Clicking a result adds it (default list) or navigates to the existing library item on conflict; no ManualListPicker on the click path. |
| E88 | Provider metadata cache? | Production bootstrap opens `metadata-cache.db` under the data dir; TV Time import routes wrap each provider with a 1-day TTL SQLite cache for search/details/findEpisodeByTvdbId. Tests omit the cache (byte-identical provider calls). |
| E89 | Duplicate-watch window? | Widened 60 s → **7 days**: real exports drift the same watch across files by hours-to-days, far past the old minute window. Cost accepted: a genuine same-episode rewatch within 7 days now collapses to one event. |
| E90 | Zip carries `needsReview`? | Yes — schema **v5**; `tracking.needsReview` always exported. v1–v4 zips default it `false` on import (`mapV4ItemEntry`, mirroring E61's favorite pattern). Merge: incoming wins, like the rest of tracking. Round-trip test extended, never weakened. |
| E91 | Shows with watches but no show-file row? | **Rescued**, not dropped: take the fallback-file row if one exists, else synthesize from the name harvested off watch files (`tv_show_name`/`series_name`), `status: "dropped"`, `unfollowed: true`, `followedAt` = earliest watch. E49's relic skip still applies to unfollowed **zero-watch** rows. Name-keyed watches also resolve against fallback shows now (preferred files overwrite on key collision). |
| E92 | When does the airing-order map beat the CSV slot? | E84 amended: only for shows with a detected **overflow** season — TV Time's max `episode_number` in some season exceeds the provider's episode count there (latest season of a still-running show exempt; specials never counted). Otherwise a CSV slot that exists in inventory now wins over the map. Provider `findEpisodeByTvdbId` stays first either way. |
| E93 | Underflow → what happens? | A season **underflows** when TV Time's max episode < provider count **and** the next season was started (split-episode numbering symptom). Match report rows (matched + fuzzy) carry `underflowDetails`; the wizard shows a warning triangle with per-season tooltip; confirm imports the show with `tracking.needsReview = true`. `needs_review` precedes every category rung and heads `CATEGORY_ORDER`/`HOME_CATEGORY_ORDER`. Cleared only by the detail-page banner: **Fill** (bulkWatch every non-special season below the highest started one, then clear) or **Dismiss** (PATCH `needsReview: false`). |
| E94 | Import-report episode counts? | Distinct `tvdbEpisodeId`s per show, not raw watch-event rows — rewatches no longer inflate the report. |

## Non-goals

- Sticky schedule header redesign beyond the infinite-week pager.
- Favorite ordering / `favoritedAt`.
- Weakening zip round-trip or provider import boundaries.

## Acceptance

- [x] Automated tests cover resolve-watch unit cases + NieR confirm path +
      calendar `isWatched` inclusion.
- [x] M41–M43: 536 tests green (parse rescue/window, zip v5 defaults,
      category order, stats shape); migration 0004 verified against a copy
      of the real library.db (no-op re-open, `needs_review` column present).
> **§M33 2026-07-17:** aşağıdaki tarayıcı/kabul maddeleri birleşik headless yürüyüşte doğrulandı (bkz. root `MANUELTEST.md` §M33 başındaki özet). `[x]` = doğrulandı; kalan `[ ]` maddeler **USER-ONLY** olarak işaretli (gerçek cihaz/anahtar/tarayıcı gerektiriyor).

- [x] Browser: Schedule mode strips, season unwatch confirm, stats rewatched
      section, search click→detail, underflow triangle on import report,
      needs_review banner fill/dismiss (fold into MANUELTEST when convenient).
