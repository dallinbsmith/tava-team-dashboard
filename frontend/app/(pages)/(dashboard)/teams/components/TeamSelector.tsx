"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Users, Building2, Search, Check } from "lucide-react";
import { Squad } from "@/shared/types/user";
import { SelectionType } from "../types";

interface TeamSelectorProps {
  squads: Squad[];
  departments: string[];
  selectedType: SelectionType;
  selectedId: string;
  onSelect: (type: SelectionType, id: string) => void;
}

export default function TeamSelector({
  squads,
  departments,
  selectedType,
  selectedId,
  onSelect,
}: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SelectionType>(selectedType);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync active tab with selected type when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(selectedType);
    }
  }, [isOpen, selectedType]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Get selected label
  const getSelectedLabel = () => {
    if (!selectedId) return "Select team...";
    if (selectedType === "squad") {
      const squad = squads?.find((s) => s.id.toString() === selectedId);
      return squad?.name || "Select team...";
    }
    return selectedId;
  };

  const handleSelect = (type: SelectionType, id: string) => {
    onSelect(type, id);
    setIsOpen(false);
    setSearch("");
  };

  const handleTabChange = (tab: SelectionType) => {
    setActiveTab(tab);
    setSearch("");
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme-border hover:bg-theme-elevated transition-colors min-w-[200px]"
      >
        {selectedType === "squad" ? (
          <Users className="w-4 h-4 text-primary-400" />
        ) : (
          <Building2 className="w-4 h-4 text-purple-400" />
        )}
        <span className="flex-1 text-left text-theme-text truncate">
          {getSelectedLabel()}
        </span>
        <span className="px-1.5 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted">
          {selectedType === "squad" ? "Squad" : "Dept"}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-theme-text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {mounted &&
        isOpen &&
        buttonRef.current &&
        createPortal(
          <SelectorDropdown
            buttonRect={buttonRef.current.getBoundingClientRect()}
            panelRef={panelRef}
            search={search}
            onSearchChange={setSearch}
            squads={squads}
            departments={departments}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            selectedType={selectedType}
            selectedId={selectedId}
            onSelect={handleSelect}
          />,
          document.body,
        )}
    </>
  );
}

interface SelectorDropdownProps {
  buttonRect: DOMRect;
  panelRef: React.RefObject<HTMLDivElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  squads: Squad[];
  departments: string[];
  activeTab: SelectionType;
  onTabChange: (tab: SelectionType) => void;
  selectedType: SelectionType;
  selectedId: string;
  onSelect: (type: SelectionType, id: string) => void;
}

const SelectorDropdown = ({
  buttonRect,
  panelRef,
  search,
  onSearchChange,
  squads,
  departments,
  activeTab,
  onTabChange,
  selectedType,
  selectedId,
  onSelect,
}: SelectorDropdownProps) => {
  const position = {
    top: buttonRect.bottom + 8,
    left: Math.min(buttonRect.left, window.innerWidth - 300 - 16),
  };

  // Filter items by search based on active tab
  const filteredSquads = (squads || []).filter((squad) =>
    squad.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredDepartments = (departments || []).filter((dept) =>
    dept.toLowerCase().includes(search.toLowerCase()),
  );

  const currentItems =
    activeTab === "squad" ? filteredSquads : filteredDepartments;
  const hasNoResults = currentItems.length === 0;

  return (
    <div
      ref={panelRef}
      className="fixed w-72 bg-theme-surface border border-theme-border shadow-xl z-[9999] flex flex-col"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex border-b border-theme-border">
        <button
          onClick={() => onTabChange("squad")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "squad"
              ? "text-primary-400 bg-primary-500/10 border-b-2 border-primary-500 -mb-px"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
          }`}
        >
          <Users className="w-4 h-4" />
          Squads
          <span
            className={`px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === "squad"
                ? "bg-primary-500/20 text-primary-300"
                : "bg-theme-elevated text-theme-text-muted"
            }`}
          >
            {squads?.length || 0}
          </span>
        </button>
        <button
          onClick={() => onTabChange("department")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "department"
              ? "text-purple-400 bg-purple-500/10 border-b-2 border-purple-500 -mb-px"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments
          <span
            className={`px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === "department"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-theme-elevated text-theme-text-muted"
            }`}
          >
            {departments?.length || 0}
          </span>
        </button>
      </div>

      <div className="p-3 border-b border-theme-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "squad" ? "squads" : "departments"}...`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-theme-elevated border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-primary-500"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-64">
        {hasNoResults ? (
          <div className="px-4 py-8 text-center text-theme-text-muted">
            <p className="text-sm">
              No {activeTab === "squad" ? "squads" : "departments"} found
            </p>
          </div>
        ) : activeTab === "squad" ? (
          // Squad list
          <div className="py-1">
            {filteredSquads.map((squad) => {
              const isSelected =
                selectedType === "squad" && selectedId === squad.id.toString();
              return (
                <button
                  key={`squad-${squad.id}`}
                  onClick={() => onSelect("squad", squad.id.toString())}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-primary-500/20 text-primary-300"
                      : "text-theme-text hover:bg-theme-elevated"
                  }`}
                >
                  <Users className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{squad.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          // Department list
          <div className="py-1">
            {filteredDepartments.map((dept) => {
              const isSelected =
                selectedType === "department" && selectedId === dept;
              return (
                <button
                  key={`dept-${dept}`}
                  onClick={() => onSelect("department", dept)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-theme-text hover:bg-theme-elevated"
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{dept}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
