import { beforeEach, describe, expect, it } from "vitest";
import {
  AccountError,
  createAccount,
  deleteAccount,
  getAccount,
  openAccountsDb,
  touchLastLogin,
  verifyAccountPassword,
} from "./accounts.ts";
import {
  createSession,
  deleteAllSessionsForHandle,
  deleteSession,
  validateSession,
} from "./sessions.ts";

function setup() {
  return openAccountsDb(":memory:");
}

describe("createAccount", () => {
  let db: ReturnType<typeof setup>;
  beforeEach(() => {
    db = setup();
  });

  it("creates an account with a hashed password", async () => {
    const account = await createAccount(db, "xavaneo", "correct horse battery");
    expect(account.handle).toBe("xavaneo");
    expect(account.lastLoginAt).toBeNull();

    const row = db.sqlite
      .prepare("SELECT password_hash FROM accounts WHERE handle = ?")
      .get("xavaneo") as {
      password_hash: string;
    };
    expect(row.password_hash).not.toContain("correct horse battery");
    expect(row.password_hash).toMatch(/^\$argon2id\$/);
  });

  it("rejects a handle that doesn't match the pattern", async () => {
    await expect(createAccount(db, "ab", "password123")).rejects.toMatchObject({
      code: "INVALID_HANDLE",
    });
    await expect(createAccount(db, "Has-Caps", "password123")).rejects.toMatchObject({
      code: "INVALID_HANDLE",
    });
  });

  it("rejects a reserved handle", async () => {
    await expect(createAccount(db, "admin", "password123")).rejects.toBeInstanceOf(AccountError);
    await expect(createAccount(db, "xava", "password123")).rejects.toMatchObject({
      code: "RESERVED",
    });
  });

  it("rejects a handle that's already taken", async () => {
    await createAccount(db, "xavaneo", "password123");
    await expect(createAccount(db, "xavaneo", "another-password")).rejects.toMatchObject({
      code: "TAKEN",
    });
  });
});

describe("verifyAccountPassword", () => {
  it("returns true for the correct password and false otherwise", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "correct horse battery");

    expect(await verifyAccountPassword(db, "xavaneo", "correct horse battery")).toBe(true);
    expect(await verifyAccountPassword(db, "xavaneo", "wrong")).toBe(false);
    expect(await verifyAccountPassword(db, "unknown-handle", "anything")).toBe(false);
  });
});

describe("touchLastLogin / getAccount / deleteAccount", () => {
  it("updates last_login_at and reflects it via getAccount", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    expect(getAccount(db, "xavaneo")?.lastLoginAt).toBeNull();

    touchLastLogin(db, "xavaneo");
    expect(getAccount(db, "xavaneo")?.lastLoginAt).not.toBeNull();
  });

  it("deletes an account and reports whether a row was removed", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    expect(deleteAccount(db, "xavaneo")).toBe(true);
    expect(deleteAccount(db, "xavaneo")).toBe(false);
    expect(getAccount(db, "xavaneo")).toBeNull();
  });
});

describe("sessions", () => {
  it("creates a session and validates it back to the same handle", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");

    const { token, expiresAt } = createSession(db, "xavaneo");
    expect(token.length).toBeGreaterThan(30);

    const session = validateSession(db, token);
    expect(session?.handle).toBe("xavaneo");
    expect(session?.expiresAt).toBe(expiresAt);
  });

  it("returns null for an unknown token", async () => {
    const db = setup();
    expect(validateSession(db, "not-a-real-token")).toBeNull();
  });

  it("slides the expiry forward on each validation", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    const { token, expiresAt: firstExpiry } = createSession(db, "xavaneo");

    await new Promise((resolve) => setTimeout(resolve, 5));
    const session = validateSession(db, token);
    expect(new Date(session?.expiresAt ?? 0).getTime()).toBeGreaterThan(
      new Date(firstExpiry).getTime(),
    );
  });

  it("expires a session past its expires_at and deletes it", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    const { token } = createSession(db, "xavaneo");

    db.sqlite
      .prepare("UPDATE sessions SET expires_at = ? WHERE handle = ?")
      .run(new Date(Date.now() - 1000).toISOString(), "xavaneo");

    expect(validateSession(db, token)).toBeNull();
    const row = db.sqlite.prepare("SELECT 1 FROM sessions WHERE handle = ?").get("xavaneo");
    expect(row).toBeUndefined();
  });

  it("deleteSession removes only the given token", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    const a = createSession(db, "xavaneo");
    const b = createSession(db, "xavaneo");

    deleteSession(db, a.token);
    expect(validateSession(db, a.token)).toBeNull();
    expect(validateSession(db, b.token)?.handle).toBe("xavaneo");
  });

  it("deleteAllSessionsForHandle removes every session for that handle", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    const a = createSession(db, "xavaneo");
    const b = createSession(db, "xavaneo");

    deleteAllSessionsForHandle(db, "xavaneo");
    expect(validateSession(db, a.token)).toBeNull();
    expect(validateSession(db, b.token)).toBeNull();
  });

  it("cascades session deletion when the account row is deleted", async () => {
    const db = setup();
    await createAccount(db, "xavaneo", "password123");
    const { token } = createSession(db, "xavaneo");

    deleteAccount(db, "xavaneo");
    expect(validateSession(db, token)).toBeNull();
  });
});
