import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SETTINGS_ROW } from "../../../lib/settingsChrome.ts";
import { Modal } from "../../molecules/Modal/Modal.tsx";

interface SettingsSelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SettingsSelectProps<T extends string> {
  value: T;
  options: SettingsSelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  hint?: string;
}

export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
}: SettingsSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div>
      <button
        type="button"
        aria-label={label}
        id="settings-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="settings-select-listbox"
        onClick={() => setIsOpen((o) => !o)}
        className={`${SETTINGS_ROW} ${isOpen ? "bg-white/[0.04]" : ""}`}
      >
        <div className="flex max-w-[70%] flex-col text-left">
          <span className="font-sans text-sm">{label}</span>
          {hint && <span className="mt-0.5 font-mono text-[10px] text-muted">{hint}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-dim">{selectedOption?.label ?? value}</span>
          <ChevronDown
            size={14}
            aria-hidden
            className={`text-muted-dim transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Desktop: popover anchored below the row; mobile: bottom sheet. */}
      <div className="relative">
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          desktop="popover"
          popoverClassName="w-56"
          title={label}
          className="!overflow-hidden !p-0"
        >
          <div
            id="settings-select-listbox"
            role="listbox"
            aria-label={label}
            className="flex flex-col gap-0.5 p-1.5"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setIsOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-mono text-xs transition-colors ${
                  opt.value === value
                    ? "bg-white/5 text-yellow"
                    : opt.disabled
                      ? "cursor-not-allowed text-muted/30"
                      : "text-snow hover:bg-white/5"
                }`}
              >
                {opt.label}
                {opt.value === value && (
                  <Check size={14} className="shrink-0 text-yellow" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
