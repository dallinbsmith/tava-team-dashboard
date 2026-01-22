"use client";

import { useState, useTransition } from "react";
import { CreateTaskRequest, AssignmentType } from "../types";
import { createTaskAction } from "../actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { BaseModal } from "@/components";
import { Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onCreated }: CreateTaskModalProps) {
  const { allUsers, squads, departments, allUsersLoading } = useOrganization();
  const { effectiveIsSupervisorOrAdmin } = useCurrentUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("user");
  const [assignedUserId, setAssignedUserId] = useState<number | undefined>();
  const [assignedSquadId, setAssignedSquadId] = useState<number | undefined>();
  const [assignedDepartment, setAssignedDepartment] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setAssignmentType("user");
    setAssignedUserId(undefined);
    setAssignedSquadId(undefined);
    setAssignedDepartment("");
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

    if (!dueDate) {
      setError("Due date is required");
      return;
    }

    const request: CreateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: new Date(dueDate).toISOString(),
      assignment_type: effectiveIsSupervisorOrAdmin ? assignmentType : "user",
    };

    // Only include assignment fields for supervisors/admins
    if (effectiveIsSupervisorOrAdmin) {
      if (assignmentType === "user" && assignedUserId) {
        request.assigned_user_id = assignedUserId;
      } else if (assignmentType === "squad" && assignedSquadId) {
        request.assigned_squad_id = assignedSquadId;
      } else if (assignmentType === "department" && assignedDepartment) {
        request.assigned_department = assignedDepartment;
      }
    }

    startTransition(async () => {
      const result = await createTaskAction(request);
      if (result.success) {
        handleClose();
        onCreated();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Task"
      maxWidth="max-w-lg"
    >
      {allUsersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
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
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Task title"
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
              rows={3}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-theme-text mb-1">
              Due Date *
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {effectiveIsSupervisorOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Assign To
              </label>
              <div className="flex gap-2 mb-3">
                {(["user", "squad", "department"] as AssignmentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAssignmentType(type)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${assignmentType === type
                        ? "bg-primary-600 text-white"
                        : "bg-theme-elevated text-theme-text-muted border border-theme-border hover:bg-theme-surface"
                      }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {assignmentType === "user" && (
                <select
                  value={assignedUserId || ""}
                  onChange={(e) => setAssignedUserId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a user (optional)</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              )}

              {assignmentType === "squad" && (
                <select
                  value={assignedSquadId || ""}
                  onChange={(e) => setAssignedSquadId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a squad</option>
                  {squads.map((squad) => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name}
                    </option>
                  ))}
                </select>
              )}

              {assignmentType === "department" && (
                <select
                  value={assignedDepartment}
                  onChange={(e) => setAssignedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </button>
          </div>
        </form>
      )}
    </BaseModal>
  );
}
