import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isProviderError } from "./errors.ts";
import { fetchJson } from "./http.ts";

function jsonResponse(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

describe("fetchJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));
    const result = await fetchJson("https://x.test/a", {}, { providerId: "test" });
    expect(result).toEqual({ ok: true });
  });

  it("maps 404 to NOT_FOUND", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(fetchJson("https://x.test/a", {}, { providerId: "test" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      providerId: "test",
    });
  });

  it("maps 429 to RATE_LIMITED, honoring Retry-After", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { "retry-after": "5" } }),
    );
    await expect(fetchJson("https://x.test/a", {}, { providerId: "test" })).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfterMs: 5000,
    });
  });

  it("maps 401/403 to AUTH_FAILED", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(fetchJson("https://x.test/a", {}, { providerId: "test" })).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });

  it("maps invalid JSON body to PARSE_FAILED", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json", { status: 200 }));
    const promise = fetchJson("https://x.test/a", {}, { providerId: "test" });
    await expect(promise).rejects.toMatchObject({ code: "PARSE_FAILED" });
  });

  it("retries on 5xx with backoff, then succeeds", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const promise = fetchJson("https://x.test/a", {}, { providerId: "test" });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives up as NETWORK after exhausting retries", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    const promise = fetchJson("https://x.test/a", {}, { providerId: "test", retries: 2 });
    const assertion = expect(promise).rejects.toMatchObject({ code: "NETWORK" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("maps a rejected fetch (network error) to NETWORK after retries", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("network down"));

    const promise = fetchJson("https://x.test/a", {}, { providerId: "test", retries: 1 });
    const assertion = expect(promise).rejects.toMatchObject({ code: "NETWORK" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("acquires a limiter token before each attempt", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));
    const acquire = vi.fn().mockResolvedValue(undefined);
    await fetchJson("https://x.test/a", {}, { providerId: "test", limiter: { acquire } });
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it("rejections are ProviderError instances", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    try {
      await fetchJson("https://x.test/a", {}, { providerId: "test" });
      throw new Error("expected fetchJson to throw");
    } catch (e) {
      expect(isProviderError(e)).toBe(true);
    }
  });
});
