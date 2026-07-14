import { randomUUID } from "node:crypto";
import type {
  FuzzyShow,
  MatchedShow,
  TvTimeWatchEvent,
  UnmatchedShow,
} from "@baykus/importer-tvtime";

export interface CachedReport {
  matched: MatchedShow[];
  fuzzy: FuzzyShow[];
  unmatched: UnmatchedShow[];
  /** Raw watch events, keyed by tvdbShowId, for the confirm step's episode resolution. */
  watchesByTvdbId: Map<number, TvTimeWatchEvent[]>;
  createdAt: number;
}

export interface ReportStore {
  create(report: Omit<CachedReport, "createdAt">): string;
  get(reportId: string): CachedReport | undefined;
  delete(reportId: string): void;
}

const REPORT_TTL_MS = 30 * 60 * 1000;

/**
 * In-memory, one per createApp() call (mirrors auth's rate limiters and
 * single-session store — a fresh instance per app avoids cross-test
 * pollution while still being one shared cache per running server
 * process). A report only needs to survive the gap between a user viewing
 * the match report and clicking confirm, so a modest TTL is enough.
 */
export function createReportStore(): ReportStore {
  const reports = new Map<string, CachedReport>();

  function pruneExpired(): void {
    const now = Date.now();
    for (const [id, report] of reports) {
      if (now - report.createdAt > REPORT_TTL_MS) reports.delete(id);
    }
  }

  return {
    create(report) {
      pruneExpired();
      const reportId = randomUUID();
      reports.set(reportId, { ...report, createdAt: Date.now() });
      return reportId;
    },
    get(reportId) {
      pruneExpired();
      return reports.get(reportId);
    },
    delete(reportId) {
      reports.delete(reportId);
    },
  };
}
