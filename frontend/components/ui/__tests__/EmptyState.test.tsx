/**
 * Tests for components/ui/EmptyState.tsx
 * EmptyState and NoResults components
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState, NoResults } from "../EmptyState";
import { Calendar, Plus } from "lucide-react";

// Mock the Button component
jest.mock("../Button", () => ({
  Button: ({ children, onClick, icon: Icon, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-testid="action-button">
      {Icon && <Icon className="icon" />}
      {children}
    </button>
  ),
  ButtonVariant: {},
}));

describe("EmptyState", () => {
  const defaultProps = {
    title: "No items found",
  };

  describe("rendering", () => {
    it("renders with title", () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText("No items found")).toBeInTheDocument();
    });

    it("renders title with proper styling", () => {
      render(<EmptyState {...defaultProps} />);
      const title = screen.getByText("No items found");
      expect(title.tagName).toBe("H3");
      expect(title).toHaveClass("text-lg", "font-medium", "text-theme-text");
    });

    it("renders description when provided", () => {
      render(
        <EmptyState {...defaultProps} description="Create your first item to get started." />
      );
      expect(screen.getByText("Create your first item to get started.")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const description = container.querySelector("p.text-sm.text-theme-text-muted");
      expect(description).not.toBeInTheDocument();
    });

    it("renders default Inbox icon when no icon provided", () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("w-12", "h-12", "mx-auto", "mb-3");
    });

    it("renders custom icon when provided", () => {
      const { container } = render(<EmptyState {...defaultProps} icon={Calendar} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("renders children when provided", () => {
      render(
        <EmptyState {...defaultProps}>
          <span data-testid="custom-child">Custom content</span>
        </EmptyState>
      );
      expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    });
  });

  describe("action button", () => {
    it("renders action button when action provided", () => {
      const onClick = jest.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: "Add Item",
            onClick,
          }}
        />
      );
      expect(screen.getByText("Add Item")).toBeInTheDocument();
    });

    it("calls onClick when action button clicked", () => {
      const onClick = jest.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: "Add Item",
            onClick,
          }}
        />
      );

      fireEvent.click(screen.getByTestId("action-button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("uses primary variant by default", () => {
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: "Add Item",
            onClick: jest.fn(),
          }}
        />
      );
      expect(screen.getByTestId("action-button")).toHaveAttribute("data-variant", "primary");
    });

    it("uses custom variant when specified", () => {
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: "Add Item",
            onClick: jest.fn(),
            variant: "secondary",
          }}
        />
      );
      expect(screen.getByTestId("action-button")).toHaveAttribute("data-variant", "secondary");
    });

    it("renders action button with icon when provided", () => {
      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: "Add Item",
            onClick: jest.fn(),
            icon: Plus,
          }}
        />
      );
      const button = screen.getByTestId("action-button");
      const icon = button.querySelector(".icon");
      expect(icon).toBeInTheDocument();
    });

    it("does not render action button when action not provided", () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.queryByTestId("action-button")).not.toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("applies custom className", () => {
      const { container } = render(<EmptyState {...defaultProps} className="my-custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("my-custom-class");
    });

    it("merges custom className with default classes", () => {
      const { container } = render(<EmptyState {...defaultProps} className="my-custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("text-center", "py-12", "my-custom-class");
    });
  });

  describe("styling", () => {
    it("has centered text alignment", () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("text-center");
    });

    it("has vertical padding", () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("py-12");
    });

    it("description has max width and is centered", () => {
      render(<EmptyState {...defaultProps} description="Some description" />);
      const description = screen.getByText("Some description");
      expect(description).toHaveClass("max-w-sm", "mx-auto");
    });
  });
});

describe("NoResults", () => {
  describe("rendering", () => {
    it("renders 'No results found' title", () => {
      render(<NoResults />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("renders default description without query", () => {
      render(<NoResults />);
      expect(screen.getByText("Try adjusting your filters or search criteria.")).toBeInTheDocument();
    });

    it("renders query-specific description when query provided", () => {
      render(<NoResults query="test search" />);
      expect(screen.getByText('We couldn\'t find anything matching "test search".')).toBeInTheDocument();
    });
  });

  describe("clear filters action", () => {
    it("renders clear filters button when onClearFilters provided", () => {
      render(<NoResults onClearFilters={jest.fn()} />);
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });

    it("calls onClearFilters when button clicked", () => {
      const onClearFilters = jest.fn();
      render(<NoResults onClearFilters={onClearFilters} />);

      fireEvent.click(screen.getByTestId("action-button"));
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it("uses secondary variant for clear filters button", () => {
      render(<NoResults onClearFilters={jest.fn()} />);
      expect(screen.getByTestId("action-button")).toHaveAttribute("data-variant", "secondary");
    });

    it("does not render clear filters button when onClearFilters not provided", () => {
      render(<NoResults />);
      expect(screen.queryByTestId("action-button")).not.toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("passes className to EmptyState", () => {
      const { container } = render(<NoResults className="custom-no-results" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-no-results");
    });
  });
});
