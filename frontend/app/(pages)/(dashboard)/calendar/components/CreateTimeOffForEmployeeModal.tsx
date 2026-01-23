"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TimeOffType,
  TIME_OFF_TYPE_LABELS,
  CreateTimeOffRequest,
} from "../../time-off/types";
import { createTimeOffRequest } from "../../time-off/actions";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import { BaseModal, Button, FormError, CenteredSpinner } from "@/components";
import { format, addDays } from "date-fns";

interface CreateTimeOffForEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface TimeOffFormData {
  selectedUserId: number | undefined;
  requestType: TimeOffType;
  startDate: string;
  endDate: string;
  reason: string;
  autoApprove: boolean;
}

const TIME_OFF_TYPES: TimeOffType[] = [
  "vacation",
  "sick",
  "personal",
  "bereavement",
  "jury_duty",
  "other",
];

const getInitialFormData = (): TimeOffFormData => ({
  selectedUserId: undefined,
  requestType: "vacation",
  startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
  endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
  reason: "",
  autoApprove: true,
});

export default function CreateTimeOffForEmployeeModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTimeOffForEmployeeModalProps) {
  const { currentUser, isSupervisor, isAdmin } = useCurrentUser();
  const { allUsers, allUsersLoading } = useOrganization();

  const [formData, setFormData] = useState<TimeOffFormData>(getInitialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to update individual form fields
  const updateField = useCallback(
    <K extends keyof TimeOffFormData>(field: K, value: TimeOffFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Filter users based on current user's role
  // Supervisors see their direct reports, admins see all users
  const users = useMemo(() => {
    if (!currentUser) return [];

    if (isSupervisor && !isAdmin) {
      return allUsers.filter(
        (u) => u.supervisor_id === currentUser.id && u.id !== currentUser.id,
      );
    } else if (isAdmin) {
      // Admins can create for anyone except themselves
      return allUsers.filter((u) => u.id !== currentUser.id);
    }

    return [];
  }, [allUsers, currentUser, isSupervisor, isAdmin]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const {
      selectedUserId,
      startDate,
      endDate,
      requestType,
      reason,
      autoApprove,
    } = formData;

    if (!selectedUserId) {
      setError("Please select an employee");
      return;
    }

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
      user_id: selectedUserId,
      start_date: startDate,
      end_date: endDate,
      request_type: requestType,
      reason: reason.trim() || undefined,
      auto_approve: autoApprove,
    };

    setLoading(true);

    try {
      await createTimeOffRequest(request);
      handleClose();
      onCreated();
    } catch (e) {
      console.error("Failed to create time off request:", e);
      setError("Failed to create time off request for employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Time Off for Employee"
      maxWidth="max-w-md"
    >
      {allUsersLoading ? (
        <CenteredSpinner />
      ) : users.length === 0 ? (
        <div className="p-6 text-center text-theme-text-muted">
          <p>No employees available.</p>
          <p className="text-sm mt-2">
            {isSupervisor && !isAdmin
              ? "You don't have any direct reports."
              : "No employees found in the system."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError error={error} />

          <div>
            <label
              htmlFor="employee"
              className="block text-sm font-medium text-theme-text mb-1"
            >
              Employee *
            </label>
            <select
              id="employee"
              value={formData.selectedUserId || ""}
              onChange={(e) =>
                updateField(
                  "selectedUserId",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select an employee</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="requestType"
              className="block text-sm font-medium text-theme-text mb-1"
            >
              Type *
            </label>
            <select
              id="requestType"
              value={formData.requestType}
              onChange={(e) =>
                updateField("requestType", e.target.value as TimeOffType)
              }
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
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-theme-text mb-1"
              >
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-theme-text mb-1"
              >
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-theme-text mb-1"
            >
              Reason
            </label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => updateField("reason", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optional reason"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoApprove}
                onChange={(e) => updateField("autoApprove", e.target.checked)}
                className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated focus:ring-primary-500 rounded"
              />
              <span className="text-sm font-medium text-theme-text">
                Auto-approve this request
              </span>
            </label>
            <p className="text-xs text-theme-text-muted mt-1 ml-6">
              Since you&apos;re creating this request, it can be automatically
              approved.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!formData.selectedUserId}
            >
              {formData.autoApprove ? "Create & Approve" : "Create Request"}
            </Button>
          </div>
        </form>
      )}
    </BaseModal>
  );
}
