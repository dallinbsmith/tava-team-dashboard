"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";

export type DropdownPosition = "auto" | "above" | "below" | "left" | "right";

export interface FilterDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeFilterCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
  title?: string;
  position?: DropdownPosition;
}

export default function FilterDropdown({
  isOpen,
  onToggle,
  onClose,
  activeFilterCount,
  onClearAll,
  children,
  title = "Filters",
  position = "auto",
}: FilterDropdownProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        onClose();
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      let scrollListenerActive = false;
      const timeoutId = setTimeout(() => {
        scrollListenerActive = true;
      }, 100);

      const handleScroll = (event: Event) => {
        if (!scrollListenerActive) return;

        // Don't close if scrolling inside the dropdown panel
        const target = event.target as Node;
        if (panelRef.current && panelRef.current.contains(target)) {
          return;
        }

        onClose();
      };

      window.addEventListener("scroll", handleScroll, true);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onToggle}
        className={`relative p-2 transition-colors ${isOpen || activeFilterCount > 0
          ? "bg-primary-500 text-white"
          : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
          }`}
        title={title}
      >
        <Filter className="w-4 h-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-primary-600 text-white rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {mounted &&
        isOpen &&
        buttonRef.current &&
        createPortal(
          <DropdownPanel
            buttonRect={buttonRef.current.getBoundingClientRect()}
            panelRef={panelRef}
            activeFilterCount={activeFilterCount}
            onClearAll={onClearAll}
            title={title}
            position={position}
          >
            {children}
          </DropdownPanel>,
          document.body
        )}
    </>
  );
}

const DropdownPanel = ({
  buttonRect,
  panelRef,
  activeFilterCount,
  onClearAll,
  title,
  children,
  position: preferredPosition,
}: {
  buttonRect: DOMRect;
  panelRef: React.RefObject<HTMLDivElement | null>;
  activeFilterCount: number;
  onClearAll: () => void;
  title: string;
  children: React.ReactNode;
  position: DropdownPosition;
}) => {
  const estimatedPanelHeight = 350;
  const panelWidth = 288; // w-72 = 18rem = 288px
  const gap = 8;
  const viewportPadding = 16;

  // Calculate available space above/below for auto positioning
  const spaceBelow = window.innerHeight - buttonRect.bottom - gap;
  const spaceAbove = buttonRect.top - gap;

  // Determine actual position based on preference and available space
  let actualPosition: "above" | "below" | "left" | "right";

  if (preferredPosition === "auto") {
    // Auto: prefer below, fall back to above if not enough space
    actualPosition = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow ? "above" : "below";
  } else {
    actualPosition = preferredPosition;
  }

  // Calculate position coordinates based on actual position
  let top: number;
  let left: number;
  let maxHeight: number;

  switch (actualPosition) {
    case "above":
      top = Math.max(viewportPadding, buttonRect.top - estimatedPanelHeight - gap);
      left = Math.min(
        Math.max(viewportPadding, buttonRect.left),
        window.innerWidth - panelWidth - viewportPadding
      );
      maxHeight = buttonRect.top - gap - viewportPadding;
      break;

    case "below":
      top = buttonRect.bottom + gap;
      left = Math.min(
        Math.max(viewportPadding, buttonRect.left),
        window.innerWidth - panelWidth - viewportPadding
      );
      maxHeight = window.innerHeight - buttonRect.bottom - gap - viewportPadding;
      break;

    case "left":
      // Position to the left of the button, vertically centered or aligned to top
      top = Math.min(
        Math.max(viewportPadding, buttonRect.top),
        window.innerHeight - estimatedPanelHeight - viewportPadding
      );
      left = Math.max(viewportPadding, buttonRect.left - panelWidth - gap);
      maxHeight = window.innerHeight - viewportPadding * 2;
      break;

    case "right":
      // Position to the right of the button, vertically centered or aligned to top
      top = Math.min(
        Math.max(viewportPadding, buttonRect.top),
        window.innerHeight - estimatedPanelHeight - viewportPadding
      );
      left = Math.min(
        buttonRect.right + gap,
        window.innerWidth - panelWidth - viewportPadding
      );
      maxHeight = window.innerHeight - viewportPadding * 2;
      break;
  }

  return (
    <div
      ref={panelRef}
      className="fixed w-72 bg-theme-surface border border-theme-border rounded-lg shadow-xl z-[9999] overflow-auto"
      style={{
        top,
        left,
        maxHeight: Math.min(maxHeight, estimatedPanelHeight),
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-theme-text">{title}</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
            >
              Reset all
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};
