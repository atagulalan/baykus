import { ProviderError } from "./errors.ts";
import type { RateLimiter } from "./rate-limit.ts";

export interface FetchJsonOptions {
  providerId: string;
  limiter?: RateLimiter;
  /** Extra attempts after the first, on NETWORK-class failures. Default 2. */
  retries?: number;
  /** Per-attempt timeout in ms. Default 10000. */
  timeoutMs?: number;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 10_000;

function backoffMs(attempt: number): number {
  return 200 * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches and parses JSON, mapping HTTP/network failures to a typed ProviderError. */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit,
  opts: FetchJsonOptions,
): Promise<T> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; ; attempt++) {
    if (opts.limiter) await opts.limiter.acquire();

    let res: Response;
    try {
      res = await fetchWithTimeout(url, init, timeoutMs);
    } catch (cause) {
      if (attempt < retries) {
        await sleep(backoffMs(attempt + 1));
        continue;
      }
      throw new ProviderError(opts.providerId, "NETWORK", `${url} → ${String(cause)}`, { cause });
    }

    if (res.status === 404) {
      throw new ProviderError(opts.providerId, "NOT_FOUND", `${url} → 404`);
    }
    if (res.status === 429) {
      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
      throw new ProviderError(
        opts.providerId,
        "RATE_LIMITED",
        `${url} → 429`,
        retryAfterMs === undefined ? undefined : { retryAfterMs },
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError(opts.providerId, "AUTH_FAILED", `${url} → ${res.status}`);
    }
    if (!res.ok) {
      if (attempt < retries) {
        await sleep(backoffMs(attempt + 1));
        continue;
      }
      throw new ProviderError(opts.providerId, "NETWORK", `${url} → ${res.status}`);
    }

    try {
      return (await res.json()) as T;
    } catch (cause) {
      throw new ProviderError(opts.providerId, "PARSE_FAILED", `${url} → invalid JSON`, { cause });
    }
  }
}
