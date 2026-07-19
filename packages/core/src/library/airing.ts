import { and, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import * as schema from "../db/schema.ts";

/** ISO datetime string, no milliseconds — matches watches storage. */
export function isoNow(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** E3 fallback: plain calendar date in UTC when no airStamp is stored. */
export function todayUtc(now: Date = new Date()): string {
  return isoNow(now).slice(0, 10);
}

export interface AiringFields {
  airDate: string | null;
  airStamp?: string | null | undefined;
}

/** Normalize provider stamps to ISO UTC without milliseconds. */
export function normalizeAirStamp(stamp: string): string {
  return new Date(stamp).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Instant the episode becomes watchable. Prefers airStamp; falls back to UTC
 * midnight of airDate. Null when schedule is unknown.
 */
export function airInstantIso(ep: AiringFields): string | null {
  if (ep.airStamp) return normalizeAirStamp(ep.airStamp);
  if (ep.airDate) return `${ep.airDate}T00:00:00Z`;
  return null;
}

/** Aired ⇔ now is at or after the episode's air instant. */
export function isEpisodeAired(ep: AiringFields, now: Date = new Date()): boolean {
  const instant = airInstantIso(ep);
  if (!instant) return false;
  return now.getTime() >= new Date(instant).getTime();
}

/** Drizzle WHERE: non-special episode is aired as of `now`. */
export function episodeAiredCondition(now: Date = new Date()) {
  const nowIso = isoNow(now);
  const today = todayUtc(now);
  return or(
    and(isNotNull(schema.episodes.airStamp), lte(schema.episodes.airStamp, nowIso)),
    and(
      isNull(schema.episodes.airStamp),
      isNotNull(schema.episodes.airDate),
      lte(schema.episodes.airDate, today),
    ),
  );
}

/** Drizzle WHERE: episode air instant is strictly after `now`. */
export function episodeFutureAirCondition(now: Date = new Date()) {
  const nowIso = isoNow(now);
  const today = todayUtc(now);
  return or(
    and(isNotNull(schema.episodes.airStamp), sql`${schema.episodes.airStamp} > ${nowIso}`),
    and(
      isNull(schema.episodes.airStamp),
      isNotNull(schema.episodes.airDate),
      sql`${schema.episodes.airDate} > ${today}`,
    ),
  );
}

/** True when the episode became aired strictly after `sinceIso` and is aired now. */
export function episodeNewlyAiredSince(
  ep: AiringFields,
  sinceIso: string,
  now: Date = new Date(),
): boolean {
  if (!isEpisodeAired(ep, now)) return false;
  const instant = airInstantIso(ep);
  if (!instant) return false;
  return instant > sinceIso;
}
