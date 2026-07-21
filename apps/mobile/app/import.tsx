import {
  ApiError,
  confirmTvTimeImport,
  type ExternalIds,
  type ImportZipResult,
  importTvTime,
  importZip,
  type TvTimeConfirmProgressEvent,
  type TvTimeConfirmResult,
  type TvTimeImportProgressEvent,
  type TvTimeReport,
} from "@baykus/api-client";
import { EmptyPanel, PageTitle, SegmentedButtonGroup } from "@baykus/ui";
import * as DocumentPicker from "expo-document-picker";
import { Stack } from "expo-router";
import { FileUp } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabContentBottom, tabContentTop } from "../src/chrome/layout.ts";

type Kind = "zip" | "tvtime";
type TvStep = "idle" | "matching" | "report" | "confirming" | "done";

export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>("zip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipResult, setZipResult] = useState<ImportZipResult | null>(null);

  const [tvStep, setTvStep] = useState<TvStep>("idle");
  const [tvLog, setTvLog] = useState<TvTimeImportProgressEvent[]>([]);
  const [tvReport, setTvReport] = useState<TvTimeReport | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ExternalIds>>({});
  const [tvProgress, setTvProgress] = useState<TvTimeConfirmProgressEvent | null>(null);
  const [tvSummary, setTvSummary] = useState<TvTimeConfirmResult | null>(null);

  async function pickBlob(types: string[]): Promise<Blob | null> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: types,
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return null;
    const res = await fetch(picked.assets[0].uri);
    return res.blob();
  }

  async function pickAndImportZip(mode: "merge" | "replace") {
    setError(null);
    setZipResult(null);
    const blob = await pickBlob(["application/zip"]);
    if (!blob) return;
    setBusy(true);
    try {
      setZipResult(await importZip(blob, mode));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "import_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickAndMatchTvTime() {
    setError(null);
    setTvLog([]);
    setTvReport(null);
    setTvSummary(null);
    setResolutions({});
    const blob = await pickBlob(["text/csv", "application/zip", "*/*"]);
    if (!blob) return;
    setBusy(true);
    setTvStep("matching");
    try {
      const report = await importTvTime(blob, (event) => {
        setTvLog((prev) => [event, ...prev].slice(0, 12));
      });
      setTvReport(report);
      const initial: Record<string, ExternalIds> = {};
      for (const fuzzy of report.fuzzy) {
        const first = fuzzy.candidates[0];
        if (first) initial[fuzzy.name] = first.externalIds;
      }
      setResolutions(initial);
      setTvStep("report");
    } catch (err) {
      setTvStep("idle");
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "tvtime_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmTv() {
    if (!tvReport) return;
    setBusy(true);
    setTvStep("confirming");
    setTvProgress(null);
    try {
      const chosen = Object.entries(resolutions).map(([name, externalIds]) => ({
        name,
        externalIds,
      }));
      const summary = await confirmTvTimeImport(tvReport.reportId, chosen, (event) => {
        setTvProgress(event);
      });
      setTvSummary(summary);
      setTvStep("done");
    } catch (err) {
      setTvStep("report");
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "confirm_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-void"
      contentContainerStyle={{
        padding: 16,
        paddingTop: tabContentTop(insets.top),
        paddingBottom: tabContentBottom(insets.bottom),
      }}
    >
      <Stack.Screen options={{ title: "" }} />
      <PageTitle className="mb-4">Import</PageTitle>
      <SegmentedButtonGroup
        value={kind}
        onChange={(next) => {
          setKind(next);
          setError(null);
        }}
        options={[
          { value: "zip", label: "Zip" },
          { value: "tvtime", label: "TV Time" },
        ]}
      />

      {error ? <Text className="mt-4 font-mono text-xs text-red-400">{error}</Text> : null}

      {kind === "zip" ? (
        <View className="mt-6 gap-4">
          {zipResult ? (
            <View className="gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <Text className="font-mono text-xs uppercase tracking-widest text-yellow">
                Imported
              </Text>
              <Text className="font-mono text-xs text-snow">
                {zipResult.items} series · {zipResult.watches} watches · {zipResult.ratings} ratings
                · {zipResult.mode}
              </Text>
            </View>
          ) : (
            <EmptyPanel
              icon={FileUp}
              title="Choose a zip"
              hint="Same format as Settings → Export on web."
              className="mt-0 py-8"
            />
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void pickAndImportZip("merge");
            }}
            className="h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
          >
            {busy ? (
              <ActivityIndicator color="#080808" />
            ) : (
              <Text className="font-mono text-xs uppercase tracking-widest text-void">
                Merge import
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void pickAndImportZip("replace");
            }}
            className="h-11 items-center justify-center rounded-full border border-white/15 active:bg-white/5 disabled:opacity-40"
          >
            <Text className="font-mono text-xs uppercase tracking-widest text-snow">
              Replace import
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 gap-4">
          {tvStep === "idle" || tvStep === "matching" ? (
            <>
              <EmptyPanel
                icon={FileUp}
                title="TV Time export"
                hint="Pick the CSV/zip from TV Time. Matching streams over SSE (same as web)."
                className="mt-0 py-8"
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  void pickAndMatchTvTime();
                }}
                className="h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
              >
                {busy ? (
                  <ActivityIndicator color="#080808" />
                ) : (
                  <Text className="font-mono text-xs uppercase tracking-widest text-void">
                    Choose file
                  </Text>
                )}
              </Pressable>
              {tvLog.length > 0 ? (
                <View className="gap-1 rounded-xl border border-white/10 p-3">
                  <Text className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                    Matching…
                  </Text>
                  {tvLog.map((ev, i) => (
                    <Text key={`${ev.name}-${i}`} className="font-mono text-[10px] text-snow">
                      {ev.done}/{ev.total} · {ev.status} · {ev.name}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {tvStep === "report" && tvReport ? (
            <View className="gap-4">
              <Text className="font-mono text-xs text-snow">
                Matched {tvReport.matched.length} · Fuzzy {tvReport.fuzzy.length} · Unmatched{" "}
                {tvReport.unmatched.length}
              </Text>
              {tvReport.fuzzy.map((fuzzy) => (
                <View key={fuzzy.name} className="gap-1 rounded-xl border border-white/10 p-3">
                  <Text className="text-sm text-snow">{fuzzy.name}</Text>
                  {fuzzy.candidates.map((c) => {
                    const selected =
                      JSON.stringify(resolutions[fuzzy.name]) === JSON.stringify(c.externalIds);
                    return (
                      <Pressable
                        key={`${c.title}-${c.externalIds.tmdbId ?? c.externalIds.tvmazeId}`}
                        accessibilityRole="button"
                        onPress={() =>
                          setResolutions((prev) => ({ ...prev, [fuzzy.name]: c.externalIds }))
                        }
                        className={`rounded-lg px-3 py-2 ${selected ? "bg-yellow/20" : "active:bg-white/5"}`}
                      >
                        <Text className="font-mono text-xs text-snow">
                          {c.title}
                          {c.year ? ` (${c.year})` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  void confirmTv();
                }}
                className="h-11 items-center justify-center rounded-full bg-yellow disabled:opacity-40"
              >
                <Text className="font-mono text-xs uppercase tracking-widest text-void">
                  Confirm import
                </Text>
              </Pressable>
            </View>
          ) : null}

          {tvStep === "confirming" ? (
            <View className="gap-2 rounded-xl border border-white/10 p-4">
              <ActivityIndicator color="#f0e000" />
              <Text className="font-mono text-xs text-muted">
                {tvProgress
                  ? `${tvProgress.done}/${tvProgress.total} · ${tvProgress.name}`
                  : "Applying…"}
              </Text>
            </View>
          ) : null}

          {tvStep === "done" && tvSummary ? (
            <View className="gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <Text className="font-mono text-xs uppercase tracking-widest text-yellow">Done</Text>
              <Text className="font-mono text-xs text-snow">
                {tvSummary.itemsCreated} series · {tvSummary.watchesCreated} watches ·{" "}
                {tvSummary.skipped} skipped
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTvStep("idle");
                  setTvReport(null);
                  setTvSummary(null);
                }}
                className="mt-2 h-10 items-center justify-center rounded-full border border-white/15"
              >
                <Text className="font-mono text-[10px] uppercase tracking-widest text-snow">
                  Import another
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
