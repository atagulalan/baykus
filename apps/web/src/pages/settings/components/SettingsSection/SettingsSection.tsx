import type { ReactNode } from "react";
import { SectionPill } from "../../../../components/atoms/SectionPill/SectionPill.tsx";

const HEADER_TOP = "var(--app-header-height, 3.5rem)";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  /** Red accent for the danger zone pill. */
  danger?: boolean;
  /** Span both CSS columns on desktop (E119). */
  fullWidth?: boolean;
}

/**
 * Library-style settings group: sticky centered SectionPill + soft spaced
 * rows (no hairlines / card chrome). Matches Profile / Stats / Browse.
 */
export function SettingsSection({
  title,
  children,
  danger = false,
  fullWidth = false,
}: SettingsSectionProps) {
  return (
    <section
      className={`mb-10 flex flex-col gap-3 break-inside-avoid ${fullWidth ? "[column-span:all]" : ""}`}
    >
      <div className="sticky z-30 flex justify-center px-3 py-1" style={{ top: HEADER_TOP }}>
        <SectionPill
          className={`text-sm font-semibold ${danger ? "border-red-900/40 text-red-400" : "text-snow"}`}
        >
          {title}
        </SectionPill>
      </div>
      <div className="flex flex-col gap-0.5 px-1 sm:px-2">{children}</div>
    </section>
  );
}
