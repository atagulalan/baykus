import type { Context, Next } from "hono";
import { isBearerOnlyAuth } from "../auth/session-token.ts";
import { ApiError } from "./errors.ts";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF guard: cookie-authenticated mutations must carry `X-Baykus: 1`.
 * Bearer-only requests skip the header (014 E119).
 */
export async function xBaykusGuard(c: Context, next: Next): Promise<void> {
  if (MUTATING_METHODS.has(c.req.method) && c.req.header("X-Baykus") !== "1") {
    if (!isBearerOnlyAuth(c)) {
      throw new ApiError("FORBIDDEN", "missing X-Baykus header");
    }
  }
  await next();
}
