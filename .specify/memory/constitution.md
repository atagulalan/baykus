# baykuş Constitution

These principles govern every design and implementation decision in this repository.
When a spec, plan, or PR conflicts with the constitution, the constitution wins —
or the constitution itself must be amended explicitly, in its own commit, with rationale.

## Article I — Library-first

The core domain concept is a single-user **Library**. Every feature MUST work in
single mode (self-hosted, one library) without accounts, handles, or any hosted
infrastructure. Multi mode (baykus.xava.me) is a thin mapping of
`handle → library` plus authentication; multi-tenancy concerns MUST NOT leak
into `packages/core`.

## Article II — Modularity via provider-sdk

Metadata sources (TMDB, TVmaze, IMDb, Serializd, and future movie/book providers)
are plugins implementing the `MetadataProvider` interface from
`packages/provider-sdk`.

- `packages/core` and `apps/*` MUST NOT import a concrete provider package
  directly; providers are registered at the composition root (`apps/server`).
- Provider packages MUST depend only on `provider-sdk` (and their own HTTP/parsing
  deps). They MUST NOT depend on `core`.
- Each provider MUST be independently usable and testable against recorded
  fixtures, with zero network access in tests.

## Article III — Data portability

The user's data belongs to the user.

- All library data (tracking, watch history, ratings, cached metadata, settings)
  MUST be exportable as a single versioned zip at any time.
- Import of an exported zip MUST be lossless: `export → import → export` yields
  semantically identical data. This round-trip is covered by an automated test.
- Images are a re-downloadable cache, never part of the zip, never part of the
  canonical data.
- The zip schema is versioned (`manifest.json#schemaVersion`); importers MUST
  support at least one previous schema version.

## Article IV — Graceful degradation, no mandatory keys

The app MUST be fully usable with zero configuration: search and metadata fall
back to keyless providers (TVmaze) when no TMDB key is configured. Scraping-based
providers (IMDb, Serializd) are OPTIONAL, disabled by default in multi mode, and
their failure MUST never break core flows.

## Article V — Manual-first updates

No feature may *require* a background scheduler. Metadata refresh is a
user-triggered action ("Refresh" button / API call). Scheduled refresh is an
optional, opt-in enhancement (env flag) — a convenience layered on top of the
manual path, never a replacement for it.

## Article VI — Multi-media from day one

Only the series module ships in v1, but the data model, provider-sdk, zip schema,
and UI navigation MUST NOT hard-code "series" as the only media type. Adding
movies or books later must not require schema-breaking changes to the zip format.

## Article VII — Simplicity and boring technology

TypeScript everywhere, one repo, pnpm workspaces, no npm publishing. SQLite over
a server database. Prefer deleting configuration over adding it. A contributor
should run the whole product with `pnpm install && pnpm dev`.

## Article VIII — Tests where they pay rent

Mandatory coverage: zip export/import round-trip, provider response mapping
(fixtures), watch/rating domain logic, TV Time import mapping. UI is tested at
the component level only where logic is non-trivial. No coverage-percentage
worship.

## Article IX — i18n from the start

All user-facing strings go through the i18n layer. Turkish is the default locale,
English is maintained in parallel. No hard-coded UI strings in components.
