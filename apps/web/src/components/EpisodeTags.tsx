import { useTranslation } from "react-i18next";
import type { EpisodeType } from "../api/types.ts";

export interface EpisodeTagsProps {
  s: number;
  e: number;
  airDate: string | null;
  episodeType: EpisodeType | null;
  episodeTitle?: string | null;
  seasonName?: string | null;
}

/** E25: airDate >= today - 3d, no upper bound — a future-scheduled episode is "new" too. */
const NEW_WINDOW_DAYS = 3;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function containsOva(text: string | null | undefined): boolean {
  return text?.toLowerCase().includes("ova") ?? false;
}

const TAG_STYLES = {
  new: "bg-emerald-900 text-emerald-100",
  premiere: "bg-sky-900 text-sky-100",
  finale: "bg-red-900 text-red-100",
  special: "bg-violet-900 text-violet-100",
} as const;

function Tag({ kind, label }: { kind: keyof typeof TAG_STYLES; label: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-semibold text-[10px] ${TAG_STYLES[kind]}`}>
      {label}
    </span>
  );
}

/**
 * E25 chips, in priority order: YENİ · PREMIER · FİNAL · OVA/SPECIAL (multiple
 * allowed; OVA replaces SPECIAL when the episode title or season name matches
 * the name heuristic, per E23). Shared by calendar rows/cells and the watch page.
 */
export function EpisodeTags({
  s,
  e,
  airDate,
  episodeType,
  episodeTitle,
  seasonName,
}: EpisodeTagsProps) {
  const { t } = useTranslation();
  const isSpecial = s === 0;
  const isOva = isSpecial && (containsOva(episodeTitle) || containsOva(seasonName));
  const isNew = airDate !== null && airDate >= addDaysToDate(todayIso(), -NEW_WINDOW_DAYS);
  const isPremiere = e === 1;
  const isFinale = episodeType === "finale";

  if (!isNew && !isPremiere && !isFinale && !isSpecial) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {isNew && <Tag kind="new" label={t("episode.tag.new")} />}
      {isPremiere && <Tag kind="premiere" label={t("episode.tag.premiere")} />}
      {isFinale && <Tag kind="finale" label={t("episode.finale")} />}
      {isSpecial &&
        (isOva ? (
          <Tag kind="special" label={t("episode.tag.ova")} />
        ) : (
          <Tag kind="special" label={t("episode.tag.special")} />
        ))}
    </span>
  );
}
