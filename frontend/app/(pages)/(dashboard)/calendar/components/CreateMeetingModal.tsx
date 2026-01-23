"use client";

import { useState, useTransition } from "react";
import { CreateMeetingRequest, RecurrenceType } from "../types";
import { createMeetingAction } from "../actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import { BaseModal, Button, FormError, CenteredSpinner } from "@/components";
import { format, addHours, addDays, setHours, setMinutes, startOfHour } from "date-fns";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateMeetingModal({
  isOpen,
  onClose,
  onCreated,
}: CreateMeetingModalProps) {
  const { allUsers, allUsersLoading } = useOrganization();

  const defaultStartTime = setMinutes(setHours(startOfHour(addDays(new Date(), 1)), 10), 0);
  const defaultEndTime = addHours(defaultStartTime, 1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(defaultStartTime, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(defaultStartTime, "HH:mm"));
  const [endDate, setEndDate] = useState(format(defaultEndTime, "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(format(defaultEndTime, "HH:mm"));
  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(format(defaultStartTime, "yyyy-MM-dd"));
    setStartTime(format(defaultStartTime, "HH:mm"));
    setEndDate(format(defaultEndTime, "yyyy-MM-dd"));
    setEndTime(format(defaultEndTime, "HH:mm"));
    setAttendeeIds([]);
    setIsRecurring(false);
    setRecurrenceType("weekly");
    setRecurrenceInterval(1);
    setRecurrenceEndDate("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleAttendee = (userId: number) => {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!startDate || !startTime) {
      setError("Start date and time are required");
      return;
    }

    if (!endDate || !endTime) {
      setError("End date and time are required");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      setError("End time must be after start time");
      return;
    }

    if (attendeeIds.length === 0) {
      setError("At least one attendee is required");
      return;
    }

    const request: CreateMeetingRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      attendee_ids: attendeeIds,
    };

    if (isRecurring) {
      request.recurrence_type = recurrenceType;
      request.recurrence_interval = recurrenceInterval;
      if (recurrenceEndDate) {
        request.recurrence_end_date = new Date(recurrenceEndDate).toISOString();
      }
    }

    startTransition(async () => {
      const result = await createMeetingAction(request);
      if (result.success) {
        handleClose();
        onCreated();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Create Meeting" maxWidth="max-w-lg">
      {allUsersLoading ? (
        <CenteredSpinner />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError error={error} />

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-theme-text mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Meeting title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-theme-text mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Start *</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">End *</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              Attendees * ({attendeeIds.length} selected)
            </label>
            <div className="border border-theme-border rounded max-h-40 overflow-y-auto">
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
                    className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-theme-text">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="ml-auto text-xs text-theme-text-muted">{user.department}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-theme-text">Recurring meeting</span>
            </label>
          </div>

          {isRecurring && (
            <div className="pl-6 space-y-3 border-l-2 border-primary-500/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-theme-text-muted">Repeat every</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center"
                />
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                  className="px-3 py-1 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="daily">day(s)</option>
                  <option value="weekly">week(s)</option>
                  <option value="monthly">month(s)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-theme-text-muted mb-1">
                  End recurrence (optional)
                </label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Create Meeting
            </Button>
          </div>
        </form>
      )}
    </BaseModal>
  );
}
