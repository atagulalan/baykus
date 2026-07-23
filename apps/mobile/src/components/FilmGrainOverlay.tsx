/// <reference types="nativewind/types" />
import { useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { BARE_NO_EDGE_SEGMENTS } from "../chrome/layout.ts";

const NOISE_URI =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * Subtle film-grain overlay — web `body::after` parity (`apps/web/src/index.css`).
 * Sits above page chrome but below modal overlays. Skipped on bare auth.
 */
export function FilmGrainOverlay() {
  const segments = useSegments();
  const root = segments[0];
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // RN Animated has no Easing.steps — linear drift is enough for grain.
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  if (root && BARE_NO_EDGE_SEGMENTS.has(root)) return null;

  const translateX = shift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -6, 4, -3, 0],
  });
  const translateY = shift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -8, 3, 6, 0],
  });

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.Image
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        source={{ uri: NOISE_URI }}
        resizeMode="repeat"
        style={[
          styles.noise,
          {
            opacity: 0.07,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
    overflow: "hidden",
  },
  noise: {
    position: "absolute",
    top: "-25%",
    left: "-25%",
    width: "150%",
    height: "150%",
  },
});
