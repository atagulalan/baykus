import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { Z } from "./zIndex.ts";

type ToastVariant = "success" | "error";

interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (text: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 1;
const TOAST_TIMEOUT_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, variant: ToastVariant = "success") => {
    const id = nextToastId++;
    setToasts((prev) => [...prev, { id, text, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed bottom-4 left-1/2 flex -translate-x-1/2 flex-col gap-2"
        style={{ zIndex: Z.toast }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`border bg-[#101010] px-4 py-2 text-sm shadow-2xl ${
              toast.variant === "error"
                ? "border-red-500/50 text-red-400"
                : "border-white/10 text-snow"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
