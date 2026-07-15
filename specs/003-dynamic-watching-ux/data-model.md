# Data Model 003 — added_via, Window Setting, Season Progress, Zip v3

**Plan:** [plan.md](plan.md) · **Base:** data-model 001 as amended by 002
(everything not mentioned here is unchanged).

## `items` table (changed — one new column)

| column | type | notes |
|---|---|---|
| added_via | text NOT NULL DEFAULT 'manual' | `'manual' \| 'import:tvtime' \| 'import:zip'` — how the item entered the library (E32) |

```ts
export type AddedVia = "manual" | "import:tvtime" | "import:zip"; // db/schema.ts
```

Migration 0002 (additive `ALTER TABLE` + two backfill UPDATEs — exact SQL in
plan.md §Migration 0002; tvtime UPDATE runs last so it wins on overlap).

## `settings` table (new known key)

| key | value | notes |
|---|---|---|
| watching_window_days | integer as string, default absent (= 30) | E31; parsed tolerantly on read — non-integer / out-of-range stored values fall back to 30 |

Update the known-keys doc comment on `schema.ts`'s `settings` table in the
same commit.

## Category engine inputs (v2 — per item)

All aggregates still exclude `season_number = 0` (E1/E17):

- `manual_list`
- `watchedEpisodes`, `lastWatchedAt`, `airedEpisodes`, `airedUnwatched`,
  `items.release_status` — unchanged from 002
- **NEW** `newestAiredAt` = max `air_date` over non-special episodes with
  `air_date ≤ todayUtc()` (null when none) — one grouped query, batch
- **NEW** `items.added_at`, `items.added_via` — added to the existing base
  select, no extra query
- **NEW** `windowDays` = `watching_window_days` setting, read **once per
  batch**

Precedence consuming these: spec.md E30 (rungs 1–2 and 4–5 are byte-identical
to E16; only 3, 6, 7 change).

## `seasonProgress` (new computed summary field — never stored)

```ts
interface SeasonProgressEntry { number: number; watched: number; total: number }
interface SeasonProgress { seasons: SeasonProgressEntry[]; sequential: boolean }
```

- `seasons`: non-special seasons with ≥1 episode, ascending by number.
  `total` counts announced episodes (aired + scheduled); `watched` counts
  episodes with ≥1 watch. *(SUPERSEDED by 004 E50: aired-only counts,
  zero-aired seasons omitted.)*
- `sequential`: watched episodes form a contiguous prefix of the
  (s,e)-ordered non-special episode list. *(SUPERSEDED by 004 E50: the list
  is aired-only.)*
- Present on `SeriesSummary` and `SeriesDetail` (detail inherits via
  `buildSummary`). Rendering rules live in spec.md E34 / ui.md.

## Watch history entry (two additive fields)

`WatchHistoryEntry` gains `airDate: string | null` and
`episodeType: EpisodeType | null` (both straight off the already-joined
`episodes` row — E38).

## Zip format (`schemaVersion: 3`)

File layout, canonical JSON rules, and every file except items.json are
unchanged from 002. manifest.json: `"schemaVersion": 3`.

### items.json — item entry (only change)

```json
"addedVia": "manual"
```

sits next to `addedAt` (same nesting level). Values per `AddedVia`.

### Importing older zips

`SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3]`.

| incoming version | tracking block | addedVia |
|---|---|---|
| 1 | E26 status mapping (unchanged) | `'import:zip'` |
| 2 | verbatim (002 shape) | `'import:zip'` |
| 3 | verbatim | verbatim |

The E26 post-import stopped-cleanup still runs for every version/mode.

## Merge semantics (delta)

| Data | Rule |
|---|---|
| items addedVia | same rule as `addedAt` (001 §Merge — item-level fields; do not invent a divergent rule) |

All other merge rules unchanged.

## Round-trip invariant

Unchanged and still sacred (Article III): `import(export(L))` on an empty
library yields a canonically identical export — now at schemaVersion 3, with
fixtures covering all three `addedVia` values. v1/v2 → import → export
produces a **v3** zip (upgrades are one-way; we never emit older versions).
