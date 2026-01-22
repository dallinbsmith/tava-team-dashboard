/**
 * Tests for components/filters/FilterCheckbox.tsx
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterCheckbox from "../FilterCheckbox";

describe("FilterCheckbox", () => {
  const defaultProps = {
    label: "Test Filter",
    checked: false,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the label text", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByText("Test Filter")).toBeInTheDocument();
    });

    it("renders as a button for accessibility", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has type=button to prevent form submission", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });
  });

  describe("unchecked state", () => {
    it("shows empty checkbox when unchecked", () => {
      render(<FilterCheckbox {...defaultProps} checked={false} />);

      const button = screen.getByRole("button");
      const checkbox = button.querySelector("div");

      // Should have transparent background and border
      expect(checkbox).toHaveClass("bg-transparent");
      expect(checkbox).toHaveClass("border-theme-border");
    });

    it("does not show check icon when unchecked", () => {
      render(<FilterCheckbox {...defaultProps} checked={false} />);

      // Check icon should not be present
      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe("checked state", () => {
    it("shows filled checkbox when checked", () => {
      render(<FilterCheckbox {...defaultProps} checked={true} />);

      const button = screen.getByRole("button");
      const checkbox = button.querySelector("div");

      // Should have accent background
      expect(checkbox).toHaveClass("bg-accent-500");
      expect(checkbox).toHaveClass("border-accent-500");
    });

    it("shows check icon when checked", () => {
      render(<FilterCheckbox {...defaultProps} checked={true} />);

      // Check icon should be present (it's an SVG)
      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass("text-white");
    });
  });

  describe("onChange behavior", () => {
    it("calls onChange with true when clicking unchecked checkbox", () => {
      const onChange = jest.fn();
      render(<FilterCheckbox {...defaultProps} checked={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("calls onChange with false when clicking checked checkbox", () => {
      const onChange = jest.fn();
      render(<FilterCheckbox {...defaultProps} checked={true} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("toggles value on each click", () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <FilterCheckbox {...defaultProps} checked={false} onChange={onChange} />
      );

      // First click: unchecked -> should call with true
      fireEvent.click(screen.getByRole("button"));
      expect(onChange).toHaveBeenLastCalledWith(true);

      // Simulate state change
      rerender(<FilterCheckbox {...defaultProps} checked={true} onChange={onChange} />);

      // Second click: checked -> should call with false
      fireEvent.click(screen.getByRole("button"));
      expect(onChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe("styling", () => {
    it("has hover styles", () => {
      render(<FilterCheckbox {...defaultProps} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("hover:bg-theme-elevated");
    });

    it("is full width", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByRole("button")).toHaveClass("w-full");
    });

    it("has text aligned left", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByRole("button")).toHaveClass("text-left");
    });

    it("has cursor pointer", () => {
      render(<FilterCheckbox {...defaultProps} />);
      expect(screen.getByRole("button")).toHaveClass("cursor-pointer");
    });
  });

  describe("accessibility", () => {
    it("is keyboard accessible via button role", () => {
      const onChange = jest.fn();
      render(<FilterCheckbox {...defaultProps} onChange={onChange} />);

      const button = screen.getByRole("button");

      // Simulate Enter key (fireEvent.click triggers on Enter for buttons)
      fireEvent.click(button);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("different labels", () => {
    it("renders long labels correctly", () => {
      render(
        <FilterCheckbox
          {...defaultProps}
          label="This is a very long filter label that might wrap"
        />
      );
      expect(
        screen.getByText("This is a very long filter label that might wrap")
      ).toBeInTheDocument();
    });

    it("renders special characters in labels", () => {
      render(<FilterCheckbox {...defaultProps} label="Test & Filter <>" />);
      expect(screen.getByText("Test & Filter <>")).toBeInTheDocument();
    });
  });
});
