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
  Rating,
  RatingTargetType,
  RefreshCompleteEvent,
  RefreshProgressEvent,
  RefreshResult,
  SearchResponse,
  SeriesDetail,
  SeriesListResponse,
  SeriesSummary,
  Settings,
  SettingsPatch,
  Stats,
  TrackingStatus,
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

export function addSeries(
  externalIds: ExternalIds,
  status: TrackingStatus,
): Promise<SeriesSummary> {
  return request<SeriesSummary>("/library/series", {
    method: "POST",
    body: JSON.stringify({ externalIds, status }),
  });
}

export function listSeries(
  params: { status?: TrackingStatus; sort?: "title" | "added" | "rating" | "nextAir" } = {},
): Promise<SeriesListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return request<SeriesListResponse>(`/library/series${qs ? `?${qs}` : ""}`);
}

export function removeSeries(id: number): Promise<void> {
  return request<void>(`/library/series/${id}`, { method: "DELETE" });
}

export function getSeries(id: number): Promise<SeriesDetail> {
  return request<SeriesDetail>(`/library/series/${id}`);
}

export function updateSeries(
  id: number,
  patch: { status?: TrackingStatus; pushMuted?: boolean; note?: string | null },
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

export function getStats(): Promise<Stats> {
  return request<Stats>("/stats");
}

export function getSettings(): Promise<Settings> {
  return request<Settings>("/settings");
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

export function refreshSeries(id: number): Promise<RefreshResult> {
  return request<RefreshResult>(`/library/series/${id}/refresh`, { method: "POST" });
}

/**
 * The server's global refresh is a POST (contracts/api.md) guarded by the
 * X-Baykus header — the native EventSource API can't send either, so this
 * consumes the same text/event-stream body by hand via fetch + a stream reader.
 */
export async function refreshAllSeries(
  onProgress: (event: RefreshProgressEvent) => void,
): Promise<RefreshCompleteEvent> {
  const res = await fetch("/api/library/refresh", { method: "POST", headers: { "X-Baykus": "1" } });
  if (!res.ok || !res.body) {
    throw new ApiError("INTERNAL", "refresh stream failed", res.status, null);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete: RefreshCompleteEvent | null = null;

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
      if (event === "progress") onProgress(data as RefreshProgressEvent);
      else if (event === "complete") complete = data as RefreshCompleteEvent;
    }
  }

  if (!complete) {
    throw new ApiError("INTERNAL", "refresh stream ended without a complete event", 200, null);
  }
  return complete;
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

export function getVapidPublicKey(): Promise<{ key: string }> {
  return request<{ key: string }>("/push/vapid-public-key");
}

export function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  return request<void>("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) });
}

export function unsubscribePush(endpoint: string): Promise<void> {
  return request<void>("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}
