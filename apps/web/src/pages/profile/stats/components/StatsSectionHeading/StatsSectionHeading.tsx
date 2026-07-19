import type { ReactNode } from "react";
import { SectionPill } from "../../../../../components/atoms/SectionPill/SectionPill.tsx";

/**
 * Stats-page section heading — the app-wide sticky centered pill chrome shared
 * by Library / Watch / Calendar and ProfilePage's HubSectionHeader. Replaces the
 * pre-011 left-aligned `font-display` display titles so the dashboard reads as
 * one system with the rest of the app.
 */
export function StatsSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky z-30 flex justify-center py-1"
      style={{ top: "var(--app-header-height, 3.5rem)" }}
    >
      <SectionPill className="text-sm font-semibold text-snow">{children}</SectionPill>
    </div>
  );
}
