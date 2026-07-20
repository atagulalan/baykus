import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RatingControlProps {
  value: 1 | 2 | 3 | null;
  onChange: (value: 1 | 2 | 3 | null) => void;
  size?: "sm" | "md";
  /** Icon-only pills — for overlays (modal/sheet) where labels are redundant. */
  iconsOnly?: boolean;
}

const OPTIONS: {
  value: 1 | 2 | 3;
  Icon: React.ElementType;
  key: "bad" | "okay" | "good";
  activeBg: string;
  iconColor: string;
}[] = [
  {
    value: 1,
    Icon: ArrowDown,
    key: "bad",
    activeBg: "bg-red-500 text-white",
    iconColor: "text-red-500",
  },
  {
    value: 2,
    Icon: Minus,
    key: "okay",
    activeBg: "bg-yellow text-[#080808]",
    iconColor: "text-yellow",
  },
  {
    value: 3,
    Icon: ArrowUp,
    key: "good",
    activeBg: "bg-green-500 text-[#080808]",
    iconColor: "text-green-500",
  },
];

/** One-tap set/clear: clicking the already-active option clears the rating. */
export function RatingControl({
  value,
  onChange,
  size = "md",
  iconsOnly = false,
}: RatingControlProps) {
  const { t } = useTranslation();
  const compact = size === "sm";
  const padding = iconsOnly
    ? compact
      ? "p-1.5"
      : "p-2"
    : compact
      ? "gap-1 px-2.5 py-1.5"
      : "gap-1.5 px-3.5 py-2";
  const labelClass = compact ? "text-[10px]" : "text-[11px]";
  const iconSize = compact ? 14 : 16;

  return (
    <fieldset
      aria-label={t("rating.label")}
      className={`m-0 inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-void/95 p-0.5 backdrop-blur-md ${iconsOnly ? "w-fit" : ""}`}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={iconsOnly ? t(`rating.${opt.key}`) : undefined}
            onClick={() => onChange(active ? null : opt.value)}
            className={`flex items-center rounded-full font-mono ${iconsOnly ? "" : `${labelClass} uppercase tracking-widest`} transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-yellow ${padding} ${
              active
                ? opt.activeBg
                : "bg-transparent text-muted hover:bg-white/[0.04] hover:text-snow"
            }`}
          >
            <opt.Icon
              size={iconSize}
              strokeWidth={active ? 2.5 : 2}
              className={active ? "shrink-0" : `shrink-0 ${opt.iconColor}`}
              aria-hidden
            />
            {!iconsOnly && <span>{t(`rating.${opt.key}`)}</span>}
          </button>
        );
      })}
    </fieldset>
  );
}
