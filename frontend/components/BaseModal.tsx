"use client";

import { useEffect, useCallback, ReactNode } from "react";
import { X } from "lucide-react";

export interface BaseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Max width class (default: max-w-md) */
  maxWidth?: "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl";
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Custom className for the modal container */
  className?: string;
}

/**
 * BaseModal Component
 *
 * A reusable modal component that provides consistent styling and behavior.
 * Handles keyboard events (Escape to close) and backdrop clicks.
 *
 * @example Basic usage
 * ```tsx
 * <BaseModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </BaseModal>
 * ```
 *
 * @example With footer
 * ```tsx
 * <BaseModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Edit User"
 *   footer={
 *     <div className="flex gap-3">
 *       <button onClick={onClose}>Cancel</button>
 *       <button onClick={handleSave}>Save</button>
 *     </div>
 *   }
 * >
 *   <form>...</form>
 * </BaseModal>
 * ```
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = "",
}: BaseModalProps) {
  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Add/remove event listener for Escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-theme-surface shadow-xl w-full mx-4 ${maxWidth} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border flex items-start justify-between">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-theme-text">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-theme-text-muted mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:text-theme-text p-1 -mr-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-theme-border">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * ConfirmModal Component
 *
 * A specialized modal for confirmation dialogs.
 *
 * @example
 * ```tsx
 * <ConfirmModal
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete User"
 *   message="Are you sure you want to delete this user? This action cannot be undone."
 *   confirmText="Delete"
 *   confirmVariant="danger"
 * />
 * ```
 */
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-primary-600 hover:bg-primary-700 text-white";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-sm"
    >
      <div className="mb-6">
        {typeof message === "string" ? (
          <p className="text-theme-text-muted">{message}</p>
        ) : (
          message
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 transition-colors disabled:opacity-50 ${confirmButtonClass}`}
        >
          {isLoading ? "Loading..." : confirmText}
        </button>
      </div>
    </BaseModal>
  );
}

export default BaseModal;
