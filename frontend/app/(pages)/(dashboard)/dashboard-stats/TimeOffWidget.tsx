"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar, Clock, Plane, Check, X } from "lucide-react";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import {
  useMyTimeOffRequests,
  useTeamTimeOff,
  usePendingTimeOffRequests,
  useReviewTimeOffRequest,
  useCancelTimeOffRequest,
} from "@/app/(pages)/(dashboard)/time-off/hooks";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS } from "@/app/(pages)/(dashboard)/time-off/types";
import Avatar from "@/shared/common/Avatar";
import Pagination from "@/shared/common/Pagination";
import { format, differenceInDays, isAfter, startOfDay } from "date-fns";
import { PAGINATION } from "@/lib/constants";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

type TabType = "upcoming" | "pending";

interface TimeOffWidgetProps {
  animate?: boolean;
}

export default function TimeOffWidget({ animate = true }: TimeOffWidgetProps) {
  const { currentUser } = useCurrentUser();
  const isSupervisorOrAdmin = currentUser?.role === "supervisor" || currentUser?.role === "admin";

  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [page, setPage] = useState(1);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch data for upcoming time off
  const { data: myApprovedTimeOff, isLoading: myApprovedLoading } =
    useMyTimeOffRequests("approved");
  const { data: teamTimeOff, isLoading: teamLoading } = useTeamTimeOff();

  // Fetch data for pending requests
  const { data: myPendingTimeOff, isLoading: myPendingLoading } = useMyTimeOffRequests("pending");
  const { data: teamPendingTimeOff, isLoading: teamPendingLoading } = usePendingTimeOffRequests();

  const reviewMutation = useReviewTimeOffRequest();
  const cancelMutation = useCancelTimeOffRequest();

  // Reset page when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedRequests(new Set());
  };

  // Upcoming time off data
  const upcomingTimeOff = useMemo(() => {
    const today = startOfDay(new Date());
    let requests: TimeOffRequest[] = [];

    if (isSupervisorOrAdmin) {
      requests = teamTimeOff || [];
    } else {
      requests = myApprovedTimeOff || [];
    }

    return requests
      .filter(
        (r) =>
          isAfter(new Date(r.end_date), today) ||
          format(new Date(r.end_date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
      )
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [isSupervisorOrAdmin, myApprovedTimeOff, teamTimeOff]);

  // Pending requests data
  const pendingRequests = useMemo(() => {
    if (isSupervisorOrAdmin) {
      return teamPendingTimeOff || [];
    }
    return myPendingTimeOff || [];
  }, [isSupervisorOrAdmin, myPendingTimeOff, teamPendingTimeOff]);

  // Loading states
  const upcomingLoading = isSupervisorOrAdmin ? teamLoading : myApprovedLoading;
  const pendingLoading = isSupervisorOrAdmin ? teamPendingLoading : myPendingLoading;
  const isLoading = activeTab === "upcoming" ? upcomingLoading : pendingLoading;

  // Current data based on active tab
  const currentData = activeTab === "upcoming" ? upcomingTimeOff : pendingRequests;
  const totalPages = Math.ceil(currentData.length / PAGINATION.TIME_OFF);
  const startIndex = (page - 1) * PAGINATION.TIME_OFF;
  const paginatedData = currentData.slice(startIndex, startIndex + PAGINATION.TIME_OFF);

  // Selection handlers for supervisors/admins (pending tab only)
  const toggleRequestSelection = (id: number) => {
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllRequests = () => {
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (action: "approved" | "rejected") => {
    if (selectedRequests.size === 0) return;

    setProcessingIds(new Set(selectedRequests));
    setActionError(null);

    try {
      await Promise.all(
        Array.from(selectedRequests).map((id) =>
          reviewMutation.mutateAsync({ id, review: { status: action } })
        )
      );
      setSelectedRequests(new Set());
    } catch (error) {
      console.error("Failed to process time off requests:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to process time off requests. Please try again."
      );
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleSingleReview = async (id: number, action: "approved" | "rejected") => {
    setProcessingIds(new Set([id]));
    setActionError(null);

    try {
      await reviewMutation.mutateAsync({ id, review: { status: action } });
      setSelectedRequests((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Failed to process time off request:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to process time off request. Please try again."
      );
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleCancel = async (id: number) => {
    setProcessingIds(new Set([id]));
    setActionError(null);

    try {
      await cancelMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to cancel time off request:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to cancel time off request. Please try again."
      );
    } finally {
      setProcessingIds(new Set());
    }
  };

  const totalCount = upcomingTimeOff.length + pendingRequests.length;

  return (
    <div
      className={`bg-theme-surface border border-theme-border overflow-hidden flex flex-col h-full transition-all duration-500 ${
        animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-theme-text">Time Off</h2>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {totalCount}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border border-theme-border">
          <button
            onClick={() => handleTabChange("upcoming")}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
              activeTab === "upcoming"
                ? "bg-primary-600 text-white"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
            }`}
          >
            <Plane className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline">Upcoming</span>
            <span className="sm:hidden">Up</span>
            {upcomingTimeOff.length > 0 && (
              <span
                className={`px-1 py-0.5 text-xs font-medium ${
                  activeTab === "upcoming"
                    ? "bg-primary-700 text-white"
                    : "bg-green-900/50 text-green-300"
                }`}
              >
                {upcomingTimeOff.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("pending")}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-primary-600 text-white"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated"
            }`}
          >
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline">Pending</span>
            <span className="sm:hidden">Pend</span>
            {pendingRequests.length > 0 && (
              <span
                className={`px-1 py-0.5 text-xs font-medium ${
                  activeTab === "pending"
                    ? "bg-primary-700 text-white"
                    : "bg-yellow-900/50 text-yellow-300"
                }`}
              >
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Bulk actions for supervisors/admins on pending tab */}
        {isSupervisorOrAdmin && activeTab === "pending" && pendingRequests.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2" role="group" aria-label="Bulk actions">
            <button
              onClick={toggleAllRequests}
              className="text-xs text-theme-text-muted hover:text-theme-text transition-colors"
              aria-label={
                selectedRequests.size === pendingRequests.length
                  ? "Deselect all time off requests"
                  : "Select all time off requests"
              }
            >
              {selectedRequests.size === pendingRequests.length ? "Deselect All" : "Select All"}
            </button>
            {selectedRequests.size > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction("approved")}
                  disabled={processingIds.size > 0}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  aria-label={`Approve ${selectedRequests.size} selected request${
                    selectedRequests.size !== 1 ? "s" : ""
                  }`}
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  Approve ({selectedRequests.size})
                </button>
                <button
                  onClick={() => handleBulkAction("rejected")}
                  disabled={processingIds.size > 0}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  aria-label={`Reject ${selectedRequests.size} selected request${
                    selectedRequests.size !== 1 ? "s" : ""
                  }`}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  Reject ({selectedRequests.size})
                </button>
              </>
            )}
          </div>
        )}

        {actionError && (
          <ErrorAlert
            variant="error"
            title="Action failed"
            dismissible
            onDismiss={() => setActionError(null)}
            className="mx-4 my-2"
          >
            {actionError}
          </ErrorAlert>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-8 px-4 text-theme-text-muted">
            <div className="w-6 h-6 border-2 border-theme-border border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-8 px-4 text-theme-text-muted">
            {activeTab === "upcoming" ? (
              <>
                <Calendar className="w-10 h-10 mx-auto mb-3 text-theme-text-subtle" />
                <p className="text-sm">
                  {isSupervisorOrAdmin ? "No upcoming team time off" : "No upcoming time off"}
                </p>
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 mx-auto mb-3 text-theme-text-subtle" />
                <p className="text-sm">
                  {isSupervisorOrAdmin ? "No pending requests to review" : "No pending requests"}
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            className="divide-y divide-theme-border"
            role="list"
            aria-label={`${activeTab} time off requests`}
          >
            {paginatedData.map((request) => {
              const isSelected = selectedRequests.has(request.id);
              const isProcessing = processingIds.has(request.id);
              const days =
                differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;

              const userName = request.user
                ? `${request.user.first_name} ${request.user.last_name}`
                : isSupervisorOrAdmin
                  ? "Unknown User"
                  : `${currentUser?.first_name} ${currentUser?.last_name}`;

              const isCurrentlyOnLeave =
                activeTab === "upcoming" &&
                new Date(request.start_date) <= new Date() &&
                new Date(request.end_date) >= new Date();

              return (
                <div
                  key={request.id}
                  role="listitem"
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isSelected
                      ? "bg-primary-900/20"
                      : isCurrentlyOnLeave
                        ? "bg-green-900/10"
                        : "hover:bg-theme-elevated/50"
                  } ${isProcessing ? "opacity-50" : ""}`}
                >
                  {/* Checkbox for supervisors/admins on pending tab */}
                  {isSupervisorOrAdmin && activeTab === "pending" && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRequestSelection(request.id)}
                      disabled={isProcessing}
                      className="w-4 h-4 rounded border-theme-border text-primary-500 focus:ring-primary-500"
                      aria-label={`Select time off request from ${userName}`}
                    />
                  )}

                  {/* Avatar */}
                  {isSupervisorOrAdmin && request.user ? (
                    <Avatar
                      s3AvatarUrl={request.user.avatar_url}
                      firstName={request.user.first_name}
                      lastName={request.user.last_name}
                      size="sm"
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <Avatar
                      s3AvatarUrl={currentUser?.avatar_url}
                      firstName={currentUser?.first_name || ""}
                      lastName={currentUser?.last_name || ""}
                      size="sm"
                      className="rounded-full flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-theme-text truncate">
                        {userName}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted">
                        {TIME_OFF_TYPE_LABELS[request.request_type]}
                      </span>
                      {isCurrentlyOnLeave && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-600 text-white">
                          On Leave
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-theme-text-muted">
                      {format(new Date(request.start_date), "MMM d")} -{" "}
                      {format(new Date(request.end_date), "MMM d")}
                      <span className="ml-1 text-theme-text-subtle">({days}d)</span>
                    </div>
                  </div>

                  {/* Actions - only for pending tab */}
                  {activeTab === "pending" && (
                    <div className="flex items-center gap-1">
                      {isSupervisorOrAdmin ? (
                        <>
                          <button
                            onClick={() => handleSingleReview(request.id, "approved")}
                            disabled={isProcessing}
                            className="p-1 text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSingleReview(request.id, "rejected")}
                            disabled={isProcessing}
                            className="p-1 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCancel(request.id)}
                          disabled={isProcessing}
                          className="p-1 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          title="Cancel request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - always anchored to bottom */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-theme-border bg-theme-elevated mt-auto">
        <Link
          href="/time-off"
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          View all time off →
        </Link>
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
