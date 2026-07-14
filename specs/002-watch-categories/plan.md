# Plan 002 — Technical Plan for Watch Categories, Calendar Modes, Watch Page

**Spec:** [spec.md](spec.md) · **Base:** spec/plan 001 (stack, layout, modes
and conventions all unchanged — this plan only covers what 002 adds/changes).

## Core idea: computed, never stored

The seven categories are a **pure function** of data we already have:

```
category(item) = f(manual_list,
                   watch events on non-special episodes,
                   aired/watched non-special counts,
                   releaseStatus,
                   now)
```

Storing categories would require a scheduler to keep the time-dependent ones
honest (watching → not_watched_recently after 30 quiet days), which Article V
forbids. Computing on read makes every category correct at the moment it is
served, including after refreshes change `releaseStatus` (a revived show
leaves `finished` by itself) and after watch deletions (E21).

Cost check: `listSeries` already runs 3–4 queries per item for progress and
ratings (E14 caps libraries at ~1000 items, in practice tens). The category
engine adds aggregates over the same tables — implement it as **one batch
query set** for all items (`GROUP BY item_id`), merged in JS. Do not add
per-item queries in a loop when the batch exists.

## What changes where

| Package / app | Change |
|---|---|
| `packages/core` — db | Migration 0001: `tracking.status`/`status_changed_at` → `manual_list` (nullable) / `list_changed_at`, data mapped per E26. `TrackingStatus` type deleted; `ManualList` added. |
| `packages/core` — library | New `category.ts` (engine, `WatchCategory`, `CATEGORY_ORDER`, `WATCHING_WINDOW_DAYS = 30`). Service: `category`/`manualList`/`lastWatchedAt` on summaries, category filter, `lastWatched` sort, `setManualList` with E20 guard, E19 auto-clear inside `addWatch`/`bulkWatch`, `suggestCompleted` deleted, `addSeries(details, manualList?)`. New `history.ts` (watch log query). `progress.ts`: `nextUnwatched` gains `airDate`/`episodeType`. |
| `packages/core` — calendar | `getCalendar` → single `days` range per E24, scoped by category (E22), specials included with `seasonName` in the row for the OVA heuristic (E23). |
| `packages/core` — zip | schemaVersion 2; v1 accepted with E26 mapping + post-import stopped-cleanup; round-trip test updated to v2. |
| `packages/core` — stats | `itemCount` keyed by `WatchCategory` (batch category engine). |
| `apps/server` | Routes mirror the new contract (§ contracts/api.md in this spec): zod enums, 409 mapping for the new conflict error, `GET /api/watches/history`, calendar range validation, TV Time status mapping, push scoped to the active trio. |
| `apps/web` | Types/client mirror; home page sections + filter panel; `StatusPicker` → `ManualListPicker`; detail header category badge + manual-list control; suggest-completed toast removed; calendar page with two modes; new `/watch` page; `EpisodeTags` shared component; logo → `/` link; i18n `status.*` → `category.*` + new areas. |
| `packages/importer-tvtime` | **No change.** `parse.ts` keeps emitting `TvTimeStatus` (that's what the CSV contains); the mapping to `manual_list` happens in `apps/server/src/routes/tvtime.ts` where items are created. |

## Migration 0001 (the risky bit)

SQLite table rebuild, hand-written (drizzle-kit's generated diff would drop
data or leave the NOT NULL off):

```sql
CREATE TABLE `tracking_new` (
  `item_id` integer PRIMARY KEY NOT NULL REFERENCES `items`(`id`) ON DELETE cascade,
  `manual_list` text,
  `push_muted` integer NOT NULL DEFAULT false,
  `note` text,
  `list_changed_at` text NOT NULL
);
INSERT INTO `tracking_new`
  SELECT `item_id`,
         CASE `status` WHEN 'plan_to_watch' THEN 'watch_later'
                       WHEN 'dropped' THEN 'stopped'
                       ELSE NULL END,
         `push_muted`, `note`, `status_changed_at`
  FROM `tracking`;
DROP TABLE `tracking`;
ALTER TABLE `tracking_new` RENAME TO `tracking`;
```

Workflow: edit `schema.ts` first, run `pnpm exec drizzle-kit generate` in
`packages/core` to get the journal entry + snapshot, then **replace the
generated SQL body** with the rebuild above (keep the file name and
`meta/_journal.json` entry drizzle produced). Migration test strategy: use
`openLibraryDb(path, migrationsFolder)`'s folder parameter (added in M9.1) to
open a temp DB against a folder containing **only** `0000_init.sql` + its
journal, seed v1 rows covering all five statuses, close, reopen against the
real folder, assert the E26 mapping. That gives a real upgrade test without
fixture DB files.

Nothing else references `tracking` by FK, and `tracking → items` survives a
rebuild, so no `PRAGMA foreign_keys` dance is needed.

## Zip v2

- `manifest.json#schemaVersion: 2`. Only change inside: items.json `tracking`
  block is `{ "manualList": "watch_later"|"stopped"|null, "pushMuted", "note",
  "listChangedAt" }`.
- `SUPPORTED_SCHEMA_VERSIONS = [1, 2]`. v1 entries pass through a mapping
  step (E26) before the shared import path; everything downstream handles one
  canonical in-memory shape.
- After watches are written (both modes, both versions), run the E26 cleanup:
  one UPDATE clearing `manual_list='stopped'` where the dynamic category is
  `finished`.
- Merge semantics: `manualList`/`note`/`pushMuted`/`listChangedAt` — incoming
  wins (same rule that governed `status` in 001).
- Round-trip test: update fixtures to cover both manual lists and NULL; the
  invariant (`import(export(L))` → identical canonical export) is untouched.
  **Never weaken it.** Add a separate v1-import test with a small hand-built
  v1 zip.

## API surface (delta — full shapes in contracts/api.md)

```
GET  /api/library/series?category=&sort=lastWatched|added|title|rating|nextAir
POST /api/library/series          {externalIds, manualList?}
PATCH /api/library/series/:id     {manualList?, pushMuted?, note?}   409 on E20
GET  /api/watches/history?limit=30
GET  /api/calendar?from=&to=      → { days: [...] }   400 on E24 violation
```

`SeriesSummary.status` is **gone** (breaking, intentional — no dual-shape
period; web and server land inside the same milestone). Watches responses drop
`suggestCompleted`.

## Web notes

- Home groups **client-side** from one unfiltered `listSeries` call (E14
  makes this cheap) — no new "grouped" endpoint.
- Filter panel is local component state applied on APPLY (per the product
  sketch), not URL state; RESET returns to all/added defaults.
- Timeline "opens at today": render full range, `ref.scrollIntoView()` on the
  today header after data load.
- Month grid: pure date math on `YYYY-MM-DD` strings (UTC, same as E3);
  weeks start Monday (TR convention).
- Quick-mark rows: optimistic `POST /api/episodes/:id/watches`, then
  invalidate `library`, `calendar`, `watch` queries — the row advances or the
  series leaves the section naturally on refetch.

## Risks / mistakes to avoid

1. **Round-trip test** — the one unforgivable regression (Article III /
   AGENTS.md). If it fails, fix the code, never the assertion.
2. **Migration data loss** — 0001 must be provably correct via the seeded
   upgrade test before anything else lands on top.
3. **N+1 category computation** — compute in batch; stats and listSeries
   share the engine.
4. **Import auto-clear leak** — E19 applies only to `manual`/`bulk` sources;
   getting this wrong silently wipes curated lists on every TV Time re-import.
5. **Specials leaking into categories** — every aggregate the engine consumes
   must keep `seasonNumber != 0` filters (E1/E17).
6. **web/server shape skew mid-milestone** — server tasks land before web
   tasks inside M10; the app is expected to be runtime-broken between M10.6
   and M10.7. Do not "fix" it by keeping legacy fields.
7. **i18n drift** — deleting `status.*` keys requires touching every consumer
   (`SeriesCard`, `SearchBar`, detail page) in the same task; the parity test
   only catches tr/en skew, not dead keys.
