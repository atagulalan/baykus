import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowUpDown, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SERIES_HEADER_ACTION_SLOT_ID } from "../../../lib/headerActionSlot.ts";
import { navigateBrowseView } from "../../../pages/browse/navigateBrowseView.ts";
import {
  GanttChart,
  HEADER_ACTION_CLASS,
  isBrowsePath,
  isCalendarPath,
  isProfileHeroPath,
  isSeriesHeroPath,
  isWatchHistoryPath,
  LayoutGrid,
  List,
} from "./layoutShared.ts";

/** Destination toggle: timeline ↔ schedule. Show the view the action opens. */
export function CalendarModeToggle({
  pathname,
  className = HEADER_ACTION_CLASS,
}: {
  pathname: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const scheduleActive = pathname === "/calendar/schedule";
  const destination = scheduleActive ? "/calendar" : "/calendar/schedule";
  const label = t(scheduleActive ? "calendar.mode.timeline" : "calendar.mode.schedule");
  const Icon = scheduleActive ? List : GanttChart;

  return (
    <Link to={destination} aria-label={label} title={label} className={className}>
      <Icon size={20} strokeWidth={1.5} />
    </Link>
  );
}

/** E159: toggles `order=oldest` on `/watch/history` (earliest window, not client reverse). */
export function HistorySortToggle({ className = HEADER_ACTION_CLASS }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { order } = useSearch({ from: "/watch/history" });
  const oldestFirst = order === "oldest";

  return (
    <button
      type="button"
      onClick={() => {
        void navigate({
          to: "/watch/history",
          search: oldestFirst ? {} : { order: "oldest" },
          replace: true,
        });
      }}
      aria-label={t("library.filter.sortTitle")}
      title={t("library.filter.sortTitle")}
      aria-pressed={oldestFirst}
      className={`${className}${oldestFirst ? " text-yellow" : ""}`}
    >
      <ArrowUpDown size={20} strokeWidth={1.75} />
    </button>
  );
}

/** Destination toggle: list (`/watch`) ↔ grid (`/`). Show the view the action opens. */
export function BrowseViewToggle({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onLibrary = pathname === "/";

  if (onLibrary) {
    return (
      <button
        type="button"
        onClick={() => navigateBrowseView(navigate, "list")}
        aria-label={t("library.view.list")}
        title={t("library.view.list")}
        className={HEADER_ACTION_CLASS}
      >
        <List size={20} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigateBrowseView(navigate, "grid")}
      aria-label={t("library.view.grid")}
      title={t("library.view.grid")}
      className={HEADER_ACTION_CLASS}
    >
      <LayoutGrid size={20} strokeWidth={1.5} />
    </button>
  );
}

/**
 * Mobile header right slot — one fixed-size affordance that changes by route:
 * browse → destination view toggle; calendar → schedule toggle; profile → settings.
 * Empty spacer otherwise so the centered wordmark stays put.
 */
export function MobileHeaderAction({ pathname }: { pathname: string }) {
  const { t } = useTranslation();

  if (isBrowsePath(pathname)) {
    return <BrowseViewToggle pathname={pathname} />;
  }
  if (isCalendarPath(pathname)) {
    return <CalendarModeToggle pathname={pathname} />;
  }
  if (isWatchHistoryPath(pathname)) {
    return <HistorySortToggle />;
  }
  if (isProfileHeroPath(pathname)) {
    return (
      <Link
        to="/settings"
        aria-label={t("app.nav.settings")}
        title={t("app.nav.settings")}
        className={HEADER_ACTION_CLASS}
      >
        <Settings size={20} strokeWidth={1.5} />
      </Link>
    );
  }
  if (isSeriesHeroPath(pathname)) {
    // Empty portal target — SeriesDetailPage renders its overflow-menu trigger here on mobile.
    return <div id={SERIES_HEADER_ACTION_SLOT_ID} className={HEADER_ACTION_CLASS} />;
  }
  return <div className="h-11 w-11 shrink-0" />;
}
