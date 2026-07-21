/// <reference types="nativewind/types" />
import { getSettings, updateSettings } from "@baykus/api-client";
import { colors } from "@baykus/ui";
import { router, usePathname, useSegments } from "expo-router";
import { ArrowLeft, LayoutGrid, List, Settings } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEdgeScrub } from "../chrome/EdgeScrubContext.tsx";
import { useHeaderAction } from "../chrome/HeaderActionContext.tsx";
import {
  EDGE_TOP_H,
  HEADER_ACTION_CLASS,
  HEADER_ACTION_SLOT_CLASS,
  HIDE_WORDMARK_SEGMENTS,
  Z_CHROME,
} from "../chrome/layout.ts";
import { mobileBackAffordance } from "../lib/backAffordance.ts";
import { resolveUiPrefs } from "../lib/uiPrefs.ts";
import { EdgeScrub } from "./AppEdgeBlur.tsx";

/**
 * Centered baykuş wordmark — web mobile `AppHeader` chrome.
 * Top edge scrub lives here (behind the logo, flush to the screen top) so a
 * root overlay cannot paint over the wordmark.
 * Inner screens get a left back control here (Stack header sits under this layer).
 * Browse / profile / series get a right-rail action (web `MobileHeaderAction` parity).
 *
 * Layout matches web: in-flow left/right slots + absolute-centered wordmark
 * (not absolute-positioned side icons).
 */
export function MobileWordmark() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { topProgress } = useEdgeScrub();
  const { rightAction: slotAction } = useHeaderAction();
  const segments = useSegments();
  const pathname = usePathname();
  const root = segments[0];
  if (root && HIDE_WORDMARK_SEGMENTS.has(root)) return null;

  const onTabs = root === "(tabs)";
  const backFallback = onTabs ? null : mobileBackAffordance(pathname);
  const onLibrary = pathname === "/";
  const onWatch = pathname === "/watch";
  const onProfile = pathname === "/profile";
  /** Inner / banner chrome — snow reads over edge scrub + hero better than muted. */
  const chromeIcon = backFallback ? colors.snow : colors.muted;

  function onBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (backFallback) router.replace(backFallback);
  }

  async function goBrowseView(view: "grid" | "list") {
    try {
      const settings = await getSettings();
      const prefs = resolveUiPrefs(settings);
      await updateSettings({ uiPrefs: { ...prefs, browseView: view } });
    } catch {
      // Navigation still proceeds — prefs may already match from a prior toggle.
    }
    router.push(view === "grid" ? "/" : "/(tabs)/watch");
  }

  let routeAction: ReactNode = null;
  if (onLibrary) {
    routeAction = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("library.view.list")}
        onPress={() => {
          void goBrowseView("list");
        }}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <List size={20} color={colors.muted} strokeWidth={1.5} />
      </Pressable>
    );
  } else if (onWatch) {
    routeAction = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("library.view.grid")}
        onPress={() => {
          void goBrowseView("grid");
        }}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <LayoutGrid size={20} color={colors.muted} strokeWidth={1.5} />
      </Pressable>
    );
  } else if (onProfile) {
    routeAction = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("app.nav.settings")}
        onPress={() => router.push("/(tabs)/settings")}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <Settings size={20} color={colors.muted} strokeWidth={1.5} />
      </Pressable>
    );
  }

  const rightAction = slotAction ?? routeAction;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: Z_CHROME,
      }}
    >
      {/* Under logo — full viewport top, same band as web AppEdgeBlur. */}
      <EdgeScrub edge="top" height={EDGE_TOP_H} progress={topProgress} width={width} nested />
      <View pointerEvents="box-none" style={{ paddingTop: insets.top, zIndex: 1 }}>
        <View
          pointerEvents="box-none"
          className="relative h-14 flex-row items-center justify-between px-3"
        >
          <View className={HEADER_ACTION_SLOT_CLASS}>
            {backFallback ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.back")}
                onPress={onBack}
                hitSlop={8}
                className={HEADER_ACTION_CLASS}
              >
                <ArrowLeft size={20} color={chromeIcon} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>

          <View
            pointerEvents="box-none"
            className="absolute inset-0 items-center justify-center"
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="baykuş"
              onPress={() => {
                router.push("/(tabs)/watch");
              }}
              className="items-center justify-center active:opacity-80"
              hitSlop={8}
            >
              <Text className="font-display text-2xl italic leading-none tracking-tight text-snow">
                baykuş
              </Text>
            </Pressable>
          </View>

          <View className={HEADER_ACTION_SLOT_CLASS}>{rightAction}</View>
        </View>
      </View>
    </View>
  );
}
