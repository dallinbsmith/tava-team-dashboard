/**
 * Tests for components/CreateEmployeeModal.tsx
 * Employee creation form modal with squads and department selection
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateEmployeeModal } from "../CreateEmployeeModal";
import * as graphql from "@/lib/graphql";
import { User, Squad } from "@/shared/types/user";

// Mock the GraphQL API
jest.mock("@/lib/graphql", () => ({
  createEmployeeGraphQL: jest.fn(),
}));
const mockCreateEmployee = graphql.createEmployeeGraphQL as jest.MockedFunction<
  typeof graphql.createEmployeeGraphQL
>;

// Mock the error parsing
jest.mock("@/lib/errors", () => ({
  parseErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  parseSquadErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

// Test fixtures
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

const mockSquads: Squad[] = [
  { id: 1, name: "Frontend Team" },
  { id: 2, name: "Backend Team" },
  { id: 3, name: "DevOps Team" },
];

const mockDepartments = ["Engineering", "Product", "Design", "Marketing"];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onCreated: jest.fn(),
  squads: mockSquads,
  departments: mockDepartments,
  onAddSquad: jest.fn().mockResolvedValue({ id: 4, name: "New Squad" }),
};

describe("CreateEmployeeModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = "";
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<CreateEmployeeModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders modal title", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      expect(screen.getByText("Add New Employee")).toBeInTheDocument();
    });

    it("renders form fields", () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      expect(screen.getByPlaceholderText("employee@company.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Doe")).toBeInTheDocument();
      expect(screen.getByText(/start date/i)).toBeInTheDocument();
    });

    it("renders cancel and submit buttons", () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Add Employee")).toBeInTheDocument();
    });

    it("renders role selection buttons", () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      expect(screen.getByText("Employee")).toBeInTheDocument();
      expect(screen.getByText("Supervisor")).toBeInTheDocument();
    });
  });

  describe("form input", () => {
    it("updates email field", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText("employee@company.com");

      await userEvent.type(emailInput, "john@example.com");
      expect(emailInput).toHaveValue("john@example.com");
    });

    it("updates first name field", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const firstNameInput = screen.getByPlaceholderText("John");

      await userEvent.type(firstNameInput, "Jane");
      expect(firstNameInput).toHaveValue("Jane");
    });

    it("updates last name field", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const lastNameInput = screen.getByPlaceholderText("Doe");

      await userEvent.type(lastNameInput, "Smith");
      expect(lastNameInput).toHaveValue("Smith");
    });

    it("updates start date field", async () => {
      const { container } = render(<CreateEmployeeModal {...defaultProps} />);
      const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      expect(dateInput).toHaveValue("2024-01-15");
    });
  });

  describe("department dropdown", () => {
    it("opens department dropdown on click", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      const departmentButton = screen.getByText("Select department...");
      fireEvent.click(departmentButton);

      // Should show department options
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(screen.getByText("Product")).toBeInTheDocument();
    });

    it("closes department dropdown on selection", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      const departmentButton = screen.getByText("Select department...");
      fireEvent.click(departmentButton);

      // Select a department
      fireEvent.click(screen.getByText("Engineering"));

      // Dropdown options should not be visible (search input is only in dropdown)
      expect(screen.queryByPlaceholderText("Search or create department...")).not.toBeInTheDocument();
    });

    it("filters departments by search", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select department..."));

      // Search for "Eng"
      const searchInput = screen.getByPlaceholderText("Search or create department...");
      await userEvent.type(searchInput, "Eng");

      // Should show Engineering, not others
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Product" })).not.toBeInTheDocument();
    });

    it("shows create option for new department", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select department..."));

      // Type new department name
      const searchInput = screen.getByPlaceholderText("Search or create department...");
      await userEvent.type(searchInput, "HR");

      // Should show create option
      expect(screen.getByText(/Create "HR"/)).toBeInTheDocument();
    });

    it("creates new department when selected", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select department..."));

      // Type new department name
      const searchInput = screen.getByPlaceholderText("Search or create department...");
      await userEvent.type(searchInput, "HR");

      // Click create option
      fireEvent.click(screen.getByText(/Create "HR"/));

      // Button should now show the selected department
      expect(screen.getByText("HR")).toBeInTheDocument();
    });
  });

  describe("squad multi-select", () => {
    it("opens squad dropdown on click", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      const squadButton = screen.getByText("Select squads...");
      fireEvent.click(squadButton);

      // Should show squad checkboxes
      expect(screen.getByText("Frontend Team")).toBeInTheDocument();
      expect(screen.getByText("Backend Team")).toBeInTheDocument();
    });

    it("selects a squad", async () => {
      const { container } = render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Find and click the checkbox for Frontend Team
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      fireEvent.click(checkboxes[0]);

      // Should show selected count and chip
      expect(screen.getByText("1 squad(s) selected")).toBeInTheDocument();
    });

    it("removes squad from chips", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Select Frontend Team
      const frontendLabel = screen.getAllByText("Frontend Team").find(el => el.closest("label"));
      fireEvent.click(frontendLabel!);

      // Close dropdown
      fireEvent.click(screen.getByText("1 squad(s) selected"));

      // Find the chip's X button
      const chip = screen.getByText("Frontend Team").closest("span");
      const removeButton = chip?.querySelector("button");
      fireEvent.click(removeButton!);

      // Should show select squads text again
      expect(screen.getByText("Select squads...")).toBeInTheDocument();
    });

    it("creates new squad", async () => {
      const onAddSquad = jest.fn().mockResolvedValue({ id: 5, name: "New Team" });
      render(<CreateEmployeeModal {...defaultProps} onAddSquad={onAddSquad} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Type new squad name
      const newSquadInput = screen.getByPlaceholderText("New squad name...");
      await userEvent.type(newSquadInput, "New Team");

      // Click add button
      const addButton = screen.getAllByRole("button").find(
        btn => btn.querySelector("svg")?.classList.contains("lucide-plus") && btn.closest(".border-t")
      );
      fireEvent.click(addButton!);

      await waitFor(() => {
        expect(onAddSquad).toHaveBeenCalledWith("New Team");
      });
    });

    it("creates new squad on Enter key", async () => {
      const onAddSquad = jest.fn().mockResolvedValue({ id: 5, name: "Team Alpha" });
      render(<CreateEmployeeModal {...defaultProps} onAddSquad={onAddSquad} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Type new squad name and press Enter
      const newSquadInput = screen.getByPlaceholderText("New squad name...");
      await userEvent.type(newSquadInput, "Team Alpha{enter}");

      await waitFor(() => {
        expect(onAddSquad).toHaveBeenCalledWith("Team Alpha");
      });
    });
  });

  describe("role selection", () => {
    it("defaults to employee role", () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      const employeeButton = screen.getByText("Employee").closest("button");
      expect(employeeButton).toHaveClass("border-primary-500");
    });

    it("can switch to supervisor role", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      const supervisorButton = screen.getByText("Supervisor").closest("button");
      fireEvent.click(supervisorButton!);

      expect(supervisorButton).toHaveClass("border-primary-500");
    });

    it("can switch back to employee role", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Switch to supervisor
      const supervisorButton = screen.getByText("Supervisor").closest("button");
      fireEvent.click(supervisorButton!);

      // Switch back to employee
      const employeeButton = screen.getByText("Employee").closest("button");
      fireEvent.click(employeeButton!);

      expect(employeeButton).toHaveClass("border-primary-500");
    });
  });

  describe("form submission", () => {
    it("submits form with correct data", async () => {
      const createdUser = createMockUser({
        email: "new@example.com",
        first_name: "New",
        last_name: "Employee",
      });
      mockCreateEmployee.mockResolvedValue(createdUser);

      render(<CreateEmployeeModal {...defaultProps} />);

      // Fill out form
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "new@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "New");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "Employee");

      // Submit form
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(mockCreateEmployee).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "new@example.com",
            first_name: "New",
            last_name: "Employee",
            role: "employee",
          })
        );
      });
    });

    it("shows loading state while creating", async () => {
      mockCreateEmployee.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockUser()), 100))
      );

      render(<CreateEmployeeModal {...defaultProps} />);

      // Fill out required fields
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "User");

      // Submit form
      fireEvent.click(screen.getByText("Add Employee"));

      // Should show loading text
      expect(screen.getByText("Creating...")).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText("Creating...")).not.toBeInTheDocument();
      });
    });

    it("calls onCreated callback on success", async () => {
      const createdUser = createMockUser();
      const onCreated = jest.fn();
      mockCreateEmployee.mockResolvedValue(createdUser);

      render(<CreateEmployeeModal {...defaultProps} onCreated={onCreated} />);

      // Fill out form
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "User");

      // Submit form
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(createdUser);
      });
    });

    it("shows success screen after creation", async () => {
      const createdUser = createMockUser({
        first_name: "John",
        last_name: "Doe",
      });
      mockCreateEmployee.mockResolvedValue(createdUser);

      render(<CreateEmployeeModal {...defaultProps} />);

      // Fill out form
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "John");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "Doe");

      // Submit form
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(screen.getByText("Employee Created!")).toBeInTheDocument();
      });

      expect(screen.getByText(/John Doe has been added/)).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("closes success screen on Done click", async () => {
      const createdUser = createMockUser();
      const onClose = jest.fn();
      mockCreateEmployee.mockResolvedValue(createdUser);

      render(<CreateEmployeeModal {...defaultProps} onClose={onClose} />);

      // Fill out form and submit
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "User");
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(screen.getByText("Done")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Done"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("shows error message on creation failure", async () => {
      mockCreateEmployee.mockRejectedValue(new Error("User already exists"));

      render(<CreateEmployeeModal {...defaultProps} />);

      // Fill out form
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "existing@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "User");

      // Submit form
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(screen.getByText("User already exists")).toBeInTheDocument();
      });
    });

    it("shows error message on squad creation failure", async () => {
      const onAddSquad = jest.fn().mockRejectedValue(new Error("Squad already exists"));
      render(<CreateEmployeeModal {...defaultProps} onAddSquad={onAddSquad} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Type new squad name and try to add
      const newSquadInput = screen.getByPlaceholderText("New squad name...");
      await userEvent.type(newSquadInput, "Existing Squad{enter}");

      await waitFor(() => {
        expect(screen.getByText(/Squad already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe("close and reset", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<CreateEmployeeModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalled();
    });

    it("resets form when closed and reopened", async () => {
      const { rerender } = render(<CreateEmployeeModal {...defaultProps} />);

      // Fill out some fields
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");

      // Close modal
      fireEvent.click(screen.getByText("Cancel"));

      // Reopen modal
      rerender(<CreateEmployeeModal {...defaultProps} isOpen={false} />);
      rerender(<CreateEmployeeModal {...defaultProps} isOpen={true} />);

      // Fields should be empty
      expect(screen.getByPlaceholderText("employee@company.com")).toHaveValue("");
      expect(screen.getByPlaceholderText("John")).toHaveValue("");
    });

    it("clears error on close", async () => {
      mockCreateEmployee.mockRejectedValue(new Error("Some error"));

      const { rerender } = render(<CreateEmployeeModal {...defaultProps} />);

      // Trigger error
      await userEvent.type(screen.getByPlaceholderText("employee@company.com"), "test@example.com");
      await userEvent.type(screen.getByPlaceholderText("John"), "Test");
      await userEvent.type(screen.getByPlaceholderText("Doe"), "User");
      fireEvent.click(screen.getByText("Add Employee"));

      await waitFor(() => {
        expect(screen.getByText("Some error")).toBeInTheDocument();
      });

      // Close and reopen
      fireEvent.click(screen.getByText("Cancel"));
      rerender(<CreateEmployeeModal {...defaultProps} isOpen={false} />);
      rerender(<CreateEmployeeModal {...defaultProps} isOpen={true} />);

      // Error should be gone
      expect(screen.queryByText("Some error")).not.toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("email field has required attribute", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText("employee@company.com");
      expect(emailInput).toHaveAttribute("required");
    });

    it("first name field has required attribute", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const firstNameInput = screen.getByPlaceholderText("John");
      expect(firstNameInput).toHaveAttribute("required");
    });

    it("last name field has required attribute", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const lastNameInput = screen.getByPlaceholderText("Doe");
      expect(lastNameInput).toHaveAttribute("required");
    });

    it("email field has type email", () => {
      render(<CreateEmployeeModal {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText("employee@company.com");
      expect(emailInput).toHaveAttribute("type", "email");
    });
  });

  describe("empty states", () => {
    it("shows message when no departments and no search", () => {
      render(<CreateEmployeeModal {...defaultProps} departments={[]} />);

      // Open department dropdown
      fireEvent.click(screen.getByText("Select department..."));

      expect(screen.getByText("Type to create a new department")).toBeInTheDocument();
    });
  });

  describe("selected squads display", () => {
    it("shows selected squads as chips above dropdown", async () => {
      render(<CreateEmployeeModal {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByText("Select squads..."));

      // Select two squads
      const frontendLabel = screen.getAllByText("Frontend Team").find(el => el.closest("label"));
      const backendLabel = screen.getAllByText("Backend Team").find(el => el.closest("label"));

      fireEvent.click(frontendLabel!);
      fireEvent.click(backendLabel!);

      // Check chips are displayed (there should be span elements with the squad names)
      const chips = document.querySelectorAll("span.inline-flex");
      expect(chips.length).toBeGreaterThanOrEqual(2);
    });
  });
});
