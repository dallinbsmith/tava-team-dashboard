"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarEvent, CalendarEventType } from "../types";
import { JiraIssue } from "@/app/(pages)/jira/types";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS } from "../../time-off/types";
import { getCalendarEventsWithMetadata } from "../api";
import { getJiraEpics } from "@/app/(pages)/jira/api";
import { getTeamTimeOff } from "../../time-off/api";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckSquare,
  Users,
  Palmtree,
  UserPlus,
  UsersRound,
} from "lucide-react";

// Convert team time off request to CalendarEvent format
function timeOffToCalendarEvent(timeOff: TimeOffRequest): CalendarEvent {
  const userName = timeOff.user
    ? `${timeOff.user.first_name} ${timeOff.user.last_name}`.trim()
    : "Unknown";
  const typeLabel = TIME_OFF_TYPE_LABELS[timeOff.request_type] || timeOff.request_type;

  return {
    id: `team-time-off-${timeOff.id}`,
    type: "time_off",
    title: typeLabel,
    start: timeOff.start_date,
    end: timeOff.end_date,
    all_day: true,
    time_off_request: timeOff,
  };
}

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Convert Jira epics to CalendarEvent format
function epicToCalendarEvent(epic: JiraIssue): CalendarEvent | null {
  // Only include epics that have at least a start_date or due_date
  if (!epic.start_date && !epic.due_date) {
    return null;
  }

  return {
    id: `epic-${epic.id}`,
    type: "epic",
    title: `${epic.key}: ${epic.summary}`,
    start: epic.start_date || epic.due_date!,
    end: epic.due_date || epic.start_date,
    all_day: true,
    url: epic.url,
    jira_issue: epic,
  };
}

interface CalendarComponentEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEvent;
}

interface CalendarProps {
  onCreateTask?: () => void;
  onCreateEvent?: () => void;
  onCreateMeeting?: () => void;
  onRequestTimeOff?: () => void;
  onCreateTimeOffForEmployee?: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  onViewTask?: (taskId: number) => void;
  onViewMeeting?: (meetingId: number) => void;
  onViewTimeOff?: (timeOffId: number) => void;
  compact?: boolean;
}

export default function Calendar({
  onCreateTask,
  onCreateEvent,
  onCreateMeeting,
  onRequestTimeOff,
  onCreateTimeOffForEmployee,
  onEventClick,
  onViewTask,
  onViewMeeting,
  onViewTimeOff,
  compact = false
}: CalendarProps) {
  const { effectiveIsSupervisorOrAdmin } = useCurrentUser();
  const [events, setEvents] = useState<CalendarComponentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showTeamTimeOff, setShowTeamTimeOff] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<CalendarEventType>>(
    new Set(["epic", "jira", "task", "meeting", "time_off"])
  );
  const addMenuRef = useRef<HTMLDivElement>(null);

  const toggleEventType = useCallback((type: CalendarEventType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action: (() => void) | undefined) => {
    if (action) {
      action();
      setAddMenuOpen(false);
    }
  };

  const hasAnyAction = onCreateTask || onCreateEvent || onCreateMeeting || onRequestTimeOff || onCreateTimeOffForEmployee;

  const fetchEvents = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const start = startOfMonth(subMonths(date, 1));
      const end = endOfMonth(addMonths(date, 1));

      // First fetch calendar events with metadata to check Jira connection status
      const calendarData = await getCalendarEventsWithMetadata(start, end);
      const calendarEvents = calendarData.events || [];
      const isJiraConnected = calendarData.jira_connected;

      // Only fetch epics if Jira is connected, and team time off if enabled
      const [epics, teamTimeOff] = await Promise.all([
        isJiraConnected
          ? getJiraEpics().catch(() => [] as JiraIssue[])
          : Promise.resolve([] as JiraIssue[]),
        showTeamTimeOff
          ? getTeamTimeOff().catch(() => [] as TimeOffRequest[])
          : Promise.resolve([] as TimeOffRequest[]),
      ]);

      // Convert epics to calendar events and filter by date range
      const epicEvents = (epics || [])
        .map(epicToCalendarEvent)
        .filter((event): event is CalendarEvent => {
          if (!event) return false;
          const eventStart = new Date(event.start);
          const eventEnd = event.end ? new Date(event.end) : eventStart;
          return eventEnd >= start && eventStart <= end;
        });

      // Convert team time off to calendar events and filter by date range
      const teamTimeOffEvents = (teamTimeOff || [])
        .filter((timeOff) => timeOff.status === "approved") // Only show approved time off
        .map(timeOffToCalendarEvent)
        .filter((event) => {
          const eventStart = new Date(event.start);
          const eventEnd = event.end ? new Date(event.end) : eventStart;
          return eventEnd >= start && eventStart <= end;
        });

      // Combine all events (dedupe team time off that might already be in calendar events)
      const existingTimeOffIds = new Set(
        (calendarEvents || [])
          .filter((e) => e.type === "time_off" && e.time_off_request)
          .map((e) => e.time_off_request!.id)
      );
      const uniqueTeamTimeOffEvents = teamTimeOffEvents.filter(
        (e) => !existingTimeOffIds.has(e.time_off_request!.id)
      );

      const allEvents = [...(calendarEvents || []), ...epicEvents, ...uniqueTeamTimeOffEvents];

      const mapped = allEvents.map((event) => {
        // For time_off events, include the employee name in the title
        let title = event.title;
        if (event.type === "time_off" && event.time_off_request?.user) {
          const user = event.time_off_request.user;
          const name = `${user.first_name} ${user.last_name}`.trim();
          if (name) {
            title = `${name}: ${title}`;
          }
        }

        return {
          id: event.id,
          title,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : new Date(event.start),
          allDay: event.all_day,
          resource: event,
        };
      });

      setEvents(mapped);
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      setError("Failed to load calendar events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, showTeamTimeOff]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarComponentEvent) => {
    const resource = event.resource;

    // Handle internal events (task, meeting, time_off) with view modals
    if (resource.type === "task" && resource.task && onViewTask) {
      onViewTask(resource.task.id);
      return;
    }
    if (resource.type === "meeting" && resource.meeting && onViewMeeting) {
      onViewMeeting(resource.meeting.id);
      return;
    }
    if (resource.type === "time_off" && resource.time_off_request && onViewTimeOff) {
      onViewTimeOff(resource.time_off_request.id);
      return;
    }

    // For external events (jira, epic) or if no specific handler, open URL or use generic handler
    if (resource.url) {
      window.open(resource.url, "_blank");
      return;
    }

    // Fallback to generic event click handler
    if (onEventClick) {
      onEventClick(resource);
    }
  }, [onEventClick, onViewTask, onViewMeeting, onViewTimeOff]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (onCreateTask) {
      onCreateTask();
    }
  }, [onCreateTask]);

  const eventStyleGetter = useCallback((event: CalendarComponentEvent) => {
    const type = event.resource.type as CalendarEventType;
    let backgroundColor = "#3b82f6";
    let borderColor = "#60a5fa";

    switch (type) {
      case "jira":
        backgroundColor = "#0052cc";
        borderColor = "#2684ff";
        break;
      case "epic":
        backgroundColor = "#6366f1";
        borderColor = "#818cf8";
        break;
      case "task":
        backgroundColor = "#059669";
        borderColor = "#34d399";
        break;
      case "meeting":
        backgroundColor = "#7c3aed";
        borderColor = "#a78bfa";
        break;
      case "time_off":
        backgroundColor = "#d97706";
        borderColor = "#fbbf24";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderLeft: `2px solid ${borderColor}`,
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        borderRadius: "3px",
        color: "white",
        fontSize: compact ? "10px" : "11px",
        padding: compact ? "1px 4px" : "2px 6px",
        fontWeight: 500,
        lineHeight: "1.3",
      },
    };
  }, [compact]);

  const CustomToolbar = useCallback(({ label }: { label: string }) => (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-theme-border">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleNavigate(view === "month" ? subMonths(date, 1) : new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000))}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleNavigate(new Date())}
          className="px-3 py-1.5 text-sm font-medium text-theme-text hover:bg-theme-elevated rounded-lg transition-colors min-w-[140px] text-center"
        >
          {label}
        </button>
        <button
          onClick={() => handleNavigate(view === "month" ? addMonths(date, 1) : new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000))}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => fetchEvents(true)}
          disabled={refreshing}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors disabled:opacity-50 ml-1"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {effectiveIsSupervisorOrAdmin && (
          <div className="flex bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTeamTimeOff(false)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                !showTeamTimeOff
                  ? "bg-theme-elevated text-theme-text"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setShowTeamTimeOff(true)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-theme-border ${
                showTeamTimeOff
                  ? "bg-theme-elevated text-theme-text"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
            >
              Team
            </button>
          </div>
        )}
        <div className="flex bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
          <button
            onClick={() => handleViewChange("month")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "month"
                ? "bg-theme-elevated text-theme-text"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
          >
            Month
          </button>
          <button
            onClick={() => handleViewChange("week")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-theme-border ${view === "week"
                ? "bg-theme-elevated text-theme-text"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
          >
            Week
          </button>
        </div>
        {hasAnyAction && (
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-theme-surface border border-theme-border rounded-lg shadow-lg z-50 overflow-hidden">
                {onCreateTask && (
                  <button
                    onClick={() => handleAction(onCreateTask)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 text-green-400" />
                    Task
                  </button>
                )}
                {onCreateEvent && (
                  <button
                    onClick={() => handleAction(onCreateEvent)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-400" />
                    Event
                  </button>
                )}
                {onCreateMeeting && (
                  <button
                    onClick={() => handleAction(onCreateMeeting)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    Meeting
                  </button>
                )}
                {onRequestTimeOff && (
                  <button
                    onClick={() => handleAction(onRequestTimeOff)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <Palmtree className="w-4 h-4 text-amber-400" />
                    Request Time Off
                  </button>
                )}
                {onCreateTimeOffForEmployee && (
                  <button
                    onClick={() => handleAction(onCreateTimeOffForEmployee)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    Time Off for Employee
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ), [view, date, refreshing, addMenuOpen, hasAnyAction, onCreateTask, onCreateEvent, onCreateMeeting, onRequestTimeOff, onCreateTimeOffForEmployee, handleAction, handleNavigate, handleViewChange, fetchEvents, effectiveIsSupervisorOrAdmin, showTeamTimeOff]);

  const components = useMemo(() => ({
    toolbar: CustomToolbar,
  }), [CustomToolbar]);

  // Filter events based on visible types
  const filteredEvents = useMemo(() => {
    return events.filter((event) => visibleTypes.has(event.resource.type as CalendarEventType));
  }, [events, visibleTypes]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme-border p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden shadow-lg">
      {error && (
        <div className="px-6 py-4 bg-red-900/30 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className={`p-6 ${compact ? "h-[450px]" : "h-[800px]"}`}>
        <style jsx global>{`
          /* Dark theme for react-big-calendar */
          .rbc-calendar {
            font-family: inherit;
          }

          .rbc-header {
            padding: 8px 4px;
            font-weight: 600;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgb(var(--text-muted));
            background: rgb(var(--bg-elevated));
            border-bottom: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-header + .rbc-header {
            border-left: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-month-view {
            background: rgb(var(--bg-surface));
            border: 1px solid rgb(var(--border-base)) !important;
            overflow: hidden;
          }

          .rbc-month-row {
            border-bottom: 1px solid rgb(var(--border-base)) !important;
            min-height: 100px;
          }

          .rbc-month-row:last-child {
            border-bottom: none !important;
          }

          .rbc-day-bg {
            background: rgb(var(--bg-surface));
            transition: background-color 0.15s;
          }

          .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-day-bg:hover {
            background: rgb(var(--bg-elevated));
          }

          .rbc-off-range-bg {
            background: rgb(var(--bg-muted)) !important;
          }

          .rbc-today {
            background: rgba(var(--color-primary-500), 0.1) !important;
          }

          .rbc-date-cell {
            padding: 4px 6px;
            text-align: right;
            font-size: 0.75rem;
            color: rgb(var(--text-base));
          }

          .rbc-date-cell.rbc-off-range {
            color: rgb(var(--text-subtle));
          }

          .rbc-date-cell.rbc-now {
            font-weight: 700;
            color: rgb(var(--color-primary-400));
          }

          .rbc-date-cell > a {
            color: inherit;
          }

          .rbc-row-segment {
            padding: 1px 2px;
          }

          .rbc-row-content {
            z-index: 4;
          }

          .rbc-event {
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
          }

          .rbc-event:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important;
          }

          .rbc-event:focus {
            outline: 2px solid rgb(var(--color-primary-400));
            outline-offset: 2px;
          }

          .rbc-event-content {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .rbc-show-more {
            color: rgb(var(--color-primary-400));
            font-weight: 600;
            font-size: 0.65rem;
            padding: 2px 4px;
            background: transparent;
          }

          .rbc-show-more:hover {
            background: rgb(var(--bg-elevated));
            border-radius: 3px;
          }

          /* Time view styles */
          .rbc-time-view {
            background: rgb(var(--bg-surface));
            border: 1px solid rgb(var(--border-base)) !important;
            overflow: hidden;
          }

          .rbc-time-header {
            background: rgb(var(--bg-elevated));
            border-bottom: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-time-header-content {
            border-left: none !important;
          }

          .rbc-time-header-cell {
            border-left: none !important;
          }

          .rbc-header.rbc-today {
            background: rgba(var(--color-primary-500), 0.1);
          }

          .rbc-time-content {
            border-top: none !important;
          }

          /* Column separators between days */
          .rbc-time-content > * + * > * {
            border-left: 1px solid rgb(var(--border-muted)) !important;
          }

          /* Hour group borders - more visible */
          .rbc-timeslot-group {
            border-bottom: 1px solid rgb(var(--border-muted)) !important;
            min-height: 60px;
          }

          .rbc-time-slot {
            color: rgb(var(--text-muted));
            font-size: 0.75rem;
          }

          /* Remove the half-hour slot borders for cleaner look */
          .rbc-day-slot .rbc-time-slot {
            border-top: none !important;
          }

          /* Only show subtle line at half-hour marks */
          .rbc-day-slot .rbc-timeslot-group .rbc-time-slot:nth-child(2) {
            border-top: 1px dashed rgba(var(--border-muted), 0.3) !important;
          }

          .rbc-current-time-indicator {
            background-color: rgb(var(--color-primary-500));
            height: 2px;
            z-index: 3;
          }

          .rbc-allday-cell {
            background: rgb(var(--bg-elevated));
            border-bottom: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-time-gutter {
            background: rgb(var(--bg-surface));
            border-right: 1px solid rgb(var(--border-muted)) !important;
          }

          .rbc-time-gutter .rbc-timeslot-group {
            border-bottom: none !important;
          }

          .rbc-label {
            color: rgb(var(--text-subtle));
            font-size: 0.7rem;
            padding: 2px 8px;
            font-weight: 500;
          }

          .rbc-day-slot {
            background: rgb(var(--bg-surface));
          }

          .rbc-day-slot.rbc-today {
            background: rgba(var(--color-primary-500), 0.03);
          }

          /* Popup overlay */
          .rbc-overlay {
            background: rgb(var(--bg-elevated)) !important;
            border: 1px solid rgb(var(--border-base)) !important;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            padding: 8px;
            max-height: 300px;
            overflow-y: auto;
          }

          .rbc-overlay-header {
            color: rgb(var(--text-base));
            font-weight: 600;
            border-bottom: 1px solid rgb(var(--border-base)) !important;
            padding: 8px;
            margin: -8px -8px 8px;
            background: rgb(var(--bg-muted));
            border-radius: 8px 8px 0 0;
          }

          /* Selected state */
          .rbc-selected {
            background-color: rgb(var(--color-primary-500)) !important;
          }

          .rbc-slot-selection {
            background: rgba(var(--color-primary-500), 0.2);
            border: 1px solid rgb(var(--color-primary-400));
            border-radius: 4px;
          }
        `}</style>

        <BigCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          components={components}
          views={["month", "week"]}
          popup
          style={{ height: "100%" }}
        />
      </div>

      <div className="px-6 py-4 bg-theme-elevated border-t border-theme-border">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-theme-text-muted font-medium">Filter:</span>
          <button
            onClick={() => toggleEventType("epic")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              visibleTypes.has("epic")
                ? "bg-[#6366f1]/20 border border-[#6366f1]/50 text-theme-text"
                : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
            }`}
            title={visibleTypes.has("epic") ? "Hide epics" : "Show epics"}
          >
            <span className={`w-3 h-3 rounded shadow-sm ${visibleTypes.has("epic") ? "bg-[#6366f1]" : "bg-[#6366f1]/40"}`}></span>
            <span>Epic</span>
          </button>
          <button
            onClick={() => toggleEventType("jira")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              visibleTypes.has("jira")
                ? "bg-[#0052cc]/20 border border-[#0052cc]/50 text-theme-text"
                : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
            }`}
            title={visibleTypes.has("jira") ? "Hide Jira tasks" : "Show Jira tasks"}
          >
            <span className={`w-3 h-3 rounded shadow-sm ${visibleTypes.has("jira") ? "bg-[#0052cc]" : "bg-[#0052cc]/40"}`}></span>
            <span>Jira</span>
          </button>
          <button
            onClick={() => toggleEventType("task")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              visibleTypes.has("task")
                ? "bg-[#059669]/20 border border-[#059669]/50 text-theme-text"
                : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
            }`}
            title={visibleTypes.has("task") ? "Hide tasks" : "Show tasks"}
          >
            <span className={`w-3 h-3 rounded shadow-sm ${visibleTypes.has("task") ? "bg-[#059669]" : "bg-[#059669]/40"}`}></span>
            <span>Task</span>
          </button>
          <button
            onClick={() => toggleEventType("meeting")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              visibleTypes.has("meeting")
                ? "bg-[#7c3aed]/20 border border-[#7c3aed]/50 text-theme-text"
                : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
            }`}
            title={visibleTypes.has("meeting") ? "Hide meetings" : "Show meetings"}
          >
            <span className={`w-3 h-3 rounded shadow-sm ${visibleTypes.has("meeting") ? "bg-[#7c3aed]" : "bg-[#7c3aed]/40"}`}></span>
            <span>Meeting</span>
          </button>
          <button
            onClick={() => toggleEventType("time_off")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              visibleTypes.has("time_off")
                ? "bg-[#d97706]/20 border border-[#d97706]/50 text-theme-text"
                : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
            }`}
            title={visibleTypes.has("time_off") ? "Hide time off" : "Show time off"}
          >
            <span className={`w-3 h-3 rounded shadow-sm ${visibleTypes.has("time_off") ? "bg-[#d97706]" : "bg-[#d97706]/40"}`}></span>
            <span>Time Off</span>
          </button>
        </div>
      </div>
    </div>
  );
}
