/**
 * Tests for calendar/components/CalendarWidget.tsx
 * Calendar widget showing upcoming events with action buttons
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarWidget from "../CalendarWidget";
import { CalendarEvent } from "../../types";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock CurrentUserProvider
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => ({
    currentUser: { id: 1 },
  }),
}));

// Mock calendar actions
const mockGetCalendarEvents = jest.fn();
const mockRespondToMeeting = jest.fn();

jest.mock("../../actions", () => ({
  getCalendarEvents: () => mockGetCalendarEvents(),
  respondToMeeting: (meetingId: number, response: string) =>
    mockRespondToMeeting(meetingId, response),
}));

// Mock date-fns to have consistent dates in tests
jest.mock("date-fns", () => ({
  ...jest.requireActual("date-fns"),
  startOfDay: jest.fn(() => new Date("2024-01-15T00:00:00Z")),
  endOfDay: jest.fn(() => new Date("2024-01-22T23:59:59Z")),
  addDays: jest.fn(() => new Date("2024-01-22T00:00:00Z")),
  isToday: jest.fn(() => false),
  isTomorrow: jest.fn(() => false),
  format: jest.fn((date, formatStr) => {
    if (formatStr === "h:mm a") return "10:00 AM";
    if (formatStr === "EEE, MMM d") return "Mon, Jan 15";
    if (formatStr === "EEE, MMM d 'at' h:mm a")
      return "Mon, Jan 15 at 10:00 AM";
    return "2024-01-15";
  }),
}));

describe("CalendarWidget", () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: "task-1",
      title: "Complete Report",
      start: "2024-01-15T10:00:00Z",
      end: "2024-01-15T11:00:00Z",
      all_day: false,
      type: "task",
      task: { id: 1, title: "Complete Report" },
    },
    {
      id: "meeting-1",
      title: "Team Standup",
      start: "2024-01-15T14:00:00Z",
      end: "2024-01-15T14:30:00Z",
      all_day: false,
      type: "meeting",
      meeting: {
        id: 1,
        title: "Team Standup",
        attendees: [{ user_id: 1, response_status: "pending" }],
      },
    },
    {
      id: "jira-1",
      title: "PROJ-123: Fix Bug",
      start: "2024-01-16T00:00:00Z",
      end: "2024-01-16T23:59:59Z",
      all_day: true,
      type: "jira",
      url: "https://jira.example.com/PROJ-123",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCalendarEvents.mockResolvedValue(mockEvents);
    mockRespondToMeeting.mockResolvedValue({ success: true });
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockGetCalendarEvents.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(<CalendarWidget />);

      expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
      // Loading spinner should be visible
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("rendering events", () => {
    it("renders events after loading", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("Complete Report")).toBeInTheDocument();
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      });
    });

    it("renders event count badge", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("shows external link for jira events", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        const jiraLink = document.querySelector(
          'a[href="https://jira.example.com/PROJ-123"]',
        );
        expect(jiraLink).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("shows empty state when no events", async () => {
      mockGetCalendarEvents.mockResolvedValue([]);

      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("No upcoming events")).toBeInTheDocument();
        expect(
          screen.getByText("Events for the next 7 days will appear here"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("shows error message when fetch fails", async () => {
      mockGetCalendarEvents.mockRejectedValue(new Error("Network error"));

      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load events")).toBeInTheDocument();
      });
    });
  });

  describe("action buttons", () => {
    it("renders Add button with dropdown when actions are provided", async () => {
      render(
        <CalendarWidget
          onCreateTask={jest.fn()}
          onCreateMeeting={jest.fn()}
          onRequestTimeOff={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });
    });

    it("opens dropdown menu when Add button is clicked", async () => {
      render(
        <CalendarWidget
          onCreateTask={jest.fn()}
          onCreateMeeting={jest.fn()}
          onRequestTimeOff={jest.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add"));

      await waitFor(() => {
        expect(screen.getByText("Task")).toBeInTheDocument();
        expect(screen.getByText("Meeting")).toBeInTheDocument();
        expect(screen.getByText("Request Time Off")).toBeInTheDocument();
      });
    });

    it("calls onCreateTask when Task is clicked", async () => {
      const onCreateTask = jest.fn();
      render(<CalendarWidget onCreateTask={onCreateTask} />);

      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add"));
      fireEvent.click(screen.getByText("Task"));

      expect(onCreateTask).toHaveBeenCalled();
    });

    it("calls onCreateMeeting when Meeting is clicked", async () => {
      const onCreateMeeting = jest.fn();
      render(<CalendarWidget onCreateMeeting={onCreateMeeting} />);

      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add"));
      fireEvent.click(screen.getByText("Meeting"));

      expect(onCreateMeeting).toHaveBeenCalled();
    });

    it("shows Time Off for Employee option for supervisors", async () => {
      const onCreateTimeOffForEmployee = jest.fn();
      render(
        <CalendarWidget
          onCreateTask={jest.fn()}
          onCreateTimeOffForEmployee={onCreateTimeOffForEmployee}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Add"));

      expect(screen.getByText("Time Off for Employee")).toBeInTheDocument();
    });
  });

  describe("refresh functionality", () => {
    it("renders refresh button", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByTitle("Refresh events")).toBeInTheDocument();
      });
    });

    it("refreshes events when refresh button is clicked", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByTitle("Refresh events")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle("Refresh events"));

      await waitFor(() => {
        expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("event click handlers", () => {
    it("calls onViewTask when task event is clicked", async () => {
      const onViewTask = jest.fn();
      render(<CalendarWidget onViewTask={onViewTask} />);

      await waitFor(() => {
        expect(screen.getByText("Complete Report")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Complete Report"));

      expect(onViewTask).toHaveBeenCalledWith(1);
    });

    it("calls onViewMeeting when meeting event is clicked", async () => {
      const onViewMeeting = jest.fn();
      render(<CalendarWidget onViewMeeting={onViewMeeting} />);

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Team Standup"));

      expect(onViewMeeting).toHaveBeenCalledWith(1);
    });
  });

  describe("meeting response", () => {
    it("shows accept/decline buttons for pending meeting invites", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      });

      // Should show accept button
      expect(screen.getByTitle("Accept")).toBeInTheDocument();
      expect(screen.getByTitle("Decline")).toBeInTheDocument();
    });

    it("calls respondToMeeting with accepted when accept is clicked", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByTitle("Accept")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle("Accept"));

      await waitFor(() => {
        expect(mockRespondToMeeting).toHaveBeenCalledWith(1, "accepted");
      });
    });

    it("calls respondToMeeting with declined when decline is clicked", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByTitle("Decline")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle("Decline"));

      await waitFor(() => {
        expect(mockRespondToMeeting).toHaveBeenCalledWith(1, "declined");
      });
    });
  });

  describe("view full calendar link", () => {
    it("renders link to full calendar", async () => {
      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText("View full calendar")).toBeInTheDocument();
      });

      const link = screen.getByText("View full calendar").closest("a");
      expect(link).toHaveAttribute("href", "/calendar");
    });
  });
});
