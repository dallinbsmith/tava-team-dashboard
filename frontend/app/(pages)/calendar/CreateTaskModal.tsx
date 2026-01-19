"use client";

import { useState } from "react";
import { CreateTaskRequest, AssignmentType } from "@/shared/types";
import { createTask } from "@/lib/api";
import { useOrganization } from "@/providers";
import { X, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onCreated }: CreateTaskModalProps) {
  const { allUsers, squads, departments, allUsersLoading } = useOrganization();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("user");
  const [assignedUserId, setAssignedUserId] = useState<number | undefined>();
  const [assignedSquadId, setAssignedSquadId] = useState<number | undefined>();
  const [assignedDepartment, setAssignedDepartment] = useState<string>("");

  const [loading, setLoading] = useState(false);
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
      assignment_type: assignmentType,
    };

    if (assignmentType === "user" && assignedUserId) {
      request.assigned_user_id = assignedUserId;
    } else if (assignmentType === "squad" && assignedSquadId) {
      request.assigned_squad_id = assignedSquadId;
    } else if (assignmentType === "department" && assignedDepartment) {
      request.assigned_department = assignedDepartment;
    }

    setLoading(true);

    try {
      await createTask(request);
      handleClose();
      onCreated();
    } catch (e) {
      console.error("Failed to create task:", e);
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={handleClose} />

        <div className="relative bg-theme-surface w-full max-w-lg shadow-xl border border-theme-border rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
            <h2 className="text-lg font-semibold text-theme-text">Create Task</h2>
            <button
              onClick={handleClose}
              className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {allUsersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : (
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
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

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
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${assignmentType === type
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
                    className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
