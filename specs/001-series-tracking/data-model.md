# Data Model 001 — SQLite Schema & Zip Format

**Plan:** [plan.md](plan.md)

> **Partially superseded (2026-07-15):**
> [Data Model 002](../002-watch-categories/data-model.md) reworks the
> `tracking` table (`status` → nullable `manual_list` + `list_changed_at`,
> migration 0001) and bumps the zip to **schemaVersion 2** (import still
> accepts v1). The `tracking` table and the zip `tracking` block below
> describe schemaVersion 1 as originally shipped.

## Design notes

- One SQLite file **per library** (single mode: exactly one; multi mode: one per
  handle). The accounts DB in multi mode is separate and never enters the zip.
- `media_type` columns exist from day one (Article VI) even though v1 only
  writes `series`.
- Provider identity is stored as a set of external ids on the item — no
  provider-specific tables.
- Images: only provider refs (paths) are stored, never blobs.
- **Detail-max caching:** if a provider hands us a cheap field, we cache it
  (tagline, genres, content ratings, tags, rating distributions, …). Metadata
  is refresh-overwritable cache, so extra columns cost nothing and the UI can
  grow into them. (Decision 2026-07-13, after a field survey of a live
  Serializd show page — see research.md.)

## Library database (Drizzle schema, prose form)

### `items` — a tracked media item (v1: series)
| column | type | notes |
|---|---|---|
| id | integer pk | |
| media_type | text | `series` (later `movie`, `book`) |
| title | text | display title |
| original_title | text null | |
| tagline | text null | e.g. "Win or die." |
| overview | text null | |
| poster_ref | text null | provider image ref, e.g. `tmdb:/abc.jpg` |
| backdrop_ref | text null | |
| logo_ref | text null | show logo (transparent PNG) for hero headers |
| release_status | text null | `returning` / `ended` / `canceled` / `in_production` |
| first_air_date | text null | ISO date |
| last_air_date | text null | ISO date of most recently aired episode |
| origin_country | text null | ISO 3166-1 (`US`), comma-joined if several |
| original_language | text null | ISO 639-1 (`en`) |
| episode_run_times | text null | JSON int array — typical runtimes in minutes |
| networks | text null | JSON: `[{id, name, logoRef, originCountry}]` |
| genres | text null | JSON: `[{id, name}]` — TMDB genre taxonomy |
| tags | text null | JSON: `[{source, id, name, imageRef}]` — e.g. Serializd nanogenres |
| content_ratings | text null | JSON: `[{region, rating}]` — e.g. `[{"region":"US","rating":"TV-MA"}]` |
| tmdb_id | integer null unique | |
| tvmaze_id | integer null unique | |
| imdb_id | text null unique | |
| tvdb_id | integer null unique | |
| watch_providers | text null | JSON: `[{provider, providerId, type: flatrate/rent/buy/ads/free, region, logoRef, presentationType?}]` |
| external_ratings | text null | JSON: `[{source: imdb/tmdb/serializd, value, scale, votes, distribution?, fetchedAt}]` — `distribution` = per-step vote counts when the source exposes them |
| last_refreshed_at | text null | ISO datetime |
| added_at | text | ISO datetime |

### `tracking` — user's relationship with an item (1:1 with items)
| column | type | notes |
|---|---|---|
| item_id | integer pk fk→items | |
| status | text | `watching` / `plan_to_watch` / `completed` / `dropped` / `paused` |
| push_muted | integer | 0/1 |
| note | text null | free-form personal note |
| status_changed_at | text | ISO datetime |

### `seasons`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| item_id | integer fk→items | |
| number | integer | 0 = specials |
| name | text null | |
| overview | text null | season synopsis |
| poster_ref | text null | |
| air_date | text null | |
| unique(item_id, number) | | |

### `episodes`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| item_id | integer fk→items | denormalized for fast progress queries |
| season_number | integer | |
| episode_number | integer | |
| title | text null | |
| overview | text null | |
| air_date | text null | ISO date (provider-local converted to date) |
| runtime_min | integer null | |
| still_ref | text null | |
| episode_type | text null | `standard` / `mid_season` / `finale` (TMDB) — drives finale badges in calendar |
| external_ratings | text null | JSON: `[{source, value, scale, votes, fetchedAt}]` — per-episode community rating |
| unique(item_id, season_number, episode_number) | | survives provider id churn |

### `watches` — watch events (rewatch = multiple rows)
| column | type | notes |
|---|---|---|
| id | integer pk | |
| episode_id | integer fk→episodes | for `movie` later: nullable + item_id direct |
| item_id | integer fk→items | denormalized |
| watched_at | text | ISO datetime, user-editable |
| source | text | `manual` / `bulk` / `import:tvtime` / `import:zip` |

### `ratings` — upsert per target
| column | type | notes |
|---|---|---|
| target_type | text | `item` / `episode` |
| target_id | integer | pk(target_type, target_id) |
| value | integer | 1 kötü · 2 normal · 3 iyi (CHECK 1..3) |
| rated_at | text | |

### `push_subscriptions`
| column | type |
|---|---|
| endpoint | text pk |
| p256dh | text |
| auth | text |
| created_at | text |

### `settings` — key/value
`locale` (`tr`/`en`), `region` (`TR`), `tmdb_api_key` (single mode only),
`scrapers_enabled`, `theme`, `schema_version`, `push_vapid_public` (mirror).

### `refresh_log`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| item_id | integer null | null = global run |
| ran_at | text | |
| ok | integer | |
| new_episode_count | integer | drives push detection idempotency |
| error | text null | |

## Accounts database (multi mode only, NOT in zip)

- `accounts(handle pk, password_hash, created_at, last_login_at)`
- `sessions(token_hash pk, handle fk, created_at, expires_at)`
- `reserved_handles(handle pk)` — seeded: admin, api, www, baykus, xava, root, …

## Zip format (`schemaVersion: 1`)

```
baykus-export-YYYYMMDD.zip
├── manifest.json
└── library/
    ├── items.json        # items + tracking merged per item
    ├── watches.json
    ├── ratings.json
    └── settings.json     # secrets (tmdb_api_key) EXCLUDED unless ?includeSecrets=1
```

### manifest.json
```json
{
  "app": "baykus",
  "schemaVersion": 1,
  "exportedAt": "2026-07-13T20:00:00Z",
  "appVersion": "1.0.0",
  "mediaTypes": ["series"],
  "counts": { "items": 42, "watches": 1337, "ratings": 40 }
}
```

### items.json (shape per entry)
```json
{
  "mediaType": "series",
  "title": "Severance",
  "externalIds": { "tmdbId": 95396, "imdbId": "tt11280740" },
  "tracking": { "status": "watching", "pushMuted": false, "note": null,
                "statusChangedAt": "…" },
  "metadata": { "overview": "…", "tagline": "…", "releaseStatus": "returning",
                "firstAirDate": "2022-02-18", "lastAirDate": "2025-03-21",
                "originCountry": "US", "originalLanguage": "en",
                "episodeRunTimes": [50, 57],
                "networks": [ { "id": 2552, "name": "Apple TV+",
                                "logoRef": "tmdb:/n.png", "originCountry": "US" } ],
                "genres": [ { "id": 18, "name": "Drama" } ],
                "tags": [ { "source": "serializd", "id": 42,
                            "name": "🏢 Workplace", "imageRef": "tmdb:/t.jpg" } ],
                "contentRatings": [ { "region": "US", "rating": "TV-MA" } ],
                "posterRef": "tmdb:/x.jpg", "backdropRef": "tmdb:/b.jpg",
                "logoRef": "tmdb:/l.png",
                "watchProviders": [ { "provider": "Apple TV+", "providerId": 350,
                                      "type": "flatrate", "region": "TR",
                                      "logoRef": "tmdb:/p.jpg",
                                      "presentationType": "4k" } ],
                "externalRatings": [ { "source": "serializd", "value": 4.21,
                                       "scale": 5, "votes": 46824,
                                       "distribution": { "1": 179, "…": 0 },
                                       "fetchedAt": "…" } ],
                "seasons": [ { "number": 1, "overview": "…", "episodes": [
                  { "s": 1, "e": 1, "title": "Good News About Hell",
                    "airDate": "2022-02-18", "runtimeMin": 57,
                    "type": "standard",
                    "externalRatings": [ { "source": "tmdb", "value": 7.9,
                                           "scale": 10, "votes": 214 } ] } ] } ] },
  "addedAt": "…", "lastRefreshedAt": "…"
}
```

Cached metadata (incl. full episode inventory) IS exported: an imported library
is fully browsable offline before any refresh. Episodes are identified by
`(externalIds, seasonNumber, episodeNumber)` on import — internal ids never
leave the database.

### watches.json
```json
{ "series": { "tmdbId": 95396 }, "s": 1, "e": 3,
  "watchedAt": "2026-05-01T21:30:00Z", "source": "manual" }
```

### ratings.json
```json
{ "target": "item",    "series": { "tmdbId": 95396 }, "value": 3, "ratedAt": "…" }
{ "target": "episode", "series": { "tmdbId": 95396 }, "s": 1, "e": 3, "value": 2, "ratedAt": "…" }
```

## Merge semantics (import into non-empty library)

| Data | Rule |
|---|---|
| items | union by externalIds (any matching id joins them) |
| item metadata | it is provider cache — the side with newer `lastRefreshedAt` wins wholesale |
| watches | union by (series, s, e, watchedAt) — duplicates dropped |
| ratings | incoming wins |
| tracking status/note | incoming wins |
| settings | incoming wins, secrets only if present in zip |

## Round-trip invariant (tested)

`import(export(L))` on an empty library produces a library whose export is
byte-order-independent-equal (canonical JSON, sorted keys/arrays) to the first
export. This test is the guardian of Article III.
