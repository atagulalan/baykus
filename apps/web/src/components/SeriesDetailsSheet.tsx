import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../api/images.ts";
import type { SeriesDetail } from "../api/types.ts";
import { genreKey } from "../lib/genreKey.ts";
import { CastRail } from "./CastRail.tsx";
import { MediaImage } from "./MediaImage.tsx";
import { Modal } from "./Modal.tsx";
import { RatingControl } from "./RatingControl.tsx";

/** Falls back to plain text if the logo 404s (e.g. its provider isn't registered right now). */
function LogoOrText({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span>{alt}</span>;
  return (
    <MediaImage
      src={src}
      alt={alt}
      wrapperClassName="inline-block h-4 min-w-4 align-middle"
      className="h-4 object-contain"
      spinnerSize={10}
      onError={() => setFailed(true)}
    />
  );
}

/** Decorative icon that just disappears on a 404 instead of showing a broken-image glyph. */
function DecorativeLogo({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <MediaImage
      src={src}
      alt=""
      wrapperClassName="inline-block"
      className={className}
      spinnerSize={10}
      onError={() => setFailed(true)}
    />
  );
}

/** Prefer provider typical runtimes; else average known per-episode runtimes. */
function averageEpisodeRuntimeMin(detail: SeriesDetail): number | null {
  const fromItem = detail.episodeRunTimes ?? [];
  if (fromItem.length > 0) {
    return Math.round(fromItem.reduce((a, b) => a + b, 0) / fromItem.length);
  }
  const fromEpisodes = detail.seasons
    .flatMap((season) => season.episodes)
    .map((ep) => ep.runtimeMin)
    .filter((m): m is number => m != null);
  if (fromEpisodes.length === 0) return null;
  return Math.round(fromEpisodes.reduce((a, b) => a + b, 0) / fromEpisodes.length);
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted">{children}</h3>;
}

interface SeriesDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detail: SeriesDetail;
  activeRegion: string;
  onRateChange: (value: 1 | 2 | 3 | null) => void;
}

/** WP3 (spec 010): the series detail page's dense metadata — status/tags/networks/
 * content rating/runtime/ratings/providers/your-rating/cast — moved off the inner
 * screen into a bottom sheet (mobile) / anchored popover (desktop), reusing Modal. */
export function SeriesDetailsSheet({
  isOpen,
  onClose,
  detail,
  activeRegion,
  onRateChange,
}: SeriesDetailsSheetProps) {
  const { t } = useTranslation();

  const contentRating =
    detail.contentRatings.find((r) => r.region === activeRegion) ?? detail.contentRatings[0];
  const regionWatchProviders = detail.watchProviders.filter((wp) => wp.region === activeRegion);
  const avgRuntimeMin = averageEpisodeRuntimeMin(detail);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      desktop="popover"
      popoverClassName="w-[26rem] max-h-[75vh] overflow-y-auto"
      title={t("series.details.title")}
      className="flex flex-col gap-5 p-4"
    >
      {(detail.tagline || detail.overview) && (
        <div className="flex flex-col gap-1.5">
          {detail.tagline && <p className="text-sm italic text-muted">"{detail.tagline}"</p>}
          {detail.overview && <p className="text-sm text-snow/90">{detail.overview}</p>}
        </div>
      )}

      {detail.genres.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.genres")}</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {detail.genres.map((g) => (
              <span key={g.id ?? g.name} className="bg-white/5 px-2 py-0.5 text-xs text-muted">
                {t(`genres.${genreKey(g.name)}`, { defaultValue: g.name })}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.tags")}</SectionHeader>
          <div className="flex flex-wrap gap-1">
            {detail.tags.map((tag) => (
              <span
                key={`${tag.source}-${tag.id ?? tag.name}`}
                className="bg-white/5 px-2 py-0.5 text-xs text-yellow"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {(detail.networks.length > 0 || contentRating || avgRuntimeMin != null) && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.production")}</SectionHeader>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {detail.networks.map((n) => (
              <LogoOrText key={n.name} src={buildImageUrl(n.logoRef, "thumb")} alt={n.name} />
            ))}
            {contentRating && (
              <span className="border border-white/10 px-1.5 py-0.5 text-xs">
                {contentRating.rating}
              </span>
            )}
            {avgRuntimeMin != null && (
              <span className="font-mono text-xs tabular-nums">
                {t("episode.runtimeMin", { minutes: avgRuntimeMin })}
              </span>
            )}
          </div>
        </div>
      )}

      {detail.externalRatings.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.ratings")}</SectionHeader>
          <p className="text-sm text-muted">
            {detail.externalRatings.map((r, i) => (
              <span key={r.source}>
                {i > 0 && t("common.separator")}⭐ {r.source.toUpperCase()}{" "}
                {(r.scale === 10 ? r.value : (r.value / r.scale) * 10).toFixed(1)}
              </span>
            ))}
          </p>
        </div>
      )}

      {regionWatchProviders.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.providers")}</SectionHeader>
          <div className="flex flex-wrap items-center gap-2">
            {regionWatchProviders.map((wp) => (
              <span
                key={`${wp.provider}-${wp.type}-${wp.region}`}
                className="flex items-center gap-1 bg-white/5 px-2 py-1 text-xs text-snow"
              >
                <DecorativeLogo
                  src={buildImageUrl(wp.logoRef, "thumb")}
                  className="h-4 w-4 object-cover"
                />
                {wp.provider} ({wp.region})
              </span>
            ))}
          </div>
          <p className="text-xs text-muted">{t("series.justwatchAttribution")}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("series.details.yourRating")}</SectionHeader>
        <RatingControl value={detail.rating} onChange={onRateChange} />
      </div>

      <CastRail cast={detail.cast} />
    </Modal>
  );
}
