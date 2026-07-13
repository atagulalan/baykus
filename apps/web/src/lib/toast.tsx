import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

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
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-2 text-sm shadow-lg ${
              toast.variant === "error" ? "bg-red-900 text-red-100" : "bg-zinc-800 text-zinc-100"
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
