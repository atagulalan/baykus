# API Contract Delta 002 — Categories, Calendar, Watch Page

**NORMATIVE.** This document overrides the matching sections of
`specs/001-series-tracking/contracts/api.md`; every section not listed here is
unchanged there. Conventions (error envelope, `X-Baykus` header, zod
validation, ISO timestamps) are unchanged.

New enums (mirrored in `packages/core`):

```
ManualList    = "watch_later" | "stopped"
WatchCategory = "watching" | "not_watched_recently" | "not_started"
              | "watch_later" | "up_to_date" | "finished" | "stopped"
```

## Library (changed)

### POST /api/library/series
```json
→ { "externalIds": { "tmdbId": 94997 }, "manualList": "watch_later" }
← 201 { SeriesSummary }
```
`manualList` optional (`watch_later` | `stopped`); omitted/null = dynamic.
The old `status` field is **rejected** (unknown field → 400). ~~A freshly
added series with no watches lands in category `not_started` by itself.~~
*SUPERSEDED by 003 (E30 rung 3a): a fresh manual add computes as `watching`
while inside the window, then falls to `not_started`.*

### GET /api/library/series?category=watching&sort=lastWatched
- `category` optional ∈ WatchCategory (7 values — computed server-side).
- `sort` ∈ `lastWatched | added | title | rating | nextAir` (default `added`).
  `lastWatched` = newest `lastWatchedAt` first, items with none last.

**SeriesSummary** (changed fields only — the rest is 001-shaped):
```json
{
  "id": 1, "title": "House of the Dragon",
  "category": "watching",
  "manualList": null,
  "lastWatchedAt": "2026-07-10T21:30:00Z",
  "nextUnwatched": { "episodeId": 210, "s": 2, "e": 7, "title": "…",
                     "airDate": "2026-06-29", "episodeType": "standard" },
  "…": "everything else exactly as in 001 — status is REMOVED"
}
```
`lastWatchedAt` = max non-special watch timestamp, null when none.
`nextUnwatched` keeps 001 semantics (first non-special episode without a
watch, (s,e) order) and gains `airDate` + `episodeType` (both nullable).

### PATCH /api/library/series/:id
```json
→ { "manualList": "stopped" }      // any subset of: manualList, pushMuted, note
← 200 { SeriesSummary }
```
`manualList` accepts `"watch_later" | "stopped" | null` (null = back to
dynamic). Setting `"stopped"` when the item's dynamic category is `finished`
→ **409 CONFLICT**, message `"finished series cannot be stopped"`. The old
`status` field is rejected. Changing `manualList` updates `listChangedAt`.

## Watches (changed + new)

### POST /api/episodes/:id/watches
```json
← 201 { "id": 501, "episodeId": 210, "watchedAt": "…", "source": "manual" }
```
`suggestCompleted` is **removed** from this response and from bulk's.
Side effect (E19): a `manual`/`bulk` watch clears the item's `manualList`.

### POST /api/library/series/:id/watches/bulk
```json
← 200 { "created": 17, "skippedAlreadyWatched": 5 }
```

### GET /api/watches/history?limit=30   (NEW)
`limit` optional, 1–100, default 30. `order` optional: `newest` (default) or
`oldest` — which end of the log to slice (011 E159). Newest-first / oldest-first
respectively; not a client reverse of the other window.
```json
← 200 { "items": [ {
    "watchId": 501, "watchedAt": "2026-07-14T21:30:00Z", "source": "manual",
    "itemId": 1, "title": "House of the Dragon", "posterRef": "tmdb:/x.jpg",
    "episodeId": 210, "s": 2, "e": 7, "episodeTitle": "The Red Sowing"
  } ], "total": 30 }
```
`total` = number of items returned. Includes specials and every source (E27).
*(AMENDED by 003 E38: entries gain nullable `airDate` + `episodeType`.)*
*(AMENDED by 011 E159: optional `order=newest|oldest`.)*

## Calendar (changed)

### GET /api/calendar?from=2026-07-01&to=2026-07-31
Defaults: `from = today − 14d`, `to = today + 90d`. Validation: `from ≤ to`,
`to − from ≤ 124 days`, both `YYYY-MM-DD` — else 400 `VALIDATION_FAILED`.

```json
← 200 { "days": [ { "date": "2026-07-19", "entries": [ {
    "itemId": 1, "title": "House of the Dragon", "posterRef": "tmdb:/x.jpg",
    "episodeId": 215, "s": 3, "e": 5, "episodeTitle": null,
    "episodeType": "standard", "seasonName": null,
    "airDate": "2026-07-19", "network": "HBO",
    "watchProviders": [ { "provider": "HBO Max", "type": "flatrate", "region": "TR" } ]
  } ] } ] }
```

- The 001 `upcoming` / `recentlyAired` split is **gone** — one `days` list,
  sorted ascending, days without entries omitted.
- Scope: items whose category ∈ active trio (E22).
- Includes specials (`s: 0`); `seasonName` (from `seasons.name`) is provided
  for the OVA heuristic (E23).
- Entry filter (E24): `airDate > today` always included; `airDate ≤ today`
  only when the episode has zero watch events.

## Stats (changed)

### GET /api/stats
```json
← 200 { "episodesWatched": 1337, "watchTimeMin": 61020,
  "itemCount": { "watching": 12, "not_watched_recently": 5, "not_started": 30,
                 "watch_later": 4, "up_to_date": 6, "finished": 41, "stopped": 3 },
  "episodesPerMonth": [ … ], "ratingDistribution": { … } }
```
`itemCount` keyed by the 7 categories (computed). Everything else unchanged.

## TV Time import (behavior note)

Endpoints unchanged. Item creation during confirm maps the CSV status per
E26 (`watching`/`paused` → dynamic, `plan_to_watch` → watch_later,
`dropped` → stopped) and runs the post-import stopped-cleanup.

## Zip (behavior note)

Endpoints unchanged. ~~Export emits schemaVersion 2; import accepts 1 and 2~~
*SUPERSEDED by 003 (E32): export emits schemaVersion 3; import accepts 1, 2
and 3* (422 `UNSUPPORTED_SCHEMA` otherwise, as before).

## Push (behavior note)

Endpoints unchanged. New-episode notifications fire only when the refreshed
item's category ∈ active trio at notify time (E22); per-series mute unchanged.
