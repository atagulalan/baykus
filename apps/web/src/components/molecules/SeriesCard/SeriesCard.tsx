import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useState } from "react";
import { getSeriesByParam } from "../../../api/client.ts";
import { buildImageUrl } from "../../../api/images.ts";
import type { SeriesSummary } from "../../../api/types.ts";
import { CATEGORY_TEXT_COLORS } from "../../../lib/categoryColors.ts";
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
  const imageUrl = buildImageUrl(series.posterRef);
  const { watched, aired } = series.progress;
  const textColor = CATEGORY_TEXT_COLORS[series.category] || CATEGORY_TEXT_COLORS.default;
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
    <div className="group relative flex flex-col overflow-hidden bg-void border border-white/5 transition-colors hover:border-white/10">
      <Link
        to="/series/$id"
        params={{ id: param }}
        className="contents"
        onMouseEnter={prefetchDetail}
        onFocus={prefetchDetail}
        onTouchStart={prefetchDetail}
      >
        <div
          className="relative aspect-[2/3] w-full bg-[#101010]"
          style={{ viewTransitionName: `poster-${series.id}` }}
        >
          {imageUrl && !imageFailed ? (
            <MediaImage
              src={imageUrl}
              alt={series.title}
              wrapperClassName="block h-full w-full"
              className="h-full w-full object-cover opacity-90 group-hover:opacity-100"
              spinnerSize={20}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-mono text-muted uppercase tracking-widest">
              {series.title}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3 border-t border-white/5">
          <p className="truncate font-display italic text-snow text-xs leading-tight sm:text-lg">
            {series.title}
          </p>
          <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-muted tracking-wide">
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
      {series.rating !== null && (
        <span className="absolute top-1 left-1 bg-void/80 p-1">
          {(() => {
            const { Icon, colorClass } = RATING_ICONS[series.rating];
            return <Icon size={14} className={colorClass} />;
          })()}
        </span>
      )}
    </div>
  );
}
