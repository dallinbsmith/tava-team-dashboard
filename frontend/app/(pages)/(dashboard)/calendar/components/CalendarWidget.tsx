"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CalendarEvent, ResponseStatus } from "../types";
import { getCalendarEvents, respondToMeeting } from "../actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  CheckSquare,
  Users,
  Plus,
  ChevronDown,
  Palmtree,
  UserPlus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  isToday,
  isTomorrow,
} from "date-fns";
import {
  dropdownItemButton,
  widgetContainer,
  widgetFooter,
  cardBase,
} from "@/lib/styles";
import { cn } from "@/lib/utils";

interface CalendarWidgetProps {
  onCreateTask?: () => void;
  onCreateEvent?: () => void;
  onCreateMeeting?: () => void;
  onRequestTimeOff?: () => void;
  onCreateTimeOffForEmployee?: () => void;
  onRefresh?: () => void;
  onViewTask?: (taskId: number) => void;
  onViewMeeting?: (meetingId: number) => void;
  onViewTimeOff?: (timeOffId: number) => void;
}

export default function CalendarWidget({
  onCreateTask,
  onCreateEvent,
  onCreateMeeting,
  onRequestTimeOff,
  onCreateTimeOffForEmployee,
  onRefresh,
  onViewTask,
  onViewMeeting,
  onViewTimeOff,
}: CalendarWidgetProps) {
  const { currentUser } = useCurrentUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [respondingMeetingId, setRespondingMeetingId] = useState<number | null>(
    null,
  );
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(event.target as Node)
      ) {
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

  const hasAnyAction =
    onCreateTask ||
    onCreateEvent ||
    onCreateMeeting ||
    onRequestTimeOff ||
    onCreateTimeOffForEmployee;

  const fetchEvents = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const start = startOfDay(new Date());
        const end = endOfDay(addDays(new Date(), 7));

        const calendarEvents = await getCalendarEvents(start, end);

        // Sort by start date
        const sorted = (calendarEvents || []).sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        );

        setEvents(sorted.slice(0, 5));
        if (showRefresh && onRefresh) {
          onRefresh();
        }
      } catch (e) {
        console.error("Failed to fetch calendar events:", e);
        setError("Failed to load events");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onRefresh],
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleMeetingResponse = useCallback(
    async (meetingId: number, response: ResponseStatus) => {
      setRespondingMeetingId(meetingId);
      try {
        await respondToMeeting(meetingId, response);
        // Refresh events to get updated response status
        await fetchEvents();
      } catch (e) {
        console.error("Failed to respond to meeting:", e);
        setError("Failed to update response");
      } finally {
        setRespondingMeetingId(null);
      }
    },
    [fetchEvents],
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case "jira":
        return <CheckSquare className="w-4 h-4 text-blue-400" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-green-400" />;
      case "meeting":
        return <Users className="w-4 h-4 text-purple-400" />;
      default:
        return <CalendarIcon className="w-4 h-4 text-theme-text-muted" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case "jira":
        return "bg-blue-900/30 border-l-blue-500";
      case "task":
        return "bg-green-900/30 border-l-green-500";
      case "meeting":
        return "bg-purple-900/30 border-l-purple-500";
      default:
        return "bg-theme-elevated border-l-theme-border";
    }
  };

  const formatEventDate = (start: string, allDay: boolean) => {
    const date = new Date(start);

    if (isToday(date)) {
      if (allDay) {
        return <span className="text-orange-400 font-medium">Today</span>;
      }
      return (
        <span className="text-orange-400 font-medium">
          Today at {format(date, "h:mm a")}
        </span>
      );
    }

    if (isTomorrow(date)) {
      if (allDay) {
        return <span className="text-yellow-400 font-medium">Tomorrow</span>;
      }
      return (
        <span className="text-yellow-400 font-medium">
          Tomorrow at {format(date, "h:mm a")}
        </span>
      );
    }

    if (allDay) {
      return (
        <span className="text-theme-text-muted">
          {format(date, "EEE, MMM d")}
        </span>
      );
    }
    return (
      <span className="text-theme-text-muted">
        {format(date, "EEE, MMM d 'at' h:mm a")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={cn(cardBase, "overflow-hidden")}>
        <div className="px-6 py-4 border-b border-theme-border flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">
            Upcoming Events
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={widgetContainer}>
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-theme-text">
            Upcoming Events
          </h2>
          {events.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {events.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasAnyAction && (
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setAddMenuOpen(!addMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${addMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {addMenuOpen && (
                <div
                  className={cn(
                    cardBase,
                    "absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-50 overflow-hidden",
                  )}
                >
                  {onCreateTask && (
                    <button
                      onClick={() => handleAction(onCreateTask)}
                      className={dropdownItemButton}
                    >
                      <CheckSquare className="w-4 h-4 text-green-400" />
                      Task
                    </button>
                  )}
                  {onCreateEvent && (
                    <button
                      onClick={() => handleAction(onCreateEvent)}
                      className={dropdownItemButton}
                    >
                      <CalendarIcon className="w-4 h-4 text-blue-400" />
                      Event
                    </button>
                  )}
                  {onCreateMeeting && (
                    <button
                      onClick={() => handleAction(onCreateMeeting)}
                      className={dropdownItemButton}
                    >
                      <Users className="w-4 h-4 text-purple-400" />
                      Meeting
                    </button>
                  )}
                  {onRequestTimeOff && (
                    <button
                      onClick={() => handleAction(onRequestTimeOff)}
                      className={dropdownItemButton}
                    >
                      <Palmtree className="w-4 h-4 text-amber-400" />
                      Request Time Off
                    </button>
                  )}
                  {onCreateTimeOffForEmployee && (
                    <button
                      onClick={() => handleAction(onCreateTimeOffForEmployee)}
                      className={dropdownItemButton}
                    >
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      Time Off for Employee
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
            title="Refresh events"
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

      {events.length === 0 ? (
        <div className="flex-1 px-6 py-8 text-center text-theme-text-muted">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          <p>No upcoming events</p>
          <p className="text-sm mt-1 text-theme-text-subtle">
            Events for the next 7 days will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-theme-border">
          {events.map((event) => {
            // Determine if this event is clickable and what handler to use
            const isClickable =
              (event.type === "task" && event.task && onViewTask) ||
              (event.type === "meeting" && event.meeting && onViewMeeting) ||
              (event.type === "time_off" &&
                event.time_off_request &&
                onViewTimeOff);

            const handleClick = () => {
              if (event.type === "task" && event.task && onViewTask) {
                onViewTask(event.task.id);
              } else if (
                event.type === "meeting" &&
                event.meeting &&
                onViewMeeting
              ) {
                onViewMeeting(event.meeting.id);
              } else if (
                event.type === "time_off" &&
                event.time_off_request &&
                onViewTimeOff
              ) {
                onViewTimeOff(event.time_off_request.id);
              }
            };

            // Check if user is an attendee with pending response for meetings
            const meetingAttendee =
              event.type === "meeting" &&
              event.meeting?.attendees?.find(
                (a) => a.user_id === currentUser?.id,
              );
            const showMeetingResponse =
              meetingAttendee && meetingAttendee.response_status === "pending";
            const isRespondingToThisMeeting =
              event.meeting && respondingMeetingId === event.meeting.id;

            // For time_off events, include the employee name in the display title
            let displayTitle = event.title;
            if (event.type === "time_off" && event.time_off_request?.user) {
              const user = event.time_off_request.user;
              const name = `${user.first_name} ${user.last_name}`.trim();
              if (name) {
                displayTitle = `${name}: ${displayTitle}`;
              }
            }

            return (
              <div
                key={event.id}
                onClick={isClickable ? handleClick : undefined}
                className={`flex items-center gap-3 px-4 py-2 border-l-2 ${getEventBgColor(event.type)} ${
                  isClickable
                    ? "cursor-pointer hover:bg-theme-elevated/50 transition-colors"
                    : ""
                } ${isRespondingToThisMeeting ? "opacity-50" : ""}`}
              >
                <div className="flex-shrink-0">{getEventIcon(event.type)}</div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <h3 className="text-sm font-medium text-theme-text truncate">
                    {displayTitle}
                  </h3>
                  <span className="text-xs text-theme-text-muted whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatEventDate(event.start, event.all_day)}
                  </span>
                </div>

                {showMeetingResponse && event.meeting && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingResponse(event.meeting!.id, "accepted");
                      }}
                      disabled={isRespondingToThisMeeting}
                      className="p-1 text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                      title="Accept"
                    >
                      {isRespondingToThisMeeting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingResponse(event.meeting!.id, "declined");
                      }}
                      disabled={isRespondingToThisMeeting}
                      className="p-1 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-theme-text-muted hover:text-theme-text flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={widgetFooter}>
        <Link
          href="/calendar"
          className="text-sm text-primary-400 hover:underline flex items-center gap-1"
        >
          View full calendar
          <CalendarIcon className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
