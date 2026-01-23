/**
 * Tests for orgchart/components/FilterButton.tsx
 * Filter dropdown with role, department, and squad filters
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterButton from "../FilterButton";

// Mock the filter components
jest.mock("@/components", () => ({
  FilterDropdown: ({
    children,
    isOpen,
    onToggle,
    onClose,
    activeFilterCount,
    onClearAll,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    activeFilterCount: number;
    onClearAll: () => void;
  }) => (
    <div data-testid="filter-dropdown" data-is-open={isOpen} data-count={activeFilterCount}>
      <button onClick={onToggle} data-testid="toggle-button">
        Toggle
      </button>
      <button onClick={onClose} data-testid="close-button">
        Close
      </button>
      <button onClick={onClearAll} data-testid="clear-all-button">
        Clear All
      </button>
      {isOpen && <div data-testid="dropdown-content">{children}</div>}
    </div>
  ),
  FilterSection: ({
    children,
    title,
    isExpanded,
    onToggle,
  }: {
    children: React.ReactNode;
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div data-testid={`filter-section-${title.toLowerCase()}`} data-expanded={isExpanded}>
      <button onClick={onToggle} data-testid={`toggle-${title.toLowerCase()}`}>
        {title}
      </button>
      {isExpanded && children}
    </div>
  ),
  FilterCheckbox: ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <label data-testid={`checkbox-${label.toLowerCase()}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  ),
  SearchableFilterList: ({
    items,
    selectedValues,
    onChange,
    placeholder,
  }: {
    items: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
  }) => (
    <div data-testid={`searchable-list-${placeholder.toLowerCase().replace(/\s+/g, "-")}`}>
      <input placeholder={placeholder} data-testid="search-input" />
      {items.map((item) => (
        <label key={item}>
          <input
            type="checkbox"
            checked={selectedValues.includes(item)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selectedValues, item]);
              } else {
                onChange(selectedValues.filter((v) => v !== item));
              }
            }}
            data-testid={`checkbox-${item.toLowerCase()}`}
          />
          {item}
        </label>
      ))}
    </div>
  ),
}));

describe("FilterButton", () => {
  const defaultProps = {
    isOpen: true,
    roleFilters: [] as ("employee" | "supervisor")[],
    departmentFilters: [] as string[],
    squadFilters: [] as string[],
    departments: ["Engineering", "Marketing", "Design"],
    squads: ["Frontend", "Backend", "DevOps"],
    onToggle: jest.fn(),
    onClose: jest.fn(),
    onRoleFiltersChange: jest.fn(),
    onDepartmentFiltersChange: jest.fn(),
    onSquadFiltersChange: jest.fn(),
    onClearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders filter dropdown", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-dropdown")).toBeInTheDocument();
    });

    it("renders role section", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-role")).toBeInTheDocument();
    });

    it("renders department section", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-department")).toBeInTheDocument();
    });

    it("renders squad section", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-squad")).toBeInTheDocument();
    });

    it("passes isOpen to dropdown", () => {
      render(<FilterButton {...defaultProps} isOpen={false} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-is-open", "false");
    });

    it("passes isOpen true to dropdown", () => {
      render(<FilterButton {...defaultProps} isOpen={true} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-is-open", "true");
    });
  });

  describe("role section", () => {
    it("is expanded by default", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-role")).toHaveAttribute("data-expanded", "true");
    });

    it("renders supervisor checkbox", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("checkbox-supervisor")).toBeInTheDocument();
    });

    it("renders employee checkbox", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("checkbox-employee")).toBeInTheDocument();
    });

    it("supervisor checkbox is checked when roleFilters includes supervisor", () => {
      render(<FilterButton {...defaultProps} roleFilters={["supervisor"]} />);
      const checkbox = screen.getByTestId("checkbox-supervisor").querySelector("input");
      expect(checkbox).toBeChecked();
    });

    it("employee checkbox is checked when roleFilters includes employee", () => {
      render(<FilterButton {...defaultProps} roleFilters={["employee"]} />);
      const checkbox = screen.getByTestId("checkbox-employee").querySelector("input");
      expect(checkbox).toBeChecked();
    });

    it("calls onRoleFiltersChange with supervisor added when supervisor checked", () => {
      const onRoleFiltersChange = jest.fn();
      render(<FilterButton {...defaultProps} onRoleFiltersChange={onRoleFiltersChange} />);

      const checkbox = screen.getByTestId("checkbox-supervisor").querySelector("input")!;
      fireEvent.click(checkbox);

      expect(onRoleFiltersChange).toHaveBeenCalledWith(["supervisor"]);
    });

    it("calls onRoleFiltersChange with supervisor removed when supervisor unchecked", () => {
      const onRoleFiltersChange = jest.fn();
      render(
        <FilterButton {...defaultProps} roleFilters={["supervisor"]} onRoleFiltersChange={onRoleFiltersChange} />
      );

      const checkbox = screen.getByTestId("checkbox-supervisor").querySelector("input")!;
      fireEvent.click(checkbox);

      expect(onRoleFiltersChange).toHaveBeenCalledWith([]);
    });

    it("toggles role section expansion", () => {
      render(<FilterButton {...defaultProps} />);

      const toggleButton = screen.getByTestId("toggle-role");
      fireEvent.click(toggleButton);

      // After clicking, it should collapse
      expect(screen.getByTestId("filter-section-role")).toHaveAttribute("data-expanded", "false");
    });
  });

  describe("department section", () => {
    it("is collapsed by default", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-department")).toHaveAttribute(
        "data-expanded",
        "false"
      );
    });

    it("shows department list when expanded", () => {
      render(<FilterButton {...defaultProps} />);

      // Expand the department section
      fireEvent.click(screen.getByTestId("toggle-department"));

      expect(screen.getByTestId("searchable-list-search-departments")).toBeInTheDocument();
    });

    it("calls onDepartmentFiltersChange when department selected", () => {
      const onDepartmentFiltersChange = jest.fn();
      render(<FilterButton {...defaultProps} onDepartmentFiltersChange={onDepartmentFiltersChange} />);

      // Expand department section
      fireEvent.click(screen.getByTestId("toggle-department"));

      const checkbox = screen.getByTestId("checkbox-engineering");
      fireEvent.click(checkbox);

      expect(onDepartmentFiltersChange).toHaveBeenCalledWith(["Engineering"]);
    });
  });

  describe("squad section", () => {
    it("is collapsed by default", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-section-squad")).toHaveAttribute("data-expanded", "false");
    });

    it("shows squad list when expanded", () => {
      render(<FilterButton {...defaultProps} />);

      // Expand the squad section
      fireEvent.click(screen.getByTestId("toggle-squad"));

      expect(screen.getByTestId("searchable-list-search-squads")).toBeInTheDocument();
    });

    it("calls onSquadFiltersChange when squad selected", () => {
      const onSquadFiltersChange = jest.fn();
      render(<FilterButton {...defaultProps} onSquadFiltersChange={onSquadFiltersChange} />);

      // Expand squad section
      fireEvent.click(screen.getByTestId("toggle-squad"));

      const checkbox = screen.getByTestId("checkbox-frontend");
      fireEvent.click(checkbox);

      expect(onSquadFiltersChange).toHaveBeenCalledWith(["Frontend"]);
    });
  });

  describe("active filter count", () => {
    it("shows 0 when no filters active", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "0");
    });

    it("shows 1 when one role filter active", () => {
      render(<FilterButton {...defaultProps} roleFilters={["employee"]} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "1");
    });

    it("shows 1 when one department filter active", () => {
      render(<FilterButton {...defaultProps} departmentFilters={["Engineering"]} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "1");
    });

    it("shows 1 when one squad filter active", () => {
      render(<FilterButton {...defaultProps} squadFilters={["Frontend"]} />);
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "1");
    });

    it("shows 3 when one of each filter active", () => {
      render(
        <FilterButton
          {...defaultProps}
          roleFilters={["employee"]}
          departmentFilters={["Engineering"]}
          squadFilters={["Frontend"]}
        />
      );
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "3");
    });

    it("shows 5 when multiple filters active across categories", () => {
      render(
        <FilterButton
          {...defaultProps}
          roleFilters={["employee", "supervisor"]}
          departmentFilters={["Engineering", "Marketing"]}
          squadFilters={["Frontend"]}
        />
      );
      expect(screen.getByTestId("filter-dropdown")).toHaveAttribute("data-count", "5");
    });
  });

  describe("callbacks", () => {
    it("calls onToggle when toggle button clicked", () => {
      const onToggle = jest.fn();
      render(<FilterButton {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByTestId("toggle-button"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button clicked", () => {
      const onClose = jest.fn();
      render(<FilterButton {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId("close-button"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClearAll when clear all button clicked", () => {
      const onClearAll = jest.fn();
      render(<FilterButton {...defaultProps} onClearAll={onClearAll} />);

      fireEvent.click(screen.getByTestId("clear-all-button"));
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("section toggle persistence", () => {
    it("maintains section state across re-renders", () => {
      const { rerender } = render(<FilterButton {...defaultProps} />);

      // Expand department and collapse role
      fireEvent.click(screen.getByTestId("toggle-department"));
      fireEvent.click(screen.getByTestId("toggle-role"));

      // Re-render with different props
      rerender(<FilterButton {...defaultProps} roleFilters={["employee"]} />);

      // Section states should be maintained
      expect(screen.getByTestId("filter-section-role")).toHaveAttribute("data-expanded", "false");
      expect(screen.getByTestId("filter-section-department")).toHaveAttribute(
        "data-expanded",
        "true"
      );
    });
  });
});
