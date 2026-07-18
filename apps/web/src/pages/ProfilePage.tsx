import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Camera, ChevronRight, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getSettings, getStats, listSeries } from "../api/client.ts";
import type { AuthSession } from "../api/types.ts";
import { PageTitle } from "../components/PageTitle.tsx";
import { ProfileBannerPicker } from "../components/ProfileBannerPicker.tsx";
import { ProfileGuard } from "../components/ProfileGuard.tsx";
import { ProfilePhotoUpload } from "../components/ProfilePhotoUpload.tsx";
import { SeriesCard } from "../components/SeriesCard.tsx";
import { formatDurationLabel, formatDurationParts } from "../lib/date.ts";

/** E79: the rail shows at most this many favorites; beyond it the heading links to the full page. */
const PROFILE_FAVORITES_LIMIT = 6;

/** WP4: same overflow-to-full-page rail pattern for All-Series (item 1). */
const PROFILE_ALL_SERIES_LIMIT = 6;

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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border border-white/5 bg-[#101010] p-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="font-display italic text-snow text-2xl leading-none tracking-tight">{value}</p>
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
    <div className="content-inset flex items-center gap-4">
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
        aria-label={t("app.nav.settings")}
        className="hidden h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow sm:flex"
      >
        <Settings size={20} strokeWidth={1.5} />
      </Link>
    </div>
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
  const { t } = useTranslation();

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const statsQuery = useQuery({ queryKey: ["stats", tz], queryFn: () => getStats(tz) });
  const libraryQuery = useQuery({
    queryKey: ["library", "lastWatched"],
    queryFn: () => listSeries({ sort: "lastWatched" }),
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const allSeries = libraryQuery.data?.items ?? [];
  const favorites = allSeries.filter((series) => series.favorite).sort(byLastWatchedDesc);
  const bannerCandidates = allSeries
    .filter((series) => series.backdropRef !== null)
    .sort(byLastWatchedDesc);
  const stats = statsQuery.data;
  const settings = settingsQuery.data;

  const timeSpentValue = formatDurationLabel(formatDurationParts(stats?.watchTimeMin ?? 0), t);

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

      {/* 011 E153: stats first, then favorites, then all series. */}
      <Link
        to="/user/$handle/stats"
        params={{ handle }}
        className="content-inset grid grid-cols-3 gap-3 transition-opacity hover:opacity-80"
      >
        <StatTile label={t("stats.timeSpent")} value={timeSpentValue} />
        <StatTile
          label={t("stats.episodesWatched")}
          value={(stats?.episodesWatched ?? 0).toLocaleString("tr-TR")}
        />
        <StatTile
          label={t("stats.activeSeries")}
          value={(stats?.itemCount.watching ?? 0).toLocaleString("tr-TR")}
        />
      </Link>

      <section className="content-inset flex flex-col gap-3">
        {favorites.length > PROFILE_FAVORITES_LIMIT ? (
          <h2 className="font-mono text-xs uppercase tracking-widest text-yellow">
            <Link
              to="/user/$handle/favorites"
              params={{ handle }}
              className="group flex min-h-11 items-center gap-2"
            >
              <span>{t("profile.favorites.title")}</span>
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-snow">
                {favorites.length}
              </span>
              <ChevronRight
                size={14}
                className="text-muted transition-colors group-hover:text-snow"
                aria-hidden="true"
              />
            </Link>
          </h2>
        ) : (
          <h2 className="font-mono text-xs uppercase tracking-widest text-yellow">
            {t("profile.favorites.title")}
          </h2>
        )}
        {favorites.length === 0 ? (
          <p className="font-mono text-xs text-muted/70">{t("profile.favorites.empty")}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.slice(0, PROFILE_FAVORITES_LIMIT).map((series) => (
              <div key={series.id} className="w-24 shrink-0 sm:w-28">
                <SeriesCard series={series} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="content-inset flex flex-col gap-3">
        {allSeries.length > PROFILE_ALL_SERIES_LIMIT ? (
          <h2 className="font-mono text-xs uppercase tracking-widest text-yellow">
            <Link
              to="/user/$handle/all-series"
              params={{ handle }}
              className="group flex min-h-11 items-center gap-2"
            >
              <span>{t("profile.allSeries")}</span>
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-snow">
                {libraryQuery.data?.total ?? allSeries.length}
              </span>
              <ChevronRight
                size={14}
                className="text-muted transition-colors group-hover:text-snow"
                aria-hidden="true"
              />
            </Link>
          </h2>
        ) : (
          <h2 className="font-mono text-xs uppercase tracking-widest text-yellow">
            {t("profile.allSeries")}
          </h2>
        )}
        {allSeries.length === 0 ? (
          <p className="font-mono text-xs text-muted/70">{t("profile.allSeriesEmpty")}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {allSeries.slice(0, PROFILE_ALL_SERIES_LIMIT).map((series) => (
              <div key={series.id} className="w-24 shrink-0 sm:w-28">
                <SeriesCard series={series} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
