# Spec 007 — Post-006 Deltas

**Status:** Implemented · **Owner:** xava · **Created:** 2026-07-16
**Scope:** Schedule calendar mode, TV Time watch-position fidelity, bulk
unwatch, most-rewatched stats, search open-on-select, small chrome polish.
Deltas over 001–006; **007 wins on overlap**.

These features landed in the same working tree as 006 but are **out of 006's
web-only / no-API charter**. This spec records the decisions so the code is
normative rather than silent divergence.

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

## Non-goals

- Sticky schedule header redesign beyond the infinite-week pager.
- Favorite ordering / `favoritedAt`.
- Weakening zip round-trip or provider import boundaries.

## Acceptance

- [x] Automated tests cover resolve-watch unit cases + NieR confirm path +
      calendar `isWatched` inclusion.
- [ ] Browser: Schedule mode strips, season unwatch confirm, stats rewatched
      section, search click→detail (fold into MANUELTEST when convenient).
