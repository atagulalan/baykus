import { useTranslation } from "react-i18next";
import type { EpisodeSummary, NextUnwatchedEpisode } from "../../../api/types.ts";
import { isEpisodeAired } from "../../../lib/airing.ts";
import { SectionPill } from "../../atoms/SectionPill/SectionPill.tsx";
import { EpisodeRow } from "../../organisms/EpisodeRow/EpisodeRow.tsx";

interface NextUpCardProps {
  episode: EpisodeSummary;
  nextEpisode: NextUnwatchedEpisode;
  promptEpisodeId: number | null;
  onToggleWatch: () => void;
  onWatchAgain: () => void;
  onEditDate: () => void;
  onBulkUpToHere: () => void;
  onRateEpisode: (value: 1 | 2 | 3 | null) => void;
  onDismissPrompt: () => void;
}

/** 011 E152 — single next-episode card on series detail (replaces E144 carousel). */
export function NextUpCard({
  episode,
  nextEpisode,
  promptEpisodeId,
  onToggleWatch,
  onWatchAgain,
  onEditDate,
  onBulkUpToHere,
  onRateEpisode,
  onDismissPrompt,
}: NextUpCardProps) {
  const { t } = useTranslation();
  const isAired = isEpisodeAired(episode);
  const hasUnwatchedBefore =
    episode.s > nextEpisode.s || (episode.s === nextEpisode.s && episode.e > nextEpisode.e);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-center py-1 list-inset">
        <SectionPill>
          <span className="font-semibold text-sm text-snow">{t("series.nextUp")}</span>
        </SectionPill>
      </div>
      <div className="flex justify-center list-inset">
        {/* w-auto hugs short episode titles, but as a flex item it would size to
            max-content and push the page wider than the viewport — min-w-0 lets
            it shrink so EpisodeRow's own truncation can take over. */}
        <section className="w-auto min-w-0 max-w-full overflow-hidden rounded-md border border-white/10 bg-void/95 backdrop-blur-md">
          <EpisodeRow
            embedded
            align="center"
            s={episode.s}
            e={episode.e}
            episodeTitle={episode.title}
            airDate={episode.airDate}
            airStamp={episode.airStamp}
            episodeType={episode.episodeType}
            runtimeMin={episode.runtimeMin}
            watchCount={episode.watchCount}
            overview={episode.overview}
            stillRef={episode.stillRef}
            lastWatchedAt={episode.lastWatchedAt}
            myRating={episode.myRating}
            watched={episode.watchCount > 0}
            muted={!isAired}
            checkboxDisabled={!isAired}
            onToggleWatch={onToggleWatch}
            onWatchAgain={onWatchAgain}
            onEditDate={onEditDate}
            onBulkUpToHere={onBulkUpToHere}
            hasUnwatchedBefore={hasUnwatchedBefore}
            showRatingPrompt={promptEpisodeId === episode.id}
            onRate={onRateEpisode}
            onDismissPrompt={onDismissPrompt}
          />
        </section>
      </div>
    </div>
  );
}
