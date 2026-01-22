"use client";

import { useState, useEffect, useTransition } from "react";
import { Task, UpdateTaskRequest, TaskStatus, AssignmentType } from "../types";
import { getTask } from "../api";
import { updateTaskAction, deleteTaskAction } from "../actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { BaseModal } from "@/components";
import {
  Loader2,
  CheckSquare,
  Calendar,
  User,
  Users,
  Building2,
  Trash2,
  Edit2,
} from "lucide-react";
import { format } from "date-fns";

interface ViewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  onUpdated: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-500" },
];

export default function ViewTaskModal({
  isOpen,
  onClose,
  taskId,
  onUpdated,
}: ViewTaskModalProps) {
  const { allUsers, squads, departments } = useOrganization();
  const { currentUser, effectiveIsSupervisorOrAdmin } = useCurrentUser();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [dueDate, setDueDate] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("user");
  const [assignedUserId, setAssignedUserId] = useState<number | undefined>();
  const [assignedSquadId, setAssignedSquadId] = useState<number | undefined>();
  const [assignedDepartment, setAssignedDepartment] = useState<string>("");

  // Load task data
  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      setError(null);
      getTask(taskId)
        .then((data) => {
          setTask(data);
          // Initialize edit form
          setTitle(data.title);
          setDescription(data.description || "");
          setStatus(data.status);
          setDueDate(format(new Date(data.due_date), "yyyy-MM-dd"));
          setAssignmentType(data.assignment_type);
          setAssignedUserId(data.assigned_user_id);
          setAssignedSquadId(data.assigned_squad_id);
          setAssignedDepartment(data.assigned_department || "");
        })
        .catch((e) => {
          console.error("Failed to load task:", e);
          setError("Failed to load task details");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, taskId]);

  const canEdit = task && (task.created_by_id === currentUser?.id || currentUser?.role === "admin");

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!task) return;
    setError(null);

    const updates: UpdateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      due_date: new Date(dueDate).toISOString(),
    };

    if (effectiveIsSupervisorOrAdmin) {
      updates.assignment_type = assignmentType;
      if (assignmentType === "user") {
        updates.assigned_user_id = assignedUserId;
        updates.assigned_squad_id = undefined;
        updates.assigned_department = undefined;
      } else if (assignmentType === "squad") {
        updates.assigned_user_id = undefined;
        updates.assigned_squad_id = assignedSquadId;
        updates.assigned_department = undefined;
      } else if (assignmentType === "department") {
        updates.assigned_user_id = undefined;
        updates.assigned_squad_id = undefined;
        updates.assigned_department = assignedDepartment;
      }
    }

    startTransition(async () => {
      const result = await updateTaskAction(task.id, updates);
      if (result.success) {
        setTask(result.data);
        setIsEditing(false);
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  };

  const handleDelete = async () => {
    if (!task) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (result.success) {
        handleClose();
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  };

  const getAssignmentDisplay = () => {
    if (!task) return "Unassigned";

    if (task.assignment_type === "user" && task.assigned_user_id) {
      const user = allUsers.find((u) => u.id === task.assigned_user_id);
      return user ? `${user.first_name} ${user.last_name}` : "Unknown User";
    }
    if (task.assignment_type === "squad" && task.assigned_squad_id) {
      const squad = squads.find((s) => s.id === task.assigned_squad_id);
      return squad ? squad.name : "Unknown Squad";
    }
    if (task.assignment_type === "department" && task.assigned_department) {
      return task.assigned_department;
    }
    return "Unassigned";
  };

  const getAssignmentIcon = () => {
    if (!task) return <User className="w-4 h-4" />;
    switch (task.assignment_type) {
      case "squad":
        return <Users className="w-4 h-4" />;
      case "department":
        return <Building2 className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const statusInfo = STATUS_OPTIONS.find((s) => s.value === task?.status);

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Task Details" maxWidth="max-w-lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : !task ? (
        <div className="py-8 text-center text-theme-text-muted">
          <p>Task not found</p>
        </div>
      ) : isEditing ? (
        // Edit mode
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {effectiveIsSupervisorOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Assign To</label>
              <div className="flex gap-2 mb-3">
                {(["user", "squad", "department"] as AssignmentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAssignmentType(type)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      assignmentType === type
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
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Unassigned</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              )}

              {assignmentType === "squad" && (
                <select
                  value={assignedSquadId || ""}
                  onChange={(e) => setAssignedSquadId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : showDeleteConfirm ? (
        // Delete confirmation
        <div className="space-y-4">
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded">
            <p className="text-red-300 font-medium">Are you sure you want to delete this task?</p>
            <p className="text-red-400 text-sm mt-1">This action cannot be undone.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Task
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-900/30 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-theme-text">{task.title}</h3>
              {task.description && (
                <p className="text-theme-text-muted mt-1">{task.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusInfo?.color}`} />
                <span className="text-sm font-medium text-theme-text">{statusInfo?.label}</span>
              </div>
            </div>

            <div className="p-3 bg-theme-elevated rounded-lg">
              <p className="text-xs text-theme-text-muted mb-1">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-theme-text-muted" />
                <span className="text-sm font-medium text-theme-text">
                  {format(new Date(task.due_date), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-theme-elevated rounded-lg">
            <p className="text-xs text-theme-text-muted mb-1">Assigned To</p>
            <div className="flex items-center gap-2">
              {getAssignmentIcon()}
              <span className="text-sm font-medium text-theme-text">{getAssignmentDisplay()}</span>
            </div>
          </div>

          <div className="text-xs text-theme-text-muted">
            Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
            {task.updated_at !== task.created_at && (
              <> &middot; Updated {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}</>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-between pt-4 border-t border-theme-border">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Task
              </button>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
