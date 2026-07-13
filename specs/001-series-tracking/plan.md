# Plan 001 — Technical Plan for Series Tracking

**Spec:** [spec.md](spec.md) · **Constitution:** [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) everywhere | One language across web/server/packages |
| Monorepo | pnpm workspaces | Simple, fast; no npm publishing (workspace:*) |
| Frontend | Vite + React 19 | User preference; mature ecosystem |
| Routing/data | TanStack Router + TanStack Query | Type-safe routes; server-state caching fits manual-refresh model |
| Styling | Tailwind CSS v4 | Fast iteration, dark mode built-in |
| i18n | i18next (react-i18next) | TR default + EN, JSON catalogs |
| Server | Node.js LTS + Hono | Tiny, fast, TS-first; same router style if we ever move to edge |
| DB | SQLite via better-sqlite3 + Drizzle ORM | Canonical store; sync driver is fine for single-library workloads; Drizzle gives typed schema + migrations |
| Zip | `archiver` (write) + `unzipper`/`yauzl` (read) | Streaming, battle-tested |
| Push | `web-push` (VAPID) | No third-party service |
| Auth (multi) | argon2id (`@node-rs/argon2`) + signed httpOnly session cookie | No JWT complexity; sessions table in accounts DB |
| Validation | zod | Shared schemas between API and web via `core` types |
| Tests | Vitest (+ msw/fixtures for providers) | Workspace-aware, fast |
| Lint/format | Biome | One tool, no config sprawl |
| CI | GitHub Actions | lint + typecheck + test on PR |

## Monorepo layout

```
baykus/
├── apps/
│   ├── web/                    # Vite + React SPA (talks only to server HTTP API)
│   └── server/                 # Hono; composition root: wires providers into core
├── packages/
│   ├── core/                   # Domain + persistence + zip + refresh engine
│   │   ├── src/db/             #   Drizzle schema & migrations (per-library DB)
│   │   ├── src/library/        #   Library service: tracking, watches, ratings, stats
│   │   ├── src/refresh/        #   Refresh engine + new-episode detection events
│   │   ├── src/zip/            #   Export/import (versioned schema, merge logic)
│   │   └── src/images/         #   Image cache (disk, hash-keyed)
│   ├── provider-sdk/           # MetadataProvider interface, shared DTOs, errors
│   ├── provider-tmdb/
│   ├── provider-tvmaze/
│   ├── provider-imdb/          # optional: external ratings (IMDb datasets)
│   ├── provider-serializd/     # optional: community ratings + nanogenre tags
│   └── importer-tvtime/        # TV Time export → core import structures
└── specs/ …
```

Dependency rules (enforced by review + eslint-ish boundary check later):

```
apps/web ──HTTP──▶ apps/server ──▶ packages/core ──▶ provider-sdk (types only)
                        │
                        └─registers─▶ provider-tmdb / tvmaze / imdb / serializd ──▶ provider-sdk
```

`core` consumes providers only through the `MetadataProvider` interface it
receives from the composition root. It never imports a provider package.

## provider-sdk (heart of the modularity)

```ts
export type MediaType = "series" | "movie" | "book"; // Article VI

export interface ProviderCapabilities {
  search: boolean;
  details: boolean;        // full season/episode inventory
  upcoming: boolean;       // reliable future air dates
  watchProviders: boolean; // streaming platform availability
  externalRatings: boolean;
  tags: boolean;           // curated tags / nanogenres (e.g. serializd)
  images: boolean;
}

export interface MetadataProvider {
  readonly id: string;                    // "tmdb", "tvmaze", ...
  readonly mediaTypes: MediaType[];       // v1 providers: ["series"]
  readonly capabilities: ProviderCapabilities;
  readonly requiresApiKey: boolean;

  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
  getSeriesDetails(ref: ExternalRef): Promise<SeriesDetails>; // seasons+episodes
  getWatchProviders?(ref: ExternalRef, region: string): Promise<WatchProviderInfo[]>;
  getExternalRatings?(ref: ExternalRef): Promise<ExternalRating[]>;
  getTags?(ref: ExternalRef): Promise<TagInfo[]>;
  resolveImageUrl(ref: ImageRef, size: ImageSize): string; // provider CDN URL
}

export interface ExternalRef {           // cross-provider identity
  tmdbId?: number; tvmazeId?: number; imdbId?: string; tvdbId?: number;
}
```

- Every provider ships fixtures (recorded JSON/HTML) and mapping tests.
- Rate limiting + retry live in `provider-sdk` helpers so scrapers behave.
- Provider registry in `apps/server` decides ordering: TMDB when key present,
  TVmaze otherwise; IMDb/Serializd only when explicitly enabled
  (`BAYKUS_ENABLE_SCRAPERS=1`, default off in multi mode — ToS risk, see
  research.md).

## Modes

One server binary, `BAYKUS_MODE=single|multi` (default `single`).

**single:** one library DB at `/data/library.db`, image cache at `/data/images/`.
Optional `BAYKUS_PASSWORD` gate (US-11).

**multi (baykus.xava.me):**
- `/data/accounts.db` — handles, argon2id hashes, sessions.
- `/data/libraries/<handle>.db` — one SQLite file per handle; opened lazily,
  LRU-pooled, closed when idle. Complete isolation, trivially deletable,
  zip import/export maps 1:1 to a library file's contents.
- Image cache is shared across handles (public metadata, keyed by content).
- Middleware resolves session → handle → library, injects a `Library` service
  instance; below that line, code is identical to single mode (Article I).

## API surface (Hono, `/api/*`, JSON, zod-validated)

```
POST /api/auth/claim          {handle, password}         (multi)
POST /api/auth/login|logout                              (multi)
POST /api/auth/session-password {password}               (single, if env set)

GET  /api/search?q=&provider=
POST /api/library/series               {externalRef, status}
GET  /api/library/series?status=&sort=
GET  /api/library/series/:id           (detail incl. seasons/episodes/progress)
PATCH/api/library/series/:id           {status?, muted?}
DELETE /api/library/series/:id
POST /api/library/series/:id/refresh
POST /api/library/refresh              (global, SSE progress stream)

POST /api/episodes/:id/watches         {watchedAt?}
POST /api/library/series/:id/watches/bulk {upToEpisodeId | seasonNumber}
DELETE /api/episodes/:id/watches/latest

PUT  /api/ratings                      {targetType, targetId, value 1..3}
DELETE /api/ratings/:targetType/:targetId

GET  /api/calendar?from=&to=           (upcoming + recently-aired-unwatched)
GET  /api/stats

GET  /api/export.zip
POST /api/import                       multipart zip, {mode: replace|merge}
POST /api/import/tvtime                multipart, returns match report
POST /api/import/tvtime/confirm        {resolutions}

POST /api/push/subscribe | DELETE /api/push/subscribe
GET  /img/:provider/:size/:hash        (image cache proxy)
```

Server serves the built SPA statically; in dev, Vite proxies `/api` + `/img`.

## Key flows

**Refresh (US-6/7):** queue of series → per-series: fetch details → diff episodes
table → upsert → detect episodes with `air_date` in (last_refresh, now] →
emit `new-episodes` event → push notifier sends one notification per series
(unless muted). Concurrency 3, per-item try/catch, report aggregated to client
over SSE.

**Zip export (US-8):** stream `manifest.json` + `library/*.json` straight out of
SQLite queries — no temp files. Import: parse manifest, validate schemaVersion,
run in one transaction; `merge` = union watch events by (episode identity,
timestamp), incoming wins for status/ratings/settings.

**Images (FR-014):** DB stores provider image *refs* (e.g. TMDB `poster_path`),
never bytes. `/img/*` checks disk cache, else fetches from provider CDN, stores,
serves with long cache headers. Cache is disposable.

## Deployment

- **Dockerfile**: multi-stage; final image runs `node apps/server`, volume
  `/data`, port 4004. Works for both modes via env.
- **baykus.xava.me**: same image with `BAYKUS_MODE=multi`, server-side TMDB key,
  behind Caddy (TLS). Backups = nightly copy of `/data` (SQLite files are the
  backup; users additionally have zip export).
- Updates are manual: pull new image, restart (matches Article V spirit).

## Security notes

- argon2id for passwords; constant-time compares; rate-limit auth + claim
  endpoints (in-memory token bucket, per IP).
- Handles validated against reserved list; libraries pathed by sanitized handle.
- Zip import: size cap (50 MB), JSON-only entries, zod-validated, no path reuse
  from archive (we never extract to disk).
- Scrapers off by default in multi mode; TMDB key never exposed to client
  (server proxies all provider calls).
- CSRF: SameSite=Strict cookies + custom header check on mutations.

## Open questions (to resolve during implementation, not blockers)

1. SSE vs simple polling for global refresh progress — start with SSE, fall back
   if proxying is annoying.
2. Handle claim abuse on hosted instance (v1: rate limit + reserved list;
   captcha only if abuse actually happens).
3. TMDB image CDN hotlinking vs always-proxy — start always-proxy via `/img/*`
   for privacy and cache control.
