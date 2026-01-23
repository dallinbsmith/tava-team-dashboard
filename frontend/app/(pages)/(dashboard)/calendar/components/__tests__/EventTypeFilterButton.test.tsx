/**
 * Tests for calendar/components/EventTypeFilterButton.tsx
 * Individual event type filter button
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EventTypeFilterButton from "../EventTypeFilterButton";

describe("EventTypeFilterButton", () => {
  const defaultProps = {
    label: "Tasks",
    color: "#22c55e",
    isActive: true,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders label text", () => {
      render(<EventTypeFilterButton {...defaultProps} />);
      expect(screen.getByText("Tasks")).toBeInTheDocument();
    });

    it("renders as a button", () => {
      render(<EventTypeFilterButton {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows correct title when active", () => {
      render(<EventTypeFilterButton {...defaultProps} isActive={true} />);
      expect(screen.getByTitle("Hide tasks")).toBeInTheDocument();
    });

    it("shows correct title when inactive", () => {
      render(<EventTypeFilterButton {...defaultProps} isActive={false} />);
      expect(screen.getByTitle("Show tasks")).toBeInTheDocument();
    });
  });

  describe("click behavior", () => {
    it("calls onClick when clicked", () => {
      render(<EventTypeFilterButton {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(defaultProps.onClick).toHaveBeenCalled();
    });

    it("calls onClick multiple times", () => {
      render(<EventTypeFilterButton {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));

      expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("styling", () => {
    it("applies active styles when isActive is true", () => {
      const { container } = render(
        <EventTypeFilterButton {...defaultProps} isActive={true} />,
      );

      const button = container.querySelector("button");
      expect(button).toHaveStyle({ backgroundColor: "#22c55e20" });
    });

    it("does not apply active styles when isActive is false", () => {
      render(<EventTypeFilterButton {...defaultProps} isActive={false} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-theme-text-subtle");
    });

    it("shows color indicator", () => {
      const { container } = render(<EventTypeFilterButton {...defaultProps} />);

      const colorIndicator = container.querySelector("span.w-3.h-3");
      expect(colorIndicator).toBeInTheDocument();
      expect(colorIndicator).toHaveStyle({ backgroundColor: "#22c55e" });
    });

    it("shows muted color indicator when inactive", () => {
      const { container } = render(
        <EventTypeFilterButton {...defaultProps} isActive={false} />,
      );

      const colorIndicator = container.querySelector("span.w-3.h-3");
      expect(colorIndicator).toHaveStyle({ backgroundColor: "#22c55e66" });
    });
  });

  describe("dashed variant", () => {
    it("applies dashed border when dashed prop is true", () => {
      const { container } = render(
        <EventTypeFilterButton {...defaultProps} dashed={true} />,
      );

      const colorIndicator = container.querySelector("span.w-3.h-3");
      expect(colorIndicator).toHaveClass("border-dashed");
    });

    it("does not apply dashed border by default", () => {
      const { container } = render(<EventTypeFilterButton {...defaultProps} />);

      const colorIndicator = container.querySelector("span.w-3.h-3");
      expect(colorIndicator).not.toHaveClass("border-dashed");
    });
  });

  describe("different labels", () => {
    it("renders Meetings label", () => {
      render(
        <EventTypeFilterButton
          {...defaultProps}
          label="Meetings"
          color="#a855f7"
        />,
      );

      expect(screen.getByText("Meetings")).toBeInTheDocument();
      expect(screen.getByTitle("Hide meetings")).toBeInTheDocument();
    });

    it("renders Jira label", () => {
      render(
        <EventTypeFilterButton
          {...defaultProps}
          label="Jira"
          color="#3b82f6"
        />,
      );

      expect(screen.getByText("Jira")).toBeInTheDocument();
    });

    it("renders Time Off label", () => {
      render(
        <EventTypeFilterButton
          {...defaultProps}
          label="Time Off"
          color="#f59e0b"
          dashed={true}
        />,
      );

      expect(screen.getByText("Time Off")).toBeInTheDocument();
      expect(screen.getByTitle("Hide time off")).toBeInTheDocument();
    });
  });
});
