import { useState, useMemo, useCallback } from "react";
import { User, Role } from "@/shared/types/user";

export type SortField = "name" | "email" | "department" | "date_started";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list" | "department";

export interface EmployeeListFilters {
  searchQuery: string;
  roleFilters: Role[];
  departmentFilters: string[];
  squadFilters: string[];
}

export interface EmployeeListState extends EmployeeListFilters {
  sortField: SortField;
  sortOrder: SortOrder;
  currentPage: number;
  itemsPerPage: number;
  viewMode: ViewMode;
  showFilters: boolean;
}

export interface UseEmployeeListResult {
  // State
  state: EmployeeListState;

  // Computed
  departments: string[];
  squads: string[];
  filteredEmployees: User[];
  sortedEmployees: User[];
  paginatedEmployees: User[];
  totalPages: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setRoleFilters: (roles: Role[]) => void;
  setDepartmentFilters: (departments: string[]) => void;
  setSquadFilters: (squads: string[]) => void;
  setShowFilters: (show: boolean) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  handleSort: (field: SortField) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  setViewMode: (mode: ViewMode) => void;
  clearFilters: () => void;
}

export const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24, 48];

export const useEmployeeList = (
  employeesInput: User[],
): UseEmployeeListResult => {
  const employees = employeesInput || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<Role[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [squadFilters, setSquadFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const squads = useMemo(() => {
    const squadSet = new Set<string>();
    employees.forEach((e) => {
      e.squads?.forEach((s) => squadSet.add(s.name));
    });
    return Array.from(squadSet).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const squadNamesMatch = employee.squads?.some((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      const matchesSearch =
        searchQuery === "" ||
        `${employee.first_name} ${employee.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        employee.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squadNamesMatch;

      const matchesRole =
        roleFilters.length === 0 || roleFilters.includes(employee.role);

      const matchesDepartment =
        departmentFilters.length === 0 ||
        (employee.department &&
          departmentFilters.includes(employee.department));

      const matchesSquad =
        squadFilters.length === 0 ||
        employee.squads?.some((s) => squadFilters.includes(s.name));

      return matchesSearch && matchesRole && matchesDepartment && matchesSquad;
    });
  }, [employees, searchQuery, roleFilters, departmentFilters, squadFilters]);

  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];

    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`,
          );
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "department":
          comparison = (a.department || "").localeCompare(b.department || "");
          break;
        case "date_started":
          const dateA = a.date_started ? new Date(a.date_started).getTime() : 0;
          const dateB = b.date_started ? new Date(b.date_started).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredEmployees, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEmployees.slice(start, start + itemsPerPage);
  }, [sortedEmployees, currentPage, itemsPerPage]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortOrder("asc");
      }
    },
    [sortField, sortOrder],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setRoleFilters([]);
    setDepartmentFilters([]);
    setSquadFilters([]);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleRoleFiltersChange = useCallback((roles: Role[]) => {
    setRoleFilters(roles);
    setCurrentPage(1);
  }, []);

  const handleDepartmentFiltersChange = useCallback((depts: string[]) => {
    setDepartmentFilters(depts);
    setCurrentPage(1);
  }, []);

  const handleSquadFiltersChange = useCallback((squads: string[]) => {
    setSquadFilters(squads);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
  }, []);

  return {
    state: {
      searchQuery,
      roleFilters,
      departmentFilters,
      squadFilters,
      sortField,
      sortOrder,
      currentPage,
      itemsPerPage,
      viewMode,
      showFilters,
    },
    departments,
    squads,
    filteredEmployees,
    sortedEmployees,
    paginatedEmployees,
    totalPages,
    setSearchQuery: handleSearchChange,
    setRoleFilters: handleRoleFiltersChange,
    setDepartmentFilters: handleDepartmentFiltersChange,
    setSquadFilters: handleSquadFiltersChange,
    setShowFilters,
    setSortField,
    setSortOrder,
    handleSort,
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    setViewMode: handleViewModeChange,
    clearFilters,
  };
};
