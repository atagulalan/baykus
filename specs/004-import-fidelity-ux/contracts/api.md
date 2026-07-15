# API Contract Delta 004 — tmdbId, by-tmdb Lookup, Skipped Relics

**NORMATIVE.** Overrides the matching sections of 001's contracts/api.md as
amended by 002 and 003; every section not listed here is unchanged.
Conventions (error envelope, `X-Baykus` header, zod validation, ISO
timestamps) unchanged. Every change in this delta is **additive** — no field
is removed or renamed, so server and web may land in either order.

## Library (changed — SeriesSummary gains one field)

**SeriesSummary** (and therefore SeriesDetail) gains, everywhere it appears
(list, detail, POST, PATCH responses):

```json
{ "…": "003 shape", "tmdbId": 94997 }
```

`tmdbId: number | null` — straight off `items.tmdb_id`. Null for items whose
resolving provider never supplied one (e.g. the entire pre-004 TVmaze-matched
library until a refresh with a TMDB key fills it — E53).

## Library (new endpoint — TMDB lookup)

### GET /api/library/series/by-tmdb/:tmdbId
```json
← 200 { SeriesDetail }     // exact same shape as GET /api/library/series/:id
← 404 NOT_FOUND            // no item with that tmdb_id
```
- `:tmdbId`: positive integer (zod), else 400 `VALIDATION_FAILED`.
- Same auth/session requirements as the internal-id detail route.
- The internal-id route (`GET /api/library/series/:id`) is **unchanged** —
  mutations and internal fetches keep using internal ids everywhere.

## Behavior notes (no shape change)

- **seasonProgress** (E50): `total`/`watched` now count only aired episodes;
  zero-aired seasons are omitted; `sequential` is computed over the aired
  list. Same fields, new values — clients need no code change, but a
  caught-up series now reports `watched == total` for every listed season.
- **Refresh** (`POST /api/refresh/*`, E53): a successful item refresh may
  additionally fill previously-null external-id columns (fill-only, never
  overwrite, unique-conflict-safe). Response shapes unchanged.

## TV Time import (changed — skipped relics, E49)

### POST /api/import/tvtime (SSE — `complete` payload gains one field)

```
event: progress   data: { … unchanged … }
event: complete   data: { "reportId": "r1", "matched": [...], "fuzzy": [...],
                          "unmatched": [...],
                          "skippedRelics": [ { "name": "Troy", "tvdbId": 278460 },
                                             { "name": "Gotham", "tvdbId": 274431 } ] }
```

- `skippedRelics`: shows excluded before matching because they were
  unfollowed (`active=0`) with zero surviving watch events (E49). May be
  empty. They never appear in matched/fuzzy/unmatched, never consume a
  `progress` event (`total` excludes them), and are not part of the stored
  report — `POST /api/import/tvtime/confirm` is unchanged and can never
  import one.
- The archived-status remap (E48) is behavior-only at this layer: an
  `archived=1` show now arrives at confirm with status `dropped` and imports
  with `manual_list = "stopped"`. No shape change.
