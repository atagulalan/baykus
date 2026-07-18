import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Modal } from "./Modal";

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
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`flex w-full items-center justify-between px-6 py-4 text-snow transition-colors hover:bg-white/5 ${
          isOpen ? "bg-white/5" : ""
        }`}
      >
        <div className="flex flex-col text-left max-w-[70%]">
          <span className="font-sans text-sm">{label}</span>
          {hint && <span className="mt-1 font-mono text-[10px] text-muted">{hint}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted/80">{selectedOption?.label ?? value}</span>
          <ChevronDown
            size={14}
            className={`text-muted/50 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
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
          className="!p-0 !overflow-hidden"
        >
          <div className="flex flex-col">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setIsOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between border-b border-white/5 px-4 py-3.5 text-left font-mono text-xs transition-colors last:border-0 ${
                  opt.value === value
                    ? "bg-white/5 text-yellow"
                    : opt.disabled
                      ? "cursor-not-allowed text-muted/30"
                      : "text-snow hover:bg-white/5"
                }`}
              >
                {opt.label}
                {opt.value === value && <span className="text-yellow">✓</span>}
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}
