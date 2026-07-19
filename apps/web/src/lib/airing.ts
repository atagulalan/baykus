/** Mirrors packages/core/src/library/airing.ts — apps/web must not import core. */

export interface AiringFields {
  airDate: string | null;
  airStamp?: string | null | undefined;
}

export function normalizeAirStamp(stamp: string): string {
  return new Date(stamp).toISOString().replace(/\.\d{3}Z$/, "Z");
}

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

/** Whole milliseconds until air instant; null when unknown or already aired. */
export function msUntilAir(ep: AiringFields, now = Date.now()): number | null {
  const instant = airInstantIso(ep);
  if (!instant) return null;
  const ms = new Date(instant).getTime() - now;
  return ms > 0 ? ms : null;
}

export function formatAirStampLocal(stamp: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(stamp));
}

/** Origin-network time in US/Eastern — Rick and Morty / Adult Swim convention. */
export function formatAirStampOrigin(stamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(stamp));
}
