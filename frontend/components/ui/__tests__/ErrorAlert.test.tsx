/**
 * Tests for components/ui/ErrorAlert.tsx
 * ErrorAlert and FormError components
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorAlert, FormError } from "../ErrorAlert";

describe("ErrorAlert", () => {
  const defaultProps = {
    children: "An error occurred",
  };

  describe("rendering", () => {
    it("renders children content", () => {
      render(<ErrorAlert {...defaultProps} />);
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });

    it("renders with role='alert' for accessibility", () => {
      render(<ErrorAlert {...defaultProps} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("renders title when provided", () => {
      render(<ErrorAlert {...defaultProps} title="Error Title" />);
      expect(screen.getByText("Error Title")).toBeInTheDocument();
    });

    it("title has font-medium styling", () => {
      render(<ErrorAlert {...defaultProps} title="Error Title" />);
      const title = screen.getByText("Error Title");
      expect(title).toHaveClass("font-medium");
    });

    it("does not render title when not provided", () => {
      render(<ErrorAlert {...defaultProps} />);
      const alert = screen.getByRole("alert");
      const title = alert.querySelector(".font-medium.mb-1");
      expect(title).not.toBeInTheDocument();
    });

    it("renders icon", () => {
      const { container } = render(<ErrorAlert {...defaultProps} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("w-5", "h-5", "flex-shrink-0");
    });
  });

  describe("variants", () => {
    it("defaults to error variant", () => {
      render(<ErrorAlert {...defaultProps} />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "bg-red-900/30",
        "border-red-500/30",
        "text-red-400",
      );
    });

    it("renders error variant correctly", () => {
      render(<ErrorAlert {...defaultProps} variant="error" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "bg-red-900/30",
        "border-red-500/30",
        "text-red-400",
      );
    });

    it("renders warning variant correctly", () => {
      render(<ErrorAlert {...defaultProps} variant="warning" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "bg-yellow-900/30",
        "border-yellow-500/30",
        "text-yellow-400",
      );
    });

    it("renders info variant correctly", () => {
      render(<ErrorAlert {...defaultProps} variant="info" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "bg-blue-900/30",
        "border-blue-500/30",
        "text-blue-400",
      );
    });

    it("renders success variant correctly", () => {
      render(<ErrorAlert {...defaultProps} variant="success" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "bg-green-900/30",
        "border-green-500/30",
        "text-green-400",
      );
    });
  });

  describe("dismissible", () => {
    it("does not show dismiss button when dismissible is false", () => {
      render(<ErrorAlert {...defaultProps} />);
      expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
    });

    it("does not show dismiss button when dismissible is true but onDismiss is not provided", () => {
      render(<ErrorAlert {...defaultProps} dismissible />);
      expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
    });

    it("shows dismiss button when dismissible and onDismiss provided", () => {
      render(
        <ErrorAlert {...defaultProps} dismissible onDismiss={jest.fn()} />,
      );
      expect(screen.getByLabelText("Dismiss")).toBeInTheDocument();
    });

    it("calls onDismiss when dismiss button clicked", () => {
      const onDismiss = jest.fn();
      render(
        <ErrorAlert {...defaultProps} dismissible onDismiss={onDismiss} />,
      );

      fireEvent.click(screen.getByLabelText("Dismiss"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("dismiss button has hover transition", () => {
      render(
        <ErrorAlert {...defaultProps} dismissible onDismiss={jest.fn()} />,
      );
      const button = screen.getByLabelText("Dismiss");
      expect(button).toHaveClass("hover:opacity-70", "transition-opacity");
    });

    it("dismiss button inherits variant text color", () => {
      render(
        <ErrorAlert
          {...defaultProps}
          variant="warning"
          dismissible
          onDismiss={jest.fn()}
        />,
      );
      const button = screen.getByLabelText("Dismiss");
      expect(button).toHaveClass("text-yellow-400");
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      render(<ErrorAlert {...defaultProps} className="my-custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      render(<ErrorAlert {...defaultProps} className="my-custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("p-3", "rounded", "border", "my-custom-class");
    });
  });

  describe("styling", () => {
    it("has flex layout with gap", () => {
      render(<ErrorAlert {...defaultProps} />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("flex", "items-start", "gap-3");
    });

    it("content wrapper is flexible", () => {
      render(<ErrorAlert {...defaultProps} />);
      const alert = screen.getByRole("alert");
      const contentWrapper = alert.querySelector(".flex-1");
      expect(contentWrapper).toBeInTheDocument();
    });

    it("content text has small size", () => {
      render(<ErrorAlert {...defaultProps} />);
      const alert = screen.getByRole("alert");
      const contentWrapper = alert.querySelector(".flex-1");
      expect(contentWrapper).toHaveClass("text-sm");
    });
  });

  describe("complex content", () => {
    it("renders React elements as children", () => {
      render(
        <ErrorAlert>
          <span data-testid="custom-element">Custom element</span>
        </ErrorAlert>,
      );
      expect(screen.getByTestId("custom-element")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ErrorAlert>
          <span>First line</span>
          <span>Second line</span>
        </ErrorAlert>,
      );
      expect(screen.getByText("First line")).toBeInTheDocument();
      expect(screen.getByText("Second line")).toBeInTheDocument();
    });
  });
});

describe("FormError", () => {
  describe("rendering", () => {
    it("returns null when error is undefined", () => {
      const { container } = render(<FormError />);
      expect(container).toBeEmptyDOMElement();
    });

    it("returns null when error is null", () => {
      const { container } = render(<FormError error={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("returns null when error is empty string", () => {
      const { container } = render(<FormError error="" />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders error message when provided", () => {
      render(<FormError error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("has role='alert' for accessibility", () => {
      render(<FormError error="Error message" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("has error styling classes", () => {
      render(<FormError error="Error message" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass(
        "p-3",
        "bg-red-900/30",
        "border",
        "border-red-500/30",
        "text-red-400",
        "text-sm",
        "rounded",
      );
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      render(<FormError error="Error message" className="my-custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      render(<FormError error="Error message" className="my-custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("p-3", "bg-red-900/30", "my-custom-class");
    });
  });
});
