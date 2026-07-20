import { useTranslation } from "react-i18next";
import { CircularProgress } from "../../atoms/CircularProgress/CircularProgress.tsx";
import { SectionPill } from "../../atoms/SectionPill/SectionPill.tsx";

interface CollapsedSeasonsGapProps {
  /** How many fully-watched seasons are hidden behind this control. */
  count: number;
  onExpand: () => void;
}

/** E165: pill that reveals fully-watched seasons before the active one (not sticky). */
export function CollapsedSeasonsGap({ count, onExpand }: CollapsedSeasonsGapProps) {
  const { t } = useTranslation();
  const ariaLabel = t("series.hiddenSeasonsWatched", { count });

  return (
    <div className="flex items-center justify-center py-1 list-inset">
      <SectionPill padding="default">
        <button
          type="button"
          onClick={onExpand}
          aria-label={ariaLabel}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full -mx-2.5 px-2.5 py-1 transition-colors hover:bg-white/5 sm:-mx-3 sm:px-3"
        >
          <CircularProgress value={100} complete />
          <span className="font-semibold text-sm text-snow">{ariaLabel}</span>
        </button>
      </SectionPill>
    </div>
  );
}
