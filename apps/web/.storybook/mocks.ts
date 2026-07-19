import type {
  AuthSession,
  CalendarDay,
  CalendarEntry,
  EpisodeSummary,
  SearchResult,
  SeasonSummary,
  SeriesDetail,
  SeriesSummary,
  Settings,
  Stats,
} from "../src/api/types.ts";

export const noop = (): void => {};

export const mockItemCount: Record<
  | "needs_review"
  | "watching"
  | "not_watched_recently"
  | "not_started"
  | "watch_later"
  | "up_to_date"
  | "finished"
  | "stopped",
  number
> = {
  needs_review: 2,
  watching: 5,
  not_watched_recently: 3,
  not_started: 1,
  watch_later: 4,
  up_to_date: 6,
  finished: 10,
  stopped: 2,
};

export const mockStats: Stats = {
  episodesWatched: 842,
  watchTimeMin: 37_890,
  itemCount: mockItemCount,
  episodesPerMonth: [
    { month: "2026-01", count: 42 },
    { month: "2026-02", count: 38 },
    { month: "2026-03", count: 55 },
    { month: "2026-04", count: 48 },
    { month: "2026-05", count: 62 },
    { month: "2026-06", count: 71 },
  ],
  ratingDistribution: { "1": 12, "2": 45, "3": 210 },
  mostRewatched: [
    {
      itemId: 1,
      itemTitle: "Breaking Bad",
      episodeId: 62,
      s: 5,
      e: 16,
      episodeTitle: "Felina",
      watchCount: 3,
    },
  ],
  seriesCount: 47,
  favoritesCount: 8,
  datedWatches: { dated: 800, total: 842 },
  recent: {
    last7Days: { episodes: 12, watchTimeMin: 540 },
    last30Days: { episodes: 48, watchTimeMin: 2160 },
    thisMonth: { episodes: 22, watchTimeMin: 990 },
  },
  mostWatchedByTime: [
    { itemId: 1, title: "Breaking Bad", watchTimeMin: 4200 },
    { itemId: 2, title: "The Wire", watchTimeMin: 3800 },
    { itemId: 3, title: "Severance", watchTimeMin: 2100 },
  ],
  favoriteProgress: [
    { itemId: 1, title: "Breaking Bad", watchedEpisodes: 42, airedEpisodes: 62 },
    { itemId: 2, title: "The Wire", watchedEpisodes: 55, airedEpisodes: 60 },
  ],
  production: {
    ongoing: 12,
    ended: 35,
    ongoingItems: [{ itemId: 3, title: "Severance", watchedEpisodes: 18, airedEpisodes: 20 }],
  },
  genreDistribution: {
    top: [
      { name: "Drama", episodes: 420 },
      { name: "Crime", episodes: 280 },
      { name: "Comedy", episodes: 150 },
    ],
    other: 95,
  },
  networkDistribution: {
    networkCount: 15,
    top: [
      { name: "HBO", episodes: 180 },
      { name: "AMC", episodes: 120 },
      { name: "Netflix", episodes: 95 },
    ],
    other: 40,
  },
  backlog: {
    episodes: 156,
    seriesCount: 8,
    watchTimeMin: 7020,
    topSeries: [
      { itemId: 4, title: "The Bear", episodes: 28 },
      { itemId: 5, title: "Shōgun", episodes: 10 },
    ],
  },
  pace: { episodesPerWeek: 4.2, projectedWeeks: 19 },
  upcoming: {
    months: [
      { month: "2026-07", episodes: 12, watchTimeMin: 540 },
      { month: "2026-08", episodes: 18, watchTimeMin: 810 },
    ],
  },
  binges: [
    { itemId: 1, title: "Breaking Bad", date: "2026-06-15", episodes: 8 },
    { itemId: 2, title: "The Wire", date: "2026-05-20", episodes: 6 },
  ],
  rewatchSummary: {
    totalRewatches: 34,
    rewatchedEpisodes: 28,
    bySeries: [
      { itemId: 1, title: "Breaking Bad", rewatches: 12 },
      { itemId: 2, title: "The Wire", rewatches: 8 },
    ],
  },
  streaks: {
    longestWeeks: 12,
    currentWeeks: 3,
    bySeries: [
      { itemId: 1, title: "Breaking Bad", weeks: 8 },
      { itemId: 3, title: "Severance", weeks: 5 },
    ],
  },
  timeByYear: [
    {
      year: 2026,
      totalMin: 12_000,
      monthlyMin: [900, 800, 1000, 1100, 950, 1050, 1200, 0, 0, 0, 0, 0],
      weeklyMin: [{ week: 28, min: 420 }],
    },
    {
      year: 2025,
      totalMin: 25_890,
      monthlyMin: [2100, 1900, 2200, 2000, 2300, 2100, 2400, 2200, 2000, 1900, 2100, 1990],
      weeklyMin: [],
    },
  ],
  activityByDay: [
    { date: "2026-07-01", count: 3 },
    { date: "2026-07-02", count: 1 },
    { date: "2026-07-03", count: 0 },
    { date: "2026-07-04", count: 5 },
    { date: "2026-07-05", count: 2 },
    { date: "2026-07-06", count: 4 },
    { date: "2026-07-07", count: 6 },
    { date: "2026-07-08", count: 1 },
    { date: "2026-07-09", count: 0 },
    { date: "2026-07-10", count: 3 },
  ],
  byWeekday: [45, 52, 48, 61, 55, 70, 80],
  byHour: [2, 1, 0, 0, 0, 1, 3, 5, 8, 12, 15, 18, 22, 25, 28, 30, 35, 42, 48, 55, 62, 58, 40, 20],
};

/** Years present but no daily activity — triggers ActivityHeatmapSection empty UI. */
export const mockStatsWithEmptySections: Stats = {
  ...mockStats,
  activityByDay: [],
  mostWatchedByTime: [],
  favoriteProgress: [],
  production: { ongoing: 0, ended: 0, ongoingItems: [] },
  genreDistribution: { top: [], other: 0 },
  networkDistribution: { networkCount: 0, top: [], other: 0 },
  backlog: { episodes: 0, seriesCount: 0, watchTimeMin: 0, topSeries: [] },
  pace: null,
  upcoming: { months: [] },
  binges: [],
  rewatchSummary: { totalRewatches: 0, rewatchedEpisodes: 0, bySeries: [] },
  streaks: { longestWeeks: 0, currentWeeks: 0, bySeries: [] },
};

/** Minimal activity for sparse heatmap visualization. */
export const mockSparseStats: Stats = {
  ...mockStats,
  activityByDay: [
    { date: "2026-07-01", count: 1 },
    { date: "2026-07-04", count: 3 },
    { date: "2026-07-08", count: 2 },
  ],
  timeByYear: [
    {
      year: 2026,
      totalMin: 420,
      monthlyMin: [0, 0, 0, 0, 0, 0, 420, 0, 0, 0, 0, 0],
      weeklyMin: [{ week: 28, min: 420 }],
    },
  ],
};

export const mockEmptyStats: Stats = {
  ...mockStats,
  episodesWatched: 0,
  watchTimeMin: 0,
  seriesCount: 0,
  favoritesCount: 0,
  itemCount: {
    needs_review: 0,
    watching: 0,
    not_watched_recently: 0,
    not_started: 0,
    watch_later: 0,
    up_to_date: 0,
    finished: 0,
    stopped: 0,
  },
  mostWatchedByTime: [],
  favoriteProgress: [],
  production: { ongoing: 0, ended: 0, ongoingItems: [] },
  genreDistribution: { top: [], other: 0 },
  networkDistribution: { networkCount: 0, top: [], other: 0 },
  backlog: { episodes: 0, seriesCount: 0, watchTimeMin: 0, topSeries: [] },
  pace: null,
  upcoming: { months: [] },
  binges: [],
  rewatchSummary: { totalRewatches: 0, rewatchedEpisodes: 0, bySeries: [] },
  streaks: { longestWeeks: 0, currentWeeks: 0, bySeries: [] },
  timeByYear: [],
  activityByDay: [],
  byWeekday: Array(7).fill(0),
  byHour: Array(24).fill(0),
  mostRewatched: [],
  ratingDistribution: { "1": 0, "2": 0, "3": 0 },
  episodesPerMonth: [],
  datedWatches: { dated: 0, total: 0 },
  recent: {
    last7Days: { episodes: 0, watchTimeMin: 0 },
    last30Days: { episodes: 0, watchTimeMin: 0 },
    thisMonth: { episodes: 0, watchTimeMin: 0 },
  },
};

export const mockPosterSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect fill='%23181818' width='200' height='300'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='monospace' font-size='14'%3EBB%3C/text%3E%3C/svg%3E";

export const mockStillSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect fill='%23202020' width='320' height='180'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='monospace' font-size='12'%3EEpisode%3C/text%3E%3C/svg%3E";

/** Dynamic airing fixture: pinned "now" and airStamp exactly 5s later (today's calendar date). */
export function countdownIn5Seconds() {
  const now = new Date();
  const nowIso = now.toISOString();
  return {
    nowIso,
    airStamp: new Date(now.getTime() + 5_000).toISOString(),
    airDate: nowIso.slice(0, 10),
  };
}

export const mockSeriesSummary: SeriesSummary = {
  id: 1,
  title: "Breaking Bad",
  tmdbId: 1396,
  posterRef: null,
  backdropRef: null,
  year: 2008,
  category: "watching",
  manualList: null,
  lastWatchedAt: "2026-07-15T20:00:00.000Z",
  rating: 3,
  releaseStatus: "Ended",
  network: "AMC",
  progress: { watched: 42, aired: 62, total: 62 },
  seasonProgress: {
    seasons: [
      { number: 1, watched: 7, total: 7 },
      { number: 2, watched: 13, total: 13 },
      { number: 3, watched: 13, total: 13 },
      { number: 4, watched: 9, total: 13 },
      { number: 5, watched: 0, total: 16 },
    ],
    sequential: true,
  },
  nextUnwatched: {
    episodeId: 43,
    s: 3,
    e: 5,
    title: "Más",
    airDate: "2009-04-06",
    airStamp: null,
    episodeType: "standard",
  },
  nextAirDate: null,
  pushMuted: false,
  favorite: true,
  needsReview: false,
};

export const mockEpisode: EpisodeSummary = {
  id: 43,
  s: 3,
  e: 5,
  title: "Más",
  overview: "Walter tries to gain control over his life.",
  airDate: "2009-04-06",
  airStamp: null,
  runtimeMin: 47,
  stillRef: null,
  episodeType: "standard",
  communityRating: { source: "tmdb", value: 8.2, scale: 10, votes: 1200 },
  myRating: null,
  watchCount: 0,
  lastWatchedAt: null,
};

export const mockSeason: SeasonSummary = {
  number: 1,
  name: "Season 1",
  overview: "A high school chemistry teacher turns to cooking meth.",
  posterRef: null,
  airDate: "2008-01-20",
  episodes: [
    {
      id: 1,
      s: 1,
      e: 1,
      title: "Pilot",
      overview: "Walter White learns he has cancer.",
      airDate: "2008-01-20",
      airStamp: null,
      runtimeMin: 58,
      stillRef: null,
      episodeType: "standard",
      communityRating: null,
      myRating: 3,
      watchCount: 1,
      lastWatchedAt: "2026-01-10T20:00:00.000Z",
    },
    {
      id: 2,
      s: 1,
      e: 2,
      title: "Cat's in the Bag...",
      overview: null,
      airDate: "2008-01-27",
      airStamp: null,
      runtimeMin: 48,
      stillRef: null,
      episodeType: "standard",
      communityRating: null,
      myRating: null,
      watchCount: 0,
      lastWatchedAt: null,
    },
    {
      id: 3,
      s: 1,
      e: 3,
      title: "...And the Bag's in the River",
      overview: null,
      airDate: "2008-02-10",
      airStamp: null,
      runtimeMin: 48,
      stillRef: null,
      episodeType: "finale",
      communityRating: null,
      myRating: null,
      watchCount: 0,
      lastWatchedAt: null,
    },
  ],
};

export const mockSeriesDetail: SeriesDetail = {
  ...mockSeriesSummary,
  tagline: "All bad things must come to an end.",
  overview:
    "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
  genres: [
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
  ],
  tags: [{ source: "tmdb", id: 1, name: "drugs" }],
  cast: [
    { id: 1, name: "Bryan Cranston", character: "Walter White", order: 0 },
    { id: 2, name: "Aaron Paul", character: "Jesse Pinkman", order: 1 },
  ],
  contentRatings: [{ region: "US", rating: "TV-MA" }],
  networks: [{ id: 1, name: "AMC", logoRef: null, originCountry: "US" }],
  originalLanguage: "en",
  episodeRunTimes: [47, 48],
  watchProviders: [
    { provider: "Netflix", providerId: 8, type: "flatrate", region: "US", logoRef: null },
  ],
  externalRatings: [
    { source: "tmdb", value: 9.5, scale: 10, votes: 5000, fetchedAt: "2026-07-01T12:00:00.000Z" },
  ],
  backdropRef: null,
  logoRef: null,
  note: null,
  lastRefreshedAt: "2026-07-01T12:00:00.000Z",
  addedAt: "2024-01-01T00:00:00.000Z",
  seasons: [mockSeason],
};

export const mockSearchResult: SearchResult = {
  providerId: "tmdb:1396",
  mediaType: "series",
  externalIds: { tmdbId: 1396 },
  title: "Breaking Bad",
  year: 2008,
  overview: "A chemistry teacher turned meth manufacturer.",
  network: "AMC",
  score: 9.5,
};

export const mockCalendarEntry: CalendarEntry = {
  itemId: 1,
  title: "Breaking Bad",
  posterRef: null,
  episodeId: 43,
  s: 3,
  e: 5,
  episodeTitle: "Más",
  episodeType: "standard",
  seasonName: "Season 3",
  airDate: "2026-07-18",
  airStamp: null,
  network: "AMC",
  watchProviders: [{ provider: "Netflix", type: "flatrate", region: "US" }],
  isWatched: false,
};

export const mockCalendarDays: CalendarDay[] = [
  {
    date: "2026-07-14",
    entries: [mockCalendarEntry],
  },
  {
    date: "2026-07-15",
    entries: [
      {
        ...mockCalendarEntry,
        episodeId: 44,
        s: 3,
        e: 6,
        episodeTitle: "Sunset",
        airDate: "2026-07-15",
      },
    ],
  },
  {
    date: "2026-07-18",
    entries: [
      {
        ...mockCalendarEntry,
        itemId: 2,
        title: "Severance",
        s: 2,
        e: 1,
        episodeTitle: "Hello, Ms. Cobel",
        airDate: "2026-07-18",
      },
    ],
  },
];

export const mockLongTitle =
  "An Extremely Long Series Title That Should Truncate Gracefully in Narrow Layouts Without Breaking the Grid";

export const mockLongOverview =
  "This overview deliberately repeats itself to stress-test line clamping and modal scrolling behavior when metadata providers return unusually verbose episode summaries that exceed typical UI bounds.";

export const mockBrokenImageUrl = "https://invalid.example.test/broken-image.png";

export const mockAuthSession: AuthSession = {
  authenticated: true,
  handle: "xava",
  mode: "multi",
};

export const mockAuthSessionGuest: AuthSession = {
  authenticated: false,
  handle: null,
  mode: "single",
};

export const mockSettingsEn: Settings = {
  locale: "en",
  region: "US",
  theme: "dark",
  scrapersEnabled: false,
  tmdbApiKeySet: true,
  watchingWindowDays: 14,
  episodeLabelFormat: "S01E06",
  spoilerProtection: true,
  defaultStartPage: "home",
  newSeriesDefaultStatus: "watching",
  uiPrefs: {
    libraryBrowse: { sort: "title", category: [] },
    watchSections: ["watching", "finished"],
    watchSectionSorts: {},
    historyCollapsed: false,
    skipSectionRemoveConfirm: false,
    showNextUpCarousel: true,
    browseView: "grid",
  },
  avatarRef: null,
  bannerRef: null,
};

export const mockSettings: Settings = {
  locale: "tr",
  region: "TR",
  theme: "dark",
  scrapersEnabled: false,
  tmdbApiKeySet: true,
  watchingWindowDays: 14,
  episodeLabelFormat: "SxEy",
  spoilerProtection: false,
  defaultStartPage: "home",
  newSeriesDefaultStatus: "watching",
  uiPrefs: {
    libraryBrowse: { sort: "lastWatched", category: [] },
    watchSections: ["watching", "not_watched_recently"],
    watchSectionSorts: {},
    historyCollapsed: false,
    skipSectionRemoveConfirm: false,
    showNextUpCarousel: true,
    browseView: "grid",
  },
  avatarRef: null,
  bannerRef: null,
};
