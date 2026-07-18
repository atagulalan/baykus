import { parseSeriesParam } from "../lib/seriesPath.ts";
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Baykus": "1" };
  if (init.body) headers["content-type"] = "application/json";

  const res = await fetch(`/api${path}`, { ...init, headers: { ...headers, ...init.headers } });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    throw new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
  }

  return body as T;
}

export function searchSeries(query: string, limit = 10): Promise<SearchResponse> {
  return request<SearchResponse>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
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

export function addSeries(
  externalIds: ExternalIds,
  manualList?: ManualList,
): Promise<SeriesSummary> {
  return request<SeriesSummary>("/library/series", {
    method: "POST",
    body: JSON.stringify({ externalIds, manualList }),
  });
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

export function addEpisodeWatch(episodeId: number, watchedAt?: string): Promise<AddWatchResult> {
  return request<AddWatchResult>(`/episodes/${episodeId}/watches`, {
    method: "POST",
    body: JSON.stringify(watchedAt ? { watchedAt } : {}),
  });
}

export function removeLatestEpisodeWatch(episodeId: number): Promise<void> {
  return request<void>(`/episodes/${episodeId}/watches/latest`, { method: "DELETE" });
}

export function bulkWatch(itemId: number, target: BulkWatchTarget): Promise<BulkWatchResult> {
  return request<BulkWatchResult>(`/library/series/${itemId}/watches/bulk`, {
    method: "POST",
    body: JSON.stringify(target),
  });
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
export async function uploadAvatar(file: File): Promise<Settings> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/settings/avatar", {
    method: "POST",
    headers: { "X-Baykus": "1" },
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    throw new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
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
  const url = staleOnly ? "/api/library/refresh?staleOnly=1" : "/api/library/refresh";
  const res = await fetch(url, { method: "POST", headers: { "X-Baykus": "1" } });
  if (!res.ok || !res.body) {
    throw new ApiError("INTERNAL", "refresh stream failed", res.status, null);
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
  return `/api/export.zip${includeSecrets ? "?includeSecrets=1" : ""}`;
}

/**
 * Multipart upload — bypasses request()'s JSON-only content-type handling,
 * same pattern as refreshAllSeries() for a non-JSON request body.
 */
export async function importZip(file: File, mode?: ImportMode): Promise<ImportZipResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (mode) formData.append("mode", mode);

  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "X-Baykus": "1" },
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const envelope = body as ApiErrorEnvelope | undefined;
    throw new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
  }

  return body as ImportZipResult;
}

export function getAuthSession(): Promise<AuthSession> {
  return request<AuthSession>("/auth/session");
}

export function login(payload: {
  handle?: string;
  password: string;
}): Promise<{ handle: string | null }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function claim(payload: { handle: string; password: string }): Promise<ClaimResult> {
  return request<ClaimResult>("/auth/claim", { method: "POST", body: JSON.stringify(payload) });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export function deleteAccount(password: string): Promise<void> {
  return request<void>("/auth/account", { method: "DELETE", body: JSON.stringify({ password }) });
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
  file: File,
  onProgress: (event: TvTimeImportProgressEvent) => void,
): Promise<TvTimeReport> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/import/tvtime", {
    method: "POST",
    headers: { "X-Baykus": "1" },
    body: formData,
  });

  if (!res.ok || !res.body) {
    const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
    const body: unknown = isJson ? await res.json() : undefined;
    const envelope = body as ApiErrorEnvelope | undefined;
    throw new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
  }

  return readSseStream<TvTimeImportProgressEvent, TvTimeReport>(res.body, onProgress);
}

export async function confirmTvTimeImport(
  reportId: string,
  resolutions: { name: string; externalIds: ExternalIds }[],
  onProgress: (event: TvTimeConfirmProgressEvent) => void,
): Promise<TvTimeConfirmResult> {
  const res = await fetch("/api/import/tvtime/confirm", {
    method: "POST",
    headers: { "X-Baykus": "1", "content-type": "application/json" },
    body: JSON.stringify({ reportId, resolutions }),
  });

  if (!res.ok || !res.body) {
    const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
    const body: unknown = isJson ? await res.json() : undefined;
    const envelope = body as ApiErrorEnvelope | undefined;
    throw new ApiError(
      envelope?.error.code ?? "INTERNAL",
      envelope?.error.message ?? res.statusText,
      res.status,
      envelope?.error.details ?? null,
    );
  }

  return readSseStream<TvTimeConfirmProgressEvent, TvTimeConfirmResult>(res.body, onProgress);
}

export function getVapidPublicKey(): Promise<{ key: string }> {
  return request<{ key: string }>("/push/vapid-public-key");
}

export function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  return request<void>("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });
}

export function unsubscribePush(endpoint: string): Promise<void> {
  return request<void>("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}

export function sendTestPush(endpoint: string): Promise<void> {
  return request<void>("/push/test", { method: "POST", body: JSON.stringify({ endpoint }) });
}
