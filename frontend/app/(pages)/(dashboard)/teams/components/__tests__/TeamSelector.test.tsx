/**
 * Tests for teams/components/TeamSelector.tsx
 * Squad and department selection dropdown with tabbed interface
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamSelector from "../TeamSelector";
import { Squad } from "@/shared/types/user";

// Mock createPortal to render content inline for testing
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (node: React.ReactNode) => node,
}));

describe("TeamSelector", () => {
  const mockSquads: Squad[] = [
    { id: 1, name: "Frontend Team" },
    { id: 2, name: "Backend Team" },
    { id: 3, name: "DevOps Team" },
  ];

  const mockDepartments = ["Engineering", "Product", "Design", "Marketing"];

  const defaultProps = {
    squads: mockSquads,
    departments: mockDepartments,
    selectedType: "squad" as const,
    selectedId: "1",
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders selected squad name in button", () => {
      render(<TeamSelector {...defaultProps} />);
      expect(screen.getByText("Frontend Team")).toBeInTheDocument();
    });

    it("renders selected department name in button", () => {
      render(
        <TeamSelector
          {...defaultProps}
          selectedType="department"
          selectedId="Engineering"
        />,
      );
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    it("renders dropdown trigger button", () => {
      render(<TeamSelector {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows 'Squad' indicator when squad is selected", () => {
      render(<TeamSelector {...defaultProps} />);
      expect(screen.getByText("Squad")).toBeInTheDocument();
    });

    it("shows 'Dept' indicator when department is selected", () => {
      render(
        <TeamSelector
          {...defaultProps}
          selectedType="department"
          selectedId="Engineering"
        />,
      );
      expect(screen.getByText("Dept")).toBeInTheDocument();
    });
  });

  describe("dropdown behavior", () => {
    it("opens dropdown when clicked", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Should show Squads tab (since squad is selected)
      expect(screen.getByText("Squads")).toBeInTheDocument();
      expect(screen.getByText("Departments")).toBeInTheDocument();
    });

    it("shows squads in dropdown when Squads tab is active", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Squads tab is active by default when selectedType is squad
      // All squads should be visible
      mockSquads.forEach((squad) => {
        const buttons = screen.getAllByText(squad.name);
        // One in the trigger, one in the dropdown
        expect(buttons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows departments when Departments tab is clicked", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Click Departments tab
      fireEvent.click(screen.getByText("Departments"));

      // Departments should be visible
      mockDepartments.forEach((dept) => {
        expect(screen.getByText(dept)).toBeInTheDocument();
      });
    });

    it("shows squad count badge", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("3")).toBeInTheDocument(); // 3 squads
    });

    it("shows department count badge", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("4")).toBeInTheDocument(); // 4 departments
    });
  });

  describe("selection", () => {
    it("calls onSelect when squad is clicked", async () => {
      render(<TeamSelector {...defaultProps} selectedId="1" />);

      fireEvent.click(screen.getByRole("button"));

      // Click Backend Team in the dropdown
      const backendButtons = screen.getAllByText("Backend Team");
      // The one in the dropdown (not the trigger)
      fireEvent.click(backendButtons[backendButtons.length - 1]);

      expect(defaultProps.onSelect).toHaveBeenCalledWith("squad", "2");
    });

    it("calls onSelect when department is clicked", async () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Click Departments tab first
      fireEvent.click(screen.getByText("Departments"));

      // Click Product department
      fireEvent.click(screen.getByText("Product"));

      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        "department",
        "Product",
      );
    });
  });

  describe("search functionality", () => {
    it("renders search input", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByPlaceholderText(/search squads/i)).toBeInTheDocument();
    });

    it("shows search input for departments", () => {
      render(
        <TeamSelector
          {...defaultProps}
          selectedType="department"
          selectedId="Engineering"
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(
        screen.getByPlaceholderText(/search departments/i),
      ).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("handles empty squads", () => {
      render(<TeamSelector {...defaultProps} squads={[]} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText(/no squads found/i)).toBeInTheDocument();
    });

    it("handles empty departments", () => {
      render(
        <TeamSelector
          {...defaultProps}
          departments={[]}
          selectedType="department"
          selectedId=""
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText(/no departments found/i)).toBeInTheDocument();
    });
  });

  describe("tabs", () => {
    it("shows Squads tab label", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Squads")).toBeInTheDocument();
    });

    it("shows Departments tab label", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Departments")).toBeInTheDocument();
    });

    it("switches content when tab is clicked", () => {
      render(<TeamSelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Initially shows squads
      expect(screen.getByPlaceholderText(/search squads/i)).toBeInTheDocument();

      // Click Departments tab
      fireEvent.click(screen.getByText("Departments"));

      // Now shows department search
      expect(
        screen.getByPlaceholderText(/search departments/i),
      ).toBeInTheDocument();
    });
  });

  describe("placeholder text", () => {
    it("shows placeholder when no selection", () => {
      render(<TeamSelector {...defaultProps} selectedId="" />);

      expect(screen.getByText("Select team...")).toBeInTheDocument();
    });
  });
});
