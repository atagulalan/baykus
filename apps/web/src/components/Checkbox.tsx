import { Check } from "lucide-react";

/** Shared hit box — keep every list checkbox at this size. */
export const CHECKBOX_SIZE_PX = 20;

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showHint?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  showHint = false,
  "aria-label": ariaLabel,
  className = "",
}: CheckboxProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: custom-styled checkbox — button+role="checkbox" is the standard accessible pattern for a non-native check control (native <input type="checkbox"> can't be restyled this way cross-browser).
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative flex h-5 w-5 shrink-0 items-center justify-center border transition-all duration-300 ${
        checked
          ? "border-yellow bg-yellow text-[#080808] shadow-[0_0_10px_rgba(234,179,8,0.3)]"
          : "border-white/20 bg-void text-snow hover:border-white/40 hover:bg-white/5"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
    >
      <Check
        size={14}
        strokeWidth={3}
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
