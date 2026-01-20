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
  roleFilter: "all" | Role;
  departmentFilter: string;
  squadFilter: string;

  // Available options
  departments: string[];
  squads: string[];

  // Actions
  onToggle: () => void;
  onClose: () => void;
  onRoleChange: (role: "all" | Role) => void;
  onDepartmentChange: (department: string) => void;
  onSquadChange: (squad: string) => void;
  onClearAll: () => void;
}

export default function FilterButton({
  isOpen,
  roleFilter,
  departmentFilter,
  squadFilter,
  departments,
  squads,
  onToggle,
  onClose,
  onRoleChange,
  onDepartmentChange,
  onSquadChange,
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
  const activeFilterCount = [
    roleFilter !== "all" ? 1 : 0,
    departmentFilter !== "all" ? 1 : 0,
    squadFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <FilterDropdown
      isOpen={isOpen}
      onToggle={onToggle}
      onClose={onClose}
      activeFilterCount={activeFilterCount}
      onClearAll={onClearAll}
    >
      {/* Role Section */}
      <FilterSection
        title="Role"
        isExpanded={expandedSections.role}
        onToggle={() => toggleSection("role")}
      >
        <div className="space-y-1">
          <FilterCheckbox
            label="Supervisor"
            checked={roleFilter === "supervisor"}
            onChange={(checked) => onRoleChange(checked ? "supervisor" : "all")}
          />
          <FilterCheckbox
            label="Employee"
            checked={roleFilter === "employee"}
            onChange={(checked) => onRoleChange(checked ? "employee" : "all")}
          />
        </div>
      </FilterSection>

      {/* Department Section */}
      <FilterSection
        title="Department"
        isExpanded={expandedSections.department}
        onToggle={() => toggleSection("department")}
      >
        <SearchableFilterList
          items={departments}
          selectedValue={departmentFilter}
          onChange={onDepartmentChange}
          placeholder="Search departments"
        />
      </FilterSection>

      {/* Squad Section */}
      <FilterSection
        title="Squad"
        isExpanded={expandedSections.squad}
        onToggle={() => toggleSection("squad")}
      >
        <SearchableFilterList
          items={squads}
          selectedValue={squadFilter}
          onChange={onSquadChange}
          placeholder="Search squads"
        />
      </FilterSection>
    </FilterDropdown>
  );
}
