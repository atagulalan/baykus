import { createLibrary, openLibraryDb } from "@baykus/core";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { openAccountsDb } from "../auth/accounts.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("no set-cookie header in response");
  return raw.split(";")[0] ?? "";
}

function setupSingle(password: string | undefined) {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password, singleSessions: createSingleSessionStore() },
  });
  return { app };
}

function setupMulti() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "multi", accountsDb: openAccountsDb(":memory:"), dataDir: "/tmp/baykus-test" },
  });
  return { app };
}

describe("single mode — no password configured", () => {
  it("GET /api/auth/session reports authenticated without logging in", async () => {
    const { app } = setupSingle(undefined);
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

  it("does not gate protected routes", async () => {
    const { app } = setupSingle(undefined);
    const res = await app.request("/api/stats");
    expect(res.status).toBe(200);
  });
});

describe("single mode — password configured", () => {
  it("rejects protected routes without a session", async () => {
    const { app } = setupSingle("hunter2");
    const res = await app.request("/api/stats");
    expect(res.status).toBe(401);
  });

  it("exempts /api/health and /api/auth/* and /img/*", async () => {
    const { app } = setupSingle("hunter2");
    expect((await app.request("/api/health")).status).toBe(200);
    expect((await app.request("/api/auth/session")).status).toBe(200);
    expect((await app.request("/img/tvmaze/thumb/x")).status).not.toBe(401);
  });

  it("logs in with the correct password, then reaches protected routes", async () => {
    const { app } = setupSingle("hunter2");
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ password: "hunter2" }),
    });
    expect(loginRes.status).toBe(200);
    expect(await loginRes.json()).toEqual({ handle: null });
    const cookie = cookieFrom(loginRes);

    const statsRes = await app.request("/api/stats", { headers: { cookie } });
    expect(statsRes.status).toBe(200);

    const sessionRes = await app.request("/api/auth/session", { headers: { cookie } });
    expect(await sessionRes.json()).toEqual({
      authenticated: true,
      handle: null,
      mode: "single",
      identities: [],
      hasPassword: false,
      oauthProviders: {},
    });
  });

  it("401s with a uniform message on a wrong password", async () => {
    const { app } = setupSingle("hunter2");
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ password: "wrong" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("invalid handle or password");
  });

  it("logout invalidates the session", async () => {
    const { app } = setupSingle("hunter2");
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ password: "hunter2" }),
    });
    const cookie = cookieFrom(loginRes);

    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { ...HEADERS, cookie },
    });
    expect(logoutRes.status).toBe(204);

    const statsRes = await app.request("/api/stats", { headers: { cookie } });
    expect(statsRes.status).toBe(401);
  });
});

describe("multi mode — claim / login / logout / session", () => {
  it("claims a handle, sets a session cookie, and can log in again", async () => {
    const { app } = setupMulti();
    const claimRes = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });
    expect(claimRes.status).toBe(201);
    const claimBody = (await claimRes.json()) as { handle: string; createdAt: string };
    expect(claimBody.handle).toBe("xavaneo");
    const cookie = cookieFrom(claimRes);

    const sessionRes = await app.request("/api/auth/session", { headers: { cookie } });
    expect(await sessionRes.json()).toEqual({
      authenticated: true,
      handle: "xavaneo",
      mode: "multi",
      identities: [],
      hasPassword: true,
      oauthProviders: {},
    });

    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });
    expect(loginRes.status).toBe(200);
    expect(await loginRes.json()).toEqual({ handle: "xavaneo" });
  });

  it("rejects a reserved or already-taken handle with 409", async () => {
    const { app } = setupMulti();
    const reserved = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "admin", password: "correct horse battery" }),
    });
    expect(reserved.status).toBe(409);

    await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });
    const taken = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "another password" }),
    });
    expect(taken.status).toBe(409);
  });

  it("rejects a malformed handle with 400", async () => {
    const { app } = setupMulti();
    const res = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "AB", password: "correct horse battery" }),
    });
    expect(res.status).toBe(400);
  });

  it("401s uniformly for both an unknown handle and a wrong password", async () => {
    const { app } = setupMulti();
    await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });

    const unknown = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "nobody", password: "whatever" }),
    });
    const wrongPassword = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "whatever" }),
    });
    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    const unknownBody = (await unknown.json()) as { error: { message: string } };
    const wrongBody = (await wrongPassword.json()) as { error: { message: string } };
    expect(unknownBody.error.message).toBe(wrongBody.error.message);
  });

  it("isolates two handles: each only sees its own session", async () => {
    const { app } = setupMulti();
    const a = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "handle-a", password: "correct horse battery" }),
    });
    const b = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "handle-b", password: "correct horse battery" }),
    });
    const cookieA = cookieFrom(a);
    const cookieB = cookieFrom(b);

    const sessionA = await app.request("/api/auth/session", { headers: { cookie: cookieA } });
    const sessionB = await app.request("/api/auth/session", { headers: { cookie: cookieB } });
    expect((await sessionA.json()) as { handle: string }).toMatchObject({ handle: "handle-a" });
    expect((await sessionB.json()) as { handle: string }).toMatchObject({ handle: "handle-b" });
  });

  it("logout invalidates the session", async () => {
    const { app } = setupMulti();
    const claimRes = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });
    const cookie = cookieFrom(claimRes);

    await app.request("/api/auth/logout", { method: "POST", headers: { ...HEADERS, cookie } });
    const sessionRes = await app.request("/api/auth/session", { headers: { cookie } });
    expect(await sessionRes.json()).toEqual({
      authenticated: false,
      handle: null,
      mode: "multi",
      identities: [],
      hasPassword: false,
      oauthProviders: {},
    });
  });

  it("DELETE /api/auth/account requires re-auth and removes the account", async () => {
    const { app } = setupMulti();
    const claimRes = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "xavaneo", password: "correct horse battery" }),
    });
    const cookie = cookieFrom(claimRes);

    const wrongPassword = await app.request("/api/auth/account", {
      method: "DELETE",
      headers: { ...HEADERS, cookie },
      body: JSON.stringify({ password: "wrong" }),
    });
    expect(wrongPassword.status).toBe(401);

    const deleteRes = await app.request("/api/auth/account", {
      method: "DELETE",
      headers: { ...HEADERS, cookie },
      body: JSON.stringify({ password: "correct horse battery" }),
    });
    expect(deleteRes.status).toBe(204);

    const sessionRes = await app.request("/api/auth/session", { headers: { cookie } });
    expect(await sessionRes.json()).toEqual({
      authenticated: false,
      handle: null,
      mode: "multi",
      identities: [],
      hasPassword: false,
      oauthProviders: {},
    });
  });
});

describe("rate limiting", () => {
  it("429s after 5 claim attempts per minute", async () => {
    const { app } = setupMulti();
    for (let i = 0; i < 5; i++) {
      const res = await app.request("/api/auth/claim", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ handle: `handle-${i}`, password: "correct horse battery" }),
      });
      expect(res.status).toBe(201);
    }
    const sixth = await app.request("/api/auth/claim", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "handle-5", password: "correct horse battery" }),
    });
    expect(sixth.status).toBe(429);
  });

  it("429s after 10 login attempts per minute", async () => {
    const { app } = setupMulti();
    for (let i = 0; i < 10; i++) {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ handle: "nobody", password: "whatever" }),
      });
      expect(res.status).toBe(401);
    }
    const eleventh = await app.request("/api/auth/login", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ handle: "nobody", password: "whatever" }),
    });
    expect(eleventh.status).toBe(429);
  });
});
