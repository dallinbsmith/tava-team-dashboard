/**
 * Tests for time-off/TimeOffPageClient.tsx
 * Time off management page with request list and review functionality
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TimeOffPageClient } from "../TimeOffPageClient";
import { User } from "@/shared/types/user";
import { TimeOffRequest } from "../types";

// Mock nuqs (ESM-only package)
jest.mock("nuqs", () => ({
  parseAsStringLiteral: () => ({
    withDefault: () => ({
      withOptions: () => null,
    }),
  }),
  useQueryState: () => [null, jest.fn()],
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock CurrentUserProvider
const mockUseCurrentUser = jest.fn();
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// Mock TimeOffRequestList
jest.mock("../components/TimeOffRequestList", () => {
  return function MockTimeOffRequestList({
    requests,
    onCancel,
    onReview,
    showUser,
    emptyMessage,
  }: {
    requests: TimeOffRequest[];
    onCancel?: (id: number) => void;
    onReview?: (id: number) => void;
    showUser?: boolean;
    emptyMessage?: string;
  }) {
    if (requests.length === 0) {
      return <div data-testid="empty-message">{emptyMessage}</div>;
    }
    return (
      <div data-testid="time-off-list">
        {requests.map((r) => (
          <div key={r.id} data-testid={`request-${r.id}`}>
            {r.request_type} - {r.status}
            {onCancel && (
              <button
                onClick={() => onCancel(r.id)}
                data-testid={`cancel-${r.id}`}
              >
                Cancel
              </button>
            )}
            {onReview && (
              <button
                onClick={() => onReview(r.id)}
                data-testid={`review-${r.id}`}
              >
                Review
              </button>
            )}
            {showUser && <span data-testid="show-user">Show User</span>}
          </div>
        ))}
      </div>
    );
  };
});

// Mock TimeOffRequestForm
jest.mock("../components/TimeOffRequestForm", () => {
  return function MockTimeOffRequestForm({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) {
    return (
      <div data-testid="request-form">
        <button onClick={onSuccess} data-testid="form-submit">
          Submit
        </button>
        <button onClick={onCancel} data-testid="form-cancel">
          Cancel
        </button>
      </div>
    );
  };
});

// Mock TimeOffReviewModal
jest.mock("../components/TimeOffReviewModal", () => {
  return function MockTimeOffReviewModal({
    request,
    onClose,
    onSuccess,
  }: {
    request: TimeOffRequest;
    onClose: () => void;
    onSuccess: () => void;
  }) {
    return (
      <div data-testid="review-modal">
        <div data-testid="review-request-id">{request.id}</div>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button onClick={onSuccess} data-testid="modal-success">
          Submit
        </button>
      </div>
    );
  };
});

// Mock actions
const mockCancelTimeOffRequestAction = jest.fn();
const mockGetMyTimeOffRequests = jest.fn();
const mockGetPendingTimeOffRequests = jest.fn();
jest.mock("../actions", () => ({
  cancelTimeOffRequestAction: (id: number) =>
    mockCancelTimeOffRequestAction(id),
  getMyTimeOffRequests: () => mockGetMyTimeOffRequests(),
  getPendingTimeOffRequests: () => mockGetPendingTimeOffRequests(),
}));

describe("TimeOffPageClient", () => {
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

  const createMockRequest = (
    overrides: Partial<TimeOffRequest> = {},
  ): TimeOffRequest => ({
    id: 1,
    user_id: 1,
    request_type: "vacation",
    start_date: "2024-01-15",
    end_date: "2024-01-20",
    status: "pending",
    reason: "Vacation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const defaultProps = {
    initialMyRequests: [createMockRequest()],
    initialPendingRequests: [],
    isSupervisorOrAdmin: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      currentUser: createMockUser(),
      effectiveIsSupervisorOrAdmin: false,
    });
    mockCancelTimeOffRequestAction.mockResolvedValue({ success: true });
    mockGetMyTimeOffRequests.mockResolvedValue([createMockRequest()]);
    mockGetPendingTimeOffRequests.mockResolvedValue([]);
  });

  describe("rendering", () => {
    it("renders page title", () => {
      render(<TimeOffPageClient {...defaultProps} />);
      expect(screen.getByText("Time Off")).toBeInTheDocument();
    });

    it("renders request time off button", () => {
      render(<TimeOffPageClient {...defaultProps} />);
      expect(screen.getByText("Request Time Off")).toBeInTheDocument();
    });

    it("renders my requests section for employees", () => {
      render(<TimeOffPageClient {...defaultProps} />);
      expect(screen.getByText("My Requests")).toBeInTheDocument();
    });

    it("renders time off list with requests", () => {
      render(<TimeOffPageClient {...defaultProps} />);
      expect(screen.getByTestId("time-off-list")).toBeInTheDocument();
      expect(screen.getByTestId("request-1")).toBeInTheDocument();
    });
  });

  describe("request form", () => {
    it("shows request form when button is clicked", async () => {
      render(<TimeOffPageClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Request Time Off"));

      await waitFor(() => {
        expect(screen.getByTestId("request-form")).toBeInTheDocument();
      });
    });

    it("hides request button when form is shown", async () => {
      render(<TimeOffPageClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Request Time Off"));

      await waitFor(() => {
        expect(screen.queryByText("Request Time Off")).not.toBeInTheDocument();
      });
    });

    it("hides form when cancel is clicked", async () => {
      render(<TimeOffPageClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Request Time Off"));
      await waitFor(() => {
        expect(screen.getByTestId("request-form")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("form-cancel"));

      await waitFor(() => {
        expect(screen.queryByTestId("request-form")).not.toBeInTheDocument();
      });
    });
  });

  describe("cancel functionality", () => {
    it("calls cancel action when cancel button is clicked", async () => {
      render(<TimeOffPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("cancel-1"));

      await waitFor(() => {
        expect(mockCancelTimeOffRequestAction).toHaveBeenCalledWith(1);
      });
    });
  });

  describe("supervisor view", () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: createMockUser({ role: "supervisor" }),
        effectiveIsSupervisorOrAdmin: true,
      });
    });

    it("shows pending approvals section for supervisors", () => {
      render(
        <TimeOffPageClient
          {...defaultProps}
          isSupervisorOrAdmin={true}
          initialPendingRequests={[createMockRequest({ id: 2, user_id: 2 })]}
        />,
      );

      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
    });

    it("shows pending count badge", () => {
      render(
        <TimeOffPageClient
          {...defaultProps}
          isSupervisorOrAdmin={true}
          initialPendingRequests={[createMockRequest({ id: 2, user_id: 2 })]}
        />,
      );

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("shows 'Time Off Requests' header for supervisors", () => {
      render(
        <TimeOffPageClient {...defaultProps} isSupervisorOrAdmin={true} />,
      );

      expect(screen.getByText("Time Off Requests")).toBeInTheDocument();
    });

    it("opens review modal when review button is clicked", async () => {
      render(
        <TimeOffPageClient
          {...defaultProps}
          isSupervisorOrAdmin={true}
          initialPendingRequests={[createMockRequest({ id: 2, user_id: 2 })]}
        />,
      );

      fireEvent.click(screen.getByTestId("review-2"));

      await waitFor(() => {
        expect(screen.getByTestId("review-modal")).toBeInTheDocument();
      });
    });

    it("closes review modal when close is clicked", async () => {
      render(
        <TimeOffPageClient
          {...defaultProps}
          isSupervisorOrAdmin={true}
          initialPendingRequests={[createMockRequest({ id: 2, user_id: 2 })]}
        />,
      );

      fireEvent.click(screen.getByTestId("review-2"));
      await waitFor(() => {
        expect(screen.getByTestId("review-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("modal-close"));

      await waitFor(() => {
        expect(screen.queryByTestId("review-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("empty states", () => {
    it("shows empty message when no requests", () => {
      render(<TimeOffPageClient {...defaultProps} initialMyRequests={[]} />);

      expect(screen.getByTestId("empty-message")).toBeInTheDocument();
    });
  });

  describe("refresh functionality", () => {
    it("renders refresh button", () => {
      render(<TimeOffPageClient {...defaultProps} />);
      expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    });

    it("calls fetch functions when refresh is clicked", async () => {
      render(<TimeOffPageClient {...defaultProps} />);

      fireEvent.click(screen.getByTitle("Refresh"));

      await waitFor(() => {
        expect(mockGetMyTimeOffRequests).toHaveBeenCalled();
      });
    });
  });
});
