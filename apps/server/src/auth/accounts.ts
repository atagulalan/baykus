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

export type OAuthProvider = "google" | "apple";

export interface Identity {
  provider: OAuthProvider;
  subject: string;
  handle: string;
  email: string | null;
  createdAt: string;
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

function migrateAccountsPasswordNullable(sqlite: Database.Database): void {
  const cols = sqlite.prepare("PRAGMA table_info(accounts)").all() as Array<{
    name: string;
    notnull: number;
  }>;
  if (cols.length === 0) return;
  const passwordCol = cols.find((c) => c.name === "password_hash");
  if (!passwordCol || passwordCol.notnull === 0) return;

  // Sessions/identities FK accounts — must disable FKs for the table rebuild.
  sqlite.pragma("foreign_keys = OFF");
  sqlite.exec(`
    BEGIN;
    CREATE TABLE accounts_014 (
      handle TEXT PRIMARY KEY,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    INSERT INTO accounts_014 (handle, password_hash, created_at, last_login_at)
      SELECT handle, password_hash, created_at, last_login_at FROM accounts;
    DROP TABLE accounts;
    ALTER TABLE accounts_014 RENAME TO accounts;
    COMMIT;
  `);
  sqlite.pragma("foreign_keys = ON");
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
      password_hash TEXT,
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
    CREATE TABLE IF NOT EXISTS identities (
      provider TEXT NOT NULL,
      subject TEXT NOT NULL,
      handle TEXT NOT NULL REFERENCES accounts(handle) ON DELETE CASCADE,
      email TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (provider, subject)
    );
    CREATE INDEX IF NOT EXISTS identities_handle_idx ON identities(handle);
    CREATE TABLE IF NOT EXISTS oauth_pending (
      token_hash TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      subject TEXT NOT NULL,
      email TEXT,
      expires_at TEXT NOT NULL
    );
  `);

  migrateAccountsPasswordNullable(sqlite);

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

function assertHandleAvailable(db: AccountsDb, handle: string): void {
  if (!HANDLE_PATTERN.test(handle)) {
    throw new AccountError("INVALID_HANDLE", `handle must match ${HANDLE_PATTERN}`);
  }
  if (isReserved(db, handle)) {
    throw new AccountError("RESERVED", `handle "${handle}" is reserved`);
  }
  if (getAccount(db, handle)) {
    throw new AccountError("TAKEN", `handle "${handle}" is already taken`);
  }
}

export async function createAccount(
  db: AccountsDb,
  handle: string,
  password: string,
): Promise<Account> {
  assertHandleAvailable(db, handle);

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

/** OAuth-only account — password_hash NULL (E114). */
export function createOAuthAccount(db: AccountsDb, handle: string): Account {
  assertHandleAvailable(db, handle);
  const createdAt = new Date().toISOString();

  try {
    db.sqlite
      .prepare("INSERT INTO accounts (handle, password_hash, created_at) VALUES (?, NULL, ?)")
      .run(handle, createdAt);
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

export function accountHasPassword(db: AccountsDb, handle: string): boolean {
  const row = db.sqlite
    .prepare("SELECT password_hash FROM accounts WHERE handle = ?")
    .get(handle) as { password_hash: string | null } | undefined;
  return row?.password_hash != null && row.password_hash.length > 0;
}

export async function verifyAccountPassword(
  db: AccountsDb,
  handle: string,
  password: string,
): Promise<boolean> {
  const row = db.sqlite
    .prepare("SELECT password_hash FROM accounts WHERE handle = ?")
    .get(handle) as { password_hash: string | null } | undefined;
  if (!row?.password_hash) return false;
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

export function listIdentities(db: AccountsDb, handle: string): OAuthProvider[] {
  const rows = db.sqlite
    .prepare("SELECT provider FROM identities WHERE handle = ? ORDER BY provider")
    .all(handle) as Array<{ provider: string }>;
  return rows.map((r) => r.provider as OAuthProvider);
}

export function findIdentity(
  db: AccountsDb,
  provider: OAuthProvider,
  subject: string,
): Identity | null {
  const row = db.sqlite
    .prepare(
      "SELECT provider, subject, handle, email, created_at FROM identities WHERE provider = ? AND subject = ?",
    )
    .get(provider, subject) as
    | {
        provider: OAuthProvider;
        subject: string;
        handle: string;
        email: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    provider: row.provider,
    subject: row.subject,
    handle: row.handle,
    email: row.email,
    createdAt: row.created_at,
  };
}

export type IdentityErrorCode = "ALREADY_LINKED" | "SUBJECT_TAKEN" | "NOT_LINKED" | "LAST_FACTOR";

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;
  constructor(code: IdentityErrorCode, message: string) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
  }
}

export function linkIdentity(
  db: AccountsDb,
  handle: string,
  provider: OAuthProvider,
  subject: string,
  email: string | null,
): void {
  const existingOnHandle = db.sqlite
    .prepare("SELECT 1 FROM identities WHERE handle = ? AND provider = ?")
    .get(handle, provider);
  if (existingOnHandle) {
    throw new IdentityError("ALREADY_LINKED", `${provider} already linked to this account`);
  }

  const existingSubject = findIdentity(db, provider, subject);
  if (existingSubject) {
    throw new IdentityError(
      "SUBJECT_TAKEN",
      `${provider} identity already linked to another account`,
    );
  }

  db.sqlite
    .prepare(
      "INSERT INTO identities (provider, subject, handle, email, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(provider, subject, handle, email, new Date().toISOString());
}

export function unlinkIdentity(db: AccountsDb, handle: string, provider: OAuthProvider): void {
  const row = db.sqlite
    .prepare("SELECT 1 FROM identities WHERE handle = ? AND provider = ?")
    .get(handle, provider);
  if (!row) {
    throw new IdentityError("NOT_LINKED", `${provider} is not linked`);
  }

  const others = listIdentities(db, handle).filter((p) => p !== provider);
  if (others.length === 0 && !accountHasPassword(db, handle)) {
    throw new IdentityError("LAST_FACTOR", "cannot unlink the last sign-in method");
  }

  db.sqlite
    .prepare("DELETE FROM identities WHERE handle = ? AND provider = ?")
    .run(handle, provider);
}
