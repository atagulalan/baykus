import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Added classes for the modal container, typically for padding/layout. */
  className?: string;
  /** Added classes for the outermost portal container. */
  rootClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  rootClassName = "",
}: ModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 ${rootClassName}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("search.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 animate-backdrop cursor-default"
      />

      {/* Container: Bottom Sheet on Mobile, Centered Modal on Desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-h-[90vh] overflow-y-auto bg-[#101010] shadow-2xl backdrop-blur-md border-t border-white/10 sm:border max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))] animate-sheet sm:animate-modal sm:max-w-sm sm:max-h-[85vh] ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
