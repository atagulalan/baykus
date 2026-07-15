import { useTranslation } from "react-i18next";
import type { EpisodeType } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";

export interface EpisodeTagsProps {
  s: number;
  e: number;
  airDate: string | null;
  episodeType: EpisodeType | null;
  episodeTitle?: string | null;
  seasonName?: string | null;
}

export type EpisodeTagKind = "new" | "upcoming" | "premiere" | "finale" | "special" | "ova";

/** E25: NEW covers the last 3 days (today inclusive); anything later than today is UPCOMING instead. */
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
 * E25/E23: which chips apply, in priority render order (multiple allowed).
 * NEW and UPCOMING are mutually exclusive (airDate is either <= today or
 * > today, never both). OVA replaces SPECIAL when the episode title or
 * season name matches the OVA name heuristic (E23). Pure function —
 * `today` is an injectable YYYY-MM-DD string (not a Date) so the NEW-window
 * boundary is unit-testable without any UTC/local ambiguity around the
 * reference point.
 */
export function computeEpisodeTagKinds(
  props: EpisodeTagsProps,
  today: string = todayIso(),
): EpisodeTagKind[] {
  const { s, e, airDate, episodeType, episodeTitle, seasonName } = props;
  const isSpecial = s === 0;
  const isOva = isSpecial && (containsOva(episodeTitle) || containsOva(seasonName));
  const isNew =
    airDate !== null && airDate <= today && airDate >= addDaysToDate(today, -NEW_WINDOW_DAYS);
  const isUpcoming = airDate !== null && airDate > today;
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

const TAG_STYLES: Record<EpisodeTagKind, string> = {
  new: "bg-emerald-900 text-emerald-100",
  upcoming: "bg-emerald-900 text-emerald-100",
  premiere: "bg-sky-900 text-sky-100",
  finale: "bg-red-900 text-red-100",
  special: "bg-violet-900 text-violet-100",
  ova: "bg-violet-900 text-violet-100",
};

const TAG_LABEL_KEYS: Record<EpisodeTagKind, string> = {
  new: "episode.tag.new",
  upcoming: "episode.tag.upcoming",
  premiere: "episode.tag.premiere",
  finale: "episode.finale",
  special: "episode.tag.special",
  ova: "episode.tag.ova",
};

/** Shared by calendar rows/cells and the watch page. */
export function EpisodeTags(props: EpisodeTagsProps) {
  const { t } = useTranslation();
  const kinds = computeEpisodeTagKinds(props);
  if (kinds.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {kinds.map((kind) => (
        <span
          key={kind}
          className={`rounded px-1.5 py-0.5 font-semibold text-[10px] ${TAG_STYLES[kind]}`}
        >
          {t(TAG_LABEL_KEYS[kind])}
        </span>
      ))}
    </span>
  );
}
