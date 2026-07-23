/// <reference types="nativewind/types" />
import { Star } from "lucide-react-native";
import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import {
  RatingControl,
  type RatingControlLabels,
  type RatingValue,
} from "../atoms/RatingControl.tsx";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";
import { Modal } from "./Modal.tsx";

export type SeriesDetailsSheetDetail = {
  title: string;
  tagline?: string | null;
  overview?: string | null;
  /** Provider releaseStatus enum (for chip color). */
  releaseStatus?: string | null;
  releaseStatusLabel?: string | null;
  genrePills?: string[];
  tagPills?: string[];
  networks?: Array<{ name: string; logoUrl?: string | null }>;
  runtimeLabel?: string | null;
  addedLabel?: string | null;
  refreshedLabel?: string | null;
  neverRefreshed?: boolean;
  stale?: boolean;
  contentRating?: string | null;
  languageLabel?: string | null;
  externalRatings?: Array<{ source: string; display: string }>;
  myRating?: RatingValue | null;
  providers?: Array<{ provider: string; region: string; logoUrl?: string | null }>;
};

export type SeriesDetailsSheetLabels = {
  genres: string;
  tags: string;
  info: string;
  production: string;
  runtime: string;
  added: string;
  refreshed: string;
  neverRefreshed: string;
  stale: string;
  contentRating: string;
  language: string;
  ratings: string;
  yourRating: string;
  providers: string;
  justWatch: string;
  separator?: string;
};

export type SeriesDetailsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  detail: SeriesDetailsSheetDetail;
  labels: SeriesDetailsSheetLabels;
  ratingLabels?: RatingControlLabels;
  onRateChange?: (value: RatingValue | null) => void;
  preview?: boolean;
  castSlot?: ReactNode;
  className?: string;
};

const CHIP_BASE = "rounded-full px-2.5 py-1";

const RELEASE_STATUS_STYLES: Record<string, string> = {
  returning: "bg-yellow/5",
  in_production: "bg-yellow/5",
  planned: "bg-sky-400/5",
  pilot: "bg-sky-400/5",
  canceled: "bg-red-400/5",
  ended: "bg-white/5",
};

const RELEASE_STATUS_BORDERS: Record<string, ViewStyle> = {
  returning: borders.yellowSoft,
  in_production: borders.yellowSoft,
  planned: {
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderStyle: "solid",
  },
  pilot: {
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderStyle: "solid",
  },
  canceled: {
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.25)",
    borderStyle: "solid",
  },
  ended: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderStyle: "solid",
  },
};

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-4 py-0.5">
      <Text className="shrink-0 text-sm text-muted">{label}</Text>
      <View className="min-w-0 flex-1 items-end">{children}</View>
    </View>
  );
}

function ReleaseStatusBadge({ status, label }: { status: string | null; label: string }) {
  const styleKey = status && RELEASE_STATUS_STYLES[status] ? status : "ended";
  const chipClass = RELEASE_STATUS_STYLES[styleKey] ?? RELEASE_STATUS_STYLES.ended;
  const textColor =
    styleKey === "returning" || styleKey === "in_production"
      ? colors.yellow
      : styleKey === "planned" || styleKey === "pilot"
        ? "#7dd3fc"
        : styleKey === "canceled"
          ? "#fca5a5"
          : colors.muted;
  return (
    <View
      className={cn(CHIP_BASE, "shrink-0", chipClass)}
      style={RELEASE_STATUS_BORDERS[styleKey] ?? RELEASE_STATUS_BORDERS.ended}
    >
      <Text style={{ color: textColor }} className="text-xs">
        {label}
      </Text>
    </View>
  );
}

function LogoOrText({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) {
    return <Text className="text-sm text-snow/80">{alt}</Text>;
  }
  return (
    <MediaImage
      src={src}
      accessibilityLabel={alt}
      wrapperStyle={{ height: 16, minWidth: 16 }}
      style={{ height: 16, width: 48 }}
      resizeMode="contain"
    />
  );
}

/** Dense series metadata sheet — native port of web SeriesDetailsSheet (WP3). */
export function SeriesDetailsSheet({
  isOpen,
  onClose,
  detail,
  labels,
  ratingLabels,
  onRateChange,
  preview = false,
  castSlot,
  className,
}: SeriesDetailsSheetProps) {
  const statusBadge =
    detail.releaseStatusLabel != null ? (
      <ReleaseStatusBadge status={detail.releaseStatus ?? null} label={detail.releaseStatusLabel} />
    ) : null;

  const sep = labels.separator ?? "·";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={detail.title}
      titleAccessory={statusBadge}
      size="large"
      className={cn("gap-5 px-4 pb-8 pt-3", className)}
    >
      {detail.tagline || detail.overview ? (
        <View className="gap-1.5">
          {detail.tagline ? (
            <Text className="text-sm italic text-muted">{`"${detail.tagline}"`}</Text>
          ) : null}
          {detail.overview ? <Text className="text-sm text-snow/90">{detail.overview}</Text> : null}
        </View>
      ) : null}

      {detail.genrePills && detail.genrePills.length > 0 ? (
        <SheetSection title={labels.genres}>
          <View className="flex-row flex-wrap gap-1.5">
            {detail.genrePills.map((name) => (
              <View
                key={name}
                className="rounded-full bg-white/5 px-2.5 py-1"
                style={borders.subtle}
              >
                <Text className="text-xs text-snow/80">{name}</Text>
              </View>
            ))}
          </View>
        </SheetSection>
      ) : null}

      {detail.tagPills && detail.tagPills.length > 0 ? (
        <SheetSection title={labels.tags}>
          <View className="flex-row flex-wrap gap-1.5">
            {detail.tagPills.map((name) => (
              <View
                key={name}
                className="rounded-full bg-yellow/5 px-2.5 py-1"
                style={borders.yellowSoft}
              >
                <Text className="text-xs text-yellow">{name}</Text>
              </View>
            ))}
          </View>
        </SheetSection>
      ) : null}

      {(detail.networks && detail.networks.length > 0) ||
      detail.runtimeLabel ||
      !preview ||
      detail.contentRating ||
      detail.languageLabel ? (
        <SheetSection title={labels.info}>
          <View className="gap-1">
            {detail.networks && detail.networks.length > 0 ? (
              <InfoRow label={labels.production}>
                <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
                  {detail.networks.map((n) => (
                    <LogoOrText key={n.name} src={n.logoUrl} alt={n.name} />
                  ))}
                </View>
              </InfoRow>
            ) : null}
            {detail.runtimeLabel ? (
              <InfoRow label={labels.runtime}>
                <Text className="font-mono text-xs tabular-nums text-snow/80">
                  {detail.runtimeLabel}
                </Text>
              </InfoRow>
            ) : null}
            {!preview ? (
              <>
                {detail.addedLabel ? (
                  <InfoRow label={labels.added}>
                    <Text className="font-mono text-xs tabular-nums text-snow/80">
                      {detail.addedLabel}
                    </Text>
                  </InfoRow>
                ) : null}
                <InfoRow label={labels.refreshed}>
                  <View className="flex-row flex-wrap items-center justify-end gap-2">
                    <Text className="font-mono text-xs tabular-nums text-snow/80">
                      {detail.neverRefreshed
                        ? labels.neverRefreshed
                        : (detail.refreshedLabel ?? labels.neverRefreshed)}
                    </Text>
                    {detail.stale ? (
                      <View
                        className="rounded-full px-1.5 py-0.5"
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(240, 224, 0, 0.4)",
                          borderStyle: "solid",
                        }}
                      >
                        <Text className="font-sans text-[10px] text-yellow">{labels.stale}</Text>
                      </View>
                    ) : null}
                  </View>
                </InfoRow>
              </>
            ) : null}
            {detail.contentRating ? (
              <InfoRow label={labels.contentRating}>
                <Text className="text-sm text-snow/80">{detail.contentRating}</Text>
              </InfoRow>
            ) : null}
            {detail.languageLabel ? (
              <InfoRow label={labels.language}>
                <Text className="text-sm text-snow/80">{detail.languageLabel}</Text>
              </InfoRow>
            ) : null}
          </View>
        </SheetSection>
      ) : null}

      {detail.externalRatings && detail.externalRatings.length > 0 ? (
        <SheetSection title={labels.ratings}>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {detail.externalRatings.map((r, i) => (
              <View key={r.source} className="flex-row items-center gap-1">
                {i > 0 ? <Text className="text-sm text-muted/60">{sep}</Text> : null}
                <Star size={12} strokeWidth={1.5} color={colors.yellow} />
                <Text className="text-sm text-muted">
                  {r.source.toUpperCase()} {r.display}
                </Text>
              </View>
            ))}
          </View>
        </SheetSection>
      ) : null}
      {!preview && ratingLabels && onRateChange ? (
        <View className="items-center pt-2">
          <View>
            <RatingControl
              value={detail.myRating ?? null}
              onChange={onRateChange}
              labels={ratingLabels}
              iconsOnly
            />
          </View>
        </View>
      ) : null}

      {detail.providers && detail.providers.length > 0 ? (
        <SheetSection title={labels.providers}>
          <View className="flex-row flex-wrap items-center gap-2">
            {detail.providers.map((wp) => (
              <View
                key={`${wp.provider}-${wp.region}`}
                className="flex-row items-center gap-1 bg-white/5 px-2 py-1"
              >
                {wp.logoUrl ? (
                  <MediaImage
                    src={wp.logoUrl}
                    accessibilityLabel=""
                    style={{ width: 16, height: 16 }}
                    wrapperStyle={{ width: 16, height: 16 }}
                  />
                ) : null}
                <Text className="text-xs text-snow">
                  {wp.provider} ({wp.region})
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-xs text-muted">{labels.justWatch}</Text>
        </SheetSection>
      ) : null}

      {castSlot}
    </Modal>
  );
}
