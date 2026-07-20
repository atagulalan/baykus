import type { Context, Next } from "hono";
import type { AccountsDb } from "../auth/accounts.ts";
import { runWithLibrary } from "../auth/library-context.ts";
import type { LibraryPool } from "../auth/library-pool.ts";
import { resolveSessionToken } from "../auth/session-token.ts";
import { validateSession } from "../auth/sessions.ts";
import { isExempt } from "./auth-gate.ts";
import { ApiError } from "./errors.ts";

/**
 * Multi mode only (Article I boundary) — session → handle → pooled Library,
 * attached via AsyncLocalStorage so every route handler below keeps reading
 * "the" library exactly as in single mode (see auth/library-context.ts).
 * Runs after authGate, which already rejected an invalid/missing session on
 * every non-exempt route — the lookup here is intentionally repeated (a
 * single indexed accounts.db read) rather than threading state between two
 * independent middlewares.
 */
export function createLibraryResolver(accountsDb: AccountsDb, pool: LibraryPool) {
  return async function libraryResolver(c: Context, next: Next): Promise<void> {
    if (isExempt(new URL(c.req.url).pathname)) {
      await next();
      return;
    }

    const token = resolveSessionToken(c);
    const session = token ? validateSession(accountsDb, token) : null;
    if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");

    const library = pool.get(session.handle);
    await runWithLibrary(library, next);
  };
}
