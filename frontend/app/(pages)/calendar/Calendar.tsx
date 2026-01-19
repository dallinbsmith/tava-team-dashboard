"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarEvent, CalendarEventType, JiraIssue } from "@/shared/types";
import { getCalendarEvents, getJiraEpics } from "@/lib/api";
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
} from "lucide-react";

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
  compact?: boolean;
}

export default function Calendar({
  onCreateTask,
  onCreateEvent,
  onCreateMeeting,
  onRequestTimeOff,
  onCreateTimeOffForEmployee,
  onEventClick,
  compact = false
}: CalendarProps) {
  const [events, setEvents] = useState<CalendarComponentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

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

      // Fetch calendar events and epics in parallel
      const [calendarEvents, epics] = await Promise.all([
        getCalendarEvents(start, end),
        getJiraEpics().catch((err) => {
          // Log error but don't fail - epics are optional
          console.warn("Failed to fetch Jira epics:", err.message || err);
          return [] as JiraIssue[];
        }),
      ]);

      // Convert epics to calendar events and filter by date range
      const epicEvents = epics
        .map(epicToCalendarEvent)
        .filter((event): event is CalendarEvent => {
          if (!event) return false;
          const eventStart = new Date(event.start);
          const eventEnd = event.end ? new Date(event.end) : eventStart;
          return eventEnd >= start && eventStart <= end;
        });

      // Combine all events
      const allEvents = [...calendarEvents, ...epicEvents];

      const mapped = allEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : new Date(event.start),
        allDay: event.all_day,
        resource: event,
      }));

      setEvents(mapped);
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      setError("Failed to load calendar events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

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
    if (onEventClick) {
      onEventClick(event.resource);
    }
  }, [onEventClick]);

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
        borderLeft: `3px solid ${borderColor}`,
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        borderRadius: "4px",
        color: "white",
        fontSize: compact ? "11px" : "12px",
        padding: compact ? "2px 6px" : "4px 8px",
        fontWeight: 500,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
      },
    };
  }, [compact]);

  const CustomToolbar = useCallback(({ label }: { label: string }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-theme-border">
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleNavigate(new Date())}
          className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-elevated transition-colors"
        >
          Today
        </button>
        <div className="flex items-center bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
          <button
            onClick={() => handleNavigate(view === "month" ? subMonths(date, 1) : new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleNavigate(view === "month" ? addMonths(date, 1) : new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors border-l border-theme-border"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-theme-text">{label}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => fetchEvents(true)}
          disabled={refreshing}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <div className="flex bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
          <button
            onClick={() => handleViewChange("month")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${view === "month"
                ? "bg-primary-600 text-white"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
          >
            Month
          </button>
          <button
            onClick={() => handleViewChange("week")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-theme-border ${view === "week"
                ? "bg-primary-600 text-white"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add
              <ChevronDown className={`w-4 h-4 transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
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
  ), [view, date, refreshing, addMenuOpen, hasAnyAction, onCreateTask, onCreateEvent, onCreateMeeting, onRequestTimeOff, onCreateTimeOffForEmployee, handleAction, handleNavigate, handleViewChange, fetchEvents]);

  const components = useMemo(() => ({
    toolbar: CustomToolbar,
  }), [CustomToolbar]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme-border rounded-xl p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-lg">
      {error && (
        <div className="px-6 py-4 bg-red-900/30 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className={`p-6 ${compact ? "h-[450px]" : "h-[750px]"}`}>
        <style jsx global>{`
          /* Dark theme for react-big-calendar */
          .rbc-calendar {
            font-family: inherit;
          }

          .rbc-header {
            padding: 12px 8px;
            font-weight: 600;
            font-size: 0.75rem;
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
            border-radius: 12px;
            overflow: hidden;
          }

          .rbc-month-row {
            border-bottom: 1px solid rgb(var(--border-base)) !important;
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
            padding: 8px;
            text-align: right;
            font-size: 0.875rem;
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
            padding: 2px 4px;
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
            font-size: 0.75rem;
            padding: 4px 8px;
            background: transparent;
          }

          .rbc-show-more:hover {
            background: rgb(var(--bg-elevated));
            border-radius: 4px;
          }

          /* Time view styles */
          .rbc-time-view {
            background: rgb(var(--bg-surface));
            border: 1px solid rgb(var(--border-base)) !important;
            border-radius: 12px;
            overflow: hidden;
          }

          .rbc-time-header {
            background: rgb(var(--bg-elevated));
          }

          .rbc-time-header-content {
            border-left: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-time-content {
            border-top: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-time-content > * + * > * {
            border-left: 1px solid rgb(var(--border-base)) !important;
          }

          .rbc-timeslot-group {
            border-bottom: 1px solid rgb(var(--border-muted)) !important;
          }

          .rbc-time-slot {
            color: rgb(var(--text-muted));
            font-size: 0.75rem;
          }

          .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid rgb(var(--border-muted)) !important;
          }

          .rbc-current-time-indicator {
            background-color: rgb(var(--color-primary-500));
            height: 2px;
          }

          .rbc-allday-cell {
            background: rgb(var(--bg-elevated));
          }

          .rbc-time-gutter {
            background: rgb(var(--bg-elevated));
          }

          .rbc-label {
            color: rgb(var(--text-muted));
            font-size: 0.75rem;
            padding: 4px 8px;
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
          events={events}
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
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="text-theme-text-muted font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#6366f1] shadow-sm"></span>
            <span className="text-theme-text-muted">Epic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#0052cc] shadow-sm"></span>
            <span className="text-theme-text-muted">Jira</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#059669] shadow-sm"></span>
            <span className="text-theme-text-muted">Task</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#7c3aed] shadow-sm"></span>
            <span className="text-theme-text-muted">Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#d97706] shadow-sm"></span>
            <span className="text-theme-text-muted">Time Off</span>
          </div>
        </div>
      </div>
    </div>
  );
}
