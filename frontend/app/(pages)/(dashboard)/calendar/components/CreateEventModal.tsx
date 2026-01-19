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
  const [eventDate, setEventDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [isAllDay, setIsAllDay] = useState(true);
  const [eventTime, setEventTime] = useState("09:00");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setIsAllDay(true);
    setEventTime("09:00");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!eventDate) {
      setError("Event date is required");
      return;
    }

    // Build the date/time string
    let dueDate: string;
    if (isAllDay) {
      // For all-day events, set to midnight
      dueDate = new Date(`${eventDate}T00:00:00`).toISOString();
    } else {
      // For timed events, use the specified time
      dueDate = new Date(`${eventDate}T${eventTime}`).toISOString();
    }

    if (!currentUser) {
      setError("Unable to load user information. Please try again.");
      return;
    }

    // Create as a task assigned to the current user
    const request: CreateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate,
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

        <InputField
          label="Date"
          required
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          min={format(new Date(), "yyyy-MM-dd")}
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

        {!isAllDay && (
          <InputField
            label="Time"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />
        )}

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
