/// <reference types="nativewind/types" />
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, type ImageStyle, type StyleProp, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type MediaImageProps = {
  src: string;
  accessibilityLabel?: string;
  className?: string;
  wrapperClassName?: string;
  style?: StyleProp<ImageStyle>;
  onLoad?: () => void;
  onError?: () => void;
};

/** Image with a centered spinner until load completes. */
export function MediaImage(props: MediaImageProps) {
  return <MediaImageInner key={props.src} {...props} />;
}

function MediaImageInner({
  src,
  accessibilityLabel,
  className,
  wrapperClassName,
  style,
  onLoad,
  onError,
}: MediaImageProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setPhase("loading");
  }, []);

  if (phase === "error") return null;

  return (
    <View
      className={cn("relative overflow-hidden", wrapperClassName)}
      accessibilityState={{ busy: phase === "loading" }}
    >
      {phase === "loading" ? (
        <View className="absolute inset-0 z-10 items-center justify-center" pointerEvents="none">
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : null}
      <Image
        source={{ uri: src }}
        accessibilityLabel={accessibilityLabel}
        className={cn(className, phase === "ready" ? "opacity-100" : "opacity-0")}
        style={style}
        onLoad={() => {
          setPhase("ready");
          onLoad?.();
        }}
        onError={() => {
          setPhase("error");
          onError?.();
        }}
      />
    </View>
  );
}
