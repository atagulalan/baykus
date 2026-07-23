/// <reference types="nativewind/types" />

import { colors, haptic } from "@baykus/ui";
import { router, usePathname, useSegments } from "expo-router";
import { CalendarDays, type LucideIcon, Play, Search, User } from "lucide-react-native";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EDGE_BOTTOM_H, HIDE_WORDMARK_SEGMENTS, Z_CHROME } from "../chrome/layout.ts";
import { EdgeScrub } from "./AppEdgeBlur.tsx";

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;

type DockTab = {
  key: "watch" | "calendar" | "profile" | "search";
  href: "/(tabs)/watch" | "/(tabs)/calendar" | "/(tabs)/profile" | "/(tabs)/search";
  label: string;
  Icon: LucideIcon;
  /** Fill when active (Play / User); Search / Calendar use bold stroke instead. */
  fillActive?: boolean;
  isActive: (pathname: string) => boolean;
};

/** Web AppTabBar order — Library is not a dock slot (browse peer of Watch). */
const DOCK_TABS: DockTab[] = [
  {
    key: "watch",
    href: "/(tabs)/watch",
    label: "Watch",
    Icon: Play,
    fillActive: true,
    /** E142: Library (`/`) keeps the Watch dock icon active. */
    isActive: (p) => p === "/" || p === "/watch",
  },
  {
    key: "calendar",
    href: "/(tabs)/calendar",
    label: "Calendar",
    Icon: CalendarDays,
    isActive: (p) => p === "/calendar" || p.startsWith("/calendar/"),
  },
  {
    key: "profile",
    href: "/(tabs)/profile",
    label: "Profile",
    Icon: User,
    fillActive: true,
    isActive: (p) => p === "/profile" || p.startsWith("/profile/"),
  },
  {
    key: "search",
    href: "/(tabs)/search",
    label: "Search",
    Icon: Search,
    isActive: (p) => p === "/search" || p.startsWith("/search/"),
  },
];

/**
 * Floating icon-only dock — web AppTabBar chrome.
 * Root overlay (not Tabs `tabBar`) so inner stack screens keep the dock too.
 */
export function MobileDock() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const segments = useSegments();
  const root = segments[0];
  if (root && HIDE_WORDMARK_SEGMENTS.has(root)) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0"
      style={{ paddingTop: 48, zIndex: Z_CHROME }}
    >
      {/* Under icons (web: edgeBlur 35 < chrome 40) — not a root overlay above the dock. */}
      <EdgeScrub edge="bottom" height={EDGE_BOTTOM_H} progress={1} width={width} nested />
      <View
        pointerEvents="auto"
        className="relative mx-auto w-full max-w-md flex-row items-center px-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8), zIndex: 1 }}
      >
        {DOCK_TABS.map(({ key, href, label, Icon, fillActive, isActive }) => {
          const focused = isActive(pathname);
          const color = focused ? colors.yellow : colors.muted;

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                // Always land on the tab root (Library keeps Watch lit but still goes to `/watch`).
                const atRoot =
                  key === "watch"
                    ? pathname === "/watch"
                    : key === "calendar"
                      ? pathname === "/calendar"
                      : key === "profile"
                        ? pathname === "/profile"
                        : pathname === "/search";
                if (!atRoot) {
                  haptic("selection");
                  router.navigate(href);
                }
              }}
              className="h-11 min-w-0 flex-1 items-center justify-center active:scale-[0.92]"
            >
              <DockIcon
                Icon={Icon}
                color={color}
                filled={Boolean(fillActive && focused)}
                bold={!fillActive && focused}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DockIcon({
  Icon,
  color,
  filled = false,
  bold = false,
}: {
  Icon: LucideIcon;
  color: string;
  filled?: boolean;
  bold?: boolean;
}) {
  return (
    <Icon
      size={ICON_SIZE}
      strokeWidth={bold ? 2.5 : ICON_STROKE}
      color={color}
      fill={filled ? color : "transparent"}
    />
  );
}
