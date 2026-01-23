"use client";

import { useMemo } from "react";
import { User } from "@/shared/types/user";
import { useEmployeeList, ITEMS_PER_PAGE_OPTIONS } from "@/hooks/useEmployeeList";
import EmployeeCard from "./EmployeeCard";
import EmployeeTable from "./EmployeeTable";
import FilterButton from "./FilterButton";
import Pagination from "@/shared/common/Pagination";
import GroupedSection from "@/shared/common/GroupedSection";
import { Search, Users, X, LayoutGrid, List, Building2 } from "lucide-react";
import {
  getDepartmentTextColor,
  getDepartmentBgColor,
  getDepartmentBorderColor,
} from "@/lib/department-colors";

interface EmployeeListProps {
  employees: User[];
  isLoading?: boolean;
  error?: string | null;
}

export default function EmployeeList({
  employees,
  isLoading = false,
  error = null,
}: EmployeeListProps) {
  const {
    state,
    departments,
    squads,
    sortedEmployees,
    paginatedEmployees,
    totalPages,
    setSearchQuery,
    setRoleFilter,
    setDepartmentFilter,
    setSquadFilter,
    setShowFilters,
    handleSort,
    setCurrentPage,
    setItemsPerPage,
    setViewMode,
    clearFilters,
  } = useEmployeeList(employees);

  // Group all employees by department for department view (one department per page)
  const allDepartmentsWithEmployees = useMemo(() => {
    const grouped: Record<string, User[]> = {};
    sortedEmployees.forEach((employee) => {
      const dept = employee.department || "Unassigned";
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(employee);
    });
    // Sort departments alphabetically, but put "Unassigned" last
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((dept) => ({ department: dept, employees: grouped[dept] }));
  }, [sortedEmployees]);

  // For department view: get the current department (one per page)
  const departmentTotalPages = allDepartmentsWithEmployees.length;
  const currentDepartment = allDepartmentsWithEmployees[state.currentPage - 1];

  // Get active filters for chips
  const activeFilters: { type: string; value: string; onRemove: () => void }[] = [];
  if (state.roleFilter !== "all") {
    activeFilters.push({
      type: "Role",
      value: state.roleFilter === "supervisor" ? "Supervisor" : "Employee",
      onRemove: () => setRoleFilter("all"),
    });
  }
  if (state.departmentFilter !== "all") {
    activeFilters.push({
      type: "Department",
      value: state.departmentFilter,
      onRemove: () => setDepartmentFilter("all"),
    });
  }
  if (state.squadFilter !== "all") {
    activeFilters.push({
      type: "Squad",
      value: state.squadFilter,
      onRemove: () => setSquadFilter("all"),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="animate-pulse">
          <div className="h-10 sm:h-12 bg-theme-elevated rounded-lg mb-3 sm:mb-4" />
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 sm:h-48 bg-theme-elevated rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Employees</h3>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            placeholder="Search employees..."
            value={state.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-theme-border focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all rounded-full bg-theme-elevated text-theme-text placeholder-theme-text-muted"
          />
          {state.searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-theme-surface rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-theme-text-muted" />
            </button>
          )}
        </div>

        {/* Filter and View Toggle - row on mobile */}
        <div className="flex gap-2 sm:gap-3">
          <FilterButton
            isOpen={state.showFilters}
            roleFilter={state.roleFilter}
            departmentFilter={state.departmentFilter}
            squadFilter={state.squadFilter}
            departments={departments}
            squads={squads}
            onToggle={() => setShowFilters(!state.showFilters)}
            onClose={() => setShowFilters(false)}
            onRoleChange={setRoleFilter}
            onDepartmentChange={setDepartmentFilter}
            onSquadChange={setSquadFilter}
            onClearAll={clearFilters}
          />
          {/* View Mode Toggle */}
          <div className="flex border border-theme-border rounded-full overflow-hidden bg-theme-elevated">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${
                state.viewMode === "grid"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 border-l border-theme-border transition-colors ${
                state.viewMode === "list"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("department")}
              className={`p-2 border-l border-theme-border transition-colors ${
                state.viewMode === "department"
                  ? "bg-primary-500 text-white"
                  : "text-theme-text-muted hover:bg-theme-surface"
              }`}
              title="Department"
            >
              <Building2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => {
            const isDepartmentFilter = filter.type === "Department";
            const chipClass = isDepartmentFilter
              ? `inline-flex items-center gap-1.5 px-3 py-1 text-sm ${getDepartmentBgColor(filter.value)}/20 ${getDepartmentTextColor(filter.value)} border ${getDepartmentBorderColor(filter.value)}/30 rounded-full`
              : "inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-accent-500/20 text-accent-300 border border-accent-500/30 rounded-full";
            const buttonClass = isDepartmentFilter
              ? `p-0.5 hover:${getDepartmentBgColor(filter.value)}/30 rounded-full transition-colors`
              : "p-0.5 hover:bg-accent-500/30 rounded-full transition-colors";

            return (
              <span key={index} className={chipClass}>
                {filter.value}
                <button onClick={filter.onRemove} className={buttonClass}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between text-xs text-theme-text-muted px-1">
        <span className="truncate">
          {sortedEmployees.length} {sortedEmployees.length === 1 ? "employee" : "employees"}
        </span>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className="hidden sm:inline">Show:</span>
          <select
            value={state.itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="bg-transparent border-none p-0 text-theme-text-muted focus:ring-0 cursor-pointer hover:text-theme-text"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n} className="bg-theme-surface text-theme-text">
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {/* Check for empty results based on view mode */}
      {(
        state.viewMode === "department"
          ? allDepartmentsWithEmployees.length === 0
          : paginatedEmployees.length === 0
      ) ? (
        <div className="text-center py-12 bg-theme-elevated border border-theme-border rounded-lg">
          <div className="w-12 h-12 bg-theme-surface flex items-center justify-center mx-auto mb-3 rounded-full">
            <Users className="w-6 h-6 text-theme-text-muted" />
          </div>
          <h3 className="text-sm font-semibold text-theme-text">No results</h3>
          <p className="text-xs text-theme-text-muted mt-1 mb-4">
            Try adjusting your search or filters
          </p>
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-primary-400 hover:text-primary-300 underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {state.viewMode === "grid" ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {paginatedEmployees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          ) : state.viewMode === "department" && currentDepartment ? (
            /* Department View - One department per page */
            <div className="bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
              <GroupedSection
                title={currentDepartment.department}
                count={currentDepartment.employees.length}
                indicator={
                  <div
                    className={`w-3 h-3 rounded-full ${getDepartmentBgColor(currentDepartment.department)}`}
                  />
                }
              >
                {currentDepartment.employees.map((employee) => (
                  <a
                    key={employee.id}
                    href={`/employee/${employee.id}`}
                    className="block px-6 py-3 hover:bg-theme-elevated/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-theme-text">
                            {employee.first_name} {employee.last_name}
                          </span>
                          {employee.role === "supervisor" && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded-full">
                              Supervisor
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-theme-text-muted">
                          <span>{employee.email}</span>
                          {employee.title && (
                            <span className="text-theme-text-subtle">{employee.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </GroupedSection>
            </div>
          ) : (
            <EmployeeTable
              employees={paginatedEmployees}
              sortField={state.sortField}
              sortOrder={state.sortOrder}
              onSort={handleSort}
            />
          )}

          <Pagination
            currentPage={state.currentPage}
            totalPages={state.viewMode === "department" ? departmentTotalPages : totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
