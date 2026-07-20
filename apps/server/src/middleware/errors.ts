import { isAlreadyInLibraryError, isManualListConflictError } from "@baykus/core";
import { isProviderError } from "@baykus/provider-sdk";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { captureServerException } from "../observability/sentry.ts";
import type { AccessLogVariables } from "./access-log.ts";

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_SCHEMA"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ApiErrorCode, ContentfulStatusCode> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_SCHEMA: 422,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  INTERNAL: 500,
};

/** Thrown by route handlers to produce a specific envelope/status pair. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(code: ApiErrorCode, message: string, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

function envelope(code: ApiErrorCode, message: string, details: unknown = null) {
  return { error: { code, message, details } };
}

type ErrorContext = Context<{ Variables: AccessLogVariables }>;

function requestIdOf(c: ErrorContext): string | undefined {
  try {
    return c.get("requestId");
  } catch {
    return undefined;
  }
}

export function errorHandler(err: unknown, c: ErrorContext): Response {
  if (err instanceof ApiError) {
    // Explicit INTERNAL from handlers still reports; other ApiError codes are client-facing.
    if (err.code === "INTERNAL") {
      const requestId = requestIdOf(c);
      captureServerException(err, {
        ...(requestId ? { requestId } : {}),
        path: c.req.path,
      });
    }
    return c.json(envelope(err.code, err.message, err.details), STATUS_BY_CODE[err.code]);
  }
  if (err instanceof z.ZodError) {
    return c.json(
      envelope("VALIDATION_FAILED", "request validation failed", z.flattenError(err)),
      STATUS_BY_CODE.VALIDATION_FAILED,
    );
  }
  if (isAlreadyInLibraryError(err)) {
    return c.json(
      envelope("CONFLICT", err.message, { itemId: err.itemId }),
      STATUS_BY_CODE.CONFLICT,
    );
  }
  if (isManualListConflictError(err)) {
    return c.json(
      envelope("CONFLICT", "finished series cannot be stopped", { itemId: err.itemId }),
      STATUS_BY_CODE.CONFLICT,
    );
  }
  if (isProviderError(err)) {
    return c.json(
      envelope("PROVIDER_ERROR", err.message, { provider: err.providerId, code: err.code }),
      STATUS_BY_CODE.PROVIDER_ERROR,
    );
  }

  const requestId = requestIdOf(c);
  captureServerException(err, {
    ...(requestId ? { requestId } : {}),
    path: c.req.path,
  });
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      requestId: requestId ?? null,
      path: c.req.path,
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  return c.json(envelope("INTERNAL", "internal server error"), STATUS_BY_CODE.INTERNAL);
}
