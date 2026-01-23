"use client";

import { useEffect, useCallback, ReactNode } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonSecondary } from "@/lib/styles";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl";
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  /** Custom z-index class for nested modals (default: "z-50") */
  zIndexClass?: string;
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
export const BaseModal = ({
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
  zIndexClass = "z-50",
}: BaseModalProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
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
      className={cn(
        "fixed inset-0 bg-black/50 flex items-center justify-center",
        zIndexClass
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn("bg-theme-surface shadow-xl w-full mx-4", maxWidth, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-theme-border">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-theme-text">
              {title}
            </h3>
            {subtitle && <p className="text-sm text-theme-text-muted mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:text-theme-text p-1 -mr-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-theme-border">{footer}</div>}
      </div>
    </div>
  );
};

export type ConfirmModalVariant = "primary" | "danger" | "warning" | "info" | "success";

/**
 * ConfirmModal Component
 *
 * A specialized modal for confirmation dialogs with variant styling.
 *
 * @example Basic usage
 * ```tsx
 * <ConfirmModal
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete User"
 *   message="Are you sure you want to delete this user? This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 * />
 * ```
 *
 * @example With custom icon
 * ```tsx
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDisconnect}
 *   title="Disconnect Jira"
 *   message="This will remove the Jira integration."
 *   variant="warning"
 *   iconUrl="/jira-logo.png"
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
  variant?: ConfirmModalVariant;
  /** Loading state - disables buttons and shows loading text */
  isLoading?: boolean;
  /** @deprecated Use isLoading instead */
  loading?: boolean;
  /** Optional custom icon URL (replaces default variant icon) */
  iconUrl?: string;
  /** Show variant icon in header (default: true for danger/warning, false otherwise) */
  showIcon?: boolean;
  /** Custom z-index class for nested modals (default: "z-50") */
  zIndexClass?: string;
}

const VARIANT_STYLES: Record<
  ConfirmModalVariant,
  { button: string; icon: string; iconBg: string }
> = {
  primary: {
    button: "bg-primary-600 hover:bg-primary-700 text-white",
    icon: "text-primary-400",
    iconBg: "bg-primary-900/40",
  },
  danger: {
    button: "bg-red-600 hover:bg-red-700 text-white",
    icon: "text-red-400",
    iconBg: "bg-red-900/40",
  },
  warning: {
    button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    icon: "text-yellow-400",
    iconBg: "bg-yellow-900/40",
  },
  info: {
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    icon: "text-blue-400",
    iconBg: "bg-blue-900/40",
  },
  success: {
    button: "bg-green-600 hover:bg-green-700 text-white",
    icon: "text-green-400",
    iconBg: "bg-green-900/40",
  },
};

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  loading, // deprecated alias
  iconUrl,
  showIcon,
  zIndexClass,
}: ConfirmModalProps) => {
  // Support both isLoading and deprecated loading prop
  const isLoadingState = isLoading || loading || false;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const styles = VARIANT_STYLES[variant];
  // Show icon by default for danger/warning variants, or if explicitly requested
  const shouldShowIcon = showIcon ?? (variant === "danger" || variant === "warning");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      zIndexClass={zIndexClass}
      title={
        shouldShowIcon || iconUrl ? (
          <span className="flex items-center gap-3">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8",
                  styles.iconBg
                )}
              >
                <AlertTriangle className={cn("w-4 h-4", styles.icon)} />
              </span>
            )}
            {title}
          </span>
        ) : (
          title
        )
      }
      maxWidth="max-w-sm"
      closeOnBackdropClick={!isLoadingState}
      closeOnEscape={!isLoadingState}
    >
      <div className="mb-6">
        {typeof message === "string" ? <p className="text-theme-text-muted">{message}</p> : message}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoadingState}
          className={cn(buttonSecondary, "flex-1")}
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoadingState}
          className={cn(
            "flex-1 px-4 py-2 transition-colors disabled:opacity-50",
            styles.button
          )}
        >
          {isLoadingState ? "Processing..." : confirmText}
        </button>
      </div>
    </BaseModal>
  );
};

export default BaseModal;
