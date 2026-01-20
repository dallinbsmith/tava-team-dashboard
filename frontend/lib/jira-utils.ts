import React from "react";

/**
 * Shared utility functions for Jira task formatting
 * Used across JiraTasks, TeamJiraTasks, TeamTasksWidget, and other components
 */

/**
 * Returns Tailwind classes for Jira task status badges
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower.includes("done") || statusLower.includes("complete")) {
    return "bg-green-900/40 text-green-300";
  }
  if (statusLower.includes("progress") || statusLower.includes("review")) {
    return "bg-blue-900/40 text-blue-300";
  }
  if (statusLower.includes("todo") || statusLower.includes("backlog")) {
    return "bg-gray-700/40 text-gray-300";
  }
  return "bg-yellow-900/40 text-yellow-300";
}

/**
 * Returns Tailwind text color class for Jira task priority
 */
export function getPriorityColor(priority: string): string {
  const priorityLower = priority.toLowerCase();

  if (priorityLower.includes("highest") || priorityLower.includes("critical")) {
    return "text-red-600";
  }
  if (priorityLower.includes("high")) {
    return "text-orange-600";
  }
  if (priorityLower.includes("medium")) {
    return "text-yellow-600";
  }
  return "text-gray-500";
}

/**
 * Calculates the difference in days between a date and now
 */
export function getDueDateDiffDays(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns formatted due date info with color and text
 */
export function getDueDateInfo(dateString: string): {
  text: string;
  colorClass: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  const diffDays = getDueDateDiffDays(dateString);
  const date = new Date(dateString);

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`,
      colorClass: "text-red-400",
      isOverdue: true,
      isUrgent: true,
    };
  }
  if (diffDays === 0) {
    return {
      text: "Due today",
      colorClass: "text-orange-400",
      isOverdue: false,
      isUrgent: true,
    };
  }
  if (diffDays === 1) {
    return {
      text: "Due tomorrow",
      colorClass: "text-orange-400",
      isOverdue: false,
      isUrgent: true,
    };
  }
  if (diffDays <= 7) {
    return {
      text: `Due in ${diffDays} days`,
      colorClass: "text-yellow-400",
      isOverdue: false,
      isUrgent: false,
    };
  }
  return {
    text: date.toLocaleDateString(),
    colorClass: "text-theme-text-muted",
    isOverdue: false,
    isUrgent: false,
  };
}

/**
 * Returns a compact version of due date text (for tight spaces)
 */
export function getDueDateInfoCompact(dateString: string): {
  text: string;
  colorClass: string;
} {
  const diffDays = getDueDateDiffDays(dateString);
  const date = new Date(dateString);

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)}d`,
      colorClass: "text-red-400",
    };
  }
  if (diffDays === 0) {
    return {
      text: "Due today",
      colorClass: "text-orange-400",
    };
  }
  if (diffDays === 1) {
    return {
      text: "Tomorrow",
      colorClass: "text-orange-400",
    };
  }
  if (diffDays <= 7) {
    return {
      text: `In ${diffDays}d`,
      colorClass: "text-yellow-400",
    };
  }
  return {
    text: date.toLocaleDateString(),
    colorClass: "text-theme-text-muted",
  };
}

/**
 * React component for rendering formatted due dates
 * Use this when you need a JSX element directly
 */
export function DueDateDisplay({
  dueDate,
  compact = false,
  className = "",
}: {
  dueDate: string;
  compact?: boolean;
  className?: string;
}): React.ReactElement {
  const info = compact ? getDueDateInfoCompact(dueDate) : getDueDateInfo(dueDate);
  return React.createElement(
    "span",
    { className: `${info.colorClass} ${className}`.trim() },
    info.text
  );
}

/**
 * React component for rendering task status badges
 */
export function TaskStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}): React.ReactElement {
  const colorClass = getStatusColor(status);
  return React.createElement(
    "span",
    {
      className: `px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${colorClass} ${className}`.trim(),
    },
    status
  );
}
