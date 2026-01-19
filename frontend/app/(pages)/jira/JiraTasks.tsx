"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { JiraIssue, JiraSettings } from "@/shared/types";
import { getMyJiraTasks, getJiraSettings } from "@/lib/api";
import { useCurrentUser } from "@/providers";
import { TimeOffIndicator } from "@/app/(pages)/time-off";
import {
  CheckSquare,
  ExternalLink,
  Clock,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react";

interface JiraTasksProps {
  compact?: boolean;
}

export default function JiraTasks({ compact = false }: JiraTasksProps) {
  const { isSupervisorOrAdmin, loading: userLoading } = useCurrentUser();
  const [tasks, setTasks] = useState<JiraIssue[]>([]);
  const [settings, setSettings] = useState<JiraSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      // Only fetch Jira settings if user is supervisor or admin
      if (isSupervisorOrAdmin) {
        const jiraSettings = await getJiraSettings();
        setSettings(jiraSettings);

        if (jiraSettings.org_configured) {
          const issues = await getMyJiraTasks(compact ? 5 : 20);
          setTasks(issues);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Jira tasks:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      // Detect token expiration or auth errors
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("403") ||
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("unauthorized") ||
        errorMessage.toLowerCase().includes("refresh")
      ) {
        setError("jira_reconnect");
      } else {
        setError("Failed to load tasks");
      }
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

  const getPriorityColor = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    switch (true) {
      case priorityLower.includes("highest") || priorityLower.includes("critical"):
        return "text-red-600";
      case priorityLower.includes("high"):
        return "text-orange-600";
      case priorityLower.includes("medium"):
        return "text-yellow-600";
      default:
        return "text-gray-500";
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

  // Only show Jira tasks for supervisors and admins
  if (!isSupervisorOrAdmin) {
    return null;
  }

  // Not configured - show setup prompt
  if (!settings?.org_configured) {
    return (
      <div className="bg-theme-surface border border-theme-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckSquare className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Jira Tasks</h2>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-theme-elevated flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-theme-text-muted" />
          </div>
          <p className="text-theme-text-muted mb-4">Connect your Jira account to see your tasks here</p>
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
          <CheckSquare className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-theme-text">My Jira Tasks</h2>
          {tasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {tasks.length}
            </span>
          )}
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

      {error && (
        <div className="px-6 py-4 bg-red-900/30 border-b border-red-500/30">
          {error === "jira_reconnect" ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">Your Jira connection has expired</p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="px-6 py-8 text-center text-theme-text-muted">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          <p>No tasks assigned to you</p>
          <p className="text-sm mt-1">Tasks assigned to you in Jira will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-theme-border">
          {tasks.map((task) => (
            <a
              key={task.id}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-4 hover:bg-theme-elevated transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-primary-400">{task.key}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                    {task.priority && (
                      <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    {task.time_off_impact && (
                      <TimeOffIndicator impact={task.time_off_impact} compact />
                    )}
                  </div>
                  <h3 className="font-medium text-theme-text truncate">{task.summary}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-theme-text-muted">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{task.project.key}</span>
                    </span>
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
