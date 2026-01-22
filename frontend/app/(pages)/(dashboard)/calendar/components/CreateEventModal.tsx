"use client";

import { useState } from "react";
import { CreateTaskRequest } from "../types";
import { createTask } from "../api";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { BaseModal, InputField, TextareaField, Button, FormError } from "@/components";
import { format, addDays } from "date-fns";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const { currentUser } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setStartTime("09:00");
    setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setEndTime("10:00");
    setIsAllDay(true);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // When start date changes, update end date if it's before start date
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  };

  // When start time changes, update end time to be 1 hour later (same day)
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // Auto-adjust end time to be 1 hour after start if on same day
    if (startDate === endDate) {
      const [hours, minutes] = newStartTime.split(":").map(Number);
      const endHours = (hours + 1) % 24;
      setEndTime(`${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!startDate) {
      setError("Start date is required");
      return;
    }

    if (!currentUser) {
      setError("Unable to load user information. Please try again.");
      return;
    }

    let startDateTime: string;
    let endDateTime: string;
    let dueDate: string;

    if (isAllDay) {
      // For all-day events, use dates at midnight
      startDateTime = new Date(`${startDate}T00:00:00`).toISOString();
      endDateTime = new Date(`${endDate}T23:59:59`).toISOString();
      dueDate = endDateTime;
    } else {
      // For timed events, use the specified times
      startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
      endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
      dueDate = endDateTime;

      // Validate end is after start
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        setError("End time must be after start time");
        return;
      }
    }

    // Create as a task assigned to the current user
    const request: CreateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate,
      start_time: startDateTime,
      end_time: endDateTime,
      all_day: isAllDay,
      assignment_type: "user",
      assigned_user_id: currentUser.id,
    };

    setLoading(true);

    try {
      await createTask(request);
      handleClose();
      onCreated();
    } catch (e) {
      console.error("Failed to create event:", e);
      setError("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Event"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={error} />

        <InputField
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
        />

        <TextareaField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional description"
        />

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated focus:ring-primary-500 rounded"
            />
            <span className="text-sm font-medium text-theme-text">All day event</span>
          </label>
        </div>

        {/* Start Date/Time */}
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Start Date"
            required
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
          {!isAllDay && (
            <InputField
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
          )}
        </div>

        {/* End Date/Time */}
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="End Date"
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
          {!isAllDay && (
            <InputField
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Event
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
