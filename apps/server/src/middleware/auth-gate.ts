import type { Context, Next } from "hono";
import { resolveSessionToken } from "../auth/session-token.ts";
import { validateSession } from "../auth/sessions.ts";
import type { AuthRouteDeps } from "../routes/auth.ts";
import { ApiError } from "./errors.ts";

const EXEMPT_PREFIXES = ["/api/health", "/api/auth/", "/img/"];

/** Shared with library-resolver.ts — the same routes need neither a session nor a resolved Library. */
export function isExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * contracts/api.md §Auth — single mode gates everything behind BAYKUS_PASSWORD
 * only when it's set (FR-013: the gate is optional); multi mode always gates.
 * /api/health, /api/auth/*, /img/* are exempt in both modes.
 * Session may be cookie or Authorization Bearer (014 E118).
 */
export function createAuthGate(deps: AuthRouteDeps) {
  return async function authGate(c: Context, next: Next): Promise<void> {
    if (isExempt(new URL(c.req.url).pathname)) {
      await next();
      return;
    }

    if (deps.mode === "multi") {
      const token = resolveSessionToken(c);
      const session = token ? validateSession(deps.accountsDb, token) : null;
      if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");
      await next();
      return;
    }

    if (!deps.password) {
      await next();
      return;
    }
    const token = resolveSessionToken(c);
    if (!token || !deps.singleSessions.validate(token)) {
      throw new ApiError("UNAUTHORIZED", "authentication required");
    }
    await next();
  };
}
