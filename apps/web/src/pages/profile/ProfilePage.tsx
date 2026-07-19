import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Camera, ChevronRight, Clapperboard, Heart, History, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getSettings, getStats, listSeries } from "../../api/client.ts";
import type { AuthSession, SeriesSummary, Stats } from "../../api/types.ts";
import { PageTitle } from "../../components/atoms/PageTitle/PageTitle.tsx";
import { SectionPill } from "../../components/atoms/SectionPill/SectionPill.tsx";
import { SkeletonProfileHub } from "../../components/atoms/Skeleton/Skeleton.tsx";
import { ProfileGuard } from "../../components/layout/ProfileGuard/ProfileGuard.tsx";
import { SeriesCard } from "../../components/molecules/SeriesCard/SeriesCard.tsx";
import { ProfileBannerPicker } from "../../components/organisms/ProfileBannerPicker/ProfileBannerPicker.tsx";
import { ProfilePhotoUpload } from "../../components/organisms/ProfilePhotoUpload/ProfilePhotoUpload.tsx";
import { formatDurationLabel, formatDurationParts } from "../../lib/date.ts";
import { SERIES_GRID_CLASSNAME } from "../../lib/grid.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { StatTile } from "./stats/components/StatTile/StatTile.tsx";

/** E79: the preview grid shows at most this many favorites; beyond it the heading links to the full page. */
const PROFILE_FAVORITES_LIMIT = 6;

/** WP4: same overflow-to-full-page preview pattern for All-Series (item 1). */
const PROFILE_ALL_SERIES_LIMIT = 6;

/** Sticky offset shared with the library/watch section pills (SectionHeader parity). */
const HUB_HEADER_TOP = "var(--app-header-height, 3.5rem)";

/** Hover-fill target when a section pill doubles as a "see all" link — mirrors SectionHeader. */
const HUB_LINK_CLASS =
  "group inline-flex min-w-0 items-center gap-1.5 rounded-full -mx-2.5 px-2.5 py-1 transition-colors hover:bg-white/5 sm:-mx-3 sm:px-3";

/** E58: favorites rail order — most recently watched first, nulls last. Shared with FavoritesPage (E79). */
export function byLastWatchedDesc(
  a: { lastWatchedAt: string | null },
  b: { lastWatchedAt: string | null },
) {
  if (a.lastWatchedAt === b.lastWatchedAt) return 0;
  if (a.lastWatchedAt === null) return 1;
  if (b.lastWatchedAt === null) return -1;
  return a.lastWatchedAt < b.lastWatchedAt ? 1 : -1;
}

/**
 * Section-pill label matching the library/watch theme: icon · label · | · count.
 * The trailing chevron only shows when the pill links to a full page.
 */
function HubHeaderContent({
  icon: Icon,
  label,
  count,
  linked,
}: {
  icon: LucideIcon;
  label: string;
  count?: number | undefined;
  linked?: boolean | undefined;
}) {
  return (
    <>
      <Icon size={14} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
      <span className="min-w-0 truncate font-semibold text-sm text-snow">{label}</span>
      {count != null ? (
        <>
          <span className="shrink-0 text-muted/35" aria-hidden="true">
            |
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</span>
        </>
      ) : null}
      {linked ? (
        <ChevronRight
          size={14}
          className="shrink-0 text-muted transition-colors group-hover:text-snow"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

/** Sticky centered section pill — the app-wide heading chrome (Library, Watch, Calendar). */
function HubSectionHeader({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky z-30 flex justify-center px-3 py-1 sm:px-0"
      style={{ top: HUB_HEADER_TOP }}
    >
      <SectionPill>{children}</SectionPill>
    </div>
  );
}

/**
 * WP4 / E79: a poster preview using the shared library grid (SERIES_GRID_CLASSNAME),
 * capped at `limit` under a sticky section pill. `heading` is either a plain label or
 * a "see all" Link built by the caller so TanStack Router keeps its per-route typing.
 */
function SeriesGridSection({
  heading,
  items,
  limit,
  emptyText,
}: {
  heading: ReactNode;
  items: SeriesSummary[];
  limit: number;
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <HubSectionHeader>{heading}</HubSectionHeader>
      {items.length === 0 ? (
        <p className="px-3 font-mono text-xs text-muted/70 sm:px-0">{emptyText}</p>
      ) : (
        <div className={SERIES_GRID_CLASSNAME}>
          {items.slice(0, limit).map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Shared error panel + retry, styled like the calendar/stats surfaces. */
function HubError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-24 text-center sm:px-0">
      <p className="text-muted">{t("errors.generic")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-snow"
      >
        {t("errors.retry")}
      </button>
    </div>
  );
}

function IdentityRow({
  session,
  handle,
  avatarRef,
  onEditBanner,
}: {
  session: AuthSession;
  handle: string;
  avatarRef: string | null;
  onEditBanner: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 px-3 sm:px-6 lg:px-3">
      <ProfilePhotoUpload avatarRef={avatarRef} />
      <div className="flex-1">
        <PageTitle>{session.mode === "single" ? t("profile.title") : `@${handle}`}</PageTitle>
      </div>
      <button
        type="button"
        onClick={onEditBanner}
        aria-label={t("profile.banner.edit")}
        title={t("profile.banner.edit")}
        className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow"
      >
        <Camera size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <Link
        to="/settings"
        viewTransition={pageViewTransition}
        aria-label={t("app.nav.settings")}
        className="hidden h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow sm:flex"
      >
        <Settings size={20} strokeWidth={1.5} />
      </Link>
    </div>
  );
}

/** The below-identity hub: stats tiles, favorites/all-series grids, history link. */
function ProfileHub({
  handle,
  stats,
  allSeries,
  total,
}: {
  handle: string;
  stats: Stats | undefined;
  allSeries: SeriesSummary[];
  total: number;
}) {
  const { t } = useTranslation();

  const favorites = allSeries.filter((series) => series.favorite).sort(byLastWatchedDesc);
  const timeSpentValue = formatDurationLabel(formatDurationParts(stats?.watchTimeMin ?? 0), t);

  return (
    <>
      {/* 011 E153: stats first, then favorites, then all series. */}
      <Link
        to="/user/$handle/stats"
        params={{ handle }}
        viewTransition={pageViewTransition}
        className="grid grid-cols-3 gap-4 px-3 transition-opacity hover:opacity-80"
      >
        <StatTile size="compact" label={t("stats.timeSpent")} value={timeSpentValue} />
        <StatTile
          size="compact"
          label={t("stats.episodesWatched")}
          value={(stats?.episodesWatched ?? 0).toLocaleString("tr-TR")}
        />
        <StatTile
          size="compact"
          label={t("stats.activeSeries")}
          value={(stats?.itemCount.watching ?? 0).toLocaleString("tr-TR")}
        />
      </Link>

      <SeriesGridSection
        heading={
          favorites.length > PROFILE_FAVORITES_LIMIT ? (
            <Link
              to="/user/$handle/favorites"
              params={{ handle }}
              viewTransition={pageViewTransition}
              className={HUB_LINK_CLASS}
            >
              <HubHeaderContent
                icon={Heart}
                label={t("profile.favorites.title")}
                count={favorites.length}
                linked
              />
            </Link>
          ) : (
            <HubHeaderContent
              icon={Heart}
              label={t("profile.favorites.title")}
              count={favorites.length}
            />
          )
        }
        items={favorites}
        limit={PROFILE_FAVORITES_LIMIT}
        emptyText={t("profile.favorites.empty")}
      />

      <SeriesGridSection
        heading={
          allSeries.length > PROFILE_ALL_SERIES_LIMIT ? (
            <Link
              to="/user/$handle/all-series"
              params={{ handle }}
              viewTransition={pageViewTransition}
              className={HUB_LINK_CLASS}
            >
              <HubHeaderContent
                icon={Clapperboard}
                label={t("profile.allSeries")}
                count={total}
                linked
              />
            </Link>
          ) : (
            <HubHeaderContent icon={Clapperboard} label={t("profile.allSeries")} count={total} />
          )
        }
        items={allSeries}
        limit={PROFILE_ALL_SERIES_LIMIT}
        emptyText={t("profile.allSeriesEmpty")}
      />

      <section className="flex flex-col">
        <HubSectionHeader>
          <Link to="/watch/history" viewTransition={pageViewTransition} className={HUB_LINK_CLASS}>
            <HubHeaderContent icon={History} label={t("watch.history")} linked />
          </Link>
        </HubSectionHeader>
      </section>
    </>
  );
}

export function ProfilePage() {
  const { handle } = useParams({ from: "/user/$handle" });

  return (
    <ProfileGuard handle={handle} to="/user/$handle">
      {(session) => <ProfilePageContent handle={handle} session={session} />}
    </ProfileGuard>
  );
}

function ProfilePageContent({ handle, session }: { handle: string; session: AuthSession }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const statsQuery = useQuery({ queryKey: ["stats", tz], queryFn: () => getStats(tz) });
  const libraryQuery = useQuery({
    queryKey: ["library", "lastWatched"],
    queryFn: () => listSeries({ sort: "lastWatched" }),
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const allSeries = libraryQuery.data?.items ?? [];
  const bannerCandidates = allSeries
    .filter((series) => series.backdropRef !== null)
    .sort(byLastWatchedDesc);
  const settings = settingsQuery.data;

  const hubLoading = statsQuery.isLoading || libraryQuery.isLoading;
  const hubError = statsQuery.isError || libraryQuery.isError;

  return (
    <div className="flex flex-col gap-6">
      <ProfileBannerPicker bannerRef={settings?.bannerRef ?? null} candidates={bannerCandidates}>
        {(openBannerPicker) => (
          <IdentityRow
            session={session}
            handle={handle}
            avatarRef={settings?.avatarRef ?? null}
            onEditBanner={openBannerPicker}
          />
        )}
      </ProfileBannerPicker>

      {hubLoading ? (
        <div className="flex flex-col gap-6 sm:px-3 lg:px-0">
          <SkeletonProfileHub />
        </div>
      ) : hubError ? (
        <div className="sm:px-3 lg:px-0">
          <HubError
            onRetry={() => {
              if (statsQuery.isError) statsQuery.refetch();
              if (libraryQuery.isError) libraryQuery.refetch();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:px-3 lg:px-0">
          <ProfileHub
            handle={handle}
            stats={statsQuery.data}
            allSeries={allSeries}
            total={libraryQuery.data?.total ?? allSeries.length}
          />
        </div>
      )}
    </div>
  );
}
