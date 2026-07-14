import { rmSync } from "node:fs";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
  AccountError,
  type AccountsDb,
  createAccount,
  deleteAccount,
  touchLastLogin,
  verifyAccountPassword,
} from "../auth/accounts.ts";
import { libraryDbPath } from "../auth/library-path.ts";
import { clientIp, type RateLimiter } from "../auth/rate-limit.ts";
import {
  createSession,
  deleteAllSessionsForHandle,
  deleteSession,
  validateSession,
} from "../auth/sessions.ts";
import type { SingleSessionStore } from "../auth/single-session.ts";
import { ApiError } from "../middleware/errors.ts";

export const SESSION_COOKIE = "baykus_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/** contracts/api.md §Auth: "same message for unknown handle vs wrong password". */
const AUTH_FAILURE_MESSAGE = "invalid handle or password";

function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

const claimSchema = z.object({ handle: z.string(), password: z.string().min(8) }).strict();
const loginMultiSchema = z.object({ handle: z.string(), password: z.string().min(1) }).strict();
const loginSingleSchema = z.object({ password: z.string().min(1) }).strict();
const deleteAccountSchema = z.object({ password: z.string().min(1) }).strict();

export type AuthRouteDeps =
  | { mode: "multi"; accountsDb: AccountsDb; dataDir: string }
  | { mode: "single"; password: string | undefined; singleSessions: SingleSessionStore };

export interface AuthRateLimiters {
  claim: RateLimiter;
  login: RateLimiter;
}

/**
 * contracts/api.md §Auth. Handle-format (regex) failures on /claim map to
 * 400 VALIDATION_FAILED (zod-shaped); reserved/taken map to 409 CONFLICT
 * per the contract's explicit error table — these are different rejection
 * reasons even though both originate from createAccount().
 */
export function createAuthRoutes(deps: AuthRouteDeps, rateLimiters: AuthRateLimiters): Hono {
  const app = new Hono();

  if (deps.mode === "multi") {
    const { accountsDb, dataDir } = deps;

    app.post("/api/auth/claim", async (c) => {
      if (!rateLimiters.claim.consume(clientIp(c))) {
        throw new ApiError("RATE_LIMITED", "too many claim attempts");
      }
      const body = claimSchema.parse(await c.req.json());

      try {
        const account = await createAccount(accountsDb, body.handle, body.password);
        const { token } = createSession(accountsDb, account.handle);
        setSessionCookie(c, token);
        return c.json({ handle: account.handle, createdAt: account.createdAt }, 201);
      } catch (cause) {
        if (cause instanceof AccountError) {
          if (cause.code === "INVALID_HANDLE")
            throw new ApiError("VALIDATION_FAILED", cause.message);
          throw new ApiError("CONFLICT", cause.message);
        }
        throw cause;
      }
    });

    app.delete("/api/auth/account", async (c) => {
      const body = deleteAccountSchema.parse(await c.req.json());
      const token = getCookie(c, SESSION_COOKIE);
      const session = token ? validateSession(accountsDb, token) : null;
      if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");

      const ok = await verifyAccountPassword(accountsDb, session.handle, body.password);
      if (!ok) throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);

      deleteAllSessionsForHandle(accountsDb, session.handle);
      deleteAccount(accountsDb, session.handle);
      const dbPath = libraryDbPath(dataDir, session.handle);
      for (const suffix of ["", "-wal", "-shm"]) {
        rmSync(`${dbPath}${suffix}`, { force: true });
      }

      deleteCookie(c, SESSION_COOKIE, { path: "/" });
      return c.body(null, 204);
    });
  }

  app.post("/api/auth/login", async (c) => {
    if (!rateLimiters.login.consume(clientIp(c))) {
      throw new ApiError("RATE_LIMITED", "too many login attempts");
    }

    if (deps.mode === "multi") {
      const body = loginMultiSchema.parse(await c.req.json());
      const ok = await verifyAccountPassword(deps.accountsDb, body.handle, body.password);
      if (!ok) throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);

      touchLastLogin(deps.accountsDb, body.handle);
      const { token } = createSession(deps.accountsDb, body.handle);
      setSessionCookie(c, token);
      return c.json({ handle: body.handle });
    }

    const body = loginSingleSchema.parse(await c.req.json());
    if (!deps.password) {
      throw new ApiError("VALIDATION_FAILED", "no password configured for single mode");
    }
    if (body.password !== deps.password) {
      throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);
    }
    const { token } = deps.singleSessions.create();
    setSessionCookie(c, token);
    return c.json({ handle: null });
  });

  app.post("/api/auth/logout", (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      if (deps.mode === "multi") deleteSession(deps.accountsDb, token);
      else deps.singleSessions.delete(token);
    }
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  app.get("/api/auth/session", (c) => {
    const token = getCookie(c, SESSION_COOKIE);

    if (deps.mode === "multi") {
      const session = token ? validateSession(deps.accountsDb, token) : null;
      return c.json({
        authenticated: session !== null,
        handle: session?.handle ?? null,
        mode: deps.mode,
      });
    }

    if (!deps.password) {
      return c.json({ authenticated: true, handle: null, mode: deps.mode });
    }
    const authenticated = token ? deps.singleSessions.validate(token) : false;
    return c.json({ authenticated, handle: null, mode: deps.mode });
  });

  return app;
}
