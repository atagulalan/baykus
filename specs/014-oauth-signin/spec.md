# Spec 014 — Google & Apple Sign-In (RN-ready)

**Status:** Approved (plan locked 2026-07-20) · **Owner:** xava · **Created:** 2026-07-20
**Scope:** Multi-mode OAuth (Google + Apple) via IdP `id_token` verification,
optional password accounts, handle claim after first OAuth, and dual session
transport (cookie + Bearer) so a future React Native client reuses the same
API. Delta over 001–013; **014 wins on Auth overlap**.

## Why

Hosted multi (`baykus.xava.me`) needs Sign in with Google / Apple. Cookie-only
sessions block native clients. Identity linking stays in `apps/server`
(Constitution Article I); handle remains the product identity.

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E112 | OAuth in single mode? | **No.** Single stays password/open. OAuth is multi-only; enabled when `BAYKUS_GOOGLE_CLIENT_IDS` and/or `BAYKUS_APPLE_CLIENT_IDS` are set. |
| E113 | Account primary key? | Still `handle`. IdP identity is `(provider, subject)`. Email is stored optionally for ops/debug and is **never** a login key or uniqueness constraint. |
| E114 | First-time OAuth user? | Verify `id_token` → if unknown `sub`, return `{ status: "needs_handle", pendingToken }` (10 min TTL). Client completes `POST /api/auth/oauth/claim` with a handle. Account created with `password_hash = NULL`. |
| E115 | Password auth? | Unchanged. Accounts may have password, OAuth identities, or both. |
| E116 | One IdP per provider per handle? | At most one `google` and one `apple` row per handle. Linking a second Google subject → `409 CONFLICT`. |
| E117 | Unlink last factor? | Refuse (`409 CONFLICT`) if the account would have neither a password nor any remaining identity. |
| E118 | Session for RN? | Same opaque session token. Web: httpOnly cookie (unchanged). Native: body `{ "returnToken": true }` returns raw token once; client sends `Authorization: Bearer <token>`. Prefer cookie when both present. |
| E119 | CSRF with Bearer? | `X-Baykus` required for cookie-authenticated mutations only. Bearer-authenticated mutations skip the header (no CSRF surface). |
| E120 | Account delete re-auth? | Password if `hasPassword`; else a fresh IdP `idToken` for a linked provider (`provider` + `idToken` [+ `nonce` for Apple]). |
| E121 | Verify path? | Server verifies JWT (JWKS, `iss`, `aud` ∈ configured client IDs, `exp`; Apple `nonce` when supplied). No network in tests — fixtures only. |
| E122 | Web client IDs? | Comma-separated env lists; **first** ID is the web client ID exposed to the SPA via session/`oauthProviders`. Later iOS/Android IDs are accept-audiences only. |
| E123 | Zip / core? | Identities, pending tokens, and accounts never enter the zip or `packages/core`. |

## Non-goals

- React Native / Expo app scaffolding
- Replacing password claim/login
- OAuth in single mode
- Email as account key; password recovery via email
- Auth-code-only redirect flows (id_token path covers web GIS / Apple JS and RN)

## Acceptance

- [ ] Multi claim/login password path still green
- [ ] Google/Apple callback + claim + link/unlink + Bearer gate covered by fixture tests
- [ ] Login/Settings surface OAuth only when providers configured
- [ ] i18n parity (tr/en) green
