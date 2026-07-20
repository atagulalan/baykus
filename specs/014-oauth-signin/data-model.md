# Data-model Delta 014 — OAuth identities

**NORMATIVE.** Amends 001's data-model.md §Accounts database. Library zip
schema is **unchanged** (E123).

## Accounts database (multi mode only, NOT in zip)

```
accounts(
  handle TEXT PK,
  password_hash TEXT NULL,   -- NULL = OAuth-only (E114); was NOT NULL pre-014
  created_at TEXT NOT NULL,
  last_login_at TEXT
)

sessions(token_hash PK, handle FK CASCADE, created_at, expires_at)  -- unchanged

identities(
  provider TEXT NOT NULL,     -- 'google' | 'apple'
  subject TEXT NOT NULL,      -- IdP `sub`
  handle TEXT NOT NULL REFERENCES accounts(handle) ON DELETE CASCADE,
  email TEXT,                 -- optional; not a login key (E113)
  created_at TEXT NOT NULL,
  PRIMARY KEY (provider, subject)
)
CREATE INDEX identities_handle_idx ON identities(handle);

oauth_pending(
  token_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  expires_at TEXT NOT NULL
)

reserved_handles(handle PK)  -- unchanged
```

Migration on `openAccountsDb`: recreate `accounts` if `password_hash` is still
NOT NULL; create `identities` / `oauth_pending` if missing. Existing password
rows keep their hashes.
