import { useFocusEffect } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type HeaderActionContextValue = {
  /** Right-rail control in `MobileWordmark` (web `MobileHeaderAction` / series slot). */
  rightAction: ReactNode;
  setRightAction: (node: ReactNode) => void;
};

const HeaderActionContext = createContext<HeaderActionContextValue | null>(null);

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [rightAction, setRightActionState] = useState<ReactNode>(null);
  const setRightAction = useCallback((node: ReactNode) => {
    setRightActionState(node);
  }, []);
  const value = useMemo(() => ({ rightAction, setRightAction }), [rightAction, setRightAction]);
  return <HeaderActionContext.Provider value={value}>{children}</HeaderActionContext.Provider>;
}

export function useHeaderAction(): HeaderActionContextValue {
  const ctx = useContext(HeaderActionContext);
  if (!ctx) {
    throw new Error("useHeaderAction must be used within HeaderActionProvider");
  }
  return ctx;
}

/**
 * Register a chrome right-rail control while the calling screen is focused.
 * Clears on blur so dock navigations that keep the prior screen mounted (e.g.
 * series → profile) do not leak the previous screen's ⋮ into MobileWordmark.
 */
export function useHeaderRightAction(node: ReactNode) {
  const { setRightAction } = useHeaderAction();
  useFocusEffect(
    useCallback(() => {
      setRightAction(node);
      return () => setRightAction(null);
    }, [node, setRightAction]),
  );
}
