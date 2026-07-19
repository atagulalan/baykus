# API Contract — baykuş HTTP API

> **Partially superseded (2026-07-15):**
> [Contract Delta 002](../../002-watch-categories/contracts/api.md) overrides
> the §Library, §Watches, §Calendar and §Stats sections below (plus behavior
> notes for tvtime/zip/push) — `status` becomes computed `category` +
> `manualList`, `suggestCompleted` is removed, the calendar returns a single
> `days` range, and `GET /api/watches/history` is added. Sections not listed
> there remain normative here.

**NORMATIVE.** Server routes and web client must match this document exactly.
DTO field shapes come from `packages/provider-sdk/src/types.ts`; DB enums from
`packages/core/src/db/schema.ts`. All bodies are JSON unless stated. All
timestamps ISO-8601 UTC; all dates `YYYY-MM-DD`.

## Conventions

- Base path `/api`. The server also serves the SPA (`/`) and the image cache
  (`/img`).
- IDs in URLs are **internal** numeric ids (`items.id`, `episodes.id`), never
  provider ids.
- Success responses return the resource directly (no envelope). List responses
  are `{ "items": [...], "total": n }`.
- Mutations require header `X-Baykus: 1` (CSRF guard); missing header → 403
  `FORBIDDEN`.
- Validation: zod on every request body/query. Unknown fields are rejected.

### Error envelope (every non-2xx)

```json
{ "error": { "code": "NOT_FOUND", "message": "series 42 not in library", "details": null } }
```

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | zod parse failure; `details` = flattened issues |
| `UNAUTHORIZED` | 401 | no/invalid session where one is required |
| `FORBIDDEN` | 403 | missing `X-Baykus` header on mutation; accessing another handle's data |
| `NOT_FOUND` | 404 | unknown internal id / unknown route |
| `CONFLICT` | 409 | handle taken; series already in library; import into non-empty library without `mode` |
| `PAYLOAD_TOO_LARGE` | 413 | import zip > 50 MB |
| `UNSUPPORTED_SCHEMA` | 422 | zip manifest schemaVersion unknown |
| `RATE_LIMITED` | 429 | auth/claim/search rate limits |
| `PROVIDER_ERROR` | 502 | upstream provider failed; `details.provider`, `details.code` = ProviderErrorCode |
| `INTERNAL` | 500 | anything else; message is generic, details logged server-side |

## Auth

Single mode with `BAYKUS_PASSWORD` set — all `/api/*` except `/api/health` and
`/api/auth/*` require a session. Multi mode — same, plus per-handle isolation.
Session = httpOnly, Secure, SameSite=Strict cookie `baykus_session`, 30-day
sliding expiry.

### POST /api/auth/claim (multi mode only)
```json
→ { "handle": "xava", "password": "min 8 chars" }
← 201 { "handle": "xava", "createdAt": "2026-07-14T09:00:00Z" }
```
Handle rules: `^[a-z0-9-]{3,30}$`, not in reserved list. Errors: 409 `CONFLICT`
(taken/reserved), 429. Sets session cookie. Response must remind nothing —
the UI shows "your zip export is your backup" (no password recovery).

### POST /api/auth/login
```json
→ { "handle": "xava", "password": "…" }        // multi mode
→ { "password": "…" }                           // single mode (env password)
← 200 { "handle": "xava" }                      // single mode: { "handle": null }
```
401 on bad credentials (same message for unknown handle vs wrong password).

### POST /api/auth/logout → 204. DELETE /api/auth/account (multi) → 204, deletes library after re-auth via body `{ "password": "…" }`.

### GET /api/auth/session
```json
← 200 { "authenticated": true, "handle": "xava", "mode": "multi" }
```
Never 401 — used by the SPA on boot.

## Search

### GET /api/search?q=dragon&limit=10
Auth required. Rate limit 30/min/session.
```json
← 200 { "items": [ {
    "providerId": "tmdb",
    "mediaType": "series",
    "externalIds": { "tmdbId": 94997, "imdbId": "tt11198330" },
    "title": "House of the Dragon",
    "year": 2022,
    "overview": "The Targaryen dynasty…",
    "posterRef": "tmdb:/okrubNzXkGSa6LgrBKRz0eaviHn.jpg",
    "network": "HBO",
    "score": 0.98,
    "libraryItemId": 12
  } ], "total": 1 }
```
Provider = registry order (TMDB if key, else TVmaze). 502 `PROVIDER_ERROR` on
upstream failure. `libraryItemId` is set only when any of the result's
external ids already matches a library item (009 E131); omitted otherwise.

### GET /api/search/preview?tmdbId=94997&tvmazeId=44778
Auth required. At least one external id query param. Fetches provider
`getSeriesDetails` without writing to the library.
```json
← 200 {
  "externalIds": { "tmdbId": 94997, "tvmazeId": 44778 },
  "title": "House of the Dragon",
  "year": 2022,
  "overview": "…",
  "posterRef": "tmdb:/…",
  "backdropRef": null,
  "tagline": null,
  "network": "HBO",
  "genres": [{ "name": "Drama" }],
  "releaseStatus": "returning",
  "libraryItemId": null,
  "seasons": [{
    "number": 1,
    "name": null,
    "overview": null,
    "posterRef": null,
    "airDate": "2022-08-21",
    "episodes": [{
      "id": 100001,
      "s": 1, "e": 1,
      "title": "The Heirs of the Dragon",
      "overview": null,
      "airDate": "2022-08-21",
      "runtimeMin": 66,
      "stillRef": null,
      "episodeType": null,
      "communityRating": null,
      "myRating": null,
      "watchCount": 0,
      "lastWatchedAt": null
    }]
  }],
  "networks": [{ "name": "HBO" }],
  "originalLanguage": "en",
  "episodeRunTimes": [60],
  "contentRatings": [],
  "tags": [],
  "cast": [],
  "watchProviders": [],
  "externalRatings": []
}
```
`libraryItemId` is non-null when the ids already match a library item (web
replace-redirects to `/series/i{id}`). Episode `id`s are **synthetic**
(`(s+1)*100000+e`) — preview only; real ids appear after add. 400 if no
external id is supplied. 502 `PROVIDER_ERROR` on upstream failure.
<!-- DECISION: preview also returns SeriesDetail metadata slices (networks,
cast, ratings, providers, …) so `/series/new` can reuse the detail hero +
info sheet without adding the show first. -->
Items with `libraryItemId` are sorted ahead of the rest (relative order within
each group preserved).

## Library

### POST /api/library/series
```json
→ { "externalIds": { "tmdbId": 94997 }, "status": "watching" }
← 201 { SeriesSummary }
```
Fetches full details from the best provider, stores item+seasons+episodes.
409 `CONFLICT` if any external id already in library (`details.itemId` set).

### GET /api/library/series?status=watching&sort=title|added|rating|nextAir
```json
← 200 { "items": [ SeriesSummary ], "total": 42 }
```

**SeriesSummary** (list card):
```json
{
  "id": 1, "title": "House of the Dragon", "posterRef": "tmdb:/x.jpg",
  "year": 2022, "status": "watching", "rating": 3,
  "releaseStatus": "returning", "network": "HBO",
  "progress": { "watched": 18, "aired": 26, "total": 26 },
  "nextUnwatched": { "episodeId": 210, "s": 2, "e": 7, "title": "…" },
  "nextAirDate": "2026-07-19", "pushMuted": false
}
```
`progress` counts **exclude specials (season 0)**; `aired` = airDate ≤ today
(UTC). `rating` = my item rating (1-3) or null.

### GET /api/library/series/:id → 200 **SeriesDetail**
SeriesSummary plus: `tagline`, `overview`, `genres`, `tags`, `contentRatings`,
`networks`, `originCountry`, `originalLanguage`, `episodeRunTimes`,
`watchProviders`, `externalRatings`, `backdropRef`, `logoRef`, `note`,
`lastRefreshedAt`, `addedAt`, and:
```json
"seasons": [ { "number": 1, "name": "Season 1", "overview": "…",
  "posterRef": "tmdb:/s1.jpg", "airDate": "2022-08-21",
  "episodes": [ { "id": 101, "s": 1, "e": 1, "title": "The Heirs of the Dragon",
    "overview": "…", "airDate": "2022-08-21", "runtimeMin": 66,
    "stillRef": "tmdb:/e1.jpg", "episodeType": "standard",
    "communityRating": { "source": "tmdb", "value": 7.9, "scale": 10, "votes": 214 },
    "myRating": 3, "watchCount": 2, "lastWatchedAt": "2026-05-01T21:30:00Z" } ] } ]
```

### PATCH /api/library/series/:id
```json
→ { "status": "completed" }        // any subset of: status, pushMuted, note
← 200 { SeriesSummary }
```

### DELETE /api/library/series/:id → 204 (hard delete, cascades)

## Watches

### POST /api/episodes/:id/watches
```json
→ { "watchedAt": "2026-07-13T21:00:00Z" }   // optional, default now
← 201 { "id": 501, "episodeId": 210, "watchedAt": "…", "source": "manual",
        "suggestCompleted": false }
```
`suggestCompleted` true when this watch made all aired non-special episodes
watched and status ≠ completed. Duplicate (episodeId, watchedAt) → 200 with the
existing watch (idempotent).

### POST /api/library/series/:id/watches/bulk
```json
→ { "upToEpisodeId": 210 }   // OR { "seasonNumber": 2 } — exactly one
← 200 { "created": 17, "skippedAlreadyWatched": 5, "suggestCompleted": true }
```
"Up to here": every non-special episode with (s,e) ≤ target in airing order
that has **no** watch event gets one with `watchedAt = now`, `source: "bulk"`.

### DELETE /api/episodes/:id/watches/latest → 204 (removes most recent event; 404 if none)

## Ratings

### PUT /api/ratings
```json
→ { "targetType": "episode", "targetId": 210, "value": 3 }
← 200 { "targetType": "episode", "targetId": 210, "value": 3, "ratedAt": "…" }
```
Upsert. `value` ∈ {1,2,3}. DELETE /api/ratings/:targetType/:targetId → 204.

## Calendar & stats

### GET /api/calendar?from=2026-07-14&to=2026-08-13
Defaults: from=today, to=today+30d. Also returns the recently-aired window:
```json
← 200 {
  "upcoming": [ { "date": "2026-07-19", "entries": [ { "itemId": 1,
    "title": "House of the Dragon", "posterRef": "tmdb:/x.jpg",
    "episodeId": 215, "s": 3, "e": 5, "episodeTitle": null,
    "episodeType": "standard", "network": "HBO",
    "watchProviders": [ { "provider": "HBO Max", "type": "flatrate", "region": "TR" } ] } ] } ],
  "recentlyAired": [ /* same entry shape + "airDate" */ ]
}
```
`recentlyAired` = last 14 days, unwatched only, `watching` status only.

### GET /api/stats
```json
← 200 { "episodesWatched": 1337, "watchTimeMin": 61020,
  "itemCount": { "watching": 12, "plan_to_watch": 30, "completed": 41, "dropped": 3, "paused": 2 },
  "episodesPerMonth": [ { "month": "2026-06", "count": 44 } ],
  "ratingDistribution": { "1": 5, "2": 20, "3": 15 } }
```

## Refresh

### POST /api/library/series/:id/refresh
```json
← 200 { "itemId": 1, "ok": true, "newEpisodes": 2, "refreshedAt": "…" }
```
502 with `PROVIDER_ERROR` if the item's provider fails.

### POST /api/library/refresh  (global; SSE stream response)
`Content-Type: text/event-stream`. Events, in order:
```
event: progress   data: {"done":3,"total":42,"itemId":7,"ok":true,"newEpisodes":1}
event: progress   data: {"done":4,"total":42,"itemId":9,"ok":false,"error":"[tvmaze] RATE_LIMITED: …"}
event: complete   data: {"ok":40,"failed":2,"newEpisodes":6}
```
Concurrency 3; one failure never aborts the run.

## Zip export / import

### GET /api/export.zip → 200, `application/zip`, streaming; `?includeSecrets=1` adds tmdb key to settings.json.
### POST /api/import — multipart form: `file` (zip), `mode` = `replace` | `merge`.
```json
← 200 { "items": 42, "watches": 1337, "ratings": 40, "mode": "merge",
        "warnings": [ "3 watches skipped: duplicate (episode, timestamp)" ] }
```
Non-empty library + missing `mode` → 409. Bad manifest → 422.

### POST /api/import/tvtime — multipart `file` (TV Time GDPR zip or CSV)
```json
← 200 { "reportId": "r1", "matched": [ { "name": "Dark", "tvdbId": 305288,
    "resolved": { "tmdbId": 70523 }, "episodes": 30 } ],
  "fuzzy": [ { "name": "The Office", "candidates": [ { "externalIds": {"tmdbId": 2316},
    "title": "The Office (US)", "year": 2005 } ], "episodes": 188 } ],
  "unmatched": [ { "name": "Some Local Show", "episodes": 4 } ] }
```
### POST /api/import/tvtime/confirm (SSE stream response)
```json
→ { "reportId": "r1", "resolutions": [ { "name": "The Office", "externalIds": { "tmdbId": 2316 } } ] }
```
`Content-Type: text/event-stream`. Events, in order:
```
event: progress   data: {"done":1,"total":15,"name":"Dark","ok":true}
event: progress   data: {"done":2,"total":15,"name":"The Office","ok":true}
event: progress   data: {"done":3,"total":15,"name":"Unknown Show","ok":false}
event: complete   data: {"itemsCreated":12,"watchesCreated":1200,"skipped":22}
```
<!-- DECISION: confirm endpoint changed from single JSON 200 to SSE stream to
     enable a client-side progress bar — same pattern as POST /api/library/refresh. -->

## Push

### POST /api/push/subscribe → body = standard PushSubscription JSON → 201 {}.
### DELETE /api/push/subscribe → body `{ "endpoint": "…" }` → 204.
### GET /api/push/vapid-public-key → 200 `{ "key": "B…" }`.

## Images

### GET /img/:providerId/:size/:encodedPath
`size` ∈ thumb|medium|large|original. `encodedPath` = URL-encoded provider path
(the part after `providerId:` in an ImageRef). Fetch-through disk cache,
`Cache-Control: public, max-age=31536000, immutable`. Unknown provider/size →
404. This endpoint is auth-exempt (refs are unguessable public metadata).

## Health

### GET /api/health → 200 `{ "ok": true, "mode": "single", "version": "0.1.0" }` — no auth, used by Docker healthcheck.
