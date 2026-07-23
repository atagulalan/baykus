/// <reference types="nativewind/types" />
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "../lib/cn.ts";

const PANEL_DURATION_MS = 300;
const PANEL_EASING = Easing.inOut(Easing.ease);
const PANEL_TIMING = { duration: PANEL_DURATION_MS, easing: PANEL_EASING } as const;

/**
 * No-op kept for call-site compatibility. Height open/close is driven by
 * `AccordionPanel` via Reanimated — do not use LayoutAnimation for list resize.
 */
export function animateLayoutToggle() {}

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionType;
  value: string[];
  toggle: (itemValue: string) => void;
  collapsible: boolean;
  getTriggerId: (itemValue: string) => string;
  getContentId: (itemValue: string) => string;
}

const AccordionCtx = createContext<AccordionContextValue | null>(null);

function useAccordionCtx(component: string): AccordionContextValue {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error(`${component} must be used within <Accordion>`);
  return ctx;
}

interface AccordionItemContextValue {
  value: string;
  open: boolean;
}

const AccordionItemCtx = createContext<AccordionItemContextValue | null>(null);

function useAccordionItemCtx(component: string): AccordionItemContextValue {
  const ctx = useContext(AccordionItemCtx);
  if (!ctx) throw new Error(`${component} must be used within <AccordionItem>`);
  return ctx;
}

function toArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export type AccordionPanelProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Unmount children after the close tween finishes (or immediately when
   * `animated={false}`). Default true.
   * Children stay mounted during animated open/close so New Arch / Android
   * can tween height.
   */
  unmountOnExit?: boolean;
  /**
   * When false, expand/collapse instantly (natural layout height) — no
   * Reanimated height tween. Prefer for large nested lists inside FlatList
   * body cells (series-detail seasons) where height animation causes jank.
   * Default true.
   */
  animated?: boolean;
};

/** Instant expand/collapse — natural height, no Reanimated measure/tween. */
function AccordionPanelInstant({
  open,
  children,
  className,
  contentClassName,
  unmountOnExit,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  unmountOnExit: boolean;
}) {
  // Keep a native child slot when fully closed so StickySectionScroll header
  // cells stay aligned — `return null` would shift FlatList indices.
  const [present, setPresent] = useState(open || !unmountOnExit);

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    if (unmountOnExit) setPresent(false);
  }, [open, unmountOnExit]);

  if (!present) {
    return (
      <View
        collapsable={false}
        {...(className !== undefined ? { className } : {})}
        style={{ height: 0 }}
      />
    );
  }

  if (!open) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        collapsable={false}
        {...(className !== undefined ? { className } : {})}
        style={{ height: 0, overflow: "hidden" }}
      >
        <View className={cn(contentClassName)}>{children}</View>
      </View>
    );
  }

  return (
    <View
      collapsable={false}
      {...(className !== undefined ? { className } : {})}
      style={{ overflow: "hidden" }}
    >
      <View className={cn(contentClassName)}>{children}</View>
    </View>
  );
}

/** Controlled collapse panel — Reanimated measured-height open/close. */
function AccordionPanelAnimated({
  open,
  children,
  className,
  contentClassName,
  unmountOnExit,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  unmountOnExit: boolean;
}) {
  const [present, setPresent] = useState(open || !unmountOnExit);
  const measuredHeight = useSharedValue(0);
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const target = measuredHeight.value;
      animatedOpacity.value = withTiming(1, PANEL_TIMING);
      // If content is not measured yet, onLayout will drive the open tween.
      if (target > 0) {
        animatedHeight.value = withTiming(target, PANEL_TIMING);
      }
      return;
    }

    animatedOpacity.value = withTiming(0, PANEL_TIMING);
    animatedHeight.value = withTiming(0, PANEL_TIMING, (finished) => {
      if (finished && unmountOnExit) {
        runOnJS(setPresent)(false);
      }
    });
  }, [open, unmountOnExit, animatedHeight, animatedOpacity, measuredHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: "hidden" as const,
  }));

  if (!present) {
    return (
      <View
        collapsable={false}
        {...(className !== undefined ? { className } : {})}
        style={{ height: 0 }}
      />
    );
  }

  return (
    <Animated.View
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      collapsable={false}
      {...(className !== undefined ? { className } : {})}
      style={animatedStyle}
    >
      {/*
        Absolute inner so onLayout reports full content height while the outer
        view clips/animates — matches Reanimated accordion measured-height pattern.
      */}
      <View
        style={{ position: "absolute", left: 0, right: 0, top: 0 }}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          if (next <= 0) return;
          const prev = measuredHeight.value;
          measuredHeight.value = next;
          if (!open) return;
          // First measure after mount/open, or content size changed while open.
          if (prev === 0 || Math.abs(prev - next) > 0.5) {
            animatedHeight.value = withTiming(next, PANEL_TIMING);
            animatedOpacity.value = withTiming(1, PANEL_TIMING);
          }
        }}
      >
        <View className={cn(contentClassName)}>{children}</View>
      </View>
    </Animated.View>
  );
}

export function AccordionPanel({
  open,
  children,
  className,
  contentClassName,
  unmountOnExit = true,
  animated = true,
}: AccordionPanelProps) {
  if (!animated) {
    return (
      <AccordionPanelInstant
        open={open}
        unmountOnExit={unmountOnExit}
        {...(className !== undefined ? { className } : {})}
        {...(contentClassName !== undefined ? { contentClassName } : {})}
      >
        {children}
      </AccordionPanelInstant>
    );
  }

  return (
    <AccordionPanelAnimated
      open={open}
      unmountOnExit={unmountOnExit}
      {...(className !== undefined ? { className } : {})}
      {...(contentClassName !== undefined ? { contentClassName } : {})}
    >
      {children}
    </AccordionPanelAnimated>
  );
}

export type AccordionProps = {
  children: ReactNode;
  type?: AccordionType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  className?: string;
};

export function Accordion({
  children,
  type = "single",
  value: valueProp,
  defaultValue,
  onValueChange,
  collapsible = true,
  className,
}: AccordionProps) {
  const uid = useId();
  const controlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(() => toArray(defaultValue));
  const value = controlled ? toArray(valueProp) : uncontrolled;

  const toggle = useCallback(
    (itemValue: string) => {
      let next: string[];
      if (type === "single") {
        const isOpen = value[0] === itemValue;
        if (isOpen) next = collapsible ? [] : value;
        else next = [itemValue];
      } else {
        next = value.includes(itemValue)
          ? value.filter((v) => v !== itemValue)
          : [...value, itemValue];
      }
      if (!controlled) setUncontrolled(next);
      onValueChange?.(type === "single" ? (next[0] ?? "") : next);
    },
    [type, value, collapsible, controlled, onValueChange],
  );

  const ctx = useMemo<AccordionContextValue>(
    () => ({
      type,
      value,
      collapsible,
      toggle,
      getTriggerId: (itemValue: string) => `${uid}-trigger-${itemValue}`,
      getContentId: (itemValue: string) => `${uid}-content-${itemValue}`,
    }),
    [type, value, collapsible, toggle, uid],
  );

  return (
    <AccordionCtx.Provider value={ctx}>
      <View className={cn(className)}>{children}</View>
    </AccordionCtx.Provider>
  );
}

export type AccordionItemProps = {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function AccordionItem({
  value,
  children,
  className,
  disabled = false,
}: AccordionItemProps) {
  const { value: openValues } = useAccordionCtx("AccordionItem");
  const open = openValues.includes(value);
  const itemCtx = useMemo(() => ({ value, open }), [value, open]);

  return (
    <AccordionItemCtx.Provider value={itemCtx}>
      <View
        accessibilityState={{ expanded: open, ...(disabled ? { disabled: true } : {}) }}
        className={cn(className)}
      >
        {children}
      </View>
    </AccordionItemCtx.Provider>
  );
}

export type AccordionTriggerProps = {
  children: ReactNode;
  className?: string;
  openClassName?: string;
  disabled?: boolean;
};

export function AccordionTrigger({
  children,
  className,
  openClassName,
  disabled = false,
}: AccordionTriggerProps) {
  const accordion = useAccordionCtx("AccordionTrigger");
  const item = useAccordionItemCtx("AccordionTrigger");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: item.open, disabled }}
      disabled={disabled}
      onPress={() => {
        if (!disabled) accordion.toggle(item.value);
      }}
      className={cn(className, item.open && openClassName)}
    >
      {children}
    </Pressable>
  );
}

export type AccordionContentProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  unmountOnExit?: boolean;
  animated?: boolean;
};

export function AccordionContent({
  children,
  className,
  contentClassName,
  unmountOnExit = true,
  animated = true,
}: AccordionContentProps) {
  const item = useAccordionItemCtx("AccordionContent");
  return (
    <AccordionPanel
      open={item.open}
      {...(className !== undefined ? { className } : {})}
      {...(contentClassName !== undefined ? { contentClassName } : {})}
      unmountOnExit={unmountOnExit}
      animated={animated}
    >
      {children}
    </AccordionPanel>
  );
}
