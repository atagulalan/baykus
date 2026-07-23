/// <reference types="nativewind/types" />
import { getSettings, updateSettings } from "@baykus/api-client";
import { colors } from "@baykus/ui";
import { router, usePathname, useSegments } from "expo-router";
import { ArrowLeft, LayoutGrid, List } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, Text, useWindowDimensions, View, type TextStyle } from "react-native";
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

/** Soft void halo — matches web `.wordmark-shadow`. */
const WORDMARK_GLOW = "rgba(8, 8, 8, 0.7)";
/** Room for blur outside glyphs; RN Text otherwise clips shadow into a box. */
const GLOW_PAD = 28;

const wordmarkGlowStyle: TextStyle =
  Platform.OS === "web"
    ? ({
        // RN-web CSS shorthand — follows glyphs; textShadow* often clips to a box.
        textShadow: `0 0 20px ${WORDMARK_GLOW}, 0 0 48px rgba(8, 8, 8, 0.5)`,
      } as TextStyle)
    : {
        textShadowColor: WORDMARK_GLOW,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 18,
        paddingHorizontal: GLOW_PAD,
        paddingVertical: GLOW_PAD,
        marginHorizontal: -GLOW_PAD,
        marginVertical: -GLOW_PAD,
      };

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
  // Settings is a hidden tab (href: null) — still show chrome back → profile.
  const backFallback =
    pathname === "/settings"
      ? mobileBackAffordance(pathname)
      : onTabs
        ? null
        : mobileBackAffordance(pathname);
  const onLibrary = pathname === "/";
  const onWatch = pathname === "/watch";
  /** Inner / banner chrome — snow reads over edge scrub + hero better than muted. */
  const chromeIcon = backFallback ? colors.snow : colors.muted;

  function onBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (backFallback) router.replace(backFallback);
  }

  function goBrowseView(view: "grid" | "list") {
    // Navigate first — awaiting get/updateSettings here made the toggle lag
    // or appear dead when the API was slow.
    router.replace(view === "grid" ? "/" : "/(tabs)/watch");
    void (async () => {
      try {
        const settings = await getSettings();
        const prefs = resolveUiPrefs(settings);
        await updateSettings({ uiPrefs: { ...prefs, browseView: view } });
      } catch {
        // Prefs may already match from a prior toggle; dock still works via route.
      }
    })();
  }

  let routeAction: ReactNode = null;
  if (onLibrary) {
    routeAction = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("library.view.list")}
        onPress={() => {
          goBrowseView("list");
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
          goBrowseView("grid");
        }}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <LayoutGrid size={20} color={colors.muted} strokeWidth={1.5} />
      </Pressable>
    );
  }
  // Profile settings gear lives in the identity row (right of banner/camera), not here.

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
        overflow: "visible",
      }}
    >
      {/* Under logo — full viewport top, same band as web AppEdgeBlur. */}
      <EdgeScrub edge="top" height={EDGE_TOP_H} progress={topProgress} width={width} nested />
      <View
        pointerEvents="box-none"
        style={{ paddingTop: insets.top, zIndex: 1, overflow: "visible" }}
      >
        <View
          pointerEvents="box-none"
          className="relative h-14 flex-row items-center justify-between px-3"
          style={{ overflow: "visible" }}
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
            style={{ overflow: "visible" }}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="baykuş"
              onPress={() => {
                router.push("/(tabs)/watch");
              }}
              className="items-center justify-center active:opacity-80"
              hitSlop={8}
              style={{ overflow: "visible" }}
            >
              <Text
                className="font-display text-2xl italic leading-none tracking-tight text-snow"
                style={wordmarkGlowStyle}
              >
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
