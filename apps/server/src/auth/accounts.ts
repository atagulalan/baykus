import { hash, verify } from "@node-rs/argon2";
import Database from "better-sqlite3";

export interface AccountsDb {
  sqlite: Database.Database;
}

export interface Account {
  handle: string;
  createdAt: string;
  lastLoginAt: string | null;
}

/** data-model.md §Accounts database — seeded once on first boot. */
const RESERVED_HANDLES = [
  "admin",
  "api",
  "www",
  "img",
  "static",
  "baykus",
  "xava",
  "root",
  "login",
  "claim",
  "settings",
  "assets",
] as const;

export const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

export type AccountErrorCode = "INVALID_HANDLE" | "RESERVED" | "TAKEN";

export class AccountError extends Error {
  readonly code: AccountErrorCode;
  constructor(code: AccountErrorCode, message: string) {
    super(message);
    this.name = "AccountError";
    this.code = code;
  }
}

/** Multi mode only (Article I) — never enters the zip, never seen by packages/core. */
export function openAccountsDb(filePath: string): AccountsDb {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      handle TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      handle TEXT NOT NULL REFERENCES accounts(handle) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_handle_idx ON sessions(handle);
    CREATE TABLE IF NOT EXISTS reserved_handles (
      handle TEXT PRIMARY KEY
    );
  `);

  const seedOne = sqlite.prepare("INSERT OR IGNORE INTO reserved_handles (handle) VALUES (?)");
  const seedAll = sqlite.transaction((handles: readonly string[]) => {
    for (const handle of handles) seedOne.run(handle);
  });
  seedAll(RESERVED_HANDLES);

  return { sqlite };
}

function isReserved(db: AccountsDb, handle: string): boolean {
  return (
    db.sqlite.prepare("SELECT 1 FROM reserved_handles WHERE handle = ?").get(handle) !== undefined
  );
}

export async function createAccount(
  db: AccountsDb,
  handle: string,
  password: string,
): Promise<Account> {
  if (!HANDLE_PATTERN.test(handle)) {
    throw new AccountError("INVALID_HANDLE", `handle must match ${HANDLE_PATTERN}`);
  }
  if (isReserved(db, handle)) {
    throw new AccountError("RESERVED", `handle "${handle}" is reserved`);
  }

  const passwordHash = await hash(password);
  const createdAt = new Date().toISOString();

  try {
    db.sqlite
      .prepare("INSERT INTO accounts (handle, password_hash, created_at) VALUES (?, ?, ?)")
      .run(handle, passwordHash, createdAt);
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("UNIQUE")) {
      throw new AccountError("TAKEN", `handle "${handle}" is already taken`);
    }
    throw cause;
  }

  return { handle, createdAt, lastLoginAt: null };
}

export function getAccount(db: AccountsDb, handle: string): Account | null {
  const row = db.sqlite
    .prepare("SELECT handle, created_at, last_login_at FROM accounts WHERE handle = ?")
    .get(handle) as
    | { handle: string; created_at: string; last_login_at: string | null }
    | undefined;
  if (!row) return null;
  return { handle: row.handle, createdAt: row.created_at, lastLoginAt: row.last_login_at };
}

export async function verifyAccountPassword(
  db: AccountsDb,
  handle: string,
  password: string,
): Promise<boolean> {
  const row = db.sqlite
    .prepare("SELECT password_hash FROM accounts WHERE handle = ?")
    .get(handle) as { password_hash: string } | undefined;
  if (!row) return false;
  return verify(row.password_hash, password);
}

export function touchLastLogin(db: AccountsDb, handle: string): void {
  db.sqlite
    .prepare("UPDATE accounts SET last_login_at = ? WHERE handle = ?")
    .run(new Date().toISOString(), handle);
}

export function deleteAccount(db: AccountsDb, handle: string): boolean {
  return db.sqlite.prepare("DELETE FROM accounts WHERE handle = ?").run(handle).changes > 0;
}
