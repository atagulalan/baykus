/// <reference types="nativewind/types" />
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";

const KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"] as const;

/** Poster grid column count — mirrors web `SERIES_GRID_CLASSNAME` breakpoints. */
export function seriesGridCols(width: number): number {
  if (width >= 1024) return 6;
  if (width >= 720) return 4;
  if (width >= 480) return 3;
  return 2;
}

export type SkeletonBoneProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Soft white fill — NativeWind `bg-white/5` / `animate-pulse` often fail to
 * paint or animate on RN Views (same class of issue as {@link borders}).
 */
const BONE_FILL = "rgba(255, 255, 255, 0.08)";

/** Base pulse fill — sharp by default; pass `rounded-*` for soft shapes. */
export function SkeletonBone({ className, style }: SkeletonBoneProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("overflow-hidden", className)}
      style={style}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: BONE_FILL, opacity }]}
      />
    </View>
  );
}

export type SkeletonPillProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const PILL_H = 28;
const PILL_W = 128;

/** Centered SectionPill stand-in — explicit size (NativeWind `h-`/`w-` can fail on RN). */
export function SkeletonPill({ className, style }: SkeletonPillProps) {
  return (
    <SkeletonBone
      className={cn("rounded-full", className)}
      style={[{ height: PILL_H, width: PILL_W }, borders.subtle, style]}
    />
  );
}

/**
 * Centered pill row — mirrors SectionHeader anatomy:
 * icon · label · | · count inside SectionPill chrome.
 */
export function SkeletonSectionHeader({ className }: { className?: string } = {}) {
  return (
    <View
      className={cn("w-full flex-row items-center justify-center gap-1 py-1", className)}
      accessibilityElementsHidden
    >
      <View
        className="max-w-full shrink flex-row items-center gap-1.5 self-center rounded-full bg-void/95 px-0"
        style={[{ minHeight: PILL_H }, borders.subtle]}
      >
        <SkeletonBone className="rounded" style={{ height: 14, width: 14, marginLeft: 10 }} />
        <SkeletonBone className="rounded" style={{ height: 12, width: 72 }} />
        <View
          style={{
            height: 12,
            width: StyleSheet.hairlineWidth,
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        />
        <SkeletonBone className="rounded" style={{ height: 10, width: 18, marginRight: 10 }} />
      </View>
    </View>
  );
}

/** Portrait poster bone — matches SeriesCard / detail hero poster chrome. */
export function SkeletonPoster({ className, style }: SkeletonBoneProps) {
  return <SkeletonBone className={cn("aspect-[2/3] rounded-md", className)} style={style} />;
}

/** One SeriesCard-shaped cell (padding + poster + title/progress lines). */
export function SkeletonSeriesCard() {
  return (
    <View className="flex-col rounded-md px-1.5 py-1.5" accessibilityElementsHidden>
      <SkeletonPoster className="w-full" />
      <View className="mt-2 flex-col gap-1.5 px-0.5">
        <SkeletonBone className="h-3 w-3/4 rounded" />
        <SkeletonBone className="h-1.5 w-full rounded-sm" />
      </View>
    </View>
  );
}

/** Shared poster grid used by Browse / Favorites / All-Series / Profile hub. */
export function SkeletonSeriesGrid({
  count = 6,
  cols,
}: {
  count?: number;
  /** Override column count (defaults to viewport breakpoints). */
  cols?: number;
}) {
  const { width } = useWindowDimensions();
  const columnCount = cols ?? seriesGridCols(width);

  return (
    <View className="flex-row flex-wrap">
      {KEYS.slice(0, count).map((key) => (
        <View key={key} style={{ width: `${100 / columnCount}%` }}>
          <SkeletonSeriesCard />
        </View>
      ))}
    </View>
  );
}

/** Category section: sticky pill + poster grid (Browse grid loading). */
export function SkeletonCategoryGrid({ sections = 2, cols }: { sections?: number; cols?: number }) {
  return (
    <View className="flex-col gap-6">
      {KEYS.slice(0, sections).map((key) => (
        <View key={key} className="flex-col">
          <SkeletonSectionHeader />
          {cols != null ? (
            <SkeletonSeriesGrid count={6} cols={cols} />
          ) : (
            <SkeletonSeriesGrid count={6} />
          )}
        </View>
      ))}
    </View>
  );
}

const EPISODE_POSTER_W = 48;
const EPISODE_POSTER_H = 72;

/**
 * WatchNextRow / HistoryRow / CalendarEntryRow stand-in —
 * fixed poster rail + title/meta + checkbox.
 */
export function SkeletonEpisodeRow() {
  return (
    <View
      className="min-w-0 flex-row items-stretch rounded-md py-2 pl-3 pr-3"
      accessibilityElementsHidden
    >
      <SkeletonBone
        className="shrink-0 self-stretch rounded-md"
        style={{ width: EPISODE_POSTER_W, minHeight: EPISODE_POSTER_H }}
      />
      <View className="min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 pl-4">
        <SkeletonBone className="h-3.5 max-w-[70%] rounded" style={{ width: 160 }} />
        <SkeletonBone className="h-2.5 max-w-[50%] rounded" style={{ width: 112 }} />
      </View>
      <SkeletonBone className="my-auto h-5 w-5 shrink-0 rounded-full" />
    </View>
  );
}

/** Category list section: pill + episode rows (Browse list / Watch History). */
export function SkeletonEpisodeList({
  rows = 5,
  withHeader = true,
}: {
  rows?: number;
  withHeader?: boolean;
}) {
  return (
    <View className="flex-col">
      {withHeader ? <SkeletonSectionHeader /> : null}
      <View className="flex-col gap-0 pt-2">
        {KEYS.slice(0, rows).map((key) => (
          <SkeletonEpisodeRow key={key} />
        ))}
      </View>
    </View>
  );
}

/** Browse / Watch list loading — two category sections (web BrowsePage list parity). */
export function SkeletonWatchLists() {
  return (
    <View className="flex-col gap-6">
      <SkeletonEpisodeList rows={5} />
      <SkeletonEpisodeList rows={3} />
    </View>
  );
}

export type SkeletonStickySection = {
  key: string;
  renderHeader: () => ReactNode;
  body: ReactNode;
};

/**
 * Watch list loading as sticky sections — `renderHeader` matches live
 * `SectionHeader` docking under chrome (category pills like İzleniyor).
 */
export function skeletonWatchStickySections(): SkeletonStickySection[] {
  return [
    {
      key: "sk-watch-a",
      renderHeader: () => <SkeletonSectionHeader className="px-4" />,
      body: (
        <View className="mb-6 mt-2">
          {KEYS.slice(0, 5).map((key) => (
            <SkeletonEpisodeRow key={key} />
          ))}
        </View>
      ),
    },
    {
      key: "sk-watch-b",
      renderHeader: () => <SkeletonSectionHeader className="px-4" />,
      body: (
        <View className="mb-6 mt-2">
          {KEYS.slice(0, 3).map((key) => (
            <SkeletonEpisodeRow key={key} />
          ))}
        </View>
      ),
    },
  ];
}

/**
 * Calendar timeline loading — sticky day-bucket pills + episode rows.
 */
export function skeletonCalendarStickySections(): SkeletonStickySection[] {
  return KEYS.slice(0, 3).map((key) => ({
    key: `sk-cal-${key}`,
    renderHeader: () => <SkeletonSectionHeader className="px-4" />,
    body: (
      <View className="mb-6 mt-2">
        {KEYS.slice(0, 3).map((row) => (
          <SkeletonEpisodeRow key={row} />
        ))}
      </View>
    ),
  }));
}

/**
 * Library grid loading — sticky category pills + poster grids.
 */
export function skeletonCategoryStickySections(cols?: number): SkeletonStickySection[] {
  return KEYS.slice(0, 2).map((key) => ({
    key: `sk-cat-${key}`,
    renderHeader: () => <SkeletonSectionHeader />,
    body: (
      <View className="mb-6 mt-2">
        {cols != null ? (
          <SkeletonSeriesGrid count={6} cols={cols} />
        ) : (
          <SkeletonSeriesGrid count={6} />
        )}
      </View>
    ),
  }));
}

/** Search hit row — thumb + title/meta + circular add affordance. */
export function SkeletonSearchRow() {
  return (
    <View className="flex-row items-center gap-2 rounded-lg px-1 py-2" accessibilityElementsHidden>
      <SkeletonBone className="h-16 w-12 shrink-0 rounded" />
      <View className="min-w-0 flex-1 gap-1.5">
        <SkeletonBone className="h-3.5 max-w-[75%] rounded" style={{ width: 180 }} />
        <SkeletonBone className="h-2.5 max-w-[55%] rounded" style={{ width: 120 }} />
      </View>
      <SkeletonBone className="h-9 w-9 shrink-0 rounded-full" />
    </View>
  );
}

/** Search results loading list. */
export function SkeletonSearchResults({ rows = 4 }: { rows?: number }) {
  return (
    <View className="gap-1">
      {KEYS.slice(0, rows).map((key) => (
        <SkeletonSearchRow key={key} />
      ))}
    </View>
  );
}

/** Profile hub stats — text row with short hairline dividers. */
export function SkeletonHubStatTiles() {
  return (
    <View className="flex-row items-center px-3" accessibilityElementsHidden>
      {KEYS.slice(0, 3).map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? <View className="h-8 w-px shrink-0 bg-white/10" /> : null}
          <View className="min-w-0 flex-1 flex-col items-center gap-1.5">
            <SkeletonBone className="h-2.5 w-16 rounded" />
            <SkeletonBone className="h-6 w-12 rounded" />
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/** Profile banner hero — full-bleed plane + avatar + title (mobile load shell). */
export function SkeletonProfileBanner({ height = 320 }: { height?: number }) {
  return (
    <View className="relative w-full overflow-hidden bg-void" style={{ height }}>
      <SkeletonBone style={StyleSheet.absoluteFillObject} />
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 px-3 pb-4">
        <SkeletonBone className="h-14 w-14 shrink-0 rounded-full" />
        <SkeletonBone className="h-8 w-40 rounded" />
      </View>
    </View>
  );
}

/** Profile hub: stats tiles + two poster sections with pills. */
export function SkeletonProfileHub({ cols }: { cols?: number } = {}) {
  return (
    <View className="flex-col gap-3">
      <SkeletonHubStatTiles />
      {KEYS.slice(0, 2).map((key) => (
        <View key={key} className="flex-col gap-3">
          <SkeletonSectionHeader />
          {cols != null ? (
            <SkeletonSeriesGrid count={6} cols={cols} />
          ) : (
            <SkeletonSeriesGrid count={6} />
          )}
        </View>
      ))}
    </View>
  );
}

/** Full profile page loading — banner + hub (mobile). */
export function SkeletonProfilePage({
  bannerHeight = 320,
  cols,
}: {
  bannerHeight?: number;
  cols?: number;
} = {}) {
  return (
    <View className="flex-col gap-4">
      <SkeletonProfileBanner height={bannerHeight} />
      <View className="mt-2">
        {cols != null ? <SkeletonProfileHub cols={cols} /> : <SkeletonProfileHub />}
      </View>
    </View>
  );
}

const STATS_TILE_GAP = 16;

function skeletonTileWidth(available: number, cols: number): number {
  return (available - STATS_TILE_GAP * (cols - 1)) / cols;
}

/** Stats hero: big duration + 6-up tile grid (HeroSection parity). */
export function SkeletonStatsHero({ contentWidth }: { contentWidth?: number } = {}) {
  const { width: windowWidth } = useWindowDimensions();
  const available = contentWidth ?? windowWidth - 24;
  const cols = available >= 900 ? 6 : available >= 520 ? 3 : 2;
  const tileW = skeletonTileWidth(available, cols);

  return (
    <View className="flex-col gap-8 px-1">
      <View className="flex-col items-center gap-3 py-4">
        <SkeletonBone className="h-14 w-48 rounded" />
        <SkeletonBone className="h-3 w-56 max-w-full rounded" />
      </View>
      <View className="flex-row flex-wrap" style={{ gap: STATS_TILE_GAP }}>
        {KEYS.slice(0, 6).map((key) => (
          <View
            key={key}
            className="flex-col items-center gap-3 rounded-md bg-white/5 p-6"
            style={[{ width: tileW }, borders.subtle]}
            accessibilityElementsHidden
          >
            <SkeletonBone className="h-2.5 w-16 rounded" />
            <SkeletonBone className="h-8 w-12 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Stats page: hero + a couple of pill-headed section shells. */
export function SkeletonStatsPage({ contentWidth }: { contentWidth?: number } = {}) {
  const { width: windowWidth } = useWindowDimensions();
  const available = contentWidth ?? windowWidth - 24;
  const sectionCols = available >= 520 ? 3 : 1;
  const tileW = skeletonTileWidth(available, sectionCols);

  return (
    <View className="flex-col gap-10">
      <SkeletonStatsHero contentWidth={available} />
      {KEYS.slice(0, 2).map((key) => (
        <View key={key} className="flex-col gap-4 px-1">
          <SkeletonSectionHeader />
          <View className="flex-row flex-wrap" style={{ gap: STATS_TILE_GAP }}>
            {KEYS.slice(0, 3).map((tile) => (
              <View
                key={tile}
                className="flex-col items-center gap-3 rounded-md bg-white/5 p-6"
                style={[{ width: tileW }, borders.subtle]}
                accessibilityElementsHidden
              >
                <SkeletonBone className="h-2.5 w-16 rounded" />
                <SkeletonBone className="h-8 w-14 rounded" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Series detail hero loading shell — backdrop plane + poster + title. */
export function SkeletonSeriesDetailHero({
  insetsTop = 0,
}: {
  /** Safe-area + transparent stack header offset. */
  insetsTop?: number;
} = {}) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const posterW = wide ? 160 : 112;
  const posterH = Math.round(posterW * 1.5);
  const heroMinH = wide ? 480 : 384;

  return (
    <View className="relative w-full bg-void" style={{ minHeight: heroMinH }}>
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <SkeletonBone style={StyleSheet.absoluteFillObject} />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: "transparent",
            },
          ]}
        />
        {/* Bottom void fade — mirrors HeroBackdropFades ramp. */}
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: Math.round(heroMinH * 0.45),
            backgroundColor: "rgba(8, 8, 8, 0.55)",
          }}
        />
      </View>
      <View
        className={cn("relative z-10 flex-row items-end px-3 pb-6", wide ? "gap-6 px-4" : "gap-4")}
        style={{
          minHeight: heroMinH,
          paddingTop: insetsTop + (wide ? 32 : 16),
        }}
      >
        <SkeletonBone className="shrink-0 rounded-md" style={{ width: posterW, height: posterH }} />
        <View className="min-w-0 flex-1 flex-col gap-3 pb-1">
          <SkeletonBone className="h-8 max-w-sm rounded" style={{ width: "66%" }} />
          <SkeletonBone className="h-3 w-40 rounded" />
          <SkeletonBone className="mt-1 h-1.5 max-w-full rounded-sm" style={{ width: 192 }} />
        </View>
      </View>
    </View>
  );
}

/** Calendar timeline: a few pill sections with episode rows. */
export function SkeletonCalendarTimeline() {
  return (
    <View className="flex-col gap-6">
      {KEYS.slice(0, 3).map((key) => (
        <SkeletonEpisodeList key={key} rows={3} />
      ))}
    </View>
  );
}

/** Settings: sticky pill + hairline row bones. */
export function SkeletonSettingsSections({ sections = 2 }: { sections?: number }) {
  return (
    <View className="max-w-lg flex-col px-1">
      {KEYS.slice(0, sections).map((key) => (
        <View key={key} className="mb-8 flex-col gap-2">
          <View className="items-center py-1">
            <SkeletonPill />
          </View>
          <View className="flex-col">
            {KEYS.slice(0, 3).map((row, index) => (
              <View
                key={row}
                className="flex-row items-center justify-between px-4 py-3.5"
                style={
                  index < 2
                    ? {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: "rgba(255,255,255,0.05)",
                      }
                    : undefined
                }
              >
                <SkeletonBone className="h-3.5 w-28 rounded" />
                <SkeletonBone className="h-8 w-24 rounded-full" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
