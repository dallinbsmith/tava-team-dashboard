/**
 * Tests for components/filters/FilterDropdown.tsx
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FilterDropdown from "../FilterDropdown";

describe("FilterDropdown", () => {
  const defaultProps = {
    isOpen: false,
    onToggle: jest.fn(),
    onClose: jest.fn(),
    activeFilterCount: 0,
    onClearAll: jest.fn(),
    children: <div data-testid="dropdown-content">Filter Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clean up any portaled elements
    document.body.innerHTML = "";
  });

  describe("trigger button", () => {
    it("renders filter button", () => {
      render(<FilterDropdown {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has filter icon", () => {
      render(<FilterDropdown {...defaultProps} />);
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("calls onToggle when clicked", () => {
      const onToggle = jest.fn();
      render(<FilterDropdown {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("shows default title in title attribute", () => {
      render(<FilterDropdown {...defaultProps} />);
      expect(screen.getByRole("button")).toHaveAttribute("title", "Filters");
    });

    it("uses custom title", () => {
      render(<FilterDropdown {...defaultProps} title="Custom Filters" />);
      expect(screen.getByRole("button")).toHaveAttribute("title", "Custom Filters");
    });
  });

  describe("active filter count badge", () => {
    it("does not show badge when count is 0", () => {
      render(<FilterDropdown {...defaultProps} activeFilterCount={0} />);

      const button = screen.getByRole("button");
      const badge = button.querySelector("span");
      expect(badge).not.toBeInTheDocument();
    });

    it("shows badge when count is greater than 0", () => {
      render(<FilterDropdown {...defaultProps} activeFilterCount={3} />);

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("displays correct count", () => {
      const { rerender } = render(<FilterDropdown {...defaultProps} activeFilterCount={1} />);
      expect(screen.getByText("1")).toBeInTheDocument();

      rerender(<FilterDropdown {...defaultProps} activeFilterCount={10} />);
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  describe("button styling", () => {
    it("has muted style when closed and no active filters", () => {
      render(<FilterDropdown {...defaultProps} isOpen={false} activeFilterCount={0} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("text-theme-text-muted");
    });

    it("has primary style when open", () => {
      render(<FilterDropdown {...defaultProps} isOpen={true} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-primary-500");
      expect(button).toHaveClass("text-white");
    });

    it("has primary style when has active filters", () => {
      render(<FilterDropdown {...defaultProps} activeFilterCount={2} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-primary-500");
      expect(button).toHaveClass("text-white");
    });
  });

  describe("dropdown panel", () => {
    it("does not render panel when closed", () => {
      render(<FilterDropdown {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId("dropdown-content")).not.toBeInTheDocument();
    });

    it("renders panel when open", async () => {
      // Need to wait for mount state
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} />);
      });

      // Panel should be portaled to body
      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    });

    it("renders children in panel", async () => {
      await act(async () => {
        render(
          <FilterDropdown {...defaultProps} isOpen={true}>
            <div data-testid="custom-content">Custom Content</div>
          </FilterDropdown>
        );
      });

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });

    it("shows title in panel", async () => {
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} title="My Filters" />);
      });

      expect(screen.getByText("My Filters")).toBeInTheDocument();
    });
  });

  describe("reset all button", () => {
    it("does not show reset button when no active filters", async () => {
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} activeFilterCount={0} />);
      });

      expect(screen.queryByText("Reset all")).not.toBeInTheDocument();
    });

    it("shows reset button when has active filters", async () => {
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} activeFilterCount={2} />);
      });

      expect(screen.getByText("Reset all")).toBeInTheDocument();
    });

    it("calls onClearAll when reset button is clicked", async () => {
      const onClearAll = jest.fn();
      await act(async () => {
        render(
          <FilterDropdown
            {...defaultProps}
            isOpen={true}
            activeFilterCount={2}
            onClearAll={onClearAll}
          />
        );
      });

      fireEvent.click(screen.getByText("Reset all"));
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("escape key handling", () => {
    it("calls onClose when Escape key is pressed while open", async () => {
      const onClose = jest.fn();
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} onClose={onClose} />);
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("does not call onClose when Escape is pressed while closed", () => {
      const onClose = jest.fn();
      render(<FilterDropdown {...defaultProps} isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("click outside handling", () => {
    it("calls onClose when clicking outside the dropdown", async () => {
      const onClose = jest.fn();

      await act(async () => {
        render(
          <div>
            <div data-testid="outside">Outside</div>
            <FilterDropdown {...defaultProps} isOpen={true} onClose={onClose} />
          </div>
        );
      });

      // Wait for the timeout that adds the click listener
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      fireEvent.mouseDown(screen.getByTestId("outside"));
      expect(onClose).toHaveBeenCalled();
    });

    it("does not close when clicking inside the panel", async () => {
      const onClose = jest.fn();

      await act(async () => {
        render(
          <FilterDropdown {...defaultProps} isOpen={true} onClose={onClose}>
            <button data-testid="inside-button">Inside</button>
          </FilterDropdown>
        );
      });

      // Wait for the timeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      fireEvent.mouseDown(screen.getByTestId("inside-button"));
      expect(onClose).not.toHaveBeenCalled();
    });

    it("does not close when clicking the trigger button", async () => {
      const onClose = jest.fn();

      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} onClose={onClose} />);
      });

      // Wait for the timeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Click trigger button should not trigger onClose
      const triggerButton = screen.getByRole("button", { name: /filters/i });
      fireEvent.mouseDown(triggerButton);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("panel positioning", () => {
    it("renders panel as fixed position", async () => {
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} />);
      });

      // Find the panel (it's portaled to body)
      const panel = document.querySelector(".fixed.w-72");
      expect(panel).toBeInTheDocument();
    });

    it("has proper z-index for overlay", async () => {
      await act(async () => {
        render(<FilterDropdown {...defaultProps} isOpen={true} />);
      });

      const panel = document.querySelector("[class*='z-[9999]']");
      expect(panel).toBeInTheDocument();
    });
  });
});
