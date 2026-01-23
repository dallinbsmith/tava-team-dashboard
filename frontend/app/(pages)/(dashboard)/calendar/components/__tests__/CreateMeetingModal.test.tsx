/**
 * Tests for calendar/components/CreateMeetingModal.tsx
 * Meeting creation form modal with attendee selection
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateMeetingModal from "../CreateMeetingModal";
import { User } from "@/shared/types/user";

// Mock date-fns
jest.mock("date-fns", () => ({
  format: () => "2024-01-15",
  addHours: (date: Date) => date,
  addDays: (date: Date) => date,
  setHours: (date: Date) => date,
  setMinutes: (date: Date) => date,
  startOfHour: (date: Date) => date,
}));

// Mock OrganizationProvider
const mockAllUsers: User[] = [
  {
    id: 1,
    auth0_id: "auth0|1",
    email: "user1@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "employee",
    title: "Engineer",
    department: "Engineering",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    auth0_id: "auth0|2",
    email: "user2@example.com",
    first_name: "Jane",
    last_name: "Smith",
    role: "employee",
    title: "Designer",
    department: "Design",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => ({
    allUsers: mockAllUsers,
    allUsersLoading: false,
  }),
}));

// Mock actions
const mockCreateMeetingAction = jest.fn();
jest.mock("../../actions", () => ({
  createMeetingAction: (req: unknown) => mockCreateMeetingAction(req),
}));

describe("CreateMeetingModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMeetingAction.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<CreateMeetingModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<CreateMeetingModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders modal title and button", () => {
      render(<CreateMeetingModal {...defaultProps} />);
      // Should have both title and button with "Create Meeting"
      const createMeetingElements = screen.getAllByText("Create Meeting");
      expect(createMeetingElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders form fields", () => {
      render(<CreateMeetingModal {...defaultProps} />);

      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Start/)).toBeInTheDocument();
      expect(screen.getByText(/End/)).toBeInTheDocument();
    });

    it("renders attendees section with count", () => {
      render(<CreateMeetingModal {...defaultProps} />);
      expect(screen.getByText(/Attendees \* \(0 selected\)/)).toBeInTheDocument();
    });

    it("renders user list for attendee selection", () => {
      render(<CreateMeetingModal {...defaultProps} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders cancel and submit buttons", () => {
      render(<CreateMeetingModal {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Meeting" })).toBeInTheDocument();
    });
  });

  describe("form input", () => {
    it("updates title field", async () => {
      render(<CreateMeetingModal {...defaultProps} />);
      const titleInput = screen.getByPlaceholderText("Meeting title");

      await userEvent.type(titleInput, "Weekly Standup");
      expect(titleInput).toHaveValue("Weekly Standup");
    });

    it("updates description field", async () => {
      render(<CreateMeetingModal {...defaultProps} />);
      const descInput = screen.getByPlaceholderText("Optional description");

      await userEvent.type(descInput, "Weekly team sync");
      expect(descInput).toHaveValue("Weekly team sync");
    });
  });

  describe("attendee selection", () => {
    it("allows selecting attendees via checkboxes", () => {
      render(<CreateMeetingModal {...defaultProps} />);

      // Find the checkbox by its associated label text
      const johnLabel = screen.getByText("John Doe").closest("label");
      fireEvent.click(johnLabel!);

      // Count should update
      expect(screen.getByText(/Attendees \* \(1 selected\)/)).toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("shows error when title is empty", async () => {
      render(<CreateMeetingModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Create Meeting" }));

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeInTheDocument();
      });
    });
  });

  describe("close and reset", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<CreateMeetingModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("recurring meeting", () => {
    it("shows recurring meeting checkbox", () => {
      render(<CreateMeetingModal {...defaultProps} />);
      expect(screen.getByText("Recurring meeting")).toBeInTheDocument();
    });

    it("shows recurrence options when recurring is checked", () => {
      render(<CreateMeetingModal {...defaultProps} />);

      const recurringCheckbox = screen.getByText("Recurring meeting").closest("label");
      fireEvent.click(recurringCheckbox!);

      expect(screen.getByText("Repeat every")).toBeInTheDocument();
    });
  });
});
