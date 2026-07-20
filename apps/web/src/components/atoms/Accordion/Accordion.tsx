import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import type { EasingInput } from "./easing.ts";
import { useHeightTransition } from "./useHeightTransition.ts";

// ─── Shared motion props (panel + content) ───────────────────────────────────

export interface AccordionMotionProps {
  /** Travel speed in px/s. Taller content takes longer; same visual pace. Default 1400. */
  speed?: number;
  openSpeed?: number;
  closeSpeed?: number;
  /** Functional easing — name, cubic-bezier points, or `(t) => number`. Default `easeInOutQuint`. */
  easing?: EasingInput;
  openEasing?: EasingInput;
  closeEasing?: EasingInput;
  minDurationMs?: number;
  maxDurationMs?: number;
  /** Fade opacity with height. Default true. */
  fade?: boolean;
  skipEnterOnMount?: boolean;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
}

/** Drop keys whose value is `undefined` — required under exactOptionalPropertyTypes. */
function definedProps<T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) out[key] = value;
  }
  return out as { [K in keyof T]?: Exclude<T[K], undefined> };
}

// ─── AccordionPanel (standalone controlled collapse) ─────────────────────────

export interface AccordionPanelProps extends AccordionMotionProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Unmount children after close animation finishes. Default false. */
  unmountOnExit?: boolean;
  /**
   * When fully open, allow overflow to paint outside (poster view-transitions).
   * During motion overflow is always clipped. Default true.
   */
  overflowVisibleWhenOpen?: boolean;
  id?: string;
  role?: string;
  "aria-labelledby"?: string;
  style?: CSSProperties;
}

/**
 * Controlled height panel — the motion primitive behind accordion items.
 * Drive it with `open`; pair with any trigger (e.g. SectionHeader).
 */
export function AccordionPanel({
  open,
  children,
  className = "",
  contentClassName = "",
  unmountOnExit = false,
  overflowVisibleWhenOpen = true,
  id,
  role,
  "aria-labelledby": ariaLabelledBy,
  style: styleProp,
  speed,
  openSpeed,
  closeSpeed,
  easing,
  openEasing,
  closeEasing,
  minDurationMs,
  maxDurationMs,
  fade,
  skipEnterOnMount,
  onOpenComplete,
  onCloseComplete,
}: AccordionPanelProps) {
  const { outerRef, innerRef, state, present, style } = useHeightTransition({
    open,
    ...definedProps({
      speed,
      openSpeed,
      closeSpeed,
      easing,
      openEasing,
      closeEasing,
      minDurationMs,
      maxDurationMs,
      fade,
      skipEnterOnMount,
      onOpenComplete,
      onCloseComplete,
    }),
  });

  const showChildren = unmountOnExit ? present : true;
  const overflow = state === "open" && overflowVisibleWhenOpen ? "visible" : style.overflow;

  const resolvedRole = role ?? (ariaLabelledBy ? "region" : undefined);

  return (
    <div
      ref={outerRef}
      id={id}
      {...(resolvedRole ? { role: resolvedRole } : {})}
      {...(ariaLabelledBy && resolvedRole ? { "aria-labelledby": ariaLabelledBy } : {})}
      aria-hidden={!open && state === "closed" ? true : undefined}
      data-slot="accordion-panel"
      data-state={state}
      data-expanded={open && state !== "closing" ? "true" : "false"}
      className={className}
      style={{
        ...styleProp,
        height: style.height,
        opacity: style.opacity,
        overflow,
      }}
    >
      {showChildren ? (
        <div ref={innerRef} data-slot="accordion-panel-inner" className={contentClassName}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

// ─── Compound Accordion ──────────────────────────────────────────────────────

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionType;
  value: string[];
  toggle: (itemValue: string) => void;
  collapsible: boolean;
  motion: AccordionMotionProps;
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

export interface AccordionProps extends AccordionMotionProps {
  children: ReactNode;
  /** `single` = one open at a time (season exclusivity). Default `single`. */
  type?: AccordionType;
  /** Controlled open value(s). */
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Allow closing the open item in `single` mode. Default true. */
  collapsible?: boolean;
  className?: string;
}

function toArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Exclusive or multi-expand accordion root. Motion props cascade to every
 * `AccordionContent` unless overridden on the content itself.
 */
export function Accordion({
  children,
  type = "single",
  value: valueProp,
  defaultValue,
  onValueChange,
  collapsible = true,
  className = "",
  speed,
  openSpeed,
  closeSpeed,
  easing,
  openEasing,
  closeEasing,
  minDurationMs,
  maxDurationMs,
  fade,
  skipEnterOnMount,
}: AccordionProps) {
  const uid = useId();
  const controlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(() => toArray(defaultValue));
  const value = controlled ? toArray(valueProp) : uncontrolled;

  const motion = useMemo(
    () =>
      definedProps({
        speed,
        openSpeed,
        closeSpeed,
        easing,
        openEasing,
        closeEasing,
        minDurationMs,
        maxDurationMs,
        fade,
        skipEnterOnMount,
      }) as AccordionMotionProps,
    [
      speed,
      openSpeed,
      closeSpeed,
      easing,
      openEasing,
      closeEasing,
      minDurationMs,
      maxDurationMs,
      fade,
      skipEnterOnMount,
    ],
  );

  const ctx = useMemo<AccordionContextValue>(
    () => ({
      type,
      value,
      collapsible,
      motion,
      toggle: (itemValue: string) => {
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
      getTriggerId: (itemValue: string) => `${uid}-trigger-${itemValue}`,
      getContentId: (itemValue: string) => `${uid}-content-${itemValue}`,
    }),
    [type, value, collapsible, motion, controlled, onValueChange, uid],
  );

  return (
    <AccordionCtx.Provider value={ctx}>
      <div data-slot="accordion" data-type={type} className={className}>
        {children}
      </div>
    </AccordionCtx.Provider>
  );
}

export interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AccordionItem({
  value,
  children,
  className = "",
  disabled = false,
}: AccordionItemProps) {
  const { value: openValues } = useAccordionCtx("AccordionItem");
  const open = openValues.includes(value);
  const itemCtx = useMemo(() => ({ value, open }), [value, open]);

  return (
    <AccordionItemCtx.Provider value={itemCtx}>
      <div
        data-slot="accordion-item"
        data-state={open ? "open" : "closed"}
        data-disabled={disabled || undefined}
        className={className}
      >
        {children}
      </div>
    </AccordionItemCtx.Provider>
  );
}

export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  /** Extra classes when open. */
  openClassName?: string;
  disabled?: boolean;
  asChild?: never;
}

export function AccordionTrigger({
  children,
  className = "",
  openClassName = "",
  disabled = false,
}: AccordionTriggerProps) {
  const accordion = useAccordionCtx("AccordionTrigger");
  const item = useAccordionItemCtx("AccordionTrigger");
  const triggerId = accordion.getTriggerId(item.value);
  const contentId = accordion.getContentId(item.value);

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={item.open}
      aria-controls={contentId}
      disabled={disabled}
      data-slot="accordion-trigger"
      data-state={item.open ? "open" : "closed"}
      className={`${className} ${item.open ? openClassName : ""}`.trim()}
      onClick={() => {
        if (!disabled) accordion.toggle(item.value);
      }}
    >
      {children}
    </button>
  );
}

export interface AccordionContentProps extends AccordionMotionProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  unmountOnExit?: boolean;
  overflowVisibleWhenOpen?: boolean;
}

export function AccordionContent({
  children,
  className,
  contentClassName,
  unmountOnExit = true,
  overflowVisibleWhenOpen,
  speed,
  openSpeed,
  closeSpeed,
  easing,
  openEasing,
  closeEasing,
  minDurationMs,
  maxDurationMs,
  fade,
  skipEnterOnMount,
  onOpenComplete,
  onCloseComplete,
}: AccordionContentProps) {
  const accordion = useAccordionCtx("AccordionContent");
  const item = useAccordionItemCtx("AccordionContent");
  const m = accordion.motion;

  return (
    <AccordionPanel
      open={item.open}
      id={accordion.getContentId(item.value)}
      role="region"
      aria-labelledby={accordion.getTriggerId(item.value)}
      unmountOnExit={unmountOnExit}
      {...definedProps({
        className,
        contentClassName,
        overflowVisibleWhenOpen,
        speed: speed ?? m.speed,
        openSpeed: openSpeed ?? m.openSpeed,
        closeSpeed: closeSpeed ?? m.closeSpeed,
        easing: easing ?? m.easing,
        openEasing: openEasing ?? m.openEasing,
        closeEasing: closeEasing ?? m.closeEasing,
        minDurationMs: minDurationMs ?? m.minDurationMs,
        maxDurationMs: maxDurationMs ?? m.maxDurationMs,
        fade: fade ?? m.fade,
        skipEnterOnMount: skipEnterOnMount ?? m.skipEnterOnMount,
        onOpenComplete,
        onCloseComplete,
      })}
    >
      {children}
    </AccordionPanel>
  );
}

export type { CubicBezier, EasingFn, EasingInput, EasingName } from "./easing.ts";
export { cubicBezier, durationFromSpeed, resolveEasing } from "./easing.ts";
export type { AccordionMotionState } from "./useHeightTransition.ts";
