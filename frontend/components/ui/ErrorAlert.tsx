"use client";

import { ReactNode } from "react";
import { AlertCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type AlertVariant = "error" | "warning" | "info" | "success";

export interface ErrorAlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { bg: string; border: string; text: string; icon: typeof AlertCircle }
> = {
  error: {
    bg: "bg-red-900/30",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: XCircle,
  },
  warning: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-900/30",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: Info,
  },
  success: {
    bg: "bg-green-900/30",
    border: "border-green-500/30",
    text: "text-green-400",
    icon: AlertCircle,
  },
};

/**
 * ErrorAlert Component
 *
 * A component for displaying error messages, warnings, and informational alerts.
 *
 * @example Basic usage
 * ```tsx
 * {error && <ErrorAlert>{error}</ErrorAlert>}
 * ```
 *
 * @example With title
 * ```tsx
 * <ErrorAlert title="Validation Error">
 *   Please fix the following issues before continuing.
 * </ErrorAlert>
 * ```
 *
 * @example Dismissible
 * ```tsx
 * <ErrorAlert
 *   variant="warning"
 *   dismissible
 *   onDismiss={() => setShowWarning(false)}
 * >
 *   Your session will expire in 5 minutes.
 * </ErrorAlert>
 * ```
 */
export function ErrorAlert({
  children,
  variant = "error",
  title,
  dismissible = false,
  onDismiss,
  className = "",
}: ErrorAlertProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      className={`
        p-3 rounded border flex items-start gap-3
        ${styles.bg} ${styles.border} ${styles.text}
        ${className}
      `}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-0.5 hover:opacity-70 transition-opacity ${styles.text}`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}


export interface FormErrorProps {
  error?: string | null;
  className?: string;
}

export function FormError({ error, className = "" }: FormErrorProps) {
  if (!error) return null;

  return (
    <div
      className={`p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded ${className}`}
      role="alert"
    >
      {error}
    </div>
  );
}
