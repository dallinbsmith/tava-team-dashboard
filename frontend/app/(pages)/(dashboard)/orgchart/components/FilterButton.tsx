"use client";

import { useState, useRef, useEffect } from "react";
import { Role } from "@/shared/types/user";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, isExpanded, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-gray-200 hover:text-white transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && <div className="pb-3">{children}</div>}
    </div>
  );
}

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function FilterCheckbox({ label, checked, onChange }: FilterCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 py-1.5 px-1 cursor-pointer hover:bg-gray-700/50 rounded transition-colors w-full text-left"
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked
            ? "bg-accent-500 border-accent-500"
            : "border-gray-500 bg-transparent"
          }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </button>
  );
}

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
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Accordion state for filter sections
  const [expandedSections, setExpandedSections] = useState({
    role: true,
    department: false,
    squad: false,
  });

  // Search state within sections
  const [sectionSearch, setSectionSearch] = useState({
    department: "",
    squad: "",
  });

  // Close filter panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate active filter count
  const activeFilterCount = [
    roleFilter !== "all" ? 1 : 0,
    departmentFilter !== "all" ? 1 : 0,
    squadFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Filter options for sections with search
  const filteredDepartments = departments.filter((dept) =>
    dept.toLowerCase().includes(sectionSearch.department.toLowerCase())
  );
  const filteredSquads = squads.filter((squad) =>
    squad.toLowerCase().includes(sectionSearch.squad.toLowerCase())
  );

  return (
    <div className="relative" ref={filterPanelRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${isOpen || activeFilterCount > 0
            ? "bg-primary-500 text-white"
            : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Filters</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Reset all
                </button>
              )}
            </div>

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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search departments"
                    value={sectionSearch.department}
                    onChange={(e) => setSectionSearch(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredDepartments.map((dept) => (
                    <FilterCheckbox
                      key={dept}
                      label={dept}
                      checked={departmentFilter === dept}
                      onChange={(checked) => onDepartmentChange(checked ? dept : "all")}
                    />
                  ))}
                </div>
              </div>
            </FilterSection>

            {/* Squad Section */}
            <FilterSection
              title="Squad"
              isExpanded={expandedSections.squad}
              onToggle={() => toggleSection("squad")}
            >
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search squads"
                    value={sectionSearch.squad}
                    onChange={(e) => setSectionSearch(prev => ({ ...prev, squad: e.target.value }))}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredSquads.map((squad) => (
                    <FilterCheckbox
                      key={squad}
                      label={squad}
                      checked={squadFilter === squad}
                      onChange={(checked) => onSquadChange(checked ? squad : "all")}
                    />
                  ))}
                </div>
              </div>
            </FilterSection>
          </div>
        </div>
      )}
    </div>
  );
}
