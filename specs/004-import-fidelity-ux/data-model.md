# Data Model 004 — Parse Shapes, Aired-Only Season Progress, tmdbId Exposure

**Plan:** [plan.md](plan.md) · **Base:** data-model 001 as amended by 002 and
003 (everything not mentioned here is unchanged).

**No schema change, no migration, no zip change, no new settings key.** 004
is computed-values and parse-layer shapes only.

## Importer parse shapes (`packages/importer-tvtime`)

```ts
// was: "watching" | "plan_to_watch" | "dropped" | "paused"
export type TvTimeStatus = "watching" | "plan_to_watch" | "dropped"; // E48

export interface TvTimeShow {
  tvdbId: number;
  name: string;
  followedAt: string | null;
  status: TvTimeStatus;
  /** E49: followed-file row had active=0 (unfollowed in TV Time).
   *  Fallback-shaped files (no `active` column) never set this. */
  unfollowed: boolean;
}

export interface SkippedRelic {
  name: string;
  tvdbId: number;
}
```

`parseExport`'s result gains `skippedRelics: SkippedRelic[]` — shows removed
by the relic rule (`unfollowed && zero surviving watch events`). Status
derivation per row (order normative, E43 + E48):

| row state | status | unfollowed |
|---|---|---|
| `active = 0` | `dropped` | true |
| else `archived = 1` | `dropped` *(was `paused`)* | false |
| else `for_later` special status | `plan_to_watch` | false |
| else | `watching` | false |

Route-level status → manual list (`apps/server/src/routes/tvtime.ts`):
`plan_to_watch → watch_later`, `dropped → stopped`, `watching → null`.
The `paused → null` row is deleted with the enum member.

## `seasonProgress` (computed — semantics change only, E50)

Interface unchanged from 003:

```ts
interface SeasonProgressEntry { number: number; watched: number; total: number }
interface SeasonProgress { seasons: SeasonProgressEntry[]; sequential: boolean }
```

New counting rules (all with `air_date` non-null and `≤ todayUtc()`,
plain-date compare — E3):

- `total` = **aired** episodes in that season *(was announced)*.
- `watched` = aired episodes with ≥1 watch (watches on unaired episodes are
  ignored).
- Seasons whose aired count is 0 are **omitted** from `seasons` entirely.
- `sequential` = contiguous-prefix test over the (s,e)-ordered **aired**
  non-special episode list.

Derived behavior: a series with every aired episode watched has
`watched == total` in every emitted season → `buildProgressSegments` renders
all-filled squares (existing branch, no web logic change).

## `SeriesSummary` (one additive field)

```ts
tmdbId: number | null   // straight off items.tmdb_id; E52 links/URLs
```

Present on `SeriesSummary` and (by inheritance) `SeriesDetail`, everywhere
either appears. Not added to calendar entries, history entries, or stats —
those link via the `i<internal>` fallback and the detail page canonicalizes.

## `items` external-id columns (values-only change, E53)

Columns unchanged (`tmdb_id`, `tvmaze_id`, `imdb_id`, `tvdb_id`, all UNIQUE,
all nullable). `refreshItem` now merges the provider's `details.externalIds`
into NULL columns — fill-only:

| case | action |
|---|---|
| item column NULL, provider has value, value unused elsewhere | fill |
| item column NULL, provider value already on another item | skip that field silently |
| item column non-NULL | never touched, even on disagreement |

The merge happens in the same UPDATE/transaction as the metadata refresh.
Zip: `externalIds` was already exported/imported verbatim per item — filled
ids flow through with zero format change (round-trip invariant untouched,
Article III).

## URL grammar (web-side only — not a storage concern)

| param shape | meaning | resolution |
|---|---|---|
| `^\d+$` | TMDB id | `by-tmdb` endpoint, 404 → internal-id fallback (old bookmarks) |
| `^i\d+$` | internal id | existing detail endpoint |

Canonical form for an item: `String(tmdbId)` when non-null, else `i${id}`.
Produced by `seriesParam()`; parsed by `parseSeriesParam()` — both in
`apps/web/src/lib/seriesPath.ts`, both unit-tested.
