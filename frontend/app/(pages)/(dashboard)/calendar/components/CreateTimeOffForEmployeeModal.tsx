"use client";

import { useState, useMemo } from "react";
import { TimeOffType, TIME_OFF_TYPE_LABELS, CreateTimeOffRequest } from "../../time-off/types";
import { createTimeOffRequest } from "../../time-off/api";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import { BaseModal } from "@/components";
import { Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface CreateTimeOffForEmployeeModalProps {
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

export default function CreateTimeOffForEmployeeModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTimeOffForEmployeeModalProps) {
  const { currentUser, isSupervisor, isAdmin } = useCurrentUser();
  const { allUsers, allUsersLoading } = useOrganization();

  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [requestType, setRequestType] = useState<TimeOffType>("vacation");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter users based on current user's role
  // Supervisors see their direct reports, admins see all users
  const users = useMemo(() => {
    if (!currentUser) return [];

    if (isSupervisor && !isAdmin) {
      return allUsers.filter(
        (u) => u.supervisor_id === currentUser.id && u.id !== currentUser.id
      );
    } else if (isAdmin) {
      // Admins can create for anyone except themselves
      return allUsers.filter((u) => u.id !== currentUser.id);
    }

    return [];
  }, [allUsers, currentUser, isSupervisor, isAdmin]);

  const resetForm = () => {
    setSelectedUserId(undefined);
    setRequestType("vacation");
    setStartDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setReason("");
    setAutoApprove(true);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
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
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="employee"
                  className="block text-sm font-medium text-theme-text mb-1"
                >
                  Employee *
                </label>
                <select
                  id="employee"
                  value={selectedUserId || ""}
                  onChange={(e) =>
                    setSelectedUserId(e.target.value ? parseInt(e.target.value) : undefined)
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
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-theme-text mb-1"
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
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
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Optional reason"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-theme-border bg-theme-elevated focus:ring-primary-500 rounded"
                  />
                  <span className="text-sm font-medium text-theme-text">
                    Auto-approve this request
                  </span>
                </label>
                <p className="text-xs text-theme-text-muted mt-1 ml-6">
                  Since you&apos;re creating this request, it can be automatically approved.
                </p>
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
                  disabled={loading || !selectedUserId}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {autoApprove ? "Create & Approve" : "Create Request"}
                </button>
              </div>
        </form>
      )}
    </BaseModal>
  );
}
