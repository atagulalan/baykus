import * as Sentry from "@sentry/node";
import type { Config } from "../config.ts";

let initialized = false;

type ScrubableEvent = {
  request?: {
    headers?: Record<string, string>;
  };
};

/** Scrub cookie / auth-like request headers before send (E193). */
function scrubEvent<T extends ScrubableEvent>(event: T): T | null {
  const headers = event.request?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (
        lower === "cookie" ||
        lower === "authorization" ||
        lower === "set-cookie" ||
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("secret")
      ) {
        headers[key] = "[Filtered]";
      }
    }
  }
  return event;
}

/**
 * Init Sentry only when SENTRY_DSN is set (E189/E190). Safe to call with
 * unset DSN — no-op, zero network.
 */
export function initSentry(config: Config): void {
  if (initialized || !config.SENTRY_DSN) return;
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.SENTRY_ENVIRONMENT ?? config.BAYKUS_MODE,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/** Capture unexpected / INTERNAL errors only (E194). No-op when DSN unset. */
export function captureServerException(
  err: unknown,
  context?: { requestId?: string; mode?: string; path?: string },
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("requestId", context.requestId);
    if (context?.mode) scope.setTag("mode", context.mode);
    if (context?.path) scope.setTag("route", context.path);
    Sentry.captureException(err);
  });
}
