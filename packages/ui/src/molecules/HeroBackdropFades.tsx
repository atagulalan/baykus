/// <reference types="nativewind/types" />
import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors } from "../tokens.ts";

export type HeroBackdropFadesProps = {
  width: number;
  height: number;
  /** Side vignettes — web sm+ `from-void via-transparent to-void`. */
  sideFades?: boolean;
};

/**
 * Soft edge fades over a hero backdrop — mirrors web SeriesDetailHero:
 * `bg-black/45` + `bg-gradient-to-b from-transparent via-void/20 to-void`
 * (+ optional L/R void vignettes).
 */
export function HeroBackdropFades({ width, height, sideFades = false }: HeroBackdropFadesProps) {
  const uid = useId().replace(/:/g, "");
  const idBottom = `heroBottom-${uid}`;
  const idLeft = `heroLeft-${uid}`;
  const idRight = `heroRight-${uid}`;

  if (width <= 0 || height <= 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* from-transparent via-void/20 to-void */}
          <LinearGradient id={idBottom} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.void} stopOpacity={0} />
            <Stop offset="50%" stopColor={colors.void} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={colors.void} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id={idLeft} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.void} stopOpacity={1} />
            <Stop offset="50%" stopColor={colors.void} stopOpacity={0} />
            <Stop offset="100%" stopColor={colors.void} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={idRight} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.void} stopOpacity={0} />
            <Stop offset="50%" stopColor={colors.void} stopOpacity={0} />
            <Stop offset="100%" stopColor={colors.void} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${idBottom})`} />
        {sideFades ? (
          <>
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${idLeft})`} />
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${idRight})`} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
