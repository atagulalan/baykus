import { createHash, randomBytes } from "node:crypto";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SingleSessionStore {
  create(): { token: string; expiresAt: string };
  validate(token: string): boolean;
  delete(token: string): void;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Single mode has no accounts.db (there's exactly one password, no handle),
 * so sessions live in memory instead — a server restart naturally logs
 * everyone out, which is acceptable for a self-hosted single-user instance.
 * A fresh store per createProductionDeps()/test setup() call avoids state
 * leaking between independent `createApp()` instances.
 */
export function createSingleSessionStore(): SingleSessionStore {
  const sessions = new Map<string, number>();

  return {
    create() {
      const token = randomBytes(32).toString("base64url");
      const expiresAtMs = Date.now() + SESSION_TTL_MS;
      sessions.set(hashToken(token), expiresAtMs);
      return { token, expiresAt: new Date(expiresAtMs).toISOString() };
    },
    validate(token) {
      const key = hashToken(token);
      const expiresAtMs = sessions.get(key);
      if (expiresAtMs === undefined) return false;
      if (expiresAtMs < Date.now()) {
        sessions.delete(key);
        return false;
      }
      sessions.set(key, Date.now() + SESSION_TTL_MS);
      return true;
    },
    delete(token) {
      sessions.delete(hashToken(token));
    },
  };
}
