"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  CheckSquare,
  RefreshCw,
  AlertCircle,
  Clock,
  ExternalLink,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { User } from "@/shared/types/user";
import { TeamTask } from "@/app/(pages)/jira/types";
import { SelectionType, TaskCategory } from "../types";
import { useTeamTasks } from "../hooks";
import Avatar from "@/shared/common/Avatar";
import TimeOffIndicator from "@/app/(pages)/(dashboard)/time-off/components/TimeOffIndicator";
import {
  TaskStatusBadge,
  DueDateDisplay,
} from "@/lib/jira-utils";

interface TeamTasksWidgetProps {
  selectionType: SelectionType;
  selectedId: string;
  allUsers: User[];
}

const taskCategories: TaskCategory[] = ["upcoming", "overdue", "approaching", "completed"];
const viewModes = ["grid", "list"] as const;

const categoryConfig: Record<
  TaskCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  upcoming: { label: "Upcoming", icon: Calendar, color: "text-blue-400" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-red-400" },
  approaching: { label: "Due Soon", icon: Clock, color: "text-yellow-400" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-green-400" },
};

export default function TeamTasksWidget({
  selectionType,
  selectedId,
  allUsers,
}: TeamTasksWidgetProps) {
  const { tasks, categorized, isLoading, error, refetch } = useTeamTasks({
    type: selectionType,
    id: selectedId,
    allUsers,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useQueryState(
    "taskCategory",
    parseAsStringLiteral(taskCategories).withDefault("upcoming")
  );
  const [viewMode, setViewMode] = useQueryState(
    "taskView",
    parseAsStringLiteral(viewModes).withDefault("list")
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Get tasks for active category
  const activeTasks = useMemo(() => {
    return categorized[activeCategory] || [];
  }, [categorized, activeCategory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center gap-3">
          <CheckSquare className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Tasks</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const categoryInfo = categoryConfig[activeCategory];
  const CategoryIcon = categoryInfo.icon;

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-theme-text">Tasks</h2>
          {totalTasks > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-900/50 text-blue-300">
              {totalTasks}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-theme-border overflow-hidden bg-theme-elevated">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 border-l border-theme-border transition-colors ${
                viewMode === "list"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-theme-border">
        {taskCategories.map((category) => {
          const config = categoryConfig[category];
          const Icon = config.icon;
          const count = categorized[category]?.length || 0;
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                isActive
                  ? `bg-theme-elevated ${config.color} border-b-2 border-current -mb-px`
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{config.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? "bg-current/20" : "bg-theme-elevated"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-6 py-4 bg-red-900/30 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTasks.length === 0 ? (
        <div className="flex-1 px-6 py-12 text-center text-theme-text-muted">
          <CategoryIcon className={`w-12 h-12 mx-auto mb-4 ${categoryInfo.color} opacity-50`} />
          <p>No {categoryInfo.label.toLowerCase()} tasks</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="flex-1 p-4 grid gap-3 sm:grid-cols-2 overflow-auto max-h-72">
          {activeTasks.slice(0, 6).map((task) => (
            <TaskGridCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="flex-1 divide-y divide-theme-border overflow-auto max-h-72">
          {activeTasks.slice(0, 8).map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Show more indicator */}
      {activeTasks.length > (viewMode === "grid" ? 6 : 8) && (
        <div className="px-4 py-2 text-xs text-center text-theme-text-muted bg-theme-elevated border-t border-theme-border">
          +{activeTasks.length - (viewMode === "grid" ? 6 : 8)} more tasks
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-theme-elevated border-t border-theme-border mt-auto">
        <Link
          href="/jira"
          className="text-sm text-primary-400 hover:underline flex items-center gap-1"
        >
          View all tasks
          <CheckSquare className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

interface TaskGridCardProps {
  task: TeamTask;
}

function TaskGridCard({ task }: TaskGridCardProps) {
  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-theme-elevated border border-theme-border hover:border-primary-500/50 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar
            s3AvatarUrl={task.employee.avatar_url}
            firstName={task.employee.first_name}
            lastName={task.employee.last_name}
            size="xs"
          />
          <span className="text-xs text-theme-text-muted truncate max-w-20">
            {task.employee.first_name}
          </span>
        </div>
        <ExternalLink className="w-3 h-3 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
      </div>

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-mono text-primary-400">{task.key}</span>
        <TaskStatusBadge status={task.status} />
        {task.time_off_impact && <TimeOffIndicator impact={task.time_off_impact} compact />}
      </div>

      <h3 className="text-xs font-medium text-theme-text line-clamp-2 group-hover:text-primary-400 transition-colors">
        {task.summary}
      </h3>

      {task.due_date && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-theme-text-muted">
          <Clock className="w-3 h-3" />
          <DueDateDisplay dueDate={task.due_date} compact />
        </div>
      )}
    </a>
  );
}

interface TaskListItemProps {
  task: TeamTask;
}

function TaskListItem({ task }: TaskListItemProps) {
  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-theme-elevated transition-colors group"
    >
      <Avatar
        s3AvatarUrl={task.employee.avatar_url}
        firstName={task.employee.first_name}
        lastName={task.employee.last_name}
        size="sm"
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-xs text-theme-text-muted whitespace-nowrap hidden sm:inline">
          {task.employee.first_name[0]}. {task.employee.last_name}
        </span>
        <span className="text-xs font-mono text-primary-400 whitespace-nowrap">{task.key}</span>
        <span className="text-sm text-theme-text truncate flex-1 group-hover:text-primary-400 transition-colors">
          {task.summary}
        </span>
        <TaskStatusBadge status={task.status} />
        {task.time_off_impact && <TimeOffIndicator impact={task.time_off_impact} compact />}
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-theme-text-muted whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <DueDateDisplay dueDate={task.due_date} compact />
          </span>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-theme-text-muted flex-shrink-0" />
    </a>
  );
}
