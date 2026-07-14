import { useTranslation } from "react-i18next";

interface RatingControlProps {
  value: 1 | 2 | 3 | null;
  onChange: (value: 1 | 2 | 3 | null) => void;
  size?: "sm" | "md";
}

const OPTIONS: { value: 1 | 2 | 3; emoji: string; key: "bad" | "okay" | "good" }[] = [
  { value: 1, emoji: "👎", key: "bad" },
  { value: 2, emoji: "😐", key: "okay" },
  { value: 3, emoji: "👍", key: "good" },
];

/** One-tap set/clear: clicking the already-active option clears the rating. */
export function RatingControl({ value, onChange, size = "md" }: RatingControlProps) {
  const { t } = useTranslation();
  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";

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
            className={`rounded ${padding} ${
              active ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {opt.emoji} {t(`rating.${opt.key}`)}
          </button>
        );
      })}
    </fieldset>
  );
}
