/**
 * Tests for time-off/components/TimeOffRequestCard.tsx
 * Time off request card with status display and action buttons
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TimeOffRequestCard from "../TimeOffRequestCard";
import { TimeOffRequest } from "../../types";

// Mock date-fns to have consistent date formatting across timezones
jest.mock("date-fns", () => ({
  format: (date: Date, formatStr: string) => {
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();

    if (formatStr === "MMM d, yyyy") {
      return `${month} ${day}, ${year}`;
    }
    if (formatStr === "MMM d") {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  },
}));

describe("TimeOffRequestCard", () => {
  const createMockRequest = (overrides: Partial<TimeOffRequest> = {}): TimeOffRequest => ({
    id: 1,
    user_id: 1,
    request_type: "vacation",
    start_date: "2024-01-15",
    end_date: "2024-01-20",
    status: "pending",
    reason: "Family vacation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("rendering", () => {
    it("renders request type label", () => {
      render(<TimeOffRequestCard request={createMockRequest()} />);
      expect(screen.getByText("Vacation")).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(<TimeOffRequestCard request={createMockRequest({ status: "pending" })} />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders approved status correctly", () => {
      render(<TimeOffRequestCard request={createMockRequest({ status: "approved" })} />);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("renders rejected status correctly", () => {
      render(<TimeOffRequestCard request={createMockRequest({ status: "rejected" })} />);
      expect(screen.getByText("Rejected")).toBeInTheDocument();
    });

    it("renders cancelled status correctly", () => {
      render(<TimeOffRequestCard request={createMockRequest({ status: "cancelled" })} />);
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });

    it("renders date range for multi-day request", () => {
      render(<TimeOffRequestCard request={createMockRequest()} />);
      // With mocked date-fns, dates are formatted using UTC
      expect(screen.getByText("Jan 15 - Jan 20, 2024")).toBeInTheDocument();
    });

    it("renders single date for same-day request", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({
            start_date: "2024-01-15",
            end_date: "2024-01-15",
          })}
        />
      );
      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
    });

    it("renders reason when provided", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ reason: "Annual vacation trip" })}
        />
      );
      expect(screen.getByText("Annual vacation trip")).toBeInTheDocument();
    });

    it("does not render reason section when not provided", () => {
      render(
        <TimeOffRequestCard request={createMockRequest({ reason: undefined })} />
      );
      expect(screen.queryByText("Annual vacation trip")).not.toBeInTheDocument();
    });
  });

  describe("request types", () => {
    it("renders vacation type correctly", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ request_type: "vacation" })}
        />
      );
      expect(screen.getByText("Vacation")).toBeInTheDocument();
    });

    it("renders sick type correctly", () => {
      render(
        <TimeOffRequestCard request={createMockRequest({ request_type: "sick" })} />
      );
      expect(screen.getByText("Sick")).toBeInTheDocument();
    });

    it("renders personal type correctly", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ request_type: "personal" })}
        />
      );
      expect(screen.getByText("Personal")).toBeInTheDocument();
    });
  });

  describe("user display", () => {
    it("shows user name when showUser is true", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({
            user: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
            },
          })}
          showUser={true}
        />
      );
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("does not show user name when showUser is false", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({
            user: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
            },
          })}
          showUser={false}
        />
      );
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });
  });

  describe("cancel action", () => {
    it("shows cancel button for pending requests when onCancel is provided", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ status: "pending" })}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByTitle("Cancel request")).toBeInTheDocument();
    });

    it("does not show cancel button for approved requests", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ status: "approved" })}
          onCancel={jest.fn()}
        />
      );
      expect(screen.queryByTitle("Cancel request")).not.toBeInTheDocument();
    });

    it("does not show cancel button when onCancel is not provided", () => {
      render(<TimeOffRequestCard request={createMockRequest({ status: "pending" })} />);
      expect(screen.queryByTitle("Cancel request")).not.toBeInTheDocument();
    });

    it("calls onCancel with request ID when cancel is clicked", () => {
      const onCancel = jest.fn();
      render(
        <TimeOffRequestCard
          request={createMockRequest({ id: 42, status: "pending" })}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByTitle("Cancel request"));
      expect(onCancel).toHaveBeenCalledWith(42);
    });

    it("disables cancel button when cancelling is true", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ status: "pending" })}
          onCancel={jest.fn()}
          cancelling={true}
        />
      );

      expect(screen.getByTitle("Cancel request")).toBeDisabled();
    });
  });

  describe("review actions", () => {
    it("shows approve/reject buttons for pending requests when onReview is provided", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ status: "pending" })}
          onReview={jest.fn()}
        />
      );

      expect(screen.getByTitle("Approve")).toBeInTheDocument();
      expect(screen.getByTitle("Reject")).toBeInTheDocument();
    });

    it("does not show review buttons for approved requests", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({ status: "approved" })}
          onReview={jest.fn()}
        />
      );

      expect(screen.queryByTitle("Approve")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Reject")).not.toBeInTheDocument();
    });

    it("calls onReview with approved when approve is clicked", () => {
      const onReview = jest.fn();
      render(
        <TimeOffRequestCard
          request={createMockRequest({ id: 42, status: "pending" })}
          onReview={onReview}
        />
      );

      fireEvent.click(screen.getByTitle("Approve"));
      expect(onReview).toHaveBeenCalledWith(42, "approved");
    });

    it("calls onReview with rejected when reject is clicked", () => {
      const onReview = jest.fn();
      render(
        <TimeOffRequestCard
          request={createMockRequest({ id: 42, status: "pending" })}
          onReview={onReview}
        />
      );

      fireEvent.click(screen.getByTitle("Reject"));
      expect(onReview).toHaveBeenCalledWith(42, "rejected");
    });
  });

  describe("reviewer information", () => {
    it("shows reviewer info when reviewed", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({
            status: "approved",
            reviewed_at: "2024-01-10T10:00:00Z",
            reviewer: {
              id: 2,
              first_name: "Jane",
              last_name: "Manager",
            },
          })}
        />
      );

      expect(screen.getByText(/Reviewed by Jane Manager/)).toBeInTheDocument();
    });

    it("shows reviewer notes when provided", () => {
      render(
        <TimeOffRequestCard
          request={createMockRequest({
            status: "rejected",
            reviewer_notes: "Project deadline conflict",
          })}
        />
      );

      expect(screen.getByText(/Project deadline conflict/)).toBeInTheDocument();
    });
  });
});
