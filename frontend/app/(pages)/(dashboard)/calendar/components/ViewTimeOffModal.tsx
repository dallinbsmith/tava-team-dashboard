"use client";

import { useState, useEffect } from "react";
import {
  TimeOffRequest,
  TIME_OFF_TYPE_LABELS,
  TIME_OFF_STATUS_LABELS,
} from "../../time-off/types";
import {
  getTimeOffRequest,
  cancelTimeOffRequest,
  reviewTimeOffRequest,
} from "../../time-off/actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { BaseModal } from "@/components";
import {
  Loader2,
  Palmtree,
  Calendar,
  User,
  Clock,
  X,
  Check,
  MessageSquare,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface ViewTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeOffId: number;
  onUpdated: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  cancelled: "bg-gray-500",
};

const TYPE_COLORS: Record<string, string> = {
  vacation: "text-amber-400",
  sick: "text-red-400",
  personal: "text-blue-400",
  bereavement: "text-purple-400",
  jury_duty: "text-gray-400",
  other: "text-theme-text-muted",
};

export default function ViewTimeOffModal({
  isOpen,
  onClose,
  timeOffId,
  onUpdated,
}: ViewTimeOffModalProps) {
  const { currentUser, effectiveIsSupervisorOrAdmin } = useCurrentUser();

  const [timeOff, setTimeOff] = useState<TimeOffRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Load time-off data
  useEffect(() => {
    if (isOpen && timeOffId) {
      setLoading(true);
      setError(null);
      getTimeOffRequest(timeOffId)
        .then((data) => {
          setTimeOff(data);
        })
        .catch((e) => {
          console.error("Failed to load time-off request:", e);
          setError("Failed to load time-off details");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, timeOffId]);

  const canCancel =
    timeOff &&
    timeOff.user_id === currentUser?.id &&
    timeOff.status === "pending";

  // Can review if supervisor/admin and request is pending (and not their own)
  const canReview =
    timeOff &&
    effectiveIsSupervisorOrAdmin &&
    timeOff.status === "pending" &&
    timeOff.user_id !== currentUser?.id;

  const handleClose = () => {
    setShowCancelConfirm(false);
    setShowReviewForm(false);
    setReviewNotes("");
    setError(null);
    onClose();
  };

  const handleCancel = async () => {
    if (!timeOff) return;
    setCancelling(true);
    setError(null);

    try {
      await cancelTimeOffRequest(timeOff.id);
      handleClose();
      onUpdated();
    } catch (e) {
      console.error("Failed to cancel time-off request:", e);
      setError("Failed to cancel request");
    } finally {
      setCancelling(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!timeOff) return;
    setReviewing(true);
    setError(null);

    try {
      await reviewTimeOffRequest(timeOff.id, {
        status,
        reviewer_notes: reviewNotes.trim() || undefined,
      });
      handleClose();
      onUpdated();
    } catch (e) {
      console.error("Failed to review time-off request:", e);
      setError("Failed to review request");
    } finally {
      setReviewing(false);
    }
  };

  const getDuration = () => {
    if (!timeOff) return 0;
    return (
      differenceInDays(
        new Date(timeOff.end_date),
        new Date(timeOff.start_date),
      ) + 1
    );
  };

  const getRequestorName = () => {
    if (!timeOff?.user) return "Unknown";
    return `${timeOff.user.first_name} ${timeOff.user.last_name}`;
  };

  const getReviewerName = () => {
    if (!timeOff?.reviewer) return "Unknown";
    return `${timeOff.reviewer.first_name} ${timeOff.reviewer.last_name}`;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Time Off Request"
      maxWidth="max-w-lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : !timeOff ? (
        <div className="py-8 text-center text-theme-text-muted">
          <p>Time-off request not found</p>
        </div>
      ) : showCancelConfirm ? (
        // Cancel confirmation
        <div className="space-y-4">
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded">
            <p className="text-red-300 font-medium">
              Are you sure you want to cancel this request?
            </p>
            <p className="text-red-400 text-sm mt-1">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Keep Request
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancel Request
            </button>
          </div>
        </div>
      ) : showReviewForm ? (
        // Review form
        <div className="space-y-4">
          <div className="p-4 bg-theme-elevated rounded-lg">
            <p className="text-sm text-theme-text-muted mb-1">
              Reviewing request from
            </p>
            <p className="font-medium text-theme-text">{getRequestorName()}</p>
            <p className="text-sm text-theme-text-muted mt-2">
              {format(new Date(timeOff.start_date), "MMM d")} -{" "}
              {format(new Date(timeOff.end_date), "MMM d, yyyy")}
              <span className="ml-2">
                ({getDuration()} day{getDuration() !== 1 ? "s" : ""})
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes (optional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes for the employee..."
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-theme-border">
            <button
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleReview("rejected")}
                disabled={reviewing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {reviewing && <Loader2 className="w-4 h-4 animate-spin" />}
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => handleReview("approved")}
                disabled={reviewing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {reviewing && <Loader2 className="w-4 h-4 animate-spin" />}
                <Check className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      ) : (
        // View mode
        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-900/30 rounded-lg">
              <Palmtree className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className={`text-lg font-semibold ${TYPE_COLORS[timeOff.request_type]}`}
                >
                  {TIME_OFF_TYPE_LABELS[timeOff.request_type]}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${STATUS_COLORS[timeOff.status]}`}
                >
                  {TIME_OFF_STATUS_LABELS[timeOff.status]}
                </span>
              </div>
              {timeOff.user && (
                <p className="text-theme-text-muted mt-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {getRequestorName()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">Start Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm font-medium text-theme-text">
                  {format(new Date(timeOff.start_date), "EEE, MMM d, yyyy")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">End Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm font-medium text-theme-text">
                  {format(new Date(timeOff.end_date), "EEE, MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-theme-elevated rounded-lg">
            <p className="text-xs text-theme-text-muted mb-1">Duration</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-theme-text-muted" />
              <span className="text-sm font-medium text-theme-text">
                {getDuration()} day{getDuration() !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {timeOff.reason && (
            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">Reason</p>
              <p className="text-sm text-theme-text">{timeOff.reason}</p>
            </div>
          )}

          {(timeOff.status === "approved" || timeOff.status === "rejected") &&
            timeOff.reviewer && (
              <div className="p-3 bg-theme-elevated rounded-lg">
                <p className="text-xs text-theme-text-muted mb-1">
                  {timeOff.status === "approved" ? "Approved" : "Rejected"} by
                </p>
                <p className="text-sm font-medium text-theme-text">
                  {getReviewerName()}
                </p>
                {timeOff.reviewed_at && (
                  <p className="text-xs text-theme-text-muted mt-1">
                    on{" "}
                    {format(
                      new Date(timeOff.reviewed_at),
                      "MMM d, yyyy 'at' h:mm a",
                    )}
                  </p>
                )}
                {timeOff.reviewer_notes && (
                  <div className="mt-2 pt-2 border-t border-theme-border">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-theme-text-muted mt-0.5" />
                      <p className="text-sm text-theme-text">
                        {timeOff.reviewer_notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          <div className="text-xs text-theme-text-muted">
            Requested{" "}
            {format(new Date(timeOff.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>

          {(canCancel || canReview) && (
            <div className="flex justify-between pt-4 border-t border-theme-border">
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Request
                </button>
              )}
              {canReview && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="ml-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  Review Request
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
