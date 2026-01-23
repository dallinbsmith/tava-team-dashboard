"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm text-theme-text-muted">
        <span className="font-medium text-theme-text">{currentPage}</span> /{" "}
        {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-text-muted hover:text-theme-text disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-theme-border mx-1" />
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-text-muted hover:text-theme-text disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
