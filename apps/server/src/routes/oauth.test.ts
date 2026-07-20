import { createLibrary, openLibraryDb } from "@baykus/core";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { openAccountsDb } from "../auth/accounts.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };
const GOOGLE_AUD = "google-web.apps.googleusercontent.com";
const APPLE_AUD = "me.xava.baykus.web";

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("no set-cookie header in response");
  return raw.split(";")[0] ?? "";
}

function tokenFromCookie(cookie: string): string {
  const prefix = "baykus_session=";
  if (!cookie.startsWith(prefix)) throw new Error("unexpected cookie");
  return cookie.slice(prefix.length);
}

describe("oauth + bearer session", () => {
  let googlePrivate: CryptoKey;
  let googleGetKey: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    googlePrivate = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    jwk.kid = "google-test";
    jwk.alg = "RS256";
    jwk.use = "sig";
    googleGetKey = createLocalJWKSet({ keys: [jwk] });
  });

  function setupOAuthMulti() {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const accountsDb = openAccountsDb(":memory:");
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-oauth-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: {
        mode: "multi",
        accountsDb,
        dataDir: "/tmp/baykus-oauth-test",
        oauth: {
          googleClientIds: [GOOGLE_AUD, "google-ios"],
          appleClientIds: [APPLE_AUD],
          googleGetKey,
        },
      },
    });
    return { app, accountsDb };
  }

  async function googleIdToken(sub = "google-sub-1") {
    return new SignJWT({ email: "a@b.co" })
      .setProtectedHeader({ alg: "RS256", kid: "google-test" })
      .setIssuer("https://accounts.google.com")
      .setAudience(GOOGLE_AUD)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(googlePrivate);
  }

  it("GET /api/auth/session exposes oauthProviders when configured", async () => {
    const { app } = setupOAuthMulti();
    const res = await app.request("/api/auth/session");
    expect(await res.json()).toMatchObject({
      authenticated: false,
      handle: null,
      mode: "multi",
      identities: [],
      hasPassword: false,
      oauthProviders: {
        google: { clientId: GOOGLE_AUD },
        apple: { clientId: APPLE_AUD },
      },
    });
  });

  it("oauth callback returns needs_handle then claim creates an OAuth-only account", async () => {
    const { app } = setupOAuthMulti();
    const idToken = await googleIdToken();

    const cb = await app.request("/api/auth/oauth/callback", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ provider: "google", idToken }),
    });
    expect(cb.status).toBe(200);
    const cbBody = (await cb.json()) as { status: string; pendingToken: string };
    expect(cbBody.status).toBe("needs_handle");
    expect(cbBody.pendingToken.length).toBeGreaterThan(20);

    const claim = await app.request("/api/auth/oauth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ pendingToken: cbBody.pendingToken, handle: "oauthuser" }),
    });
    expect(claim.status).toBe(201);
    const cookie = cookieFrom(claim);

    const session = await app.request("/api/auth/session", { headers: { cookie } });
    expect(await session.json()).toMatchObject({
      authenticated: true,
      handle: "oauthuser",
      identities: ["google"],
      hasPassword: false,
    });

    // Password login must fail for OAuth-only accounts
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "oauthuser", password: "anything12" }),
    });
    expect(login.status).toBe(401);
  });

  it("known identity authenticates and returnToken works with Bearer", async () => {
    const { app } = setupOAuthMulti();
    const idToken = await googleIdToken("google-sub-known");

    const first = await app.request("/api/auth/oauth/callback", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ provider: "google", idToken }),
    });
    const { pendingToken } = (await first.json()) as { pendingToken: string };
    await app.request("/api/auth/oauth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ pendingToken, handle: "beareruser" }),
    });

    const again = await app.request("/api/auth/oauth/callback", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        provider: "google",
        idToken: await googleIdToken("google-sub-known"),
        returnToken: true,
      }),
    });
    expect(again.status).toBe(200);
    const body = (await again.json()) as {
      status: string;
      handle: string;
      token: string;
    };
    expect(body).toMatchObject({ status: "authenticated", handle: "beareruser" });
    expect(body.token.length).toBeGreaterThan(20);

    const stats = await app.request("/api/stats", {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(stats.status).toBe(200);

    const mut = await app.request("/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${body.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale: "en" }),
    });
    expect(mut.status).toBe(200);
  });

  it("link / unlink guards the last factor", async () => {
    const { app } = setupOAuthMulti();
    const claimRes = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "linkuser", password: "correct horse battery" }),
    });
    const cookie = cookieFrom(claimRes);

    const idToken = await googleIdToken("google-link-sub");
    const link = await app.request("/api/auth/oauth/link", {
      method: "POST",
      headers: { ...HEADERS, cookie },
      body: JSON.stringify({ provider: "google", idToken }),
    });
    expect(link.status).toBe(200);
    expect(await link.json()).toEqual({ identities: ["google"] });

    const unlink = await app.request("/api/auth/oauth/link", {
      method: "DELETE",
      headers: { ...HEADERS, cookie },
      body: JSON.stringify({ provider: "google" }),
    });
    expect(unlink.status).toBe(200);

    // Re-link, then try to unlink when it would be last factor on OAuth-only
    // (password still present — unlink ok). Create oauth-only via claim path.
    const pending = await app.request("/api/auth/oauth/callback", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        provider: "google",
        idToken: await googleIdToken("google-only-sub"),
      }),
    });
    const { pendingToken } = (await pending.json()) as { pendingToken: string };
    const oauthClaim = await app.request("/api/auth/oauth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ pendingToken, handle: "oauthonly" }),
    });
    const oauthCookie = cookieFrom(oauthClaim);

    const lastUnlink = await app.request("/api/auth/oauth/link", {
      method: "DELETE",
      headers: { ...HEADERS, cookie: oauthCookie },
      body: JSON.stringify({ provider: "google" }),
    });
    expect(lastUnlink.status).toBe(409);
  });

  it("password claim returnToken returns the raw session token", async () => {
    const { app } = setupOAuthMulti();
    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        handle: "tokuser",
        password: "correct horse battery",
        returnToken: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { handle: string; token: string };
    expect(body.token).toBe(tokenFromCookie(cookieFrom(res)));
  });
});

describe("single mode session shape", () => {
  it("includes identities/hasPassword/oauthProviders defaults", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });
    const res = await app.request("/api/auth/session");
    expect(await res.json()).toEqual({
      authenticated: true,
      handle: null,
      mode: "single",
      identities: [],
      hasPassword: false,
      oauthProviders: {},
    });
  });
});
