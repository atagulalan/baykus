/**
 * Runtime configuration for the shared HTTP client.
 * Call `configureApiClient` once at app startup (web: cookie; native: bearer).
 */

export type ApiTransport = "cookie" | "bearer";

export type ApiTrackEvent =
  | "search_submit"
  | "series_add"
  | "watch_add"
  | "watch_bulk"
  | "import_zip"
  | "import_tvtime"
  | (string & {});

export interface ApiHttpFailureInfo {
  path: string;
  status: number;
  err: unknown;
  requestId: string;
}

export interface ApiClientOptions {
  /**
   * API origin with no trailing slash (e.g. `https://baykus.xava.me`).
   * Empty string = same-origin relative URLs (`/api/...`, `/img/...`).
   */
  baseUrl?: string;
  transport: ApiTransport;
  /** Used when `transport` is `"bearer"` (014 E118). */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Optional product analytics (web wires Sentry/telemetry `track`). */
  onTrack?: (event: ApiTrackEvent) => void;
  /** Optional failure reporting (web wires breadcrumbs + Sentry). */
  onHttpFailure?: (info: ApiHttpFailureInfo) => void;
}

const defaultOptions: Required<Pick<ApiClientOptions, "baseUrl" | "transport">> & ApiClientOptions =
  {
    baseUrl: "",
    transport: "cookie",
  };

let options: ApiClientOptions = { ...defaultOptions };

export function configureApiClient(next: ApiClientOptions): void {
  const configured: ApiClientOptions = {
    baseUrl: next.baseUrl ?? "",
    transport: next.transport,
  };
  if (next.getAccessToken !== undefined) configured.getAccessToken = next.getAccessToken;
  if (next.onTrack !== undefined) configured.onTrack = next.onTrack;
  if (next.onHttpFailure !== undefined) configured.onHttpFailure = next.onHttpFailure;
  options = configured;
}

export function getApiClientOptions(): Readonly<ApiClientOptions> {
  return options;
}

/** Strip trailing slash from configured origin. */
export function getApiBaseUrl(): string {
  return (options.baseUrl ?? "").replace(/\/$/, "");
}

export function trackApi(event: ApiTrackEvent): void {
  options.onTrack?.(event);
}

export function reportApiHttpFailure(info: ApiHttpFailureInfo): void {
  options.onHttpFailure?.(info);
}
