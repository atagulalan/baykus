/// <reference types="nativewind/types" />
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import { cn } from "../lib/cn.ts";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Ease-in-out layout animation for accordion / section collapse (web height transition stand-in). */
export function animateLayoutToggle() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

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
  /** Unmount children when closed. Default true. */
  unmountOnExit?: boolean;
};

/** Controlled collapse panel — LayoutAnimation stand-in for web height transition. */
export function AccordionPanel({
  open,
  children,
  className,
  contentClassName,
  unmountOnExit = true,
}: AccordionPanelProps) {
  // Keep a native child slot when closed so ScrollView `stickyHeaderIndices`
  // (sibling headers) stay aligned with host children — `return null` shifts indices.
  // Keep `className` so collapsed sections can use a compact margin (e.g. `mb-1`).
  if (unmountOnExit && !open) {
    return <View collapsable={false} className={className} style={{ height: 0 }} />;
  }
  return (
    <View
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      className={cn(!open && "hidden", className)}
      style={open ? undefined : { height: 0, overflow: "hidden", opacity: 0 }}
    >
      <View className={cn(contentClassName)}>{children}</View>
    </View>
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
      animateLayoutToggle();
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
};

export function AccordionContent({
  children,
  className,
  contentClassName,
  unmountOnExit = true,
}: AccordionContentProps) {
  const item = useAccordionItemCtx("AccordionContent");
  return (
    <AccordionPanel
      open={item.open}
      {...(className !== undefined ? { className } : {})}
      {...(contentClassName !== undefined ? { contentClassName } : {})}
      unmountOnExit={unmountOnExit}
    >
      {children}
    </AccordionPanel>
  );
}
