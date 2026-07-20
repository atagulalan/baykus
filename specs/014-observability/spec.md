# Spec 014 — Observability

**Status:** Active · **Owner:** xava · **Created:** 2026-07-20
**Scope:** Server access logging (stdout JSON), optional Sentry error reporting
and light product analytics for hosted multi-mode. No schema, zip, or API
contract changes beyond the `X-Request-Id` request/response header. Delta over
001–013; **014 wins on overlap** for telemetry/privacy.

## Summary

Detailed request logging always available via structured JSON on stdout
(method, path, query, safe headers, redacted JSON bodies, status, duration).
Error reporting and light product analytics flow to Sentry only when a DSN is
configured (self-host default: off). Correlation uses anonymous `requestId`
only — never raw cookies, passwords, or tokens.

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E188 | Where do access logs go? | Structured JSON one-liners to **stdout**. No SaaS required for self-hosters. |
| E189 | Where do errors / product events go? | **Sentry**, only when `SENTRY_DSN` (server) / `VITE_SENTRY_DSN` (web) is set. Unset = no Sentry network calls. <!-- DECISION: 2026-07-20 — stdout + optional Sentry; not Firebase/PostHog. --> |
| E190 | Self-host telemetry default? | **Off.** Leave DSN unset. Access JSON lines remain (toggle with `BAYKUS_LOG_ACCESS=0`). |
| E191 | Correlation identity? | `requestId` only (UUID). Accept inbound `X-Request-Id` if valid UUID; otherwise generate. Echo on response. **Never** log handle or hashed handle. |
| E192 | What is in an access log line? | **Amended 2026-07-21 — detailed.** `type:"access"`, `ts`, `requestId`, `method`, `path`, `query` (values truncated; sensitive keys redacted), `status`, `durationMs`, `mode`, `req` (safe headers + redacted JSON body / multipart-omitted stub), `res` (content-type + redacted JSON body or binary/stream stub + `errorCode` when present). String fields capped (~4 KiB). <!-- DECISION: 2026-07-21 — user asked for full endpoint detail; secrets still redacted. --> |
| E193 | What is never logged / sent to Sentry? | Cookie/Authorization **values**, passwords, tokens, TMDB/VAPID secrets, raw multipart/zip/image/SSE bodies. Cookie/auth headers logged as `[Present]` only. Sensitive JSON keys → `[Redacted]`. `beforeSend` still scrubs cookie/auth-like headers for Sentry. |
| E194 | Which errors go to Sentry? | Server: unexpected / `INTERNAL` (5xx uncaught) only — not routine 4xx. Web: React crashes, unhandled rejections, API 5xx / network failures — not routine 401/404. |
| E195 | Health endpoint noise? | **Amended 2026-07-21.** `/api/health` is logged like every other endpoint (still gets `X-Request-Id`). |
| E196 | Product analytics? | Light Sentry custom events via `track()`: `page_view` (route **pattern** only, e.g. `/series/$id`), `series_add`, `watch_add`, `watch_bulk`, `import_zip`, `import_tvtime`, `search_submit`. No PII props (never query text, notes, handles). |
| E197 | Retention? | Configure the Sentry project to **30 days** (ops setting, not code). |

## Acceptance checklist

- [x] Access log middleware emits detailed redacted JSON for all endpoints
- [x] Optional `@sentry/node` init; INTERNAL → Sentry when DSN set
- [x] Web telemetry + ErrorBoundary; `track` / `captureError` no-op without DSN
- [x] Self-hosting docs list env vars
