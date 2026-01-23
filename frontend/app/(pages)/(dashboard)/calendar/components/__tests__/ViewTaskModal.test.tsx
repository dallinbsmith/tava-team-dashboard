/**
 * Tests for calendar/components/ViewTaskModal.tsx
 * Task viewing modal with edit and delete capabilities
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ViewTaskModal from "../ViewTaskModal";

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
    if (formatStr === "MMM d, yyyy") {
      return `${month} ${day}, ${year}`;
    }
    if (formatStr === "MMM d, yyyy 'at' h:mm a") {
      return `${month} ${day}, ${year} at 12:00 AM`;
    }
    return `${month} ${day}, ${year}`;
  },
}));

// Mock actions - component uses getTask, updateTaskAction, deleteTaskAction
const mockGetTask = jest.fn();
const mockUpdateTaskAction = jest.fn();
const mockDeleteTaskAction = jest.fn();

jest.mock("../../actions", () => ({
  getTask: (id: number) => mockGetTask(id),
  updateTaskAction: (id: number, data: unknown) =>
    mockUpdateTaskAction(id, data),
  deleteTaskAction: (id: number) => mockDeleteTaskAction(id),
}));

// Mock OrganizationProvider
jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => ({
    allUsers: [{ id: 1, first_name: "John", last_name: "Doe" }],
    squads: [{ id: 1, name: "Frontend" }],
    departments: ["Engineering"],
  }),
}));

// Mock CurrentUserProvider
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => ({
    currentUser: { id: 1, role: "admin" },
    effectiveIsSupervisorOrAdmin: true,
  }),
}));

describe("ViewTaskModal", () => {
  const mockTask = {
    id: 1,
    title: "Test Task",
    description: "Task description",
    due_date: "2024-01-20T00:00:00Z",
    status: "pending",
    assignment_type: "user",
    assigned_user_id: 1,
    created_by_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    taskId: 1,
    onUpdated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTask.mockResolvedValue(mockTask);
    mockUpdateTaskAction.mockResolvedValue({ success: true, data: mockTask });
    mockDeleteTaskAction.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<ViewTaskModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("displays task details after loading", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
        expect(screen.getByText("Task description")).toBeInTheDocument();
      });
    });

    it("displays task status", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Pending")).toBeInTheDocument();
      });
    });

    it("displays assigned user", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows not found when task load fails", async () => {
      mockGetTask.mockRejectedValue(new Error("Not found"));

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Task not found")).toBeInTheDocument();
      });
    });
  });

  describe("edit mode", () => {
    it("shows edit button for task creator", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });
    });

    it("enters edit mode when edit button is clicked", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Task"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
      });
    });

    it("saves changes when save is clicked", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Task"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
      });

      // Change title
      const titleInput = screen.getByDisplayValue("Test Task");
      fireEvent.change(titleInput, { target: { value: "Updated Task" } });

      // Save
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(mockUpdateTaskAction).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ title: "Updated Task" }),
        );
      });
    });

    it("cancels edit mode when cancel is clicked", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Task"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        // Should be back in view mode
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });
    });
  });

  describe("delete functionality", () => {
    it("shows delete button for task creator", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    it("shows confirmation when delete is clicked", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(
          screen.getByText(/Are you sure you want to delete this task/i),
        ).toBeInTheDocument();
      });
    });

    it("deletes task when confirmed", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Delete Task")).toBeInTheDocument();
      });

      // Click the confirm delete button
      const deleteButtons = screen.getAllByText("Delete Task");
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockDeleteTaskAction).toHaveBeenCalledWith(1);
      });
    });

    it("cancels delete when cancel is clicked", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("status display", () => {
    it("shows pending status with correct label", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Pending")).toBeInTheDocument();
      });
    });

    it("shows in_progress status correctly", async () => {
      mockGetTask.mockResolvedValue({ ...mockTask, status: "in_progress" });

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("In Progress")).toBeInTheDocument();
      });
    });

    it("shows completed status correctly", async () => {
      mockGetTask.mockResolvedValue({ ...mockTask, status: "completed" });

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Completed")).toBeInTheDocument();
      });
    });
  });

  describe("assignment display", () => {
    it("shows user assignment", async () => {
      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("shows squad assignment", async () => {
      mockGetTask.mockResolvedValue({
        ...mockTask,
        assignment_type: "squad",
        assigned_user_id: undefined,
        assigned_squad_id: 1,
      });

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Frontend")).toBeInTheDocument();
      });
    });

    it("shows department assignment", async () => {
      mockGetTask.mockResolvedValue({
        ...mockTask,
        assignment_type: "department",
        assigned_user_id: undefined,
        assigned_department: "Engineering",
      });

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Engineering")).toBeInTheDocument();
      });
    });

    it("shows unassigned when no assignment", async () => {
      mockGetTask.mockResolvedValue({
        ...mockTask,
        assignment_type: "user",
        assigned_user_id: undefined,
      });

      render(<ViewTaskModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Unassigned")).toBeInTheDocument();
      });
    });
  });
});
