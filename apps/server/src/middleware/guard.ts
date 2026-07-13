import type { Context, Next } from "hono";
import { ApiError } from "./errors.ts";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF guard: every mutation must carry `X-Baykus: 1`. */
export async function xBaykusGuard(c: Context, next: Next): Promise<void> {
  if (MUTATING_METHODS.has(c.req.method) && c.req.header("X-Baykus") !== "1") {
    throw new ApiError("FORBIDDEN", "missing X-Baykus header");
  }
  await next();
}
