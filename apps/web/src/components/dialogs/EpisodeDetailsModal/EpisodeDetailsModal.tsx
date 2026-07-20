import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getSettings } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { EpisodeType } from "../../../api/types.ts";
import { formatAirDateLabel, unairedTrailingState } from "../../../lib/airDateLabel.ts";
import {
  countdownDayUnit,
  countdownHourUnit,
  countdownMinuteUnit,
  countdownSecondUnit,
} from "../../../lib/countdownUnit.ts";
import { useAiringClock } from "../../../lib/useAiringClock.ts";
import { EpisodeLabel } from "../../atoms/EpisodeLabel/EpisodeLabel.tsx";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { RatingControl } from "../../atoms/RatingControl/RatingControl.tsx";
import { ReleaseTime } from "../../atoms/ReleaseTime/ReleaseTime.tsx";
import { EpisodeTags } from "../../molecules/EpisodeTags/EpisodeTags.tsx";
import { Modal } from "../../molecules/Modal/Modal.tsx";

export function formatAirDate(airDate: string | null): string {
  if (!airDate) return "";
  return formatAirDateLabel(airDate, "tr", { isAbsoluteDate: true });
}

export function formatWatchedAt(watchedAt: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(watchedAt));
}

export interface EpisodeDetailsModalProps {
  open: boolean;
  onClose: () => void;
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string | null;
  episodeType: EpisodeType | null;
  /**
   * Episode overview. Pass `undefined` while series data is still loading
   * (calendar) to hide the overview block; `null` means loaded with no text.
   */
  overview: string | null | undefined;
  runtimeMin?: number | null;
  watchCount?: number | null;
  /** ISO datetime of the latest watch; shown when the episode has been watched. */
  lastWatchedAt?: string | null;
  stillRef: string | null;
  hideSpoilers?: boolean;
  seriesTitle?: string;
  seasonName?: string | null;
  networkOrProvider?: string | null;
  /** When set, shows ReleaseTime in the meta block. */
  airStamp?: string | null;
  watched?: boolean;
  onToggleWatched?: () => void;
  toggleDisabled?: boolean;
  myRating?: 1 | 2 | 3 | null;
  onRate?: (value: 1 | 2 | 3 | null) => void;
}

export function EpisodeDetailsModal({
  open,
  onClose,
  s,
  e,
  episodeTitle,
  airDate,
  episodeType,
  overview,
  runtimeMin = null,
  watchCount = null,
  lastWatchedAt = null,
  stillRef,
  hideSpoilers = false,
  seriesTitle,
  seasonName,
  networkOrProvider,
  airStamp = null,
  watched = false,
  onToggleWatched,
  toggleDisabled = false,
  myRating = null,
  onRate,
}: EpisodeDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const episodeLabelFormat = settings?.episodeLabelFormat ?? "SxEy";
  const stillUrl = buildImageUrl(stillRef, "large");
  const now = useAiringClock(airDate, airStamp, !watched);
  const unaired = !watched
    ? unairedTrailingState(airDate, undefined, airStamp, now)
    : { kind: "none" as const };

  return (
    <Modal isOpen={open} onClose={onClose} title={t("episode.detailsTitle")} className="p-4">
      {stillUrl && (
        <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <MediaImage
            src={stillUrl}
            alt=""
            wrapperClassName="block h-full w-full"
            className={`h-full w-full object-cover ${hideSpoilers ? "blur-md select-none opacity-60" : ""}`}
            spinnerSize={20}
          />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h3
            aria-hidden={hideSpoilers}
            className={`font-display text-lg italic leading-tight text-snow ${hideSpoilers ? "blur-sm opacity-60" : ""}`}
          >
            {episodeTitle ?? t("episode.untitled")}
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">
            <EpisodeLabel s={s} e={e} format={episodeLabelFormat} />
            {airDate && (
              <>
                <span className="text-muted-dim" aria-hidden>
                  {t("common.separator")}
                </span>
                <span className="tabular-nums text-snow/80">
                  {formatAirDateLabel(airDate, i18n.language, { isAbsoluteDate: true })}
                </span>
              </>
            )}
            {runtimeMin != null && (
              <>
                <span className="text-muted-dim" aria-hidden>
                  {t("common.separator")}
                </span>
                <span className="tabular-nums text-snow/80">
                  {t("episode.runtimeMin", { minutes: runtimeMin })}
                </span>
              </>
            )}
          </p>
          {seriesTitle != null && (
            <p className="mt-1 font-mono text-xs text-muted">{seriesTitle}</p>
          )}
        </div>

        <EpisodeTags
          s={s}
          e={e}
          airDate={airDate}
          episodeType={episodeType}
          episodeTitle={episodeTitle}
          {...(seasonName !== undefined ? { seasonName } : {})}
          hideOnMobile={false}
        />

        {(lastWatchedAt ||
          (watchCount != null && watchCount > 1) ||
          airStamp != null ||
          networkOrProvider) && (
          <div className="border-white/5 border-y py-1 font-mono text-xs">
            {lastWatchedAt && (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="shrink-0 text-muted">{t("episode.watched")}</span>
                <span className="min-w-0 text-right text-snow/80 tabular-nums">
                  {formatWatchedAt(lastWatchedAt)}
                  {watchCount != null && watchCount > 1 && (
                    <span className="text-yellow">
                      {t("common.separator")}×{watchCount}
                    </span>
                  )}
                </span>
              </div>
            )}
            {!lastWatchedAt && watchCount != null && watchCount > 1 && (
              <div className="py-1.5 text-right text-yellow">
                {t("episode.watchedCount", { count: watchCount })}
              </div>
            )}
            {airStamp != null && <ReleaseTime airStamp={airStamp} />}
            {networkOrProvider && (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="shrink-0 text-muted">{t("episode.network")}</span>
                <span className="min-w-0 text-right text-snow/80">{networkOrProvider}</span>
              </div>
            )}
          </div>
        )}

        {overview === undefined ? null : hideSpoilers && overview ? (
          <p className="mt-1 text-sm text-muted-dim">
            {t("settings.general.spoilerProtectionHint")}
          </p>
        ) : overview ? (
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{overview}</p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-dim">{t("episode.noOverview")}</p>
        )}

        {onRate && (
          <RatingControl value={myRating} onChange={onRate} size="sm" iconsOnly />
        )}

        {onToggleWatched &&
          (unaired.kind === "countdown" ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 px-4 py-2.5">
              <span className="font-mono text-base text-snow/80 tabular-nums">{unaired.days}</span>
              <span className="mt-0.5 font-mono text-[9px] text-muted">
                {countdownDayUnit(unaired.days, t)}
              </span>
            </div>
          ) : unaired.kind === "countdownClock" ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 px-4 py-2.5">
              <span className="font-mono text-base text-snow/80 tabular-nums">{unaired.hours}</span>
              <span className="mt-0.5 font-mono text-[9px] text-muted">
                {countdownHourUnit(unaired.hours, t)}
              </span>
            </div>
          ) : unaired.kind === "countdownMinutes" ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 px-4 py-2.5">
              <span className="font-mono text-base text-snow/80 tabular-nums">
                {unaired.minutes}
              </span>
              <span className="mt-0.5 font-mono text-[9px] text-muted">
                {countdownMinuteUnit(t)}
              </span>
            </div>
          ) : unaired.kind === "countdownSeconds" ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 px-4 py-2.5">
              <span className="font-mono text-base text-snow/80 tabular-nums">
                {unaired.seconds}
              </span>
              <span className="mt-0.5 font-mono text-[9px] text-muted">
                {countdownSecondUnit(t)}
              </span>
            </div>
          ) : unaired.kind === "tbd" ? (
            <div className="flex w-full items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-muted">
              {t("episode.tbd")}
            </div>
          ) : (
            <button
              type="button"
              disabled={toggleDisabled}
              className={
                watched
                  ? "w-full rounded-lg border border-white/10 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-snow transition-colors hover:bg-white/5 disabled:opacity-50"
                  : "w-full rounded-lg bg-yellow px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50"
              }
              onClick={() => {
                onToggleWatched();
                onClose();
              }}
            >
              {watched
                ? watchCount != null && watchCount > 1
                  ? t("episode.removeRewatch")
                  : t("episode.markAsUnwatched")
                : t("episode.toggleWatched")}
            </button>
          ))}
      </div>
    </Modal>
  );
}
