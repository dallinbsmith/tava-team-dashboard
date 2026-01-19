"use client";

import { useState } from "react";
import { TimeOffType, TIME_OFF_TYPE_LABELS, CreateTimeOffRequest } from "../../time-off/types";
import { createTimeOffRequest } from "../../time-off/api";
import { BaseModal, SelectField, InputField, TextareaField, Button, FormError } from "@/components";
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

  const timeOffOptions = TIME_OFF_TYPES.map((type) => ({
    value: type,
    label: TIME_OFF_TYPE_LABELS[type],
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request Time Off"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={error} />

        <SelectField
          label="Type"
          required
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as TimeOffType)}
          options={timeOffOptions}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Start Date"
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
          <InputField
            label="End Date"
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
        </div>

        <TextareaField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Optional reason for your request"
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" loading={loading}>
            Submit Request
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
