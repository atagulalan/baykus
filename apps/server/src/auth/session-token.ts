import type { Context } from "hono";
import { getCookie } from "hono/cookie";

export const SESSION_COOKIE = "baykus_session";

/**
 * Resolve the opaque session token from cookie (preferred) or
 * `Authorization: Bearer` (014 / RN). Cookie wins when both are present (E118).
 */
export function resolveSessionToken(c: Context): string | null {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (cookie) return cookie;

  const header = c.req.header("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

/** True when auth came from Bearer only (no cookie) — CSRF header not required. */
export function isBearerOnlyAuth(c: Context): boolean {
  if (getCookie(c, SESSION_COOKIE)) return false;
  const header = c.req.header("Authorization");
  return header != null && /^Bearer\s+\S+$/i.test(header);
}
