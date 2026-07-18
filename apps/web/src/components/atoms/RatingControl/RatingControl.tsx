import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RatingControlProps {
  value: 1 | 2 | 3 | null;
  onChange: (value: 1 | 2 | 3 | null) => void;
  size?: "sm" | "md";
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
    activeBg: "bg-green-500 text-white",
    iconColor: "text-green-500",
  },
];

/** One-tap set/clear: clicking the already-active option clears the rating. */
export function RatingControl({ value, onChange, size = "md" }: RatingControlProps) {
  const { t } = useTranslation();
  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <fieldset aria-label={t("rating.label")} className="m-0 flex gap-1 border-0 p-0">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : opt.value)}
            className={`flex items-center gap-1.5 ${padding} ${
              active ? opt.activeBg : "bg-white/5 text-muted hover:bg-white/10"
            }`}
          >
            <opt.Icon size={iconSize} className={active ? "" : opt.iconColor} />{" "}
            <span>{t(`rating.${opt.key}`)}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
