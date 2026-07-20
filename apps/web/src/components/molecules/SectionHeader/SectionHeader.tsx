import type { Play } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { SectionPill } from "../../atoms/SectionPill/SectionPill.tsx";

interface SectionHeaderProps {
  /** Leading category glyph (lucide component); omit for icon-less headers. */
  icon?: typeof Play | undefined;
  /** Custom leading node (e.g. circular progress); wins over `icon`. */
  leading?: ReactNode;
  label: string;
  /** Plain tally, or a `watched/total` ratio for progress-bearing sections. */
  count: number | string;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  /** Align to page content or to the padding used by list rows. */
  inset?: "page" | "list";
  /** When set, the label area becomes a toggle control (accordion sections). */
  onClick?: (() => void) | undefined;
  /** Pass with `onClick` for `aria-expanded`. */
  expanded?: boolean | undefined;
  /** Control rendered beside the pill (e.g. a section overflow menu), centred with it. */
  action?: ReactNode;
}

/**
 * Sticky centered pill header shared by the Library grid + Watch list surfaces:
 * icon · label · count. MainShell is always full-bleed: `page` owns the standard
 * screen inset, while `list` matches EpisodeRow.
 *
 * When both `leading` and `onClick` are set, `leading` sits outside the expand
 * toggle so it can host its own control (e.g. season progress → actions menu)
 * without nesting buttons.
 */
export function SectionHeader({
  icon: Icon,
  leading,
  label,
  count,
  headingRef,
  inset = "page",
  onClick,
  expanded,
  action,
}: SectionHeaderProps) {
  const insetClass = inset === "list" ? "list-inset" : "px-3 sm:px-6";
  const pillPadding = onClick ? "splitLabel" : "default";

  const iconNode = Icon ? (
    <Icon size={14} strokeWidth={1.75} className="shrink-0 text-muted" />
  ) : null;

  const labelText = (
    <>
      <span className="min-w-0 truncate font-semibold text-sm text-snow">{label}</span>
      <span className="shrink-0 text-muted/35" aria-hidden>
        |
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</span>
    </>
  );

  // When leading owns its own control, pull the label under the ring so they
  // share space; the leading control stays on top via z-index.
  const labelButtonClass = leading
    ? "relative z-0 inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full -mr-2.5 -ml-4 pl-3 pr-2.5 py-1 transition-colors hover:bg-white/5 sm:-mr-3 sm:-ml-5 sm:pl-3.5 sm:pr-3"
    : "inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full -mx-2.5 px-2.5 py-1 transition-colors hover:bg-white/5 sm:-mx-3 sm:px-3";

  return (
    <div
      style={{
        top: "var(--app-header-height, 3.5rem)",
        scrollMarginTop: "var(--app-header-height, 3.5rem)",
      }}
      className={`sticky z-30 flex items-center justify-center gap-1 py-1 ${insetClass}`}
    >
      <SectionPill padding={pillPadding} {...(headingRef ? { headingRef } : {})}>
        {onClick ? (
          <>
            {leading ? (
              <span className="relative z-20 -ml-2.5 shrink-0 sm:-ml-3">{leading}</span>
            ) : null}
            <button
              type="button"
              onClick={onClick}
              aria-expanded={expanded ?? true}
              className={labelButtonClass}
            >
              {leading ? null : iconNode}
              {labelText}
            </button>
          </>
        ) : (
          <>
            {leading ?? iconNode}
            {labelText}
          </>
        )}
      </SectionPill>
      {action}
    </div>
  );
}
