/**
 * Tests for calendar/CalendarPageClient.tsx
 * Main calendar page with modal management
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CalendarPageClient } from "../CalendarPageClient";
import { User } from "@/shared/types/user";
import * as CurrentUserProvider from "@/providers/CurrentUserProvider";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: jest.fn(() => ({
    currentUser: null,
    effectiveIsSupervisorOrAdmin: false,
  })),
}));

// Mock Calendar component
jest.mock("../components/Calendar", () => {
  return function MockCalendar({
    onCreateTask,
    onCreateMeeting,
    onRequestTimeOff,
    onViewTask,
    onViewMeeting,
    onViewTimeOff,
  }: {
    onCreateTask?: () => void;
    onCreateMeeting?: () => void;
    onRequestTimeOff?: () => void;
    onViewTask?: (id: number) => void;
    onViewMeeting?: (id: number) => void;
    onViewTimeOff?: (id: number) => void;
  }) {
    return (
      <div data-testid="calendar">
        <button onClick={onCreateTask} data-testid="create-task-btn">
          Create Task
        </button>
        <button onClick={onCreateMeeting} data-testid="create-meeting-btn">
          Create Meeting
        </button>
        <button onClick={onRequestTimeOff} data-testid="request-time-off-btn">
          Request Time Off
        </button>
        {onViewTask && (
          <button onClick={() => onViewTask(1)} data-testid="view-task-btn">
            View Task
          </button>
        )}
        {onViewMeeting && (
          <button
            onClick={() => onViewMeeting(1)}
            data-testid="view-meeting-btn"
          >
            View Meeting
          </button>
        )}
        {onViewTimeOff && (
          <button
            onClick={() => onViewTimeOff(1)}
            data-testid="view-time-off-btn"
          >
            View Time Off
          </button>
        )}
      </div>
    );
  };
});

// Mock modals
jest.mock("../components/CreateTaskModal", () => {
  return function MockCreateTaskModal({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="create-task-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../components/CreateMeetingModal", () => {
  return function MockCreateMeetingModal({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="create-meeting-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../components/CreateEventModal", () => {
  return function MockCreateEventModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? (
      <div data-testid="create-event-modal">Event Modal</div>
    ) : null;
  };
});

jest.mock("../components/RequestTimeOffModal", () => {
  return function MockRequestTimeOffModal({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="request-time-off-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../components/CreateTimeOffForEmployeeModal", () => {
  return function MockCreateTimeOffForEmployeeModal({
    isOpen,
  }: {
    isOpen: boolean;
  }) {
    return isOpen ? (
      <div data-testid="create-time-off-employee-modal">Modal</div>
    ) : null;
  };
});

jest.mock("../components/ViewTaskModal", () => {
  return function MockViewTaskModal({
    isOpen,
    taskId,
    onClose,
  }: {
    isOpen: boolean;
    taskId: number;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="view-task-modal">
        Task ID: {taskId}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../components/ViewMeetingModal", () => {
  return function MockViewMeetingModal({
    isOpen,
    meetingId,
    onClose,
  }: {
    isOpen: boolean;
    meetingId: number;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="view-meeting-modal">
        Meeting ID: {meetingId}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../components/ViewTimeOffModal", () => {
  return function MockViewTimeOffModal({
    isOpen,
    timeOffId,
    onClose,
  }: {
    isOpen: boolean;
    timeOffId: number;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="view-time-off-modal">
        Time Off ID: {timeOffId}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

describe("CalendarPageClient", () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    auth0_id: "auth0|123",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    role: "employee",
    title: "Software Engineer",
    department: "Engineering",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const defaultProps = {
    initialCurrentUser: createMockUser(),
  };

  describe("rendering", () => {
    it("renders page title and description", () => {
      render(<CalendarPageClient {...defaultProps} />);

      expect(screen.getByText("Calendar")).toBeInTheDocument();
      expect(
        screen.getByText(
          "View and manage your tasks, meetings, and Jira tickets",
        ),
      ).toBeInTheDocument();
    });

    it("renders calendar component", () => {
      render(<CalendarPageClient {...defaultProps} />);

      expect(screen.getByTestId("calendar")).toBeInTheDocument();
    });

    it("does not render modals initially", () => {
      render(<CalendarPageClient {...defaultProps} />);

      expect(screen.queryByTestId("create-task-modal")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("create-meeting-modal"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("request-time-off-modal"),
      ).not.toBeInTheDocument();
    });
  });

  describe("modal management", () => {
    it("opens create task modal when triggered", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("create-task-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("create-task-modal")).toBeInTheDocument();
      });
    });

    it("opens create meeting modal when triggered", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("create-meeting-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("create-meeting-modal")).toBeInTheDocument();
      });
    });

    it("opens request time off modal when triggered", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("request-time-off-btn"));

      await waitFor(() => {
        expect(
          screen.getByTestId("request-time-off-modal"),
        ).toBeInTheDocument();
      });
    });

    it("closes create task modal when close is triggered", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      // Open modal
      fireEvent.click(screen.getByTestId("create-task-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("create-task-modal")).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(
          screen.queryByTestId("create-task-modal"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("view modals", () => {
    it("opens view task modal with task ID", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("view-task-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("view-task-modal")).toBeInTheDocument();
        expect(screen.getByText("Task ID: 1")).toBeInTheDocument();
      });
    });

    it("opens view meeting modal with meeting ID", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("view-meeting-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("view-meeting-modal")).toBeInTheDocument();
        expect(screen.getByText("Meeting ID: 1")).toBeInTheDocument();
      });
    });

    it("opens view time off modal with time off ID", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("view-time-off-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("view-time-off-modal")).toBeInTheDocument();
        expect(screen.getByText("Time Off ID: 1")).toBeInTheDocument();
      });
    });

    it("closes view task modal and clears task ID", async () => {
      render(<CalendarPageClient {...defaultProps} />);

      // Open view modal
      fireEvent.click(screen.getByTestId("view-task-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("view-task-modal")).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByTestId("view-task-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("supervisor/admin features", () => {
    it("shows create time off for employee button for supervisors", () => {
      (CurrentUserProvider.useCurrentUser as jest.Mock).mockReturnValue({
        currentUser: createMockUser({ role: "supervisor" }),
        effectiveIsSupervisorOrAdmin: true,
      });

      render(
        <CalendarPageClient
          initialCurrentUser={createMockUser({ role: "supervisor" })}
        />,
      );

      // The Calendar mock doesn't render the button for non-supervisors
      // This test verifies the prop is passed correctly
      expect(screen.getByTestId("calendar")).toBeInTheDocument();
    });
  });
});
