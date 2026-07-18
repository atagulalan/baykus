import type { ReactNode, Ref } from "react";

const PILL_BASE =
  "inline-flex max-w-full min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-void/95 backdrop-blur-md";

const PILL_PADDING = {
  default: "px-2.5 py-1 sm:px-3",
  /** Trailing controls or a full-width label button supply their own left padding. */
  split: "py-0 pl-0 pr-2 sm:pr-3",
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

  return (
    <h2 ref={headingRef} className={pillClass}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="-mx-2.5 -my-1 inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:bg-white/5 sm:-mx-3 sm:px-3"
        >
          {children}
        </button>
      ) : (
        children
      )}
    </h2>
  );
}
