import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { getSeriesByParam } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { SeriesSummary } from "../../../api/types.ts";
import { progressTextColor } from "../../../lib/categoryColors.ts";
import { pageViewTransition } from "../../../lib/pageViewTransition.ts";
import { posterMorphStyle, setLastPosterItemId, useLastPosterItemId } from "../../../lib/posterTransition.ts";
import { seriesParam } from "../../../lib/seriesPath.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { SegmentedProgress } from "../../atoms/SegmentedProgress/SegmentedProgress.tsx";

interface SeriesCardProps {
  series: SeriesSummary;
}

const RATING_ICONS: Record<1 | 2 | 3, { Icon: React.ElementType; colorClass: string }> = {
  1: { Icon: ArrowDown, colorClass: "text-red-500" },
  2: { Icon: Minus, colorClass: "text-yellow" },
  3: { Icon: ArrowUp, colorClass: "text-green-500" },
};

export function SeriesCard({ series }: SeriesCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  // Shared last-id keeps reverse morph (detail → grid) paired; flushSync so Link's
  // own isTransitioning re-render doesn't clear the name before VT captures.
  const lastPosterId = useLastPosterItemId();
  const posterActive = lastPosterId === series.id;
  const imageUrl = buildImageUrl(series.posterRef);
  const { watched, aired } = series.progress;
  const textColor = progressTextColor(series.category, watched);
  const queryClient = useQueryClient();
  const param = seriesParam(series);

  // Prefetch the detail query on hover/focus/touch so it's already in cache
  // by click time — the view-transition poster morph needs the detail
  // page's poster to exist on its very first paint, not after a fetch that
  // starts only once navigation has already begun.
  function prefetchDetail() {
    queryClient.prefetchQuery({
      queryKey: ["series", param],
      queryFn: () => getSeriesByParam(param),
    });
  }

  return (
    <div className="group relative flex flex-col rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.04] sm:px-3 sm:py-3">
      <Link
        to="/series/$id"
        params={{ id: param }}
        viewTransition={pageViewTransition}
        className="contents"
        onMouseEnter={prefetchDetail}
        onFocus={prefetchDetail}
        onTouchStart={prefetchDetail}
        onClick={() => {
          flushSync(() => setLastPosterItemId(series.id));
        }}
      >
        <div
          className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-white/5"
          style={posterMorphStyle(series.id, posterActive)}
        >
          {imageUrl && !imageFailed ? (
            <MediaImage
              src={imageUrl}
              alt={series.title}
              wrapperClassName="block h-full w-full"
              className="h-full w-full object-cover opacity-90"
              spinnerSize={20}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-mono text-muted uppercase tracking-widest">
              {series.title}
            </div>
          )}
          {series.rating !== null && (
            <span className="absolute top-1 left-1 bg-void/80 p-1">
              {(() => {
                const { Icon, colorClass } = RATING_ICONS[series.rating];
                return <Icon size={14} className={colorClass} />;
              })()}
            </span>
          )}
        </div>
        <div className="flex w-full flex-col items-start gap-1 pt-2">
          <p className="w-full truncate text-left font-display italic text-snow text-[1rem] leading-tight">
            {series.title}
          </p>
          <div className="flex w-full items-center justify-between font-mono text-[10px] tabular-nums text-muted tracking-wide">
            <span>{series.year ?? "—"}</span>
            <span className={textColor}>
              {watched} / {aired}
            </span>
          </div>
          <SegmentedProgress
            seasonProgress={series.seasonProgress}
            watched={watched}
            aired={aired}
            category={series.category}
            size="sm"
          />
        </div>
      </Link>
    </div>
  );
}
