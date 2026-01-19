"use client";

import { AlertTriangle, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  iconUrl?: string;
  /** Custom z-index class for nested modals (default: "z-50") */
  zIndexClass?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  iconUrl,
  zIndexClass = "z-50",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-red-400",
      iconBg: "bg-red-900/40",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: "text-yellow-400",
      iconBg: "bg-yellow-900/40",
      button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    info: {
      icon: "text-blue-400",
      iconBg: "bg-blue-900/40",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center`}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative bg-theme-surface border border-theme-border w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <div className={`w-10 h-10 ${styles.iconBg} flex items-center justify-center`}>
                <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
              </div>
            )}
            <h2 className="text-lg font-semibold text-theme-text">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-theme-text-muted hover:text-theme-text transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-theme-text-muted">{message}</p>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles.button}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
