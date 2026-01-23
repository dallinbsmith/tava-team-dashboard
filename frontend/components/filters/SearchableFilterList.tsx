"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import useDebouncedValue from "@restart/hooks/useDebouncedValue";
import FilterCheckbox from "./FilterCheckbox";

export interface SearchableFilterListProps {
  items: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allValue?: string;
  maxHeight?: string;
}

export default function SearchableFilterList({
  items,
  selectedValue,
  onChange,
  placeholder = "Search...",
  allValue = "all",
  maxHeight = "max-h-32",
}: SearchableFilterListProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const filteredItems = useMemo(
    () => items.filter((item) => item.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [items, debouncedSearch]
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text-muted" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-theme-elevated border border-theme-border rounded text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-primary-500"
        />
      </div>
      <div className={`${maxHeight} overflow-y-auto space-y-1`}>
        {filteredItems.map((item) => (
          <FilterCheckbox
            key={item}
            label={item}
            checked={selectedValue === item}
            onChange={(checked) => onChange(checked ? item : allValue)}
          />
        ))}
        {filteredItems.length === 0 && (
          <p className="text-xs text-theme-text-muted py-2 text-center">No results found</p>
        )}
      </div>
    </div>
  );
}
