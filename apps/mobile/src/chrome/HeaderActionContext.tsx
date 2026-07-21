import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

/** Register a chrome right-rail control for the lifetime of the calling screen. */
export function useHeaderRightAction(node: ReactNode) {
  const { setRightAction } = useHeaderAction();
  useEffect(() => {
    setRightAction(node);
    return () => setRightAction(null);
  }, [node, setRightAction]);
}
