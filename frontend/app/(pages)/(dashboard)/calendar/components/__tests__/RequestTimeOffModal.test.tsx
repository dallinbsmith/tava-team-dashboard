/**
 * Tests for calendar/components/RequestTimeOffModal.tsx
 * Time off request form modal
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock date-fns for consistent dates
jest.mock("date-fns", () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === "yyyy-MM-dd") {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "2024-01-16";
  },
  addDays: (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },
}));

// Mock createTimeOffRequestAction
const mockCreateTimeOffRequestAction = jest.fn();
jest.mock("../../../time-off/actions", () => ({
  createTimeOffRequestAction: (req: unknown) =>
    mockCreateTimeOffRequestAction(req),
}));

import RequestTimeOffModal from "../RequestTimeOffModal";

describe("RequestTimeOffModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTimeOffRequestAction.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<RequestTimeOffModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<RequestTimeOffModal {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders modal title", () => {
      render(<RequestTimeOffModal {...defaultProps} />);
      expect(screen.getByText("Request Time Off")).toBeInTheDocument();
    });

    it("renders form fields", () => {
      render(<RequestTimeOffModal {...defaultProps} />);

      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reason/i)).toBeInTheDocument();
    });

    it("renders time off type options", () => {
      render(<RequestTimeOffModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/Type/i);
      expect(typeSelect).toBeInTheDocument();

      // Check that options exist
      expect(
        screen.getByRole("option", { name: /Vacation/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Sick/i })).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /Personal/i }),
      ).toBeInTheDocument();
    });

    it("renders cancel and submit buttons", () => {
      render(<RequestTimeOffModal {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Submit Request")).toBeInTheDocument();
    });
  });

  describe("form input", () => {
    it("updates type selection", async () => {
      render(<RequestTimeOffModal {...defaultProps} />);
      const typeSelect = screen.getByLabelText(/Type/i);

      fireEvent.change(typeSelect, { target: { value: "sick" } });
      expect(typeSelect).toHaveValue("sick");
    });

    it("updates start date field", async () => {
      const { container } = render(<RequestTimeOffModal {...defaultProps} />);
      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      const startDateInput = dateInputs[0];

      fireEvent.change(startDateInput, { target: { value: "2024-01-15" } });
      expect(startDateInput).toHaveValue("2024-01-15");
    });

    it("updates end date field", async () => {
      const { container } = render(<RequestTimeOffModal {...defaultProps} />);
      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      const endDateInput = dateInputs[1];

      fireEvent.change(endDateInput, { target: { value: "2024-01-20" } });
      expect(endDateInput).toHaveValue("2024-01-20");
    });

    it("updates reason field", async () => {
      render(<RequestTimeOffModal {...defaultProps} />);
      const reasonInput = screen.getByPlaceholderText(/Optional reason/i);

      await userEvent.type(reasonInput, "Family vacation");
      expect(reasonInput).toHaveValue("Family vacation");
    });
  });

  describe("form validation", () => {
    it("shows error when start date is empty", async () => {
      const { container } = render(<RequestTimeOffModal {...defaultProps} />);

      // Clear the default start date
      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      fireEvent.change(dateInputs[0], { target: { value: "" } });

      fireEvent.click(screen.getByText("Submit Request"));

      await waitFor(() => {
        expect(screen.getByText(/Start date is required/i)).toBeInTheDocument();
      });
    });

    it("shows error when end date is before start date", async () => {
      const { container } = render(<RequestTimeOffModal {...defaultProps} />);

      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      fireEvent.change(dateInputs[0], { target: { value: "2024-01-20" } });
      fireEvent.change(dateInputs[1], { target: { value: "2024-01-15" } });

      // Submit the form directly
      const form = container.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/End date must be on or after start date/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("submits form with correct data", async () => {
      const { container } = render(<RequestTimeOffModal {...defaultProps} />);

      // Set type
      fireEvent.change(screen.getByLabelText(/Type/i), {
        target: { value: "vacation" },
      });

      // Set dates
      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      fireEvent.change(dateInputs[0], { target: { value: "2024-01-15" } });
      fireEvent.change(dateInputs[1], { target: { value: "2024-01-20" } });

      // Submit the form directly
      const form = container.querySelector("form")!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockCreateTimeOffRequestAction).toHaveBeenCalledWith(
          expect.objectContaining({
            request_type: "vacation",
          }),
        );
      });
    });

    it("calls onCreated callback on success", async () => {
      const onCreated = jest.fn();
      const { container } = render(
        <RequestTimeOffModal {...defaultProps} onCreated={onCreated} />,
      );

      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      fireEvent.change(dateInputs[0], { target: { value: "2024-01-15" } });
      fireEvent.change(dateInputs[1], { target: { value: "2024-01-20" } });

      const form = container.querySelector("form")!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalled();
      });
    });

    it("shows error message on failure", async () => {
      mockCreateTimeOffRequestAction.mockResolvedValue({
        success: false,
        error: "Failed to submit request",
      });

      const { container } = render(<RequestTimeOffModal {...defaultProps} />);

      const dateInputs = container.querySelectorAll(
        'input[type="date"]',
      ) as NodeListOf<HTMLInputElement>;
      fireEvent.change(dateInputs[0], { target: { value: "2024-01-15" } });
      fireEvent.change(dateInputs[1], { target: { value: "2024-01-20" } });

      const form = container.querySelector("form")!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to submit request"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("close and reset", () => {
    it("calls onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<RequestTimeOffModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
