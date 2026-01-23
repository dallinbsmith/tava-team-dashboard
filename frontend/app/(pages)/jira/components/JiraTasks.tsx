"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { JiraIssue, JiraSettings, TeamTask } from "../types";
import { TimeOffImpact } from "@/app/(pages)/(dashboard)/time-off/types";
import { getMyJiraTasks, getTeamJiraTasks, getJiraSettings } from "../actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import Avatar from "@/shared/common/Avatar";
import { getStatusColor, getPriorityColor, DueDateDisplay } from "@/lib/jira-utils";
import { JIRA_LIMITS } from "@/lib/constants";
import TimeOffIndicator from "@/app/(pages)/(dashboard)/time-off/components/TimeOffIndicator";
import { FilterDropdown, FilterSection, SearchableFilterList } from "@/components";
import {
  CheckSquare,
  ExternalLink,
  Clock,
  AlertCircle,
  Settings,
  RefreshCw,
  LayoutGrid,
  List,
  User,
  Users,
  Building2,
  UsersRound,
} from "lucide-react";

interface JiraTasksProps {
  compact?: boolean;
}

const viewModes = ["grid", "list"] as const;

// Source filter can be: my tasks, all team, specific department, or specific squad
type SourceFilter =
  | { type: "my" }
  | { type: "team" }
  | { type: "department"; value: string }
  | { type: "squad"; value: number };

// Unified task type for display
interface DisplayTask {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority?: string;
  due_date?: string;
  url: string;
  project: { key: string; name: string };
  epic?: { key: string; summary: string };
  time_off_impact?: TimeOffImpact;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export default function JiraTasks({ compact = false }: JiraTasksProps) {
  const { loading: userLoading, effectiveIsSupervisorOrAdmin } = useCurrentUser();
  const {
    departments: departmentsInput,
    squads: squadsInput,
    allUsers: allUsersInput,
  } = useOrganization();

  // Memoize organization data to prevent useMemo dependency warnings
  const allUsers = useMemo(() => allUsersInput || [], [allUsersInput]);
  const departments = useMemo(() => departmentsInput || [], [departmentsInput]);
  const squads = useMemo(() => squadsInput || [], [squadsInput]);
  const [myTasks, setMyTasks] = useState<JiraIssue[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [settings, setSettings] = useState<JiraSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>({ type: "my" });
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [epicFilter, setEpicFilter] = useState("all");
  const [individualFilters, setIndividualFilters] = useState<string[]>([]);

  // Expanded sections for filter accordion
  const [expandedSections, setExpandedSections] = useState({
    source: true,
    status: false,
    epic: false,
    individual: false,
  });

  // URL-synced view mode state
  const [viewMode, setViewMode] = useQueryState(
    "myView",
    parseAsStringLiteral(viewModes).withDefault("list")
  );

  // Convert tasks to unified display format based on source filter
  const displayTasks: DisplayTask[] = useMemo(() => {
    if (sourceFilter.type === "my") {
      return myTasks.map((task) => ({
        id: task.id,
        key: task.key,
        summary: task.summary,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        url: task.url,
        project: task.project,
        epic: task.epic,
        time_off_impact: task.time_off_impact,
      }));
    } else {
      // For team, department, or squad - start with all team tasks
      let filteredTeamTasks = teamTasks;

      // Filter by department if selected
      if (sourceFilter.type === "department") {
        filteredTeamTasks = teamTasks.filter(
          (task) => task.employee?.department === sourceFilter.value
        );
      }

      // Filter by squad if selected
      if (sourceFilter.type === "squad") {
        // Find user IDs that belong to this squad
        const squadUserIds = new Set(
          allUsers
            .filter((user) => user.squads?.some((s) => s.id === sourceFilter.value))
            .map((user) => user.id)
        );
        filteredTeamTasks = teamTasks.filter(
          (task) => task.employee && squadUserIds.has(task.employee.id)
        );
      }

      return filteredTeamTasks.map((task) => ({
        id: task.id,
        key: task.key,
        summary: task.summary,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        url: task.url,
        project: task.project,
        epic: task.epic,
        time_off_impact: task.time_off_impact,
        employee: task.employee,
      }));
    }
  }, [sourceFilter, myTasks, teamTasks, allUsers]);

  // Extract unique statuses, epics, and individuals from tasks
  const { statuses, epics, individuals } = useMemo(() => {
    const statusSet = new Set<string>();
    const epicMap = new Map<string, { key: string; summary: string }>();
    const individualMap = new Map<number, { id: number; name: string }>();

    displayTasks.forEach((task) => {
      if (task.status) {
        statusSet.add(task.status);
      }
      if (task.epic?.key) {
        epicMap.set(task.epic.key, {
          key: task.epic.key,
          summary: task.epic.summary,
        });
      }
      if (task.employee) {
        individualMap.set(task.employee.id, {
          id: task.employee.id,
          name: `${task.employee.first_name} ${task.employee.last_name}`,
        });
      }
    });

    return {
      statuses: Array.from(statusSet).sort(),
      epics: Array.from(epicMap.values()).sort((a, b) => a.summary.localeCompare(b.summary)),
      individuals: Array.from(individualMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [displayTasks]);

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return displayTasks.filter((task) => {
      // Status filter (multi-select)
      if (statusFilters.length > 0 && !statusFilters.includes(task.status)) {
        return false;
      }

      // Epic filter
      if (epicFilter !== "all") {
        if (epicFilter === "no-epic") {
          // Show tasks without an epic
          if (task.epic) {
            return false;
          }
        } else if (task.epic?.key !== epicFilter) {
          return false;
        }
      }

      // Individual filter (only applies to non-"my" sources, multi-select by name)
      if (sourceFilter.type !== "my" && individualFilters.length > 0) {
        const employeeName = task.employee
          ? `${task.employee.first_name} ${task.employee.last_name}`
          : "";
        if (!individualFilters.includes(employeeName)) {
          return false;
        }
      }

      return true;
    });
  }, [displayTasks, statusFilters, epicFilter, sourceFilter, individualFilters]);

  // Calculate active filter count (include source if not default "my")
  const activeFilterCount = [
    sourceFilter.type !== "my" ? 1 : 0,
    statusFilters.length,
    epicFilter !== "all" ? 1 : 0,
    sourceFilter.type !== "my" ? individualFilters.length : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAllFilters = () => {
    setSourceFilter({ type: "my" });
    setStatusFilters([]);
    setEpicFilter("all");
    setIndividualFilters([]);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSourceChange = (newSource: SourceFilter) => {
    setSourceFilter(newSource);
    // Reset individual filter when switching sources
    setIndividualFilters([]);
  };

  const fetchTasks = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const jiraSettings = await getJiraSettings();
        setSettings(jiraSettings);

        if (jiraSettings.org_configured) {
          // Fetch both my tasks and team tasks
          const [myIssues, teamIssues] = await Promise.all([
            getMyJiraTasks(compact ? JIRA_LIMITS.TASKS_COMPACT : JIRA_LIMITS.TEAM_TASKS_DEFAULT),
            getTeamJiraTasks(
              compact ? JIRA_LIMITS.TEAM_TASKS_COMPACT : JIRA_LIMITS.TEAM_TASKS_DEFAULT
            ),
          ]);
          setMyTasks(myIssues || []);
          setTeamTasks(teamIssues || []);
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
    },
    [compact]
  );

  useEffect(() => {
    if (!userLoading) {
      fetchTasks();
    }
  }, [userLoading, fetchTasks]);

  if (userLoading || loading) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-4 py-3 border-b border-theme-border flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-theme-text">Jira Tasks</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Not configured - show setup prompt
  if (!settings?.org_configured) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-4 py-3 border-b border-theme-border flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-theme-text">Jira Tasks</h2>
        </div>
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 bg-theme-elevated flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-theme-text-muted" />
          </div>
          <p className="text-theme-text-muted mb-2">Jira is not configured for your organization</p>
          {effectiveIsSupervisorOrAdmin ? (
            <>
              <p className="text-sm text-theme-text-muted mb-4">
                Connect your Jira account to track tasks and issues
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Set Up Jira
              </Link>
            </>
          ) : (
            <p className="text-sm text-theme-text-muted">
              Contact your administrator to set up Jira integration
            </p>
          )}
        </div>
      </div>
    );
  }

  const totalTasks = sourceFilter.type === "my" ? myTasks.length : displayTasks.length;

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-theme-text">Jira Tasks</h2>
          {filteredTasks.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {filteredTasks.length}
              {activeFilterCount > 0 && ` / ${totalTasks}`}
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
              title="Source"
              isExpanded={expandedSections.source}
              onToggle={() => toggleSection("source")}
            >
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => handleSourceChange({ type: "my" })}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    sourceFilter.type === "my"
                      ? "bg-primary-500/20 text-primary-300"
                      : "text-theme-text-muted hover:bg-theme-elevated"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Tasks</span>
                  {sourceFilter.type === "my" && (
                    <span className="ml-auto text-primary-400">✓</span>
                  )}
                </button>

                <button
                  onClick={() => handleSourceChange({ type: "team" })}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    sourceFilter.type === "team"
                      ? "bg-primary-500/20 text-primary-300"
                      : "text-theme-text-muted hover:bg-theme-elevated"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Team Tasks</span>
                  {sourceFilter.type === "team" && (
                    <span className="ml-auto text-primary-400">✓</span>
                  )}
                </button>

                {departments.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-theme-text-subtle uppercase tracking-wide border-t border-theme-border mt-2 pt-2">
                      Departments
                    </div>
                    {departments.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => handleSourceChange({ type: "department", value: dept })}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          sourceFilter.type === "department" && sourceFilter.value === dept
                            ? "bg-primary-500/20 text-primary-300"
                            : "text-theme-text-muted hover:bg-theme-elevated"
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{dept}</span>
                        {sourceFilter.type === "department" && sourceFilter.value === dept && (
                          <span className="ml-auto text-primary-400 flex-shrink-0">✓</span>
                        )}
                      </button>
                    ))}
                  </>
                )}

                {squads.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-theme-text-subtle uppercase tracking-wide border-t border-theme-border mt-2 pt-2">
                      Squads
                    </div>
                    {squads.map((squad) => (
                      <button
                        key={squad.id}
                        onClick={() => handleSourceChange({ type: "squad", value: squad.id })}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          sourceFilter.type === "squad" && sourceFilter.value === squad.id
                            ? "bg-primary-500/20 text-primary-300"
                            : "text-theme-text-muted hover:bg-theme-elevated"
                        }`}
                      >
                        <UsersRound className="w-4 h-4" />
                        <span className="truncate">{squad.name}</span>
                        {sourceFilter.type === "squad" && sourceFilter.value === squad.id && (
                          <span className="ml-auto text-primary-400 flex-shrink-0">✓</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </FilterSection>

            <FilterSection
              title="Status"
              isExpanded={expandedSections.status}
              onToggle={() => toggleSection("status")}
            >
              <SearchableFilterList
                items={statuses}
                selectedValues={statusFilters}
                onChange={setStatusFilters}
                placeholder="Search statuses"
              />
            </FilterSection>

            <FilterSection
              title="Epic"
              isExpanded={expandedSections.epic}
              onToggle={() => toggleSection("epic")}
            >
              <div className="space-y-1">
                <button
                  onClick={() => setEpicFilter("all")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    epicFilter === "all"
                      ? "bg-primary-500/20 text-primary-300"
                      : "text-theme-text-muted hover:bg-theme-elevated"
                  }`}
                >
                  <span>All Epics</span>
                  {epicFilter === "all" && <span className="ml-auto text-primary-400">✓</span>}
                </button>
                <button
                  onClick={() => setEpicFilter("no-epic")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    epicFilter === "no-epic"
                      ? "bg-primary-500/20 text-primary-300"
                      : "text-theme-text-muted hover:bg-theme-elevated"
                  }`}
                >
                  <span>No Epic</span>
                  {epicFilter === "no-epic" && <span className="ml-auto text-primary-400">✓</span>}
                </button>
                {epics.map((epic) => (
                  <button
                    key={epic.key}
                    onClick={() => setEpicFilter(epic.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      epicFilter === epic.key
                        ? "bg-primary-500/20 text-primary-300"
                        : "text-theme-text-muted hover:bg-theme-elevated"
                    }`}
                  >
                    <span className="truncate">{epic.summary}</span>
                    {epicFilter === epic.key && (
                      <span className="ml-auto text-primary-400 flex-shrink-0">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </FilterSection>

            {sourceFilter.type !== "my" && individuals.length > 0 && (
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
            )}
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
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
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

      {filteredTasks.length === 0 ? (
        <div className="flex-1 px-6 py-8 text-center text-theme-text-muted">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
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
              <p>
                {sourceFilter.type === "my"
                  ? "No tasks assigned to you"
                  : sourceFilter.type === "team"
                    ? "No tasks found for your team"
                    : sourceFilter.type === "department"
                      ? `No tasks found for ${sourceFilter.value} department`
                      : `No tasks found for this squad`}
              </p>
              <p className="text-sm mt-1">
                {sourceFilter.type === "my"
                  ? "Tasks assigned to you in Jira will appear here"
                  : "Tasks assigned to members in Jira will appear here"}
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
              {task.employee && (
                <div className="flex items-center gap-2 mb-3">
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
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-primary-400">{task.key}</span>
                <span className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {task.priority && (
                  <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                )}
                {task.time_off_impact && <TimeOffIndicator impact={task.time_off_impact} compact />}
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
              {task.employee && (
                <Avatar
                  s3AvatarUrl={task.employee.avatar_url}
                  firstName={task.employee.first_name}
                  lastName={task.employee.last_name}
                  size="sm"
                  className="rounded-full flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {task.employee && (
                  <span className="text-xs text-theme-text-muted whitespace-nowrap">
                    {task.employee.first_name[0]}. {task.employee.last_name}
                  </span>
                )}
                <span className="text-xs font-mono text-primary-400">{task.key}</span>
                <span className="text-sm text-theme-text truncate flex-1">{task.summary}</span>
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}
                >
                  {task.status}
                </span>
                {task.priority && (
                  <span className={`text-xs whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                )}
                {task.time_off_impact && <TimeOffIndicator impact={task.time_off_impact} compact />}
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

      {compact && filteredTasks.length > 0 && settings?.jira_site_url && (
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
