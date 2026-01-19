"use client";

import { TimeOffRequest, TimeOffStatus } from "../types";
import TimeOffRequestCard from "./TimeOffRequestCard";
import { Calendar, AlertCircle } from "lucide-react";

interface TimeOffRequestListProps {
  requests: TimeOffRequest[];
  loading?: boolean;
  error?: string | null;
  onCancel?: (id: number) => void;
  onReview?: (id: number, status: "approved" | "rejected") => void;
  showUser?: boolean;
  emptyMessage?: string;
  cancellingId?: number | null;
  filterStatus?: TimeOffStatus | null;
  onFilterChange?: (status: TimeOffStatus | null) => void;
}

export default function TimeOffRequestList({
  requests,
  loading = false,
  error = null,
  onCancel,
  onReview,
  showUser = false,
  emptyMessage = "No time off requests",
  cancellingId = null,
  filterStatus = null,
  onFilterChange,
}: TimeOffRequestListProps) {
  const filteredRequests = filterStatus
    ? requests.filter((r) => r.status === filterStatus)
    : requests;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 p-4 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-24 bg-gray-700 rounded" />
              <div className="h-5 w-16 bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      {onFilterChange && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => onFilterChange(null)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${filterStatus === null
                ? "bg-amber-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            All
          </button>
          {(["pending", "approved", "rejected", "cancelled"] as TimeOffStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => onFilterChange(status)}
              className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${filterStatus === status
                  ? "bg-amber-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <TimeOffRequestCard
              key={request.id}
              request={request}
              onCancel={onCancel}
              onReview={onReview}
              showUser={showUser}
              cancelling={cancellingId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
