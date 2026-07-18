import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { EpisodeType } from "../api/types.ts";
import { daysUntilAir, dayUnitLabel, formatAirDateLabel } from "../lib/airDateLabel.ts";
import { EpisodeLabel } from "./EpisodeLabel.tsx";
import { EpisodeTags } from "./EpisodeTags.tsx";
import { MediaImage } from "./MediaImage.tsx";
import { Modal } from "./Modal.tsx";
import { RatingControl } from "./RatingControl.tsx";
import { ReleaseTime } from "./ReleaseTime.tsx";

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
  itemId?: number;
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
  itemId,
  watched = false,
  onToggleWatched,
  toggleDisabled = false,
  myRating = null,
  onRate,
}: EpisodeDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const stillUrl = buildImageUrl(stillRef, "large");
  const daysLeft = !watched ? daysUntilAir(airDate) : null;

  return (
    <Modal isOpen={open} onClose={onClose} title={t("episode.detailsTitle")} className="p-4">
      {stillUrl && (
        <div className="mb-4 aspect-video w-full overflow-hidden border border-white/10 bg-white/5">
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
            className={`font-display text-lg italic leading-tight text-snow ${hideSpoilers ? "blur-sm opacity-60" : ""}`}
          >
            {episodeTitle ?? t("episode.untitled")}
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">
            <EpisodeLabel s={s} e={e} />
            {airDate && (
              <>
                <span className="text-muted/50">{t("common.separator")}</span>
                <span className="tabular-nums text-snow/80">
                  {formatAirDateLabel(airDate, i18n.language, { isAbsoluteDate: true })}
                </span>
              </>
            )}
            {runtimeMin != null && (
              <>
                <span className="text-muted/50">{t("common.separator")}</span>
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
          itemId != null ||
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
            {itemId != null && <ReleaseTime itemId={itemId} />}
            {networkOrProvider && (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="shrink-0 text-muted">{t("episode.network")}</span>
                <span className="min-w-0 text-right text-snow/80">{networkOrProvider}</span>
              </div>
            )}
          </div>
        )}

        {overview === undefined ? null : overview ? (
          <p
            className={`mt-1 whitespace-pre-line text-sm leading-relaxed text-muted/90 ${hideSpoilers ? "blur-md select-none opacity-60" : ""}`}
          >
            {overview}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted/55">{t("episode.noOverview")}</p>
        )}

        {onRate && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("rating.label")}
            </span>
            <RatingControl value={myRating} onChange={onRate} size="sm" />
          </div>
        )}

        {onToggleWatched &&
          (daysLeft != null ? (
            <div className="flex w-full flex-col items-center justify-center border border-white/10 px-4 py-2.5">
              <span className="font-mono text-base text-snow/80 tabular-nums">{daysLeft}</span>
              <span className="mt-0.5 font-mono text-[9px] text-muted">
                {dayUnitLabel(daysLeft, i18n.language)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={toggleDisabled}
              className={
                watched
                  ? "w-full border border-white/10 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-snow transition-colors hover:bg-white/5 disabled:opacity-50"
                  : "w-full bg-yellow px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-[#080808] transition-opacity hover:opacity-90 disabled:opacity-50"
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
