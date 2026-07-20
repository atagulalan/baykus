import { type CSSProperties, Fragment } from "react";
import { SERIES_GRID_CLASSNAME } from "../../../lib/grid.ts";

const KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;

/** Base pulse fill — sharp by default; pass `rounded-*` for soft shapes. */
export function SkeletonBone({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-white/5 ${className}`.trim()} />;
}

/** Centered SectionPill stand-in (Library / Watch / Profile / Stats headings). */
export function SkeletonPill({ className = "" }: { className?: string }) {
  return (
    <SkeletonBone className={`h-7 w-32 rounded-full border border-white/10 ${className}`.trim()} />
  );
}

/** Sticky centered pill row — mirrors SectionHeader / HubSectionHeader / StatsSectionHeading. */
export function SkeletonSectionHeader({ inset = "list" }: { inset?: "page" | "list" | "content" }) {
  const insetClass =
    inset === "list" ? "list-inset" : inset === "content" ? "content-inset" : "px-3 sm:px-6";
  return (
    <div
      className={`flex items-center justify-center py-1 ${insetClass}`}
      style={{ top: "var(--app-header-height, 3.5rem)" }}
    >
      <SkeletonPill />
    </div>
  );
}

/** Portrait poster bone — matches SeriesCard / detail hero poster chrome. */
export function SkeletonPoster({ className = "" }: { className?: string }) {
  return <SkeletonBone className={`aspect-[2/3] rounded-md ${className}`.trim()} />;
}

/** One SeriesCard-shaped cell (padding + poster + title/progress lines). */
export function SkeletonSeriesCard() {
  return (
    <div className="flex flex-col rounded-md px-1.5 py-1.5 sm:px-3 sm:py-3" aria-hidden>
      <SkeletonPoster className="w-full" />
      <div className="mt-2 flex flex-col gap-1.5 px-0.5">
        <SkeletonBone className="h-3 w-3/4 rounded" />
        <SkeletonBone className="h-1.5 w-full rounded-sm" />
      </div>
    </div>
  );
}

/** Shared poster grid used by Browse / Favorites / All-Series / Profile hub. */
export function SkeletonSeriesGrid({ count = 6 }: { count?: number }) {
  return (
    <div className={SERIES_GRID_CLASSNAME}>
      {KEYS.slice(0, count).map((key) => (
        <SkeletonSeriesCard key={key} />
      ))}
    </div>
  );
}

/** Category section: sticky pill + poster grid (Browse grid loading). */
export function SkeletonCategoryGrid({ sections = 2 }: { sections?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {KEYS.slice(0, sections).map((key) => (
        <section key={key} className="flex flex-col">
          <SkeletonSectionHeader inset="list" />
          <SkeletonSeriesGrid count={6} />
        </section>
      ))}
    </div>
  );
}

/**
 * WatchNextRow / HistoryRow stand-in — stretch poster rail + title/meta + checkbox.
 */
export function SkeletonEpisodeRow() {
  return (
    <div className="flex min-w-0 items-stretch gap-0 rounded-md py-2 pl-3 pr-3" aria-hidden>
      <SkeletonBone className="min-h-14 w-12 shrink-0 self-stretch rounded-md sm:w-14" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 pl-4">
        <SkeletonBone className="h-3.5 w-40 max-w-[70%] rounded" />
        <SkeletonBone className="h-2.5 w-28 max-w-[50%] rounded" />
      </div>
      <SkeletonBone className="my-auto h-5 w-5 shrink-0 rounded-full" />
    </div>
  );
}

/** Category list section: sticky pill + episode rows (Browse list / Watch History). */
export function SkeletonEpisodeList({
  rows = 5,
  withHeader = true,
}: {
  rows?: number;
  withHeader?: boolean;
}) {
  return (
    <section className="flex flex-col">
      {withHeader ? <SkeletonSectionHeader inset="list" /> : null}
      <div className="flex flex-col gap-0 pt-2">
        {KEYS.slice(0, rows).map((key) => (
          <SkeletonEpisodeRow key={key} />
        ))}
      </div>
    </section>
  );
}

/** Profile hub stats — text row with short hairline dividers. */
export function SkeletonHubStatTiles() {
  return (
    <div className="flex items-center px-3" aria-hidden>
      {KEYS.slice(0, 3).map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? <div className="h-8 w-px shrink-0 bg-white/10" /> : null}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <SkeletonBone className="h-2.5 w-16 rounded" />
            <SkeletonBone className="h-6 w-12 rounded" />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** Profile hub: stats tiles + two poster sections with pills. */
export function SkeletonProfileHub() {
  return (
    <>
      <SkeletonHubStatTiles />
      {KEYS.slice(0, 2).map((key) => (
        <section key={key} className="flex flex-col gap-3">
          <SkeletonSectionHeader inset="content" />
          <SkeletonSeriesGrid count={6} />
        </section>
      ))}
    </>
  );
}

/** Stats hero: big duration + 6-up tile grid (HeroSection parity). */
export function SkeletonStatsHero() {
  return (
    <div className="content-inset flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 py-4">
        <SkeletonBone className="h-14 w-48 rounded sm:h-16 sm:w-56" />
        <SkeletonBone className="h-3 w-56 max-w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {KEYS.slice(0, 6).map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-3 rounded-md border border-white/10 bg-white/5 p-6"
            aria-hidden
          >
            <SkeletonBone className="h-2.5 w-16 rounded" />
            <SkeletonBone className="h-8 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats page: hero + a couple of pill-headed section shells. */
export function SkeletonStatsPage() {
  return (
    <div className="flex flex-col gap-10">
      <SkeletonStatsHero />
      {KEYS.slice(0, 2).map((key) => (
        <section key={key} className="content-inset flex flex-col gap-4">
          <SkeletonSectionHeader inset="page" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {KEYS.slice(0, 3).map((tile) => (
              <div
                key={tile}
                className="flex flex-col items-center gap-3 rounded-md border border-white/10 bg-white/5 p-6"
                aria-hidden
              >
                <SkeletonBone className="h-2.5 w-16 rounded" />
                <SkeletonBone className="h-8 w-14 rounded" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Series detail hero loading shell — backdrop plane + poster + title (E146 / E51). */
export function SkeletonSeriesDetailHero({
  posterStyle,
}: {
  posterStyle?: CSSProperties | undefined;
}) {
  return (
    <section className="relative -mt-[var(--app-header-height)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <SkeletonBone className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/20 to-void" />
      </div>
      <div className="relative z-10 flex min-h-[24rem] items-end gap-4 px-3 pb-6 pt-20 sm:min-h-[30rem] sm:gap-6 sm:px-4 sm:pt-32">
        {/* VT name on the poster container so the morph continues through loading. */}
        <div
          className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md shadow-2xl sm:w-40"
          style={posterStyle}
          aria-hidden
        >
          <SkeletonBone className="size-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 pb-1">
          <SkeletonBone className="h-8 w-2/3 max-w-sm rounded sm:h-10" />
          <SkeletonBone className="h-3 w-40 rounded" />
          <SkeletonBone className="mt-1 h-1.5 w-48 max-w-full rounded-sm" />
        </div>
      </div>
    </section>
  );
}

/** Series preview loading — poster + meta column (non-hero layout). */
export function SkeletonSeriesPreview() {
  return (
    <div className="content-inset flex flex-col gap-4 sm:flex-row">
      <SkeletonPoster className="w-40 shrink-0" />
      <div className="flex flex-1 flex-col gap-3">
        <SkeletonBone className="h-10 w-2/3 max-w-md rounded" />
        <SkeletonBone className="h-3 w-48 rounded" />
        <div className="flex flex-wrap gap-1">
          {KEYS.slice(0, 3).map((key) => (
            <SkeletonBone key={key} className="h-5 w-16 rounded" />
          ))}
        </div>
        <SkeletonBone className="h-20 w-full max-w-prose rounded" />
        <SkeletonBone className="mt-2 h-10 w-36 rounded" />
      </div>
    </div>
  );
}

/** Calendar timeline: a few pill sections with episode rows. */
export function SkeletonCalendarTimeline() {
  return (
    <div className="flex flex-col gap-6">
      {KEYS.slice(0, 3).map((key) => (
        <SkeletonEpisodeList key={key} rows={3} />
      ))}
    </div>
  );
}

/** Calendar month grid: weekday headers + cell bones (desktop). */
export function SkeletonMonthGrid() {
  return (
    <div
      className="grid grid-cols-7 gap-px overflow-hidden border border-white/5 bg-white/5"
      aria-hidden
    >
      {KEYS.slice(0, 7).map((key) => (
        <div key={`h-${key}`} className="bg-void px-2 py-3">
          <SkeletonBone className="mx-auto h-2 w-8 rounded" />
        </div>
      ))}
      {KEYS.slice(0, 7).map((key) => (
        <div key={`r1-${key}`} className="flex min-h-24 flex-col gap-1 bg-[#101010] p-1.5">
          <SkeletonBone className="h-2.5 w-4 rounded" />
          <SkeletonBone className="h-3 w-full rounded" />
        </div>
      ))}
      {KEYS.slice(0, 7).map((key) => (
        <div key={`r2-${key}`} className="flex min-h-24 flex-col gap-1 bg-[#101010] p-1.5">
          <SkeletonBone className="h-2.5 w-4 rounded" />
        </div>
      ))}
      {KEYS.slice(0, 7).map((key) => (
        <div key={`r3-${key}`} className="flex min-h-24 flex-col gap-1 bg-[#101010] p-1.5">
          <SkeletonBone className="h-2.5 w-4 rounded" />
          <SkeletonBone className="h-3 w-full rounded" />
          <SkeletonBone className="h-3 w-3/4 rounded" />
        </div>
      ))}
      {KEYS.slice(0, 7).map((key) => (
        <div key={`r4-${key}`} className="flex min-h-24 flex-col gap-1 bg-[#101010] p-1.5">
          <SkeletonBone className="h-2.5 w-4 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Calendar schedule: stacked strip rows. */
export function SkeletonScheduleGrid() {
  return (
    <div className="flex flex-col gap-px border-t border-white/5" aria-hidden>
      {KEYS.slice(0, 6).map((key) => (
        <div key={key} className="flex items-center gap-3 bg-[#101010] px-3 py-3">
          <SkeletonBone className="h-10 w-8 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SkeletonBone className="h-3 w-32 max-w-[50%] rounded" />
            <SkeletonBone className="h-2.5 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Settings: sticky pill + hairline row bones. */
export function SkeletonSettingsSections({ sections = 2 }: { sections?: number }) {
  return (
    <div className="content-inset flex max-w-lg flex-col">
      {KEYS.slice(0, sections).map((key) => (
        <section key={key} className="mb-8 flex flex-col gap-2">
          <div className="flex justify-center py-1">
            <SkeletonPill />
          </div>
          <div className="flex flex-col">
            {KEYS.slice(0, 3).map((row) => (
              <div
                key={row}
                className="flex items-center justify-between border-b border-white/5 px-4 py-3.5 last:border-b-0 sm:px-5"
              >
                <SkeletonBone className="h-3.5 w-28 rounded" />
                <SkeletonBone className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
