import type { ReactNode } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedButtonGroupProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Reusable segmented button group — same visual as CalendarPage's ModeTabs
 * (E113). Supports per-option icons and disabled states.
 */
export function SegmentedButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: SegmentedButtonGroupProps<T>) {
  return (
    <div className="inline-flex flex-wrap border border-white/10">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => {
            if (option.value !== value && !option.disabled) onChange(option.value);
          }}
          aria-pressed={option.value === value}
          className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            option.value === value
              ? "bg-yellow text-[#080808]"
              : option.disabled
                ? "text-muted/40 cursor-not-allowed"
                : "text-muted hover:text-snow"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
