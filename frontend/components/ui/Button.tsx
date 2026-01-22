"use client";

import { forwardRef, ReactNode } from "react";
import { Loader2, LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 hover:bg-primary-700 text-white",
  secondary:
    "bg-theme-elevated border border-theme-border text-theme-text hover:bg-theme-surface",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "text-theme-text hover:bg-theme-elevated",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

/**
 * Button Component
 *
 * A flexible button component with multiple variants and sizes.
 * Supports loading states and icons.
 *
 * @example Basic usage
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * ```
 *
 * @example With loading state
 * ```tsx
 * <Button variant="primary" loading={isSubmitting}>
 *   {isSubmitting ? "Saving..." : "Save"}
 * </Button>
 * ```
 *
 * @example With icon
 * ```tsx
 * <Button variant="secondary" icon={Plus}>
 *   Add Item
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon: Icon,
      iconAfter: IconAfter,
      children,
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium rounded
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : Icon ? (
          <Icon className={iconSizes[size]} />
        ) : null}
        {children}
        {!loading && IconAfter && <IconAfter className={iconSizes[size]} />}
      </button>
    );
  }
);

Button.displayName = "Button";


export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  variant?: ButtonVariant;
  size?: ButtonSize;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      variant = "ghost",
      size = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "p-1",
      md: "p-1.5",
      lg: "p-2",
    };

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        <Icon className={iconSizes[size]} />
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
