/**
 * Tests for calendar/components/ViewMeetingModal.tsx
 * Meeting viewing modal with attendee management
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ViewMeetingModal from "../ViewMeetingModal";

// Mock date-fns
jest.mock("date-fns", () => ({
  format: (date: Date, formatStr: string) => {
    const month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();

    if (formatStr === "yyyy-MM-dd") {
      return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (formatStr === "HH:mm") {
      return "10:00";
    }
    if (formatStr === "MMM d, yyyy") {
      return `${month} ${day}, ${year}`;
    }
    if (formatStr === "h:mm a") {
      return "10:00 AM";
    }
    return `${month} ${day}, ${year}`;
  },
}));

// Mock actions
const mockGetMeeting = jest.fn();
const mockUpdateMeetingAction = jest.fn();
const mockDeleteMeetingAction = jest.fn();
const mockRespondToMeetingAction = jest.fn();

jest.mock("../../actions", () => ({
  getMeeting: (id: number) => mockGetMeeting(id),
  updateMeetingAction: (id: number, data: unknown) =>
    mockUpdateMeetingAction(id, data),
  deleteMeetingAction: (id: number) => mockDeleteMeetingAction(id),
  respondToMeetingAction: (id: number, response: string) =>
    mockRespondToMeetingAction(id, response),
}));

// Mock OrganizationProvider
jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => ({
    allUsers: [
      { id: 1, first_name: "John", last_name: "Doe" },
      { id: 2, first_name: "Jane", last_name: "Smith" },
    ],
  }),
}));

// Mock CurrentUserProvider
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => ({
    currentUser: { id: 1, role: "admin" },
  }),
}));

describe("ViewMeetingModal", () => {
  const mockMeeting = {
    id: 1,
    title: "Team Standup",
    description: "Daily standup meeting",
    start_time: "2024-01-20T10:00:00Z",
    end_time: "2024-01-20T10:30:00Z",
    created_by_id: 1,
    attendees: [
      {
        id: 1,
        meeting_id: 1,
        user_id: 1,
        response_status: "accepted" as const,
      },
      { id: 2, meeting_id: 1, user_id: 2, response_status: "pending" as const },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    meetingId: 1,
    onUpdated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMeeting.mockResolvedValue(mockMeeting);
    mockUpdateMeetingAction.mockResolvedValue({
      success: true,
      data: mockMeeting,
    });
    mockDeleteMeetingAction.mockResolvedValue({ success: true });
    mockRespondToMeetingAction.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<ViewMeetingModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("displays meeting details after loading", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
        expect(screen.getByText("Daily standup meeting")).toBeInTheDocument();
      });
    });

    it("displays attendees list", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
    });

    it("displays attendee response status", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Accepted")).toBeInTheDocument();
        expect(screen.getByText("Pending")).toBeInTheDocument();
      });
    });

    it("shows organizer name", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Organized by John Doe/)).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows not found when fetch fails", async () => {
      mockGetMeeting.mockRejectedValue(new Error("Not found"));

      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting not found")).toBeInTheDocument();
      });
    });
  });

  describe("edit mode", () => {
    it("shows edit button for meeting creator", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Meeting")).toBeInTheDocument();
      });
    });

    it("enters edit mode when edit button is clicked", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Meeting")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Meeting"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("Team Standup")).toBeInTheDocument();
      });
    });

    it("shows save button in edit mode", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Meeting")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Meeting"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("Team Standup")).toBeInTheDocument();
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
      });
    });
  });

  describe("delete functionality", () => {
    it("shows delete button for meeting creator", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    it("shows confirmation when delete is clicked", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(
          screen.getByText(/Are you sure you want to delete this meeting/i),
        ).toBeInTheDocument();
      });
    });

    it("deletes meeting when confirmed", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Delete Meeting")).toBeInTheDocument();
      });

      // Click the confirm delete button
      const deleteButtons = screen.getAllByText("Delete Meeting");
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockDeleteMeetingAction).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("response functionality", () => {
    it("shows response buttons for attendees", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Accept")).toBeInTheDocument();
        expect(screen.getByText("Maybe")).toBeInTheDocument();
        expect(screen.getByText("Decline")).toBeInTheDocument();
      });
    });

    it("calls respond action when Accept is clicked", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Accept")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Accept"));

      await waitFor(() => {
        expect(mockRespondToMeetingAction).toHaveBeenCalledWith(1, "accepted");
      });
    });

    it("calls respond action when Decline is clicked", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Decline")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Decline"));

      await waitFor(() => {
        expect(mockRespondToMeetingAction).toHaveBeenCalledWith(1, "declined");
      });
    });

    it("calls respond action when Maybe is clicked", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Maybe")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Maybe"));

      await waitFor(() => {
        expect(mockRespondToMeetingAction).toHaveBeenCalledWith(1, "tentative");
      });
    });
  });

  describe("attendee count", () => {
    it("shows attendee count", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Attendees \(2\)/)).toBeInTheDocument();
      });
    });
  });

  describe("date and time display", () => {
    it("shows start and end labels", async () => {
      render(<ViewMeetingModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Start")).toBeInTheDocument();
        expect(screen.getByText("End")).toBeInTheDocument();
      });
    });
  });
});
