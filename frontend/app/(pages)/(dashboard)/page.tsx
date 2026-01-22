"use client";

import { useState, useCallback } from "react";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import EmployeeList from "./orgchart/components/EmployeeList";
import JiraTasks from "@/app/(pages)/jira/components/JiraTasks";
import CalendarWidget from "./calendar/components/CalendarWidget";
import CreateTaskModal from "./calendar/components/CreateTaskModal";
import CreateMeetingModal from "./calendar/components/CreateMeetingModal";
import CreateEventModal from "./calendar/components/CreateEventModal";
import RequestTimeOffModal from "./calendar/components/RequestTimeOffModal";
import CreateTimeOffForEmployeeModal from "./calendar/components/CreateTimeOffForEmployeeModal";
import ViewTaskModal from "./calendar/components/ViewTaskModal";
import ViewMeetingModal from "./calendar/components/ViewMeetingModal";
import ViewTimeOffModal from "./calendar/components/ViewTimeOffModal";
import { CreateEmployeeModal } from "@/components";
import StatsCards from "./dashboard-stats/StatsCards";
import SquadBreakdown from "./dashboard-stats/SquadBreakdown";
import TimeOffWidget from "./dashboard-stats/TimeOffWidget";
import { UserPlus } from "lucide-react";

type ModalType = "createEmployee" | "task" | "event" | "meeting" | "timeOff" | "timeOffForEmployee" | "viewTask" | "viewMeeting" | "viewTimeOff" | null;

export default function DashboardPage() {
  const { currentUser, loading: userLoading, error: userError } = useCurrentUser();
  const { employees: employeesInput, squads: squadsInput, departments: departmentsInput, addSquad, refetchEmployees } = useOrganization();
  // Ensure organization data is always arrays
  const employees = employeesInput || [];
  const squads = squadsInput || [];
  const departments = departmentsInput || [];

  // Check if the effective current user (including when impersonating) is supervisor or admin
  const effectiveIsSupervisorOrAdmin = currentUser?.role === "supervisor" || currentUser?.role === "admin";

  // Unified modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // State for viewing specific items
  const [viewTaskId, setViewTaskId] = useState<number | null>(null);
  const [viewMeetingId, setViewMeetingId] = useState<number | null>(null);
  const [viewTimeOffId, setViewTimeOffId] = useState<number | null>(null);

  const closeAndRefreshCalendar = useCallback(() => {
    setActiveModal(null);
    setViewTaskId(null);
    setViewMeetingId(null);
    setViewTimeOffId(null);
    setCalendarRefreshKey((prev) => prev + 1);
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

  const handleEmployeeCreated = useCallback(async () => {
    await refetchEmployees();
    setActiveModal(null);
  }, [refetchEmployees]);

  if (userLoading) {
    return null;
  }

  if (userError) {
    const isDev = process.env.NODE_ENV === "development";
    return (
      <div className="bg-red-900/30 border border-red-500/30 p-4 mb-6">
        <p className="text-red-400">
          {isDev ? userError : "Unable to load your profile. Please try again later."}
        </p>
        {isDev && (
          <p className="text-sm text-red-300 mt-1">
            Make sure your Go backend is running on port 8080 and PostgreSQL is started.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            {currentUser?.role === "supervisor"
              ? "Team Dashboard"
              : currentUser?.role === "admin"
                ? "Admin Dashboard"
                : "My Dashboard"}
          </h1>
          <p className="text-theme-text-muted mt-1">
            {currentUser?.role === "supervisor"
              ? "Manage and view your team members"
              : currentUser?.role === "admin"
                ? "Manage all users and settings"
                : "View your profile and information"}
          </p>
        </div>
        {effectiveIsSupervisorOrAdmin && (
          <button
            onClick={() => setActiveModal("createEmployee")}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      <div className="grid gap-6 mb-6">
        <div className="bg-theme-surface border border-theme-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-theme-text mb-4 sm:mb-6">
            {effectiveIsSupervisorOrAdmin ? "Direct Reports" : "My Profile"}
          </h2>
          <EmployeeList employees={employees} />
        </div>
      </div>

      {/* Row 1: Squad Breakdown, Stats Cards, Time Off Requests */}
      {effectiveIsSupervisorOrAdmin ? (
        <div className="grid gap-4 mb-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <SquadBreakdown employees={employees} />
          <StatsCards employees={employees} />
          <div className="md:col-span-2 xl:col-span-1 h-full">
            <TimeOffWidget />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 mb-6">
          <TimeOffWidget />
        </div>
      )}

      {/* Row 2: Jira Tasks, Upcoming Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <JiraTasks compact />
        <CalendarWidget
          key={calendarRefreshKey}
          onCreateTask={() => setActiveModal("task")}
          onCreateEvent={() => setActiveModal("event")}
          onCreateMeeting={() => setActiveModal("meeting")}
          onRequestTimeOff={() => setActiveModal("timeOff")}
          onCreateTimeOffForEmployee={
            effectiveIsSupervisorOrAdmin
              ? () => setActiveModal("timeOffForEmployee")
              : undefined
          }
          onViewTask={handleViewTask}
          onViewMeeting={handleViewMeeting}
          onViewTimeOff={handleViewTimeOff}
        />
      </div>

      {/* Modals */}
      <CreateEmployeeModal
        isOpen={activeModal === "createEmployee"}
        onClose={() => setActiveModal(null)}
        onCreated={handleEmployeeCreated}
        squads={squads}
        departments={departments}
        onAddSquad={addSquad}
      />

      <CreateTaskModal
        isOpen={activeModal === "task"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefreshCalendar}
      />

      <CreateMeetingModal
        isOpen={activeModal === "meeting"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefreshCalendar}
      />

      <CreateEventModal
        isOpen={activeModal === "event"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefreshCalendar}
      />

      <RequestTimeOffModal
        isOpen={activeModal === "timeOff"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefreshCalendar}
      />

      <CreateTimeOffForEmployeeModal
        isOpen={activeModal === "timeOffForEmployee"}
        onClose={() => setActiveModal(null)}
        onCreated={closeAndRefreshCalendar}
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
          onUpdated={closeAndRefreshCalendar}
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
          onUpdated={closeAndRefreshCalendar}
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
          onUpdated={closeAndRefreshCalendar}
        />
      )}
    </>
  );
}
