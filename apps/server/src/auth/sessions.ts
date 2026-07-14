import { createHash, randomBytes } from "node:crypto";
import type { AccountsDb } from "./accounts.ts";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Session {
  handle: string;
  expiresAt: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(
  db: AccountsDb,
  handle: string,
): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  db.sqlite
    .prepare(
      "INSERT INTO sessions (token_hash, handle, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .run(hashToken(token), handle, new Date(now).toISOString(), expiresAt);

  return { token, expiresAt };
}

/** 30-day sliding expiry: every valid lookup pushes expires_at forward. */
export function validateSession(db: AccountsDb, token: string): Session | null {
  const tokenHash = hashToken(token);
  const row = db.sqlite
    .prepare("SELECT handle, expires_at FROM sessions WHERE token_hash = ?")
    .get(tokenHash) as { handle: string; expires_at: string } | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.sqlite
    .prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
    .run(expiresAt, tokenHash);

  return { handle: row.handle, expiresAt };
}

export function deleteSession(db: AccountsDb, token: string): void {
  db.sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function deleteAllSessionsForHandle(db: AccountsDb, handle: string): void {
  db.sqlite.prepare("DELETE FROM sessions WHERE handle = ?").run(handle);
}
