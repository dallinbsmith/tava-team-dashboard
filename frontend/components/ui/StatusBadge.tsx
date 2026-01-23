"use client";

import { ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type BadgeSize = "sm" | "md";

export interface StatusBadgeProps {
  /** Badge content */
  children: ReactNode;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Additional className */
  className?: string;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string; border: string }
> = {
  default: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/20",
  },
  success: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/20",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  // Time-off status variants
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  approved: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/20",
  },
  rejected: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  cancelled: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/20",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
};

/**
 * StatusBadge Component
 *
 * A badge component for displaying status indicators, labels, and tags.
 *
 * @example Basic usage
 * ```tsx
 * <StatusBadge variant="success">Approved</StatusBadge>
 * ```
 *
 * @example Time-off status
 * ```tsx
 * <StatusBadge variant="pending">Pending Review</StatusBadge>
 * ```
 */
export const StatusBadge = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}: StatusBadgeProps) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${styles.bg} ${styles.text} ${styles.border}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

/**
 * RoleBadge Component
 *
 * A specialized badge for user roles.
 */
export type UserRole = "admin" | "supervisor" | "employee";

export interface RoleBadgeProps {
  role: UserRole;
  size?: BadgeSize;
  className?: string;
}

const roleVariants: Record<UserRole, BadgeVariant> = {
  admin: "error",
  supervisor: "info",
  employee: "default",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  employee: "Employee",
};

export const RoleBadge = ({
  role,
  size = "sm",
  className = "",
}: RoleBadgeProps) => {
  return (
    <StatusBadge variant={roleVariants[role]} size={size} className={className}>
      {roleLabels[role]}
    </StatusBadge>
  );
};
