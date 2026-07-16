# Plan 008 — Stats Dashboard

## Shape of the change

Three additive layers, landable in order, each test-green on its own:

1. **Core + importer (M45–M47)** — `watches.date_unknown` column and flag
   plumbing; `packages/core/src/library/stats.ts` grows from one function
   into a `stats/` folder computing the full payload.
2. **Server (M48)** — `GET /api/stats` gains `?tz=`; still a one-liner route
   over `library.getStats(tz)`.
3. **Web (M49–M51)** — `StatsPage` restructured into section components;
   i18n tr+en.

## Core layout

```
packages/core/src/library/stats/
  index.ts        // getStats(db, tz) — assembles the payload, keeps Stats type
  buckets.ts      // Intl-based local date/hour/ISO-week helpers (E96, E104, E105)
  totals.ts       // hero, tiles, mostWatchedByTime, favorites, production,
                  // genre/network, backlog, rewatch summary (date-independent)
  timeline.ts     // recent, pace, upcoming, binges, streaks, timeByYear,
                  // activityByDay, byWeekday, byHour (dated-only)
```

- `getStats(db)` keeps its existing exports/signature with `tz` optional so
  current callers (`apps/server/src/routes/stats.ts`, tests) compile
  unchanged.
- One watch-row scan (`watchedAt`, `dateUnknown`, `episodeId`, `itemId`,
  runtime fields) feeds all timeline aggregates in TS — same pattern the
  current `watchTimeMin` loop already uses; ~7k rows is trivial. Set-based
  SQL stays for distinct counts/joins where it is simpler.
- `buckets.ts` wraps one cached `Intl.DateTimeFormat(zone)` per request;
  ISO-week math done on the derived local Y-M-D (no library).

## Schema & migration (M45)

- `watches.date_unknown integer NOT NULL DEFAULT 0` — additive, backfills
  false. **Hand-bump the generated migration's `when` in
  `migrations/meta/_journal.json`** past the repo's hand-set future
  timestamps or drizzle silently skips it (known repo gotcha).
- Importer: `TvTimeWatchEvent` gains `dateUnknown: boolean` set in
  `parse.ts` where `toIso()` receives no usable raw value; carried through
  `resolve-watch.ts` and `apps/server/src/routes/tvtime.ts` into
  `addWatch(db, episodeId, watchedAt, source, { dateUnknown })`. Zip
  round-trip test extended, never weakened.

## Server (M48)

- zod: `tz` optional string; validate by probing
  `Intl.DateTimeFormat(undefined, { timeZone: tz })` in a try/catch → UTC on
  throw (E96 — invalid is not an error).
- Contract test: shape of new fields, `?tz=` day-boundary case, empty-DB case.

## Web (M49–M51)

- `apps/web/src/components/stats/` — one component per section, page stays a
  layout shell. Reuse `StatTile`; add `HBarList`, `StackedBar`, `MiniBars`,
  `YearSelect`, `Heatmap` primitives styled per 006 ui.md (this spec's ui.md
  maps prototype panels → app design language).
- `getStats` client sends `tz: Intl.DateTimeFormat().resolvedOptions().timeZone`;
  query key includes it.
- Existing sections kept: rating distribution, most rewatched. The legacy
  12-month bar chart is replaced by `timeByYear` (E111).

## Risks / watchpoints

- **Pre-008 data**: dateUnknown backfills false, so `datedWatches` claims
  everything is dated until a re-import — the footer caveat logic must not
  look broken then (it simply doesn't render). Documented in E95.
- **Payload growth**: ~1.5k non-zero days + ~700 week/month buckets ≈ tens of
  KB — acceptable for one cached query; no pagination.
- **Sunday/Monday and ISO-week edges**: unit-test year boundaries (Dec 29 –
  Jan 4) and the current-streak grace week explicitly.
- Uncommitted working-tree changes (needsReview flag, importer rescue work)
  belong to another effort — do not entangle 008 commits with them.
