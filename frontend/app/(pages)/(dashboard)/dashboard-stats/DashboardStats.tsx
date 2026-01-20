"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UsersRound,
  CheckSquare,
  CalendarDays,
  Clock,
  Check,
  X,
} from "lucide-react";
import { User } from "@/shared/types/user";
import Pagination from "@/shared/common/Pagination";
import Avatar from "@/shared/common/Avatar";
import { getDepartmentBgColor } from "@/lib/department-colors";
import { getMyJiraTasks } from "@/app/(pages)/jira/api";
import { getCalendarEvents } from "@/app/(pages)/(dashboard)/calendar/api";
import { getPendingTimeOffRequests, reviewTimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/api";
import { JiraIssue } from "@/app/(pages)/jira/types";
import { CalendarEvent } from "@/app/(pages)/(dashboard)/calendar/types";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS } from "@/app/(pages)/(dashboard)/time-off/types";
import { format, differenceInDays } from "date-fns";
import { PAGINATION, JIRA_LIMITS } from "@/lib/constants";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

interface DashboardStatsProps {
  employees: User[];
}

interface DepartmentSegment {
  department: string;
  count: number;
  color: string;
  percentage: number;
}

interface SquadStat {
  id: number;
  name: string;
  count: number;
  segments: DepartmentSegment[];
}

export default function DashboardStats({ employees }: DashboardStatsProps) {
  const [animate, setAnimate] = useState(false);
  const [hoveredSquad, setHoveredSquad] = useState<string | null>(null);
  const [squadPage, setSquadPage] = useState(1);
  const [tasksDueThisWeek, setTasksDueThisWeek] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [pendingTimeOff, setPendingTimeOff] = useState<TimeOffRequest[]>([]);
  const [timeOffPage, setTimeOffPage] = useState(1);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch tasks due this week, upcoming events, and pending time off
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Calculate this week's date range
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        // Fetch Jira tasks
        const tasks = await getMyJiraTasks(JIRA_LIMITS.TASKS_DEFAULT);
        const tasksDue = tasks.filter((task: JiraIssue) => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= startOfWeek && dueDate <= endOfWeek;
        });
        setTasksDueThisWeek(tasksDue.length);

        // Fetch upcoming events (next 30 days)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const events = await getCalendarEvents(now, endDate);
        // Count meetings and events (excluding tasks and time_off)
        const upcomingCount = events.filter(
          (event: CalendarEvent) => event.type === "meeting"
        ).length;
        setUpcomingEvents(upcomingCount);

        // Fetch pending time off requests
        const timeOffRequests = await getPendingTimeOffRequests();
        setPendingTimeOff(timeOffRequests);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        setFetchError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data. Please try refreshing the page."
        );
      }
    };

    fetchStats();
  }, []);

  // Calculate unique squads count (excluding "Unassigned")
  const uniqueSquads = new Set<string>();
  employees.forEach((emp) => {
    emp.squads?.forEach((squad) => uniqueSquads.add(squad.name));
  });
  const squadCount = uniqueSquads.size;

  // Calculate squad breakdown with department color
  const squadData = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unknown";
    const squadList = emp.squads?.length > 0 ? emp.squads : [{ id: 0, name: "Unassigned" }];

    for (const squad of squadList) {
      const squadName = squad.name;
      if (!acc[squadName]) {
        acc[squadName] = { id: squad.id, count: 0, departments: {} };
      }
      acc[squadName].count++;
      acc[squadName].departments[dept] = (acc[squadName].departments[dept] || 0) + 1;
    }

    return acc;
  }, {} as Record<string, { id: number; count: number; departments: Record<string, number> }>);

  const squadStats: SquadStat[] = Object.entries(squadData)
    .map(([name, data]) => {
      const segments: DepartmentSegment[] = Object.entries(data.departments)
        .map(([dept, count]) => ({
          department: dept,
          count,
          color: getDepartmentBgColor(dept),
          percentage: (count / data.count) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        id: data.id,
        name,
        count: data.count,
        segments,
      };
    })
    .sort((a, b) => b.count - a.count);

  const maxSquadCount = Math.max(...squadStats.map((s) => s.count), 1);

  // Time off handlers
  const toggleRequestSelection = (id: number) => {
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllRequests = () => {
    if (selectedRequests.size === pendingTimeOff.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingTimeOff.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (action: "approved" | "rejected") => {
    if (selectedRequests.size === 0) return;

    setProcessingIds(new Set(selectedRequests));
    setActionError(null); // Clear previous errors

    try {
      await Promise.all(
        Array.from(selectedRequests).map((id) =>
          reviewTimeOffRequest(id, { status: action })
        )
      );

      // Remove processed requests from the list
      setPendingTimeOff((prev) =>
        prev.filter((r) => !selectedRequests.has(r.id))
      );
      setSelectedRequests(new Set());
    } catch (error) {
      console.error("Failed to process time off requests:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to process time off requests. Please try again."
      );
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleSingleAction = async (id: number, action: "approved" | "rejected") => {
    setProcessingIds(new Set([id]));
    setActionError(null); // Clear previous errors

    try {
      await reviewTimeOffRequest(id, { status: action });
      setPendingTimeOff((prev) => prev.filter((r) => r.id !== id));
      setSelectedRequests((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Failed to process time off request:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to process time off request. Please try again."
      );
    } finally {
      setProcessingIds(new Set());
    }
  };

  const totalTimeOffPages = Math.ceil(pendingTimeOff.length / PAGINATION.TIME_OFF);
  const startTimeOffIndex = (timeOffPage - 1) * PAGINATION.TIME_OFF;
  const paginatedTimeOff = pendingTimeOff.slice(
    startTimeOffIndex,
    startTimeOffIndex + PAGINATION.TIME_OFF
  );

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {fetchError && (
        <ErrorAlert
          variant="error"
          title="Failed to load data"
          dismissible
          onDismiss={() => setFetchError(null)}
        >
          {fetchError}
        </ErrorAlert>
      )}

      {actionError && (
        <ErrorAlert
          variant="error"
          title="Action failed"
          dismissible
          onDismiss={() => setActionError(null)}
        >
          {actionError}
        </ErrorAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      {/* Squad Breakdown - Left Column */}
      <div
        className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        style={{ transitionDelay: "400ms" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <UsersRound className="w-5 h-5 text-theme-text-muted" />
          <h3 className="font-semibold text-theme-text">Squad Breakdown</h3>
        </div>

        {(() => {
          const totalSquadPages = Math.ceil(squadStats.length / PAGINATION.SQUADS);
          const startIndex = (squadPage - 1) * PAGINATION.SQUADS;
          const paginatedSquads = squadStats.slice(startIndex, startIndex + PAGINATION.SQUADS);

          return (
            <>
              <div className="space-y-3">
                {paginatedSquads.map((squad, index) => {
                  const SquadContent = (
                    <div
                      className="group cursor-pointer"
                      onMouseEnter={() => setHoveredSquad(squad.name)}
                      onMouseLeave={() => setHoveredSquad(null)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm transition-colors ${hoveredSquad === squad.name
                                ? "text-theme-text font-medium"
                                : "text-theme-text-muted"
                              }`}
                          >
                            {squad.name}
                          </span>
                          {hoveredSquad === squad.name && squad.segments.length > 1 && (
                            <span className="text-xs text-theme-text-subtle">
                              {squad.segments.map(s => s.department).join(", ")}
                            </span>
                          )}
                          {hoveredSquad !== squad.name && (
                            <span className="text-xs text-theme-text-subtle">
                              {squad.segments[0]?.department}
                              {squad.segments.length > 1 && ` +${squad.segments.length - 1}`}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-theme-text-muted font-medium">
                          {squad.count}
                        </span>
                      </div>
                      <div className="h-2 bg-theme-muted overflow-hidden">
                        <div
                          className={`h-full flex transition-all duration-700 ease-out ${hoveredSquad === squad.name ? "opacity-100" : "opacity-80"
                            }`}
                          style={{
                            width: animate
                              ? `${(squad.count / maxSquadCount) * 100}%`
                              : "0%",
                            transitionDelay: `${500 + index * 100}ms`,
                          }}
                        >
                          {squad.segments.map((segment) => (
                            <div
                              key={segment.department}
                              className={`h-full ${segment.color}`}
                              style={{
                                width: `${segment.percentage}%`,
                              }}
                              title={`${segment.department}: ${segment.count}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );

                  if (squad.id === 0) {
                    return <div key={squad.name}>{SquadContent}</div>;
                  }

                  return (
                    <Link
                      key={squad.name}
                      href={`/teams?type=squad&id=${squad.id}`}
                      className="block"
                    >
                      {SquadContent}
                    </Link>
                  );
                })}
              </div>
              <Pagination
                currentPage={squadPage}
                totalPages={totalSquadPages}
                onPageChange={setSquadPage}
              />
            </>
          );
        })()}
      </div>

      {/* Right Column - Time Off + Stats */}
      <div className="space-y-6">
        {/* Time Off Requests */}
        <div
          className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          style={{ transitionDelay: "0ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-theme-text-muted" />
              <h3 className="font-semibold text-theme-text">Pending Time Off</h3>
              {pendingTimeOff.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-900/50 text-yellow-300">
                  {pendingTimeOff.length}
                </span>
              )}
            </div>

            {pendingTimeOff.length > 0 && (
              <div className="flex items-center gap-2" role="group" aria-label="Bulk actions">
                <button
                  onClick={toggleAllRequests}
                  className="text-xs text-theme-text-muted hover:text-theme-text transition-colors"
                  aria-label={selectedRequests.size === pendingTimeOff.length
                    ? "Deselect all time off requests"
                    : "Select all time off requests"}
                >
                  {selectedRequests.size === pendingTimeOff.length ? "Deselect All" : "Select All"}
                </button>
                {selectedRequests.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkAction("approved")}
                      disabled={processingIds.size > 0}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      aria-label={`Approve ${selectedRequests.size} selected time off request${selectedRequests.size !== 1 ? 's' : ''}`}
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      Approve ({selectedRequests.size})
                    </button>
                    <button
                      onClick={() => handleBulkAction("rejected")}
                      disabled={processingIds.size > 0}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      aria-label={`Reject ${selectedRequests.size} selected time off request${selectedRequests.size !== 1 ? 's' : ''}`}
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                      Reject ({selectedRequests.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {pendingTimeOff.length === 0 ? (
            <div className="text-center py-6 text-theme-text-muted">
              <Clock className="w-10 h-10 mx-auto mb-3 text-theme-text-subtle" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            <>
              <div className="space-y-2" role="list" aria-label="Pending time off requests">
                {paginatedTimeOff.map((request) => {
                  const isSelected = selectedRequests.has(request.id);
                  const isProcessing = processingIds.has(request.id);
                  const days = differenceInDays(
                    new Date(request.end_date),
                    new Date(request.start_date)
                  ) + 1;
                  const userName = request.user
                    ? `${request.user.first_name} ${request.user.last_name}`
                    : "Unknown User";

                  return (
                    <div
                      key={request.id}
                      role="listitem"
                      className={`flex items-center gap-3 p-2 border transition-colors ${
                        isSelected
                          ? "border-primary-500 bg-primary-900/20"
                          : "border-theme-border hover:border-theme-border-hover"
                      } ${isProcessing ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRequestSelection(request.id)}
                        disabled={isProcessing}
                        className="w-4 h-4 rounded border-theme-border text-primary-500 focus:ring-primary-500"
                        aria-label={`Select time off request from ${userName}`}
                      />

                      {request.user && (
                        <Avatar
                          s3AvatarUrl={request.user.avatar_url}
                          firstName={request.user.first_name}
                          lastName={request.user.last_name}
                          size="sm"
                          className="rounded-full flex-shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-theme-text truncate">
                            {userName}
                          </span>
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted">
                            {TIME_OFF_TYPE_LABELS[request.request_type]}
                          </span>
                        </div>
                        <div className="text-xs text-theme-text-muted">
                          {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d")}
                          <span className="ml-1 text-theme-text-subtle">({days}d)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSingleAction(request.id, "approved")}
                          disabled={isProcessing}
                          className="p-1 text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSingleAction(request.id, "rejected")}
                          disabled={isProcessing}
                          className="p-1 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border">
                <Link
                  href="/time-off"
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  View all →
                </Link>
                {totalTimeOffPages > 1 && (
                  <Pagination
                    currentPage={timeOffPage}
                    totalPages={totalTimeOffPages}
                    onPageChange={setTimeOffPage}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Consolidated Stats Cards Row */}
        <div className="grid gap-6 grid-cols-2">
          {/* Team Members & Squads Card */}
          <div
            className={`bg-theme-surface border border-theme-border p-4 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/30">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">Team Members</p>
                <p className="text-lg font-bold text-theme-text">
                  <AnimatedNumber value={employees.length} animate={animate} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-theme-border">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                <UsersRound className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">Squads</p>
                <p className="text-lg font-bold text-theme-text">
                  <AnimatedNumber value={squadCount} animate={animate} />
                </p>
              </div>
            </div>
          </div>

          {/* Tasks & Events Card */}
          <div
            className={`bg-theme-surface border border-theme-border p-4 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
                <CheckSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">Tasks This Week</p>
                <p className="text-lg font-bold text-theme-text">
                  <AnimatedNumber value={tasksDueThisWeek} animate={animate} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-theme-border">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
                <CalendarDays className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">Upcoming Events</p>
                <p className="text-lg font-bold text-theme-text">
                  <AnimatedNumber value={upcomingEvents} animate={animate} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Animated number component
function AnimatedNumber({
  value,
  animate,
}: {
  value: number;
  animate: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(0);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  return <>{displayValue}</>;
}
