"use client";

import { ReactNode } from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button, ButtonVariant } from "./Button";

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
    icon?: LucideIcon;
  };
  /** Additional content */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * EmptyState Component
 *
 * A component for displaying empty states with optional actions.
 * Use when a list or container has no items to display.
 *
 * @example Basic usage
 * ```tsx
 * <EmptyState
 *   icon={Calendar}
 *   title="No events"
 *   description="Create your first event to get started."
 * />
 * ```
 *
 * @example With action button
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="No team members"
 *   description="Add team members to start collaborating."
 *   action={{
 *     label: "Add Member",
 *     onClick: () => setShowAddModal(true),
 *     icon: Plus,
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Icon className="w-12 h-12 mx-auto mb-3 text-theme-text-muted opacity-50" />
      <h3 className="text-lg font-medium text-theme-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-theme-text-muted mb-4 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || "primary"}
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

/**
 * NoResults Component
 *
 * A specialized empty state for search/filter results.
 */
export interface NoResultsProps {
  /** Search query that returned no results */
  query?: string;
  /** Optional clear filters action */
  onClearFilters?: () => void;
  /** Additional className */
  className?: string;
}

export function NoResults({ query, onClearFilters, className = "" }: NoResultsProps) {
  return (
    <EmptyState
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}".`
          : "Try adjusting your filters or search criteria."
      }
      action={
        onClearFilters
          ? {
              label: "Clear filters",
              onClick: onClearFilters,
              variant: "secondary",
            }
          : undefined
      }
      className={className}
    />
  );
}
