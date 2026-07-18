import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../../../../api/images.ts";
import type { ManualList, SeriesDetail } from "../../../../api/types.ts";
import { MediaImage } from "../../../../components/atoms/MediaImage/MediaImage.tsx";
import { SegmentedProgress } from "../../../../components/atoms/SegmentedProgress/SegmentedProgress.tsx";
import { SeriesActionsMenu } from "../../../../components/organisms/SeriesActionsMenu/SeriesActionsMenu.tsx";
import { SeriesDetailsSheet } from "../../../../components/organisms/SeriesDetailsSheet/SeriesDetailsSheet.tsx";
import { CATEGORY_TEXT_COLORS } from "../../../../lib/categoryColors.ts";

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
}: SeriesDetailHeroProps) {
  const { t } = useTranslation();

  const imageUrl = buildImageUrl(detail.posterRef);
  const backdropUrl = buildImageUrl(detail.backdropRef, "large");
  const { watched, aired } = detail.progress;

  return (
    <section className="relative">
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

      <div className="relative z-10 flex min-h-[24rem] items-end gap-4 px-2 pb-6 pt-20 sm:min-h-[30rem] sm:gap-6 sm:px-4 sm:pt-32">
        {imageUrl ? (
          <MediaImage
            src={imageUrl}
            alt={detail.title}
            wrapperClassName="block aspect-[2/3] w-28 shrink-0 bg-white/5 shadow-2xl sm:w-40"
            className="h-full w-full object-cover"
            style={{ viewTransitionName: `poster-${detail.id}` }}
            spinnerSize={24}
            fetchPriority="high"
          />
        ) : (
          <div
            className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center overflow-hidden bg-white/5 p-2 text-center text-sm text-muted sm:w-40"
            style={{ viewTransitionName: `poster-${detail.id}` }}
          >
            {detail.title}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 font-display italic text-2xl text-snow leading-none tracking-tight sm:text-4xl">
              {detail.title}
              {detail.year ? (
                <span className="ml-2 font-sans text-base text-snow/60 not-italic sm:text-2xl">
                  ({detail.year})
                </span>
              ) : (
                ""
              )}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => onDetailsOpenChange(!detailsOpen)}
                  aria-label={t("series.details.trigger")}
                  className="px-2 py-1 text-muted hover:text-snow transition-colors"
                >
                  <Info size={18} strokeWidth={1.5} />
                </button>
                <SeriesDetailsSheet
                  isOpen={detailsOpen}
                  onClose={() => onDetailsOpenChange(false)}
                  detail={detail}
                  activeRegion={activeRegion}
                  onRateChange={onRateChange}
                />
              </div>
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
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <SegmentedProgress
              seasonProgress={detail.seasonProgress}
              watched={watched}
              aired={aired}
              category={detail.category}
              size="md"
              className="max-w-sm"
            />
            <p
              className={`text-sm font-mono tabular-nums ${CATEGORY_TEXT_COLORS[detail.category]}`}
            >
              {watched}/{aired}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
