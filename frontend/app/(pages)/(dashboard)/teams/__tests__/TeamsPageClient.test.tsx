/**
 * Tests for teams/TeamsPageClient.tsx
 * Teams page with squad/department selection and member display
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TeamsPageClient from "../TeamsPageClient";
import { User, Squad } from "@/shared/types/user";

// Mock nuqs (ESM-only package)
const mockSetSelectionType = jest.fn();
const mockSetSelectedId = jest.fn();
let mockSelectionType = "squad";
let mockSelectedId = "1";

jest.mock("nuqs", () => ({
  parseAsStringLiteral: () => ({
    withDefault: () => null,
  }),
  parseAsString: {
    withDefault: () => null,
  },
  useQueryState: (key: string) => {
    if (key === "type") return [mockSelectionType, mockSetSelectionType];
    if (key === "id") return [mockSelectedId, mockSetSelectedId];
    return [null, jest.fn()];
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock CurrentUserProvider
const mockCurrentUser = {
  id: 1,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "supervisor" as const,
  title: "Manager",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockUseCurrentUser = jest.fn();
jest.mock("@/providers/CurrentUserProvider", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// Mock OrganizationProvider
const mockSquads: Squad[] = [
  { id: 1, name: "Frontend Team" },
  { id: 2, name: "Backend Team" },
];

const mockDepartments = ["Engineering", "Product", "Design"];

const mockAllUsers: User[] = [
  {
    id: 1,
    auth0_id: "auth0|1",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "employee",
    title: "Engineer",
    department: "Engineering",
    squads: [{ id: 1, name: "Frontend Team" }],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    auth0_id: "auth0|2",
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Smith",
    role: "employee",
    title: "Designer",
    department: "Product",
    squads: [{ id: 2, name: "Backend Team" }],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockUseOrganization = jest.fn();
jest.mock("@/providers/OrganizationProvider", () => ({
  useOrganization: () => mockUseOrganization(),
}));

// Mock TeamSelector
jest.mock("../components/TeamSelector", () => {
  return function MockTeamSelector({
    squads,
    departments,
    selectedType,
    selectedId,
    onSelect,
  }: {
    squads: Squad[];
    departments: string[];
    selectedType: string;
    selectedId: string;
    onSelect: (type: string, id: string) => void;
  }) {
    return (
      <div data-testid="team-selector">
        <span data-testid="selected-type">{selectedType}</span>
        <span data-testid="selected-id">{selectedId}</span>
        {squads.map((squad) => (
          <button
            key={squad.id}
            onClick={() => onSelect("squad", String(squad.id))}
            data-testid={`select-squad-${squad.id}`}
          >
            {squad.name}
          </button>
        ))}
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => onSelect("department", dept)}
            data-testid={`select-dept-${dept}`}
          >
            {dept}
          </button>
        ))}
      </div>
    );
  };
});

// Mock TeamMembersWidget
jest.mock("../components/TeamMembersWidget", () => {
  return function MockTeamMembersWidget({
    selectionType,
    selectedId,
    allUsers,
    selectedLabel,
  }: {
    selectionType: string;
    selectedId: string;
    allUsers: User[];
    selectedLabel: string;
  }) {
    return (
      <div data-testid="team-members-widget">
        <span data-testid="widget-type">{selectionType}</span>
        <span data-testid="widget-id">{selectedId}</span>
        <span data-testid="widget-label">{selectedLabel}</span>
        <span data-testid="widget-count">{allUsers.length} users</span>
      </div>
    );
  };
});

// Mock TeamTimeOffWidget
jest.mock("../components/TeamTimeOffWidget", () => {
  return function MockTeamTimeOffWidget({
    selectionType,
    selectedId,
  }: {
    selectionType: string;
    selectedId: string;
  }) {
    return (
      <div data-testid="team-time-off-widget">
        Time Off for {selectionType}: {selectedId}
      </div>
    );
  };
});

// Mock TeamTasksWidget
jest.mock("../components/TeamTasksWidget", () => {
  return function MockTeamTasksWidget({
    selectionType,
    selectedId,
  }: {
    selectionType: string;
    selectedId: string;
  }) {
    return (
      <div data-testid="team-tasks-widget">
        Tasks for {selectionType}: {selectedId}
      </div>
    );
  };
});

describe("TeamsPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectionType = "squad";
    mockSelectedId = "1";

    mockUseCurrentUser.mockReturnValue({
      currentUser: mockCurrentUser,
      loading: false,
    });

    mockUseOrganization.mockReturnValue({
      squads: mockSquads,
      departments: mockDepartments,
      allUsers: mockAllUsers,
      loading: false,
    });
  });

  describe("rendering", () => {
    it("renders page title", () => {
      render(<TeamsPageClient />);
      expect(screen.getByText("Teams")).toBeInTheDocument();
    });

    it("renders team selector", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("team-selector")).toBeInTheDocument();
    });

    it("renders team members widget", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("team-members-widget")).toBeInTheDocument();
    });

    it("renders team time off widget", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("team-time-off-widget")).toBeInTheDocument();
    });

    it("renders team tasks widget", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("team-tasks-widget")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when user is loading", () => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: null,
        loading: true,
      });

      render(<TeamsPageClient />);
      expect(screen.queryByText("Teams")).not.toBeInTheDocument();
    });

    it("shows loading spinner when org is loading", () => {
      mockUseOrganization.mockReturnValue({
        squads: [],
        departments: [],
        allUsers: [],
        loading: true,
      });

      render(<TeamsPageClient />);
      expect(screen.queryByText("Teams")).not.toBeInTheDocument();
    });
  });

  describe("permission check", () => {
    it("shows access denied for non-supervisors", () => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: { ...mockCurrentUser, role: "employee" },
        loading: false,
      });

      render(<TeamsPageClient />);
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("shows content for supervisors", () => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: { ...mockCurrentUser, role: "supervisor" },
        loading: false,
      });

      render(<TeamsPageClient />);
      expect(screen.getByText("Teams")).toBeInTheDocument();
    });

    it("shows content for admins", () => {
      mockUseCurrentUser.mockReturnValue({
        currentUser: { ...mockCurrentUser, role: "admin" },
        loading: false,
      });

      render(<TeamsPageClient />);
      expect(screen.getByText("Teams")).toBeInTheDocument();
    });
  });

  describe("team selection", () => {
    it("displays current selection type", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("selected-type")).toHaveTextContent("squad");
    });

    it("displays current selection id", () => {
      render(<TeamsPageClient />);
      expect(screen.getByTestId("selected-id")).toHaveTextContent("1");
    });

    it("calls setSelectionType when squad is clicked", () => {
      render(<TeamsPageClient />);

      fireEvent.click(screen.getByTestId("select-squad-2"));

      expect(mockSetSelectionType).toHaveBeenCalledWith("squad");
      expect(mockSetSelectedId).toHaveBeenCalledWith("2");
    });

    it("calls setSelectionType when department is clicked", () => {
      render(<TeamsPageClient />);

      fireEvent.click(screen.getByTestId("select-dept-Product"));

      expect(mockSetSelectionType).toHaveBeenCalledWith("department");
      expect(mockSetSelectedId).toHaveBeenCalledWith("Product");
    });
  });

  describe("widget props", () => {
    it("passes correct props to team members widget", () => {
      render(<TeamsPageClient />);

      expect(screen.getByTestId("widget-type")).toHaveTextContent("squad");
      expect(screen.getByTestId("widget-id")).toHaveTextContent("1");
      expect(screen.getByTestId("widget-count")).toHaveTextContent("2 users");
    });
  });

  describe("empty selection", () => {
    it("shows select message when no selection", () => {
      mockSelectedId = "";

      render(<TeamsPageClient />);

      expect(screen.getByText("Select a team or department to view details")).toBeInTheDocument();
    });
  });

  describe("responsive layout", () => {
    it("renders grid layout for widgets", () => {
      const { container } = render(<TeamsPageClient />);

      // Check for grid container
      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
    });
  });
});
