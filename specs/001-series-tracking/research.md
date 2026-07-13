# Research 001 — Providers, Scraping, TV Time Import

**Plan:** [plan.md](plan.md) · Notes gathered 2026-07-13; verify against live docs when implementing.

## TMDB (primary)

- Free API for non-commercial use; user registers and gets a key
  (v3 key or v4 read token — support both, prefer v4 Bearer).
- Relevant endpoints: `search/tv`, `tv/{id}` (+`append_to_response=external_ids`),
  `tv/{id}/season/{n}` (episode inventory), `tv/{id}/watch/providers`
  (per-region streaming platforms — exactly our "hangi platformda" feature;
  data sourced from JustWatch, attribution required in UI),
  `configuration` (image base URLs/sizes).
- Rate limit: ~50 req/s official cap, be polite: our SDK limiter defaults to
  4 req/s with burst.
- Single mode: user pastes own key in settings. Multi mode: one server-side key
  via env; never sent to the browser.
- Images: `image.tmdb.org/t/p/{size}{path}` — we store `{path}` as `poster_ref`
  and proxy via `/img/*`.

## TVmaze (keyless fallback)

- Public API, no key. `search/shows?q=`, `shows/{id}?embed=episodes`,
  `shows/{id}/episodes`. Also lookup by external id:
  `lookup/shows?imdb=` / `?thetvdb=` — useful for cross-provider identity and
  TV Time import matching.
- Rate limit: 20 req/10s per IP — SDK limiter must respect this hard.
- Strong on air dates/schedule (`airstamp` with timezone), weaker on artwork and
  has no watch-provider data. Perfect zero-config fallback (Article IV).

## IMDb (optional scraper — external ratings only)

- No official public API. Options: scrape title page JSON-LD block (rating,
  votes) — brittle and against IMDb ToS; or the official **datasets**
  (`datasets.imdbws.com`, `title.ratings.tsv.gz`, refreshed daily, free for
  personal/non-commercial use) — bulk download, no per-title request.
- **Decision:** implement `provider-imdb` against the *datasets* first (safer,
  ToS-compatible for personal use): on refresh, look up rating by `imdb_id`
  from a locally cached ratings file (~25 MB gz). Page scraping stays out
  unless datasets prove insufficient. Capability: `externalRatings` only.
- Disabled by default in multi mode regardless (constitution Article IV +
  hosting liability).

## Serializd (optional scraper)

Field survey 2026-07-13 against a live show page
(`serializd.com/show/House-of-the-Dragon-94997`):

- **No public API, but none needed:** pages are Next.js — the complete payload
  sits in the `__NEXT_DATA__` script tag of the HTML. One GET per show. A
  browser-like `User-Agent` is required (default fetch UA → Cloudflare 403).
- **Show ids are TMDB ids** (`…-94997` → TMDB `94997`): cross-provider identity
  mapping is free.
- Payload inventory (`props.pageProps.data`):
  - `showDetails`: name, tagline, summary, status, premiereDate, lastAirDate,
    networks (id/name/logo/country), genres, seasons (incl. per-season
    overview), numSeasons/numEpisodes, nextEpisodeToAir (full episode object
    with episode_type, vote_average/vote_count), episodeRunTime
  - `showImages`: backdrops / posters / logos galleries with community votes
  - `ratings`: full 1–10 vote distribution with counts; `averageRating` (e.g.
    7.88 from 46 824 votes)
  - `watchProviders` + `justwatchProviders`: JustWatch-sourced streaming
    availability incl. presentationType (4k) and clickout URLs
  - `contentRating`: e.g. `TV-MA`
  - `nanogenres`: curated micro-genre tags with emoji + artwork
    (🏛️ Politics, 🛡️ Medieval, 📚 Based on a book, …)
- **Uniquely Serializd** (the rest is TMDB/JustWatch-derived — fetch from TMDB
  directly): the community rating (average + count + distribution) and the
  nanogenre tags. Both are cached per data-model.md (`external_ratings`,
  `tags`).
- **Decision (supersedes the earlier stub-only plan):** implement
  `provider-serializd` with capabilities `externalRatings` + `tags`, keyed by
  tmdbId. Fixtures = saved `__NEXT_DATA__` JSON. The blob's shape is
  build-dependent, so the parser must fail gracefully and never break refresh
  (Article IV). It is still scraping and likely against their ToS: disabled by
  default, opt-in via `BAYKUS_ENABLE_SCRAPERS`, never enabled by default in
  multi mode.

## TV Time import (GDPR export)

- Users request their data via TV Time support (GDPR); they receive a zip of
  CSVs. Known relevant files (names have varied over the years — importer must
  detect by header, not filename):
  - `seen_episode.csv` / `tracking-prod-records*.csv`: rows with episode
    watched events — fields typically include TVDB series id (`tv_show_id` /
    `series_id`), episode id, and `created_at` timestamp.
  - `followed_tv_show.csv`: followed shows (id + name).
- Matching strategy: TVDB id → TVmaze `lookup/shows?thetvdb=` → external ids →
  TMDB (`find/{tvdb_id}?external_source=tvdb_id` when key present). Fall back to
  name search with confidence scoring; below threshold → "unmatched" bucket for
  manual resolution in the report UI (US-9).
- Timestamps: treat as UTC; TV Time granularity is datetime — map directly to
  `watches.watched_at`, `source = import:tvtime`.
- Importer must be idempotent: re-running the same file creates no duplicate
  watch events (dedupe key: series identity + s/e + timestamp).

## Web Push

- Standard: VAPID keys generated at first boot, stored in `/data` (single) or
  env (multi). `web-push` npm package handles encryption.
- Requires HTTPS (fine: baykus.xava.me behind Caddy; self-host users need TLS or
  localhost). Service worker in `apps/web/public/sw.js`; notification click →
  deep link to series page.
- iOS Safari supports Web Push for installed (Add to Home Screen) sites — note
  in docs.

## Risks

| Risk | Mitigation |
|---|---|
| TMDB key abuse on hosted instance | server-side key, per-session rate limit on `/api/search` |
| TVmaze rate limit (20/10s) shared across hosted users | global limiter keyed per provider, request coalescing + metadata cache |
| Scraper breakage | optional packages, capability flags, fixtures pinned, failures isolated (Article IV) |
| TV Time export format drift | header-based detection + fixture corpus from real exports |
| SQLite write contention (multi mode) | WAL mode, one connection pool per library file, busy_timeout |
| Handle squatting / abuse | reserved list, rate limit, no email = no recovery (documented loudly) |
