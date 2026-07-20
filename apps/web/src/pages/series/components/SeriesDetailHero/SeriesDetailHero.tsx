import { Info } from "lucide-react";
import { type CSSProperties, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../../../../api/images.ts";
import type { ManualList, SeriesDetail } from "../../../../api/types.ts";
import { MediaImage } from "../../../../components/atoms/MediaImage/MediaImage.tsx";
import {
  alignSeasonProgressAnnounced,
  SegmentedProgress,
} from "../../../../components/atoms/SegmentedProgress/SegmentedProgress.tsx";
import { SeriesActionsMenu } from "../../../../components/organisms/SeriesActionsMenu/SeriesActionsMenu.tsx";
import { SeriesDetailsSheet } from "../../../../components/organisms/SeriesDetailsSheet/SeriesDetailsSheet.tsx";
import { progressTextColor } from "../../../../lib/categoryColors.ts";
import {
  posterMorphStyle,
  setLastPosterItemId,
  useLastPosterItemId,
} from "../../../../lib/posterTransition.ts";

interface SeriesDetailHeroProps {
  detail: SeriesDetail;
  activeRegion: string;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onRateChange: (value: 1 | 2 | 3 | null) => void;
  onToggleFavorite: () => void;
  onChangeManualList: (manualList: ManualList | null) => void;
  onToggleMute: () => void;
  onRemove: () => void;
  /** /series/new — same chrome, start-watching CTA instead of library progress. */
  preview?: boolean;
  /** Search→preview view-transition name (`poster-preview-…`). */
  posterStyle?: CSSProperties;
  onStartWatching?: () => void;
  startWatchingPending?: boolean;
}

export function SeriesDetailHero({
  detail,
  activeRegion,
  detailsOpen,
  onDetailsOpenChange,
  onRateChange,
  onToggleFavorite,
  onChangeManualList,
  onToggleMute,
  onRemove,
  preview = false,
  posterStyle,
  onStartWatching,
  startWatchingPending = false,
}: SeriesDetailHeroProps) {
  const { t } = useTranslation();

  const imageUrl = buildImageUrl(detail.posterRef);
  const backdropUrl = buildImageUrl(detail.backdropRef, "large");
  const { watched, aired } = detail.progress;
  const lastPosterId = useLastPosterItemId();
  const posterActive = !preview && lastPosterId === detail.id;
  const resolvedPosterStyle = preview ? posterStyle : posterMorphStyle(detail.id, posterActive);

  // Keep the return morph target armed for the matching library card.
  useLayoutEffect(() => {
    if (preview) return;
    setLastPosterItemId(detail.id);
  }, [detail.id, preview]);

  return (
    <section className="relative -mt-[var(--app-header-height)]" data-hero-banner="">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {backdropUrl && (
          <MediaImage
            src={backdropUrl}
            alt=""
            wrapperClassName="absolute inset-0 block size-full bg-void"
            className="size-full object-cover object-top"
            fadeDurationMs={1200}
            spinnerSize={24}
            fetchPriority="high"
          />
        )}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-void via-transparent to-void sm:block" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/20 to-void" />
      </div>

      <div className="relative z-10 flex min-h-[24rem] items-end gap-4 px-3 pb-6 pt-20 sm:min-h-[30rem] sm:gap-6 sm:px-4 sm:pt-32">
        {/* E51: VT name on the poster *container* (not MediaImage's fading <img>). */}
        <div
          className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md bg-white/5 shadow-2xl sm:w-40"
          style={resolvedPosterStyle}
        >
          {imageUrl ? (
            <MediaImage
              src={imageUrl}
              alt={detail.title}
              wrapperClassName="block size-full"
              className="h-full w-full object-cover"
              spinnerSize={24}
              fetchPriority="high"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-2 text-center text-sm text-muted">
              {detail.title}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 flex-1 font-display italic text-2xl text-snow leading-none tracking-tight sm:text-4xl">
              {detail.title}
              {detail.year ? (
                <span className="ml-2 font-sans text-base text-snow/60 not-italic sm:text-2xl">
                  ({detail.year})
                </span>
              ) : null}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => onDetailsOpenChange(!detailsOpen)}
                  aria-label={t("series.details.trigger")}
                  className="px-2 py-1 text-muted transition-colors hover:text-snow"
                >
                  <Info size={18} strokeWidth={1.5} />
                </button>
                <SeriesDetailsSheet
                  isOpen={detailsOpen}
                  onClose={() => onDetailsOpenChange(false)}
                  detail={detail}
                  activeRegion={activeRegion}
                  onRateChange={onRateChange}
                  preview={preview}
                />
              </div>
              {!preview && (
                <div className="hidden sm:block">
                  <SeriesActionsMenu
                    favorite={detail.favorite}
                    manualList={detail.manualList}
                    category={detail.category}
                    pushMuted={detail.pushMuted}
                    onToggleFavorite={onToggleFavorite}
                    onChangeManualList={onChangeManualList}
                    onToggleMute={onToggleMute}
                    onRemove={onRemove}
                  />
                </div>
              )}
            </div>
          </div>

          {preview ? (
            <div className="mt-2">
              <button
                type="button"
                disabled={startWatchingPending}
                onClick={onStartWatching}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-yellow px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {startWatchingPending ? t("series.adding") : t("series.startWatching")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-1">
              <SegmentedProgress
                seasonProgress={alignSeasonProgressAnnounced(detail.seasonProgress, detail.seasons)}
                watched={watched}
                aired={aired}
                category={detail.category}
                size="md"
                className="max-w-sm"
              />
              <p
                className={`font-mono text-sm tabular-nums ${progressTextColor(detail.category, watched)}`}
              >
                {watched}/{aired}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
