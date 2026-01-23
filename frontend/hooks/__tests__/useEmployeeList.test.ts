/**
 * Tests for hooks/useEmployeeList.ts
 * Employee list hook with filtering, sorting, and pagination
 */

import { renderHook, act } from "@testing-library/react";
import { useEmployeeList, ITEMS_PER_PAGE_OPTIONS } from "../useEmployeeList";
import { User } from "@/shared/types/user";

// Test fixtures
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  auth0_id: "auth0|123",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: "employee",
  title: "Software Engineer",
  department: "Engineering",
  squads: [],
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const mockEmployees: User[] = [
  createMockUser({
    id: 1,
    first_name: "Alice",
    last_name: "Anderson",
    email: "alice@example.com",
    role: "admin",
    department: "Engineering",
    date_started: "2022-01-15",
  }),
  createMockUser({
    id: 2,
    first_name: "Bob",
    last_name: "Brown",
    email: "bob@example.com",
    role: "employee",
    department: "Marketing",
    date_started: "2023-03-20",
  }),
  createMockUser({
    id: 3,
    first_name: "Charlie",
    last_name: "Clark",
    email: "charlie@example.com",
    role: "supervisor",
    department: "Engineering",
    date_started: "2021-06-10",
    squads: [{ id: 1, name: "Frontend" }],
  }),
  createMockUser({
    id: 4,
    first_name: "Diana",
    last_name: "Davis",
    email: "diana@example.com",
    role: "employee",
    department: "Design",
    date_started: "2024-01-05",
    squads: [{ id: 2, name: "Backend" }],
  }),
  createMockUser({
    id: 5,
    first_name: "Eve",
    last_name: "Evans",
    email: "eve@example.com",
    role: "employee",
    department: "Marketing",
    squads: [
      { id: 1, name: "Frontend" },
      { id: 3, name: "DevOps" },
    ],
  }),
];

describe("useEmployeeList", () => {
  describe("initialization", () => {
    it("initializes with default state", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.state.searchQuery).toBe("");
      expect(result.current.state.roleFilters).toEqual([]);
      expect(result.current.state.departmentFilters).toEqual([]);
      expect(result.current.state.squadFilters).toEqual([]);
      expect(result.current.state.sortField).toBe("name");
      expect(result.current.state.sortOrder).toBe("asc");
      expect(result.current.state.currentPage).toBe(1);
      expect(result.current.state.itemsPerPage).toBe(12);
      expect(result.current.state.viewMode).toBe("grid");
      expect(result.current.state.showFilters).toBe(false);
    });

    it("handles empty employees array", () => {
      const { result } = renderHook(() => useEmployeeList([]));

      expect(result.current.filteredEmployees).toEqual([]);
      expect(result.current.sortedEmployees).toEqual([]);
      expect(result.current.paginatedEmployees).toEqual([]);
      expect(result.current.departments).toEqual([]);
      expect(result.current.squads).toEqual([]);
      expect(result.current.totalPages).toBe(0);
    });

    it("handles undefined employees input", () => {
      const { result } = renderHook(() =>
        useEmployeeList(undefined as unknown as User[]),
      );

      expect(result.current.filteredEmployees).toEqual([]);
      expect(result.current.departments).toEqual([]);
    });
  });

  describe("computed departments", () => {
    it("extracts unique departments from employees", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.departments).toContain("Engineering");
      expect(result.current.departments).toContain("Marketing");
      expect(result.current.departments).toContain("Design");
    });

    it("sorts departments alphabetically", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.departments).toEqual([
        "Design",
        "Engineering",
        "Marketing",
      ]);
    });

    it("excludes employees without department", () => {
      const employeesWithNull = [
        ...mockEmployees,
        createMockUser({ id: 6, department: undefined }),
      ];
      const { result } = renderHook(() => useEmployeeList(employeesWithNull));

      expect(result.current.departments.length).toBe(3);
    });
  });

  describe("computed squads", () => {
    it("extracts unique squads from employees", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.squads).toContain("Frontend");
      expect(result.current.squads).toContain("Backend");
      expect(result.current.squads).toContain("DevOps");
    });

    it("sorts squads alphabetically", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.squads).toEqual(["Backend", "DevOps", "Frontend"]);
    });
  });

  describe("search filtering", () => {
    it("filters by first name", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Alice");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
      expect(result.current.filteredEmployees[0].first_name).toBe("Alice");
    });

    it("filters by last name", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Brown");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
      expect(result.current.filteredEmployees[0].last_name).toBe("Brown");
    });

    it("filters by full name", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Alice Anderson");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
    });

    it("filters by email", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("bob@");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
      expect(result.current.filteredEmployees[0].email).toBe("bob@example.com");
    });

    it("filters by department", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Marketing");
      });

      expect(result.current.filteredEmployees.length).toBe(2);
    });

    it("filters by title", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Software");
      });

      expect(result.current.filteredEmployees.length).toBe(5);
    });

    it("filters by squad name", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("Frontend");
      });

      expect(result.current.filteredEmployees.length).toBe(2);
    });

    it("is case insensitive", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("ALICE");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
    });

    it("resets page on search", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setSearchQuery("test");
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("role filtering", () => {
    it("filters by admin role", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["admin"]);
      });

      expect(result.current.filteredEmployees.length).toBe(1);
      expect(result.current.filteredEmployees[0].role).toBe("admin");
    });

    it("filters by employee role", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["employee"]);
      });

      expect(result.current.filteredEmployees.length).toBe(3);
    });

    it("filters by supervisor role", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["supervisor"]);
      });

      expect(result.current.filteredEmployees.length).toBe(1);
    });

    it("shows all when filter is empty", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters([]);
      });

      expect(result.current.filteredEmployees.length).toBe(5);
    });

    it("filters by multiple roles", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["employee", "supervisor"]);
      });

      expect(result.current.filteredEmployees.length).toBe(4);
    });

    it("resets page on role change", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setRoleFilters(["admin"]);
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("department filtering", () => {
    it("filters by department", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setDepartmentFilters(["Engineering"]);
      });

      expect(result.current.filteredEmployees.length).toBe(2);
      expect(
        result.current.filteredEmployees.every(
          (e) => e.department === "Engineering",
        ),
      ).toBe(true);
    });

    it("shows all when filter is empty", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setDepartmentFilters([]);
      });

      expect(result.current.filteredEmployees.length).toBe(5);
    });

    it("filters by multiple departments", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setDepartmentFilters(["Engineering", "Marketing"]);
      });

      expect(result.current.filteredEmployees.length).toBe(4);
    });

    it("resets page on department change", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setDepartmentFilters(["Engineering"]);
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("squad filtering", () => {
    it("filters by squad", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSquadFilters(["Frontend"]);
      });

      expect(result.current.filteredEmployees.length).toBe(2);
    });

    it("shows all when filter is empty", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSquadFilters([]);
      });

      expect(result.current.filteredEmployees.length).toBe(5);
    });

    it("filters by multiple squads", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSquadFilters(["Frontend", "Backend"]);
      });

      expect(result.current.filteredEmployees.length).toBe(3);
    });

    it("resets page on squad change", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setSquadFilters(["Frontend"]);
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("combined filters", () => {
    it("applies multiple filters together", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["employee"]);
        result.current.setDepartmentFilters(["Marketing"]);
      });

      expect(result.current.filteredEmployees.length).toBe(2);
    });

    it("applies search with filters", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["employee"]);
        result.current.setSearchQuery("Bob");
      });

      expect(result.current.filteredEmployees.length).toBe(1);
    });

    it("applies multiple filters across categories", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setRoleFilters(["employee", "supervisor"]);
        result.current.setDepartmentFilters(["Engineering"]);
      });

      expect(result.current.filteredEmployees.length).toBe(1);
      expect(result.current.filteredEmployees[0].first_name).toBe("Charlie");
    });
  });

  describe("sorting", () => {
    it("sorts by name ascending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("name");
        result.current.setSortOrder("asc");
      });

      const names = result.current.sortedEmployees.map(
        (e) => `${e.first_name} ${e.last_name}`,
      );
      expect(names[0]).toBe("Alice Anderson");
    });

    it("sorts by name descending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("name");
        result.current.setSortOrder("desc");
      });

      const names = result.current.sortedEmployees.map(
        (e) => `${e.first_name} ${e.last_name}`,
      );
      expect(names[0]).toBe("Eve Evans");
    });

    it("sorts by email ascending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("email");
        result.current.setSortOrder("asc");
      });

      expect(result.current.sortedEmployees[0].email).toBe("alice@example.com");
    });

    it("sorts by department ascending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("department");
        result.current.setSortOrder("asc");
      });

      expect(result.current.sortedEmployees[0].department).toBe("Design");
    });

    it("sorts by date_started ascending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("date_started");
        result.current.setSortOrder("asc");
      });

      // First should be one without date_started (Eve) or earliest date
      expect(result.current.sortedEmployees[0].first_name).toBe("Eve");
    });

    it("sorts by date_started descending", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("date_started");
        result.current.setSortOrder("desc");
      });

      expect(result.current.sortedEmployees[0].first_name).toBe("Diana");
    });
  });

  describe("handleSort", () => {
    it("toggles sort order when clicking same field", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.state.sortOrder).toBe("asc");

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.state.sortOrder).toBe("desc");
    });

    it("sets new field and resets to asc when clicking different field", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortOrder("desc");
      });

      act(() => {
        result.current.handleSort("email");
      });

      expect(result.current.state.sortField).toBe("email");
      expect(result.current.state.sortOrder).toBe("asc");
    });
  });

  describe("pagination", () => {
    it("calculates total pages correctly", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setItemsPerPage(2);
      });

      expect(result.current.totalPages).toBe(3);
    });

    it("returns correct paginated employees", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setItemsPerPage(2);
      });

      expect(result.current.paginatedEmployees.length).toBe(2);
    });

    it("returns correct employees for page 2", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setItemsPerPage(2);
        result.current.setCurrentPage(2);
      });

      expect(result.current.paginatedEmployees.length).toBe(2);
    });

    it("returns remaining employees for last page", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setItemsPerPage(2);
        result.current.setCurrentPage(3);
      });

      expect(result.current.paginatedEmployees.length).toBe(1);
    });

    it("resets page when items per page changes", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(3);
      });

      act(() => {
        result.current.setItemsPerPage(24);
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("view mode", () => {
    it("sets view mode to grid", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setViewMode("grid");
      });

      expect(result.current.state.viewMode).toBe("grid");
    });

    it("sets view mode to list", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setViewMode("list");
      });

      expect(result.current.state.viewMode).toBe("list");
    });

    it("sets view mode to department", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setViewMode("department");
      });

      expect(result.current.state.viewMode).toBe("department");
    });

    it("resets page when view mode changes", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setCurrentPage(2);
      });

      act(() => {
        result.current.setViewMode("list");
      });

      expect(result.current.state.currentPage).toBe(1);
    });
  });

  describe("showFilters", () => {
    it("toggles showFilters state", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      expect(result.current.state.showFilters).toBe(false);

      act(() => {
        result.current.setShowFilters(true);
      });

      expect(result.current.state.showFilters).toBe(true);

      act(() => {
        result.current.setShowFilters(false);
      });

      expect(result.current.state.showFilters).toBe(false);
    });
  });

  describe("clearFilters", () => {
    it("resets all filters to default", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSearchQuery("test");
        result.current.setRoleFilters(["admin"]);
        result.current.setDepartmentFilters(["Engineering"]);
        result.current.setSquadFilters(["Frontend"]);
        result.current.setCurrentPage(3);
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.state.searchQuery).toBe("");
      expect(result.current.state.roleFilters).toEqual([]);
      expect(result.current.state.departmentFilters).toEqual([]);
      expect(result.current.state.squadFilters).toEqual([]);
      expect(result.current.state.currentPage).toBe(1);
    });

    it("does not reset sort or view mode", () => {
      const { result } = renderHook(() => useEmployeeList(mockEmployees));

      act(() => {
        result.current.setSortField("email");
        result.current.setSortOrder("desc");
        result.current.setViewMode("list");
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.state.sortField).toBe("email");
      expect(result.current.state.sortOrder).toBe("desc");
      expect(result.current.state.viewMode).toBe("list");
    });
  });

  describe("ITEMS_PER_PAGE_OPTIONS constant", () => {
    it("exports items per page options", () => {
      expect(ITEMS_PER_PAGE_OPTIONS).toEqual([6, 12, 24, 48]);
    });
  });
});
