import React from "react";

export const getStatusColor = (status: string): string => {
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
};

export const getPriorityColor = (priority: string): string => {
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
};

export const getDueDateDiffDays = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDueDateInfo = (dateString: string): {
  text: string;
  colorClass: string;
  isOverdue: boolean;
  isUrgent: boolean;
} => {
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
};

export const getDueDateInfoCompact = (dateString: string): {
  text: string;
  colorClass: string;
} => {
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
};

export const DueDateDisplay = ({
  dueDate,
  compact = false,
  className = "",
}: {
  dueDate: string;
  compact?: boolean;
  className?: string;
}): React.ReactElement => {
  const info = compact ? getDueDateInfoCompact(dueDate) : getDueDateInfo(dueDate);
  return React.createElement(
    "span",
    { className: `${info.colorClass} ${className}`.trim() },
    info.text
  );
};

export const TaskStatusBadge = ({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}): React.ReactElement => {
  const colorClass = getStatusColor(status);
  return React.createElement(
    "span",
    {
      className:
        `px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${colorClass} ${className}`.trim(),
    },
    status
  );
};
