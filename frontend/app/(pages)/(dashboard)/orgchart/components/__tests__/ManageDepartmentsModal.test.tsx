/**
 * Tests for orgchart/components/ManageDepartmentsModal.tsx
 * Department management modal with rename and delete functionality
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ManageDepartmentsModal from "../ManageDepartmentsModal";
import * as api from "@/lib/api";
import { User } from "@/shared/types/user";

// Mock the hooks
jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: jest.fn(),
}));
import { useOrganization } from "@/providers/OrganizationProvider";
const mockUseOrganization = useOrganization as jest.MockedFunction<
  typeof useOrganization
>;

jest.mock("@/hooks", () => ({
  useDeleteDepartment: jest.fn(),
  useRenameDepartment: jest.fn(),
}));
import { useDeleteDepartment, useRenameDepartment } from "@/hooks";
const mockUseDeleteDepartment = useDeleteDepartment as jest.MockedFunction<
  typeof useDeleteDepartment
>;
const mockUseRenameDepartment = useRenameDepartment as jest.MockedFunction<
  typeof useRenameDepartment
>;

// Mock API
jest.mock("@/lib/api", () => ({
  getUsersByDepartment: jest.fn(),
}));
const mockGetUsersByDepartment =
  api.getUsersByDepartment as jest.MockedFunction<
    typeof api.getUsersByDepartment
  >;

// Mock Avatar component
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar() {
    return <div data-testid="avatar">Avatar</div>;
  };
});

// Mock ConfirmModal
jest.mock("@/components", () => ({
  ...jest.requireActual("@/components"),
  ConfirmModal: ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-modal">
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    );
  },
}));

// Test fixtures
const mockDepartments = ["Engineering", "Product", "Design"];

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "John",
  last_name: "Doe",
  role: "employee",
  title: "Engineer",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const mockUsers: User[] = [
  createMockUser({
    id: 1,
    first_name: "John",
    last_name: "Doe",
    title: "Senior Engineer",
  }),
  createMockUser({
    id: 2,
    first_name: "Jane",
    last_name: "Smith",
    title: "Engineer",
  }),
];

// Create QueryClient for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("ManageDepartmentsModal", () => {
  let queryClient: QueryClient;
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onDepartmentsChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Default mock implementations
    mockUseOrganization.mockReturnValue({
      departments: mockDepartments,
      loading: false,
      squads: [],
      employees: [],
      refetchDepartments: jest.fn(),
      refetchSquads: jest.fn(),
      refetchEmployees: jest.fn(),
      refetchAll: jest.fn(),
    });

    mockUseDeleteDepartment.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: jest.fn(),
      status: "idle",
      variables: undefined,
      isIdle: true,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });

    mockUseRenameDepartment.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: jest.fn(),
      status: "idle",
      variables: undefined,
      isIdle: true,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    });

    mockGetUsersByDepartment.mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText("Manage Departments")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ManageDepartmentsModal {...defaultProps} isOpen={false} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.queryByText("Manage Departments")).not.toBeInTheDocument();
    });

    it("renders all departments", () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(screen.getByText("Product")).toBeInTheDocument();
      expect(screen.getByText("Design")).toBeInTheDocument();
    });

    it("renders loading state", () => {
      mockUseOrganization.mockReturnValue({
        departments: [],
        loading: true,
        squads: [],
        employees: [],
        refetchDepartments: jest.fn(),
        refetchSquads: jest.fn(),
        refetchEmployees: jest.fn(),
        refetchAll: jest.fn(),
      });

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText("Loading departments...")).toBeInTheDocument();
    });

    it("renders empty state when no departments", () => {
      mockUseOrganization.mockReturnValue({
        departments: [],
        loading: false,
        squads: [],
        employees: [],
        refetchDepartments: jest.fn(),
        refetchSquads: jest.fn(),
        refetchEmployees: jest.fn(),
        refetchAll: jest.fn(),
      });

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText(/No departments yet/)).toBeInTheDocument();
    });

    it("renders informational text about department creation", () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(
        screen.getByText(
          /Departments are created by assigning them to employees/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("close behavior", () => {
    it("calls onClose when close button clicked", () => {
      const onClose = jest.fn();
      render(<ManageDepartmentsModal {...defaultProps} onClose={onClose} />, {
        wrapper: createWrapper(queryClient),
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when backdrop clicked", () => {
      const onClose = jest.fn();
      const { container } = render(
        <ManageDepartmentsModal {...defaultProps} onClose={onClose} />,
        {
          wrapper: createWrapper(queryClient),
        },
      );

      const backdrop = container.querySelector(
        ".absolute.inset-0.bg-black\\/50",
      );
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("delete functionality", () => {
    it("opens confirmation modal when delete button clicked", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Find the delete button for Engineering (first department alphabetically is Design, then Engineering, then Product)
      const deleteButtons = screen.getAllByTitle("Delete department");
      fireEvent.click(deleteButtons[1]); // Engineering is second after Design

      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete "Engineering"/),
      ).toBeInTheDocument();
    });

    it("calls delete mutation when confirmed", async () => {
      const mockMutate = jest.fn();
      mockUseDeleteDepartment.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: jest.fn(),
        status: "idle",
        variables: undefined,
        isIdle: true,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      });

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click delete for Engineering
      const deleteButtons = screen.getAllByTitle("Delete department");
      fireEvent.click(deleteButtons[1]); // Engineering

      // Confirm deletion
      fireEvent.click(screen.getByText("Confirm"));

      expect(mockMutate).toHaveBeenCalledWith(
        "Engineering",
        expect.any(Object),
      );
    });
  });

  describe("rename functionality", () => {
    it("enters edit mode when pencil button clicked", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click edit for Engineering
      const editButtons = screen.getAllByTitle("Rename department");
      fireEvent.click(editButtons[1]); // Engineering

      // Should show an input with the current name
      expect(screen.getByDisplayValue("Engineering")).toBeInTheDocument();
    });

    it("calls rename mutation when saved", async () => {
      const mockMutate = jest.fn();
      mockUseRenameDepartment.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: jest.fn(),
        status: "idle",
        variables: undefined,
        isIdle: true,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      });

      const user = userEvent.setup();
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click edit for Engineering
      const editButtons = screen.getAllByTitle("Rename department");
      fireEvent.click(editButtons[1]); // Engineering

      // Clear and type new name
      const input = screen.getByDisplayValue("Engineering");
      await user.clear(input);
      await user.type(input, "Product Engineering");

      // Click save
      fireEvent.click(screen.getByTitle("Save"));

      expect(mockMutate).toHaveBeenCalledWith(
        { oldName: "Engineering", newName: "Product Engineering" },
        expect.any(Object),
      );
    });

    it("cancels edit when cancel button clicked", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click edit for Engineering
      const editButtons = screen.getAllByTitle("Rename department");
      fireEvent.click(editButtons[1]); // Engineering

      // Should show input
      expect(screen.getByDisplayValue("Engineering")).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByTitle("Cancel"));

      // Should exit edit mode
      expect(screen.queryByDisplayValue("Engineering")).not.toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    it("cancels edit on Escape key", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click edit for Engineering
      const editButtons = screen.getAllByTitle("Rename department");
      fireEvent.click(editButtons[1]);

      const input = screen.getByDisplayValue("Engineering");
      fireEvent.keyDown(input, { key: "Escape" });

      // Should exit edit mode
      expect(screen.queryByDisplayValue("Engineering")).not.toBeInTheDocument();
    });

    it("saves on Enter key", async () => {
      const mockMutate = jest.fn();
      mockUseRenameDepartment.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: jest.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: jest.fn(),
        status: "idle",
        variables: undefined,
        isIdle: true,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      });

      const user = userEvent.setup();
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename department");
      fireEvent.click(editButtons[1]);

      const input = screen.getByDisplayValue("Engineering");
      await user.clear(input);
      await user.type(input, "Product Engineering{Enter}");

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe("user list functionality", () => {
    it("expands to show users when department clicked", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click on Engineering department row to expand
      fireEvent.click(screen.getByText("Engineering"));

      await waitFor(() => {
        expect(mockGetUsersByDepartment).toHaveBeenCalledWith("Engineering");
      });

      // Check for user titles which are unique
      await waitFor(() => {
        expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
        expect(screen.getByText("Engineer")).toBeInTheDocument();
      });
    });

    it("collapses user list when department clicked again", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click to expand
      fireEvent.click(screen.getByText("Engineering"));

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
      });

      // Click again to collapse
      fireEvent.click(screen.getByText("Engineering"));

      await waitFor(() => {
        expect(screen.queryByText("Senior Engineer")).not.toBeInTheDocument();
      });
    });

    it("shows empty state when department has no users", async () => {
      mockGetUsersByDepartment.mockResolvedValue([]);

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Engineering"));

      await waitFor(() => {
        expect(
          screen.getByText("No users in this department"),
        ).toBeInTheDocument();
      });
    });

    it("shows loading state while fetching users", async () => {
      mockGetUsersByDepartment.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockUsers), 100)),
      );

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Engineering"));

      expect(screen.getByText("Loading users...")).toBeInTheDocument();
    });

    it("shows user count after loading", async () => {
      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Engineering"));

      await waitFor(() => {
        expect(screen.getByText("(2 users)")).toBeInTheDocument();
      });
    });
  });

  describe("disabled states", () => {
    it("disables edit button while mutation is pending", () => {
      mockUseDeleteDepartment.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: jest.fn(),
        status: "pending",
        variables: undefined,
        isIdle: false,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      });

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename department");
      editButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("disables delete button while mutation is pending", () => {
      mockUseRenameDepartment.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        reset: jest.fn(),
        status: "pending",
        variables: undefined,
        isIdle: false,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: 0,
      });

      render(<ManageDepartmentsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const deleteButtons = screen.getAllByTitle("Delete department");
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
