/**
 * Tests for calendar/components/CalendarToolbar.tsx
 * Calendar navigation toolbar with view selection and navigation
 */

import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CalendarToolbar from "../CalendarToolbar";

describe("CalendarToolbar", () => {
  const defaultProps = {
    label: "January 2024",
    view: "month" as const,
    date: new Date("2024-01-15"),
    refreshing: false,
    addMenuOpen: false,
    addMenuRef: createRef<HTMLDivElement>(),
    showTeamTimeOff: false,
    effectiveIsSupervisorOrAdmin: false,
    onNavigate: jest.fn(),
    onViewChange: jest.fn(),
    onRefresh: jest.fn(),
    onToggleAddMenu: jest.fn(),
    onSetShowTeamTimeOff: jest.fn(),
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders label", () => {
      render(<CalendarToolbar {...defaultProps} />);
      expect(screen.getByText("January 2024")).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<CalendarToolbar {...defaultProps} />);

      // Navigation buttons are the ones with ChevronLeft and ChevronRight icons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("renders view options", () => {
      render(<CalendarToolbar {...defaultProps} />);

      expect(screen.getByText("Month")).toBeInTheDocument();
      expect(screen.getByText("Week")).toBeInTheDocument();
    });

    it("renders refresh button", () => {
      render(<CalendarToolbar {...defaultProps} />);
      expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("calls onNavigate when previous button is clicked", () => {
      render(<CalendarToolbar {...defaultProps} />);

      // First button should be the previous button
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(defaultProps.onNavigate).toHaveBeenCalled();
    });

    it("calls onNavigate when next button is clicked", () => {
      render(<CalendarToolbar {...defaultProps} />);

      // Third button should be the next button (after prev and label)
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[2]);

      expect(defaultProps.onNavigate).toHaveBeenCalled();
    });

    it("calls onNavigate with current date when label is clicked", () => {
      render(<CalendarToolbar {...defaultProps} />);

      fireEvent.click(screen.getByText("January 2024"));

      expect(defaultProps.onNavigate).toHaveBeenCalled();
    });

    it("calls onRefresh when refresh button is clicked", () => {
      render(<CalendarToolbar {...defaultProps} />);

      fireEvent.click(screen.getByTitle("Refresh"));

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe("view selection", () => {
    it("calls onViewChange when Month is clicked", () => {
      render(<CalendarToolbar {...defaultProps} view="week" />);

      fireEvent.click(screen.getByText("Month"));

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("month");
    });

    it("calls onViewChange when Week is clicked", () => {
      render(<CalendarToolbar {...defaultProps} />);

      fireEvent.click(screen.getByText("Week"));

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("week");
    });

    it("highlights current month view", () => {
      render(<CalendarToolbar {...defaultProps} view="month" />);

      const monthButton = screen.getByText("Month").closest("button");
      expect(monthButton).toHaveClass("bg-theme-elevated");
    });

    it("highlights current week view", () => {
      render(<CalendarToolbar {...defaultProps} view="week" />);

      const weekButton = screen.getByText("Week").closest("button");
      expect(weekButton).toHaveClass("bg-theme-elevated");
    });
  });

  describe("supervisor features", () => {
    it("shows Mine/Team toggle for supervisors", () => {
      render(
        <CalendarToolbar
          {...defaultProps}
          effectiveIsSupervisorOrAdmin={true}
        />,
      );

      expect(screen.getByText("Mine")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
    });

    it("does not show Mine/Team toggle for regular employees", () => {
      render(
        <CalendarToolbar
          {...defaultProps}
          effectiveIsSupervisorOrAdmin={false}
        />,
      );

      expect(screen.queryByText("Mine")).not.toBeInTheDocument();
      expect(screen.queryByText("Team")).not.toBeInTheDocument();
    });

    it("calls onSetShowTeamTimeOff when Mine is clicked", () => {
      render(
        <CalendarToolbar
          {...defaultProps}
          effectiveIsSupervisorOrAdmin={true}
          showTeamTimeOff={true}
        />,
      );

      fireEvent.click(screen.getByText("Mine"));

      expect(defaultProps.onSetShowTeamTimeOff).toHaveBeenCalledWith(false);
    });

    it("calls onSetShowTeamTimeOff when Team is clicked", () => {
      render(
        <CalendarToolbar
          {...defaultProps}
          effectiveIsSupervisorOrAdmin={true}
          showTeamTimeOff={false}
        />,
      );

      fireEvent.click(screen.getByText("Team"));

      expect(defaultProps.onSetShowTeamTimeOff).toHaveBeenCalledWith(true);
    });
  });

  describe("add menu", () => {
    it("shows Add button when actions are provided", () => {
      render(<CalendarToolbar {...defaultProps} onCreateTask={jest.fn()} />);

      expect(screen.getByText("Add")).toBeInTheDocument();
    });

    it("does not show Add button when no actions are provided", () => {
      render(<CalendarToolbar {...defaultProps} />);

      expect(screen.queryByText("Add")).not.toBeInTheDocument();
    });

    it("calls onToggleAddMenu when Add is clicked", () => {
      render(<CalendarToolbar {...defaultProps} onCreateTask={jest.fn()} />);

      fireEvent.click(screen.getByText("Add"));

      expect(defaultProps.onToggleAddMenu).toHaveBeenCalled();
    });

    it("shows dropdown menu when addMenuOpen is true", () => {
      render(
        <CalendarToolbar
          {...defaultProps}
          onCreateTask={jest.fn()}
          onCreateMeeting={jest.fn()}
          addMenuOpen={true}
        />,
      );

      expect(screen.getByText("Task")).toBeInTheDocument();
      expect(screen.getByText("Meeting")).toBeInTheDocument();
    });

    it("calls onAction when Task is clicked", () => {
      const onCreateTask = jest.fn();
      render(
        <CalendarToolbar
          {...defaultProps}
          onCreateTask={onCreateTask}
          addMenuOpen={true}
        />,
      );

      fireEvent.click(screen.getByText("Task"));

      expect(defaultProps.onAction).toHaveBeenCalledWith(onCreateTask);
    });
  });

  describe("refreshing state", () => {
    it("disables refresh button when refreshing", () => {
      render(<CalendarToolbar {...defaultProps} refreshing={true} />);

      expect(screen.getByTitle("Refresh")).toBeDisabled();
    });

    it("shows spinning animation when refreshing", () => {
      const { container } = render(
        <CalendarToolbar {...defaultProps} refreshing={true} />,
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("responsive layout", () => {
    it("has flex container", () => {
      const { container } = render(<CalendarToolbar {...defaultProps} />);

      const toolbar = container.querySelector(".flex");
      expect(toolbar).toBeInTheDocument();
    });
  });
});
