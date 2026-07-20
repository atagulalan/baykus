import { rmSync } from "node:fs";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
  AccountError,
  type AccountsDb,
  accountHasPassword,
  createAccount,
  createOAuthAccount,
  deleteAccount,
  findIdentity,
  IdentityError,
  linkIdentity,
  listIdentities,
  type OAuthProvider,
  touchLastLogin,
  unlinkIdentity,
  verifyAccountPassword,
} from "../auth/accounts.ts";
import { libraryDbPath } from "../auth/library-path.ts";
import { consumeOAuthPending, createOAuthPending } from "../auth/oauth/pending.ts";
import { type OAuthVerifyConfig, OAuthVerifyError, verifyIdToken } from "../auth/oauth/verify.ts";
import { clientIp, type RateLimiter } from "../auth/rate-limit.ts";
import { resolveSessionToken, SESSION_COOKIE } from "../auth/session-token.ts";
import {
  createSession,
  deleteAllSessionsForHandle,
  deleteSession,
  validateSession,
} from "../auth/sessions.ts";
import type { SingleSessionStore } from "../auth/single-session.ts";
import { ApiError } from "../middleware/errors.ts";

export { SESSION_COOKIE };

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

function parseClientIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function oauthProvidersFromConfig(googleIds: string[], appleIds: string[]) {
  const oauthProviders: {
    google?: { clientId: string };
    apple?: { clientId: string };
  } = {};
  if (googleIds[0]) oauthProviders.google = { clientId: googleIds[0] };
  if (appleIds[0]) oauthProviders.apple = { clientId: appleIds[0] };
  return oauthProviders;
}

const claimSchema = z
  .object({
    handle: z.string(),
    password: z.string().min(8),
    returnToken: z.boolean().optional(),
  })
  .strict();
const loginMultiSchema = z
  .object({
    handle: z.string(),
    password: z.string().min(1),
    returnToken: z.boolean().optional(),
  })
  .strict();
const loginSingleSchema = z
  .object({
    password: z.string().min(1),
    returnToken: z.boolean().optional(),
  })
  .strict();
const deleteAccountSchema = z
  .object({
    password: z.string().min(1).optional(),
    provider: z.enum(["google", "apple"]).optional(),
    idToken: z.string().min(1).optional(),
    nonce: z.string().min(1).optional(),
  })
  .strict()
  .refine((b) => b.password != null || (b.provider != null && b.idToken != null), {
    message: "password or provider+idToken required",
  });

const oauthCallbackSchema = z
  .object({
    provider: z.enum(["google", "apple"]),
    idToken: z.string().min(1),
    nonce: z.string().min(1).optional(),
    returnToken: z.boolean().optional(),
  })
  .strict();

const oauthClaimSchema = z
  .object({
    pendingToken: z.string().min(1),
    handle: z.string(),
    returnToken: z.boolean().optional(),
  })
  .strict();

const oauthLinkSchema = z
  .object({
    provider: z.enum(["google", "apple"]),
    idToken: z.string().min(1),
    nonce: z.string().min(1).optional(),
  })
  .strict();

const oauthUnlinkSchema = z.object({ provider: z.enum(["google", "apple"]) }).strict();

export type AuthRouteDeps =
  | {
      mode: "multi";
      accountsDb: AccountsDb;
      dataDir: string;
      oauth?: OAuthVerifyConfig;
    }
  | { mode: "single"; password: string | undefined; singleSessions: SingleSessionStore };

export interface AuthRateLimiters {
  claim: RateLimiter;
  login: RateLimiter;
}

function sessionJson(
  authenticated: boolean,
  handle: string | null,
  mode: "single" | "multi",
  extra: {
    identities?: OAuthProvider[];
    hasPassword?: boolean;
    oauthProviders?: ReturnType<typeof oauthProvidersFromConfig>;
  } = {},
) {
  return {
    authenticated,
    handle,
    mode,
    identities: extra.identities ?? [],
    hasPassword: extra.hasPassword ?? false,
    oauthProviders: extra.oauthProviders ?? {},
  };
}

function withOptionalToken<T extends Record<string, unknown>>(
  body: T,
  token: string,
  returnToken: boolean | undefined,
): T & { token?: string } {
  if (returnToken) return { ...body, token };
  return body;
}

/**
 * contracts/api.md §Auth as amended by 014.
 */
export function createAuthRoutes(
  deps: AuthRouteDeps,
  rateLimiters: AuthRateLimiters,
  onAccountDeleted?: (handle: string) => void,
): Hono {
  const app = new Hono();

  const oauthConfig: OAuthVerifyConfig =
    deps.mode === "multi"
      ? (deps.oauth ?? { googleClientIds: [], appleClientIds: [] })
      : { googleClientIds: [], appleClientIds: [] };
  const oauthProviders = oauthProvidersFromConfig(
    oauthConfig.googleClientIds,
    oauthConfig.appleClientIds,
  );

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
        return c.json(
          withOptionalToken(
            { handle: account.handle, createdAt: account.createdAt },
            token,
            body.returnToken,
          ),
          201,
        );
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
      const token = resolveSessionToken(c);
      const session = token ? validateSession(accountsDb, token) : null;
      if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");

      if (body.password != null) {
        const ok = await verifyAccountPassword(accountsDb, session.handle, body.password);
        if (!ok) throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);
      } else {
        const provider = body.provider as OAuthProvider;
        const idToken = body.idToken as string;
        try {
          const verified = await verifyIdToken(provider, idToken, oauthConfig, body.nonce);
          const identity = findIdentity(accountsDb, verified.provider, verified.subject);
          if (!identity || identity.handle !== session.handle) {
            throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);
          }
        } catch (cause) {
          if (cause instanceof ApiError) throw cause;
          throw new ApiError("UNAUTHORIZED", AUTH_FAILURE_MESSAGE);
        }
      }

      deleteAllSessionsForHandle(accountsDb, session.handle);
      deleteAccount(accountsDb, session.handle);
      onAccountDeleted?.(session.handle);
      const dbPath = libraryDbPath(dataDir, session.handle);
      for (const suffix of ["", "-wal", "-shm"]) {
        rmSync(`${dbPath}${suffix}`, { force: true });
      }

      deleteCookie(c, SESSION_COOKIE, { path: "/" });
      return c.body(null, 204);
    });

    app.post("/api/auth/oauth/callback", async (c) => {
      if (!rateLimiters.login.consume(clientIp(c))) {
        throw new ApiError("RATE_LIMITED", "too many login attempts");
      }
      const body = oauthCallbackSchema.parse(await c.req.json());
      const ids =
        body.provider === "google" ? oauthConfig.googleClientIds : oauthConfig.appleClientIds;
      if (ids.length === 0) {
        throw new ApiError("VALIDATION_FAILED", `${body.provider} sign-in is not configured`);
      }

      let verified: Awaited<ReturnType<typeof verifyIdToken>>;
      try {
        verified = await verifyIdToken(body.provider, body.idToken, oauthConfig, body.nonce);
      } catch (cause) {
        if (cause instanceof OAuthVerifyError) {
          throw new ApiError("UNAUTHORIZED", cause.message);
        }
        throw cause;
      }

      const existing = findIdentity(accountsDb, verified.provider, verified.subject);
      if (existing) {
        touchLastLogin(accountsDb, existing.handle);
        const { token } = createSession(accountsDb, existing.handle);
        setSessionCookie(c, token);
        return c.json(
          withOptionalToken(
            { status: "authenticated" as const, handle: existing.handle },
            token,
            body.returnToken,
          ),
        );
      }

      const { pendingToken } = createOAuthPending(accountsDb, {
        provider: verified.provider,
        subject: verified.subject,
        email: verified.email,
      });
      return c.json({ status: "needs_handle" as const, pendingToken });
    });

    app.post("/api/auth/oauth/claim", async (c) => {
      if (!rateLimiters.claim.consume(clientIp(c))) {
        throw new ApiError("RATE_LIMITED", "too many claim attempts");
      }
      const body = oauthClaimSchema.parse(await c.req.json());
      const pending = consumeOAuthPending(accountsDb, body.pendingToken);
      if (!pending) throw new ApiError("UNAUTHORIZED", "invalid or expired pending token");

      if (findIdentity(accountsDb, pending.provider, pending.subject)) {
        throw new ApiError("CONFLICT", "identity already linked");
      }

      try {
        const account = createOAuthAccount(accountsDb, body.handle);
        linkIdentity(accountsDb, account.handle, pending.provider, pending.subject, pending.email);
        const { token } = createSession(accountsDb, account.handle);
        setSessionCookie(c, token);
        return c.json(
          withOptionalToken(
            { handle: account.handle, createdAt: account.createdAt },
            token,
            body.returnToken,
          ),
          201,
        );
      } catch (cause) {
        if (cause instanceof AccountError) {
          if (cause.code === "INVALID_HANDLE")
            throw new ApiError("VALIDATION_FAILED", cause.message);
          throw new ApiError("CONFLICT", cause.message);
        }
        if (cause instanceof IdentityError) {
          throw new ApiError("CONFLICT", cause.message);
        }
        throw cause;
      }
    });

    app.post("/api/auth/oauth/link", async (c) => {
      const token = resolveSessionToken(c);
      const session = token ? validateSession(accountsDb, token) : null;
      if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");

      const body = oauthLinkSchema.parse(await c.req.json());
      const ids =
        body.provider === "google" ? oauthConfig.googleClientIds : oauthConfig.appleClientIds;
      if (ids.length === 0) {
        throw new ApiError("VALIDATION_FAILED", `${body.provider} sign-in is not configured`);
      }

      let verified: Awaited<ReturnType<typeof verifyIdToken>>;
      try {
        verified = await verifyIdToken(body.provider, body.idToken, oauthConfig, body.nonce);
      } catch (cause) {
        if (cause instanceof OAuthVerifyError) {
          throw new ApiError("UNAUTHORIZED", cause.message);
        }
        throw cause;
      }

      try {
        linkIdentity(
          accountsDb,
          session.handle,
          verified.provider,
          verified.subject,
          verified.email,
        );
      } catch (cause) {
        if (cause instanceof IdentityError) {
          throw new ApiError("CONFLICT", cause.message);
        }
        throw cause;
      }

      return c.json({ identities: listIdentities(accountsDb, session.handle) });
    });

    app.delete("/api/auth/oauth/link", async (c) => {
      const token = resolveSessionToken(c);
      const session = token ? validateSession(accountsDb, token) : null;
      if (!session) throw new ApiError("UNAUTHORIZED", "authentication required");

      const body = oauthUnlinkSchema.parse(await c.req.json());
      try {
        unlinkIdentity(accountsDb, session.handle, body.provider);
      } catch (cause) {
        if (cause instanceof IdentityError) {
          if (cause.code === "NOT_LINKED") throw new ApiError("NOT_FOUND", cause.message);
          throw new ApiError("CONFLICT", cause.message);
        }
        throw cause;
      }

      return c.json({ identities: listIdentities(accountsDb, session.handle) });
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
      return c.json(withOptionalToken({ handle: body.handle }, token, body.returnToken));
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
    return c.json(withOptionalToken({ handle: null }, token, body.returnToken));
  });

  app.post("/api/auth/logout", (c) => {
    const token = resolveSessionToken(c);
    if (token) {
      if (deps.mode === "multi") deleteSession(deps.accountsDb, token);
      else deps.singleSessions.delete(token);
    }
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  app.get("/api/auth/session", (c) => {
    const token = resolveSessionToken(c);

    if (deps.mode === "multi") {
      const session = token ? validateSession(deps.accountsDb, token) : null;
      if (!session) {
        return c.json(sessionJson(false, null, deps.mode, { oauthProviders }));
      }
      return c.json(
        sessionJson(true, session.handle, deps.mode, {
          identities: listIdentities(deps.accountsDb, session.handle),
          hasPassword: accountHasPassword(deps.accountsDb, session.handle),
          oauthProviders,
        }),
      );
    }

    if (!deps.password) {
      return c.json(sessionJson(true, null, deps.mode));
    }
    const authenticated = token ? deps.singleSessions.validate(token) : false;
    return c.json(sessionJson(authenticated, null, deps.mode));
  });

  return app;
}

export { parseClientIds };
