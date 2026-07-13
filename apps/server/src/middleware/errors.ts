import { isAlreadyInLibraryError } from "@baykus/core";
import { isProviderError } from "@baykus/provider-sdk";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

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

export function errorHandler(err: unknown, c: Context): Response {
  if (err instanceof ApiError) {
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
  if (isProviderError(err)) {
    return c.json(
      envelope("PROVIDER_ERROR", err.message, { provider: err.providerId, code: err.code }),
      STATUS_BY_CODE.PROVIDER_ERROR,
    );
  }

  console.error(err);
  return c.json(envelope("INTERNAL", "internal server error"), STATUS_BY_CODE.INTERNAL);
}
