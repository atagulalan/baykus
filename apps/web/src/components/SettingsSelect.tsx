import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
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
}

export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: SettingsSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const optionList = (
    <>
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
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-snow transition-colors hover:bg-white/5 border-b border-white/5 last:border-b-0"
      >
        <span className="font-sans text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted/80">{selectedOption?.label ?? value}</span>
          <ChevronDown
            size={14}
            className={`text-muted/50 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Desktop: inline popover anchored below the row */}
      {isOpen && (
        <div className="relative hidden sm:block">
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-6 z-20 mt-0 w-56 border border-white/10 bg-[#0e0e0e] shadow-2xl overflow-hidden">
            <div className="flex flex-col">{optionList}</div>
          </div>
        </div>
      )}

      {/* Mobile: bottom-sheet Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="!p-0 !overflow-hidden"
        rootClassName="sm:hidden"
      >
        <div className="border-b border-white/10 bg-[#141414] px-4 py-3 text-sm font-medium text-snow shadow-md">
          {label}
        </div>
        <div className="flex flex-col">{optionList}</div>
      </Modal>
    </>
  );
}
