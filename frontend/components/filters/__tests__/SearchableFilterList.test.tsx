/**
 * Tests for components/filters/SearchableFilterList.tsx
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchableFilterList from "../SearchableFilterList";

// Mock the debounce hook to make tests synchronous
jest.mock("@restart/hooks/useDebouncedValue", () => ({
  __esModule: true,
  default: (value: string) => value, // Return value immediately without debounce
}));

describe("SearchableFilterList", () => {
  const defaultProps = {
    items: ["Apple", "Banana", "Cherry", "Date", "Elderberry"],
    selectedValue: "all",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders search input", () => {
      render(<SearchableFilterList {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("renders all items initially", () => {
      render(<SearchableFilterList {...defaultProps} />);

      expect(screen.getByText("Apple")).toBeInTheDocument();
      expect(screen.getByText("Banana")).toBeInTheDocument();
      expect(screen.getByText("Cherry")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Elderberry")).toBeInTheDocument();
    });

    it("renders items as FilterCheckbox components", () => {
      render(<SearchableFilterList {...defaultProps} />);

      // Each item should be a button (FilterCheckbox renders as button)
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(5);
    });

    it("uses custom placeholder", () => {
      render(<SearchableFilterList {...defaultProps} placeholder="Find fruit..." />);
      expect(screen.getByPlaceholderText("Find fruit...")).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("filters items based on search input", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "ber");

      // Should show Elderberry (contains "ber")
      expect(screen.getByText("Elderberry")).toBeInTheDocument();

      // Should not show items without "ber"
      expect(screen.queryByText("Apple")).not.toBeInTheDocument();
      expect(screen.queryByText("Banana")).not.toBeInTheDocument();
      expect(screen.queryByText("Cherry")).not.toBeInTheDocument();
      expect(screen.queryByText("Date")).not.toBeInTheDocument();
    });

    it("filters case-insensitively", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "APPLE");

      expect(screen.getByText("Apple")).toBeInTheDocument();
    });

    it("shows 'No results found' when no items match", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      await userEvent.type(searchInput, "xyz");

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("clears filter when search is cleared", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");

      // Type to filter
      await userEvent.type(searchInput, "Apple");
      expect(screen.queryByText("Banana")).not.toBeInTheDocument();

      // Clear the search
      await userEvent.clear(searchInput);

      // All items should be visible again
      expect(screen.getByText("Apple")).toBeInTheDocument();
      expect(screen.getByText("Banana")).toBeInTheDocument();
    });
  });

  describe("selection behavior", () => {
    it("shows selected item as checked", () => {
      render(<SearchableFilterList {...defaultProps} selectedValue="Banana" />);

      // Find the Banana button and check if its checkbox is checked
      const bananaButton = screen.getByText("Banana").closest("button");
      const checkbox = bananaButton?.querySelector("div");

      expect(checkbox).toHaveClass("bg-accent-500");
    });

    it("shows other items as unchecked", () => {
      render(<SearchableFilterList {...defaultProps} selectedValue="Banana" />);

      // Apple should be unchecked
      const appleButton = screen.getByText("Apple").closest("button");
      const checkbox = appleButton?.querySelector("div");

      expect(checkbox).toHaveClass("bg-transparent");
    });

    it("calls onChange with item value when item is selected", async () => {
      const onChange = jest.fn();
      render(<SearchableFilterList {...defaultProps} onChange={onChange} />);

      // Click on Cherry
      fireEvent.click(screen.getByText("Cherry"));

      expect(onChange).toHaveBeenCalledWith("Cherry");
    });

    it("calls onChange with allValue when item is deselected", async () => {
      const onChange = jest.fn();
      render(
        <SearchableFilterList
          {...defaultProps}
          selectedValue="Cherry"
          onChange={onChange}
        />
      );

      // Click on Cherry (already selected) to deselect
      fireEvent.click(screen.getByText("Cherry"));

      // Should call with "all" (default allValue)
      expect(onChange).toHaveBeenCalledWith("all");
    });

    it("uses custom allValue for deselection", async () => {
      const onChange = jest.fn();
      render(
        <SearchableFilterList
          {...defaultProps}
          selectedValue="Cherry"
          onChange={onChange}
          allValue="none"
        />
      );

      // Click on Cherry to deselect
      fireEvent.click(screen.getByText("Cherry"));

      expect(onChange).toHaveBeenCalledWith("none");
    });
  });

  describe("scrollable list", () => {
    it("applies default maxHeight class", () => {
      const { container } = render(<SearchableFilterList {...defaultProps} />);

      // Find the scrollable container
      const scrollContainer = container.querySelector(".max-h-32");
      expect(scrollContainer).toBeInTheDocument();
    });

    it("applies custom maxHeight class", () => {
      const { container } = render(
        <SearchableFilterList {...defaultProps} maxHeight="max-h-64" />
      );

      const scrollContainer = container.querySelector(".max-h-64");
      expect(scrollContainer).toBeInTheDocument();
    });

    it("has overflow-y-auto for scrolling", () => {
      const { container } = render(<SearchableFilterList {...defaultProps} />);

      const scrollContainer = container.querySelector(".overflow-y-auto");
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe("search input", () => {
    it("has search icon", () => {
      render(<SearchableFilterList {...defaultProps} />);

      // Search icon should be present (SVG)
      const searchContainer = screen.getByPlaceholderText("Search...").parentElement;
      const svg = searchContainer?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("updates search value as user types", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...") as HTMLInputElement;
      await userEvent.type(searchInput, "test");

      expect(searchInput.value).toBe("test");
    });
  });

  describe("empty items list", () => {
    it("shows 'No results found' when items array is empty", () => {
      render(<SearchableFilterList {...defaultProps} items={[]} />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  describe("keyboard interaction", () => {
    it("allows typing in search input", async () => {
      render(<SearchableFilterList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search...");
      searchInput.focus();

      await userEvent.keyboard("app");

      expect(searchInput).toHaveValue("app");
    });
  });
});
