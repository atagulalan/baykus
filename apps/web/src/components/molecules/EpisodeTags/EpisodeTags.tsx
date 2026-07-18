import { useTranslation } from "react-i18next";
import type { EpisodeType } from "../../../api/types.ts";
import { todayIso } from "../../../lib/date.ts";

export interface EpisodeTagsProps {
  s: number;
  e: number;
  airDate: string | null;
  episodeType: EpisodeType | null;
  episodeTitle?: string | null;
  seasonName?: string | null;
  excludeTags?: EpisodeTagKind[];
  /** Dense list rows hide tags on mobile; detail modals pass false. Default true. */
  hideOnMobile?: boolean;
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
  new: "border border-yellow/35 text-yellow",
  upcoming: "border border-sky-400/40 text-sky-300",
  premiere: "border border-purple-400/45 text-purple-300",
  finale: "border border-red-400/40 text-red-300",
  special: "border border-white/20 text-muted",
  ova: "border border-violet-400/40 text-violet-300",
};

const TAG_LABEL_KEYS: Record<EpisodeTagKind, string> = {
  new: "episode.tag.new",
  upcoming: "episode.tag.upcoming",
  premiere: "episode.tag.premiere",
  finale: "episode.finale",
  special: "episode.tag.special",
  ova: "episode.tag.ova",
};

/** Shared by calendar rows/cells and the watch page. Hidden on mobile by default (dense rows). */
export function EpisodeTags(props: EpisodeTagsProps) {
  const { t } = useTranslation();
  const hideOnMobile = props.hideOnMobile !== false;
  let kinds = computeEpisodeTagKinds(props);
  if (props.excludeTags) {
    kinds = kinds.filter((k) => !props.excludeTags?.includes(k));
  }
  if (kinds.length === 0) return null;

  return (
    <span
      className={`flex-wrap items-center gap-2 ${hideOnMobile ? "hidden sm:inline-flex" : "inline-flex"}`}
    >
      {kinds.map((kind) => {
        const label = t(TAG_LABEL_KEYS[kind]);
        return (
          <span
            key={kind}
            title={label}
            className={`inline-flex shrink-0 items-center justify-center font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 ${TAG_STYLES[kind]}`}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}
