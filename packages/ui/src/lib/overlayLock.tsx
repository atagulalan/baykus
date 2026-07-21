import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type OverlayLockValue = {
  /** True while at least one overlay (Modal sheet) is open under this provider. */
  locked: boolean;
  acquire: () => void;
  release: () => void;
};

const OverlayLockContext = createContext<OverlayLockValue | null>(null);

const NOOP_LOCK: OverlayLockValue = {
  locked: false,
  acquire: () => {},
  release: () => {},
};

/**
 * Ref-count lock so nested sheets (Modal inside PullToRefresh) disable the
 * underlying scroll / pull-to-history gesture while open.
 */
export function OverlayLockProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const acquire = useCallback(() => {
    setCount((n) => n + 1);
  }, []);
  const release = useCallback(() => {
    setCount((n) => Math.max(0, n - 1));
  }, []);
  const value = useMemo(() => ({ locked: count > 0, acquire, release }), [count, acquire, release]);
  return <OverlayLockContext.Provider value={value}>{children}</OverlayLockContext.Provider>;
}

/** No-ops when used outside a provider (Storybook / isolated tests). */
export function useOverlayLock(): OverlayLockValue {
  return useContext(OverlayLockContext) ?? NOOP_LOCK;
}
