"use client";

import { Loader2 } from "lucide-react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
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
export const LoadingSpinner = ({
  size = "md",
  className = "",
}: LoadingSpinnerProps) => {
  return (
    <Loader2
      className={`animate-spin text-primary-600 ${sizeStyles[size]} ${className}`}
    />
  );
};

export interface CenteredSpinnerProps extends LoadingSpinnerProps {
  text?: string;
}

export const CenteredSpinner = ({
  size = "lg",
  text,
  className = "",
}: CenteredSpinnerProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
    >
      <LoadingSpinner size={size} />
      {text && <p className="mt-3 text-sm text-theme-text-muted">{text}</p>}
    </div>
  );
};

export interface FullPageSpinnerProps extends LoadingSpinnerProps {
  text?: string;
}

export const FullPageSpinner = ({
  size = "xl",
  text,
}: FullPageSpinnerProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <LoadingSpinner size={size} />
      {text && <p className="mt-4 text-theme-text-muted">{text}</p>}
    </div>
  );
};

export interface SkeletonProps {
  width?: string;
  height?: string;
  circle?: boolean;
  className?: string;
}

export const Skeleton = ({
  width = "w-full",
  height = "h-4",
  circle = false,
  className = "",
}: SkeletonProps) => {
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
};

export const SkeletonCard = ({ className = "" }: { className?: string }) => {
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
};
