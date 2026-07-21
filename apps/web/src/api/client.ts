/**
 * Web SPA API surface — configures cookie transport + telemetry, then
 * re-exports the shared `@baykus/api-client` (Phase 2).
 */
import { type ApiHttpFailureInfo, configureApiClient } from "@baykus/api-client";
import { addApiBreadcrumb, captureError, track } from "../lib/telemetry.ts";

configureApiClient({
  transport: "cookie",
  baseUrl: "",
  onTrack: (event) => track(event),
  onHttpFailure: ({ path, status, err, requestId }: ApiHttpFailureInfo) => {
    addApiBreadcrumb({ path, status, requestId });
    // E194: only 5xx / network-class failures — not routine 401/404.
    if (status >= 500 || status === 0) {
      captureError(err, { path, status, requestId });
    }
  },
});

export {
  ApiError,
  addEpisodeWatch,
  addSeries,
  bulkUnwatch,
  bulkWatch,
  claim,
  clearRating,
  confirmTvTimeImport,
  deleteAccount,
  exportZipUrl,
  getAuthSession,
  getCalendar,
  getSeriesByParam,
  getSeriesPreview,
  getSettings,
  getStats,
  getVapidPublicKey,
  getWatchHistory,
  importTvTime,
  importZip,
  listSeries,
  login,
  logout,
  oauthCallback,
  oauthClaim,
  oauthLink,
  oauthUnlink,
  refreshAllSeries,
  refreshSeries,
  removeLatestEpisodeWatch,
  removeSeries,
  resetLibrary,
  searchSeries,
  sendTestPush,
  setRating,
  subscribePush,
  unsubscribePush,
  updateSeries,
  updateSettings,
  uploadAvatar,
} from "@baykus/api-client";
