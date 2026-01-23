"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Palmtree, RefreshCw, Calendar, User as UserIcon } from "lucide-react";
import { ErrorAlert } from "@/components";
import { User } from "@/shared/types/user";
import {
  TimeOffRequest,
  TIME_OFF_TYPE_LABELS,
} from "@/app/(pages)/(dashboard)/time-off/types";
import { SelectionType } from "../types";
import { useTeamTimeOff } from "../hooks";
import Avatar from "@/shared/common/Avatar";

interface TeamTimeOffWidgetProps {
  selectionType: SelectionType;
  selectedId: string;
  allUsers: User[];
}

export default function TeamTimeOffWidget({
  selectionType,
  selectedId,
  allUsers,
}: TeamTimeOffWidgetProps) {
  const { currentlyOnLeave, upcoming, isLoading, error, refetch } =
    useTeamTimeOff({
      type: selectionType,
      id: selectedId,
      allUsers,
    });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center gap-3">
          <Palmtree className="w-5 h-5 text-theme-text-muted" />
          <h2 className="text-lg font-semibold text-theme-text">Time Off</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const totalCount = currentlyOnLeave.length + upcoming.length;

  return (
    <div className="bg-theme-surface border border-theme-border overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palmtree className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-theme-text">Time Off</h2>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-900/50 text-amber-300">
              {totalCount}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {error && (
        <div className="px-6 py-4">
          <ErrorAlert>{error}</ErrorAlert>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex-1 px-6 py-12 text-center text-theme-text-muted">
          <Palmtree className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          <p>No upcoming time off</p>
          <p className="text-sm mt-1 text-theme-text-subtle">
            Approved time-off requests will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto max-h-80">
          {currentlyOnLeave.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-green-400 uppercase tracking-wider bg-green-900/20 border-b border-green-500/20">
                Currently On Leave ({currentlyOnLeave.length})
              </div>
              <div className="divide-y divide-theme-border">
                {currentlyOnLeave.map((request) => (
                  <TimeOffItem key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wider bg-amber-900/20 border-b border-amber-500/20">
                Upcoming ({upcoming.length})
              </div>
              <div className="divide-y divide-theme-border">
                {upcoming.slice(0, 5).map((request) => (
                  <TimeOffItem key={request.id} request={request} />
                ))}
                {upcoming.length > 5 && (
                  <div className="px-4 py-2 text-sm text-theme-text-muted text-center bg-theme-elevated">
                    +{upcoming.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-6 py-3 bg-theme-elevated border-t border-theme-border mt-auto">
        <Link
          href="/time-off"
          className="text-sm text-primary-400 hover:underline flex items-center gap-1"
        >
          View all time off
          <Palmtree className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

interface TimeOffItemProps {
  request: TimeOffRequest;
}

const TimeOffItem = ({ request }: TimeOffItemProps) => {
  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  const dateRange = isSameDay
    ? format(startDate, "MMM d")
    : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-theme-elevated/50 transition-colors">
      {request.user ? (
        <Avatar
          s3AvatarUrl={request.user.avatar_url}
          firstName={request.user.first_name}
          lastName={request.user.last_name}
          size="sm"
          className="flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 bg-theme-elevated rounded-full flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-4 h-4 text-theme-text-muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-text truncate">
            {request.user
              ? `${request.user.first_name} ${request.user.last_name}`
              : "Unknown User"}
          </span>
          <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-900/40 text-amber-300">
            {TIME_OFF_TYPE_LABELS[request.request_type]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-theme-text-muted">
          <Calendar className="w-3 h-3" />
          {dateRange}
        </div>
      </div>
    </div>
  );
};
