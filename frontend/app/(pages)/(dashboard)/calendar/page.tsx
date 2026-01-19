"use client";

import { useState, useCallback } from "react";
import { Calendar, CreateTaskModal, CreateMeetingModal, CreateEventModal, RequestTimeOffModal, CreateTimeOffForEmployeeModal } from "@/app/(pages)/calendar";
import { CalendarEvent } from "@/shared/types";
import { useCurrentUser } from "@/providers";

type ModalType = "task" | "event" | "meeting" | "timeOff" | "timeOffForEmployee" | null;

export default function CalendarPage() {
  const { isSupervisorOrAdmin } = useCurrentUser();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const closeAndRefresh = useCallback(() => {
    setActiveModal(null);
    setRefreshKey((prev) => prev + 1);
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
          isSupervisorOrAdmin ? () => setActiveModal("timeOffForEmployee") : undefined
        }
        onEventClick={handleEventClick}
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
    </div>
  );
}
