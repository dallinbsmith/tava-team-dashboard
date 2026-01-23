"use client";

import { useState, useCallback } from "react";
import Calendar from "./components/Calendar";
import { CalendarEvent } from "./types";
import CreateTaskModal from "./components/CreateTaskModal";
import CreateMeetingModal from "./components/CreateMeetingModal";
import CreateEventModal from "./components/CreateEventModal";
import RequestTimeOffModal from "./components/RequestTimeOffModal";
import CreateTimeOffForEmployeeModal from "./components/CreateTimeOffForEmployeeModal";
import ViewTaskModal from "./components/ViewTaskModal";
import ViewMeetingModal from "./components/ViewMeetingModal";
import ViewTimeOffModal from "./components/ViewTimeOffModal";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { User } from "@/shared/types/user";

type ModalType =
  | "task"
  | "event"
  | "meeting"
  | "timeOff"
  | "timeOffForEmployee"
  | "viewTask"
  | "viewMeeting"
  | "viewTimeOff"
  | null;

interface CalendarPageClientProps {
  initialCurrentUser: User;
}

export const CalendarPageClient = ({ initialCurrentUser }: CalendarPageClientProps) => {
  // Use provider for impersonation support, fall back to initial server data
  const { currentUser, effectiveIsSupervisorOrAdmin: providerIsSupervisorOrAdmin } =
    useCurrentUser();

  // Use provider value if available (handles impersonation), otherwise compute from initial data
  const effectiveIsSupervisorOrAdmin = currentUser
    ? providerIsSupervisorOrAdmin
    : initialCurrentUser.role === "supervisor" || initialCurrentUser.role === "admin";

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // State for viewing specific items
  const [viewTaskId, setViewTaskId] = useState<number | null>(null);
  const [viewMeetingId, setViewMeetingId] = useState<number | null>(null);
  const [viewTimeOffId, setViewTimeOffId] = useState<number | null>(null);

  const closeAndRefresh = useCallback(() => {
    setActiveModal(null);
    setViewTaskId(null);
    setViewMeetingId(null);
    setViewTimeOffId(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleViewTask = useCallback((taskId: number) => {
    setViewTaskId(taskId);
    setActiveModal("viewTask");
  }, []);

  const handleViewMeeting = useCallback((meetingId: number) => {
    setViewMeetingId(meetingId);
    setActiveModal("viewMeeting");
  }, []);

  const handleViewTimeOff = useCallback((timeOffId: number) => {
    setViewTimeOffId(timeOffId);
    setActiveModal("viewTimeOff");
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (event.url) {
      window.open(event.url, "_blank");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">Calendar</h1>
        <p className="mt-1 text-sm text-theme-text-muted">
          View and manage your tasks, meetings, and Jira tickets
        </p>
      </div>

      <Calendar
        key={refreshKey}
        onCreateTask={() => setActiveModal("task")}
        onCreateEvent={() => setActiveModal("event")}
        onCreateMeeting={() => setActiveModal("meeting")}
        onRequestTimeOff={() => setActiveModal("timeOff")}
        onCreateTimeOffForEmployee={
          effectiveIsSupervisorOrAdmin ? () => setActiveModal("timeOffForEmployee") : undefined
        }
        onEventClick={handleEventClick}
        onViewTask={handleViewTask}
        onViewMeeting={handleViewMeeting}
        onViewTimeOff={handleViewTimeOff}
      />

      <CreateTaskModal
        isOpen={activeModal === "task"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefresh}
      />

      <CreateMeetingModal
        isOpen={activeModal === "meeting"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefresh}
      />

      <CreateEventModal
        isOpen={activeModal === "event"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefresh}
      />

      <RequestTimeOffModal
        isOpen={activeModal === "timeOff"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefresh}
      />

      <CreateTimeOffForEmployeeModal
        isOpen={activeModal === "timeOffForEmployee"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefresh}
      />

      {/* View Modals */}
      {viewTaskId && (
        <ViewTaskModal
          isOpen={activeModal === "viewTask"}
          onClose={() => {
            setActiveModal(null);
            setViewTaskId(null);
          }}
          taskId={viewTaskId}
          onUpdated={closeAndRefresh}
        />
      )}

      {viewMeetingId && (
        <ViewMeetingModal
          isOpen={activeModal === "viewMeeting"}
          onClose={() => {
            setActiveModal(null);
            setViewMeetingId(null);
          }}
          meetingId={viewMeetingId}
          onUpdated={closeAndRefresh}
        />
      )}

      {viewTimeOffId && (
        <ViewTimeOffModal
          isOpen={activeModal === "viewTimeOff"}
          onClose={() => {
            setActiveModal(null);
            setViewTimeOffId(null);
          }}
          timeOffId={viewTimeOffId}
          onUpdated={closeAndRefresh}
        />
      )}
    </div>
  );
};
