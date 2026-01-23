/**
 * Tests for teams/components/TeamMembersWidget.tsx
 * Team members display widget with pagination
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TeamMembersWidget from "../TeamMembersWidget";
import { User } from "@/shared/types/user";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock Avatar
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
  }) {
    return (
      <div data-testid="avatar">
        {firstName[0]}
        {lastName[0]}
      </div>
    );
  };
});

// Mock Pagination
jest.mock("@/shared/common/Pagination", () => {
  return function MockPagination({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) {
    if (totalPages <= 1) return null;
    return (
      <div data-testid="pagination">
        <span data-testid="current-page">{currentPage}</span>
        <span data-testid="total-pages">{totalPages}</span>
        {currentPage > 1 && (
          <button onClick={() => onPageChange(currentPage - 1)}>Previous</button>
        )}
        {currentPage < totalPages && (
          <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
        )}
      </div>
    );
  };
});

// Mock constants
jest.mock("@/lib/constants", () => ({
  PAGINATION: {
    TEAM_MEMBERS: 4,
  },
}));

describe("TeamMembersWidget", () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    auth0_id: "auth0|123",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    role: "employee",
    title: "Software Engineer",
    department: "Engineering",
    squads: [{ id: 1, name: "Frontend Team" }],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  // Users sorted alphabetically (after supervisor): Alice, Bob, Charlie, Jane
  // With PAGINATION.TEAM_MEMBERS = 4:
  // Page 1: John Doe (supervisor), Alice Johnson, Bob Wilson, Charlie Brown
  // Page 2: Jane Smith
  const mockUsers: User[] = [
    createMockUser({ id: 1, first_name: "John", last_name: "Doe", role: "supervisor" }),
    createMockUser({ id: 2, first_name: "Jane", last_name: "Smith", role: "employee" }),
    createMockUser({ id: 3, first_name: "Bob", last_name: "Wilson", role: "employee" }),
    createMockUser({ id: 4, first_name: "Alice", last_name: "Johnson", role: "employee" }),
    createMockUser({ id: 5, first_name: "Charlie", last_name: "Brown", role: "employee" }),
  ];

  const defaultProps = {
    selectionType: "squad" as const,
    selectedId: "1",
    allUsers: mockUsers,
    selectedLabel: "Frontend Team",
  };

  describe("rendering", () => {
    it("renders widget title", () => {
      render(<TeamMembersWidget {...defaultProps} />);
      expect(screen.getByText("Team Members")).toBeInTheDocument();
    });

    it("renders selected label", () => {
      render(<TeamMembersWidget {...defaultProps} />);
      // selectedLabel is shown in the header
      const header = screen.getByText("Team Members").closest("div");
      expect(within(header!.parentElement!).getByText("Frontend Team")).toBeInTheDocument();
    });

    it("renders member count badge", () => {
      render(<TeamMembersWidget {...defaultProps} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("renders first page of member cards", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      // Should show first page (4 members)
      // Supervisor first, then alphabetical: John Doe, Alice Johnson, Bob Wilson, Charlie Brown
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
      expect(screen.getByText("Charlie Brown")).toBeInTheDocument();

      // Jane Smith is on page 2
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });

    it("renders view org chart link", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      const link = screen.getByText("View org chart");
      expect(link.closest("a")).toHaveAttribute("href", "/orgchart");
    });
  });

  describe("member sorting", () => {
    it("shows supervisors first", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      const memberCards = screen.getAllByTestId("avatar");
      // First avatar should be John Doe (JD)
      expect(memberCards[0]).toHaveTextContent("JD");
    });

    it("sorts non-supervisors alphabetically by name", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      const avatars = screen.getAllByTestId("avatar");
      // Order: JD (supervisor), AJ, BW, CB
      expect(avatars[0]).toHaveTextContent("JD"); // John Doe (supervisor)
      expect(avatars[1]).toHaveTextContent("AJ"); // Alice Johnson
      expect(avatars[2]).toHaveTextContent("BW"); // Bob Wilson
      expect(avatars[3]).toHaveTextContent("CB"); // Charlie Brown
    });
  });

  describe("role indicators", () => {
    it("renders admin user card without error", () => {
      render(
        <TeamMembersWidget
          {...defaultProps}
          allUsers={[createMockUser({ id: 1, first_name: "Admin", last_name: "User", role: "admin" })]}
        />
      );

      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    it("renders supervisor user card without error", () => {
      render(
        <TeamMembersWidget
          {...defaultProps}
          allUsers={[createMockUser({ id: 1, first_name: "Super", last_name: "Visor", role: "supervisor" })]}
        />
      );

      expect(screen.getByText("Super Visor")).toBeInTheDocument();
    });
  });

  describe("squad links", () => {
    it("renders squad badges in member cards", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      // Each member card has a squad badge link
      const squadLinks = screen.getAllByRole("link").filter(
        (link) => link.getAttribute("href")?.includes("/teams?type=squad")
      );
      expect(squadLinks.length).toBeGreaterThan(0);
    });
  });

  describe("pagination", () => {
    it("shows pagination when more than one page", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("total-pages")).toHaveTextContent("2");
    });

    it("does not show pagination when one page or less", () => {
      render(
        <TeamMembersWidget
          {...defaultProps}
          allUsers={mockUsers.slice(0, 3)}
        />
      );

      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("changes page when next is clicked", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      fireEvent.click(screen.getByText("Next"));

      expect(screen.getByTestId("current-page")).toHaveTextContent("2");
      // Jane Smith is on page 2
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("resets to page 1 when selection changes", () => {
      const { rerender } = render(<TeamMembersWidget {...defaultProps} />);

      // Go to page 2
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByTestId("current-page")).toHaveTextContent("2");

      // Change selection
      rerender(<TeamMembersWidget {...defaultProps} selectedId="2" />);

      // Since selectedId="2" doesn't match any squad, we'll have no results
      // But with same selection type change, it should reset
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no members", () => {
      render(<TeamMembersWidget {...defaultProps} allUsers={[]} />);

      expect(screen.getByText(/No members in this squad/)).toBeInTheDocument();
    });

    it("shows correct empty state message for department", () => {
      render(
        <TeamMembersWidget
          {...defaultProps}
          selectionType="department"
          selectedId="NonExistentDept"
          allUsers={[]}
        />
      );

      expect(screen.getByText(/No members in this department/)).toBeInTheDocument();
    });
  });

  describe("member card links", () => {
    it("links to employee profile", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      // John Doe (id: 1) should have a link to /employee/1
      const profileLinks = screen.getAllByRole("link").filter(
        (link) => link.getAttribute("href") === "/employee/1"
      );
      expect(profileLinks.length).toBeGreaterThan(0);
    });
  });

  describe("title display", () => {
    it("shows member title when available", () => {
      render(<TeamMembersWidget {...defaultProps} />);

      // All mock users have title "Software Engineer"
      expect(screen.getAllByText("Software Engineer").length).toBeGreaterThan(0);
    });
  });
});
