import {
  ApiError,
  buildImageUrl,
  getSettings,
  getStats,
  listSeries,
  type SeriesSummary,
  type Stats,
  seriesParam,
  updateSettings,
  uploadAvatar,
} from "@baykus/api-client";
import {
  colors,
  EmptyPanel,
  HeroBackdropFades,
  MediaImage,
  Modal,
  PageTitle,
  PullToRefresh,
  SectionPill,
  SkeletonProfilePage,
} from "@baykus/ui";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import {
  Bird,
  Camera,
  ChevronRight,
  Clapperboard,
  Heart,
  History,
  LogOut,
  Settings,
  User,
} from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { useBannerEdgeScrub } from "../../src/chrome/EdgeScrubContext.tsx";
import { tabContentBottom, tabContentTop, WEB_CONTENT_MAX } from "../../src/chrome/layout.ts";
import { MenuSeriesCard, SeriesCardMenuProvider } from "../../src/components/SeriesCardMenu.tsx";
import { formatDurationLabel, formatDurationParts } from "../../src/lib/duration.ts";
import { seriesGridCols } from "../../src/lib/seriesGridCols.ts";
import { useAvatarImageSource } from "../../src/lib/useAvatarImageSource.ts";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function byLastWatchedDesc(
  a: { lastWatchedAt: string | null },
  b: { lastWatchedAt: string | null },
) {
  if (a.lastWatchedAt === b.lastWatchedAt) return 0;
  if (a.lastWatchedAt === null) return 1;
  if (b.lastWatchedAt === null) return -1;
  return a.lastWatchedAt < b.lastWatchedAt ? 1 : -1;
}

export default function ProfileScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Expo web shell is capped; native tablet keeps full window width.
  const width = Platform.OS === "web" ? Math.min(windowWidth, WEB_CONTENT_MAX) : windowWidth;
  // One preview row: phone ≥3, tablet up to 6 (matches how many posters fit).
  const cols = Math.max(3, seriesGridCols(width));
  const previewLimit = cols;
  const [stats, setStats] = useState<Stats | null>(null);
  const [allSeries, setAllSeries] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [avatarRef, setAvatarRef] = useState<string | null>(null);
  const [bannerRef, setBannerRef] = useState<string | null>(null);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const handle = session?.handle ?? "library";
  const title = session?.mode === "single" ? t("profile.title") : `@${handle}`;
  const bannerUrl = buildImageUrl(bannerRef, "large");
  const hasBanner = Boolean(bannerUrl);
  const bannerScrub = useBannerEdgeScrub(hasBanner);
  const avatarSource = useAvatarImageSource(avatarRef);

  const load = useCallback(async () => {
    if (needsAuth) {
      setStats(null);
      setAllSeries([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [s, library, settings] = await Promise.all([
        getStats(deviceTimeZone()),
        listSeries({ sort: "lastWatched" }),
        getSettings(),
      ]);
      setStats(s);
      setAllSeries(library.items);
      setAvatarRef(settings.avatarRef ?? null);
      setBannerRef(settings.bannerRef ?? null);
        if (settings.locale === "en" || settings.locale === "tr" || settings.locale === "ja") {
        if (i18n.language !== settings.locale) await i18n.changeLanguage(settings.locale);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, i18n]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  const favorites = useMemo(
    () => allSeries.filter((item) => item.favorite).sort(byLastWatchedDesc),
    [allSeries],
  );

  const timeSpent = formatDurationLabel(formatDurationParts(stats?.watchTimeMin ?? 0), t);

  async function onPickAvatar() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("photo_permission_denied");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (picked.canceled || !picked.assets[0]) return;
    setAvatarBusy(true);
    try {
      const asset = picked.assets[0];
      // Prefer the RN FormData file descriptor — fetch→Blob often drops MIME type
      // (empty / octet-stream), which the server used to reject before sniffing.
      const mime =
        asset.mimeType && asset.mimeType.startsWith("image/")
          ? asset.mimeType
          : asset.uri.toLowerCase().endsWith(".png")
            ? "image/png"
            : asset.uri.toLowerCase().endsWith(".webp")
              ? "image/webp"
              : asset.uri.toLowerCase().endsWith(".gif")
                ? "image/gif"
                : "image/jpeg";
      const ext =
        mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/gif"
              ? "gif"
              : "jpg";
      const settings = await uploadAvatar({
        uri: asset.uri,
        type: mime,
        name: `avatar.${ext}`,
      });
      setAvatarRef(settings.avatarRef ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "avatar_failed",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onPickBanner(ref: string | null) {
    setBannerBusy(true);
    setError(null);
    try {
      const settings = await updateSettings({ bannerRef: ref });
      setBannerRef(settings.bannerRef ?? null);
      setBannerPickerOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "banner_failed",
      );
    } finally {
      setBannerBusy(false);
    }
  }

  if (authLoading || loading) {
    const bannerH = width >= 640 ? 420 : 320;
    return (
      <View className="flex-1 bg-void">
        <SkeletonProfilePage bannerHeight={bannerH} cols={cols} />
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 justify-center bg-void px-2">
        <EmptyPanel
          icon={User}
          title="Sign in"
          hint="Profile and stats need a multi-mode session."
          action={
            <Link href="/login" asChild>
              <Pressable className="min-h-10 items-center justify-center rounded-full bg-yellow px-5 py-2.5">
                <Text className="font-mono text-xs uppercase tracking-widest text-void">
                  Sign in
                </Text>
              </Pressable>
            </Link>
          }
        />
      </View>
    );
  }

  const heroMinH = width >= 640 ? 420 : 320;

  return (
    <SeriesCardMenuProvider
      onSeriesPatched={(updated) => {
        setAllSeries((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      }}
      onSeriesRemoved={(id) => {
        setAllSeries((prev) => prev.filter((s) => s.id !== id));
      }}
      onReload={() => {
        void load();
      }}
      onError={(message) => setError(message)}
    >
      <PullToRefresh
        className="flex-1 bg-void"
        contentContainerStyle={{
          paddingBottom: tabContentBottom(insets.bottom),
          paddingTop: 0,
        }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
        }}
        onScroll={bannerScrub.onScroll}
        scrollEventThrottle={bannerScrub.scrollEventThrottle}
      >
        {/* Banner hero: tall fixed plane when set; compact identity row when cleared (web parity). */}
        <View
          className="relative overflow-hidden bg-void"
          style={hasBanner ? { height: heroMinH, width: "100%" } : { width: "100%" }}
        >
          {bannerUrl ? (
            <>
              <MediaImage
                src={bannerUrl}
                accessibilityLabel=""
                fill
                style={{ width, height: Math.round(heroMinH * 1.15) }}
                wrapperStyle={{ width, height: heroMinH }}
              />
              <HeroBackdropFades width={width} height={heroMinH} sideFades={width >= 640} />
            </>
          ) : null}

          <View
            className={hasBanner ? "relative z-10 flex-1 justify-end" : "relative z-10"}
            style={{
              paddingTop: tabContentTop(insets.top),
              ...(hasBanner ? { height: heroMinH } : {}),
            }}
          >
            <View
              className={
                hasBanner
                  ? "flex-row items-center gap-4 px-3 pb-4"
                  : "flex-row items-center gap-4 px-3 pb-2"
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  avatarBusy
                    ? t("profile.photo.uploading")
                    : t("profile.photo.upload", { defaultValue: "Upload photo" })
                }
                accessibilityState={{ busy: avatarBusy }}
                disabled={avatarBusy}
                onPress={() => {
                  void onPickAvatar();
                }}
                className="relative h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5 active:opacity-80 disabled:opacity-40"
              >
                {avatarSource ? (
                  <MediaImage
                    src={avatarSource.uri}
                    accessibilityLabel={handle}
                    fill
                    showLoader={!avatarBusy}
                  />
                ) : (
                  <Bird size={22} color={colors.muted} strokeWidth={1.5} />
                )}
                <View
                  className="absolute inset-0 items-center justify-center bg-black/50"
                  style={{
                    // NativeWind opacity is unreliable on this overlay — force visibility while busy.
                    opacity: avatarBusy ? 1 : 0,
                    zIndex: avatarBusy ? 20 : 0,
                  }}
                  pointerEvents="none"
                >
                  {avatarBusy ? <ActivityIndicator color={colors.snow} size="small" /> : null}
                </View>
              </Pressable>

              <View className="min-w-0 flex-1">
                <PageTitle>{title}</PageTitle>
              </View>

              <View className="flex-row items-center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.banner.edit")}
                  onPress={() => setBannerPickerOpen(true)}
                  className="h-11 w-11 items-center justify-center active:opacity-70"
                >
                  <Camera size={20} color={colors.muted} strokeWidth={1.5} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("app.nav.settings")}
                  onPress={() => router.push("/(tabs)/settings")}
                  className="h-11 w-11 items-center justify-center active:opacity-70"
                >
                  <Settings size={20} color={colors.muted} strokeWidth={1.5} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {error ? <Text className="mb-3 px-3 font-mono text-xs text-red-400">{error}</Text> : null}

        {allSeries.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/profile/stats")}
            className="mb-6 mt-4 flex-row items-center px-3 active:opacity-80"
          >
            <ProfileStatItem label={t("stats.timeSpent")} value={timeSpent} />
            <View className="h-8 w-px shrink-0 bg-white/10" />
            <ProfileStatItem
              label={t("stats.episodesWatched")}
              value={(stats?.episodesWatched ?? 0).toLocaleString("tr-TR")}
            />
            <View className="h-8 w-px shrink-0 bg-white/10" />
            <ProfileStatItem
              label={t("stats.activeSeries")}
              value={(stats?.itemCount.watching ?? 0).toLocaleString("tr-TR")}
            />
          </Pressable>
        ) : null}

        {allSeries.length > 0 ? (
          <SeriesGridSection
            heading={
              <HubPillHeader
                icon={Heart}
                label={t("profile.favorites.title")}
                count={favorites.length}
                linked={favorites.length > previewLimit}
                onPress={
                  favorites.length > previewLimit
                    ? () => router.push("/library/favorites")
                    : undefined
                }
              />
            }
          >
            {favorites.length === 0 ? (
              <EmptyPanel
                icon={Heart}
                title={t("profile.favorites.emptyTitle")}
                hint={t("profile.favorites.empty")}
                className="mt-0 py-8"
              />
            ) : (
              <View className="flex-row flex-wrap px-1.5 py-1.5">
                {favorites.slice(0, previewLimit).map((item) => (
                  <View key={item.id} style={{ width: `${100 / cols}%` }} className="px-1.5 py-1.5">
                    <MenuSeriesCard
                      item={item}
                      onPress={() => router.push(`/series/${seriesParam(item)}`)}
                    />
                  </View>
                ))}
              </View>
            )}
          </SeriesGridSection>
        ) : null}

        {allSeries.length > 0 ? (
          <SeriesGridSection
            heading={
              <HubPillHeader
                icon={Clapperboard}
                label={t("profile.allSeries")}
                count={allSeries.length}
                linked={allSeries.length > previewLimit}
                onPress={
                  allSeries.length > previewLimit ? () => router.push("/library/all") : undefined
                }
              />
            }
          >
            <View className="flex-row flex-wrap px-1.5 py-1.5">
              {allSeries.slice(0, previewLimit).map((item) => (
                <View key={item.id} style={{ width: `${100 / cols}%` }} className="px-1.5 py-1.5">
                  <MenuSeriesCard
                    item={item}
                    onPress={() => router.push(`/series/${seriesParam(item)}`)}
                  />
                </View>
              ))}
            </View>
          </SeriesGridSection>
        ) : (
          <EmptyPanel
            icon={Clapperboard}
            title={t("profile.allSeriesEmpty")}
            hint={t("profile.allSeriesEmptyHint")}
            className="mt-8 py-8"
          />
        )}

        {allSeries.length > 0 ? (
          <HubPillHeader
            icon={History}
            label={t("watch.history")}
            linked
            onPress={() => router.push("/watch/history")}
          />
        ) : null}

        {/* Multi only — single mode (esp. no password) stays "authenticated" forever. */}
        {session?.mode === "multi" && session.authenticated ? (
          <View className="mt-2">
            <HubPillHeader
              icon={LogOut}
              label={t("auth.account.logout")}
              onPress={() => {
                void (async () => {
                  await signOut();
                  router.replace("/login");
                })();
              }}
            />
          </View>
        ) : null}

        <Modal
          isOpen={bannerPickerOpen}
          onClose={() => setBannerPickerOpen(false)}
          title={t("profile.banner.title")}
          className="gap-4 p-4"
        >
          <View className="relative gap-4">
            <Text className="font-sans text-sm leading-relaxed text-muted">
              {t("profile.banner.howto")}
            </Text>
            {bannerRef ? (
              <Pressable
                disabled={bannerBusy}
                onPress={() => {
                  void onPickBanner(null);
                }}
                className="border border-white/10 py-2.5 disabled:opacity-50"
              >
                <Text className="text-center font-sans text-sm text-muted">
                  {t("profile.banner.clear")}
                </Text>
              </Pressable>
            ) : null}
            {bannerBusy ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center bg-void/70"
              >
                <ActivityIndicator color={colors.yellow} />
              </View>
            ) : null}
          </View>
        </Modal>
      </PullToRefresh>
    </SeriesCardMenuProvider>
  );
}

function ProfileStatItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 items-center gap-1.5">
      <Text className="text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </Text>
      <Text className="text-center font-display text-2xl italic leading-none tracking-tight text-snow">
        {value}
      </Text>
    </View>
  );
}

function HubPillHeader({
  icon: Icon,
  label,
  count,
  linked,
  onPress,
}: {
  icon: typeof Heart;
  label: string;
  count?: number;
  linked?: boolean;
  onPress?: () => void;
}) {
  return (
    <View className="z-30 items-center px-3 py-1">
      <SectionPill onPress={onPress}>
        <View className="max-w-full flex-row items-center gap-1.5 px-2.5 py-1">
          <Icon size={14} color={colors.muted} strokeWidth={1.75} />
          <Text
            className="min-w-0 shrink font-sans text-sm font-semibold text-snow"
            numberOfLines={1}
          >
            {label}
          </Text>
          {count != null ? (
            <>
              <Text className="shrink-0 text-muted">|</Text>
              <Text className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</Text>
            </>
          ) : null}
          {linked ? <ChevronRight size={14} color={colors.muted} /> : null}
        </View>
      </SectionPill>
    </View>
  );
}

function SeriesGridSection({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <View className="mb-4 flex-col">
      {heading}
      {children}
    </View>
  );
}
