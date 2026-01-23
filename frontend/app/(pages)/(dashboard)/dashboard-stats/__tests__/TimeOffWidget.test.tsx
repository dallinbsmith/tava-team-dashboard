/**
 * Tests for dashboard-stats/TimeOffWidget.tsx
 * Time off widget with tabs for upcoming and pending requests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TimeOffWidget from "../TimeOffWidget";
import { TimeOffRequest } from "@/app/(pages)/(dashboard)/time-off/types";

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
const mockUseCurrentUser = jest.fn();
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// Mock time-off hooks
const mockUseMyTimeOffRequests = jest.fn();
const mockUseTeamTimeOff = jest.fn();
const mockUsePendingTimeOffRequests = jest.fn();
const mockUseReviewTimeOffRequest = jest.fn();
const mockUseCancelTimeOffRequest = jest.fn();

jest.mock("@/app/(pages)/(dashboard)/time-off/hooks", () => ({
  useMyTimeOffRequests: (status?: string) => mockUseMyTimeOffRequests(status),
  useTeamTimeOff: () => mockUseTeamTimeOff(),
  usePendingTimeOffRequests: () => mockUsePendingTimeOffRequests(),
  useReviewTimeOffRequest: () => mockUseReviewTimeOffRequest(),
  useCancelTimeOffRequest: () => mockUseCancelTimeOffRequest(),
}));

// Mock Avatar
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
  }) {
    return <div data-testid="avatar">{firstName[0]}{lastName[0]}</div>;
  };
});

// Mock Pagination
jest.mock("@/shared/common/Pagination", () => {
  return function MockPagination({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) {
    return totalPages > 1 ? (
      <div data-testid="pagination">
        <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
      </div>
    ) : null;
  };
});

// Mock constants
jest.mock("@/lib/constants", () => ({
  PAGINATION: {
    TIME_OFF: 5,
  },
}));

// Mock date-fns to control date comparisons
const mockToday = new Date("2024-12-15");
jest.mock("date-fns", () => {
  const actualDateFns = jest.requireActual("date-fns");
  return {
    ...actualDateFns,
    startOfDay: () => mockToday,
  };
});

describe("TimeOffWidget", () => {
  // Use dates relative to mockToday (2024-12-15)
  const createMockRequest = (overrides: Partial<TimeOffRequest> = {}): TimeOffRequest => ({
    id: 1,
    user_id: 1,
    request_type: "vacation",
    start_date: "2024-12-20",
    end_date: "2024-12-25",
    status: "approved",
    reason: "Holiday",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user: {
      id: 1,
      first_name: "John",
      last_name: "Doe",
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default to employee user
    mockUseCurrentUser.mockReturnValue({
      currentUser: {
        id: 1,
        first_name: "Test",
        last_name: "User",
        role: "employee",
      },
    });

    // Default hook responses
    mockUseMyTimeOffRequests.mockImplementation((status) => ({
      data: status === "approved" ? [createMockRequest()] : [],
      isLoading: false,
    }));

    mockUseTeamTimeOff.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUsePendingTimeOffRequests.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseReviewTimeOffRequest.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
    });

    mockUseCancelTimeOffRequest.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
    });
  });

  describe("rendering", () => {
    it("renders widget title", () => {
      render(<TimeOffWidget />);
      expect(screen.getByText("Time Off")).toBeInTheDocument();
    });

    it("renders tab buttons", () => {
      render(<TimeOffWidget />);
      expect(screen.getByText(/Upcoming/)).toBeInTheDocument();
      expect(screen.getByText(/Pending/)).toBeInTheDocument();
    });

    it("renders view all link", () => {
      render(<TimeOffWidget />);
      const link = screen.getByText(/View all time off/);
      expect(link.closest("a")).toHaveAttribute("href", "/time-off");
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      mockUseMyTimeOffRequests.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<TimeOffWidget />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("shows empty state for upcoming when no requests", () => {
      mockUseMyTimeOffRequests.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<TimeOffWidget />);
      expect(screen.getByText("No upcoming time off")).toBeInTheDocument();
    });

    it("shows empty state for pending when no requests", () => {
      mockUseMyTimeOffRequests.mockImplementation((status) => ({
        data: [],
        isLoading: false,
      }));

      render(<TimeOffWidget />);

      // Switch to pending tab
      fireEvent.click(screen.getByText(/Pending/));

      expect(screen.getByText("No pending requests")).toBeInTheDocument();
    });
  });

  describe("upcoming tab", () => {
    it("shows upcoming time off requests", () => {
      render(<TimeOffWidget />);

      // The component displays the user from the request object
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Vacation")).toBeInTheDocument();
    });

    it("shows count badge when requests exist", () => {
      render(<TimeOffWidget />);
      // Count badge shows in the Upcoming tab button
      const upcomingBadges = screen.getAllByText("1");
      expect(upcomingBadges.length).toBeGreaterThan(0);
    });
  });

  describe("pending tab", () => {
    it("switches to pending tab when clicked", () => {
      mockUseMyTimeOffRequests.mockImplementation((status) => ({
        data: status === "pending" ? [createMockRequest({ status: "pending" })] : [],
        isLoading: false,
      }));

      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));

      expect(screen.getByText("Vacation")).toBeInTheDocument();
    });

    it("shows cancel button for employee pending requests", async () => {
      mockUseMyTimeOffRequests.mockImplementation((status) => ({
        data: status === "pending" ? [createMockRequest({ status: "pending" })] : [],
        isLoading: false,
      }));

      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));

      expect(screen.getByTitle("Cancel request")).toBeInTheDocument();
    });

    it("calls cancel mutation when cancel is clicked", async () => {
      const mockCancel = jest.fn().mockResolvedValue({});
      mockUseCancelTimeOffRequest.mockReturnValue({
        mutateAsync: mockCancel,
      });

      mockUseMyTimeOffRequests.mockImplementation((status) => ({
        data: status === "pending" ? [createMockRequest({ id: 42, status: "pending" })] : [],
        isLoading: false,
      }));

      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));
      fireEvent.click(screen.getByTitle("Cancel request"));

      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalledWith(42);
      });
    });
  });

  describe("supervisor view", () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: {
          id: 1,
          first_name: "Super",
          last_name: "Visor",
          role: "supervisor",
        },
      });

      mockUseTeamTimeOff.mockReturnValue({
        data: [createMockRequest()],
        isLoading: false,
      });

      mockUsePendingTimeOffRequests.mockReturnValue({
        data: [createMockRequest({ id: 2, status: "pending" })],
        isLoading: false,
      });
    });

    it("shows team time off for supervisors", () => {
      render(<TimeOffWidget />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("shows approve/reject buttons for pending requests", () => {
      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));

      expect(screen.getByTitle("Approve")).toBeInTheDocument();
      expect(screen.getByTitle("Reject")).toBeInTheDocument();
    });

    it("shows bulk action buttons when requests selected", () => {
      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));

      // Click select all
      fireEvent.click(screen.getByText("Select All"));

      expect(screen.getByText(/Approve \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Reject \(1\)/)).toBeInTheDocument();
    });

    it("calls review mutation when approve is clicked", async () => {
      const mockReview = jest.fn().mockResolvedValue({});
      mockUseReviewTimeOffRequest.mockReturnValue({
        mutateAsync: mockReview,
      });

      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));
      fireEvent.click(screen.getByTitle("Approve"));

      await waitFor(() => {
        expect(mockReview).toHaveBeenCalledWith({
          id: 2,
          review: { status: "approved" },
        });
      });
    });

    it("calls review mutation when reject is clicked", async () => {
      const mockReview = jest.fn().mockResolvedValue({});
      mockUseReviewTimeOffRequest.mockReturnValue({
        mutateAsync: mockReview,
      });

      render(<TimeOffWidget />);

      fireEvent.click(screen.getByText(/Pending/));
      fireEvent.click(screen.getByTitle("Reject"));

      await waitFor(() => {
        expect(mockReview).toHaveBeenCalledWith({
          id: 2,
          review: { status: "rejected" },
        });
      });
    });
  });

  describe("admin view", () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: {
          id: 1,
          first_name: "Admin",
          last_name: "User",
          role: "admin",
        },
      });

      mockUseTeamTimeOff.mockReturnValue({
        data: [createMockRequest()],
        isLoading: false,
      });

      mockUsePendingTimeOffRequests.mockReturnValue({
        data: [],
        isLoading: false,
      });
    });

    it("shows team data for admin users", () => {
      render(<TimeOffWidget />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("shows correct empty message for admin", () => {
      mockUseTeamTimeOff.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<TimeOffWidget />);

      expect(screen.getByText("No upcoming team time off")).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("shows pagination when more than one page", () => {
      const manyRequests = Array.from({ length: 10 }, (_, i) =>
        createMockRequest({ id: i + 1 })
      );

      mockUseMyTimeOffRequests.mockImplementation((status) => ({
        data: status === "approved" ? manyRequests : [],
        isLoading: false,
      }));

      render(<TimeOffWidget />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("does not show pagination when one page or less", () => {
      render(<TimeOffWidget />);

      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });
  });

  describe("animation", () => {
    it("applies animation classes when animate is true", () => {
      const { container } = render(<TimeOffWidget animate={true} />);

      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass("opacity-100");
      expect(widget).toHaveClass("translate-y-0");
    });

    it("applies hidden classes when animate is false", () => {
      const { container } = render(<TimeOffWidget animate={false} />);

      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass("opacity-0");
      expect(widget).toHaveClass("translate-y-4");
    });
  });
});
