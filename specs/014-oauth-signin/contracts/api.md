# API Contract Delta 014 — OAuth + dual session transport

**NORMATIVE.** Overrides the §Auth section of 001's contracts/api.md.
Every section not listed here is unchanged. Conventions (error envelope,
zod validation, ISO timestamps) unchanged except the CSRF note below.

## CSRF (`X-Baykus`)

Mutations still require `X-Baykus: 1` when the session is presented via the
`baykus_session` cookie. When the request authenticates solely via
`Authorization: Bearer <token>`, the header is **not** required (E119).

## Session transport

Session = opaque 32-byte base64url token; only SHA-256 hash stored; 30-day
sliding expiry (unchanged).

| Presentation | Client |
|---|---|
| `Set-Cookie: baykus_session=…` (httpOnly, Secure, SameSite=Strict) | Web SPA |
| JSON field `token` when request body includes `"returnToken": true` | Native / non-browser |

Auth gate and library resolver accept cookie **or** `Authorization: Bearer`.
Cookie wins if both are present.

## GET /api/auth/session

```json
← 200 {
  "authenticated": true,
  "handle": "xava",
  "mode": "multi",
  "identities": ["google"],
  "hasPassword": true,
  "oauthProviders": {
    "google": { "clientId": "….apps.googleusercontent.com" },
    "apple": { "clientId": "me.xava.baykus.web" }
  }
}
```

- Never 401 (unchanged).
- `identities` / `hasPassword`: empty / false when unauthenticated or single mode.
- `oauthProviders`: only keys whose env client-ID list is non-empty; `clientId`
  is the **first** entry (web). Single mode always `{}`.

## POST /api/auth/claim · POST /api/auth/login

Bodies may include optional `returnToken: boolean`. When true, success JSON
includes `token` (raw session token). Cookie is still set.

Password claim/login semantics otherwise unchanged. OAuth-only accounts
(`password_hash` null) cannot log in via password (uniform 401 message).

## DELETE /api/auth/account (multi)

```json
→ { "password": "…" }                                          // hasPassword
→ { "provider": "google"|"apple", "idToken": "…", "nonce": "…" } // OAuth-only; nonce optional (Apple)
```

Zod: at least one re-auth path required. Wrong / missing factor → 401.

## POST /api/auth/oauth/callback (multi only)

```json
→ {
  "provider": "google" | "apple",
  "idToken": "…",
  "nonce": "…",           // optional; required for Apple when IdP issued one
  "returnToken": false
}
← 200 { "status": "authenticated", "handle": "xava", "token"?: "…" }
← 200 { "status": "needs_handle", "pendingToken": "…" }
```

Rate limit: 10/min/IP (same bucket family as login). Invalid/expired token →
401. Unknown provider or OAuth disabled → 400 `VALIDATION_FAILED`.

## POST /api/auth/oauth/claim (multi only)

```json
→ { "pendingToken": "…", "handle": "xava", "returnToken": false }
← 201 { "handle": "xava", "createdAt": "…", "token"?: "…" }
```

Creates account with null password, links identity, sets session. Handle
rules identical to password claim. Expired/unknown pending → 401.
Rate limit: 5/min/IP (claim bucket).

## POST /api/auth/oauth/link (multi, authenticated)

```json
→ { "provider": "google"|"apple", "idToken": "…", "nonce"?: "…" }
← 200 { "identities": ["google","apple"] }
```

409 if that provider already linked on this handle, or `(provider, sub)`
already belongs to another handle.

## DELETE /api/auth/oauth/link (multi, authenticated)

```json
→ { "provider": "google"|"apple" }
← 200 { "identities": ["google"] }
```

409 if unlink would leave the account with no password and no identities (E117).

## POST /api/auth/logout

Also accepts Bearer; deletes that session. Clears cookie when present.
