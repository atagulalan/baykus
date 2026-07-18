import type { ReactNode } from "react";

interface PageTitleProps {
  children: ReactNode;
}

/** Shared typography for top-level page headings. Layout and visibility belong to the page. */
export function PageTitle({ children }: PageTitleProps) {
  return <h1 className="font-display text-2xl italic tracking-tight text-snow">{children}</h1>;
}
