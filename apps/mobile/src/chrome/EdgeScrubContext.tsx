import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { BANNER_FADE_PX } from "./layout.ts";

type EdgeScrubContextValue = {
  /** 0–1 top scrub strength (bottom is always full). */
  topProgress: number;
  setTopProgress: (n: number) => void;
};

const EdgeScrubContext = createContext<EdgeScrubContextValue | null>(null);

export function EdgeScrubProvider({ children }: { children: ReactNode }) {
  const [topProgress, setTopProgressState] = useState(1);
  const setTopProgress = useCallback((n: number) => {
    setTopProgressState(Math.min(Math.max(n, 0), 1));
  }, []);
  const value = useMemo(() => ({ topProgress, setTopProgress }), [topProgress, setTopProgress]);
  return <EdgeScrubContext.Provider value={value}>{children}</EdgeScrubContext.Provider>;
}

export function useEdgeScrub(): EdgeScrubContextValue {
  const ctx = useContext(EdgeScrubContext);
  if (!ctx) {
    throw new Error("useEdgeScrub must be used within EdgeScrubProvider");
  }
  return ctx;
}

/**
 * Banner/hero pages: top scrub starts clear and ramps over the first 100px of scroll
 * (web `AppEdgeBlur` banner behaviour). Non-banner pages stay at full strength.
 */
export function useBannerEdgeScrub(enabled: boolean) {
  const { setTopProgress } = useEdgeScrub();

  useEffect(() => {
    if (!enabled) {
      setTopProgress(1);
      return;
    }
    setTopProgress(0);
    return () => setTopProgress(1);
  }, [enabled, setTopProgress]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled) return;
      const y = e.nativeEvent.contentOffset.y;
      setTopProgress(Math.min(Math.max(y / BANNER_FADE_PX, 0), 1));
    },
    [enabled, setTopProgress],
  );

  return { onScroll, scrollEventThrottle: 16 as const };
}
