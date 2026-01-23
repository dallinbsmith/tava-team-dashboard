"use client";

import { AlertCircle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-green-600 hover:bg-green-700 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-surface border border-theme-border rounded-lg w-full max-w-md mx-4 shadow-2xl">
        <div className="p-4 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {title}
          </h2>
          <button onClick={onCancel} className="p-1 text-theme-text-muted hover:text-theme-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-theme-text-muted">{message}</p>
        </div>

        <div className="p-4 border-t border-theme-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-theme-border text-theme-text rounded hover:bg-theme-elevated disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
