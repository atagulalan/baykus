import type {
  ContentRating,
  EpisodeDetails,
  EpisodeType,
  ExternalIds,
  GenreInfo,
  ImageRef,
  ImageSize,
  NetworkInfo,
  ReleaseStatus,
  SearchResult,
  SeasonDetails,
  SeriesDetails,
  WatchProviderInfo,
  WatchProviderType,
} from "@baykus/provider-sdk";

export interface TmdbSearchResult {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbNetwork {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

export interface TmdbSeasonSummary {
  season_number: number;
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
  tvdb_id?: number | null;
}

export interface TmdbContentRating {
  iso_3166_1: string;
  rating: string;
}

export interface TmdbSeriesDetails {
  id: number;
  name: string;
  original_name?: string;
  tagline?: string;
  overview?: string;
  status?: string;
  first_air_date?: string;
  last_air_date?: string;
  origin_country?: string[];
  original_language?: string;
  episode_run_time?: number[];
  networks?: TmdbNetwork[];
  genres?: TmdbGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  seasons?: TmdbSeasonSummary[];
  external_ids?: TmdbExternalIds;
  content_ratings?: { results: TmdbContentRating[] };
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbEpisode {
  season_number: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
  episode_type?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbSeasonDetails {
  season_number: number;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  air_date?: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbWatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbWatchProvidersRegion {
  link?: string;
  flatrate?: TmdbWatchProviderEntry[];
  rent?: TmdbWatchProviderEntry[];
  buy?: TmdbWatchProviderEntry[];
  ads?: TmdbWatchProviderEntry[];
  free?: TmdbWatchProviderEntry[];
}

export interface TmdbWatchProvidersResponse {
  results: Record<string, TmdbWatchProvidersRegion>;
}

export function toImageRef(path?: string | null): ImageRef | undefined {
  return path ? `tmdb:${path}` : undefined;
}

const SIZE_BUCKETS: Record<ImageSize, string> = {
  thumb: "w185",
  medium: "w342",
  large: "w780",
  original: "original",
};

export function resolveTmdbImageUrl(ref: ImageRef, size: ImageSize): string {
  const path = ref.slice(ref.indexOf(":") + 1);
  return `https://image.tmdb.org/t/p/${SIZE_BUCKETS[size]}${path}`;
}

function yearOf(dateStr?: string | null): number | undefined {
  if (!dateStr) return undefined;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

export function mapSearchResults(response: TmdbSearchResponse): SearchResult[] {
  return response.results.map((r) => {
    const result: SearchResult = {
      providerId: "tmdb",
      mediaType: "series",
      externalIds: { tmdbId: r.id },
      title: r.name,
    };
    if (r.original_name && r.original_name !== r.name) result.originalTitle = r.original_name;
    if (r.overview) result.overview = r.overview;
    const posterRef = toImageRef(r.poster_path);
    if (posterRef) result.posterRef = posterRef;
    const year = yearOf(r.first_air_date);
    if (year) result.year = year;
    return result;
  });
}

function mapExternalIds(details: TmdbSeriesDetails): ExternalIds {
  const ids: ExternalIds = { tmdbId: details.id };
  if (details.external_ids?.imdb_id) ids.imdbId = details.external_ids.imdb_id;
  if (details.external_ids?.tvdb_id != null) ids.tvdbId = details.external_ids.tvdb_id;
  return ids;
}

function mapContentRatings(details: TmdbSeriesDetails): ContentRating[] {
  const results = details.content_ratings?.results ?? [];
  return results
    .filter((r) => r.rating)
    .map((r): ContentRating => ({ region: r.iso_3166_1, rating: r.rating }));
}

const RELEASE_STATUS: Record<string, ReleaseStatus> = {
  "Returning Series": "returning",
  Ended: "ended",
  Canceled: "canceled",
  "In Production": "in_production",
  Planned: "planned",
  Pilot: "pilot",
};

/** TMDB's documented episode_type vocabulary; season/series finale both collapse to "finale". */
function mapEpisodeType(type?: string): EpisodeType | undefined {
  if (type === "mid_season") return "mid_season";
  if (type === "finale" || type === "season_finale" || type === "series_finale") return "finale";
  if (type === "standard") return "standard";
  return undefined;
}

function mapEpisode(ep: TmdbEpisode): EpisodeDetails {
  const episode: EpisodeDetails = {
    seasonNumber: ep.season_number,
    episodeNumber: ep.episode_number,
  };
  if (ep.name) episode.title = ep.name;
  if (ep.overview) episode.overview = ep.overview;
  if (ep.air_date) episode.airDate = ep.air_date;
  if (typeof ep.runtime === "number") episode.runtimeMin = ep.runtime;
  const stillRef = toImageRef(ep.still_path);
  if (stillRef) episode.stillRef = stillRef;
  const episodeType = mapEpisodeType(ep.episode_type);
  if (episodeType) episode.episodeType = episodeType;
  if (typeof ep.vote_average === "number" && ep.vote_count) {
    episode.externalRatings = [
      {
        source: "tmdb",
        value: ep.vote_average,
        scale: 10,
        votes: ep.vote_count,
        fetchedAt: new Date().toISOString(),
      },
    ];
  }
  return episode;
}

function mapSeason(season: TmdbSeasonDetails): SeasonDetails {
  const out: SeasonDetails = {
    number: season.season_number,
    episodes: season.episodes.map(mapEpisode),
  };
  if (season.name) out.name = season.name;
  if (season.overview) out.overview = season.overview;
  const posterRef = toImageRef(season.poster_path);
  if (posterRef) out.posterRef = posterRef;
  if (season.air_date) out.airDate = season.air_date;
  return out;
}

export function mapSeriesDetails(
  details: TmdbSeriesDetails,
  seasons: TmdbSeasonDetails[],
): SeriesDetails {
  const out: SeriesDetails = {
    providerId: "tmdb",
    mediaType: "series",
    externalIds: mapExternalIds(details),
    title: details.name,
    seasons: seasons.map(mapSeason),
  };
  if (details.original_name && details.original_name !== details.name) {
    out.originalTitle = details.original_name;
  }
  if (details.tagline) out.tagline = details.tagline;
  if (details.overview) out.overview = details.overview;
  const releaseStatus = details.status ? RELEASE_STATUS[details.status] : undefined;
  if (releaseStatus) out.releaseStatus = releaseStatus;
  if (details.first_air_date) out.firstAirDate = details.first_air_date;
  if (details.last_air_date) out.lastAirDate = details.last_air_date;
  if (details.origin_country && details.origin_country.length > 0)
    out.originCountry = details.origin_country;
  if (details.original_language) out.originalLanguage = details.original_language;
  if (details.episode_run_time && details.episode_run_time.length > 0) {
    out.episodeRunTimes = details.episode_run_time;
  }
  if (details.networks && details.networks.length > 0) {
    out.networks = details.networks.map((n): NetworkInfo => {
      const info: NetworkInfo = { id: n.id, name: n.name };
      const logoRef = toImageRef(n.logo_path);
      if (logoRef) info.logoRef = logoRef;
      if (n.origin_country) info.originCountry = n.origin_country;
      return info;
    });
  }
  if (details.genres && details.genres.length > 0) {
    out.genres = details.genres.map((g): GenreInfo => ({ id: g.id, name: g.name }));
  }
  const contentRatings = mapContentRatings(details);
  if (contentRatings.length > 0) out.contentRatings = contentRatings;
  const posterRef = toImageRef(details.poster_path);
  if (posterRef) out.posterRef = posterRef;
  const backdropRef = toImageRef(details.backdrop_path);
  if (backdropRef) out.backdropRef = backdropRef;
  return out;
}

type WatchProviderListKey = "flatrate" | "rent" | "buy" | "ads" | "free";

const WATCH_PROVIDER_TYPE_KEYS: { key: WatchProviderListKey; type: WatchProviderType }[] = [
  { key: "flatrate", type: "flatrate" },
  { key: "rent", type: "rent" },
  { key: "buy", type: "buy" },
  { key: "ads", type: "ads" },
  { key: "free", type: "free" },
];

export function mapWatchProviders(
  response: TmdbWatchProvidersResponse,
  region: string,
): WatchProviderInfo[] {
  const regionData = response.results[region];
  if (!regionData) return [];

  const out: WatchProviderInfo[] = [];
  for (const { key, type } of WATCH_PROVIDER_TYPE_KEYS) {
    const entries = regionData[key];
    if (!entries) continue;
    for (const entry of entries) {
      const info: WatchProviderInfo = {
        provider: entry.provider_name,
        providerId: entry.provider_id,
        type,
        region,
      };
      const logoRef = toImageRef(entry.logo_path);
      if (logoRef) info.logoRef = logoRef;
      out.push(info);
    }
  }
  return out;
}
