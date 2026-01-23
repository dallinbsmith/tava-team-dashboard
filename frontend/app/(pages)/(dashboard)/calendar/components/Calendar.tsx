"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";
import { CalendarEvent, CalendarEventType } from "../types";
import { JiraIssue } from "@/app/(pages)/jira/types";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS } from "../../time-off/types";
import { getCalendarEventsWithMetadata } from "../actions";
import { getJiraEpics } from "@/app/(pages)/jira/actions";
import { getTeamTimeOff } from "../../time-off/actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { ErrorAlert } from "@/components";
import { CALENDAR_COLORS } from "@/lib/constants";
import CalendarToolbar from "./CalendarToolbar";
import EventTypeFilterButton from "./EventTypeFilterButton";

// Event type colors configuration (imported from constants)
const EVENT_TYPE_COLORS = CALENDAR_COLORS.EVENT_TYPES;
const PENDING_TIME_OFF_COLOR = CALENDAR_COLORS.PENDING_TIME_OFF;

const timeOffToCalendarEvent = (timeOff: TimeOffRequest): CalendarEvent => {
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
};

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const epicToCalendarEvent = (epic: JiraIssue): CalendarEvent | null => {
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
};

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
  compact = false,
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
  const [showPendingTimeOff, setShowPendingTimeOff] = useState(false);
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

  const handleAction = useCallback((action: (() => void) | undefined) => {
    if (action) {
      action();
      setAddMenuOpen(false);
    }
  }, []);

  const fetchEvents = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const start = startOfMonth(subMonths(date, 1));
        const end = endOfMonth(addMonths(date, 1));

        const calendarData = await getCalendarEventsWithMetadata(start, end);
        const calendarEvents = calendarData.events || [];
        const isJiraConnected = calendarData.jira_connected;

        const [epics, teamTimeOff] = await Promise.all([
          isJiraConnected
            ? getJiraEpics().catch(() => [] as JiraIssue[])
            : Promise.resolve([] as JiraIssue[]),
          showTeamTimeOff
            ? getTeamTimeOff().catch(() => [] as TimeOffRequest[])
            : Promise.resolve([] as TimeOffRequest[]),
        ]);

        const epicEvents = (epics || [])
          .map(epicToCalendarEvent)
          .filter((event): event is CalendarEvent => {
            if (!event) return false;
            const eventStart = new Date(event.start);
            const eventEnd = event.end ? new Date(event.end) : eventStart;
            return eventEnd >= start && eventStart <= end;
          });

        const teamTimeOffEvents = (teamTimeOff || [])
          .filter((timeOff) => {
            if (timeOff.status === "approved") return true;
            if (showPendingTimeOff && timeOff.status === "pending") return true;
            return false;
          })
          .map(timeOffToCalendarEvent)
          .filter((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = event.end ? new Date(event.end) : eventStart;
            return eventEnd >= start && eventStart <= end;
          });

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
    },
    [date, showTeamTimeOff, showPendingTimeOff]
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarComponentEvent) => {
      const resource = event.resource;

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

      if (resource.url) {
        window.open(resource.url, "_blank");
        return;
      }

      if (onEventClick) {
        onEventClick(resource);
      }
    },
    [onEventClick, onViewTask, onViewMeeting, onViewTimeOff]
  );

  const handleSelectSlot = useCallback(() => {
    if (onCreateTask) {
      onCreateTask();
    }
  }, [onCreateTask]);

  const eventStyleGetter = useCallback(
    (event: CalendarComponentEvent) => {
      const type = event.resource.type as CalendarEventType;
      const isPendingTimeOff =
        type === "time_off" && event.resource.time_off_request?.status === "pending";

      const backgroundColor = isPendingTimeOff
        ? PENDING_TIME_OFF_COLOR
        : EVENT_TYPE_COLORS[type] || CALENDAR_COLORS.DEFAULT;

      const hoverColors = CALENDAR_COLORS.EVENT_TYPE_HOVER;
      const borderColor = isPendingTimeOff
        ? EVENT_TYPE_COLORS.time_off
        : hoverColors[type as keyof typeof hoverColors] || CALENDAR_COLORS.DEFAULT;

      return {
        style: {
          backgroundColor,
          borderLeft: `2px ${isPendingTimeOff ? "dashed" : "solid"} ${borderColor}`,
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          borderRadius: "3px",
          color: "white",
          fontSize: compact ? "10px" : "11px",
          padding: compact ? "1px 4px" : "2px 6px",
          fontWeight: 500,
          lineHeight: "1.3",
          opacity: isPendingTimeOff ? 0.8 : 1,
        },
      };
    },
    [compact]
  );

  const CustomToolbar = useCallback(
    ({ label }: { label: string }) => (
      <CalendarToolbar
        label={label}
        view={view}
        date={date}
        refreshing={refreshing}
        addMenuOpen={addMenuOpen}
        addMenuRef={addMenuRef}
        showTeamTimeOff={showTeamTimeOff}
        effectiveIsSupervisorOrAdmin={effectiveIsSupervisorOrAdmin}
        onNavigate={handleNavigate}
        onViewChange={handleViewChange}
        onRefresh={() => fetchEvents(true)}
        onToggleAddMenu={() => setAddMenuOpen(!addMenuOpen)}
        onSetShowTeamTimeOff={setShowTeamTimeOff}
        onCreateTask={onCreateTask}
        onCreateEvent={onCreateEvent}
        onCreateMeeting={onCreateMeeting}
        onRequestTimeOff={onRequestTimeOff}
        onCreateTimeOffForEmployee={onCreateTimeOffForEmployee}
        onAction={handleAction}
      />
    ),
    [
      view,
      date,
      refreshing,
      addMenuOpen,
      showTeamTimeOff,
      effectiveIsSupervisorOrAdmin,
      handleNavigate,
      handleViewChange,
      fetchEvents,
      onCreateTask,
      onCreateEvent,
      onCreateMeeting,
      onRequestTimeOff,
      onCreateTimeOffForEmployee,
      handleAction,
    ]
  );

  const components = useMemo(
    () => ({
      toolbar: CustomToolbar,
    }),
    [CustomToolbar]
  );

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
        <div className="px-6 py-4">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      <div className={`p-6 ${compact ? "h-[450px]" : "h-[800px]"}`}>
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
          <EventTypeFilterButton
            label="Epic"
            color={EVENT_TYPE_COLORS.epic}
            isActive={visibleTypes.has("epic")}
            onClick={() => toggleEventType("epic")}
          />
          <EventTypeFilterButton
            label="Jira"
            color={EVENT_TYPE_COLORS.jira}
            isActive={visibleTypes.has("jira")}
            onClick={() => toggleEventType("jira")}
          />
          <EventTypeFilterButton
            label="Task"
            color={EVENT_TYPE_COLORS.task}
            isActive={visibleTypes.has("task")}
            onClick={() => toggleEventType("task")}
          />
          <EventTypeFilterButton
            label="Meeting"
            color={EVENT_TYPE_COLORS.meeting}
            isActive={visibleTypes.has("meeting")}
            onClick={() => toggleEventType("meeting")}
          />
          <EventTypeFilterButton
            label="Time Off"
            color={EVENT_TYPE_COLORS.time_off}
            isActive={visibleTypes.has("time_off")}
            onClick={() => toggleEventType("time_off")}
          />
          <EventTypeFilterButton
            label="Pending"
            color={PENDING_TIME_OFF_COLOR}
            isActive={showPendingTimeOff}
            onClick={() => setShowPendingTimeOff(!showPendingTimeOff)}
            dashed
          />
        </div>
      </div>
    </div>
  );
}
