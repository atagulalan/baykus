/// <reference types="nativewind/types" />
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type MediaImageProps = {
  src: string;
  accessibilityLabel?: string;
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ImageStyle>;
  /** Cover the parent (absolute fill). Parent must have a bounded size. */
  fill?: boolean;
  resizeMode?: ImageResizeMode;
  onLoad?: () => void;
  onError?: () => void;
};

/** Image with a centered spinner until load completes. Always `cover` by default so
 * intrinsic bitmap size never expands the layout (RN Image gotcha). */
export function MediaImage(props: MediaImageProps) {
  return <MediaImageInner key={props.src} {...props} />;
}

function MediaImageInner({
  src,
  accessibilityLabel,
  className,
  wrapperClassName,
  wrapperStyle,
  style,
  fill = false,
  resizeMode = "cover",
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
      className={cn("relative overflow-hidden", fill && "absolute inset-0", wrapperClassName)}
      style={[fill ? StyleSheet.absoluteFillObject : null, wrapperStyle]}
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
        resizeMode={resizeMode}
        className={cn(className, phase === "ready" ? "opacity-100" : "opacity-0")}
        style={[{ width: "100%", height: "100%" }, style]}
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
