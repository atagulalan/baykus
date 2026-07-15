import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useState } from "react";
import { buildImageUrl } from "../api/images.ts";
import type { SeriesSummary } from "../api/types.ts";
import { CATEGORY_TEXT_COLORS } from "../lib/categoryColors.ts";
import { seriesParam } from "../lib/seriesPath.ts";
import { SegmentedProgress } from "./SegmentedProgress.tsx";

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

  return (
    <div className="group relative flex flex-col overflow-hidden bg-void border border-white/5 transition-colors hover:border-white/10">
      <Link to="/series/$id" params={{ id: seriesParam(series) }} className="contents">
        <div
          className="relative aspect-[2/3] w-full bg-[#101010]"
          style={{ viewTransitionName: `poster-${series.id}` }}
        >
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={series.title}
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-mono text-muted uppercase tracking-widest">
              {series.title}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3 border-t border-white/5">
          <p className="truncate font-display italic text-snow text-lg leading-tight">
            {series.title}
          </p>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted tracking-wide">
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
        <span className="absolute top-1 left-1 rounded bg-zinc-950/80 p-1">
          {(() => {
            const { Icon, colorClass } = RATING_ICONS[series.rating];
            return <Icon size={14} className={colorClass} />;
          })()}
        </span>
      )}
    </div>
  );
}
