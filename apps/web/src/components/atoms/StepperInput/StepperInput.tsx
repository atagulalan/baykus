import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Polished stepper input with −/+ buttons and a numeric text field (E118).
 * Long-press accelerates: hold 200ms → repeat every 100ms.
 */
export function StepperInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
}: StepperInputProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(String(value));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input display when external value changes
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  function handleInputBlur() {
    const parsed = Number(inputValue);
    if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
      const clamped = clamp(parsed);
      if (clamped !== value) onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }

  const stopRepeat = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  function startRepeat(delta: number) {
    stopRepeat();
    const doStep = () => {
      onChange(clamp(value + delta));
    };
    // Initial press fires immediately
    doStep();
    // Long-press: after 200ms, repeat every 100ms
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(doStep, 100);
    }, 200);
  }

  // Cleanup on unmount
  useEffect(() => stopRepeat, [stopRepeat]);

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="inline-flex items-center border border-white/10">
      <button
        type="button"
        disabled={atMin}
        onMouseDown={() => !atMin && startRepeat(-step)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        onTouchStart={() => !atMin && startRepeat(-step)}
        onTouchEnd={stopRepeat}
        aria-label={t("stepper.decrease")}
        className={`flex h-9 w-9 items-center justify-center transition-colors ${
          atMin ? "text-muted/30 cursor-not-allowed" : "text-muted hover:text-snow hover:bg-white/5"
        }`}
      >
        <Minus size={14} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleInputBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="h-9 w-12 bg-transparent text-center font-mono text-sm text-snow tabular-nums focus:outline-none"
        aria-label={t("stepper.value")}
      />
      <button
        type="button"
        disabled={atMax}
        onMouseDown={() => !atMax && startRepeat(step)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        onTouchStart={() => !atMax && startRepeat(step)}
        onTouchEnd={stopRepeat}
        aria-label={t("stepper.increase")}
        className={`flex h-9 w-9 items-center justify-center transition-colors ${
          atMax ? "text-muted/30 cursor-not-allowed" : "text-muted hover:text-snow hover:bg-white/5"
        }`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
