/**
 * Tests for calendar/components/CreateTaskModal.tsx
 * Task creation form modal with assignment options
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTaskModal from "../CreateTaskModal";
import { User, Squad } from "@/shared/types/user";

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

const mockSquads: Squad[] = [
  { id: 1, name: "Frontend Team" },
  { id: 2, name: "Backend Team" },
];

const mockDepartments = ["Engineering", "Design", "Product"];

jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => ({
    allUsers: mockAllUsers,
    squads: mockSquads,
    departments: mockDepartments,
    allUsersLoading: false,
  }),
}));

// Mock CurrentUserProvider
const mockUseCurrentUser = jest.fn();
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// Mock actions
const mockCreateTaskAction = jest.fn();
jest.mock("../../../calendar/actions", () => ({
  createTaskAction: (req: unknown) => mockCreateTaskAction(req),
}));

describe("CreateTaskModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      effectiveIsSupervisorOrAdmin: false,
    });
    mockCreateTaskAction.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<CreateTaskModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<CreateTaskModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders modal title", () => {
      render(<CreateTaskModal {...defaultProps} />);
      // Title appears in header, button appears separately
      const texts = screen.getAllByText("Create Task");
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });

    it("renders form fields", () => {
      render(<CreateTaskModal {...defaultProps} />);

      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Due Date/i)).toBeInTheDocument();
    });

    it("renders cancel and submit buttons", () => {
      render(<CreateTaskModal {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Task" })).toBeInTheDocument();
    });
  });

  describe("form input", () => {
    it("updates title field", async () => {
      render(<CreateTaskModal {...defaultProps} />);
      const titleInput = screen.getByPlaceholderText("Task title");

      await userEvent.type(titleInput, "My New Task");
      expect(titleInput).toHaveValue("My New Task");
    });

    it("updates description field", async () => {
      render(<CreateTaskModal {...defaultProps} />);
      const descInput = screen.getByPlaceholderText("Optional description");

      await userEvent.type(descInput, "Task description here");
      expect(descInput).toHaveValue("Task description here");
    });

    it("updates due date field", async () => {
      const { container } = render(<CreateTaskModal {...defaultProps} />);
      const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.change(dateInput, { target: { value: "2024-12-31" } });
      expect(dateInput).toHaveValue("2024-12-31");
    });
  });

  describe("assignment options for supervisors", () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        effectiveIsSupervisorOrAdmin: true,
      });
    });

    it("shows assignment type buttons for supervisors", () => {
      render(<CreateTaskModal {...defaultProps} />);

      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Squad")).toBeInTheDocument();
      expect(screen.getByText("Department")).toBeInTheDocument();
    });

    it("shows user dropdown when user assignment is selected", () => {
      render(<CreateTaskModal {...defaultProps} />);

      // User is selected by default
      expect(screen.getByText("Select a user (optional)")).toBeInTheDocument();
    });

    it("shows squad dropdown when squad assignment is selected", async () => {
      render(<CreateTaskModal {...defaultProps} />);

      fireEvent.click(screen.getByText("Squad"));

      await waitFor(() => {
        expect(screen.getByText("Select a squad")).toBeInTheDocument();
      });
    });

    it("shows department dropdown when department assignment is selected", async () => {
      render(<CreateTaskModal {...defaultProps} />);

      fireEvent.click(screen.getByText("Department"));

      await waitFor(() => {
        expect(screen.getByText("Select a department")).toBeInTheDocument();
      });
    });
  });

  describe("assignment options hidden for employees", () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        effectiveIsSupervisorOrAdmin: false,
      });
    });

    it("does not show assignment type buttons for regular employees", () => {
      render(<CreateTaskModal {...defaultProps} />);

      expect(screen.queryByText("User")).not.toBeInTheDocument();
      expect(screen.queryByText("Squad")).not.toBeInTheDocument();
      expect(screen.queryByText("Department")).not.toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("shows error when title is empty", async () => {
      render(<CreateTaskModal {...defaultProps} />);

      // Submit without filling title
      fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeInTheDocument();
      });
    });

    it("shows error when due date is empty", async () => {
      const { container } = render(<CreateTaskModal {...defaultProps} />);

      // Fill title
      await userEvent.type(screen.getByPlaceholderText("Task title"), "Test Task");

      // Clear due date
      const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: "" } });

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

      await waitFor(() => {
        expect(screen.getByText("Due date is required")).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("submits form with correct data", async () => {
      render(<CreateTaskModal {...defaultProps} />);

      // Fill out form
      await userEvent.type(screen.getByPlaceholderText("Task title"), "Test Task");

      // Submit form
      fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

      await waitFor(() => {
        expect(mockCreateTaskAction).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Test Task",
            assignment_type: "user",
          })
        );
      });
    });

    it("calls onCreated callback on success", async () => {
      const onCreated = jest.fn();
      render(<CreateTaskModal {...defaultProps} onCreated={onCreated} />);

      await userEvent.type(screen.getByPlaceholderText("Task title"), "Test Task");
      fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalled();
      });
    });

    it("shows error message on failure", async () => {
      mockCreateTaskAction.mockResolvedValue({
        success: false,
        error: "Failed to create task",
      });

      render(<CreateTaskModal {...defaultProps} />);

      await userEvent.type(screen.getByPlaceholderText("Task title"), "Test Task");
      fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create task")).toBeInTheDocument();
      });
    });
  });

  describe("close and reset", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<CreateTaskModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalled();
    });

    it("resets form when closed and reopened", async () => {
      const { rerender } = render(<CreateTaskModal {...defaultProps} />);

      // Fill out some fields
      await userEvent.type(screen.getByPlaceholderText("Task title"), "Test Task");

      // Close modal
      fireEvent.click(screen.getByText("Cancel"));

      // Reopen modal
      rerender(<CreateTaskModal {...defaultProps} isOpen={false} />);
      rerender(<CreateTaskModal {...defaultProps} isOpen={true} />);

      // Field should be empty
      expect(screen.getByPlaceholderText("Task title")).toHaveValue("");
    });
  });
});
