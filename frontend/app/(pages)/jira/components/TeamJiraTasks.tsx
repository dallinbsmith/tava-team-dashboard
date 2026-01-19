"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { TeamTask, JiraSettings } from "../types";
import { getTeamJiraTasks, getJiraSettings } from "../api";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import Avatar from "@/shared/common/Avatar";
import GroupedSection from "@/shared/common/GroupedSection";
import TimeOffIndicator from "@/app/(pages)/(dashboard)/time-off/components/TimeOffIndicator";
import {
  Users,
  ExternalLink,
  Clock,
  AlertCircle,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
  Zap,
} from "lucide-react";

interface TeamJiraTasksProps {
  compact?: boolean;
}

const viewModes = ["grid", "list", "sprint"] as const;

export default function TeamJiraTasks({ compact = false }: TeamJiraTasksProps) {
  const { isSupervisorOrAdmin, loading: userLoading } = useCurrentUser();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [settings, setSettings] = useState<JiraSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL-synced view mode state
  const [viewMode, setViewMode] = useQueryState(
    "teamView",
    parseAsStringLiteral(viewModes).withDefault("list")
  );

  // Group tasks by sprint for sprint view
  const tasksBySprint = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {};
    tasks.forEach((task) => {
      const sprintName = task.sprint?.name || "No Sprint";
      if (!grouped[sprintName]) {
        grouped[sprintName] = [];
      }
      grouped[sprintName].push(task);
    });
    // Sort sprints alphabetically, but put "No Sprint" last
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === "No Sprint") return 1;
      if (b === "No Sprint") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((sprint) => ({ sprint, tasks: grouped[sprint] }));
  }, [tasks]);

  const fetchTasks = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      if (isSupervisorOrAdmin) {
        const jiraSettings = await getJiraSettings();
        setSettings(jiraSettings);

        if (jiraSettings.org_configured) {
          const issues = await getTeamJiraTasks(compact ? 5 : 20);
          setTasks(issues);
        }
      }
    } catch (e) {
      console.error("Failed to fetch team Jira tasks:", e);
      setError("Failed to load team tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSupervisorOrAdmin, compact]);

  useEffect(() => {
    if (!userLoading) {
      fetchTasks();
    }
  }, [userLoading, fetchTasks]);

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (true) {
      case statusLower.includes("done") || statusLower.includes("complete"):
        return "bg-green-900/40 text-green-300";
      case statusLower.includes("progress") || statusLower.includes("review"):
        return "bg-blue-900/40 text-blue-300";
      case statusLower.includes("todo") || statusLower.includes("backlog"):
        return "bg-gray-700/40 text-gray-300";
      default:
        return "bg-yellow-900/40 text-yellow-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (true) {
      case diffDays < 0:
        return <span className="text-red-600">Overdue by {Math.abs(diffDays)} days</span>;
      case diffDays === 0:
        return <span className="text-orange-600">Due today</span>;
      case diffDays === 1:
        return <span className="text-orange-600">Due tomorrow</span>;
      case diffDays <= 7:
        return <span className="text-yellow-600">Due in {diffDays} days</span>;
      default:
        return <span className="text-gray-600">{date.toLocaleDateString()}</span>;
    }
  };

  if (userLoading || loading) {
    return (
      <div className="bg-theme-surface border border-theme-border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Only show for supervisors and admins
  if (!isSupervisorOrAdmin) {
    return null;
  }

  // Not configured - show setup prompt
  if (!settings?.org_configured) {
    return (
      <div className="bg-theme-surface border border-theme-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Team Tasks</h2>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-theme-elevated flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-theme-text-muted" />
          </div>
          <p className="text-theme-text-muted mb-4">Connect Jira to see your team&apos;s tasks</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Connect Jira
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden">
      <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-theme-text">Team Tasks</h2>
          {tasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {tasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-theme-border overflow-hidden bg-theme-elevated">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid"
                ? "bg-primary-500 text-white"
                : "text-theme-text-muted hover:bg-theme-surface"
                }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 border-l border-theme-border transition-colors ${viewMode === "list"
                ? "bg-primary-500 text-white"
                : "text-theme-text-muted hover:bg-theme-surface"
                }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("sprint")}
              className={`p-2 border-l border-theme-border transition-colors ${viewMode === "sprint"
                ? "bg-primary-500 text-white"
                : "text-theme-text-muted hover:bg-theme-surface"
                }`}
              title="Sprint view"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-900/30 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="px-6 py-8 text-center text-theme-text-muted">
          <Users className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          <p>No tasks found for your team</p>
          <p className="text-sm mt-1">Tasks assigned to your direct reports in Jira will appear here</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <a
              key={task.id}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-theme-elevated border border-theme-border hover:border-primary-500/50 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar
                    s3AvatarUrl={task.employee.avatar_url}
                    firstName={task.employee.first_name}
                    lastName={task.employee.last_name}
                    size="sm"
                    className="rounded-full"
                  />
                  <span className="text-sm font-medium text-theme-text">
                    {task.employee.first_name} {task.employee.last_name}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-primary-400">{task.key}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}
                >
                  {task.status}
                </span>
                {task.time_off_impact && (
                  <TimeOffIndicator impact={task.time_off_impact} compact />
                )}
              </div>

              <h3 className="font-medium text-theme-text text-sm line-clamp-2 mb-3 group-hover:text-primary-400 transition-colors">
                {task.summary}
              </h3>

              <div className="flex items-center justify-between text-xs text-theme-text-muted pt-3 border-t border-theme-border">
                <span className="font-medium">{task.project.name}</span>
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(task.due_date)}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      ) : viewMode === "sprint" ? (
        /* Sprint View */
        <div className="divide-y divide-theme-border">
          {tasksBySprint.map(({ sprint, tasks: sprintTasks }) => (
            <GroupedSection
              key={sprint}
              title={sprint}
              count={sprintTasks.length}
              icon={Zap}
            >
              {sprintTasks.map((task) => (
                <a
                  key={task.id}
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-6 py-3 hover:bg-theme-elevated/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      s3AvatarUrl={task.employee.avatar_url}
                      firstName={task.employee.first_name}
                      lastName={task.employee.last_name}
                      size="sm"
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-theme-text">
                          {task.employee.first_name} {task.employee.last_name}
                        </span>
                        <span className="text-xs font-mono text-primary-400">{task.key}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                        {task.time_off_impact && (
                          <TimeOffIndicator impact={task.time_off_impact} compact />
                        )}
                      </div>
                      <h4 className="text-sm text-theme-text truncate">{task.summary}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-theme-text-muted">
                        <span>{task.project.name}</span>
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
                  </div>
                </a>
              ))}
            </GroupedSection>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="divide-y divide-theme-border">
          {tasks.map((task) => (
            <a
              key={task.id}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-4 hover:bg-theme-elevated transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Employee Avatar */}
                <div className="flex-shrink-0">
                  <Avatar
                    s3AvatarUrl={task.employee.avatar_url}
                    firstName={task.employee.first_name}
                    lastName={task.employee.last_name}
                    size="md"
                    className="rounded-full"
                  />
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-theme-text">
                      {task.employee.first_name} {task.employee.last_name}
                    </span>
                    <span className="text-sm font-mono text-primary-400">{task.key}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}
                    >
                      {task.status}
                    </span>
                    {task.time_off_impact && (
                      <TimeOffIndicator impact={task.time_off_impact} compact />
                    )}
                  </div>
                  <h3 className="font-medium text-theme-text truncate">{task.summary}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-theme-text-muted">
                    <span className="font-medium">{task.project.name}</span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-theme-text-muted flex-shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}

      {compact && tasks.length > 0 && settings?.jira_site_url && (
        <div className="px-6 py-3 bg-theme-elevated border-t border-theme-border">
          <a
            href={settings.jira_site_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-400 hover:underline flex items-center gap-1"
          >
            View all in Jira
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
