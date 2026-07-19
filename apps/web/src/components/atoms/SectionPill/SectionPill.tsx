import type { ReactNode, Ref } from "react";

const PILL_BASE =
  "inline-flex max-w-full min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-void/95 backdrop-blur-md";

const LABEL_BUTTON_BASE =
  "inline-flex min-w-0 items-center gap-1.5 py-1 transition-colors hover:bg-white/5";

/** Calendar default: shell owns padding; button negative-insets to fill hover target. */
const LABEL_BUTTON_INSET = `${LABEL_BUTTON_BASE} -mx-2.5 -my-1 rounded-full px-2.5 sm:-mx-3 sm:px-3`;

/** Collapsible section headers: symmetric shell padding; button negative-insets horizontally. */
const LABEL_BUTTON_SPLIT_LABEL = `${LABEL_BUTTON_BASE} -mx-2.5 rounded-full px-2.5 sm:-mx-3 sm:px-3`;

const PILL_PADDING = {
  default: "px-2.5 py-0 sm:px-3",
  /** Full-width label button (SectionHeader collapse toggle). */
  splitLabel: "py-0 px-2.5 sm:px-3",
} as const;

interface SectionPillProps {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof PILL_PADDING;
  headingRef?: Ref<HTMLHeadingElement>;
  /** When set, the label area becomes a control (e.g. scroll-to-section on Calendar). */
  onClick?: (() => void) | undefined;
}

/** Shared rounded pill chrome for sticky section titles (Library, Watch, Calendar, …). */
export function SectionPill({
  children,
  className = "",
  padding = "default",
  headingRef,
  onClick,
}: SectionPillProps) {
  const pillClass = `${PILL_BASE} ${PILL_PADDING[padding]} ${className}`.trim();
  const labelButtonClass = padding === "splitLabel" ? LABEL_BUTTON_SPLIT_LABEL : LABEL_BUTTON_INSET;

  return (
    <h2 ref={headingRef} className={pillClass}>
      {onClick ? (
        <button type="button" onClick={onClick} className={labelButtonClass}>
          {children}
        </button>
      ) : (
        children
      )}
    </h2>
  );
}
