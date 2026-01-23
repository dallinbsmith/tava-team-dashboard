/**
 * Tests for components/ErrorBoundary.tsx
 * ErrorBoundary and QueryErrorFallback components
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, QueryErrorFallback } from "../ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div data-testid="child-content">Child content</div>;
};

// Suppress console.error during tests for cleaner output
const originalConsoleError = console.error;

describe("ErrorBoundary", () => {
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering without errors", () => {
    it("renders children when no error", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  describe("error catching", () => {
    it("catches errors and shows fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("displays error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("shows 'An unexpected error occurred' subtitle", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });

    it("shows 'Try Again' button", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("shows 'Go Home' link", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute("href", "/");
    });
  });

  describe("reset functionality", () => {
    it("resets error state when Try Again clicked", () => {
      // Use a component we can control
      let shouldThrow = true;
      const ControlledThrow = () => {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return <div data-testid="recovered">Recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ControlledThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Stop throwing
      shouldThrow = false;

      // Click try again
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      // Re-render with new state
      rerender(
        <ErrorBoundary>
          <ControlledThrow />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("recovered")).toBeInTheDocument();
    });
  });

  describe("custom fallback", () => {
    it("renders custom fallback element", () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("renders custom fallback function with error", () => {
      render(
        <ErrorBoundary
          fallback={(error) => <div data-testid="custom-fallback">Error: {error.message}</div>}
        >
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Error: Test error message")).toBeInTheDocument();
    });

    it("renders custom fallback function with resetError", () => {
      let shouldThrow = true;
      const ControlledThrow = () => {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return <div data-testid="recovered">Recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary
          fallback={(error, resetError) => (
            <div>
              <span>Error occurred</span>
              <button onClick={resetError}>Custom Reset</button>
            </div>
          )}
        >
          <ControlledThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText("Error occurred")).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: "Custom Reset" }));

      rerender(
        <ErrorBoundary
          fallback={(error, resetError) => (
            <div>
              <span>Error occurred</span>
              <button onClick={resetError}>Custom Reset</button>
            </div>
          )}
        >
          <ControlledThrow />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("recovered")).toBeInTheDocument();
    });
  });

  describe("minimal mode", () => {
    it("renders minimal fallback when minimal prop is true", () => {
      render(
        <ErrorBoundary minimal>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /go home/i })).not.toBeInTheDocument();
    });

    it("minimal mode has compact styling", () => {
      const { container } = render(
        <ErrorBoundary minimal>
          <ThrowError />
        </ErrorBoundary>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("p-4", "text-center");
    });

    it("minimal mode reset works", () => {
      let shouldThrow = true;
      const ControlledThrow = () => {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return <div data-testid="recovered">Recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary minimal>
          <ControlledThrow />
        </ErrorBoundary>
      );

      shouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      rerender(
        <ErrorBoundary minimal>
          <ControlledThrow />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("recovered")).toBeInTheDocument();
    });
  });

  describe("onError callback", () => {
    it("calls onError when error is caught", () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it("passes the error object to onError", () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe("Test error message");
    });
  });

  describe("styling", () => {
    it("has proper container styling", () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("min-h-[300px]", "flex", "items-center", "justify-center");
    });

    it("has proper card styling", () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const card = container.querySelector(".bg-theme-surface");
      expect(card).toHaveClass("border", "border-theme-border", "p-6");
    });

    it("error message has mono font", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByText("Test error message");
      expect(errorMessage).toHaveClass("font-mono");
    });
  });

  describe("alert icon", () => {
    it("renders alert icon", () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const iconContainer = container.querySelector(".bg-red-900\\/40");
      expect(iconContainer).toBeInTheDocument();
    });
  });
});

describe("QueryErrorFallback", () => {
  describe("rendering", () => {
    it("renders error message", () => {
      render(<QueryErrorFallback error={new Error("Failed to fetch data")} />);

      expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<QueryErrorFallback error={new Error("Test error")} />);

      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });

    it("renders alert icon", () => {
      const { container } = render(<QueryErrorFallback error={new Error("Test")} />);

      const iconContainer = container.querySelector(".bg-red-900\\/40");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("retry button", () => {
    it("renders retry button when resetErrorBoundary provided", () => {
      render(<QueryErrorFallback error={new Error("Test error")} resetErrorBoundary={jest.fn()} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("does not render retry button when resetErrorBoundary not provided", () => {
      render(<QueryErrorFallback error={new Error("Test error")} />);

      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

    it("calls resetErrorBoundary when retry clicked", () => {
      const resetErrorBoundary = jest.fn();

      render(
        <QueryErrorFallback
          error={new Error("Test error")}
          resetErrorBoundary={resetErrorBoundary}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
    });
  });

  describe("styling", () => {
    it("has surface background", () => {
      const { container } = render(<QueryErrorFallback error={new Error("Test")} />);

      expect(container.firstChild).toHaveClass("bg-theme-surface", "border", "border-theme-border");
    });

    it("has proper padding", () => {
      const { container } = render(<QueryErrorFallback error={new Error("Test")} />);

      expect(container.firstChild).toHaveClass("p-6");
    });

    it("retry button has primary text color", () => {
      render(<QueryErrorFallback error={new Error("Test error")} resetErrorBoundary={jest.fn()} />);

      const button = screen.getByRole("button", { name: /retry/i });
      expect(button).toHaveClass("text-primary-400");
    });
  });
});
