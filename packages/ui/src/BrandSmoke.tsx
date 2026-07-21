/// <reference types="nativewind/types" />
import { Library } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Checkbox } from "./atoms/Checkbox.tsx";
import { CircularProgress } from "./atoms/CircularProgress.tsx";
import { EpisodeLabel } from "./atoms/EpisodeLabel.tsx";
import { PageTitle } from "./atoms/PageTitle.tsx";
import { RatingControl } from "./atoms/RatingControl.tsx";
import { SectionPill } from "./atoms/SectionPill.tsx";
import { SegmentedProgress } from "./atoms/SegmentedProgress.tsx";
import { ConfirmDialog } from "./molecules/ConfirmDialog.tsx";
import { EmptyPanel } from "./molecules/EmptyPanel.tsx";
import { EpisodeTags } from "./molecules/EpisodeTags.tsx";
import { SeriesCard } from "./molecules/SeriesCard.tsx";

export type BrandSmokeProps = {
  subtitle?: string;
};

/** Dev smoke screen — shared atoms + molecules on NativeWind. */
export function BrandSmoke({ subtitle }: BrandSmokeProps) {
  const [checked, setChecked] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | null>(2);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <ScrollView
      className="flex-1 bg-void"
      contentContainerClassName="items-center gap-4 px-6 py-12"
    >
      <PageTitle>baykuş</PageTitle>
      {subtitle ? <Text className="text-center text-sm text-snow">{subtitle}</Text> : null}

      <SectionPill>İzleniyor</SectionPill>
      <View className="flex-row items-center gap-2">
        <CircularProgress value={45} />
        <CircularProgress value={100} complete />
        <EpisodeLabel s={1} e={6} format="SxEy" className="text-muted" />
      </View>

      <EpisodeTags
        s={1}
        e={1}
        airDate="2024-07-21"
        airStamp="2024-07-21T00:00:00Z"
        episodeType="standard"
        labels={{
          new: "YENİ",
          upcoming: "YAKINDA",
          premiere: "PREMIERE",
          finale: "FİNAL",
          special: "SPECIAL",
          ova: "OVA",
        }}
      />

      <View className="w-36">
        <SeriesCard
          onPress={() => setConfirmOpen(true)}
          series={{
            id: 1,
            title: "Demo Series",
            year: 2024,
            posterUrl: null,
            category: "watching",
            rating: 3,
            progress: { watched: 13, aired: 20 },
            seasonProgress: {
              sequential: true,
              seasons: [
                { number: 1, watched: 10, total: 10, announced: 10 },
                { number: 2, watched: 3, total: 10, announced: 10 },
              ],
            },
          }}
        />
      </View>

      <View className="w-full max-w-xs">
        <SegmentedProgress
          watched={13}
          aired={20}
          category="watching"
          seasonProgress={{
            sequential: true,
            seasons: [
              { number: 1, watched: 10, total: 10, announced: 10 },
              { number: 2, watched: 3, total: 10, announced: 10 },
            ],
          }}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Checkbox checked={checked} onChange={setChecked} accessibilityLabel="Mark watched" />
        <RatingControl
          value={rating}
          onChange={setRating}
          labels={{ group: "Rating", bad: "kötü", okay: "normal", good: "iyi" }}
          iconsOnly
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setConfirmOpen(true)}
        className="rounded-full bg-yellow px-5 py-2.5 active:opacity-90"
      >
        <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
          Open confirm
        </Text>
      </Pressable>

      <EmptyPanel
        icon={Library}
        title="Henüz dizi yok"
        hint="Kütüphanene ilk diziyi ekle"
        className="py-8"
      />

      {confirmOpen ? (
        <ConfirmDialog
          title="Silinsin mi?"
          body="Bu işlem geri alınamaz."
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          variant="danger"
          onConfirm={() => {}}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}

      <Text className="pb-8 text-center text-xs text-muted">
        Molecules — docs/react-native-migration.md Phase 4
      </Text>
    </ScrollView>
  );
}
