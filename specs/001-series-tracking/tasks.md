# Tasks 001 — Series Tracking

Vertical milestones: each one ends with something you can **see working in the
browser**. Work strictly top-down; a checkpoint task gates the next milestone.

**Rules for every task** (see also AGENTS.md § Execution protocol):

1. Read the referenced spec sections BEFORE coding (reading map in AGENTS.md).
2. A task is done only when `pnpm lint && pnpm typecheck && pnpm test` is green.
3. New user-facing strings land in BOTH `tr.json` and `en.json` in the same task.
4. Check the box here + one conventional commit per task (scope = package).
5. Tests never touch the network — fixtures only (`fixtures/`).

Format: **Files** = create/modify; **DoD** = definition of done; **Verify** =
run this and observe.

---

## M0 — Scaffold ✅ (done 2026-07-14)

- [x] M0.1 pnpm workspace, Biome, Vitest, CI, TS strict base config
- [x] M0.2 `packages/provider-sdk` contract types + errors (NORMATIVE)
- [x] M0.3 `packages/core` Drizzle schema (NORMATIVE) + schema/native tests
- [x] M0.4 `apps/server` Hono skeleton + `/api/health` + config loader
- [x] M0.5 `apps/web` Vite+React+Tailwind4+Router+Query+i18next shell (TR/EN)
- [x] M0.6 Fixtures captured (`fixtures/README.md`)

Verify at any time: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

---

## M1 — Search & add a series, zero-config (TVmaze) ✅ (done 2026-07-14)

Checkpoint goal: open the app, search "house of the dragon", add it, see it as
a poster card in the library. No TMDB key involved.

- [x] M1.1 provider-sdk runtime helpers (FR-001)
  - **Files:** `packages/provider-sdk/src/http.ts`, `rate-limit.ts`, `http.test.ts`, `rate-limit.test.ts`; export from `index.ts`
  - **DoD:** `createRateLimiter({ tokens, perMs })` token bucket (awaitable acquire); `fetchJson(url, init, { providerId, limiter, retries })` → parsed JSON or `ProviderError` (`NETWORK` on 5xx/timeout with 2 retries + backoff, `RATE_LIMITED` honoring Retry-After, `NOT_FOUND` on 404, `PARSE_FAILED` on bad JSON)
  - **Tests:** limiter enforces rate under fake timers; fetchJson maps each failure class (mock fetch, no network)
  - **Verify:** `pnpm test packages/provider-sdk`

- [x] M1.2 provider-tvmaze (FR-001, FR-003)
  - **Files:** `packages/provider-tvmaze/src/{index.ts,provider.ts,mapping.ts,mapping.test.ts}`
  - **DoD:** `createTvmazeProvider(): MetadataProvider`; capabilities `{search, details, upcoming, images}`; hard limit 20 req/10 s shared per process; `search()` maps `fixtures/tvmaze/search-shows.json` shape; `getSeriesDetails()` maps `show-details-embed-episodes.json` (episodes grouped into seasons; `airdate` → `airDate`, strip HTML from summaries); external-id lookup via `/lookup/shows?imdb=|thetvdb=`; `resolveImageUrl` maps ImageRef `tvmaze:<path>` (sizes: medium→medium, else original)
  - **Tests (mapping.test.ts):** "maps search fixture to SearchResult[] with tvmazeId+imdbId+tvdbId", "maps details fixture to SeriesDetails with 26 episodes in 3 seasons", "future episodes keep airDate", "summary HTML stripped"
  - **Verify:** `pnpm test packages/provider-tvmaze`

- [x] M1.3 core DB bootstrap + migrations (FR-002)
  - **Files:** `packages/core/drizzle.config.ts`, `packages/core/migrations/` (generated), `packages/core/src/db/open.ts`, `open.test.ts`
  - **DoD:** `openLibraryDb(filePath)` → `{ db, sqlite }` with WAL, foreign_keys ON, busy_timeout 5000; runs pending migrations idempotently (drizzle-kit generated SQL, committed to repo); `:memory:` supported for tests
  - **Tests:** open twice → no error; all 9 tables exist; FK cascade works (delete item → episodes gone)
  - **Verify:** `pnpm test packages/core`

- [x] M1.4 core Library service: add/list/get/remove + progress (FR-002, FR-003)
  - **Files:** `packages/core/src/library/{service.ts,progress.ts,service.test.ts,progress.test.ts}`, export from `packages/core/src/index.ts`
  - **DoD:** `createLibrary(db)` with `addSeries(details: SeriesDetails, status)` (maps DTO → items+seasons+episodes in one transaction; conflict on any matching external id → typed `AlreadyInLibraryError` carrying existing itemId); `listSeries({status?, sort})`, `getSeries(id)`, `removeSeries(id)`; progress per spec edge table: exclude season 0, aired = `airDate <= todayUtc()`, denominator = aired
  - **Tests:** add-from-tvmaze-fixture round trip; duplicate add → conflict; progress excludes specials; unaired episodes not in `aired`
  - **Verify:** `pnpm test packages/core`

- [x] M1.5 server: registry, error envelope, search + library routes (FR-001, FR-002)
  - **Files:** `apps/server/src/providers/registry.ts`, `src/middleware/{errors.ts,guard.ts}`, `src/routes/{search.ts,library.ts}`, tests alongside; wire in `app.ts`
  - **DoD:** registry returns providers in order (tmdb if key else tvmaze — tmdb slot empty until M4); error middleware maps thrown `ProviderError`→502 envelope, zod→400, `AlreadyInLibraryError`→409 exactly per contracts/api.md; `X-Baykus: 1` required on mutations (403 otherwise); routes implement contracts/api.md §Search §Library including SeriesSummary shape
  - **Tests (app.request, fake provider):** search happy path; provider failure → 502 envelope; add → 201 then 409; list filters by status; missing X-Baykus → 403
  - **Verify:** `pnpm test apps/server`, then `pnpm dev` + `curl -s "localhost:4004/api/search?q=dragon" | head -c 300`

- [x] M1.6 web: API client, search flow, library grid (FR-001, FR-002)
  - **Files:** `apps/web/src/api/{client.ts,types.ts}`, `src/components/{SearchBar.tsx,SeriesCard.tsx,StatusPicker.tsx}`, rewrite `src/pages/LibraryPage.tsx`; i18n keys `search.*`, `library.*`, `status.*`
  - **DoD:** client wraps fetch (base `/api`, sets `X-Baykus: 1`, throws typed `ApiError` from envelope); SearchBar in Layout header, 300 ms debounce, dropdown with poster+title+year+network, Enter/click → status picker → POST; library grid of SeriesCard (poster via `/img/...` with title-text fallback until M4.3, title, year, progress bar stub); states: loading skeleton, empty (existing keys), error banner with retry
  - **Tests:** none required beyond typecheck (UI logic is thin); i18n keys added to both locales
  - **Verify:** `pnpm dev` → browser: search → add → card appears; reload persists

- [x] M1.7 CHECKPOINT M1
  - **DoD:** full manual pass: zero-config boot (`rm -rf data && pnpm dev`), search, add with each status, duplicate add shows friendly 409 message, remove from library works (card context menu), `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green
  - **Verify:** walk the list above in the browser, in both locales (settings toggle comes later — switch `lng` manually in `i18n/index.ts` for now)

---

## M2 — Episode tracking & progress ✅ (done 2026-07-14)

Checkpoint goal: open series detail, tick episodes (single/bulk), see real
progress on cards, edit a watch date, rewatch an episode.

- [x] M2.1 core watches (FR-004)
  - **Files:** `packages/core/src/library/{watches.ts,watches.test.ts}`
  - **DoD:** `addWatch(episodeId, watchedAt?, source?)` (duplicate (episodeId,watchedAt) → returns existing, no throw); `bulkWatch({itemId, upToEpisodeId | seasonNumber})` per spec edge table (skip specials, skip already-watched, airing order = (s,e) ordering); `removeLatestWatch(episodeId)`; `suggestCompleted(itemId)` = all aired non-special episodes have ≥1 watch AND status ≠ completed; per-episode `watchCount`, `lastWatchedAt` in detail queries
  - **Tests:** rewatch creates 2nd event; unmark removes newest only; bulk up-to skips specials + already watched; suggestCompleted flips exactly at last aired episode; future episodes never auto-watched
  - **Verify:** `pnpm test packages/core`

- [x] M2.2 server watch routes (FR-004)
  - **Files:** `apps/server/src/routes/watches.ts` + tests; wire in `app.ts`
  - **DoD:** implements contracts/api.md §Watches exactly (incl. `suggestCompleted` in POST response, idempotent 200 on duplicate, bulk XOR body validation)
  - **Tests:** each endpoint happy + validation error + 404 unknown episode
  - **Verify:** `pnpm test apps/server`

- [x] M2.3 web series detail page (FR-003, FR-004)
  - **Files:** `apps/web/src/pages/SeriesDetailPage.tsx`, `src/components/{SeasonSection.tsx,EpisodeRow.tsx,WatchDateDialog.tsx}`, route `/series/$id` in `router.tsx`; keys `series.*`, `episode.*`
  - **DoD:** per ui.md §Series detail: header (poster, title, year, network, status select, progress), season accordions (S0 labeled from `seasons.name`, collapsed by default), episode rows (checkbox, SxE, title, air date, watch count badge on >1, date-edit affordance), bulk buttons ("season watched", "watched up to here" on row menu), optimistic updates via TanStack Query with rollback on error, `suggestCompleted` → toast offering status change
  <!-- DECISION 2026-07-14: the header status select and the suggestCompleted
  toast's status-change action both require PATCH /api/library/series/:id,
  which M3.2 was scheduled to add. Pulled the minimal PATCH (status/pushMuted/
  note, per contracts/api.md) forward into M2.3 (core `updateTracking` +
  server route) since M2.3's own DoD requires a working status select — a
  disabled placeholder would be a half-finished feature. M3.2 below no longer
  needs to add PATCH, only ratings + stats. -->
  - **Verify:** browser: tick/untick, bulk season, rewatch (tick a watched ep again via row menu "watch again"), edit a date, progress on library card updates

- [x] M2.4 CHECKPOINT M2 — manual pass of M2.3 list + M1 regression + all green

---

## M3 — Status, ratings (1–3), stats ✅ (done 2026-07-14)

Checkpoint goal: rate episodes/series kötü/normal/iyi, filter-sort library,
see the stats page.

- [x] M3.1 core ratings + stats (FR-005, FR-006, FR-017)
  - **Files:** `packages/core/src/library/{ratings.ts,stats.ts}` + tests
  - **DoD:** `setRating(targetType, targetId, value 1|2|3)` upsert, `clearRating`; value CHECK enforced; `getStats()` per contracts/api.md §stats (watchTimeMin = Σ runtime of watch events; unknown runtime → itemRunTimes avg fallback, else 0); status transitions tracked with `statusChangedAt`
  - **Tests:** upsert overwrites; invalid value throws; stats math incl. runtime fallback; rating distribution counts
  - **Verify:** `pnpm test packages/core`

- [x] M3.2 server ratings + stats → contracts/api.md §Ratings §stats; tests as usual (PATCH series route landed early in M2.3, see decision note there)
- [x] M3.3 web rating UI (FR-006)
  - **Files:** `src/components/RatingControl.tsx` (3 segmented buttons: 👎 kötü / 😐 normal / 👍 iyi — labels from i18n, not emoji-only), post-watch inline prompt in EpisodeRow (dismissible), rating on detail header; library sort/filter extension
  - **DoD:** ui.md §Rating; one-tap set/clear; keyboard accessible
- [x] M3.4 web stats page (FR-017) — read `dataviz` guidance before charting; simple bars/tiles, no chart lib unless needed
- [x] M3.5 CHECKPOINT M3 — browser pass + regression + green

---

## M4 — TMDB provider, rich metadata, images, settings ✅ (done 2026-07-14)

Checkpoint goal: paste a TMDB key in Settings, refetch, see posters from cache,
genres/tagline/platforms on detail, TR watch-provider badges.

- [x] M4.1 provider-tmdb (FR-001, FR-003, FR-016, FR-018)
  - **Files:** `packages/provider-tmdb/src/{index.ts,provider.ts,mapping.ts,mapping.test.ts}`
  - **DoD:** `createTmdbProvider({ apiKey })`; v4 Bearer + v3 key query fallback; capabilities all true except `tags`; `getSeriesDetails` = details + N season fetches (limiter 4 req/s) merged per contracts; maps external_ids, content_ratings, watch/providers (region param), episode_type, per-episode vote_average→`externalRatings[{source:"tmdb"}]`; `resolveImageUrl` per TMDB size buckets (thumb=w185, medium=w342, large=w780, original)
  - **Tests:** against `fixtures/tmdb/*` — full mapping assertions incl. finale episode_type and TR content rating. If a real TMDB key is at hand, FIRST re-capture fixtures per fixtures/README.md and drop the `__fixture_note` fields
  - **Verify:** `pnpm test packages/provider-tmdb`
- [x] M4.2 registry: TMDB-first ordering, per-request provider config from settings; enrich-on-add (details from best provider; externalRatings merged from all capable providers, non-fatal)
  <!-- DECISION 2026-07-14: "per-request provider config from settings" needs the
  settings service that M4.4 builds. M4.2 lands TMDB-first ordering + enrich-on-add
  wired to the existing env var (BAYKUS_TMDB_API_KEY, single mode) via
  createProviderRegistry({tmdbApiKey}); Article IV holds (keyless = TVmaze-only).
  M4.4 will make the registry re-read the key from the settings table so a
  Settings-page save takes effect without a restart. -->
- [x] M4.3 image cache + `/img` route (FR-014)
  - **Files:** `packages/core/src/images/{cache.ts,cache.test.ts}`, `apps/server/src/routes/img.ts`
  - **DoD:** contracts/api.md §Images; sha256 file names under `<dataDir>/images/`; fetch-through with per-provider resolveImageUrl; immutable cache headers; cache wipe-safe
  - **Tests:** cache hit skips fetch (mock); unknown provider → 404
- [x] M4.4 settings end-to-end (FR-013 groundwork, FR-015, FR-016)
  - **Files:** `packages/core/src/library/settings.ts`, `apps/server/src/routes/settings.ts`, `apps/web/src/pages/SettingsPage.tsx` rewrite
  - **DoD:** GET/PATCH `/api/settings` (locale, region, theme, tmdbApiKey write-only — never echoed back, scrapersEnabled); web form per ui.md §Settings; locale switch live-updates i18next and persists; also make `createProviderRegistry` settings-aware (falls back to `BAYKUS_TMDB_API_KEY` when unset) so a saved key takes effect without a restart — see M4.2 decision note
  <!-- DECISION 2026-07-14: contracts/api.md has no §Settings section. Shape:
  GET/PATCH /api/settings <-> {locale, region, theme, scrapersEnabled,
  tmdbApiKeySet}; tmdbApiKey is accepted on PATCH (string sets, null clears)
  but never appears in a response body — only the boolean tmdbApiKeySet does.
  "Settings-aware" registry: PATCH /api/settings calls
  refreshProviders(providers, ...) which splices the SAME array reference
  `search`/`library`/`img` routes already closed over, so a saved key takes
  effect on the very next request — no true per-request re-resolution, no
  restart needed either. theme is stored but the web UI ships it as a
  disabled "dark" select per ui.md (v1: sadece koyu). -->
- [x] M4.5 rich metadata on detail + cards (FR-016, FR-018): tagline, genres chips, content-rating badge (region-aware), network logos, watch-provider badges with **JustWatch attribution line**, external ratings row (sources with scale normalization display)
  <!-- DECISION 2026-07-14: M4.2 only scoped enrich-on-add to externalRatings.
  Watch-provider badges need SOMETHING to populate watchProviders, and M4.6's
  checkpoint explicitly requires "TR platforms visible" — so M4.5 extends
  enrich-on-add to also call getWatchProviders (region from settings, default
  TR) alongside getExternalRatings, same non-fatal Promise.allSettled pattern.
  This is a snapshot taken at add-time; M5's refresh engine is what keeps it
  current later (Article V: no required background jobs). "Cards" scope: per
  ui.md's library wireframe, cards only ever show poster/progress/rating chip
  (already done in M3.3) — no genre/network text on cards, so no card changes
  here beyond what M4.3's /img route already unlocked (real posters). -->
- [x] M4.6 CHECKPOINT M4 — with key: search prefers TMDB, images load from `/img`, TR platforms visible; without key: everything still works via TVmaze (Article IV regression!)
  <!-- DECISION 2026-07-14: no real TMDB key was available in this environment
  (see fixtures/README.md — same constraint as M4.1). "Search prefers TMDB"
  and live-reconfiguration were instead proven with a REAL network call: PATCH
  /api/settings with a syntactically-valid-but-wrong key, then GET
  /api/search — the request routed to TMDB and TMDB's actual API rejected it
  with a genuine 401 (`[tmdb] AUTH_FAILED`), which only happens if tmdb was
  already providers[0] by the very next request after the settings save, no
  restart. Clearing the key immediately restored tvmaze-only search (Article
  IV holds). "TR platforms visible" was verified against real TMDB CDN image
  paths (fixture-derived, confirmed live-fetchable) with fabricated item data,
  since add-time enrichment needs a real key to produce real watchProviders
  end-to-end. Full green suite (lint/typecheck/128 tests/build) plus a
  scripted browser regression pass (search, add, poster loading, detail page
  graceful-degradation on tvmaze-only data, settings, stats) — no regressions. -->

---

## M5 — Refresh, calendar, push

Checkpoint goal: press "Refresh all", watch SSE progress, see the calendar
with upcoming + finale badges, receive a test push.

- [x] M5.1 core refresh engine (FR-008)
  - **Files:** `packages/core/src/refresh/{engine.ts,engine.test.ts}`
  - **DoD:** `refreshItem(itemId)` re-fetches details, diffs episodes by (s,e) (upsert changed fields, insert new, never delete watched episodes — orphaned ones flagged `removed` via… NO: keep simple, delete unwatched orphans, keep watched orphans), writes refresh_log with newEpisodeCount = episodes whose airDate ∈ (lastRefreshAt, now]; `refreshAll(concurrency 3)` yields per-item results as async iterator; emits `new-episodes` events `{itemId, episodes[]}`
  - **Tests:** fake provider mutation scenarios: new episode added, air date changed, episode removed (watched vs unwatched), provider failure isolated
- [ ] M5.2 server refresh routes + SSE (contracts §Refresh); web: per-series refresh button + global refresh with progress bar (EventSource)
- [ ] M5.3 calendar (FR-007): core query (30d upcoming + 14d recently-aired-unwatched, `watching` only), server route, web CalendarPage per ui.md (day-grouped list, finale badge from episodeType, platform badges)
- [ ] M5.4 web push (FR-009)
  - **Files:** `apps/server/src/push/{vapid.ts,notify.ts}`, `apps/web/public/sw.js`, subscribe UI in Settings, per-series mute in detail header
  - **DoD:** deps `web-push`; VAPID keypair generated at first boot into dataDir (single) / env (multi); notify on `new-episodes` (one per series, skip muted); contracts §Push; sw click → `/series/:id`
  - **Tests:** notify called per event with mocked web-push; mute suppresses
- [ ] M5.5 CHECKPOINT M5 — trigger refresh with a fixture-fed fake provider in dev mode OR live TVmaze; verify SSE UI, calendar renders, push arrives (localhost is a secure context)

---

## M6 — Zip export / import (Article III)

Checkpoint goal: export zip, wipe data dir, import, everything is back.

- [ ] M6.1 core zip export (FR-010)
  - **Files:** `packages/core/src/zip/{export.ts,canonical.ts,export.test.ts}`; deps: `archiver`
  - **DoD:** streams manifest + `library/*.json` per data-model.md §Zip; canonical JSON (sorted keys, sorted arrays by stable identity) via `canonical.ts`; secrets excluded unless flag
- [ ] M6.2 core zip import + THE round-trip test (FR-010)
  - **Files:** `packages/core/src/zip/{import.ts,import.test.ts,roundtrip.test.ts}`; deps: `yauzl`
  - **DoD:** replace + merge per data-model.md §Merge; schemaVersion gate (unknown → typed error → 422); size/entry validation; episodes matched by (externalIds, s, e)
  - **Tests:** `roundtrip.test.ts` — "export→import(empty)→export byte-identical" (NEVER weaken); merge union/idempotency; unknown schemaVersion rejected
- [ ] M6.3 server + web: contracts §Zip; Settings export button (downloads `baykus-export-YYYYMMDD.zip`), import flow with replace/merge choice + warnings list + success summary
- [ ] M6.4 CHECKPOINT M6 — manual: export, `rm -rf data`, restart, import, spot-check watches/ratings/settings survived; green suite

---

## M7 — Multi mode & auth

Checkpoint goal: `BAYKUS_MODE=multi pnpm dev` → claim handle, seed with zip,
second handle is isolated; single mode password gate works.

- [ ] M7.1 accounts store (FR-012): `apps/server/src/auth/{accounts.ts,sessions.ts,accounts.test.ts}` — separate SQLite `accounts.db` (raw better-sqlite3, no drizzle needed), argon2id (`@node-rs/argon2`), session tokens (32B random, sha256-stored, 30d sliding), reserved list seeded (admin,api,www,img,static,baykus,xava,root,login,claim,settings,assets)
- [ ] M7.2 auth routes + gates (FR-012, FR-013): contracts §Auth exactly (uniform 401 message, rate limits 5/min claim + 10/min login per IP token bucket); single-mode `BAYKUS_PASSWORD` gate; `/api/health` + `/img` exempt
- [ ] M7.3 library resolver (Article I boundary): middleware session→handle→`<dataDir>/libraries/<handle>.db` via LRU pool (max 20 open, close idle 10 min); below middleware, handlers receive `Library` and cannot tell modes apart — enforce by keeping handler signatures mode-free
- [ ] M7.4 web auth UX (FR-012): `/login`, `/claim` routes per ui.md; claim success screen states loudly "şifre kurtarma YOK — zip yedeğin sigortandır"; optional zip seed upload during claim; session boot via GET /api/auth/session; account deletion in Settings with final-export interstitial
- [ ] M7.5 CHECKPOINT M7 — two handles in multi mode fully isolated (search both, data never leaks), logout/login, wrong password uniform error, single mode gate on/off via env

---

## M8 — TV Time import & optional providers

- [ ] M8.1 importer-tvtime (FR-011): header-based CSV detection (`fixtures/tvtime/`), tvdb→(tvmaze lookup, tmdb find when key)→externalIds, name-search fallback with confidence (≥0.85 auto, else fuzzy bucket), idempotent via watches dedupe key; produces report per contracts §tvtime
- [ ] M8.2 web import wizard: upload → report table (matched/fuzzy/unmatched w/ counts) → resolve fuzzy via search picker → confirm → summary; route `/import`
- [ ] M8.3 provider-imdb (FR-018): datasets client — download+cache `title.ratings.tsv.gz` (24 h TTL, ~25 MB) into dataDir, binary-search or index lookup by imdbId → `externalRatings[{source:"imdb", scale:10}]`; capability externalRatings only; disabled unless scrapersEnabled… note: datasets are ToS-fine, enable by default in single mode, keep off in multi (bandwidth)
- [ ] M8.4 provider-serializd (FR-018): `__NEXT_DATA__` parser (browser UA header), keyed by tmdbId, maps averageRating+distribution (scale 10) + nanogenres→TagInfo; graceful `PARSE_FAILED` on shape drift (fixture: `fixtures/serializd/`); returns tags only when `scrapersEnabled`
- [ ] M8.5 CHECKPOINT M8 — import the synthetic TV Time fixtures end-to-end in browser; enable scrapers in single mode and see Serializd rating + tags on HotD detail

---

## M9 — Ship

- [ ] M9.1 Dockerfile (multi-stage: pnpm build → node:22-slim runtime, `/data` volume, HEALTHCHECK `/api/health`, port 4004) + `compose.example.yml`; server serves `apps/web/dist` statically + SPA fallback
- [ ] M9.2 deploy baykus.xava.me: multi mode, server TMDB key, Caddy TLS, nightly `/data` backup cron; smoke: claim + import own zip
- [ ] M9.3 docs: README quickstart verified against clean clone, self-host guide (`docs/self-hosting.md`), screenshots
- [ ] M9.4 acceptance: walk spec.md checklist; i18n parity test (vitest: tr.json/en.json key sets equal) added and green
