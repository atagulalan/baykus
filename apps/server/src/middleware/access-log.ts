import { randomUUID } from "node:crypto";
import type { Context, MiddlewareHandler, Next } from "hono";

/** Hono variables set by access-log middleware (E191). */
export type AccessLogVariables = {
  requestId: string;
};

type AccessLogEnv = { Variables: AccessLogVariables };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Key names (case-insensitive) whose values are always redacted. */
const SENSITIVE_KEY_RE =
  /^(password|passwd|pwd|token|secret|authorization|cookie|set-cookie|api[_-]?key|tmdb|vapid|private[_-]?key|id[_-]?token|access[_-]?token|refresh[_-]?token|session|nonce|client[_-]?secret)$/i;

const SAFE_REQ_HEADERS = [
  "content-type",
  "content-length",
  "accept",
  "user-agent",
  "x-baykus",
  "x-request-id",
  "origin",
  "referer",
] as const;

export const DEFAULT_BODY_MAX = 4_096;

export function isValidRequestId(value: string | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export interface AccessLogFields {
  type: "access";
  ts: string;
  requestId: string;
  method: string;
  path: string;
  query: Record<string, string>;
  status: number;
  durationMs: number;
  mode: "single" | "multi";
  req: {
    headers: Record<string, string>;
    contentType: string | null;
    body: unknown;
    bodyBytes: number | null;
  };
  res: {
    contentType: string | null;
    body: unknown;
    bodyBytes: number | null;
    errorCode?: string;
  };
}

export function formatAccessLogLine(fields: AccessLogFields): string {
  return JSON.stringify(fields);
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

/** Deep-redact sensitive keys; truncate strings/arrays for log size. */
export function redactJson(value: unknown, maxChars: number, depth = 0): unknown {
  if (depth > 8) return "[MaxDepth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}…[truncated ${value.length} chars]`;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out = value.slice(0, 50).map((item) => redactJson(item, maxChars, depth + 1));
    if (value.length > 50) out.push(`[+${value.length - 50} more]`);
    return out;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[Redacted]" : redactJson(child, maxChars, depth + 1);
    }
    return out;
  }
  return String(value);
}

function collectQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = isSensitiveKey(key)
      ? "[Redacted]"
      : value.length > 200
        ? `${value.slice(0, 200)}…[truncated]`
        : value;
  }
  return query;
}

function collectReqHeaders(c: Context): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of SAFE_REQ_HEADERS) {
    const value = c.req.header(name);
    if (value) headers[name] = value;
  }
  // Presence flags only — never values (E193).
  if (c.req.header("cookie")) headers.cookie = "[Present]";
  if (c.req.header("authorization")) headers.authorization = "[Present]";
  return headers;
}

async function readRequestBody(
  c: Context,
  maxChars: number,
): Promise<{ body: unknown; bodyBytes: number | null }> {
  const contentType = c.req.header("content-type") ?? "";
  const contentLength = c.req.header("content-length");
  const bodyBytes = contentLength != null ? Number(contentLength) : null;

  if (c.req.method === "GET" || c.req.method === "HEAD") {
    return { body: null, bodyBytes };
  }

  if (contentType.includes("multipart/form-data")) {
    return {
      body: { _multipart: true, note: "binary/form fields omitted" },
      bodyBytes,
    };
  }

  if (
    contentType.includes("application/zip") ||
    contentType.includes("application/octet-stream")
  ) {
    return { body: { _binary: true, contentType }, bodyBytes };
  }

  if (!contentType.includes("application/json") && !contentType.includes("text/")) {
    return { body: contentType ? { _omitted: true, contentType } : null, bodyBytes };
  }

  try {
    const text = await c.req.raw.clone().text();
    const bytes = bodyBytes ?? new TextEncoder().encode(text).byteLength;
    if (!text) return { body: null, bodyBytes: bytes };
    if (contentType.includes("application/json")) {
      try {
        return { body: redactJson(JSON.parse(text), maxChars), bodyBytes: bytes };
      } catch {
        return {
          body: redactJson(text, maxChars),
          bodyBytes: bytes,
        };
      }
    }
    return { body: redactJson(text, maxChars), bodyBytes: bytes };
  } catch {
    return { body: { _readError: true }, bodyBytes };
  }
}

async function readResponseBody(
  res: Response,
  maxChars: number,
): Promise<{ body: unknown; bodyBytes: number | null; errorCode?: string }> {
  const contentType = res.headers.get("content-type") ?? "";
  const contentLength = res.headers.get("content-length");
  const bodyBytes = contentLength != null ? Number(contentLength) : null;

  if (
    contentType.includes("image/") ||
    contentType.includes("application/zip") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("text/event-stream")
  ) {
    return {
      body: { _streamOrBinary: true, contentType: contentType || null },
      bodyBytes,
    };
  }

  if (!contentType.includes("application/json") && !contentType.includes("text/")) {
    return { body: contentType ? { _omitted: true, contentType } : null, bodyBytes };
  }

  try {
    const text = await res.clone().text();
    const bytes = bodyBytes ?? new TextEncoder().encode(text).byteLength;
    if (!text) return { body: null, bodyBytes: bytes };

    if (contentType.includes("application/json")) {
      try {
        const parsed: unknown = JSON.parse(text);
        let errorCode: string | undefined;
        if (
          parsed &&
          typeof parsed === "object" &&
          "error" in parsed &&
          parsed.error &&
          typeof parsed.error === "object" &&
          "code" in parsed.error &&
          typeof parsed.error.code === "string"
        ) {
          errorCode = parsed.error.code;
        }
        return { body: redactJson(parsed, maxChars), bodyBytes: bytes, errorCode };
      } catch {
        return { body: redactJson(text, maxChars), bodyBytes: bytes };
      }
    }
    return { body: redactJson(text, maxChars), bodyBytes: bytes };
  } catch {
    return { body: { _readError: true }, bodyBytes };
  }
}

export interface AccessLogOptions {
  mode: "single" | "multi";
  enabled: boolean;
  /** Max chars per string field in redacted JSON bodies. */
  bodyMaxChars?: number;
  /**
   * Paths that still get X-Request-Id but never emit a log line.
   * Empty by default — all endpoints are logged (E195 amended).
   */
  skipPaths?: ReadonlySet<string>;
  write?: (line: string) => void;
  now?: () => number;
}

/**
 * Detailed access log for every endpoint (E192 amended): query, safe headers,
 * redacted JSON bodies, status, duration. Never cookies/passwords/tokens (E193).
 */
export function createAccessLogMiddleware(opts: AccessLogOptions): MiddlewareHandler<AccessLogEnv> {
  const skipPaths = opts.skipPaths ?? new Set<string>();
  const bodyMaxChars = opts.bodyMaxChars ?? DEFAULT_BODY_MAX;
  const write = opts.write ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = opts.now ?? (() => Date.now());

  return async (c: Context<AccessLogEnv>, next: Next) => {
    const inbound = c.req.header("X-Request-Id");
    const requestId = isValidRequestId(inbound) ? inbound : randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);

    const url = new URL(c.req.url);
    const query = collectQuery(url);
    const reqHeaders = collectReqHeaders(c);
    const reqCaptured = opts.enabled ? await readRequestBody(c, bodyMaxChars) : null;

    const started = now();
    await next();

    if (!opts.enabled || skipPaths.has(c.req.path)) return;

    const status = c.res.status;
    const resCaptured = await readResponseBody(c.res, bodyMaxChars);
    const fields: AccessLogFields = {
      type: "access",
      ts: new Date(started).toISOString(),
      requestId,
      method: c.req.method,
      path: c.req.path,
      query,
      status,
      durationMs: Math.max(0, now() - started),
      mode: opts.mode,
      req: {
        headers: reqHeaders,
        contentType: c.req.header("content-type") ?? null,
        body: reqCaptured?.body ?? null,
        bodyBytes: reqCaptured?.bodyBytes ?? null,
      },
      res: {
        contentType: c.res.headers.get("content-type"),
        body: resCaptured.body,
        bodyBytes: resCaptured.bodyBytes,
        ...(resCaptured.errorCode ? { errorCode: resCaptured.errorCode } : {}),
      },
    };
    write(formatAccessLogLine(fields));
  };
}
