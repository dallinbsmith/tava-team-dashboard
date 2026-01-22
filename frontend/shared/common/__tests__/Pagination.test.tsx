/**
 * Tests for shared/common/Pagination.tsx
 * Pagination component with prev/next navigation
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination";

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders when totalPages > 1", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByTitle("Previous")).toBeInTheDocument();
      expect(screen.getByTitle("Next")).toBeInTheDocument();
    });

    it("returns null when totalPages is 1", () => {
      const { container } = render(<Pagination {...defaultProps} totalPages={1} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("returns null when totalPages is 0", () => {
      const { container } = render(<Pagination {...defaultProps} totalPages={0} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("displays current page and total pages", () => {
      render(<Pagination {...defaultProps} currentPage={3} totalPages={10} />);
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("/ 10")).toBeInTheDocument();
    });
  });

  describe("previous button", () => {
    it("is disabled on first page", () => {
      render(<Pagination {...defaultProps} currentPage={1} />);
      const prevButton = screen.getByTitle("Previous");
      expect(prevButton).toBeDisabled();
    });

    it("is enabled when not on first page", () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      const prevButton = screen.getByTitle("Previous");
      expect(prevButton).not.toBeDisabled();
    });

    it("calls onPageChange with previous page number when clicked", () => {
      const onPageChange = jest.fn();
      render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByTitle("Previous"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("does not call onPageChange when disabled", () => {
      const onPageChange = jest.fn();
      render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);

      const prevButton = screen.getByTitle("Previous");
      fireEvent.click(prevButton);
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("next button", () => {
    it("is disabled on last page", () => {
      render(<Pagination {...defaultProps} currentPage={5} totalPages={5} />);
      const nextButton = screen.getByTitle("Next");
      expect(nextButton).toBeDisabled();
    });

    it("is enabled when not on last page", () => {
      render(<Pagination {...defaultProps} currentPage={4} totalPages={5} />);
      const nextButton = screen.getByTitle("Next");
      expect(nextButton).not.toBeDisabled();
    });

    it("calls onPageChange with next page number when clicked", () => {
      const onPageChange = jest.fn();
      render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByTitle("Next"));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("does not call onPageChange when disabled", () => {
      const onPageChange = jest.fn();
      render(<Pagination {...defaultProps} currentPage={5} totalPages={5} onPageChange={onPageChange} />);

      const nextButton = screen.getByTitle("Next");
      fireEvent.click(nextButton);
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("navigation flow", () => {
    it("can navigate from first to last page", () => {
      const onPageChange = jest.fn();
      const { rerender } = render(
        <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
      );

      // Go to page 2
      fireEvent.click(screen.getByTitle("Next"));
      expect(onPageChange).toHaveBeenLastCalledWith(2);

      // Simulate state update
      rerender(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />);

      // Go to page 3
      fireEvent.click(screen.getByTitle("Next"));
      expect(onPageChange).toHaveBeenLastCalledWith(3);

      // Simulate state update
      rerender(<Pagination currentPage={3} totalPages={3} onPageChange={onPageChange} />);

      // Should not be able to go further
      const nextButton = screen.getByTitle("Next");
      expect(nextButton).toBeDisabled();
    });

    it("can navigate from last to first page", () => {
      const onPageChange = jest.fn();
      const { rerender } = render(
        <Pagination currentPage={3} totalPages={3} onPageChange={onPageChange} />
      );

      // Go to page 2
      fireEvent.click(screen.getByTitle("Previous"));
      expect(onPageChange).toHaveBeenLastCalledWith(2);

      // Simulate state update
      rerender(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />);

      // Go to page 1
      fireEvent.click(screen.getByTitle("Previous"));
      expect(onPageChange).toHaveBeenLastCalledWith(1);

      // Simulate state update
      rerender(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />);

      // Should not be able to go further
      const prevButton = screen.getByTitle("Previous");
      expect(prevButton).toBeDisabled();
    });
  });

  describe("styling", () => {
    it("has proper layout classes", () => {
      const { container } = render(<Pagination {...defaultProps} />);
      const paginationDiv = container.firstChild;
      expect(paginationDiv).toHaveClass("flex", "items-center", "justify-between");
    });

    it("current page text has proper styling", () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      const currentPage = screen.getByText("2");
      expect(currentPage).toHaveClass("font-medium", "text-theme-text");
    });

    it("buttons have proper hover styles", () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      const prevButton = screen.getByTitle("Previous");
      expect(prevButton).toHaveClass("hover:bg-theme-elevated");
    });
  });

  describe("edge cases", () => {
    it("handles single middle page", () => {
      render(<Pagination currentPage={5} totalPages={10} onPageChange={jest.fn()} />);

      expect(screen.getByTitle("Previous")).not.toBeDisabled();
      expect(screen.getByTitle("Next")).not.toBeDisabled();
    });

    it("handles large page numbers", () => {
      render(<Pagination currentPage={999} totalPages={1000} onPageChange={jest.fn()} />);

      expect(screen.getByText("999")).toBeInTheDocument();
      expect(screen.getByText("/ 1000")).toBeInTheDocument();
    });
  });
});
