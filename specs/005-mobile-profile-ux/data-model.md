# Data Model 005 — tracking.favorite, Zip v4, Staleness, Profile URL Grammar

**Plan:** [plan.md](plan.md) · **Base:** data-model 001 as amended by 002,
003 and 004 (everything not mentioned here is unchanged).

**One schema change (the first migration since 001), one zip format bump
(v3 → v4), no new settings keys.**

## `tracking` (one new column, E61)

```ts
// packages/core/src/db/schema.ts — tracking table gains:
favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
```

- Drizzle migration in `packages/core/migrations/` (existing journal
  pattern): `ALTER TABLE tracking ADD COLUMN favorite integer NOT NULL
  DEFAULT 0`. Existing DBs migrate on open (`open.ts` runs `migrate()`),
  favorite=false everywhere.
- Favorite-only updates do **not** bump `listChangedAt` (that timestamp is
  manual-list semantics — 002; don't couple).

## Zip format v4 (E61)

- `SCHEMA_VERSION = 4` (export), `SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3, 4]`
  (import).
- Per-item `tracking` block in `items.jsonl` gains one always-present field:

```json
{ "…": "v3 shape", "tracking": { "manualList": null, "pushMuted": false,
  "note": null, "listChangedAt": "…", "favorite": true } }
```

- Import: zod `.default(false)` — v1–v3 archives (field absent) parse with
  favorite=false. No other validation change.
- **Merge semantics** (001 §Merge, one row amended):

| Data | Rule |
|---|---|
| tracking status/note **/favorite** | incoming wins |

  A v3 archive merged over a library with favorites therefore clears them
  (incoming favorite=false wins) — consistent with the wholesale-tracking
  rule, documented, accepted (E61).
- Round-trip invariant: **extended** — a favorited item must survive
  `import(export(L))` byte-identically. Existing assertions untouched
  (Article III).

## `SeriesSummary` (one additive field, E62)

```ts
favorite: boolean   // off the existing tracking join; E58 profile rail, E62 heart
```

Present on `SeriesSummary` and (by inheritance) `SeriesDetail`, everywhere
either appears. Not added to calendar/history/stats payloads.

## Staleness (computed, E63 — no storage change)

```ts
// packages/core — named constant, deliberately NOT a settings key
export const STALE_REFRESH_HOURS = 24;
// stale iff: lastRefreshedAt === null || lastRefreshedAt < now − 24h
// full ISO-timestamp compare (not the E3 plain-date rule)
```

- Server-side: the refresh engine's `staleOnly` filter (E64), ordered
  `last_refreshed_at IS NULL` first, then oldest-first.
- Client-side: the detail page mirrors the predicate from the detail
  response's existing `lastRefreshedAt` field (3 lines, duplicated — web
  imports nothing from packages).

## Profile URL grammar (web-side only — not a storage concern, E57)

| route | renders | notes |
|---|---|---|
| `/user/$handle` | ProfilePage | self-only |
| `/user/$handle/all-series` | AllSeriesPage | full 7-category grouping |
| `/user/$handle/stats` | StatsPage (moved) | `/stats` replace-redirects here |

Param resolution (`lib/profilePath.ts`, unit-tested):

| mode | param | result |
|---|---|---|
| single (`handle: null`) | `me` | self (canonical) |
| single | anything else | not-found |
| multi | session handle | self (canonical) |
| multi | `me` | replace-navigate → `/user/<handle>` |
| multi | foreign handle | not-found (no redirect — public profiles are future work) |

All data fetching stays on the existing session-scoped endpoints — the
grammar adds zero server surface.

## Home category trim (web-side constant, E59)

```ts
// next to CATEGORY_ORDER — CATEGORY_ORDER itself is untouched
export const HOME_CATEGORY_ORDER: WatchCategory[] = [
  "watching", "not_watched_recently", "not_started", "watch_later", "up_to_date",
];
```

Used only by LibraryPage's "all" grouping. Stats, FilterPanel, and
AllSeriesPage keep `CATEGORY_ORDER`.
