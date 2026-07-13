import type {
  ApiErrorEnvelope,
  ExternalIds,
  SearchResponse,
  SeriesListResponse,
  SeriesSummary,
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
  params: { status?: TrackingStatus; sort?: string } = {},
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
