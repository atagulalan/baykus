import type {
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
} from "@baykus/provider-sdk";

export interface TvmazeNetwork {
  id?: number;
  name: string;
  country?: { code?: string | null } | null;
}

export interface TvmazeImage {
  medium?: string | null;
  original?: string | null;
}

/** Entry from the show's `images` collection (embed[]=images) — carries the wide `background` art. */
export interface TvmazeImageEntry {
  type?: string | null;
  main?: boolean;
  resolutions?: {
    original?: { url?: string | null } | null;
    medium?: { url?: string | null } | null;
  } | null;
}

export interface TvmazeEpisode {
  season: number;
  number: number;
  name?: string | null;
  type?: string | null;
  airdate?: string | null;
  airstamp?: string | null;
  runtime?: number | null;
  summary?: string | null;
  image?: TvmazeImage | null;
}

/** Entry from the show's `seasons` collection (embed[]=seasons). */
export interface TvmazeSeason {
  number: number;
  name?: string | null;
  premiereDate?: string | null;
  endDate?: string | null;
  summary?: string | null;
  image?: TvmazeImage | null;
  episodeOrder?: number | null;
}

export interface TvmazeShow {
  id: number;
  name: string;
  status?: string | null;
  premiered?: string | null;
  ended?: string | null;
  genres?: string[];
  summary?: string | null;
  network?: TvmazeNetwork | null;
  webChannel?: TvmazeNetwork | null;
  image?: TvmazeImage | null;
  averageRuntime?: number | null;
  externals?: { imdb?: string | null; thetvdb?: number | null } | null;
  _embedded?: {
    episodes?: TvmazeEpisode[];
    images?: TvmazeImageEntry[];
    seasons?: TvmazeSeason[];
  };
}

export interface TvmazeSearchEntry {
  score?: number;
  show: TvmazeShow;
}

function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : undefined;
}

/** TVmaze `image.medium`/`original` differ only in a size-bucket path segment. */
const TVMAZE_MEDIUM_SEGMENT = /medium_(portrait|landscape)/;

function toImageRef(image?: TvmazeImage | null): ImageRef | undefined {
  const path = image?.medium ?? image?.original;
  return path ? `tvmaze:${path}` : undefined;
}

/** Picks the wide `background` art from the show's images collection (main first). */
function toBackdropRef(images?: TvmazeImageEntry[]): ImageRef | undefined {
  if (!images) return undefined;
  const backgrounds = images.filter((img) => img.type === "background");
  if (backgrounds.length === 0) return undefined;
  const chosen = backgrounds.find((img) => img.main) ?? backgrounds[0];
  const url = chosen?.resolutions?.original?.url ?? chosen?.resolutions?.medium?.url;
  return url ? `tvmaze:${url}` : undefined;
}

/** `medium` requests return the stored path as-is; every other size falls back to `original`. */
export function resolveTvmazeImageUrl(ref: ImageRef, size: ImageSize): string {
  const path = ref.slice(ref.indexOf(":") + 1);
  if (size === "medium") return path;
  return path.replace(TVMAZE_MEDIUM_SEGMENT, "original_untouched");
}

function toExternalIds(show: TvmazeShow): ExternalIds {
  const ids: ExternalIds = { tvmazeId: show.id };
  if (show.externals?.imdb) ids.imdbId = show.externals.imdb;
  if (show.externals?.thetvdb != null) ids.tvdbId = show.externals.thetvdb;
  return ids;
}

const RELEASE_STATUS: Record<string, ReleaseStatus> = {
  Running: "returning",
  Ended: "ended",
  "To Be Determined": "planned",
  "In Development": "planned",
};

function yearOf(dateStr?: string | null): number | undefined {
  if (!dateStr) return undefined;
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

export function mapSearchResults(entries: TvmazeSearchEntry[]): SearchResult[] {
  const topScore = entries[0]?.score ?? 1;
  return entries.map(({ show, score }) => {
    const result: SearchResult = {
      providerId: "tvmaze",
      mediaType: "series",
      externalIds: toExternalIds(show),
      title: show.name,
    };
    const overview = stripHtml(show.summary);
    if (overview) result.overview = overview;
    const posterRef = toImageRef(show.image);
    if (posterRef) result.posterRef = posterRef;
    const year = yearOf(show.premiered);
    if (year) result.year = year;
    const network = show.network?.name ?? show.webChannel?.name;
    if (network) result.network = network;
    if (typeof score === "number" && topScore > 0) {
      result.score = Math.max(0, Math.min(1, score / topScore));
    }
    return result;
  });
}

function mapEpisodeType(type?: string | null): EpisodeType | undefined {
  return type === "regular" ? "standard" : undefined;
}

function mapEpisode(ep: TvmazeEpisode): EpisodeDetails {
  const episode: EpisodeDetails = {
    seasonNumber: ep.season,
    episodeNumber: ep.number,
  };
  if (ep.name) episode.title = ep.name;
  const overview = stripHtml(ep.summary);
  if (overview) episode.overview = overview;
  if (ep.airdate) episode.airDate = ep.airdate;
  if (ep.airstamp) episode.airStamp = ep.airstamp;
  if (typeof ep.runtime === "number") episode.runtimeMin = ep.runtime;
  const stillRef = toImageRef(ep.image);
  if (stillRef) episode.stillRef = stillRef;
  const episodeType = mapEpisodeType(ep.type);
  if (episodeType) episode.episodeType = episodeType;
  return episode;
}

function mapSeasonMeta(season: TvmazeSeason, episodes: EpisodeDetails[]): SeasonDetails {
  const out: SeasonDetails = { number: season.number, episodes };
  if (season.name) out.name = season.name;
  const overview = stripHtml(season.summary);
  if (overview) out.overview = overview;
  if (season.premiereDate) out.airDate = season.premiereDate;
  const posterRef = toImageRef(season.image);
  if (posterRef) out.posterRef = posterRef;
  return out;
}

/**
 * Union of confirmed season inventory (`embed[]=seasons`) and episode-derived
 * seasons. Confirmed seasons with no episodes yet survive as `episodes: []`.
 */
function mergeSeasons(
  seasonMetas: TvmazeSeason[] | undefined,
  episodes: TvmazeEpisode[],
): SeasonDetails[] {
  const episodesBySeason = new Map<number, EpisodeDetails[]>();
  for (const ep of episodes) {
    const list = episodesBySeason.get(ep.season) ?? [];
    list.push(mapEpisode(ep));
    episodesBySeason.set(ep.season, list);
  }

  const byNumber = new Map<number, SeasonDetails>();
  if (seasonMetas) {
    for (const meta of seasonMetas) {
      byNumber.set(meta.number, mapSeasonMeta(meta, episodesBySeason.get(meta.number) ?? []));
    }
  }
  for (const [number, eps] of episodesBySeason) {
    if (!byNumber.has(number)) {
      byNumber.set(number, { number, episodes: eps });
    }
  }

  return [...byNumber.entries()].sort(([a], [b]) => a - b).map(([, season]) => season);
}

export function mapSeriesDetails(show: TvmazeShow): SeriesDetails {
  const details: SeriesDetails = {
    providerId: "tvmaze",
    mediaType: "series",
    externalIds: toExternalIds(show),
    title: show.name,
    seasons: mergeSeasons(show._embedded?.seasons, show._embedded?.episodes ?? []),
  };
  const overview = stripHtml(show.summary);
  if (overview) details.overview = overview;
  const posterRef = toImageRef(show.image);
  if (posterRef) details.posterRef = posterRef;
  const backdropRef = toBackdropRef(show._embedded?.images);
  if (backdropRef) details.backdropRef = backdropRef;
  const releaseStatus = show.status ? RELEASE_STATUS[show.status] : undefined;
  if (releaseStatus) details.releaseStatus = releaseStatus;
  if (show.premiered) details.firstAirDate = show.premiered;
  if (show.ended) details.lastAirDate = show.ended;
  const originCountry = show.network?.country?.code ?? show.webChannel?.country?.code;
  if (originCountry) details.originCountry = [originCountry];
  if (typeof show.averageRuntime === "number") details.episodeRunTimes = [show.averageRuntime];
  const network = show.network?.name ?? show.webChannel?.name;
  if (network) {
    const info: NetworkInfo = { name: network };
    if (show.network?.id != null) info.id = show.network.id;
    if (originCountry) info.originCountry = originCountry;
    details.networks = [info];
  }
  if (show.genres && show.genres.length > 0) {
    details.genres = show.genres.map((name): GenreInfo => ({ name }));
  }
  return details;
}
