"use client";

import { RefObject } from "react";
import { View } from "react-big-calendar";
import { addMonths, subMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Calendar as CalendarIcon,
  CheckSquare,
  Users,
  Palmtree,
  UserPlus,
} from "lucide-react";

interface CalendarToolbarProps {
  label: string;
  view: View;
  date: Date;
  refreshing: boolean;
  addMenuOpen: boolean;
  addMenuRef: RefObject<HTMLDivElement | null>;
  showTeamTimeOff: boolean;
  effectiveIsSupervisorOrAdmin: boolean;
  onNavigate: (date: Date) => void;
  onViewChange: (view: View) => void;
  onRefresh: () => void;
  onToggleAddMenu: () => void;
  onSetShowTeamTimeOff: (show: boolean) => void;
  onCreateTask?: () => void;
  onCreateEvent?: () => void;
  onCreateMeeting?: () => void;
  onRequestTimeOff?: () => void;
  onCreateTimeOffForEmployee?: () => void;
  onAction: (action: (() => void) | undefined) => void;
}

export default function CalendarToolbar({
  label,
  view,
  date,
  refreshing,
  addMenuOpen,
  addMenuRef,
  showTeamTimeOff,
  effectiveIsSupervisorOrAdmin,
  onNavigate,
  onViewChange,
  onRefresh,
  onToggleAddMenu,
  onSetShowTeamTimeOff,
  onCreateTask,
  onCreateEvent,
  onCreateMeeting,
  onRequestTimeOff,
  onCreateTimeOffForEmployee,
  onAction,
}: CalendarToolbarProps) {
  const hasAnyAction =
    onCreateTask ||
    onCreateEvent ||
    onCreateMeeting ||
    onRequestTimeOff ||
    onCreateTimeOffForEmployee;

  const handlePrevious = () => {
    onNavigate(
      view === "month" ? subMonths(date, 1) : new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleNext = () => {
    onNavigate(
      view === "month" ? addMonths(date, 1) : new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-theme-border">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onNavigate(new Date())}
          className="px-3 py-1.5 text-sm font-medium text-theme-text hover:bg-theme-elevated rounded-lg transition-colors min-w-[140px] text-center"
        >
          {label}
        </button>
        <button
          onClick={handleNext}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors disabled:opacity-50 ml-1"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {effectiveIsSupervisorOrAdmin && (
          <div className="flex bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
            <button
              onClick={() => onSetShowTeamTimeOff(false)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                !showTeamTimeOff
                  ? "bg-theme-elevated text-theme-text"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => onSetShowTeamTimeOff(true)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-theme-border ${
                showTeamTimeOff
                  ? "bg-theme-elevated text-theme-text"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
              }`}
            >
              Team
            </button>
          </div>
        )}
        <div className="flex bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewChange("month")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "month"
                ? "bg-theme-elevated text-theme-text"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onViewChange("week")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-theme-border ${
              view === "week"
                ? "bg-theme-elevated text-theme-text"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
            }`}
          >
            Week
          </button>
        </div>
        {hasAnyAction && (
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={onToggleAddMenu}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-theme-surface border border-theme-border rounded-lg shadow-lg z-50 overflow-hidden">
                {onCreateTask && (
                  <button
                    onClick={() => onAction(onCreateTask)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 text-green-400" />
                    Task
                  </button>
                )}
                {onCreateEvent && (
                  <button
                    onClick={() => onAction(onCreateEvent)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-400" />
                    Event
                  </button>
                )}
                {onCreateMeeting && (
                  <button
                    onClick={() => onAction(onCreateMeeting)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <Users className="w-4 h-4 text-purple-400" />
                    Meeting
                  </button>
                )}
                {onRequestTimeOff && (
                  <button
                    onClick={() => onAction(onRequestTimeOff)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <Palmtree className="w-4 h-4 text-amber-400" />
                    Request Time Off
                  </button>
                )}
                {onCreateTimeOffForEmployee && (
                  <button
                    onClick={() => onAction(onCreateTimeOffForEmployee)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    Time Off for Employee
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
