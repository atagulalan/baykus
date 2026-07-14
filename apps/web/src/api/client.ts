import type {
  AddWatchResult,
  ApiErrorEnvelope,
  BulkWatchResult,
  BulkWatchTarget,
  ExternalIds,
  Rating,
  RatingTargetType,
  SearchResponse,
  SeriesDetail,
  SeriesListResponse,
  SeriesSummary,
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
