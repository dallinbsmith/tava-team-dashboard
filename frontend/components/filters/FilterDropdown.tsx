"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";

export interface FilterDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeFilterCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function FilterDropdown({
  isOpen,
  onToggle,
  onClose,
  activeFilterCount,
  onClearAll,
  children,
  title = "Filters",
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

      const handleScroll = () => {
        if (scrollListenerActive) {
          onClose();
        }
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

      {mounted && isOpen && buttonRef.current && createPortal(
        <DropdownPanel
          buttonRect={buttonRef.current.getBoundingClientRect()}
          panelRef={panelRef}
          activeFilterCount={activeFilterCount}
          onClearAll={onClearAll}
          title={title}
        >
          {children}
        </DropdownPanel>,
        document.body
      )}
    </>
  );
}

function DropdownPanel({
  buttonRect,
  panelRef,
  activeFilterCount,
  onClearAll,
  title,
  children,
}: {
  buttonRect: DOMRect;
  panelRef: React.RefObject<HTMLDivElement | null>;
  activeFilterCount: number;
  onClearAll: () => void;
  title: string;
  children: React.ReactNode;
}) {

  const position = {
    top: buttonRect.bottom + 8,
    left: Math.min(buttonRect.left, window.innerWidth - 288 - 16),
  };

  return (
    <div
      ref={panelRef}
      className="fixed w-72 bg-theme-surface border border-theme-border rounded-lg shadow-xl z-[9999]"
      style={{
        top: position.top,
        left: position.left,
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
}
