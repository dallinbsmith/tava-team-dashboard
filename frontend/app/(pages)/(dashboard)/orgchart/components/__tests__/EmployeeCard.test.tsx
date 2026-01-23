/**
 * Tests for orgchart/components/EmployeeCard.tsx
 * Employee card component with link and details
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import EmployeeCard from "../EmployeeCard";
import { User } from "@/shared/types/user";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

// Mock Avatar component
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
    s3AvatarUrl?: string;
    size?: string;
    className?: string;
  }) {
    return (
      <div
        data-testid="avatar"
        data-firstname={firstName}
        data-lastname={lastName}
      >
        Avatar
      </div>
    );
  };
});

describe("EmployeeCard", () => {
  const createMockEmployee = (overrides: Partial<User> = {}): User => ({
    id: 1,
    auth0_id: "auth0|123",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "employee",
    title: "Software Engineer",
    department: "Engineering",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    date_started: "2023-06-15T00:00:00Z",
    ...overrides,
  });

  describe("rendering", () => {
    it("renders employee name in heading", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("John Doe");
    });

    it("renders employee title", () => {
      const employee = createMockEmployee({ title: "Senior Developer" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    });

    it("renders employee email", () => {
      const employee = createMockEmployee({ email: "jane@example.com" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("renders department", () => {
      const employee = createMockEmployee({ department: "Marketing" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText("Marketing")).toBeInTheDocument();
    });

    it("renders avatar", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });
  });

  describe("link behavior", () => {
    it("links to employee detail page", () => {
      const employee = createMockEmployee({ id: 42 });
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/employee/42");
    });
  });

  describe("date formatting", () => {
    it("formats start date correctly", () => {
      const employee = createMockEmployee({
        date_started: "2023-06-15T00:00:00Z",
      });
      render(<EmployeeCard employee={employee} />);

      // Date format is "Started {date}" where date varies by locale
      expect(screen.getByText(/Started/)).toBeInTheDocument();
    });

    it("shows N/A when no start date", () => {
      const employee = createMockEmployee({ date_started: undefined });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText(/Started N\/A/)).toBeInTheDocument();
    });
  });

  describe("role indicator", () => {
    it("shows supervisor shield icon for supervisors", () => {
      const employee = createMockEmployee({ role: "supervisor" });
      render(<EmployeeCard employee={employee} />);

      const shieldIcon = screen.getByLabelText("Supervisor");
      expect(shieldIcon).toBeInTheDocument();
    });

    it("does not show shield icon for regular employees", () => {
      const employee = createMockEmployee({ role: "employee" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.queryByLabelText("Supervisor")).not.toBeInTheDocument();
    });

    it("does not show shield icon for admin role", () => {
      const employee = createMockEmployee({ role: "admin" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.queryByLabelText("Supervisor")).not.toBeInTheDocument();
    });
  });

  describe("squads display", () => {
    it("renders squads when present", () => {
      const employee = createMockEmployee({
        squads: [
          { id: 1, name: "Frontend Team" },
          { id: 2, name: "Backend Team" },
        ],
      });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText("Frontend Team")).toBeInTheDocument();
      expect(screen.getByText("Backend Team")).toBeInTheDocument();
    });

    it("does not render squad section when no squads", () => {
      const employee = createMockEmployee({ squads: [] });
      render(<EmployeeCard employee={employee} />);

      expect(screen.queryByText("Frontend Team")).not.toBeInTheDocument();
    });

    it("does not render squad section when squads is undefined", () => {
      const employee = createMockEmployee({ squads: undefined });
      render(<EmployeeCard employee={employee} />);

      // No squad badges should be rendered
      const squadBadges = screen.queryAllByText(/Team$/);
      expect(squadBadges.length).toBe(0);
    });
  });

  describe("department display", () => {
    it("renders department when present", () => {
      const employee = createMockEmployee({ department: "Engineering" });
      render(<EmployeeCard employee={employee} />);

      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    it("does not render department section when department is undefined", () => {
      const employee = createMockEmployee({ department: undefined });
      const { container } = render(<EmployeeCard employee={employee} />);

      // Should not have the department row
      const departmentIcon = container.querySelector(
        '[data-testid="department-icon"]',
      );
      expect(departmentIcon).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("has card styling", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass(
        "bg-theme-surface",
        "border",
        "border-theme-border",
      );
    });

    it("has hover styling classes", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass(
        "hover:border-primary-500/50",
        "hover:shadow-lg",
      );
    });

    it("has transition classes", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("transition-all", "duration-300");
    });

    it("has group class for hover effects", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("group");
    });
  });

  describe("responsive styling", () => {
    it("has responsive padding classes", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("p-4", "sm:p-6");
    });

    it("has rounded-lg class for border radius", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("rounded-lg");
    });

    it("has responsive text size classes on heading", () => {
      const employee = createMockEmployee();
      render(<EmployeeCard employee={employee} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveClass("text-sm", "sm:text-base");
    });
  });

  describe("icons", () => {
    it("renders mail icon with email", () => {
      const employee = createMockEmployee();
      const { container } = render(<EmployeeCard employee={employee} />);

      // Mail icon is in the card
      const mailIcons = container.querySelectorAll("svg.lucide-mail");
      expect(mailIcons.length).toBe(1);
    });

    it("renders calendar icon with start date", () => {
      const employee = createMockEmployee();
      const { container } = render(<EmployeeCard employee={employee} />);

      const calendarIcons = container.querySelectorAll("svg.lucide-calendar");
      expect(calendarIcons.length).toBe(1);
    });

    it("renders building icon with department", () => {
      const employee = createMockEmployee({ department: "Engineering" });
      const { container } = render(<EmployeeCard employee={employee} />);

      const buildingIcons = container.querySelectorAll("svg.lucide-building2");
      expect(buildingIcons.length).toBe(1);
    });

    it("renders chevron right icon", () => {
      const employee = createMockEmployee();
      const { container } = render(<EmployeeCard employee={employee} />);

      const chevronIcons = container.querySelectorAll(
        "svg.lucide-chevron-right",
      );
      expect(chevronIcons.length).toBe(1);
    });
  });
});
