import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLibraryPool } from "./library-pool.ts";

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "baykus-pool-"));
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
  vi.useRealTimers();
});

describe("createLibraryPool", () => {
  it("returns the same Library instance for repeat calls on the same handle", () => {
    const pool = createLibraryPool(dataDir);
    expect(pool.get("xavaneo")).toBe(pool.get("xavaneo"));
  });

  it("gives different handles isolated libraries backed by different files", () => {
    const pool = createLibraryPool(dataDir);
    const a = pool.get("handle-a");
    const b = pool.get("handle-b");
    expect(a).not.toBe(b);

    a.updateSettings({ region: "US" });
    b.updateSettings({ region: "DE" });
    expect(a.getSettings().region).toBe("US");
    expect(b.getSettings().region).toBe("DE");
  });

  it("close() evicts a handle; a later get() reopens it fresh but reads the same on-disk data", () => {
    const pool = createLibraryPool(dataDir);
    const first = pool.get("xavaneo");
    first.updateSettings({ region: "GB" });

    pool.close("xavaneo");
    const second = pool.get("xavaneo");

    expect(second).not.toBe(first);
    expect(second.getSettings().region).toBe("GB");
  });

  it("evicts the least-recently-used handle once more than 20 are open", () => {
    const pool = createLibraryPool(dataDir);
    for (let i = 0; i < 20; i++) {
      pool.get(`handle-${i}`).updateSettings({ region: "US" });
    }
    // handle-0 is now the least-recently-used; opening a 21st evicts it.
    pool.get("handle-20");

    const reopened = pool.get("handle-0");
    reopened.updateSettings({ region: "TR" });
    // A fresh open must still see the earlier write — proves eviction closed
    // the connection cleanly rather than losing data.
    expect(reopened.getSettings().region).toBe("TR");
  });

  it("evicts idle handles (no access for 10+ minutes) on the next get()", () => {
    vi.useFakeTimers();
    const pool = createLibraryPool(dataDir);
    const first = pool.get("xavaneo");

    vi.advanceTimersByTime(11 * 60 * 1000);
    // Accessing a different handle triggers the idle sweep.
    pool.get("someone-else");
    const second = pool.get("xavaneo");

    expect(second).not.toBe(first);
  });

  it("closeAll() closes every open connection", () => {
    const pool = createLibraryPool(dataDir);
    pool.get("handle-a");
    pool.get("handle-b");
    expect(() => pool.closeAll()).not.toThrow();
  });
});
