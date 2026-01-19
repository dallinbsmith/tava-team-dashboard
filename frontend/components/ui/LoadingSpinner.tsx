"use client";

import { Loader2 } from "lucide-react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: SpinnerSize;
  /** Additional className */
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

/**
 * LoadingSpinner Component
 *
 * A simple animated loading spinner.
 *
 * @example Basic usage
 * ```tsx
 * <LoadingSpinner size="md" />
 * ```
 */
export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-primary-600 ${sizeStyles[size]} ${className}`}
    />
  );
}

/**
 * CenteredSpinner Component
 *
 * A centered loading spinner for content areas.
 */
export interface CenteredSpinnerProps extends LoadingSpinnerProps {
  /** Optional loading text */
  text?: string;
}

export function CenteredSpinner({
  size = "lg",
  text,
  className = "",
}: CenteredSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <LoadingSpinner size={size} />
      {text && <p className="mt-3 text-sm text-theme-text-muted">{text}</p>}
    </div>
  );
}

/**
 * FullPageSpinner Component
 *
 * A full-page loading spinner overlay.
 */
export interface FullPageSpinnerProps extends LoadingSpinnerProps {
  /** Optional loading text */
  text?: string;
}

export function FullPageSpinner({ size = "xl", text }: FullPageSpinnerProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <LoadingSpinner size={size} />
      {text && <p className="mt-4 text-theme-text-muted">{text}</p>}
    </div>
  );
}

/**
 * Skeleton Component
 *
 * A skeleton loader for content placeholders.
 */
export interface SkeletonProps {
  /** Width class (default: w-full) */
  width?: string;
  /** Height class (default: h-4) */
  height?: string;
  /** Whether it's circular */
  circle?: boolean;
  /** Additional className */
  className?: string;
}

export function Skeleton({
  width = "w-full",
  height = "h-4",
  circle = false,
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`
        animate-pulse bg-theme-border
        ${circle ? "rounded-full" : "rounded"}
        ${width} ${height}
        ${className}
      `}
    />
  );
}

/**
 * SkeletonCard Component
 *
 * A skeleton loader for card content.
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-theme-surface border border-theme-border p-4 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <Skeleton circle width="w-10" height="h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-1/3" height="h-4" />
          <Skeleton width="w-2/3" height="h-3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton width="w-full" height="h-3" />
        <Skeleton width="w-4/5" height="h-3" />
      </div>
    </div>
  );
}
