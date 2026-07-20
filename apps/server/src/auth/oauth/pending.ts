import { createHash, randomBytes } from "node:crypto";
import type { AccountsDb, OAuthProvider } from "../accounts.ts";

const PENDING_TTL_MS = 10 * 60 * 1000;

export interface OAuthPending {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createOAuthPending(
  db: AccountsDb,
  pending: OAuthPending,
): { pendingToken: string; expiresAt: string } {
  const pendingToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS).toISOString();
  db.sqlite
    .prepare(
      "INSERT INTO oauth_pending (token_hash, provider, subject, email, expires_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(hashToken(pendingToken), pending.provider, pending.subject, pending.email, expiresAt);
  return { pendingToken, expiresAt };
}

export function consumeOAuthPending(db: AccountsDb, pendingToken: string): OAuthPending | null {
  const tokenHash = hashToken(pendingToken);
  const row = db.sqlite
    .prepare("SELECT provider, subject, email, expires_at FROM oauth_pending WHERE token_hash = ?")
    .get(tokenHash) as
    | {
        provider: OAuthProvider;
        subject: string;
        email: string | null;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;

  db.sqlite.prepare("DELETE FROM oauth_pending WHERE token_hash = ?").run(tokenHash);

  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return { provider: row.provider, subject: row.subject, email: row.email };
}
