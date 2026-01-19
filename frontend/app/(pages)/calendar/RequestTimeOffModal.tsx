"use client";

import { useState } from "react";
import { TimeOffType, TIME_OFF_TYPE_LABELS, CreateTimeOffRequest } from "@/shared/types";
import { createTimeOffRequest } from "@/lib/api";
import { X, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TIME_OFF_TYPES: TimeOffType[] = [
  "vacation",
  "sick",
  "personal",
  "bereavement",
  "jury_duty",
  "other",
];

export default function RequestTimeOffModal({ isOpen, onClose, onCreated }: RequestTimeOffModalProps) {
  const [requestType, setRequestType] = useState<TimeOffType>("vacation");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setRequestType("vacation");
    setStartDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setReason("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate) {
      setError("Start date is required");
      return;
    }

    if (!endDate) {
      setError("End date is required");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be on or after start date");
      return;
    }

    const request: CreateTimeOffRequest = {
      start_date: startDate,
      end_date: endDate,
      request_type: requestType,
      reason: reason.trim() || undefined,
    };

    setLoading(true);

    try {
      await createTimeOffRequest(request);
      handleClose();
      onCreated();
    } catch (e) {
      console.error("Failed to create time off request:", e);
      setError("Failed to create time off request");
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
            <h2 className="text-lg font-semibold text-theme-text">Request Time Off</h2>
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
              <label htmlFor="requestType" className="block text-sm font-medium text-theme-text mb-1">
                Type *
              </label>
              <select
                id="requestType"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as TimeOffType)}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {TIME_OFF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TIME_OFF_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-theme-text mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-theme-text mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-theme-text mb-1">
                Reason
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional reason for your request"
              />
            </div>

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
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded transition-colors flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
