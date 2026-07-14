# Data Model 002 — Tracking Rework & Zip schemaVersion 2

**Plan:** [plan.md](plan.md) · **Base:** data-model 001 (everything not
mentioned here is unchanged).

## `tracking` table (changed — 1:1 with items)

| column | type | notes |
|---|---|---|
| item_id | integer pk fk→items | unchanged |
| manual_list | text null | `watch_later` / `stopped` / NULL (NULL = dynamic) |
| push_muted | integer | unchanged |
| note | text null | unchanged |
| list_changed_at | text | ISO datetime; when manual_list last changed (was `status_changed_at`) |

Removed: `status`, `status_changed_at`. `TrackingStatus` disappears from
`schema.ts`; new exported types:

```ts
export type ManualList = "watch_later" | "stopped";          // db/schema.ts
export type WatchCategory =                                   // library/category.ts
  | "watching" | "not_watched_recently" | "not_started"
  | "watch_later" | "up_to_date" | "finished" | "stopped";
```

`WatchCategory` is **never stored** — it is computed per spec.md E16–E18.
Migration 0001 maps existing rows per E26 (see plan.md for the exact SQL and
the upgrade-test strategy).

## Category engine inputs (per item)

All aggregates exclude `season_number = 0` (E1/E17):

- `manual_list`
- `watchedEpisodes` = count of distinct non-special episodes with ≥1 watch
- `lastWatchedAt` = max `watched_at` over non-special watches
- `airedEpisodes` = count of non-special episodes with `air_date ≤ todayUtc()`
- `airedUnwatched` = aired non-special episodes with 0 watches
- `items.release_status`

## Zip format (`schemaVersion: 2`)

File layout, canonical JSON rules, and every file except items.json are
unchanged from 001. manifest.json: `"schemaVersion": 2`.

### items.json — `tracking` block (only change)

```json
"tracking": { "manualList": null, "pushMuted": false, "note": null,
              "listChangedAt": "2026-07-15T09:00:00Z" }
```

`manualList` ∈ `"watch_later" | "stopped" | null`.

### Importing v1 zips

`SUPPORTED_SCHEMA_VERSIONS = [1, 2]`. A v1 `tracking` block
(`{status, pushMuted, note, statusChangedAt}`) maps on read:

| v1 `status` | v2 `manualList` |
|---|---|
| `plan_to_watch` | `watch_later` |
| `dropped` | `stopped` |
| `watching` / `completed` / `paused` | `null` |

`statusChangedAt` → `listChangedAt` verbatim. After watches are imported
(any version, both modes), run the E26 cleanup: clear `stopped` where the
dynamic category is `finished`.

## Merge semantics (delta)

| Data | Rule |
|---|---|
| tracking manualList / note / pushMuted / listChangedAt | incoming wins (replaces 001's "tracking status/note" row) |

All other merge rules unchanged.

## Round-trip invariant

Unchanged and still sacred (Article III): `import(export(L))` on an empty
library yields a canonically identical export — now at schemaVersion 2, with
fixtures covering `watch_later`, `stopped`, and NULL. v1→import→export
produces a **v2** zip (upgrades are one-way; we never emit v1).
