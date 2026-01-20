"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

export interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function FilterSection({ title, isExpanded, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-theme-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-theme-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-theme-text-muted" />
        )}
      </button>
      {isExpanded && <div className="pb-3">{children}</div>}
    </div>
  );
}
