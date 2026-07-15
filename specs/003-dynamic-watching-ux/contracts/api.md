# API Contract Delta 003 — Window Setting, Season Progress, Push Test

**NORMATIVE.** Overrides the matching sections of 001's contracts/api.md as
amended by 002; every section not listed here is unchanged. Conventions
(error envelope, `X-Baykus` header, zod validation, ISO timestamps)
unchanged. Every change in this delta is **additive** — no field is removed
or renamed, so server and web may land in either order.

New enum (mirrored in `packages/core`; not serialized over the API — listed
for completeness):

```
AddedVia = "manual" | "import:tvtime" | "import:zip"
```

## Settings (changed)

### GET /api/settings
```json
← 200 { "locale": "tr", "region": "TR", "theme": "dark",
        "scrapersEnabled": false, "tmdbApiKeySet": true,
        "watchingWindowDays": 30 }
```

### PATCH /api/settings
```json
→ { "watchingWindowDays": 14 }        // any subset, as before
← 200 { Settings }
```
`watchingWindowDays`: integer, **1–365**, else 400 `VALIDATION_FAILED`.
Default when never set: 30 (E31).

## Library (changed — SeriesSummary only)

**SeriesSummary** gains one field (everything else exactly as in 002):

```json
{
  "…": "002 shape",
  "seasonProgress": {
    "seasons": [ { "number": 1, "watched": 8, "total": 8 },
                 { "number": 2, "watched": 3, "total": 10 } ],
    "sequential": true
  }
}
```

Semantics per data-model 003 / E34. Present on list, detail, POST and PATCH
responses (anywhere SeriesSummary appears).

Behavior notes (no shape change):
- A freshly **manually** added series (zero watches, `addedAt` within the
  window) now computes as category `watching`, not `not_started` —
  supersedes 002's note on POST /api/library/series (E30 rung 3a).
- Category computation everywhere (list filter, stats, calendar scope, push
  scope) uses the E30 precedence with the E31 window. The active trio
  definition (E22) is unchanged.

## Watches (changed — history entries)

### GET /api/watches/history?limit=30

Entries gain two nullable fields (E38):

```json
{ "…": "002 shape", "airDate": "2026-07-14", "episodeType": "standard" }
```

## Library (new endpoint — danger zone)

### DELETE /api/library
```json
→ { "confirm": "DELETE" }
← 204
```
- Strict body: exactly `{ confirm: "DELETE" }` (literal, not locale-dependent —
  the web UI's locale-specific confirm phrase is a client-side gate only).
- Irreversibly deletes items (cascades tracking/seasons/episodes/watches),
  ratings, settings, push subscriptions, and the refresh log (E42).
- No auth beyond the existing session/X-Baykus requirements — same as every
  other mutating endpoint.

## Push (new endpoint)

### POST /api/push/test
```json
→ { "endpoint": "https://fcm.googleapis.com/…" }
← 200 {}
```
- Strict body: exactly `{ endpoint }`.
- Unknown endpoint → 404 `NOT_FOUND`.
- Push service reports the subscription gone (404/410) → subscription
  removed, response 404 `NOT_FOUND`.
- Other delivery failure → reuse the existing error mapping in
  `middleware/errors.ts` (no new envelope codes).
- Payload sent: `{ "title": "baykuş", "body": "Test bildirimi",
  "url": "/settings" }` (E39).

## TV Time import (changed — matching progress, E44)

### POST /api/import/tvtime (response changed: JSON → SSE stream)

`Content-Type: text/event-stream`, same wire pattern as
`/api/import/tvtime/confirm`. Events, in order:
```
event: progress   data: {"done":1,"total":15,"name":"Dark","status":"matched"}
event: progress   data: {"done":2,"total":15,"name":"The Office","status":"fuzzy"}
event: progress   data: {"done":3,"total":15,"name":"Unknown Show","status":"unmatched"}
event: complete   data: { "reportId": "r1", "matched": [...], "fuzzy": [...], "unmatched": [...] }
```
- `progress` fires once per show, in **completion** order (bounded
  concurrency), not input order — `done` is a monotonic count out of
  `total`; `status` is that show's outcome kind.
- `complete`'s payload is exactly the old 200 JSON body, unchanged shape.
- Non-streaming errors (missing file, unreadable zip/csv) still short-circuit
  with a plain error-envelope response before the stream starts (unchanged).
<!-- DECISION: changed from a single JSON 200 to an SSE stream for the same
     reason /confirm already is one — a real export's matching phase (one
     provider lookup per show) can take minutes with zero client feedback.
     Additive in spirit (the terminal payload is identical) but technically
     a response Content-Type change, so called out here explicitly rather
     than filed under "behavior note". -->

## Zip (behavior note)

Endpoints unchanged. Export emits schemaVersion **3**; import accepts 1, 2
and 3 (422 `UNSUPPORTED_SCHEMA` otherwise). v1/v2 items get
`addedVia = "import:zip"` (E32).

## Images (behavior note — no change)

`GET /img/...` already serves `Cache-Control: public, max-age=31536000,
immutable`; asserted by `img.test.ts` (E40). Recorded so the requirement is
visibly covered.
