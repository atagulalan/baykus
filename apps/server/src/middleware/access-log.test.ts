import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AccessLogFields,
  type AccessLogVariables,
  createAccessLogMiddleware,
  formatAccessLogLine,
  isSensitiveKey,
  isValidRequestId,
  redactJson,
} from "./access-log.ts";
import { ApiError, errorHandler } from "./errors.ts";

describe("isValidRequestId", () => {
  it("accepts a UUID", () => {
    expect(isValidRequestId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidRequestId("not-a-uuid")).toBe(false);
    expect(isValidRequestId(undefined)).toBe(false);
  });
});

describe("redactJson", () => {
  it("redacts sensitive keys and truncates long strings", () => {
    expect(isSensitiveKey("password")).toBe(true);
    const out = redactJson(
      { password: "hunter2", title: "ok", note: "x".repeat(20) },
      10,
    ) as Record<string, unknown>;
    expect(out.password).toBe("[Redacted]");
    expect(out.title).toBe("ok");
    expect(String(out.note)).toContain("[truncated");
  });
});

describe("formatAccessLogLine", () => {
  it("emits typed access JSON", () => {
    const fields: AccessLogFields = {
      type: "access",
      ts: "2026-07-20T00:00:00.000Z",
      requestId: "550e8400-e29b-41d4-a716-446655440000",
      method: "GET",
      path: "/api/library",
      query: {},
      status: 200,
      durationMs: 12,
      mode: "single",
      req: { headers: {}, contentType: null, body: null, bodyBytes: null },
      res: { contentType: "application/json", body: { items: [] }, bodyBytes: 12 },
    };
    const parsed = JSON.parse(formatAccessLogLine(fields)) as AccessLogFields;
    expect(parsed.type).toBe("access");
    expect(parsed.durationMs).toBe(12);
  });
});

describe("createAccessLogMiddleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buildApp(opts: { enabled?: boolean; lines?: string[]; clock?: { t: number } } = {}) {
    const lines = opts.lines ?? [];
    const clock = opts.clock ?? { t: 1_000 };
    const app = new Hono<{ Variables: AccessLogVariables }>();
    app.onError(errorHandler);
    app.use(
      "*",
      createAccessLogMiddleware({
        mode: "single",
        enabled: opts.enabled ?? true,
        write: (line) => lines.push(line),
        now: () => {
          const v = clock.t;
          clock.t += 25;
          return v;
        },
      }),
    );
    app.get("/api/health", (c) => c.json({ ok: true }));
    app.get("/api/library", (c) => c.json({ items: [] }));
    app.post("/api/auth/login", async (c) => {
      const body = await c.req.json();
      return c.json({ ok: true, echo: body });
    });
    app.get("/api/boom", () => {
      throw new ApiError("NOT_FOUND", "missing");
    });
    app.get("/api/search", (c) => c.json({ results: [] }));
    return { app, lines };
  }

  function parseLine(lines: string[]): AccessLogFields {
    expect(lines.length).toBeGreaterThan(0);
    const line = lines[0];
    expect(line).toBeDefined();
    return JSON.parse(line as string) as AccessLogFields;
  }

  it("sets X-Request-Id and logs method/path/status/duration/bodies", async () => {
    const { app, lines } = buildApp();
    const res = await app.request("/api/library");
    expect(res.status).toBe(200);
    const requestId = res.headers.get("X-Request-Id");
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(lines).toHaveLength(1);
    const entry = parseLine(lines);
    expect(entry.type).toBe("access");
    expect(entry.requestId).toBe(requestId);
    expect(entry.method).toBe("GET");
    expect(entry.path).toBe("/api/library");
    expect(entry.status).toBe(200);
    expect(entry.durationMs).toBe(25);
    expect(entry.mode).toBe("single");
    expect(entry.res.body).toEqual({ items: [] });
  });

  it("reuses a valid inbound X-Request-Id", async () => {
    const { app, lines } = buildApp();
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const res = await app.request("/api/library", { headers: { "X-Request-Id": id } });
    expect(res.headers.get("X-Request-Id")).toBe(id);
    expect(parseLine(lines).requestId).toBe(id);
  });

  it("logs /api/health too", async () => {
    const { app, lines } = buildApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
    expect(parseLine(lines).path).toBe("/api/health");
  });

  it("logs query string keys (including search q)", async () => {
    const { app, lines } = buildApp();
    await app.request("/api/search?q=pluribus");
    const entry = parseLine(lines);
    expect(entry.path).toBe("/api/search");
    expect(entry.query).toEqual({ q: "pluribus" });
  });

  it("redacts password in request JSON body", async () => {
    const { app, lines } = buildApp();
    await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Baykus": "1" },
      body: JSON.stringify({ handle: "ata", password: "hunter2" }),
    });
    const entry = parseLine(lines);
    expect(entry.req.body).toEqual({ handle: "ata", password: "[Redacted]" });
    expect(JSON.stringify(entry)).not.toContain("hunter2");
  });

  it("marks cookie header as present without value", async () => {
    const { app, lines } = buildApp();
    await app.request("/api/library", { headers: { cookie: "baykus_session=secret" } });
    const entry = parseLine(lines);
    expect(entry.req.headers.cookie).toBe("[Present]");
    expect(JSON.stringify(entry)).not.toContain("baykus_session=secret");
  });

  it("includes errorCode from JSON envelopes", async () => {
    const { app, lines } = buildApp();
    const res = await app.request("/api/boom");
    expect(res.status).toBe(404);
    const entry = parseLine(lines);
    expect(entry.res.errorCode).toBe("NOT_FOUND");
    expect(entry.status).toBe(404);
  });

  it("emits nothing when disabled", async () => {
    const { app, lines } = buildApp({ enabled: false });
    await app.request("/api/library");
    expect(lines).toHaveLength(0);
  });
});
