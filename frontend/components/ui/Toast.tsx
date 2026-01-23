"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 4000;

const variantStyles: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: typeof AlertCircle }
> = {
  success: {
    bg: "bg-green-900/95",
    border: "border-green-500/50",
    text: "text-green-100",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-900/95",
    border: "border-red-500/50",
    text: "text-red-100",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-amber-900/95",
    border: "border-amber-500/50",
    text: "text-amber-100",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-900/95",
    border: "border-blue-500/50",
    text: "text-blue-100",
    icon: Info,
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem = ({ toast, onDismiss }: ToastItemProps) => {
  const styles = variantStyles[toast.variant];
  const Icon = styles.icon;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${styles.bg} ${styles.border} ${styles.text}
        animate-in slide-in-from-right-full fade-in duration-300
      `}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newToast: Toast = { id, message, variant };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after duration
      setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION);
    },
    [dismissToast]
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: useCallback((message: string) => addToast(message, "success"), [addToast]),
    error: useCallback((message: string) => addToast(message, "error"), [addToast]),
    warning: useCallback((message: string) => addToast(message, "warning"), [addToast]),
    info: useCallback((message: string) => addToast(message, "info"), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
