/// <reference types="nativewind/types" />
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { useSegments } from "expo-router";
import { memo, useId, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useEdgeScrub } from "../chrome/EdgeScrubContext.tsx";
import { EDGE_BOTTOM_H, EDGE_TOP_H, HIDE_WORDMARK_SEGMENTS, Z_EDGE } from "../chrome/layout.ts";

type Edge = "top" | "bottom";

const BLUR_MIN = 1;
const BLUR_MAX = 8;

/** Map web blur px (1→8) onto expo-blur intensity (~10→45). */
function blurIntensity(progress: number): number {
  if (progress <= 0) return 0;
  const px = BLUR_MIN + progress * (BLUR_MAX - BLUR_MIN);
  return Math.round(10 + (px / BLUR_MAX) * 35);
}

function alpha(peak: number, progress: number): number {
  return Math.min(Math.max(peak * progress, 0), 1);
}

export function EdgeScrub({
  edge,
  height,
  progress,
  width,
  /** When nested under dock chrome, omit root zIndex so parent stacking wins. */
  nested = false,
}: {
  edge: Edge;
  height: number;
  progress: number;
  width: number;
  nested?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const tintId = `edge-tint-${edge}-${uid}`;

  const y1 = edge === "top" ? "0" : "1";
  const y2 = edge === "top" ? "1" : "0";

  const stops = useMemo(
    () => [
      { offset: "0%", opacity: alpha(1, progress) },
      { offset: "28%", opacity: alpha(0.72, progress) },
      { offset: "55%", opacity: alpha(0.35, progress) },
      { offset: "78%", opacity: alpha(0.1, progress) },
      { offset: "100%", opacity: 0 },
    ],
    [progress],
  );

  if (progress <= 0 || width <= 0) return null;

  const intensity = blurIntensity(progress);
  const edgeStyle = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height,
    ...(nested ? {} : { zIndex: Z_EDGE }),
    ...(edge === "top" ? { top: 0 } : { bottom: 0 }),
  };

  const maskStart = edge === "top" ? { x: 0, y: 0 } : { x: 0, y: 1 };
  const maskEnd = edge === "top" ? { x: 0, y: 1 } : { x: 0, y: 0 };

  return (
    <>
      {/* Black gradient tint — mirrors web; never use View opacity (kills blur feel). */}
      <View pointerEvents="none" style={edgeStyle}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={tintId} x1="0" y1={y1} x2="0" y2={y2}>
              {stops.map((s) => (
                <Stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor="#000000"
                  stopOpacity={s.opacity}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${tintId})`} />
        </Svg>
      </View>

      {/* Masked blur — opaque at the screen edge, clear toward content. */}
      {intensity > 0 ? (
        <MaskedView
          pointerEvents="none"
          style={edgeStyle}
          maskElement={
            <ExpoLinearGradient
              colors={["#000000", "#000000", "transparent"]}
              locations={[0, 0.5, 1]}
              start={maskStart}
              end={maskEnd}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        </MaskedView>
      ) : null}
    </>
  );
}

/**
 * Viewport edge scrubs under chrome, above page — web `AppEdgeBlur` parity.
 *
 * Top/bottom are omitted when chrome owns them:
 * - Top → `MobileWordmark` (behind the logo, flush to screen top)
 * - Bottom → `MobileDock` (behind icons; also on inner stack screens)
 * Root still paints both edges on login/claim/dev (no wordmark / dock).
 */
export const AppEdgeBlur = memo(function AppEdgeBlur() {
  const { width } = useWindowDimensions();
  const { topProgress } = useEdgeScrub();
  const segments = useSegments();
  const root = segments[0];
  const chromeHidden = Boolean(root && HIDE_WORDMARK_SEGMENTS.has(root));

  return (
    <>
      {chromeHidden ? (
        <EdgeScrub edge="top" height={EDGE_TOP_H} progress={topProgress} width={width} />
      ) : null}
      {chromeHidden ? (
        <EdgeScrub edge="bottom" height={EDGE_BOTTOM_H} progress={1} width={width} />
      ) : null}
    </>
  );
});
