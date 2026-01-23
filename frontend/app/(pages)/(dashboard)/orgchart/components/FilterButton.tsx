"use client";

import { useState } from "react";
import { Role } from "@/shared/types/user";
import {
  FilterDropdown,
  FilterSection,
  FilterCheckbox,
  SearchableFilterList,
} from "@/components";

export interface FilterButtonProps {
  // Filter state
  isOpen: boolean;
  roleFilters: Role[];
  departmentFilters: string[];
  squadFilters: string[];

  // Available options
  departments: string[];
  squads: string[];

  // Actions
  onToggle: () => void;
  onClose: () => void;
  onRoleFiltersChange: (roles: Role[]) => void;
  onDepartmentFiltersChange: (departments: string[]) => void;
  onSquadFiltersChange: (squads: string[]) => void;
  onClearAll: () => void;
}

export default function FilterButton({
  isOpen,
  roleFilters,
  departmentFilters,
  squadFilters,
  departments,
  squads,
  onToggle,
  onClose,
  onRoleFiltersChange,
  onDepartmentFiltersChange,
  onSquadFiltersChange,
  onClearAll,
}: FilterButtonProps) {
  // Accordion state for filter sections
  const [expandedSections, setExpandedSections] = useState({
    role: true,
    department: false,
    squad: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate active filter count
  const activeFilterCount =
    roleFilters.length + departmentFilters.length + squadFilters.length;

  const handleRoleToggle = (role: Role, checked: boolean) => {
    if (checked) {
      onRoleFiltersChange([...roleFilters, role]);
    } else {
      onRoleFiltersChange(roleFilters.filter((r) => r !== role));
    }
  };

  return (
    <FilterDropdown
      isOpen={isOpen}
      onToggle={onToggle}
      onClose={onClose}
      activeFilterCount={activeFilterCount}
      onClearAll={onClearAll}
    >
      <FilterSection
        title="Role"
        isExpanded={expandedSections.role}
        onToggle={() => toggleSection("role")}
      >
        <div className="space-y-1">
          <FilterCheckbox
            label="Supervisor"
            checked={roleFilters.includes("supervisor")}
            onChange={(checked) => handleRoleToggle("supervisor", checked)}
          />
          <FilterCheckbox
            label="Employee"
            checked={roleFilters.includes("employee")}
            onChange={(checked) => handleRoleToggle("employee", checked)}
          />
        </div>
      </FilterSection>

      <FilterSection
        title="Department"
        isExpanded={expandedSections.department}
        onToggle={() => toggleSection("department")}
      >
        <SearchableFilterList
          items={departments}
          selectedValues={departmentFilters}
          onChange={onDepartmentFiltersChange}
          placeholder="Search departments"
        />
      </FilterSection>

      <FilterSection
        title="Squad"
        isExpanded={expandedSections.squad}
        onToggle={() => toggleSection("squad")}
      >
        <SearchableFilterList
          items={squads}
          selectedValues={squadFilters}
          onChange={onSquadFiltersChange}
          placeholder="Search squads"
        />
      </FilterSection>
    </FilterDropdown>
  );
}
