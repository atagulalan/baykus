export type ProviderErrorCode =
  /** The referenced item does not exist at the provider. */
  | "NOT_FOUND"
  /** Provider rate limit hit; retryAfterMs is set when known. */
  | "RATE_LIMITED"
  /** Missing/invalid API key. */
  | "AUTH_FAILED"
  /** Network-level failure (DNS, timeout, 5xx). Retryable. */
  | "NETWORK"
  /** Response arrived but could not be mapped (schema drift, scraper breakage). */
  | "PARSE_FAILED"
  /** The provider does not support the requested capability. */
  | "UNSUPPORTED";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly providerId: string;
  readonly retryAfterMs: number | undefined;

  constructor(
    providerId: string,
    code: ProviderErrorCode,
    message: string,
    opts?: { retryAfterMs?: number; cause?: unknown },
  ) {
    super(`[${providerId}] ${code}: ${message}`, { cause: opts?.cause });
    this.name = "ProviderError";
    this.providerId = providerId;
    this.code = code;
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

export function isProviderError(e: unknown): e is ProviderError {
  return e instanceof ProviderError;
}
