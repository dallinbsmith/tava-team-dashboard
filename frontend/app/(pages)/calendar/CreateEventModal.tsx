"use client";

import { useState } from "react";
import { CreateTaskRequest } from "@/shared/types";
import { createTask } from "@/lib/api";
import { useCurrentUser } from "@/providers";
import { X, Loader2 } from "lucide-react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={handleClose} />

        <div className="relative bg-theme-surface w-full max-w-md shadow-xl border border-theme-border rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
            <h2 className="text-lg font-semibold text-theme-text">Create Event</h2>
            <button
              onClick={handleClose}
              className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded">
                {error}
              </div>
            )}

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
                placeholder="Event title"
                autoFocus
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

            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-theme-text mb-1">
                Date *
              </label>
              <input
                type="date"
                id="eventDate"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

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
              <div>
                <label htmlFor="eventTime" className="block text-sm font-medium text-theme-text mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id="eventTime"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border rounded hover:bg-theme-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
