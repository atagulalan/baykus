# Plan 003 — Technical Plan for Dynamic Watching Signals & UI Polish

**Spec:** [spec.md](spec.md) · **Base:** plans 001 + 002 (stack, layout,
modes, cost model all unchanged — this plan only covers what 003 adds/changes).

## Core idea: two more inputs, same pure function

002's engine is `f(manual_list, watches, aired counts, releaseStatus, now)`.
003 widens it to:

```
category(item) = f(manual_list,
                   watch events on non-special episodes,
                   aired/watched non-special counts,
                   releaseStatus,
                   newestAiredAt,          ← NEW (max aired non-special air_date)
                   added_at + added_via,   ← NEW (the manual-add lift)
                   watchingWindowDays,     ← NEW (settings, default 30)
                   now)
```

Still computed on every read (Article V), still one grouped query per
aggregate merged in JS. The two new inputs cost: one extra grouped
`max(air_date)` query (same shape as the existing aggregates), two columns on
the existing base select, and one settings read per batch (a single-row
key lookup — negligible next to the 3–4 queries per item `listSeries`
already runs).

**Window resolution:** the engine reads `watching_window_days` from the
settings table itself (it already holds `db`), so every existing call site —
service, stats, calendar scope, zip cleanup, tvtime cleanup — picks up the
setting with zero signature churn. `WATCHING_WINDOW_DAYS` is renamed
`DEFAULT_WATCHING_WINDOW_DAYS` (update importers; grep).

## What changes where

| Package / app | Change |
|---|---|
| `packages/core` — db | Migration 0002: `items.added_via` TEXT NOT NULL DEFAULT 'manual' + backfill heuristic (E32). New exported type `AddedVia`. |
| `packages/core` — settings | `Settings.watchingWindowDays: number` (default 30, tolerant parse), `SettingsPatch.watchingWindowDays?: number`, key `watching_window_days`. |
| `packages/core` — category | Engine v2 (E30/E33): `newestAiredAt` aggregate, `addedAt`/`addedVia` in the base select, window from settings. Rename `WATCHING_WINDOW_DAYS` → `DEFAULT_WATCHING_WINDOW_DAYS`. |
| `packages/core` — library | `addSeries` refactored to an options object (`{ manualList?, externalRatings?, watchProviders?, tags?, addedVia? }`). `progress.ts`: new `getSeasonProgress` (E34); `SeriesSummary`/`SeriesDetail` gain `seasonProgress`. `history.ts`: entries gain `airDate` + `episodeType`. |
| `packages/core` — zip | schemaVersion **3**: `ZipItemEntry.addedVia`; import accepts 1/2/3, v1+v2 default `addedVia = 'import:zip'`; round-trip fixtures widened. |
| `apps/server` | settings route validates `watchingWindowDays` (int 1–365); tvtime confirm passes `addedVia: 'import:tvtime'`; `POST /api/push/test` (E39); watches history route serves the two new fields (shape flows from core; test asserts). |
| `apps/web` | Settings page: window field + test-notification button. SeriesCard + detail: `SegmentedProgress` component (E34). Calendar/timeline/month: poster thumbs (E35). Layout: sticky header + mobile bottom nav + `lucide-react` dep (E36). Detail: specials-last sort + uncropped poster (E37). Watch page: shared rows + anchor scroll (E38). FilterPanel: RESET → defaults (E41). Types/client mirror every shape change. |
| `packages/importer-tvtime` | **No change** (the route passes `addedVia`, the importer still just parses CSV). |

## Migration 0002 (simple this time)

Plain additive column — no table rebuild needed (SQLite `ALTER TABLE … ADD
COLUMN` with a constant default is safe):

```sql
ALTER TABLE `items` ADD COLUMN `added_via` text NOT NULL DEFAULT 'manual';
UPDATE `items` SET `added_via` = 'import:zip'
  WHERE `id` IN (SELECT DISTINCT `item_id` FROM `watches` WHERE `source` = 'import:zip');
UPDATE `items` SET `added_via` = 'import:tvtime'
  WHERE `id` IN (SELECT DISTINCT `item_id` FROM `watches` WHERE `source` = 'import:tvtime');
```

Order matters: tvtime last so it wins when an item has both watch sources
(E32). Same drizzle-kit workflow as 0001: edit `schema.ts`, `pnpm exec
drizzle-kit generate` in `packages/core`, replace the generated SQL body with
the statements above (keep the file name, journal entry, snapshot). Upgrade
test uses the same `openLibraryDb(path, migrationsFolder)` folder-override
trick as M10.1 — this time the "old" folder contains `0000` + `0001` and
their journal, seeded with items + watches per source, then reopened against
the real folder.

Backfill limitation, accepted per E32: zero-watch imported items backfill as
`'manual'` (nothing to detect them by). Their `added_at` is the import
moment, so only a library imported within the last window could briefly show
them under İzleniyor — and the heuristic covers exactly the risky case
(imports with watches).

## Zip v3

- `manifest.json#schemaVersion: 3`; `ZipManifest.schemaVersion` type literal
  bumps. Only shape change: `ZipItemEntry.addedVia: AddedVia`.
- `SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3]`. v1 and v2 entries map through the
  existing shared path with `addedVia` defaulted to `'import:zip'` (E32
  rationale: no İzleniyor flood after migrations). v1's tracking mapping
  (E26) is unchanged and still applies.
- Merge: `addedVia` follows the same item-level rule `addedAt` already
  follows (001 data-model §Merge governs — do not invent a new rule).
- Round-trip: fixtures gain `addedVia` variety (all three values); the
  byte-identical invariant is untouched. **Never weaken it** (Article III).
  Update the "future version rejected" test from 3 → 4.

## API surface (delta — full shapes in contracts/api.md)

```
GET/PATCH /api/settings          + watchingWindowDays (int 1–365)
GET  /api/library/series          SeriesSummary + seasonProgress
GET  /api/watches/history         entries + airDate, episodeType
POST /api/push/test               { endpoint } → 200 {} | 404
```

All additive except nothing — no field is removed or renamed, so web and
server can land in either order this time (unlike 002's breaking milestone).

## Web notes

- **SegmentedProgress**: extract the render decision into a pure function
  (`buildProgressSegments(seasonProgress): Segment[] | null`, null = fallback)
  and unit-test that — same pattern as `EpisodeTags`/`WatchNextRow` pure
  helpers from M13.1. Squares/bar are plain divs + Tailwind; no new dep.
- **lucide-react** goes in `apps/web` only. Import icons individually
  (`import { CalendarDays } from "lucide-react"`) — tree-shaking keeps the
  bundle small. No FontAwesome, no icon font, no CDN.
- **Bottom nav**: one `Layout.tsx` concern — same `navItems` array drives
  both renderings (desktop text links, mobile icon tabs); don't duplicate
  the route list.
- **Watch page anchor**: reuse the timeline's pattern (ref + one-shot
  `scrollIntoView({ block: "start" })` after `isLoading` flips). Remove the
  history section's `max-h-80 overflow-y-auto` + bottom-anchor effect.
- **Shared row**: refactor `WatchNextRow` so its presentational shell
  (poster / title / SxEy / tags layout) is reusable with either a leading
  checkbox (watch-next) or a trailing timestamp (history). One component
  file with a small prop surface beats two near-identical layouts — but
  keep `computeOverflowBadge`/`shouldShowQuickMarkCheckbox` exports stable
  (they have tests).
- **Poster thumbs in month cells**: keep cells readable — thumb + `SxEy`
  only; the existing `+n` overflow already guards density.
- **Settings number input**: plain `<input type="number" min=1 max=365>`,
  PATCH on blur/save per the page's existing mutation pattern; server zod is
  the real guard.

## Risks / mistakes to avoid

1. **Round-trip test** — still the one unforgivable regression. v3 changes
   touch export, import, types, fixtures; if the test fails, the code is
   wrong (Article III).
2. **Engine regressions** — E30 keeps rungs 1–2 and 4–5 byte-identical to
   E16. Every 002 category test must stay green untouched; new tests cover
   only the new rungs/operands. If an old test needs "fixing", stop and
   re-read E30.
3. **Lift leaking to zero-watch items** — rung 6's new-episode operand must
   stay *below* rung 3 (zero-watch exits first). Getting this wrong puts
   every dormant never-started show in İzleniyor the day an episode airs.
4. **Import flood** — `addedVia` must default to `'import:zip'` for v1/v2
   zips and be passed as `'import:tvtime'` in the tvtime confirm path. A
   default of `'manual'` anywhere in an import path recreates the flood the
   user explicitly declined.
5. **Settings read in a hot loop** — read the window **once per batch** in
   `computeCategoriesInternal`, not per item.
6. **seasonProgress N+1** — it's one more per-item query in `buildSummary`,
   matching the existing per-item cost model (E14 caps libraries); do NOT
   add per-episode queries. The `sequential` flag comes from one ordered
   episode+watch scan per item.
7. **Layout regressions** — the sticky header + bottom bar must not cover
   content: `<main>` bottom padding on mobile, `scroll-margin-top` on the
   timeline/watch anchors if the sticky header overlaps them after scroll.
8. **i18n drift** — new keys (settings window + test button) in both
   catalogs, same commit; parity test guards skew, not missing usage.
