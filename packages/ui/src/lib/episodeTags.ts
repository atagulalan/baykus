import { isEpisodeAired, todayIso } from "./airing.ts";

export type EpisodeType = "standard" | "mid_season" | "finale";

export type EpisodeTagKind = "new" | "upcoming" | "premiere" | "finale" | "special" | "ova";

export type EpisodeTagsInput = {
  s: number;
  e: number;
  airDate: string | null;
  airStamp?: string | null;
  episodeType: EpisodeType | null;
  episodeTitle?: string | null;
  seasonName?: string | null;
  excludeTags?: EpisodeTagKind[];
};

/** E25: NEW covers the last 3 days (today inclusive). */
const NEW_WINDOW_DAYS = 3;

function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function containsOva(text: string | null | undefined): boolean {
  return text?.toLowerCase().includes("ova") ?? false;
}

/**
 * E25/E23: which chips apply, in priority render order.
 * Pure — `today` injectable YYYY-MM-DD for tests.
 */
export function computeEpisodeTagKinds(
  props: EpisodeTagsInput,
  today: string = todayIso(),
): EpisodeTagKind[] {
  const { s, e, airDate, airStamp, episodeType, episodeTitle, seasonName } = props;
  const isSpecial = s === 0;
  const isOva = isSpecial && (containsOva(episodeTitle) || containsOva(seasonName));
  const now = new Date(`${today}T00:00:00Z`);
  const aired = isEpisodeAired({ airDate, airStamp }, now);
  const isNew =
    aired &&
    airDate !== null &&
    airDate <= today &&
    airDate >= addDaysToDate(today, -NEW_WINDOW_DAYS);
  const isUpcoming = !aired && airDate !== null;
  const isPremiere = e === 1;
  const isFinale = episodeType === "finale";

  const kinds: EpisodeTagKind[] = [];
  if (isNew) kinds.push("new");
  if (isUpcoming) kinds.push("upcoming");
  if (isPremiere) kinds.push("premiere");
  if (isFinale) kinds.push("finale");
  if (isSpecial) kinds.push(isOva ? "ova" : "special");
  return kinds;
}

export const TAG_STYLES: Record<EpisodeTagKind, string> = {
  new: "border-yellow/25 bg-yellow/10",
  upcoming: "border-sky-400/25 bg-sky-400/10",
  premiere: "border-purple-400/25 bg-purple-400/10",
  finale: "border-red-400/25 bg-red-400/10",
  special: "border-white/15 bg-white/5",
  ova: "border-violet-400/25 bg-violet-400/10",
};

export const TAG_TEXT: Record<EpisodeTagKind, string> = {
  new: "text-yellow",
  upcoming: "text-sky-300",
  premiere: "text-purple-300",
  finale: "text-red-300",
  special: "text-muted",
  ova: "text-violet-300",
};
