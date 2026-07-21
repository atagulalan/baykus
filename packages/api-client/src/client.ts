import { getApiBaseUrl, getApiClientOptions, reportApiHttpFailure, trackApi } from "./config.ts";
import { parseSeriesParam } from "./series-path.ts";
import type {
  AddWatchResult,
  ApiErrorEnvelope,
  AuthSession,
  BulkWatchResult,
  BulkWatchTarget,
  CalendarResponse,
  ClaimResult,
  ExternalIds,
  ImportMode,
  ImportZipResult,
  ManualList,
  OAuthCallbackResult,
  OAuthProvider,
  Rating,
  RatingTargetType,
  RefreshCompleteEvent,
  RefreshProgressEvent,
  RefreshResult,
  SearchResponse,
  SeriesDetail,
  SeriesListResponse,
  SeriesPreview,
  SeriesSummary,
  Settings,
  SettingsPatch,
  Stats,
  TvTimeConfirmProgressEvent,
  TvTimeConfirmResult,
  TvTimeImportProgressEvent,
  TvTimeReport,
  WatchCategory,
  WatchHistoryResponse,
} from "./types.ts";

/** DOM PushSubscriptionJSON without pulling in the DOM lib. */
export interface PushSubscriptionJson {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function newRequestId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }
  if (typeof c?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // RFC 4122 version 4
    const b6 = bytes[6] ?? 0;
    const b8 = bytes[8] ?? 0;
    bytes[6] = (b6 & 0x0f) | 0x40;
    bytes[8] = (b8 & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Hermes has no Web Crypto — request ids are correlation only.
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function reportHttpFailure(path: string, status: number, err: unknown, requestId: string): void {
  reportApiHttpFailure({ path, status, err, requestId });
}

function apiUrl(apiPath: string): string {
  // apiPath is either `/library/...` (joined under /api) or already `/api/...`.
  if (apiPath.startsWith("/api/") || apiPath === "/api") {
    return `${getApiBaseUrl()}${apiPath}`;
  }
  return `${getApiBaseUrl()}/api${apiPath}`;
}

async function authHeaders(
  requestId: string,
  opts: { jsonBody?: boolean } = {},
): Promise<Record<string, string>> {
  const { transport, getAccessToken } = getApiClientOptions();
  const headers: Record<string, string> = {
    "X-Request-Id": requestId,
  };
  if (transport === "cookie") {
    // E119: CSRF header required for cookie-authenticated mutations.
    headers["X-Baykus"] = "1";
  } else {
    const token = await getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.jsonBody) headers["content-type"] = "application/json";
  return headers;
}

function fetchCredentials(): RequestCredentials {
  return getApiClientOptions().transport === "cookie" ? "same-origin" : "omit";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestId = newRequestId();
  const hasJsonBody = Boolean(init.body) && !(init.body instanceof FormData);
  const headers = await authHeaders(requestId, { jsonBody: hasJsonBody });

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      credentials: fetchCredentials(),
      headers: { ...headers, ...init.headers },
    });
  } catch (err) {
    reportHttpFailure(path, 0, err, requestId);
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    const err = new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
    reportHttpFailure(path, res.status, err, requestId);
    throw err;
  }

  return body as T;
}

export async function searchSeries(query: string, limit = 10): Promise<SearchResponse> {
  const result = await request<SearchResponse>(
    `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  trackApi("search_submit");
  return result;
}

/** E131: provider details for a search hit; redirects client if already in library. */
export function getSeriesPreview(externalIds: ExternalIds): Promise<SeriesPreview> {
  const query = new URLSearchParams();
  if (externalIds.tmdbId != null) query.set("tmdbId", String(externalIds.tmdbId));
  if (externalIds.tvmazeId != null) query.set("tvmazeId", String(externalIds.tvmazeId));
  if (externalIds.imdbId) query.set("imdbId", externalIds.imdbId);
  if (externalIds.tvdbId != null) query.set("tvdbId", String(externalIds.tvdbId));
  return request<SeriesPreview>(`/search/preview?${query.toString()}`);
}

export async function addSeries(
  externalIds: ExternalIds,
  manualList?: ManualList,
): Promise<SeriesSummary> {
  const result = await request<SeriesSummary>("/library/series", {
    method: "POST",
    body: JSON.stringify({ externalIds, manualList }),
  });
  trackApi("series_add");
  return result;
}

export function listSeries(
  params: {
    category?: WatchCategory;
    sort?: "title" | "added" | "rating" | "nextAir" | "lastWatched";
  } = {},
): Promise<SeriesListResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return request<SeriesListResponse>(`/library/series${qs ? `?${qs}` : ""}`);
}

export function removeSeries(id: number): Promise<void> {
  return request<void>(`/library/series/${id}`, { method: "DELETE" });
}

function getSeries(id: number): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/library/series/${id}`);
}

/** E52: TMDB-parity URL — 404s when no item carries this tmdbId (yet). */
function getSeriesByTmdb(tmdbId: number): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/library/series/by-tmdb/${tmdbId}`);
}

/**
 * E52: resolves a `/series/$id` URL param (`i<internal id>` or a bare TMDB
 * id) to a SeriesDetail — `i`-prefix goes straight to the internal endpoint;
 * a bare number tries TMDB first, falling back to the internal endpoint on
 * 404 (pre-004 bookmarks were bare internal numbers). An invalid param
 * (junk) resolves as not-found, matching an unknown id.
 */
export async function getSeriesByParam(param: string): Promise<SeriesDetail> {
  const parsed = parseSeriesParam(param);
  if (parsed.kind === "internal") return getSeries(parsed.id);
  if (parsed.kind === "tmdb") {
    try {
      return await getSeriesByTmdb(parsed.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") return getSeries(parsed.id);
      throw err;
    }
  }
  throw new ApiError("NOT_FOUND", `invalid series param "${param}"`, 404, null);
}

export function updateSeries(
  id: number,
  patch: {
    manualList?: ManualList | null;
    pushMuted?: boolean;
    note?: string | null;
    favorite?: boolean;
    needsReview?: boolean;
  },
): Promise<SeriesSummary> {
  return request<SeriesSummary>(`/library/series/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function addEpisodeWatch(
  episodeId: number,
  watchedAt?: string,
): Promise<AddWatchResult> {
  const result = await request<AddWatchResult>(`/episodes/${episodeId}/watches`, {
    method: "POST",
    body: JSON.stringify(watchedAt ? { watchedAt } : {}),
  });
  trackApi("watch_add");
  return result;
}

export function removeLatestEpisodeWatch(episodeId: number): Promise<void> {
  return request<void>(`/episodes/${episodeId}/watches/latest`, { method: "DELETE" });
}

export async function bulkWatch(itemId: number, target: BulkWatchTarget): Promise<BulkWatchResult> {
  const result = await request<BulkWatchResult>(`/library/series/${itemId}/watches/bulk`, {
    method: "POST",
    body: JSON.stringify(target),
  });
  trackApi("watch_bulk");
  return result;
}

export function bulkUnwatch(itemId: number, target: BulkWatchTarget): Promise<{ deleted: number }> {
  return request<{ deleted: number }>(`/library/series/${itemId}/watches/bulk`, {
    method: "DELETE",
    body: JSON.stringify(target),
  });
}

export function setRating(
  targetType: RatingTargetType,
  targetId: number,
  value: 1 | 2 | 3,
): Promise<Rating> {
  return request<Rating>("/ratings", {
    method: "PUT",
    body: JSON.stringify({ targetType, targetId, value }),
  });
}

export function clearRating(targetType: RatingTargetType, targetId: number): Promise<void> {
  return request<void>(`/ratings/${targetType}/${targetId}`, { method: "DELETE" });
}

export function getStats(tz?: string): Promise<Stats> {
  return request<Stats>(`/stats${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`);
}

export function getSettings(): Promise<Settings> {
  return request<Settings>("/settings");
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

/**
 * WP4: profile photo upload — multipart, same pattern as importZip() for a
 * non-JSON request body.
 */
export async function uploadAvatar(file: Blob): Promise<Settings> {
  const formData = new FormData();
  formData.append("file", file);
  const requestId = newRequestId();
  const headers = await authHeaders(requestId);

  let res: Response;
  try {
    res = await fetch(apiUrl("/settings/avatar"), {
      method: "POST",
      credentials: fetchCredentials(),
      headers,
      body: formData,
    });
  } catch (err) {
    reportHttpFailure("/settings/avatar", 0, err, requestId);
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    const err = new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
    reportHttpFailure("/settings/avatar", res.status, err, requestId);
    throw err;
  }

  return body as Settings;
}

export function refreshSeries(id: number): Promise<RefreshResult> {
  return request<RefreshResult>(`/library/series/${id}/refresh`, { method: "POST" });
}

/**
 * Reads a `text/event-stream` body (the native EventSource API can't send a
 * POST or the X-Baykus header, so refresh/confirm consume it by hand via
 * fetch + a stream reader) and invokes `onProgress` per `progress` event,
 * resolving with the payload of the trailing `complete` event.
 */
async function readSseStream<TProgress, TComplete>(
  body: ReadableStream<Uint8Array>,
  onProgress: (event: TProgress) => void,
): Promise<TComplete> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete: TComplete | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice("event:".length).trim();
      const data = JSON.parse(dataLine.slice("data:".length).trim());
      if (event === "progress") onProgress(data as TProgress);
      else if (event === "complete") complete = data as TComplete;
    }
  }

  if (!complete) {
    throw new ApiError("INTERNAL", "stream ended without a complete event", 200, null);
  }
  return complete;
}

/** contracts/api.md — POST /api/library/refresh streams progress via SSE. */
export async function refreshAllSeries(
  onProgress: (event: RefreshProgressEvent) => void,
  staleOnly?: boolean,
): Promise<RefreshCompleteEvent> {
  const path = staleOnly ? "/library/refresh?staleOnly=1" : "/library/refresh";
  const requestId = newRequestId();
  const headers = await authHeaders(requestId);
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: "POST",
      credentials: fetchCredentials(),
      headers,
    });
  } catch (err) {
    reportHttpFailure("/library/refresh", 0, err, requestId);
    throw err;
  }
  if (!res.ok || !res.body) {
    const err = new ApiError("INTERNAL", "refresh stream failed", res.status, null);
    reportHttpFailure("/library/refresh", res.status, err, requestId);
    throw err;
  }
  return readSseStream<RefreshProgressEvent, RefreshCompleteEvent>(res.body, onProgress);
}

export function getCalendar(
  params: { from?: string; to?: string } = {},
): Promise<CalendarResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();
  return request<CalendarResponse>(`/calendar${qs ? `?${qs}` : ""}`);
}

export function getWatchHistory(params?: {
  limit?: number;
  order?: "newest" | "oldest";
}): Promise<WatchHistoryResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.order && params.order !== "newest") query.set("order", params.order);
  const qs = query.toString();
  return request<WatchHistoryResponse>(`/watches/history${qs ? `?${qs}` : ""}`);
}

export function exportZipUrl(includeSecrets = false): string {
  return apiUrl(`/export.zip${includeSecrets ? "?includeSecrets=1" : ""}`);
}

/**
 * Multipart upload — bypasses request()'s JSON-only content-type handling,
 * same pattern as refreshAllSeries() for a non-JSON request body.
 */
export async function importZip(file: Blob, mode?: ImportMode): Promise<ImportZipResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (mode) formData.append("mode", mode);
  const requestId = newRequestId();
  const headers = await authHeaders(requestId);

  let res: Response;
  try {
    res = await fetch(apiUrl("/import"), {
      method: "POST",
      credentials: fetchCredentials(),
      headers,
      body: formData,
    });
  } catch (err) {
    reportHttpFailure("/import", 0, err, requestId);
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    const err = new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
    reportHttpFailure("/import", res.status, err, requestId);
    throw err;
  }

  trackApi("import_zip");
  return body as ImportZipResult;
}

export function getAuthSession(): Promise<AuthSession> {
  return request<AuthSession>("/auth/session");
}

export function login(payload: {
  handle?: string;
  password: string;
  returnToken?: boolean;
}): Promise<{ handle: string | null; token?: string }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function claim(payload: {
  handle: string;
  password: string;
  returnToken?: boolean;
}): Promise<ClaimResult> {
  return request<ClaimResult>("/auth/claim", { method: "POST", body: JSON.stringify(payload) });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export function deleteAccount(payload: {
  password?: string;
  provider?: OAuthProvider;
  idToken?: string;
  nonce?: string;
}): Promise<void> {
  return request<void>("/auth/account", { method: "DELETE", body: JSON.stringify(payload) });
}

export function oauthCallback(payload: {
  provider: OAuthProvider;
  idToken: string;
  nonce?: string;
  returnToken?: boolean;
}): Promise<OAuthCallbackResult> {
  return request<OAuthCallbackResult>("/auth/oauth/callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function oauthClaim(payload: {
  pendingToken: string;
  handle: string;
  returnToken?: boolean;
}): Promise<ClaimResult> {
  return request<ClaimResult>("/auth/oauth/claim", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function oauthLink(payload: {
  provider: OAuthProvider;
  idToken: string;
  nonce?: string;
}): Promise<{ identities: OAuthProvider[] }> {
  return request("/auth/oauth/link", { method: "POST", body: JSON.stringify(payload) });
}

export function oauthUnlink(provider: OAuthProvider): Promise<{ identities: OAuthProvider[] }> {
  return request("/auth/oauth/link", {
    method: "DELETE",
    body: JSON.stringify({ provider }),
  });
}

/** Danger zone: irreversibly wipes every series/watch/rating/setting in the library. */
export function resetLibrary(): Promise<void> {
  return request<void>("/library", {
    method: "DELETE",
    body: JSON.stringify({ confirm: "DELETE" }),
  });
}

/** contracts/api.md §tvtime — streams matching-phase progress via SSE, same pattern as confirm. */
export async function importTvTime(
  file: Blob,
  onProgress: (event: TvTimeImportProgressEvent) => void,
): Promise<TvTimeReport> {
  const formData = new FormData();
  formData.append("file", file);
  const requestId = newRequestId();
  const headers = await authHeaders(requestId);

  let res: Response;
  try {
    res = await fetch(apiUrl("/import/tvtime"), {
      method: "POST",
      credentials: fetchCredentials(),
      headers,
      body: formData,
    });
  } catch (err) {
    reportHttpFailure("/import/tvtime", 0, err, requestId);
    throw err;
  }

  if (!res.ok || !res.body) {
    const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
    const body: unknown = isJson ? await res.json() : undefined;
    const envelope = body as ApiErrorEnvelope | undefined;
    const err = new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
    reportHttpFailure("/import/tvtime", res.status, err, requestId);
    throw err;
  }

  const report = await readSseStream<TvTimeImportProgressEvent, TvTimeReport>(res.body, onProgress);
  trackApi("import_tvtime");
  return report;
}

export async function confirmTvTimeImport(
  reportId: string,
  resolutions: { name: string; externalIds: ExternalIds }[],
  onProgress: (event: TvTimeConfirmProgressEvent) => void,
): Promise<TvTimeConfirmResult> {
  const requestId = newRequestId();
  const headers = await authHeaders(requestId, { jsonBody: true });
  let res: Response;
  try {
    res = await fetch(apiUrl("/import/tvtime/confirm"), {
      method: "POST",
      credentials: fetchCredentials(),
      headers,
      body: JSON.stringify({ reportId, resolutions }),
    });
  } catch (err) {
    reportHttpFailure("/import/tvtime/confirm", 0, err, requestId);
    throw err;
  }

  if (!res.ok || !res.body) {
    const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
    const body: unknown = isJson ? await res.json() : undefined;
    const envelope = body as ApiErrorEnvelope | undefined;
    const err = new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
    reportHttpFailure("/import/tvtime/confirm", res.status, err, requestId);
    throw err;
  }

  return readSseStream<TvTimeConfirmProgressEvent, TvTimeConfirmResult>(res.body, onProgress);
}

export function getVapidPublicKey(): Promise<{ key: string }> {
  return request<{ key: string }>("/push/vapid-public-key");
}

export function subscribePush(subscription: PushSubscriptionJson): Promise<void> {
  return request<void>("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });
}

export function unsubscribePush(endpoint: string): Promise<void> {
  return request<void>("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}

export function sendTestPush(endpoint: string): Promise<void> {
  return request<void>("/push/test", { method: "POST", body: JSON.stringify({ endpoint }) });
}
