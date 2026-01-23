"use client";

import { useState, useTransition } from "react";
import { format, addDays } from "date-fns";
import {
  TimeOffType,
  CreateTimeOffRequest,
  TIME_OFF_TYPE_LABELS,
} from "../types";
import { createTimeOffRequestAction } from "../actions";
import { Calendar, Loader2, X } from "lucide-react";

interface TimeOffRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TimeOffRequestForm({
  onSuccess,
  onCancel,
}: TimeOffRequestFormProps) {
  const [requestType, setRequestType] = useState<TimeOffType>("vacation");
  const [startDate, setStartDate] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data: CreateTimeOffRequest = {
      start_date: startDate,
      end_date: endDate,
      request_type: requestType,
      reason: reason || undefined,
    };

    startTransition(async () => {
      const result = await createTimeOffRequestAction(data);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          Request Time Off
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as TimeOffType)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {Object.entries(TIME_OFF_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) {
                  setEndDate(e.target.value);
                }
              }}
              min={format(new Date(), "yyyy-MM-dd")}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Add any notes for your supervisor..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
