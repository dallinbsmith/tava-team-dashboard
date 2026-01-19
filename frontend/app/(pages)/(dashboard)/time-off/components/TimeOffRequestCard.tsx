"use client";

import { format } from "date-fns";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS, TIME_OFF_STATUS_LABELS, TimeOffStatus } from "../types";
import { Calendar, Clock, User, MessageSquare, X, Check, XCircle } from "lucide-react";

interface TimeOffRequestCardProps {
  request: TimeOffRequest;
  onCancel?: (id: number) => void;
  onReview?: (id: number, status: "approved" | "rejected") => void;
  showUser?: boolean;
  cancelling?: boolean;
}

const statusColors: Record<TimeOffStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  approved: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  cancelled: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" },
};

export default function TimeOffRequestCard({
  request,
  onCancel,
  onReview,
  showUser = false,
  cancelling = false,
}: TimeOffRequestCardProps) {
  const colors = statusColors[request.status];
  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  const dateRange = isSameDay
    ? format(startDate, "MMM d, yyyy")
    : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-medium">
              {TIME_OFF_TYPE_LABELS[request.request_type]}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
              {TIME_OFF_STATUS_LABELS[request.status]}
            </span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{dateRange}</span>
            </div>

            {showUser && request.user && (
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>{request.user.first_name} {request.user.last_name}</span>
              </div>
            )}

            {request.reason && (
              <div className="flex items-start gap-2 text-gray-400">
                <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{request.reason}</span>
              </div>
            )}

            {request.reviewer && request.reviewed_at && (
              <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
                <Clock className="w-3 h-3" />
                <span>
                  Reviewed by {request.reviewer.first_name} {request.reviewer.last_name} on{" "}
                  {format(new Date(request.reviewed_at), "MMM d, yyyy")}
                </span>
              </div>
            )}

            {request.reviewer_notes && (
              <div className="mt-2 p-2 bg-gray-700/50 rounded text-gray-400 text-xs">
                <span className="font-medium">Reviewer note:</span> {request.reviewer_notes}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {request.status === "pending" && onCancel && (
            <button
              onClick={() => onCancel(request.id)}
              disabled={cancelling}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              title="Cancel request"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {request.status === "pending" && onReview && (
            <>
              <button
                onClick={() => onReview(request.id, "approved")}
                className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReview(request.id, "rejected")}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
