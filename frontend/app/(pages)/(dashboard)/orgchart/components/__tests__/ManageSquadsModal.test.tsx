/**
 * Tests for orgchart/components/ManageSquadsModal.tsx
 * Squad management modal with create, rename, and delete functionality
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ManageSquadsModal from "../ManageSquadsModal";
import * as api from "@/lib/api";
import { User, Squad } from "@/shared/types/user";

// Mock the hooks
jest.mock("@/hooks", () => ({
  useSquadsQuery: jest.fn(),
}));
import { useSquadsQuery } from "@/hooks";
const mockUseSquadsQuery = useSquadsQuery as jest.MockedFunction<typeof useSquadsQuery>;

// Mock API
jest.mock("@/lib/api", () => ({
  getUsersBySquad: jest.fn(),
}));
const mockGetUsersBySquad = api.getUsersBySquad as jest.MockedFunction<typeof api.getUsersBySquad>;

// Mock Avatar component
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar() {
    return <div data-testid="avatar">Avatar</div>;
  };
});

// Mock ConfirmModal from @/components
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
const mockSquads: Squad[] = [
  { id: 1, name: "Frontend Team" },
  { id: 2, name: "Backend Team" },
  { id: 3, name: "DevOps Team" },
];

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "John",
  last_name: "Doe",
  role: "employee",
  title: "Engineer",
  department: "Engineering",
  squads: [{ id: 1, name: "Frontend Team" }],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const mockUsers: User[] = [
  createMockUser({ id: 1, first_name: "John", last_name: "Doe", title: "Frontend Dev" }),
  createMockUser({ id: 2, first_name: "Jane", last_name: "Smith", title: "UI Engineer" }),
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

describe("ManageSquadsModal", () => {
  let queryClient: QueryClient;
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSquadsChanged: jest.fn(),
  };

  const mockAddSquad = jest.fn();
  const mockUpdateSquad = jest.fn();
  const mockRemoveSquad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Default mock implementations
    mockUseSquadsQuery.mockReturnValue({
      squads: mockSquads,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      addSquad: mockAddSquad,
      updateSquad: mockUpdateSquad,
      removeSquad: mockRemoveSquad,
      isMutating: false,
    });

    mockGetUsersBySquad.mockResolvedValue(mockUsers);
    mockAddSquad.mockResolvedValue({ id: 4, name: "New Squad" });
    mockUpdateSquad.mockResolvedValue({ id: 1, name: "Renamed Squad" });
    mockRemoveSquad.mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText("Manage Squads")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ManageSquadsModal {...defaultProps} isOpen={false} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.queryByText("Manage Squads")).not.toBeInTheDocument();
    });

    it("renders all squads sorted alphabetically", () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      // Should be sorted: Backend Team, DevOps Team, Frontend Team
      expect(screen.getByText("Backend Team")).toBeInTheDocument();
      expect(screen.getByText("DevOps Team")).toBeInTheDocument();
      expect(screen.getByText("Frontend Team")).toBeInTheDocument();
    });

    it("renders loading state", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        addSquad: mockAddSquad,
        updateSquad: mockUpdateSquad,
        removeSquad: mockRemoveSquad,
        isMutating: false,
      });

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText("Loading squads...")).toBeInTheDocument();
    });

    it("renders empty state when no squads", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        addSquad: mockAddSquad,
        updateSquad: mockUpdateSquad,
        removeSquad: mockRemoveSquad,
        isMutating: false,
      });

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByText(/No squads yet/)).toBeInTheDocument();
    });

    it("renders add squad input", () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });
      expect(screen.getByPlaceholderText("New squad name...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });
  });

  describe("close behavior", () => {
    it("calls onClose when close button clicked", () => {
      const onClose = jest.fn();
      render(<ManageSquadsModal {...defaultProps} onClose={onClose} />, {
        wrapper: createWrapper(queryClient),
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when backdrop clicked", () => {
      const onClose = jest.fn();
      const { container } = render(<ManageSquadsModal {...defaultProps} onClose={onClose} />, {
        wrapper: createWrapper(queryClient),
      });

      const backdrop = container.querySelector(".absolute.inset-0.bg-black\\/50");
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("add squad functionality", () => {
    it("adds a new squad when form submitted", async () => {
      const onSquadsChanged = jest.fn();
      const user = userEvent.setup();

      render(<ManageSquadsModal {...defaultProps} onSquadsChanged={onSquadsChanged} />, {
        wrapper: createWrapper(queryClient),
      });

      const input = screen.getByPlaceholderText("New squad name...");
      await user.type(input, "QA Team");

      fireEvent.click(screen.getByRole("button", { name: /add/i }));

      await waitFor(() => {
        expect(mockAddSquad).toHaveBeenCalledWith("QA Team");
      });

      await waitFor(() => {
        expect(onSquadsChanged).toHaveBeenCalled();
      });
    });

    it("adds squad on Enter key", async () => {
      const user = userEvent.setup();

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const input = screen.getByPlaceholderText("New squad name...");
      await user.type(input, "QA Team{Enter}");

      await waitFor(() => {
        expect(mockAddSquad).toHaveBeenCalledWith("QA Team");
      });
    });

    it("clears input after successful add", async () => {
      const user = userEvent.setup();

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const input = screen.getByPlaceholderText("New squad name...");
      await user.type(input, "QA Team");
      fireEvent.click(screen.getByRole("button", { name: /add/i }));

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("disables add button when input is empty", () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const addButton = screen.getByRole("button", { name: /add/i });
      expect(addButton).toBeDisabled();
    });

    it("disables add button when mutation is pending", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: mockSquads,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        addSquad: mockAddSquad,
        updateSquad: mockUpdateSquad,
        removeSquad: mockRemoveSquad,
        isMutating: true,
      });

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const input = screen.getByPlaceholderText("New squad name...");
      fireEvent.change(input, { target: { value: "New Squad" } });

      const addButton = screen.getByRole("button", { name: /add/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe("delete functionality", () => {
    it("opens confirmation modal when delete button clicked", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const deleteButtons = screen.getAllByTitle("Delete squad");
      fireEvent.click(deleteButtons[2]); // Frontend Team (last alphabetically)

      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete "Frontend Team"/)
      ).toBeInTheDocument();
    });

    it("calls removeSquad when confirmed", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      // Click delete for Frontend Team
      const deleteButtons = screen.getAllByTitle("Delete squad");
      fireEvent.click(deleteButtons[2]); // Frontend Team

      // Confirm deletion
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(mockRemoveSquad).toHaveBeenCalledWith(1); // Frontend Team has id 1
      });
    });

    it("closes confirmation modal when cancelled", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const deleteButtons = screen.getAllByTitle("Delete squad");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByTestId("confirmation-modal")).not.toBeInTheDocument();
    });
  });

  describe("rename functionality", () => {
    it("enters edit mode when pencil button clicked", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[2]); // Frontend Team

      expect(screen.getByDisplayValue("Frontend Team")).toBeInTheDocument();
    });

    it("calls updateSquad when saved", async () => {
      const user = userEvent.setup();
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[2]); // Frontend Team

      const input = screen.getByDisplayValue("Frontend Team");
      await user.clear(input);
      await user.type(input, "Frontend Engineers");

      fireEvent.click(screen.getByTitle("Save"));

      await waitFor(() => {
        expect(mockUpdateSquad).toHaveBeenCalledWith(1, "Frontend Engineers");
      });
    });

    it("cancels edit when cancel button clicked", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue("Backend Team")).toBeInTheDocument();

      fireEvent.click(screen.getByTitle("Cancel"));

      expect(screen.queryByDisplayValue("Backend Team")).not.toBeInTheDocument();
      expect(screen.getByText("Backend Team")).toBeInTheDocument();
    });

    it("cancels edit on Escape key", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[0]);

      const input = screen.getByDisplayValue("Backend Team");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByDisplayValue("Backend Team")).not.toBeInTheDocument();
    });

    it("saves on Enter key", async () => {
      const user = userEvent.setup();
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[2]); // Frontend Team

      const input = screen.getByDisplayValue("Frontend Team");
      await user.clear(input);
      await user.type(input, "Frontend Engineers{Enter}");

      await waitFor(() => {
        expect(mockUpdateSquad).toHaveBeenCalled();
      });
    });

    it("does not call updateSquad if name unchanged", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[0]); // Backend Team

      fireEvent.click(screen.getByTitle("Save"));

      expect(mockUpdateSquad).not.toHaveBeenCalled();
    });
  });

  describe("user list functionality", () => {
    it("expands to show users when squad clicked", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      await waitFor(() => {
        expect(mockGetUsersBySquad).toHaveBeenCalledWith(1);
      });

      // Check for user titles which are unique
      await waitFor(() => {
        expect(screen.getByText("Frontend Dev")).toBeInTheDocument();
        expect(screen.getByText("UI Engineer")).toBeInTheDocument();
      });
    });

    it("collapses user list when squad clicked again", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText("Frontend Dev")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      await waitFor(() => {
        expect(screen.queryByText("Frontend Dev")).not.toBeInTheDocument();
      });
    });

    it("shows empty state when squad has no users", async () => {
      mockGetUsersBySquad.mockResolvedValue([]);

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      await waitFor(() => {
        expect(screen.getByText("No users in this squad")).toBeInTheDocument();
      });
    });

    it("shows loading state while fetching users", async () => {
      mockGetUsersBySquad.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUsers), 100))
      );

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      expect(screen.getByText("Loading users...")).toBeInTheDocument();
    });

    it("shows user count after loading", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      await waitFor(() => {
        expect(screen.getByText("(2 users)")).toBeInTheDocument();
      });
    });

    it("shows user titles in the list", async () => {
      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      fireEvent.click(screen.getByText("Frontend Team"));

      await waitFor(() => {
        expect(screen.getByText("Frontend Dev")).toBeInTheDocument();
        expect(screen.getByText("UI Engineer")).toBeInTheDocument();
      });
    });
  });

  describe("disabled states", () => {
    it("disables edit button while mutation is pending", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: mockSquads,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        addSquad: mockAddSquad,
        updateSquad: mockUpdateSquad,
        removeSquad: mockRemoveSquad,
        isMutating: true,
      });

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      editButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("disables delete button while mutation is pending", () => {
      mockUseSquadsQuery.mockReturnValue({
        squads: mockSquads,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        addSquad: mockAddSquad,
        updateSquad: mockUpdateSquad,
        removeSquad: mockRemoveSquad,
        isMutating: true,
      });

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const deleteButtons = screen.getAllByTitle("Delete squad");
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe("error handling", () => {
    it("shows error message when add squad fails", async () => {
      mockAddSquad.mockRejectedValue(new Error("Failed to create squad"));
      const user = userEvent.setup();

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const input = screen.getByPlaceholderText("New squad name...");
      await user.type(input, "QA Team");
      fireEvent.click(screen.getByRole("button", { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create squad/i)).toBeInTheDocument();
      });
    });

    it("shows error message when delete squad fails", async () => {
      mockRemoveSquad.mockRejectedValue(new Error("Delete failed"));

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const deleteButtons = screen.getAllByTitle("Delete squad");
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByText("Confirm"));

      await waitFor(() => {
        expect(screen.getByText("Failed to delete squad")).toBeInTheDocument();
      });
    });

    it("shows error message when rename squad fails", async () => {
      mockUpdateSquad.mockRejectedValue(new Error("Rename failed"));
      const user = userEvent.setup();

      render(<ManageSquadsModal {...defaultProps} />, {
        wrapper: createWrapper(queryClient),
      });

      const editButtons = screen.getAllByTitle("Rename squad");
      fireEvent.click(editButtons[2]); // Frontend Team

      const input = screen.getByDisplayValue("Frontend Team");
      await user.clear(input);
      await user.type(input, "Frontend Engineers");
      fireEvent.click(screen.getByTitle("Save"));

      // parseSquadErrorMessage returns a default message for unknown errors
      await waitFor(() => {
        expect(screen.getByText(/Failed to create squad/i)).toBeInTheDocument();
      });
    });
  });
});
