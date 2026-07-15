# Plan 004 — Technical Plan for Import Fidelity, Aired-Only Progress & Navigation Polish

**Spec:** [spec.md](spec.md) · **Base:** plans 001 + 002 + 003 (stack, layout,
modes, cost model all unchanged — this plan only covers what 004 adds/changes).

## Shape of the work

Four independent tracks — no ordering dependencies between them, every API
change is additive, the app stays runtime-working after every task:

1. **Importer fidelity** (E48/E49) — `packages/importer-tvtime` parse layer +
   the tvtime route's report payload + a wizard disclosure. No core change.
2. **Aired-only progress** (E50) — one function in `packages/core`
   (`getSeasonProgress`) changes its counting rules; everything downstream
   (summary shape, API, zip, web rendering) is untouched.
3. **TMDB URLs + id backfill** (E52/E53) — core summary field + refresh
   merge, one new server endpoint, web link/routing layer.
4. **View transitions** (E51) — web-only, presentational.

## What changes where

| Package / app | Change |
|---|---|
| `packages/importer-tvtime` | `TvTimeStatus` loses `paused`; `TvTimeShow` gains `unfollowed: boolean`; `recordsToShows` maps `archived=1 → dropped`; `parseExport` filters relics (unfollowed + zero watches) into a returned `skippedRelics: { name, tvdbId }[]`. |
| `apps/server` — tvtime route | `complete` SSE payload gains `skippedRelics` (straight from parse). Status→list map drops the `paused` row. |
| `packages/core` — progress | `getSeasonProgress`: aired-only counts, zero-aired seasons omitted, `sequential` over the aired list (E50). |
| `packages/core` — library | `SeriesSummary.tmdbId: number \| null` (detail inherits) — read off the base items select, no extra query. |
| `packages/core` — refresh | `refreshItem`: fill-only external-id merge with uniqueness guard (E53). |
| `apps/server` — library route | `GET /api/library/series/by-tmdb/:tmdbId` → same SeriesDetail builder, keyed by `items.tmdb_id` (404 when absent). |
| `apps/web` | `lib/seriesPath.ts` (`seriesParam` helper); link sites updated (`SeriesCard`, `CalendarEntryRow`, `MonthGrid`, `WatchNextRow`/`EpisodeRow` — grep `to="/series/$id"`); `SeriesDetailPage` param resolution + canonical replace; router `defaultViewTransition`; poster `view-transition-name`s; transition CSS in `index.css`; wizard skipped-relics disclosure; types mirror `tmdbId` + `skippedRelics`. |
| zip / migrations / settings | **No change.** Zip already round-trips `externalIds`; no new columns; no new settings keys. |

## Importer notes (E48/E49)

- The `unfollowed` flag must ride through `dedupeShows` (first-row-wins) —
  it's part of `TvTimeShow`, so nothing extra to do; just don't rebuild the
  object.
- Relic filtering happens in `parseExport` *after* both passes (shows and
  watches are both known there) and after `collapseDriftingDuplicates`, so
  "zero watches" means zero *surviving* watches. Filter order: build the
  per-tvdbId watch-count map once, not per show.
- Fallback-shaped show files (headers without `active` — see
  `FOLLOWED_SHOW_PREFERRED_COLUMNS`) never set `unfollowed`; synthetic
  fixtures keep working unchanged.
- The E43 parse test asserting `archived → paused` gets its **assertion**
  updated to `dropped`; every other E43 case (stale `for_later` vs current
  state, duplicate collapse keeping s/e numbers) stays byte-identical.
- Route: `skippedRelics` is data already in hand — thread it from
  `parseExport`'s return through the report build into the `complete` event.
  The stored report (used by confirm) does **not** need it; confirm can never
  see a relic.

## Progress notes (E50)

`getSeasonProgress` today does one episodes+watches scan per item. Keep that
single scan; add the aired filter (`airDate !== null && airDate <= today`) at
the top of it. Today must come in as the same `todayUtc()` the rest of
progress.ts uses — plain-date string compare, no Date math. `sequential` and
the per-season tallies then operate on the filtered list only. Omit a season
when its filtered count is zero (don't emit `{ total: 0 }` — E50 says omit).
Watch out: `SegmentedProgress.buildProgressSegments` needs **no change** (a
caught-up show now arrives with every season `watched == total`, which the
existing all-filled branch already renders); only its test gains a
caught-up-with-announced-future fixture to pin the regression.

## URL + backfill notes (E52/E53)

- **Param grammar** lives in one place on the web side:
  `lib/seriesPath.ts` exports `seriesParam(s)` (link direction) and
  `parseSeriesParam(param): { kind: "tmdb" | "internal"; id: number }`
  (route direction). Unit-test both; keep `SeriesDetailPage` dumb.
- Detail fetch: `parseSeriesParam` → `internal` → existing `getSeries(id)`;
  `tmdb` → new `getSeriesByTmdb(tmdbId)`, on 404 retry `getSeries(id)` (the
  pre-004-bookmark fallback). Implement as one query function so React Query
  caches by param string; canonical replace-navigate in an effect after data
  arrives (`router.navigate({ replace: true, ... })`) — guard against loops
  by only replacing when the canonical param differs from the current one.
- Server endpoint: thin — look up the item id by `tmdb_id`, then delegate to
  the exact same detail builder the internal route uses. zod-validate the
  param as a positive int. 404 `NOT_FOUND` on no row.
- Refresh merge: compute the fill inside the existing transaction, **before**
  the item UPDATE, as extra columns on that same `.set({...})` call — one
  write, not two. Uniqueness pre-check: one `SELECT id FROM items WHERE
  tmdb_id = ? OR tvmaze_id = ? ...` batch is overkill; per-candidate lookups
  are ≤4 indexed point queries per refresh, negligible next to the provider
  fetch. Drop conflicting candidates silently (spec E53).
- The tvtime import path already stores whatever `externalIds` the resolving
  provider returned (that's how tvdb/imdb/tvmaze got in) — no import change.

## View-transition notes (E51)

- `createRouter({ ..., defaultViewTransition: true })` — **verify the option
  exists in the installed @tanstack/react-router 1.128**; if it's absent,
  wire `viewTransition: true` on the `Link`s/`navigate` calls instead. Do not
  hand-roll `document.startViewTransition` around React renders.
- Names: `poster-${item.id}` (internal id — stable, unique, present on every
  summary; do NOT use tmdbId, which can be null and can appear/disappear
  across a refresh). Set on the poster **container** div in both `SeriesCard`
  and the detail header so the placeholder box morphs too.
- CSS, all in `index.css`: ~160ms root fade; `app-header`/`app-tabbar`
  names on the chrome; reduced-motion kill-switch:
  ```css
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) { animation: none !important; }
  }
  ```
- Scroll restoration: TanStack's default scroll-to-top on navigate happens
  inside the transition — check the detail page doesn't flash mid-scroll;
  if it does, scope the poster name to the *navigation source* only (set the
  name on the card being clicked via state) — but try the simple
  always-named version first; it's what the spec asks for.

## Risks / mistakes to avoid

1. **Round-trip test** — nothing here touches zip; if it goes red, you broke
   something you weren't supposed to touch (Article III). `externalIds`
   changes are *values*, and only via refresh, which tests already isolate.
2. **Relic over-reach** — the skip predicate is `unfollowed && watches == 0`,
   both from the export. Do not "improve" it to skip archived shows, zero-
   watch *followed* shows (those are legitimate plan-to-watch material), or
   fallback-file shows (no `active` column ⇒ never unfollowed).
3. **E26-cleanup interplay** — do not add a new cleanup for E48; the existing
   post-import stopped-cleanup already handles fully-watched ended shows.
   Add the assertion, not the mechanism.
4. **Announced leaking back in** — `total` in seasonProgress and *anything*
   the frontier bar divides by must be aired-only after E50. The season
   *sections* on the detail page still list unaired episodes — that's
   correct and out of scope; only the progress math changes.
5. **tmdbId in view-transition names or query keys** — it's nullable and
   fillable-later; internal `id` is the identity everywhere except the URL.
6. **Canonical-replace loops** — replace only when `seriesParam(detail) !==
   currentParam`; cover with a helper unit test, not a hope.
7. **Uniqueness aborts** — a conflicting external-id fill must not fail the
   refresh (E53); test the exact case (two items, same tmdbId from provider).
8. **i18n drift** — new wizard strings (`import.skippedRelics*`) in both
   catalogs, same commit; parity test guards skew.
