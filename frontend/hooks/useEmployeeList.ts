import { useState, useMemo, useCallback } from "react";
import { User, Role } from "@/shared/types/user";

export type SortField = "name" | "email" | "department" | "date_started";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list" | "department";

export interface EmployeeListFilters {
  searchQuery: string;
  roleFilter: "all" | Role;
  departmentFilter: string;
  squadFilter: string;
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
  setRoleFilter: (role: "all" | Role) => void;
  setDepartmentFilter: (department: string) => void;
  setSquadFilter: (squad: string) => void;
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

export function useEmployeeList(employeesInput: User[]): UseEmployeeListResult {
  // Ensure employees is always an array
  const employees = employeesInput || [];
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [squadFilter, setSquadFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get unique departments for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Get unique squads for filter dropdown
  const squads = useMemo(() => {
    const squadSet = new Set<string>();
    employees.forEach((e) => {
      e.squads?.forEach((s) => squadSet.add(s.name));
    });
    return Array.from(squadSet).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      // Search through squad names
      const squadNamesMatch = employee.squads?.some((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const matchesSearch =
        searchQuery === "" ||
        `${employee.first_name} ${employee.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squadNamesMatch;

      const matchesRole = roleFilter === "all" || employee.role === roleFilter;

      const matchesDepartment =
        departmentFilter === "all" || employee.department === departmentFilter;

      // Filter matches if user belongs to ANY of their squads
      const matchesSquad =
        squadFilter === "all" ||
        employee.squads?.some((s) => s.name === squadFilter);

      return matchesSearch && matchesRole && matchesDepartment && matchesSquad;
    });
  }, [employees, searchQuery, roleFilter, departmentFilter, squadFilter]);

  // Sort employees
  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
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

  // Pagination
  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEmployees.slice(start, start + itemsPerPage);
  }, [sortedEmployees, currentPage, itemsPerPage]);

  // Toggle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField, sortOrder]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setSquadFilter("all");
    setCurrentPage(1);
  }, []);

  // Wrap setters to reset page on filter change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleRoleChange = useCallback((role: "all" | Role) => {
    setRoleFilter(role);
    setCurrentPage(1);
  }, []);

  const handleDepartmentChange = useCallback((dept: string) => {
    setDepartmentFilter(dept);
    setCurrentPage(1);
  }, []);

  const handleSquadChange = useCallback((squad: string) => {
    setSquadFilter(squad);
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
      roleFilter,
      departmentFilter,
      squadFilter,
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
    setRoleFilter: handleRoleChange,
    setDepartmentFilter: handleDepartmentChange,
    setSquadFilter: handleSquadChange,
    setShowFilters,
    setSortField,
    setSortOrder,
    handleSort,
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    setViewMode: handleViewModeChange,
    clearFilters,
  };
}
