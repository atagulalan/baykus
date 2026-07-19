import type { ReactNode } from "react";
import { PageTitle } from "../../atoms/PageTitle/PageTitle.tsx";
import { PAGE_HEADING_ACTION_SLOT_CLASS } from "../../layout/Layout/layoutShared.ts";

interface PageTitleRowProps {
  children: ReactNode;
  /** Trailing desktop control — grid/list toggle, sort, calendar mode, … */
  action?: ReactNode;
}

/** Desktop page heading rail — 12px horizontal inset (WatchNextRow parity). */
export function PageTitleRow({ children, action }: PageTitleRowProps) {
  return (
    <div className="hidden w-full items-center px-3 sm:flex">
      <PageTitle>{children}</PageTitle>
      {action != null ? <div className={PAGE_HEADING_ACTION_SLOT_CLASS}>{action}</div> : null}
    </div>
  );
}
