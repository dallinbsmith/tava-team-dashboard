"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { TimeOffRequest, TIME_OFF_TYPE_LABELS } from "../types";
import { reviewTimeOffRequestAction } from "../actions";
import {
  X,
  Check,
  XCircle,
  Loader2,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";

interface TimeOffReviewModalProps {
  request: TimeOffRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeOffReviewModal({
  request,
  onClose,
  onSuccess,
}: TimeOffReviewModalProps) {
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateRange = isSameDay
    ? format(startDate, "MMM d, yyyy")
    : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;

  const handleReview = async (status: "approved" | "rejected") => {
    setError(null);

    startTransition(async () => {
      const result = await reviewTimeOffRequestAction(request.id, {
        status,
        reviewer_notes: notes || undefined,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">
            Review Time Off Request
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-4 h-4 text-gray-500" />
              <span>
                {request.user?.first_name} {request.user?.last_name}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>
                {TIME_OFF_TYPE_LABELS[request.request_type]} - {dateRange}
              </span>
            </div>

            {request.reason && (
              <div className="flex items-start gap-2 text-gray-400 text-sm">
                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                <span>{request.reason}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note for the employee..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => handleReview("rejected")}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject
            </button>
            <button
              onClick={() => handleReview("approved")}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
