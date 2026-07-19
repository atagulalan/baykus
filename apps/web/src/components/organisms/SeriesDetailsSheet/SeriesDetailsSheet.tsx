import { Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildImageUrl } from "../../../api/images.ts";
import type { SeriesDetail } from "../../../api/types.ts";
import { formatAirDateLabel } from "../../../lib/airDateLabel.ts";
import { genreKey } from "../../../lib/genreKey.ts";
import { releaseStatusLabel } from "../../../lib/releaseStatusLabel.ts";
import { isStale } from "../../../lib/staleSweep.ts";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";
import { RatingControl } from "../../atoms/RatingControl/RatingControl.tsx";
import { CastRail } from "../../molecules/CastRail/CastRail.tsx";
import { Modal } from "../../molecules/Modal/Modal.tsx";

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

/** Human language name via the runtime's own data (no catalog keys) — null if the code is unknown. */
function languageDisplayName(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? null;
  } catch {
    return null;
  }
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

/** Label-left / value-right row — the sheet's one idiom for named single facts. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 text-right text-snow/80">{children}</span>
    </div>
  );
}

/** Release status reads as a state, so it is colour-coded like the episode tags. */
const RELEASE_STATUS_STYLES: Record<string, string> = {
  returning: "border-yellow/35 text-yellow",
  in_production: "border-yellow/35 text-yellow",
  planned: "border-sky-400/40 text-sky-300",
  pilot: "border-sky-400/40 text-sky-300",
  canceled: "border-red-400/40 text-red-300",
  ended: "border-white/20 text-muted",
};

/** Sits next to the series title (sheet header on mobile, restated row on desktop). */
function ReleaseStatusBadge({ status, label }: { status: string | null; label: string }) {
  const style = (status && RELEASE_STATUS_STYLES[status]) ?? "border-white/20 text-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${style}`}
    >
      {label}
    </span>
  );
}

interface SeriesDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detail: SeriesDetail;
  activeRegion: string;
  onRateChange: (value: 1 | 2 | 3 | null) => void;
  /** Preview (/series/new): hide library-only rows (added / refreshed / your rating). */
  preview?: boolean;
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
  preview = false,
}: SeriesDetailsSheetProps) {
  const { t, i18n } = useTranslation();

  const contentRating =
    detail.contentRatings.find((r) => r.region === activeRegion) ?? detail.contentRatings[0];
  const regionWatchProviders = detail.watchProviders.filter((wp) => wp.region === activeRegion);
  const avgRuntimeMin = averageEpisodeRuntimeMin(detail);
  const statusLabel = releaseStatusLabel(t, detail.releaseStatus);
  const originalLanguageName = detail.originalLanguage
    ? languageDisplayName(detail.originalLanguage, i18n.language)
    : null;
  const addedLabel = formatAirDateLabel(detail.addedAt.slice(0, 10), i18n.language, {
    isAbsoluteDate: true,
  });
  const stale = isStale(detail.lastRefreshedAt);
  const refreshedLabel = detail.lastRefreshedAt
    ? formatAirDateLabel(detail.lastRefreshedAt.slice(0, 10), i18n.language, {
        isAbsoluteDate: true,
      })
    : null;

  const statusBadge = statusLabel ? (
    <ReleaseStatusBadge status={detail.releaseStatus} label={statusLabel} />
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      desktop="modal"
      title={detail.title}
      {...(statusBadge ? { titleAccessory: statusBadge } : {})}
      className="flex flex-col gap-5 p-4"
    >
      {/* The desktop centered modal has no header bar, so the title (and the
          status badge anchored to it) is restated here at the sm breakpoint
          Modal itself switches on. The header's own h2 handles a11y. */}
      <div className="hidden items-center gap-2 sm:flex" aria-hidden>
        <h3 className="min-w-0 truncate font-display text-lg italic text-snow">{detail.title}</h3>
        {statusBadge}
      </div>

      {(detail.tagline || detail.overview) && (
        <div className="flex flex-col gap-1.5">
          {detail.tagline && <p className="text-sm italic text-muted">"{detail.tagline}"</p>}
          {detail.overview && <p className="text-sm text-snow/90">{detail.overview}</p>}
        </div>
      )}

      {detail.genres.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.genres")}</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {detail.genres.map((g) => (
              <span
                key={g.id ?? g.name}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-snow/80"
              >
                {t(`genres.${genreKey(g.name)}`, { defaultValue: g.name })}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>{t("series.details.tags")}</SectionHeader>
          <div className="flex flex-wrap gap-1.5">
            {detail.tags.map((tag) => (
              <span
                key={`${tag.source}-${tag.id ?? tag.name}`}
                className="rounded-full border border-yellow/25 bg-yellow/5 px-2.5 py-1 text-xs text-yellow"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionHeader>{t("series.details.info")}</SectionHeader>
        <div className="flex flex-col gap-1 text-sm">
          {detail.networks.length > 0 && (
            <InfoRow label={t("series.details.production")}>
              <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {detail.networks.map((n) => (
                  <LogoOrText key={n.name} src={buildImageUrl(n.logoRef, "thumb")} alt={n.name} />
                ))}
              </span>
            </InfoRow>
          )}
          {avgRuntimeMin != null && (
            <InfoRow label={t("series.details.runtime")}>
              <span className="font-mono text-xs tabular-nums">
                {t("episode.runtimeMin", { minutes: avgRuntimeMin })}
              </span>
            </InfoRow>
          )}
          {!preview && (
            <>
              <InfoRow label={t("series.details.added")}>
                <span className="font-mono text-xs tabular-nums">{addedLabel}</span>
              </InfoRow>
              <InfoRow label={t("series.details.refreshed")}>
                <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                  {refreshedLabel ?? t("series.details.neverRefreshed")}
                  {stale && (
                    <span className="rounded-full border border-yellow/40 px-1.5 py-0.5 font-sans text-[10px] text-yellow">
                      {t("series.details.stale")}
                    </span>
                  )}
                </span>
              </InfoRow>
            </>
          )}
          {contentRating && (
            <InfoRow label={t("series.details.contentRating")}>{contentRating.rating}</InfoRow>
          )}
          {originalLanguageName && (
            <InfoRow label={t("series.details.language")}>{originalLanguageName}</InfoRow>
          )}
        </div>
      </div>

      {(detail.externalRatings.length > 0 || !preview) && (
        <div className="flex flex-col gap-3">
          <SectionHeader>{t("series.details.ratings")}</SectionHeader>
          {detail.externalRatings.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {detail.externalRatings.map((r, i) => (
                <span key={r.source} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted/60">{t("common.separator")}</span>}
                  <Star size={12} strokeWidth={1.5} className="text-yellow" aria-hidden />
                  {r.source.toUpperCase()}{" "}
                  {(r.scale === 10 ? r.value : (r.value / r.scale) * 10).toFixed(1)}
                </span>
              ))}
            </p>
          )}
          {!preview && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t("series.details.yourRating")}
              </span>
              <RatingControl value={detail.rating} onChange={onRateChange} />
            </div>
          )}
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

      <CastRail cast={detail.cast} />
    </Modal>
  );
}
