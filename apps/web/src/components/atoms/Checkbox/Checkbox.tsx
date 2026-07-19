import { Check } from "lucide-react";
import type { MouseEvent } from "react";

/** Shared hit box — keep every list checkbox at this size. */
export const CHECKBOX_SIZE_PX = 20;
export const CHECKBOX_ROUNDED_SIZE_PX = 36;

/** Rounded variant surface — reuse for matching ghost icon controls. */
export const ROUNDED_CHECKBOX_SIZE_CLASS = "h-9 w-9 rounded-full";
export const ROUNDED_CHECKBOX_IDLE_CLASS =
  "border border-white/20 bg-transparent text-muted hover:border-white/40";

export type CheckboxVariant = "default" | "rounded";

const VARIANT = {
  default: {
    box: "h-5 w-5",
    icon: 14,
    strokeWidth: 3,
    checked: "border-yellow bg-yellow text-[#080808] shadow-[0_0_10px_rgba(234,179,8,0.3)]",
    unchecked: "border-white/20 bg-void text-snow hover:border-white/40 hover:bg-white/5",
  },
  rounded: {
    box: ROUNDED_CHECKBOX_SIZE_CLASS,
    icon: 20,
    strokeWidth: 2,
    checked: "border-0 bg-green-500/12 text-green-500",
    unchecked: ROUNDED_CHECKBOX_IDLE_CLASS,
  },
} as const satisfies Record<
  CheckboxVariant,
  { box: string; icon: number; strokeWidth: number; checked: string; unchecked: string }
>;

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean, event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  showHint?: boolean;
  variant?: CheckboxVariant;
  "aria-label"?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  showHint = false,
  variant = "default",
  "aria-label": ariaLabel,
  className = "",
}: CheckboxProps) {
  const {
    box,
    icon,
    strokeWidth,
    checked: checkedStyle,
    unchecked: uncheckedStyle,
  } = VARIANT[variant];

  return (
    // biome-ignore lint/a11y/useSemanticElements: custom-styled checkbox — button+role="checkbox" is the standard accessible pattern for a non-native check control (native <input type="checkbox"> can't be restyled this way cross-browser).
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(event) => onChange(!checked, event)}
      className={`relative flex shrink-0 items-center justify-center border transition-all duration-300 ${box} ${
        checked ? checkedStyle : uncheckedStyle
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
    >
      <Check
        size={icon}
        strokeWidth={strokeWidth}
        className={`transition-all duration-300 ${
          checked
            ? "scale-100 opacity-100"
            : showHint
              ? "scale-75 opacity-20"
              : "scale-50 opacity-0"
        }`}
      />
    </button>
  );
}
