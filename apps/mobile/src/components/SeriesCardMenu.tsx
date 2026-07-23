/// <reference types="nativewind/types" />
import {
  ApiError,
  type ManualList,
  refreshSeries,
  removeSeries,
  type SeriesSummary,
  updateSeries,
  updateSettings,
} from "@baykus/api-client";
import {
  type ActionSheetItem,
  ConfirmDialog,
  colors,
  LiftContextMenu,
  type LiftSourceRect,
  SeriesCard,
} from "@baykus/ui";
import {
  Bell,
  BellOff,
  Bookmark,
  CircleX,
  Heart,
  ImageIcon,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toSeriesCardSeries } from "../lib/mapSeriesCard.ts";

export type SeriesCardMenuHandlers = {
  /** Patch list state after favorite / list / mute mutations. */
  onSeriesPatched: (updated: SeriesSummary) => void;
  /** Drop a row after successful remove. */
  onSeriesRemoved: (id: number) => void;
  /** Full list reload after refresh (metadata may change). */
  onReload?: () => void;
  /** Optional error surface (toast / inline). */
  onError?: (message: string) => void;
};

type MenuCtx = {
  liftedId: number | null;
  openMenu: (series: SeriesSummary, rect: LiftSourceRect) => void;
};

const SeriesCardMenuContext = createContext<MenuCtx | null>(null);

function failMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function buildSeriesMenuItems(
  series: SeriesSummary,
  t: (key: string, opts?: Record<string, string>) => string,
  actions: {
    toggleFavorite: () => void;
    changeManualList: (manualList: ManualList | null) => void;
    toggleMute: () => void;
    setAsCover: () => void;
    refresh: () => void;
    requestRemove: () => void;
  },
): ActionSheetItem[] {
  return [
    {
      key: "favorite",
      label: t(series.favorite ? "series.unfavorite" : "series.favorite"),
      icon: (
        <Heart
          size={16}
          color={series.favorite ? colors.yellow : colors.muted}
          fill={series.favorite ? colors.yellow : "transparent"}
        />
      ),
      onPress: actions.toggleFavorite,
    },
    ...(series.manualList !== null
      ? [
          {
            key: "watching",
            label: t("category.watching"),
            icon: <Play size={16} color={colors.muted} />,
            onPress: () => {
              actions.changeManualList(null);
            },
          } satisfies ActionSheetItem,
        ]
      : []),
    ...(series.manualList !== "watch_later"
      ? [
          {
            key: "watch_later",
            label: t("manualList.watch_later"),
            icon: <Bookmark size={16} color={colors.muted} />,
            onPress: () => {
              actions.changeManualList("watch_later");
            },
          } satisfies ActionSheetItem,
        ]
      : []),
    ...(series.manualList !== "stopped" && series.category !== "finished"
      ? [
          {
            key: "stopped",
            label: t("manualList.stopped"),
            icon: <CircleX size={16} color={colors.muted} />,
            onPress: () => {
              actions.changeManualList("stopped");
            },
          } satisfies ActionSheetItem,
        ]
      : []),
    {
      key: "mute",
      label: t(series.pushMuted ? "series.unmute" : "series.mute"),
      icon: series.pushMuted ? (
        <BellOff size={16} color={colors.muted} />
      ) : (
        <Bell size={16} color={colors.muted} />
      ),
      onPress: actions.toggleMute,
    },
    ...(series.backdropRef
      ? [
          {
            key: "useAsCover",
            label: t("profile.banner.useAsCover", {
              defaultValue: "Use as profile cover",
            }),
            icon: <ImageIcon size={16} color={colors.muted} />,
            onPress: actions.setAsCover,
          } satisfies ActionSheetItem,
        ]
      : []),
    {
      key: "refresh",
      label: t("series.refresh"),
      icon: <RefreshCw size={16} color={colors.muted} />,
      onPress: actions.refresh,
    },
    {
      key: "remove",
      label: t("library.card.remove"),
      icon: <Trash2 size={16} color="#f87171" />,
      danger: true,
      onPress: actions.requestRemove,
    },
  ];
}

/**
 * Hosts lift context menu + remove confirm for library SeriesCards.
 * Wrap a screen and use {@link MenuSeriesCard} for each poster.
 */
export function SeriesCardMenuProvider({
  children,
  onSeriesPatched,
  onSeriesRemoved,
  onReload,
  onError,
}: SeriesCardMenuHandlers & { children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<{
    series: SeriesSummary;
    rect: LiftSourceRect;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SeriesSummary | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SeriesSummary | null>(null);

  const openMenu = useCallback((series: SeriesSummary, rect: LiftSourceRect) => {
    setPendingRemove(null);
    setActive({ series, rect });
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const report = useCallback(
    (err: unknown, fallback: string) => {
      onError?.(failMessage(err, fallback));
    },
    [onError],
  );

  const series = active?.series ?? null;

  const runPatch = useCallback(
    async (patch: Parameters<typeof updateSeries>[1]) => {
      if (!series) return;
      setBusy(true);
      try {
        const updated = await updateSeries(series.id, patch);
        setActive((prev) => (prev ? { ...prev, series: { ...prev.series, ...updated } } : prev));
        onSeriesPatched(updated);
      } catch (err) {
        report(err, "update_failed");
      } finally {
        setBusy(false);
      }
    },
    [series, onSeriesPatched, report],
  );

  const items = useMemo(() => {
    if (!series) return [];
    return buildSeriesMenuItems(series, t, {
      toggleFavorite: () => {
        void runPatch({ favorite: !series.favorite });
      },
      changeManualList: (manualList) => {
        void runPatch({ manualList });
      },
      toggleMute: () => {
        void runPatch({ pushMuted: !series.pushMuted });
      },
      setAsCover: () => {
        if (!series.backdropRef) return;
        setBusy(true);
        void updateSettings({ bannerRef: series.backdropRef })
          .catch((err) => report(err, "banner_failed"))
          .finally(() => setBusy(false));
      },
      refresh: () => {
        setBusy(true);
        void refreshSeries(series.id)
          .then(() => {
            onReload?.();
          })
          .catch((err) => report(err, "refresh_failed"))
          .finally(() => setBusy(false));
      },
      requestRemove: () => {
        setPendingRemove(series);
      },
    });
  }, [series, t, runPatch, report, onReload]);

  const ctx = useMemo(
    () => ({
      liftedId: menuOpen && series ? series.id : null,
      openMenu,
    }),
    [menuOpen, series, openMenu],
  );

  async function onConfirmRemove() {
    if (!removeTarget) return;
    try {
      await removeSeries(removeTarget.id);
      onSeriesRemoved(removeTarget.id);
    } catch (err) {
      report(err, "remove_failed");
    }
  }

  return (
    <SeriesCardMenuContext.Provider value={ctx}>
      {children}
      <LiftContextMenu
        isOpen={menuOpen && active != null}
        onClose={closeMenu}
        sourceRect={active?.rect ?? null}
        title={t("series.menu")}
        closeLabel={t("modal.close")}
        busy={busy}
        items={items}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        preview={active ? <SeriesCard series={toSeriesCardSeries(active.series)} preview /> : null}
        onExitComplete={() => {
          if (!pendingRemove) return;
          setRemoveTarget(pendingRemove);
          setPendingRemove(null);
        }}
      />
      {removeTarget ? (
        <ConfirmDialog
          title={t("library.card.remove")}
          body={t("library.removeConfirm", { title: removeTarget.title })}
          confirmLabel={t("library.card.remove")}
          cancelLabel={t("watch.removeSectionCancel")}
          variant="danger"
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            void onConfirmRemove();
          }}
        />
      ) : null}
    </SeriesCardMenuContext.Provider>
  );
}

function useSeriesCardMenuCtx(): MenuCtx {
  const ctx = useContext(SeriesCardMenuContext);
  if (!ctx) {
    throw new Error("MenuSeriesCard must be used within SeriesCardMenuProvider");
  }
  return ctx;
}

/** SeriesCard wired for long-press lift menu (requires provider). */
export function MenuSeriesCard({ item, onPress }: { item: SeriesSummary; onPress: () => void }) {
  const ref = useRef<View>(null);
  const { liftedId, openMenu } = useSeriesCardMenuCtx();

  return (
    <SeriesCard
      ref={ref}
      series={toSeriesCardSeries(item)}
      onPress={onPress}
      lifted={liftedId === item.id}
      onLongPress={() => {
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width <= 0 || height <= 0) return;
          openMenu(item, { x, y, width, height });
        });
      }}
    />
  );
}
