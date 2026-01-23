"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { TeamTask, JiraSettings } from "../types";
import { getTeamJiraTasks, getJiraSettings } from "../actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import Avatar from "@/shared/common/Avatar";
import { getStatusColor, DueDateDisplay } from "@/lib/jira-utils";
import { JIRA_LIMITS } from "@/lib/constants";
import TimeOffIndicator from "@/app/(pages)/(dashboard)/time-off/components/TimeOffIndicator";
import {
  FilterDropdown,
  FilterSection,
  FilterCheckbox,
  SearchableFilterList,
} from "@/components";
import {
  Users,
  ExternalLink,
  Clock,
  AlertCircle,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";

interface TeamJiraTasksProps {
  compact?: boolean;
}

const viewModes = ["grid", "list"] as const;

export default function TeamJiraTasks({ compact = false }: TeamJiraTasksProps) {
  const { effectiveIsSupervisorOrAdmin, loading: userLoading } =
    useCurrentUser();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [settings, setSettings] = useState<JiraSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sprintFilters, setSprintFilters] = useState<string[]>([]);
  const [epicFilter, setEpicFilter] = useState(false);
  const [individualFilters, setIndividualFilters] = useState<string[]>([]);

  // Expanded sections for filter accordion
  const [expandedSections, setExpandedSections] = useState({
    sprint: true,
    epic: false,
    individual: false,
  });

  // URL-synced view mode state
  const [viewMode, setViewMode] = useQueryState(
    "teamView",
    parseAsStringLiteral(viewModes).withDefault("list"),
  );

  // Extract unique sprints and individuals from tasks
  const { sprints, individuals } = useMemo(() => {
    const sprintSet = new Set<string>();
    const individualMap = new Map<number, { id: number; name: string }>();

    tasks.forEach((task) => {
      if (task.sprint?.name) {
        sprintSet.add(task.sprint.name);
      }
      if (task.employee) {
        individualMap.set(task.employee.id, {
          id: task.employee.id,
          name: `${task.employee.first_name} ${task.employee.last_name}`,
        });
      }
    });

    return {
      sprints: Array.from(sprintSet).sort(),
      individuals: Array.from(individualMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };
  }, [tasks]);

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Sprint filter (multi-select)
      if (sprintFilters.length > 0) {
        const taskSprint = task.sprint?.name || "No Sprint";
        if (!sprintFilters.includes(taskSprint)) return false;
      }

      // Epic filter (only show epics)
      if (epicFilter && task.issue_type !== "Epic") {
        return false;
      }

      // Individual filter (multi-select by name)
      if (individualFilters.length > 0) {
        const employeeName = `${task.employee.first_name} ${task.employee.last_name}`;
        if (!individualFilters.includes(employeeName)) return false;
      }

      return true;
    });
  }, [tasks, sprintFilters, epicFilter, individualFilters]);

  // Calculate active filter count
  const activeFilterCount = [
    sprintFilters.length,
    epicFilter ? 1 : 0,
    individualFilters.length,
  ].reduce((a, b) => a + b, 0);

  const clearAllFilters = () => {
    setSprintFilters([]);
    setEpicFilter(false);
    setIndividualFilters([]);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchTasks = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        if (effectiveIsSupervisorOrAdmin) {
          const jiraSettings = await getJiraSettings();
          setSettings(jiraSettings);

          if (jiraSettings.org_configured) {
            const issues = await getTeamJiraTasks(
              compact
                ? JIRA_LIMITS.TEAM_TASKS_COMPACT
                : JIRA_LIMITS.TEAM_TASKS_DEFAULT,
            );
            setTasks(issues || []);
          }
        }
      } catch (e) {
        console.error("Failed to fetch team Jira tasks:", e);
        setError("Failed to load team tasks");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveIsSupervisorOrAdmin, compact],
  );

  useEffect(() => {
    if (!userLoading) {
      fetchTasks();
    }
  }, [userLoading, fetchTasks]);

  if (userLoading || loading) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center gap-3">
          <Users className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Team Tasks</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Only show for supervisors and admins
  if (!effectiveIsSupervisorOrAdmin) {
    return null;
  }

  // Not configured - show setup prompt
  if (!settings?.org_configured) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center gap-3">
          <Users className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Team Tasks</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-theme-elevated flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-theme-text-muted" />
          </div>
          <p className="text-theme-text-muted mb-4">
            Connect Jira to see your team&apos;s tasks
          </p>
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
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-theme-text">Team Tasks</h2>
          {filteredTasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {filteredTasks.length}
              {activeFilterCount > 0 && ` / ${tasks.length}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown
            isOpen={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            onClose={() => setFilterOpen(false)}
            activeFilterCount={activeFilterCount}
            onClearAll={clearAllFilters}
            position="left"
          >
            <FilterSection
              title="Sprint"
              isExpanded={expandedSections.sprint}
              onToggle={() => toggleSection("sprint")}
            >
              <SearchableFilterList
                items={["No Sprint", ...sprints]}
                selectedValues={sprintFilters}
                onChange={setSprintFilters}
                placeholder="Search sprints"
              />
            </FilterSection>

            <FilterSection
              title="Epic"
              isExpanded={expandedSections.epic}
              onToggle={() => toggleSection("epic")}
            >
              <FilterCheckbox
                label="Show only Epics"
                checked={epicFilter}
                onChange={setEpicFilter}
              />
            </FilterSection>

            <FilterSection
              title="Individual"
              isExpanded={expandedSections.individual}
              onToggle={() => toggleSection("individual")}
            >
              <SearchableFilterList
                items={individuals.map((i) => i.name)}
                selectedValues={individualFilters}
                onChange={setIndividualFilters}
                placeholder="Search people"
              />
            </FilterSection>
          </FilterDropdown>

          <div className="flex border border-theme-border overflow-hidden bg-theme-elevated">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 border-l border-theme-border transition-colors ${
                viewMode === "list"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
            title="Refresh tasks"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
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

      {filteredTasks.length === 0 ? (
        <div className="flex-1 px-6 py-8 text-center text-theme-text-muted">
          <Users className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          {activeFilterCount > 0 ? (
            <>
              <p>No tasks match your filters</p>
              <button
                onClick={clearAllFilters}
                className="text-sm mt-2 text-primary-400 hover:text-primary-300 transition-colors"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p>No tasks found for your team</p>
              <p className="text-sm mt-1">
                Tasks assigned to your direct reports in Jira will appear here
              </p>
            </>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="flex-1 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
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
                <span className="text-xs font-mono text-primary-400">
                  {task.key}
                </span>
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
                    <DueDateDisplay dueDate={task.due_date} />
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="flex-1 divide-y divide-theme-border">
          {filteredTasks.map((task) => (
            <a
              key={task.id}
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 hover:bg-theme-elevated transition-colors"
            >
              <Avatar
                s3AvatarUrl={task.employee.avatar_url}
                firstName={task.employee.first_name}
                lastName={task.employee.last_name}
                size="sm"
                className="rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs text-theme-text-muted whitespace-nowrap">
                  {task.employee.first_name[0]}. {task.employee.last_name}
                </span>
                <span className="text-xs font-mono text-primary-400">
                  {task.key}
                </span>
                <span className="text-sm text-theme-text truncate flex-1">
                  {task.summary}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}
                >
                  {task.status}
                </span>
                {task.time_off_impact && (
                  <TimeOffIndicator impact={task.time_off_impact} compact />
                )}
                {task.due_date && (
                  <span className="flex items-center gap-1 text-xs text-theme-text-muted whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    <DueDateDisplay dueDate={task.due_date} />
                  </span>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-theme-text-muted flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      <div className="px-6 py-3 bg-theme-elevated border-t border-theme-border">
        <Link
          href="/jira"
          className="text-sm text-primary-400 hover:underline flex items-center gap-1"
        >
          View all team tasks
          <Users className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
