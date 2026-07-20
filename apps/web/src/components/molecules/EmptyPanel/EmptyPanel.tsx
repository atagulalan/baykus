import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Soft page-level empty (Search / Calendar recipe) — icon ring + display title + mono hint + optional CTA. */
export function EmptyPanel({
  icon: Icon,
  title,
  hint,
  action,
  insetClassName = "list-inset",
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Horizontal inset utility — `list-inset` on browse, `content-inset` on profile pages. */
  insetClassName?: string;
}) {
  return (
    <div
      className={`${insetClassName} mt-4 flex flex-col items-center gap-5 py-16 text-center sm:py-20`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Icon size={22} strokeWidth={1.5} className="text-muted/50" aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display italic text-3xl tracking-tight text-snow sm:text-4xl">
          {title}
        </h1>
        {hint ? <p className="max-w-[18rem] font-mono text-xs text-muted/70">{hint}</p> : null}
      </div>
      {action ? <div className="flex justify-center pt-1">{action}</div> : null}
    </div>
  );
}

/** Yellow pill CTA shared with calendar empty / start-watching. */
export const EMPTY_PANEL_CTA_CLASS =
  "inline-flex min-h-10 items-center gap-2 rounded-full bg-yellow px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]";
