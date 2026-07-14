import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getCalendar } from "../api/client.ts";
import type { CalendarEntry } from "../api/types.ts";
import { useToast } from "../lib/toast.tsx";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(
    new Date(`${dateStr}T00:00:00Z`),
  );
}

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

function CalendarEntryRow({
  entry,
  onToggleWatched,
}: {
  entry: CalendarEntry;
  onToggleWatched?: () => void;
}) {
  const { t } = useTranslation();
  const provider = entry.watchProviders[0];
  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-900">
      {onToggleWatched && (
        <input
          type="checkbox"
          onChange={onToggleWatched}
          aria-label={t("episode.toggleWatched")}
          className="h-4 w-4 shrink-0 accent-emerald-500"
        />
      )}
      <Link to="/series/$id" params={{ id: String(entry.itemId) }} className="flex flex-1 gap-2">
        <span className="flex-1 truncate">
          {entry.title} S{entry.s}E{entry.e}
          {entry.episodeType === "finale" && (
            <span className="ml-2 rounded bg-red-900 px-1.5 py-0.5 font-semibold text-[10px] text-red-100">
              {t("episode.finale")}
            </span>
          )}
        </span>
        {(provider || entry.network) && (
          <span className="shrink-0 text-xs text-zinc-500">
            {provider ? `${provider.provider} (${provider.region})` : entry.network}
          </span>
        )}
      </Link>
    </div>
  );
}

export function CalendarPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["calendar"], queryFn: () => getCalendar() });

  const markWatched = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />
        <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-zinc-400">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const data = query.data;
  if (!data) return null;

  const today = todayIso();

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-sm text-zinc-300">{t("calendar.upcoming")}</h2>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("calendar.empty.upcoming")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.upcoming.map((day) => (
              <div key={day.date} className="flex flex-col gap-1">
                <h3 className="text-xs text-zinc-500 uppercase">
                  {day.date === today
                    ? t("calendar.today", { date: formatShortDate(day.date) })
                    : formatDayHeader(day.date)}
                </h3>
                {day.entries.map((entry) => (
                  <CalendarEntryRow key={entry.episodeId} entry={entry} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-sm text-zinc-300">{t("calendar.recentlyAired")}</h2>
        {data.recentlyAired.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("calendar.empty.recentlyAired")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.recentlyAired.map((entry) => (
              <CalendarEntryRow
                key={entry.episodeId}
                entry={entry}
                onToggleWatched={() => markWatched.mutate(entry.episodeId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
