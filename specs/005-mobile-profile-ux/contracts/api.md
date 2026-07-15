# API Contract Delta 005 — favorite Field, PATCH favorite, staleOnly Refresh

**NORMATIVE.** Overrides the matching sections of 001's contracts/api.md as
amended by 002, 003 and 004; every section not listed here is unchanged.
Conventions (error envelope, `X-Baykus` header, zod validation, ISO
timestamps) unchanged. Every change in this delta is **additive** — no field
is removed or renamed, so server and web may land in either order.

**No new endpoints.** The `/user/:handle` profile URLs are client-side
routes only; all profile data comes from the existing session-scoped
endpoints (`GET /api/library/series`, `GET /api/stats`, `GET /api/auth/session`).

## Library (changed — SeriesSummary gains one field)

**SeriesSummary** (and therefore SeriesDetail) gains, everywhere it appears
(list, detail, POST, PATCH responses):

```json
{ "…": "004 shape", "favorite": false }
```

`favorite: boolean` — off `tracking.favorite` (E61/E62). Never null;
defaults false for every pre-005 item.

## Library (changed — PATCH accepts favorite)

### PATCH /api/library/series/:id

Body gains one optional field alongside the existing ones:

```json
→ { "manualList": "stopped" | "watch_later" | null,   // optional, as before
    "pushMuted": true,                                  // optional, as before
    "note": "…" | null,                                 // optional, as before
    "favorite": true }                                  // optional, NEW (E62)
```

- zod boolean; response is the updated summary/detail exactly as today,
  now reflecting `favorite`.
- A favorite-only PATCH does **not** change `listChangedAt` (E61).

## Refresh (changed — staleOnly sweep, E64)

### POST /api/library/refresh?staleOnly=1 (SSE)

- New optional query param `staleOnly`: accepted values `"1"` / `"true"`;
  any other value → 400 `VALIDATION_FAILED`; absent → full-library refresh
  exactly as today (the manual path is unchanged).
- With `staleOnly`: only items with `last_refreshed_at IS NULL` or older
  than 24 hours (E63) are refreshed, NULL first then oldest-first.
- SSE event shapes are **unchanged** (`progress` / `complete` as in 001);
  `progress.total` = the stale count. Zero stale items → an immediate
  `complete` with zero `progress` events.
- Per-item failures behave as today (logged to `refresh_log`, run
  continues). Auth requirements identical to the paramless form.

## Behavior notes (no shape change)

- **Single-item refresh** (`POST /api/library/series/:id/refresh`) is
  unchanged; the web now also calls it automatically on stale detail opens
  (E65) — same contract, new caller.
- **Zip export/import** (`/api/export`, `/api/import/zip`): payloads now
  carry `schemaVersion: 4` with the tracking `favorite` field per
  data-model 005; v1–v3 archives remain importable. Endpoint shapes
  unchanged.
