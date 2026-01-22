"use client";

import { useState, useEffect, useTransition } from "react";
import { Meeting, UpdateMeetingRequest, ResponseStatus } from "../types";
import { getMeeting } from "../api";
import { updateMeetingAction, deleteMeetingAction, respondToMeetingAction } from "../actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { BaseModal } from "@/components";
import {
  Loader2,
  Users,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  HelpCircle,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";

interface ViewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: number;
  onUpdated: () => void;
}

const RESPONSE_STATUS: Record<ResponseStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: "Pending", color: "text-yellow-400", icon: HelpCircle },
  accepted: { label: "Accepted", color: "text-green-400", icon: Check },
  declined: { label: "Declined", color: "text-red-400", icon: X },
  tentative: { label: "Tentative", color: "text-blue-400", icon: HelpCircle },
};

export default function ViewMeetingModal({
  isOpen,
  onClose,
  meetingId,
  onUpdated,
}: ViewMeetingModalProps) {
  const { allUsers } = useOrganization();
  const { currentUser } = useCurrentUser();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);

  // Load meeting data
  useEffect(() => {
    if (isOpen && meetingId) {
      setLoading(true);
      setError(null);
      getMeeting(meetingId)
        .then((data) => {
          setMeeting(data);
          // Initialize edit form
          setTitle(data.title);
          setDescription(data.description || "");
          const start = new Date(data.start_time);
          const end = new Date(data.end_time);
          setStartDate(format(start, "yyyy-MM-dd"));
          setStartTime(format(start, "HH:mm"));
          setEndDate(format(end, "yyyy-MM-dd"));
          setEndTime(format(end, "HH:mm"));
          setAttendeeIds(data.attendees?.map((a) => a.user_id) || []);
        })
        .catch((e) => {
          console.error("Failed to load meeting:", e);
          setError("Failed to load meeting details");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, meetingId]);

  const canEdit = meeting && (meeting.created_by_id === currentUser?.id || currentUser?.role === "admin");

  const currentUserAttendee = meeting?.attendees?.find((a) => a.user_id === currentUser?.id);
  const isAttendee = !!currentUserAttendee;

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setError(null);
    onClose();
  };

  const toggleAttendee = (userId: number) => {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!meeting) return;
    setError(null);

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      setError("End time must be after start time");
      return;
    }

    const updates: UpdateMeetingRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      attendee_ids: attendeeIds,
    };

    startTransition(async () => {
      const result = await updateMeetingAction(meeting.id, updates);
      if (result.success) {
        setMeeting(result.data);
        setIsEditing(false);
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteMeetingAction(meeting.id);
      if (result.success) {
        handleClose();
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  };

  const handleRespond = async (response: ResponseStatus) => {
    if (!meeting) return;
    setError(null);

    startTransition(async () => {
      const result = await respondToMeetingAction(meeting.id, response);
      if (result.success) {
        // Refresh meeting data
        const updated = await getMeeting(meeting.id);
        setMeeting(updated);
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  };

  const getCreatorName = () => {
    if (!meeting) return "Unknown";
    const creator = allUsers.find((u) => u.id === meeting.created_by_id);
    return creator ? `${creator.first_name} ${creator.last_name}` : "Unknown";
  };

  const getRecurrenceText = () => {
    if (!meeting?.recurrence_type) return null;
    const interval = meeting.recurrence_interval || 1;
    const typeText = meeting.recurrence_type === "daily" ? "day" : meeting.recurrence_type === "weekly" ? "week" : "month";
    return `Every ${interval > 1 ? `${interval} ${typeText}s` : typeText}`;
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Meeting Details" maxWidth="max-w-lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : !meeting ? (
        <div className="py-8 text-center text-theme-text-muted">
          <p>Meeting not found</p>
        </div>
      ) : isEditing ? (
        // Edit mode
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Start</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">End</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              Attendees ({attendeeIds.length} selected)
            </label>
            <div className="border border-theme-border max-h-40 overflow-y-auto">
              {allUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-theme-elevated ${
                    attendeeIds.includes(user.id) ? "bg-primary-600/20" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={attendeeIds.includes(user.id)}
                    onChange={() => toggleAttendee(user.id)}
                    className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated"
                  />
                  <span className="ml-2 text-sm text-theme-text">
                    {user.first_name} {user.last_name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : showDeleteConfirm ? (
        // Delete confirmation
        <div className="space-y-4">
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded">
            <p className="text-red-300 font-medium">Are you sure you want to delete this meeting?</p>
            <p className="text-red-400 text-sm mt-1">This action cannot be undone.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Meeting
            </button>
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
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-theme-text">{meeting.title}</h3>
              {meeting.description && (
                <p className="text-theme-text-muted mt-1">{meeting.description}</p>
              )}
              <p className="text-xs text-theme-text-muted mt-2">Organized by {getCreatorName()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">Start</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm font-medium text-theme-text">
                  {format(new Date(meeting.start_time), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm text-theme-text">
                  {format(new Date(meeting.start_time), "h:mm a")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">End</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm font-medium text-theme-text">
                  {format(new Date(meeting.end_time), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm text-theme-text">
                  {format(new Date(meeting.end_time), "h:mm a")}
                </span>
              </div>
            </div>
          </div>

          {getRecurrenceText() && (
            <div className="p-3 bg-theme-elevated rounded-lg flex items-center gap-2">
              <Repeat className="w-4 h-4 text-theme-text-muted" />
              <span className="text-sm text-theme-text">{getRecurrenceText()}</span>
            </div>
          )}

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div>
              <p className="text-sm font-medium text-theme-text mb-2">
                Attendees ({meeting.attendees.length})
              </p>
              <div className="space-y-2">
                {meeting.attendees.map((attendee) => {
                  const user = allUsers.find((u) => u.id === attendee.user_id);
                  const statusInfo = RESPONSE_STATUS[attendee.response_status];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between px-3 py-2 bg-theme-elevated rounded"
                    >
                      <span className="text-sm text-theme-text">
                        {user ? `${user.first_name} ${user.last_name}` : "Unknown User"}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Response buttons for attendees */}
          {isAttendee && (
            <div className="pt-4 border-t border-theme-border">
              <p className="text-sm font-medium text-theme-text mb-3">Your Response</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond("accepted")}
                  disabled={isPending}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                    currentUserAttendee?.response_status === "accepted"
                      ? "bg-green-600 text-white"
                      : "bg-theme-elevated text-theme-text hover:bg-green-600/20 hover:text-green-400"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleRespond("tentative")}
                  disabled={isPending}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                    currentUserAttendee?.response_status === "tentative"
                      ? "bg-blue-600 text-white"
                      : "bg-theme-elevated text-theme-text hover:bg-blue-600/20 hover:text-blue-400"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Maybe
                </button>
                <button
                  onClick={() => handleRespond("declined")}
                  disabled={isPending}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                    currentUserAttendee?.response_status === "declined"
                      ? "bg-red-600 text-white"
                      : "bg-theme-elevated text-theme-text hover:bg-red-600/20 hover:text-red-400"
                  }`}
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex justify-between pt-4 border-t border-theme-border">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Meeting
              </button>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
