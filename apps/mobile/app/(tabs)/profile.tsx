import {
  ApiError,
  buildAvatarUrl,
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
  MediaImage,
  PageTitle,
  PullToRefresh,
  SeriesCard,
  SkeletonBone,
} from "@baykus/ui";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { Clapperboard, Image as ImageLucide, User } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { exportLibraryZip } from "../../src/lib/exportZip.ts";
import { toSeriesCardSeries } from "../../src/lib/mapSeriesCard.ts";

const PROFILE_FAVORITES_LIMIT = 6;
const PROFILE_ALL_SERIES_LIMIT = 6;

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function ProfileScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 4 : width >= 480 ? 3 : 2;
  const [stats, setStats] = useState<Stats | null>(null);
  const [allSeries, setAllSeries] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [avatarRef, setAvatarRef] = useState<string | null>(null);
  const [bannerRef, setBannerRef] = useState<string | null>(null);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const handle = session?.handle ?? "library";

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
      if (settings.locale === "en" || settings.locale === "tr") {
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

  const favorites = useMemo(() => allSeries.filter((item) => item.favorite), [allSeries]);

  const bannerCandidates = useMemo(
    () => allSeries.filter((s) => s.backdropRef != null),
    [allSeries],
  );

  const bannerUrl = buildImageUrl(bannerRef, "large");

  const tiles = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Episodes", value: String(stats.episodesWatched) },
      { label: "Watch time", value: formatMinutes(stats.watchTimeMin) },
      { label: "Series", value: String(stats.seriesCount) },
      { label: "Favorites", value: String(stats.favoritesCount) },
    ];
  }, [stats]);

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await exportLibraryZip(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "export_failed");
    } finally {
      setExporting(false);
    }
  }

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
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const settings = await uploadAvatar(blob);
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
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <SkeletonBone className="mb-4 h-40 w-full rounded-xl" />
        <SkeletonBone className="mb-4 h-8 w-40" />
        <View className="mb-4 flex-row flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="min-w-[45%] flex-1">
              <SkeletonBone className="h-16 w-full rounded-md" />
            </View>
          ))}
        </View>
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

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 32,
        paddingTop: 0,
      }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    >
      <View className="relative mb-4 min-h-[12rem] overflow-hidden">
        {bannerUrl ? (
          <>
            <MediaImage
              src={bannerUrl}
              accessibilityLabel=""
              wrapperClassName="absolute inset-0"
              className="h-full w-full"
            />
            <View className="absolute inset-0 bg-black/45" />
          </>
        ) : (
          <View className="absolute inset-0 bg-white/5" />
        )}
        <View
          className="relative z-10 px-3 pb-4"
          style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
        >
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <PageTitle className="mb-1">@{handle}</PageTitle>
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {session?.mode ?? "—"} mode
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.banner.title")}
              onPress={() => setBannerPickerOpen(true)}
              className="flex-row items-center gap-1.5 rounded-full border border-white/20 bg-void/60 px-3 py-2 active:bg-void/80"
            >
              <ImageLucide size={14} color={colors.muted} />
              <Text className="font-mono text-[10px] uppercase tracking-widest text-snow">
                Banner
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={avatarBusy}
            onPress={() => {
              void onPickAvatar();
            }}
            className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-void/70 active:opacity-80 disabled:opacity-40"
          >
            {avatarBusy ? (
              <ActivityIndicator color={colors.yellow} />
            ) : buildAvatarUrl(avatarRef) ? (
              <MediaImage
                src={buildAvatarUrl(avatarRef)!}
                accessibilityLabel={handle}
                wrapperClassName="h-full w-full"
                className="h-full w-full"
              />
            ) : (
              <User size={28} color={colors.muted} />
            )}
          </Pressable>
        </View>
      </View>

      <View className="px-3">
        {error ? <Text className="mb-3 font-mono text-xs text-red-400">{error}</Text> : null}

        <View className="mb-6 flex-row flex-wrap gap-2">
          {tiles.map((tile) => (
            <Pressable
              key={tile.label}
              accessibilityRole="button"
              onPress={() => router.push("/profile/stats")}
              className="min-w-[45%] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 active:bg-white/10"
            >
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {tile.label}
              </Text>
              <Text className="mt-1 font-display text-2xl italic text-snow">{tile.value}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/profile/stats")}
          className="mb-6"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-muted underline">
            {t("profile.detailedStats")}
          </Text>
        </Pressable>

        <HubSection
          title={t("profile.favorites.title")}
          count={favorites.length}
          seeAllHref={favorites.length > PROFILE_FAVORITES_LIMIT ? "/library/favorites" : null}
          seeAllLabel={`See all (${favorites.length})`}
        >
          {favorites.length === 0 ? (
            <EmptyPanel
              icon={User}
              title={t("profile.favorites.emptyTitle")}
              hint={t("profile.favorites.empty")}
              className="mt-0 py-8"
            />
          ) : (
            <View className="flex-row flex-wrap">
              {favorites.slice(0, PROFILE_FAVORITES_LIMIT).map((item) => (
                <View key={item.id} style={{ width: `${100 / cols}%` }}>
                  <SeriesCard
                    series={toSeriesCardSeries(item)}
                    onPress={() => router.push(`/series/${seriesParam(item)}`)}
                  />
                </View>
              ))}
            </View>
          )}
        </HubSection>

        <HubSection
          title={t("profile.allSeries")}
          count={allSeries.length}
          seeAllHref={allSeries.length > PROFILE_ALL_SERIES_LIMIT ? "/library/all" : null}
          seeAllLabel={`See all (${allSeries.length})`}
        >
          {allSeries.length === 0 ? (
            <EmptyPanel
              icon={Clapperboard}
              title={t("profile.allSeriesEmpty")}
              hint={t("profile.allSeriesEmptyHint")}
              className="mt-0 py-8"
            />
          ) : (
            <View className="mb-6 flex-row flex-wrap">
              {allSeries.slice(0, PROFILE_ALL_SERIES_LIMIT).map((item) => (
                <View key={item.id} style={{ width: `${100 / cols}%` }}>
                  <SeriesCard
                    series={toSeriesCardSeries(item)}
                    onPress={() => router.push(`/series/${seriesParam(item)}`)}
                  />
                </View>
              ))}
            </View>
          )}
        </HubSection>

        <View className="mb-6 gap-2">
          <LinkRow href="/library/all" label={t("profile.allSeries")} />
          <LinkRow href="/library/favorites" label={t("profile.favorites.title")} />
          <LinkRow href="/profile/stats" label={t("profile.detailedStats")} />
          <LinkRow href="/watch/history" label="Watch history" />
          <LinkRow href="/(tabs)/settings" label={t("app.nav.settings")} />
          <LinkRow href="/import" label="Import zip" />
          <Pressable
            accessibilityRole="button"
            disabled={exporting}
            onPress={() => {
              void onExport();
            }}
            className="rounded-xl border border-white/10 px-3 py-3 active:bg-white/5 disabled:opacity-40"
          >
            {exporting ? (
              <ActivityIndicator color="#ebebeb" />
            ) : (
              <Text className="font-mono text-xs uppercase tracking-widest text-snow">
                Export zip
              </Text>
            )}
          </Pressable>
          {session?.mode === "multi" && !session.authenticated ? (
            <LinkRow href="/claim" label="Claim handle" />
          ) : null}
          {session?.mode === "multi" && !session.authenticated ? (
            <LinkRow href="/login" label="Sign in" />
          ) : null}
          <LinkRow href="/dev/smoke" label="Brand smoke" />
          {session?.authenticated ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void signOut();
              }}
              className="rounded-xl border border-white/10 px-3 py-3 active:bg-white/5"
            >
              <Text className="font-mono text-xs uppercase tracking-widest text-muted">
                Sign out
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal
        visible={bannerPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBannerPickerOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View
            className="max-h-[80%] rounded-t-2xl border border-white/10 bg-void"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
              <Text className="font-mono text-xs uppercase tracking-widest text-snow">
                {t("profile.banner.title")}
              </Text>
              <Pressable onPress={() => setBannerPickerOpen(false)} className="px-2 py-1">
                <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Close
                </Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {bannerBusy ? <ActivityIndicator color={colors.yellow} /> : null}
              {bannerCandidates.length === 0 ? (
                <Text className="py-8 text-center font-mono text-xs text-muted">
                  {t("profile.banner.empty")}
                </Text>
              ) : (
                <>
                  {bannerRef ? (
                    <Pressable
                      disabled={bannerBusy}
                      onPress={() => {
                        void onPickBanner(null);
                      }}
                      className="border border-white/10 py-2 disabled:opacity-50"
                    >
                      <Text className="text-center font-mono text-[10px] uppercase tracking-widest text-muted">
                        {t("profile.banner.clear")}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View className="flex-row flex-wrap gap-2">
                    {bannerCandidates.map((series) => {
                      const thumb = buildImageUrl(series.backdropRef, "medium");
                      if (!thumb) return null;
                      const selected = series.backdropRef === bannerRef;
                      return (
                        <Pressable
                          key={series.id}
                          disabled={bannerBusy}
                          onPress={() => {
                            void onPickBanner(series.backdropRef);
                          }}
                          className={`w-[48%] overflow-hidden border disabled:opacity-50 ${
                            selected ? "border-yellow" : "border-white/10"
                          }`}
                          style={{ aspectRatio: 16 / 9 }}
                        >
                          <MediaImage
                            src={thumb}
                            accessibilityLabel={series.title}
                            wrapperClassName="h-full w-full"
                            className="h-full w-full"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PullToRefresh>
  );
}

function HubSection({
  title,
  count,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  title: string;
  count: number;
  seeAllHref: "/library/favorites" | "/library/all" | null;
  seeAllLabel: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-2">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {title}
          {count > 0 ? ` (${count})` : ""}
        </Text>
        {seeAllHref ? (
          <Link href={seeAllHref} asChild>
            <Pressable>
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted underline">
                {seeAllLabel}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function LinkRow({
  href,
  label,
}: {
  href:
    | "/library/all"
    | "/library/favorites"
    | "/profile/stats"
    | "/watch/history"
    | "/import"
    | "/claim"
    | "/login"
    | "/dev/smoke"
    | "/(tabs)/settings";
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable className="rounded-xl border border-white/10 px-3 py-3 active:bg-white/5">
        <Text className="font-mono text-xs uppercase tracking-widest text-snow">{label}</Text>
      </Pressable>
    </Link>
  );
}
