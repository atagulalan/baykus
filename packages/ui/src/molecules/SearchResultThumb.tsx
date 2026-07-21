/// <reference types="nativewind/types" />
import { Clapperboard } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type SearchResultThumbProps = {
  imageUrl: string | null;
  title: string;
  className?: string;
};

/** Compact search hit poster thumb. */
export function SearchResultThumb({ imageUrl, title, className }: SearchResultThumbProps) {
  const [failed, setFailed] = useState(false);

  return (
    <View className={cn("h-16 w-12 overflow-hidden rounded bg-white/5", className)}>
      {imageUrl && !failed ? (
        <MediaImage
          src={imageUrl}
          accessibilityLabel={title}
          wrapperClassName="h-full w-full"
          className="h-full w-full"
          onError={() => setFailed(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Clapperboard size={18} color={colors.muted} />
        </View>
      )}
    </View>
  );
}
